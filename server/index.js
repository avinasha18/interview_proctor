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
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase payload limit

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

// Make io instance available to routes
app.set('io', io);

// Socket.IO for real-time communication
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-interview', async (interviewId) => {
    socket.join(interviewId);
    socket.interviewId = interviewId;
    console.log(`Client ${socket.id} joined interview ${interviewId}`);
  });

  socket.on('candidate-started-interview', async (interviewId) => {
    console.log(`Candidate started interview ${interviewId}`);
    // Notify interviewer that candidate has started
    socket.to(interviewId).emit('candidate-started-interview', {
      interviewId: interviewId,
      message: 'Candidate has started the interview'
    });
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
