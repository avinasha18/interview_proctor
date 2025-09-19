import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';

// Import routes
import interviewRoutes from './routes/interviews.js';
import reportRoutes from './routes/reports.js';
import eventRoutes from './routes/events.js';
import recordingRoutes from './routes/recording.js';

// Import models
import Interview from './models/Interview.js';
import Event from './models/Event.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://interview-proctor-system.vercel.app",
      "https://interview-proctor-server.vercel.app",
      "https://interview-proctor-1.onrender.com",
      "https://interview-proctor-f97c.onrender.com",
      "http://localhost:3001",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB limit for Socket.IO messages
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware
app.use(cors({
  origin: [
    "https://interview-proctor-system.vercel.app",
    "https://interview-proctor-server.vercel.app",
    "https://interview-proctor-1.onrender.com",
    "https://interview-proctor-f97c.onrender.com",
    "http://localhost:3001",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '50mb' })); // Increase payload limit for video chunks
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proctoring';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/interviews', interviewRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/recording', recordingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler for PayloadTooLargeError
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    console.log('⚠️ PayloadTooLargeError caught:', error.message);
    return res.status(413).json({ 
      error: 'Request entity too large',
      message: 'The request payload exceeds the maximum allowed size'
    });
  }
  next(error);
});

// Make io instance available to routes
app.set('io', io);

// Socket.IO for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-interview', async (interviewId) => {
    socket.join(interviewId);
    socket.interviewId = interviewId;
    const roomSize = io.sockets.adapter.rooms.get(interviewId)?.size || 0;
    console.log(`🔌 Client ${socket.id} joined interview ${interviewId} (room size: ${roomSize})`);
    
    // Log all sockets in this room
    const room = io.sockets.adapter.rooms.get(interviewId);
    if (room) {
      console.log(`🔌 All socket IDs in room ${interviewId}:`, Array.from(room));
    }
  });

  socket.on('candidate-started-interview', async (interviewId) => {
    console.log(`Candidate started interview ${interviewId}`);
    // Notify interviewer that candidate has started
    socket.to(interviewId).emit('candidate-started-interview', {
      interviewId: interviewId,
      message: 'Candidate has started the interview'
    });
  });

  socket.on('candidate-ended-interview', async (data) => {
    console.log(`Candidate ended interview ${data.interviewId}`);
    
    try {
      const interview = await Interview.findById(data.interviewId);
      
      if (interview && interview.status === 'active') {
        // Update interview status to completed (not terminated)
        interview.status = 'completed';
        interview.endTime = new Date();
        
        // Calculate final statistics
        const events = await Event.find({ interviewId: data.interviewId });
        const totalEvents = events.length;
        const focusLostCount = events.filter(e => e.eventType === 'focus_lost').length;
        const suspiciousEventsCount = events.filter(e =>
          e.eventType === 'suspicious_object' ||
          e.eventType === 'multiple_faces' ||
          e.eventType === 'face_missing'
        ).length;
        
        // Calculate integrity score
        let deductions = 0;
        deductions += focusLostCount * 3;
        deductions += suspiciousEventsCount * 5;
        const integrityScore = Math.max(0, 100 - deductions);
        
        interview.duration = Math.round((interview.endTime - interview.startTime) / (1000 * 60));
        interview.totalEvents = totalEvents;
        interview.focusLostCount = focusLostCount;
        interview.suspiciousEventsCount = suspiciousEventsCount;
        interview.integrityScore = integrityScore;
        
        await interview.save();
        
        console.log(`Interview ${data.interviewId} completed by candidate`);
        
        // Notify interviewer immediately
        socket.to(data.interviewId).emit('interview-ended', {
          interviewId: data.interviewId,
          status: 'completed',
          integrityScore: integrityScore,
          endedBy: 'candidate'
        });
      }
    } catch (error) {
      console.error('Error handling candidate ending interview:', error);
    }
  });

  socket.on('candidate-leaving', async (data) => {
    console.log(`Candidate leaving interview ${data.interviewId}`);
    
    try {
      const interview = await Interview.findById(data.interviewId);
      
      if (interview && interview.status === 'active') {
        // Update interview status to terminated
        interview.status = 'terminated';
        interview.endTime = new Date();
        await interview.save();
        
        console.log(`Interview ${data.interviewId} terminated - candidate left`);
        
        // Auto-stop recording if it's still active
        try {
          const videoRecordingService = (await import('./services/videoRecordingService.js')).default;
          
          if (videoRecordingService.hasRecording(data.interviewId)) {
            const recordingStatus = videoRecordingService.getRecordingStatus(data.interviewId);
            
            if (recordingStatus && recordingStatus.isRecording) {
              console.log(`🛑 Auto-stopping recording for candidate leaving: ${data.interviewId}`);
              const stopResult = await videoRecordingService.stopRecording(data.interviewId);
              
              if (stopResult.success) {
                console.log(`✅ Auto-stopped recording successfully for candidate leaving: ${data.interviewId}`);
                interview.videoUrl = stopResult.videoUrl;
                await interview.save();
              }
            }
          }
        } catch (recordingError) {
          console.error('Error auto-stopping recording:', recordingError);
        }
        
        // Notify interviewer immediately
        socket.to(data.interviewId).emit('candidate-disconnected', {
          interviewId: data.interviewId,
          status: 'terminated',
          message: 'Candidate left the interview',
          timestamp: data.timestamp
        });
      }
    } catch (error) {
      console.error('Error handling candidate leaving:', error);
    }
  });

  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    // Handle candidate disconnect
    if (socket.interviewId) {
      try {
        const interview = await Interview.findById(socket.interviewId);
        
        if (interview && interview.status === 'active') {
          // Check if this was the candidate (not interviewer)
          // For now, we'll assume any disconnect from active interview is candidate
          interview.status = 'terminated';
          interview.endTime = new Date();
          await interview.save();
          
          console.log(`Interview ${socket.interviewId} terminated due to candidate disconnect`);
          
          // Auto-stop recording if it's still active
          try {
            const videoRecordingService = (await import('./services/videoRecordingService.js')).default;
            
            // Check if recording exists first
            if (videoRecordingService.hasRecording(socket.interviewId)) {
              const recordingStatus = videoRecordingService.getRecordingStatus(socket.interviewId);
              
              if (recordingStatus && recordingStatus.isRecording) {
                console.log(`🛑 Auto-stopping recording for disconnected interview: ${socket.interviewId}`);
                const stopResult = await videoRecordingService.stopRecording(socket.interviewId);
                
                if (stopResult.success) {
                  console.log(`✅ Auto-stopped recording successfully for disconnected interview: ${socket.interviewId}`);
                  // Update interview with video URL
                  interview.videoUrl = stopResult.videoUrl;
                  await interview.save();
                } else {
                  console.error(`❌ Failed to auto-stop recording for disconnected interview: ${socket.interviewId}`, stopResult.error);
                }
              } else {
                console.log(`ℹ️ Recording exists but not active for disconnected interview: ${socket.interviewId}`);
              }
            } else {
              console.log(`ℹ️ No recording found for disconnected interview: ${socket.interviewId} (may have been processed already)`);
            }
          } catch (error) {
            console.error('❌ Error auto-stopping recording on disconnect:', error);
          }
          
          // Notify interviewer about candidate disconnect
          socket.to(socket.interviewId).emit('candidate-disconnected', {
            interviewId: socket.interviewId,
            status: 'terminated',
            message: 'Candidate disconnected from interview'
          });
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  });
});

// Function to forward events from Python service to frontend
export const forwardEventToFrontend = async (interviewId, eventData) => {
  try {
    // Store event in database
    const event = new Event({
      interviewId,
      ...eventData
    });
    await event.save();

    // Forward to frontend via Socket.IO
    io.to(interviewId).emit('proctoring-event', eventData);
    
    console.log(`Event forwarded to interview ${interviewId}:`, eventData);
  } catch (error) {
    console.error('Error forwarding event:', error);
  }
};

// Endpoint for Python service to send events
app.post('/api/events/:interviewId', async (req, res) => {
  try {
    const { interviewId } = req.params;
    const eventData = req.body;

    await forwardEventToFrontend(interviewId, eventData);
    
    res.json({ success: true, message: 'Event logged successfully' });
  } catch (error) {
    console.error('Error logging event:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
