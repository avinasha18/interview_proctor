import express from 'express';
import Event from '../models/Event.js';

const router = express.Router();

// Events endpoint for ML service
router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    
    console.log(`Received event for interview ${id}:`, eventData);
    
    // Store event in database
    const event = new Event({
      interviewId: id,
      eventType: eventData.eventType,
      message: eventData.message,
      severity: eventData.severity,
      metadata: eventData.metadata,
      timestamp: new Date(eventData.timestamp * 1000) // Convert from Unix timestamp
    });
    
    await event.save();
    console.log(`Event saved to database: ${eventData.eventType}`);
    
    // Forward event to interviewer via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(id).emit('proctoring-event', eventData);
      console.log(`Event forwarded to interviewer: ${eventData.eventType}`);
    } else {
      console.error('Socket.IO instance not available');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling event:', error);
    res.status(500).json({ error: 'Failed to handle event' });
  }
});

export default router;
