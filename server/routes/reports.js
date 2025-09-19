import express from 'express';
import PDFDocument from 'pdfkit';
import createCsvWriter from 'csv-writer';
import Interview from '../models/Interview.js';
import Event from '../models/Event.js';

const router = express.Router();

// Generate PDF report
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const events = await Event.find({ interviewId: id }).sort({ timestamp: 1 });

    // Create PDF
    const doc = new PDFDocument();
    
    // Set headers before piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proctoring-report-${interview.sessionId}.pdf"`);

    // Pipe the document to response
    doc.pipe(res);
    
    // Handle stream errors
    doc.on('error', (err) => {
      console.error('PDF stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'PDF generation stream error' });
      }
    });

    // Title
    doc.fontSize(20).text('Proctoring Report', { align: 'center' });
    doc.moveDown();

    // Interview details
    doc.fontSize(16).text('Interview Details', { underline: true });
    doc.fontSize(12);
    doc.text(`Candidate Name: ${interview.candidateName}`);
    doc.text(`Interviewer Name: ${interview.interviewerName}`);
    doc.text(`Session ID: ${interview.sessionId}`);
    doc.text(`Start Time: ${interview.startTime.toLocaleString()}`);
    doc.text(`End Time: ${interview.endTime ? interview.endTime.toLocaleString() : 'Ongoing'}`);
    doc.text(`Duration: ${interview.duration ? `${interview.duration} minutes` : 'Ongoing'}`);
    doc.text(`Total Events: ${interview.totalEvents}`);
    doc.text(`Integrity Score: ${interview.integrityScore}/100`);
    doc.moveDown();

    // Events summary
    doc.fontSize(16).text('Events Summary', { underline: true });
    doc.fontSize(12);
    
    const eventTypes = {};
    const suspiciousObjects = [];
    const objectCounts = {};
    
    events.forEach(event => {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
      if (event.eventType === 'suspicious_object' && event.metadata?.object) {
        suspiciousObjects.push(event.metadata.object);
      }
    });

    // Count objects
    suspiciousObjects.forEach(obj => {
      objectCounts[obj] = (objectCounts[obj] || 0) + 1;
    });

    // Focus lost count
    const focusLostCount = eventTypes['focus_lost'] || 0;
    doc.text(`Focus Lost (>5 seconds): ${focusLostCount} occurrences`);
    
    // Suspicious events
    const suspiciousCount = (eventTypes['suspicious_object'] || 0) + 
                          (eventTypes['multiple_faces'] || 0) + 
                          (eventTypes['face_missing'] || 0);
    doc.text(`Suspicious Events: ${suspiciousCount} occurrences`);
    
    // Object detection details
    if (suspiciousObjects.length > 0) {
      doc.moveDown();
      doc.fontSize(14).text('Detected Objects:', { underline: true });
      doc.fontSize(12);
      Object.entries(objectCounts).forEach(([obj, count]) => {
        doc.text(`• ${obj.replace('_', ' ').toUpperCase()}: ${count} detections`);
      });
    }
    doc.moveDown();

    // Detailed Analysis
    doc.fontSize(16).text('Detailed Analysis', { underline: true });
    doc.fontSize(12);
    
    // Focus analysis
    doc.text(`Focus Analysis:`);
    doc.text(`• Times candidate looked away for >5 seconds: ${focusLostCount}`);
    if (focusLostCount > 0) {
      doc.text(`• Average focus loss duration: ${Math.round(events.filter(e => e.eventType === 'focus_lost').reduce((sum, e) => sum + (e.metadata?.duration || 0), 0) / focusLostCount)} seconds`);
    }
    doc.moveDown();
    
    // Object detection analysis
    doc.text(`Object Detection Analysis:`);
    if (suspiciousObjects.length > 0) {
      doc.text(`• Total suspicious objects detected: ${suspiciousObjects.length}`);
      doc.text(`• Most frequently detected: ${Object.entries(objectCounts || {}).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A'}`);
    } else {
      doc.text(`• No suspicious objects detected`);
    }
    doc.moveDown();
    
    // Integrity score breakdown
    doc.text(`Integrity Score Breakdown:`);
    doc.text(`• Base Score: 100`);
    doc.text(`• Focus Loss Deductions: -${focusLostCount * 3} points`);
    doc.text(`• Suspicious Event Deductions: -${suspiciousCount * 5} points`);
    doc.text(`• Final Score: ${interview.integrityScore}/100`);
    doc.moveDown();

    // Detailed events
    doc.fontSize(16).text('Detailed Events Log', { underline: true });
    doc.fontSize(10);
    
    events.forEach((event, index) => {
      if (index > 0) doc.moveDown(0.5);
      doc.text(`${event.timestamp.toLocaleString()}: ${event.message}`);
      if (event.metadata && Object.keys(event.metadata).length > 0) {
        doc.text(`  Details: ${JSON.stringify(event.metadata)}`);
      }
    });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    
    // If response headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF report' });
    } else {
      // If headers already sent, just log the error
      console.error('PDF generation failed after headers sent');
    }
  }
});

// Generate CSV report
router.get('/:id/csv', async (req, res) => {
  try {
    const { id } = req.params;
    
    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const events = await Event.find({ interviewId: id }).sort({ timestamp: 1 });

    // Create CSV
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: 'temp-report.csv',
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'eventType', title: 'Event Type' },
        { id: 'message', title: 'Message' },
        { id: 'severity', title: 'Severity' }
      ]
    });

    const csvData = events.map(event => ({
      timestamp: event.timestamp.toLocaleString(),
      eventType: event.eventType.replace('_', ' ').toUpperCase(),
      message: event.message,
      severity: event.severity.toUpperCase()
    }));

    await csvWriter.writeRecords(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="proctoring-report-${interview.sessionId}.csv"`);
    
    // Read and send the CSV file
    const fs = await import('fs');
    const csvContent = fs.readFileSync('temp-report.csv', 'utf8');
    res.send(csvContent);
    
    // Clean up temp file
    fs.unlinkSync('temp-report.csv');
  } catch (error) {
    console.error('Error generating CSV report:', error);
    res.status(500).json({ error: 'Failed to generate CSV report' });
  }
});

// Get report summary
router.get('/:id/summary', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Fetching report summary for interview:', id);
    
    // Validate ObjectId format
    if (!id || id === 'undefined' || id === 'null' || id.length !== 24) {
      console.log('Invalid interview ID format:', id);
      return res.status(400).json({ error: 'Invalid interview ID format' });
    }
    
    const interview = await Interview.findById(id);
    if (!interview) {
      console.log('Interview not found:', id);
      return res.status(404).json({ error: 'Interview not found' });
    }

    console.log('Found interview:', interview._id, 'Status:', interview.status);

    const events = await Event.find({ interviewId: id });
    console.log('Found events:', events.length);

    // Calculate statistics with safe defaults
    const eventTypes = {};
    const severityCounts = { low: 0, medium: 0, high: 0 };
    
    events.forEach(event => {
      if (event.eventType) {
        eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
      }
      if (event.severity && severityCounts.hasOwnProperty(event.severity)) {
        severityCounts[event.severity]++;
      }
    });

    const summary = {
      interview: {
        id: interview._id,
        sessionId: interview.sessionId || 'N/A',
        candidateName: interview.candidateName || 'Unknown',
        interviewerName: interview.interviewerName || 'Unknown',
        startTime: interview.startTime,
        endTime: interview.endTime,
        duration: interview.duration || 0,
        status: interview.status || 'completed'
      },
      statistics: {
        totalEvents: events.length,
        integrityScore: interview.integrityScore || 100,
        focusLostCount: interview.focusLostCount || 0,
        suspiciousEventsCount: interview.suspiciousEventsCount || 0,
        eventTypes,
        severityCounts
      },
      events: events.map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType || 'unknown',
        message: event.message || 'Event occurred',
        severity: event.severity || 'medium'
      }))
    };

    console.log('Report summary generated successfully');
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching report summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch report summary',
      details: error.message 
    });
  }
});

export default router;
