import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Interview from '../models/Interview.js';
import Event from '../models/Event.js';

const router = express.Router();

// Schedule a new interview
router.post('/schedule', async (req, res) => {
  try {
    const { candidateEmail, candidateName, interviewerEmail, interviewerName } = req.body;
    
    if (!candidateEmail || !candidateName || !interviewerEmail || !interviewerName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const sessionId = uuidv4();
    const interviewCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const interview = new Interview({
      sessionId,
      candidateEmail,
      candidateName,
      interviewerEmail,
      interviewerName,
      interviewCode,
      status: 'scheduled'
    });

    await interview.save();

    res.json({
      success: true,
      interview: {
        id: interview._id,
        sessionId: interview.sessionId,
        interviewCode: interview.interviewCode,
        candidateEmail: interview.candidateEmail,
        candidateName: interview.candidateName,
        interviewerEmail: interview.interviewerEmail,
        interviewerName: interview.interviewerName,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// Join interview by code (for candidate)
router.post('/join/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const interview = await Interview.findOne({ interviewCode: code });
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.status !== 'scheduled') {
      return res.status(400).json({ error: 'Interview is not available' });
    }

    // Update status to active
    interview.status = 'active';
    interview.startTime = new Date();
    await interview.save();

    res.json({
      success: true,
      interview: {
        id: interview._id,
        sessionId: interview.sessionId,
        candidateName: interview.candidateName,
        interviewerName: interview.interviewerName,
        startTime: interview.startTime
      }
    });
  } catch (error) {
    console.error('Error joining interview:', error);
    res.status(500).json({ error: 'Failed to join interview' });
  }
});

// Get interview by email (for interviewer)
router.get('/interviewer/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const interviews = await Interview.find({ interviewerEmail: email })
      .sort({ startTime: -1 });

    res.json({
      success: true,
      interviews: interviews || [] // Return empty array if no interviews found
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Authenticate interviewer (just validate email format)
router.post('/authenticate-interviewer', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // For now, any valid email format is accepted
    // In production, you might want to check against a database of authorized interviewers
    res.json({
      success: true,
      message: 'Authentication successful',
      email: email
    });
  } catch (error) {
    console.error('Error authenticating interviewer:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

// Get interview by candidate email
router.get('/candidate/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const interviews = await Interview.find({ candidateEmail: email })
      .sort({ startTime: -1 });

    res.json({
      success: true,
      interviews
    });
  } catch (error) {
    console.error('Error fetching candidate interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// End an interview
router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Ending interview with ID:', id);

    const interview = await Interview.findById(id);
    if (!interview) {
      console.error('Interview not found for ID:', id);
      return res.status(404).json({ error: 'Interview not found' });
    }

    console.log('Found interview:', interview._id, 'Status:', interview.status);

    const endTime = new Date();
    const duration = Math.round((endTime - interview.startTime) / (1000 * 60)); // in minutes

    // Count events by type
    const events = await Event.find({ interviewId: id });
    const totalEvents = events.length;
    console.log(`📊 Found ${totalEvents} events for interview ${id}:`);
    
    // Debug: Log all events
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventType} - ${event.message} (${event.severity})`);
    });

    const focusLostCount = events.filter(e => e.eventType === 'focus_lost').length;
    const suspiciousEventsCount = events.filter(e =>
      e.eventType === 'suspicious_object' ||
      e.eventType === 'multiple_faces' ||
      e.eventType === 'face_missing'
    ).length;
    
    console.log(`📊 Event counts for interview ${id}:`);
    console.log(`  Focus lost count: ${focusLostCount}`);
    console.log(`  Suspicious events count: ${suspiciousEventsCount}`);
    console.log(`  Total events: ${totalEvents}`);

    // Calculate integrity score with detailed deductions
    let deductions = 0;
    deductions += focusLostCount * 3; // 3 points per focus loss
    deductions += suspiciousEventsCount * 5; // 5 points per suspicious event

    const integrityScore = Math.max(0, 100 - deductions);

    interview.endTime = endTime;
    interview.status = 'completed';
    interview.duration = duration;
    interview.totalEvents = totalEvents;
    interview.focusLostCount = focusLostCount;
    interview.suspiciousEventsCount = suspiciousEventsCount;
    interview.integrityScore = integrityScore;

    await interview.save();

    // Emit interview ended event to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('interview-ended', {
        interviewId: id,
        status: 'completed',
        integrityScore: interview.integrityScore
      });
    }

    // Auto-stop recording if it's still active
    try {
      const videoRecordingService = (await import('../services/videoRecordingService.js')).default;
      
      // Check if recording exists first
      if (videoRecordingService.hasRecording(id)) {
        const recordingStatus = videoRecordingService.getRecordingStatus(id);
        
        console.log(`🔍 Found recording for interview: ${id}`);
        console.log(`🔍 Recording status:`, recordingStatus);
        
        if (recordingStatus && recordingStatus.isRecording) {
          console.log(`🛑 Auto-stopping recording for ended interview: ${id}`);
          const stopResult = await videoRecordingService.stopRecording(id);
          
          if (stopResult.success) {
            console.log(`✅ Auto-stopped recording successfully for interview: ${id}`);
            // Update interview with video URL
            interview.videoUrl = stopResult.videoUrl;
            await interview.save();
          } else {
            console.error(`❌ Failed to auto-stop recording for interview: ${id}`, stopResult.error);
          }
        } else {
          console.log(`ℹ️ Recording exists but not active for interview: ${id}`);
        }
      } else {
        console.log(`ℹ️ No recording found for interview: ${id} (may have been processed already)`);
      }
    } catch (error) {
      console.error('❌ Error auto-stopping recording:', error);
    }

    res.json({
      success: true,
      interview: {
        id: interview._id,
        sessionId: interview.sessionId,
        duration: interview.duration,
        totalEvents: interview.totalEvents,
        focusLostCount: interview.focusLostCount,
        suspiciousEventsCount: interview.suspiciousEventsCount,
        integrityScore: interview.integrityScore,
        endTime: interview.endTime
      }
    });
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({ error: 'Failed to end interview' });
  }
});

// Handle candidate disconnect
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Update interview status to terminated if it was active
    if (interview.status === 'active') {
      interview.status = 'terminated';
      interview.endTime = new Date();
      await interview.save();

      // Emit candidate disconnected event
      const io = req.app.get('io');
      if (io) {
        io.to(id).emit('candidate-disconnected', {
          interviewId: id,
          status: 'terminated'
        });
      }
    }

    res.json({ success: true, message: 'Candidate disconnect handled' });
  } catch (error) {
    console.error('Error handling candidate disconnect:', error);
    res.status(500).json({ error: 'Failed to handle disconnect' });
  }
});

// Handle video stream from candidate
router.post('/:id/video-stream', async (req, res) => {
  try {
    const { id } = req.params;
    const { image, timestamp } = req.body;

    console.log(`📹 Received video frame for interview ${id}`);
    console.log(`📹 Image data length: ${image ? image.length : 'null'}`);
    console.log(`📹 Timestamp: ${timestamp}`);

    // Forward video frame to interviewer via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const roomSize = io.sockets.adapter.rooms.get(id)?.size || 0;
      console.log(`📹 Room ${id} has ${roomSize} connected clients`);
      
      // Log all connected sockets in this room
      const room = io.sockets.adapter.rooms.get(id);
      if (room) {
        console.log(`📹 Connected socket IDs in room ${id}:`, Array.from(room));
      } else {
        console.log(`📹 No room found for interview ${id}`);
      }
      
      io.to(id).emit('candidate-video-frame', {
        interviewId: id,
        image: image,
        timestamp: timestamp
      });
      console.log(`📹 Video frame forwarded to interview ${id} (room size: ${roomSize})`);
    } else {
      console.error('Socket.IO instance not available');
    }

    res.json({ success: true, message: 'Video frame forwarded' });
  } catch (error) {
    console.error('Error handling video stream:', error);
    res.status(500).json({ error: 'Failed to handle video stream' });
  }
});

// Get interview details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({
      success: true,
      interview
    });
  } catch (error) {
    console.error('Error fetching interview:', error);
    res.status(500).json({ error: 'Failed to fetch interview' });
  }
});

// Get events for an interview
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const events = await Event.find({ interviewId: id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalEvents = await Event.countDocuments({ interviewId: id });

    res.json({
      success: true,
      events,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalEvents / limit),
        totalEvents
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get all interviews
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    const interviews = await Interview.find()
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalInterviews = await Interview.countDocuments();

    res.json({
      success: true,
      interviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalInterviews / limit),
        totalInterviews
      }
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// Delete a single interview
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting interview with ID:', id);

    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Delete associated events
    await Event.deleteMany({ interviewId: id });
    console.log('✅ Deleted associated events');

    // Delete video from Cloudinary if exists
    if (interview.videoUrl) {
      try {
        const cloudinary = (await import('cloudinary')).v2;
        const publicId = interview.videoUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Deleted video from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.error('❌ Error deleting video from Cloudinary:', cloudinaryError);
        // Continue with interview deletion even if Cloudinary deletion fails
      }
    }

    // Delete the interview
    await Interview.findByIdAndDelete(id);
    console.log('✅ Interview deleted successfully');

    res.json({ 
      success: true, 
      message: 'Interview deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting interview:', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
});

// Delete all interviews for a specific interviewer
router.delete('/interviewer/:email/all', async (req, res) => {
  try {
    const { email } = req.params;
    console.log('🗑️ Deleting all interviews for interviewer:', email);

    // Find all interviews for this interviewer
    const interviews = await Interview.find({ interviewerEmail: email });
    console.log(`Found ${interviews.length} interviews to delete`);

    if (interviews.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No interviews found to delete' 
      });
    }

    // Delete associated events for all interviews
    const interviewIds = interviews.map(interview => interview._id);
    await Event.deleteMany({ interviewId: { $in: interviewIds } });
    console.log('✅ Deleted all associated events');

    // Delete videos from Cloudinary
    const cloudinary = (await import('cloudinary')).v2;
    for (const interview of interviews) {
      if (interview.videoUrl) {
        try {
          const publicId = interview.videoUrl.split('/').slice(-2).join('/').replace(/\.[^/.]+$/, '');
          await cloudinary.uploader.destroy(publicId);
          console.log('✅ Deleted video from Cloudinary:', publicId);
        } catch (cloudinaryError) {
          console.error('❌ Error deleting video from Cloudinary:', cloudinaryError);
          // Continue with other deletions even if one fails
        }
      }
    }

    // Delete all interviews
    await Interview.deleteMany({ interviewerEmail: email });
    console.log('✅ All interviews deleted successfully');

    res.json({ 
      success: true, 
      message: `Successfully deleted ${interviews.length} interviews` 
    });
  } catch (error) {
    console.error('❌ Error deleting all interviews:', error);
    res.status(500).json({ error: 'Failed to delete all interviews' });
  }
});

export default router;
