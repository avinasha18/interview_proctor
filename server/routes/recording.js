import express from 'express';
import videoRecordingService from '../services/videoRecordingService.js';
import Interview from '../models/Interview.js';

const router = express.Router();

// Start video recording
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateName } = req.body;

    console.log(`🎬 START RECORDING ENDPOINT CALLED: Starting recording for interview: ${id}`);
    console.log(`🎬 Request body:`, req.body);
    console.log(`🎬 Candidate name: ${candidateName}`);

    // Verify interview exists
    const interview = await Interview.findById(id);
    if (!interview) {
      console.error(`❌ Interview not found: ${id}`);
      return res.status(404).json({ error: 'Interview not found' });
    }

    console.log(`🎬 Found interview: ${interview._id}, Status: ${interview.status}`);

    // Start recording
    const result = await videoRecordingService.startRecording(id, candidateName || interview.candidateName);
    
    console.log(`🎬 Start recording result:`, result);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      console.error(`❌ Start recording failed: ${result.error}`);
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Error starting recording:', error);
    res.status(500).json({ error: 'Failed to start recording' });
  }
});

// Add video chunk
router.post('/:id/chunk', async (req, res) => {
  try {
    const { id } = req.params;
    const { videoBlob } = req.body;

    if (!videoBlob) {
      return res.status(400).json({ error: 'Video blob is required' });
    }

    // Check if the payload is too large
    if (videoBlob.length > 50 * 1024 * 1024) { // 50MB limit
      console.log('⚠️ Video chunk too large, skipping...');
      return res.status(413).json({ error: 'Video chunk too large' });
    }

    const result = await videoRecordingService.addVideoChunk(id, videoBlob);
    
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error adding video chunk:', error);
    res.status(500).json({ error: 'Failed to add video chunk' });
  }
});

// Stop video recording
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🛑 STOP ENDPOINT CALLED: Stopping recording for interview: ${id}`);
    console.log(`🛑 Request body:`, req.body);
    console.log(`🛑 Request headers:`, req.headers);

    const result = await videoRecordingService.stopRecording(id);
    
    console.log(`🛑 Stop recording result:`, result);
    
    if (result.success) {
      res.json({ 
        success: true, 
        videoUrl: result.videoUrl,
        message: result.message 
      });
    } else {
      console.error(`❌ Stop recording failed: ${result.error}`);
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('❌ Error stopping recording:', error);
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// Get recording status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const status = videoRecordingService.getRecordingStatus(id);
    const interview = await Interview.findById(id);
    
    res.json({
      success: true,
      status: status,
      recordingStatus: interview?.recordingStatus || 'not_started',
      videoUrl: interview?.videoUrl || null
    });
  } catch (error) {
    console.error('Error getting recording status:', error);
    res.status(500).json({ error: 'Failed to get recording status' });
  }
});

// Manual cleanup endpoint - process any pending recordings
router.post('/cleanup/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🧹 Manual cleanup requested for interview: ${id}`);

    const status = videoRecordingService.getRecordingStatus(id);
    
    if (status && status.isRecording) {
      console.log(`🛑 Processing pending recording for interview: ${id}`);
      const result = await videoRecordingService.stopRecording(id);
      
      if (result.success) {
        // Update interview with video URL
        const interview = await Interview.findById(id);
        if (interview) {
          interview.videoUrl = result.videoUrl;
          interview.recordingStatus = 'completed';
          await interview.save();
        }
        
        res.json({
          success: true,
          message: 'Recording processed successfully',
          videoUrl: result.videoUrl
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } else {
      res.json({
        success: true,
        message: 'No active recording found to process'
      });
    }
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ error: 'Failed to process recording' });
  }
});

// Debug endpoint - list all active recordings
router.get('/debug/active', async (req, res) => {
  try {
    console.log('🔍 Debug: Listing all active recordings');
    
    // Get all active recordings from the service
    const activeRecordings = [];
    for (const [interviewId, recording] of videoRecordingService.recordings.entries()) {
      activeRecordings.push({
        interviewId,
        candidateName: recording.candidateName,
        startTime: recording.startTime,
        isRecording: recording.isRecording,
        chunksCount: recording.chunks.length
      });
    }
    
    console.log(`🔍 Found ${activeRecordings.length} active recordings:`, activeRecordings);
    
    res.json({
      success: true,
      activeRecordings: activeRecordings,
      count: activeRecordings.length
    });
  } catch (error) {
    console.error('Error getting active recordings:', error);
    res.status(500).json({ error: 'Failed to get active recordings' });
  }
});

export default router;
