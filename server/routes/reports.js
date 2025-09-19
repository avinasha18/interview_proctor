import express from 'express';
import PDFDocument from 'pdfkit';
import createCsvWriter from 'csv-writer';
import fs from 'fs';
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

    // Calculate statistics from events
    const focusLostCount = events.filter(e => e.eventType === 'focus_lost').length;
    const suspiciousCount = events.filter(e => 
      e.eventType === 'suspicious_object' ||
      e.eventType === 'multiple_faces' ||
      e.eventType === 'face_missing'
    ).length;
    const suspiciousObjects = events.filter(e => 
      e.eventType === 'suspicious_object' ||
      e.eventType === 'multiple_faces' ||
      e.eventType === 'face_missing'
    );

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, left: 50, right: 50, bottom: 50 }
    });

    // Set response headers before piping
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="interview-report-${id}.pdf"`);

    // Pipe the document to response
    doc.pipe(res);

    // Handle PDF generation errors
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate PDF report' });
      }
    });

    // Title Page
    doc.fillColor('#1a1a1a')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Proctoring Report', { align: 'center' })
       .moveDown(2);

    // Interview Details Section
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Interview Details')
       .moveDown(0.5);

    doc.fillColor('#333')
       .fontSize(12)
       .font('Helvetica')
       .text(`Candidate Name: ${interview.candidateName}`)
       .text(`Interviewer Name: ${interview.interviewerName}`)
       .text(`Session ID: ${interview.sessionId}`)
       .text(`Start Time: ${interview.startTime.toLocaleString()}`)
       .text(`End Time: ${interview.endTime ? interview.endTime.toLocaleString() : 'Ongoing'}`)
       .text(`Duration: ${interview.duration ? `${interview.duration} minutes` : 'Ongoing'}`)
       .text(`Total Events: ${interview.totalEvents}`)
       .text(`Integrity Score: ${interview.integrityScore}/100`);

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1.5);

    // Events Summary
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Events Summary')
       .moveDown(0.5);

    doc.fillColor('#444')
       .fontSize(12)
       .font('Helvetica')
       .text(`Focus Lost (>5 seconds): ${focusLostCount} occurrences`)
       .text(`Suspicious Events: ${suspiciousCount} occurrences`);

    if (suspiciousObjects.length > 0) {
      doc.moveDown(0.8)
         .fillColor('#2c3e50')
         .font('Helvetica-Bold')
         .text('Detected Objects:')
         .moveDown(0.3);

      // Count objects by type
      const objectCounts = {};
      suspiciousObjects.forEach(obj => {
        const objectType = obj.metadata?.objectType || 'Unknown';
        objectCounts[objectType] = (objectCounts[objectType] || 0) + 1;
      });

      Object.entries(objectCounts).forEach(([objectType, count]) => {
        doc.fillColor('#666')
           .font('Helvetica')
           .text(`• ${objectType}: ${count} detections`);
      });
    }

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1.5);

    // Performance Analysis
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Performance Analysis')
       .moveDown(0.8);

    doc.fillColor('#444')
       .fontSize(12)
       .font('Helvetica')
       .text(`• Times candidate looked away for >5 seconds: ${focusLostCount}`);

    if (focusLostCount > 0) {
      const avgFocusLossDuration = events
        .filter(e => e.type === 'focus_lost')
        .reduce((sum, e) => sum + (e.metadata?.duration || 0), 0) / focusLostCount;
      
      doc.text(`• Average focus loss duration: ${avgFocusLossDuration.toFixed(1)} seconds`);
    }

    doc.text(`• Suspicious object detections: ${suspiciousCount}`)
       .text(`• Overall session integrity: ${interview.integrityScore}/100`);

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1.5);

    // Scoring Breakdown
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Scoring Breakdown')
       .moveDown(0.8);

    doc.fillColor('#444')
       .fontSize(12)
       .font('Helvetica')
       .text(`• Base Score: 100 points`)
       .text(`• Focus Loss Deductions: -${focusLostCount * 3} points`)
       .text(`• Suspicious Event Deductions: -${suspiciousCount * 5} points`)
       .text(`• Final Score: ${interview.integrityScore}/100`);

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(1.5);

    // Detailed Events Log
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Detailed Events Log')
       .moveDown(0.8);

    events.forEach((event, index) => {
      doc.fillColor('#000').fontSize(11).font('Helvetica-Bold')
         .text(`${event.timestamp.toLocaleString()} - ${event.eventType.toUpperCase()}`, { continued: true });
      doc.fillColor('#666').font('Helvetica').text(` (${event.severity.toUpperCase()})`);
      doc.fillColor('#444').font('Helvetica').text(event.message);
      
      if (event.metadata) {
        doc.fillColor('#888').fontSize(10).text(`Details: ${JSON.stringify(event.metadata)}`);
      }
      
      if (index < events.length - 1) {
        doc.moveDown(0.3);
      }
    });

    doc.moveDown(0.8);

    // End document
    doc.end();

    // Handle response end
    res.on('finish', () => {
      console.log('PDF report sent successfully');
    });

    res.on('error', (error) => {
      console.error('Response error:', error);
    });

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

    // Create CSV writer
    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: 'temp-report.csv',
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'eventType', title: 'Event Type' },
        { id: 'severity', title: 'Severity' },
        { id: 'message', title: 'Message' },
        { id: 'metadata', title: 'Metadata' }
      ]
    });

    // Prepare data for CSV
    const csvData = events.map(event => ({
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      severity: event.severity,
      message: event.message,
      metadata: JSON.stringify(event.metadata || {})
    }));

    // Write CSV
    await csvWriter.writeRecords(csvData);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="interview-report-${id}.csv"`);

    // Send file
    res.download('temp-report.csv');
    
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
    
    const interview = await Interview.findById(id);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const events = await Event.find({ interviewId: id }).sort({ timestamp: 1 });

    // Debug: Log all events found
    console.log(`📊 Found ${events.length} events for interview ${id}:`);
    events.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventType} - ${event.message} (${event.severity})`);
    });

    // Calculate duration properly
    let duration = 0;
    if (interview.startTime) {
      const endTime = interview.endTime || new Date();
      duration = Math.round((endTime - interview.startTime) / (1000 * 60)); // in minutes
    }

    // Calculate statistics
    const focusLostCount = events.filter(e => e.eventType === 'focus_lost').length;
    const suspiciousCount = events.filter(e => 
      e.eventType === 'suspicious_object' ||
      e.eventType === 'multiple_faces' ||
      e.eventType === 'face_missing'
    ).length;
    const totalEvents = events.length;

    console.log(`📊 Statistics for interview ${id}:`);
    console.log(`  Total Events: ${totalEvents}`);
    console.log(`  Focus Lost: ${focusLostCount}`);
    console.log(`  Suspicious Events: ${suspiciousCount}`);

    // Calculate integrity score
    let integrityScore = 100;
    integrityScore -= focusLostCount * 3; // -3 points per focus loss
    integrityScore -= suspiciousCount * 5; // -5 points per suspicious event
    integrityScore = Math.max(0, integrityScore); // Don't go below 0

    const summary = {
      interview: {
        id: interview._id,
        candidateName: interview.candidateName,
        interviewerName: interview.interviewerName,
        sessionId: interview.sessionId,
        startTime: interview.startTime,
        endTime: interview.endTime,
        duration: duration,
        status: interview.status,
        integrityScore: integrityScore
      },
      statistics: {
        totalEvents: totalEvents,
        focusLostCount: focusLostCount,
        suspiciousEventsCount: suspiciousCount,
        integrityScore: integrityScore
      },
      events: events.map(event => ({
        id: event._id,
        type: event.type,
        eventType: event.eventType,
        severity: event.severity,
        message: event.message,
        timestamp: event.timestamp,
        metadata: event.metadata
      }))
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching report summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch report summary',
      message: error.message
    });
  }
});

export default router;
