import React, { useState } from 'react';
import axios from 'axios';

const ReportDownload = ({ interviewId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const downloadReport = async (format) => {
    if (!interviewId) {
      setError('No interview ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.VITE_BACKEND_URL}/api/reports/${interviewId}/${format}`,
        { responseType: 'blob' }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `proctoring-report-${interviewId}-${timestamp}.${format}`;
      link.setAttribute('download', filename);
      
      // Append to html link element page
      document.body.appendChild(link);
      
      // Start download
      link.click();
      
      // Clean up and remove the link
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSummary = async () => {
    if (!interviewId) {
      setError('No interview ID available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `${process.env.VITE_BACKEND_URL}/api/reports/${interviewId}/summary`
      );

      if (response.data.success) {
        const summary = response.data.summary;
        
        // Create a formatted text summary
        const textSummary = `
PROCTORING REPORT SUMMARY
========================

Interview Details:
- Session ID: ${summary.interview.sessionId}
- Candidate: ${summary.interview.candidateName}
- Interviewer: ${summary.interview.interviewerName}
- Start Time: ${new Date(summary.interview.startTime).toLocaleString()}
- End Time: ${summary.interview.endTime ? new Date(summary.interview.endTime).toLocaleString() : 'Ongoing'}
- Duration: ${summary.interview.duration ? `${summary.interview.duration} minutes` : 'Ongoing'}
- Status: ${summary.interview.status}

Statistics:
- Total Events: ${summary.statistics.totalEvents}
- Integrity Score: ${summary.statistics.integrityScore}/100

Event Breakdown:
${Object.entries(summary.statistics.eventTypes).map(([type, count]) => 
  `- ${type.replace('_', ' ').toUpperCase()}: ${count} occurrences`
).join('\n')}

Severity Breakdown:
- High: ${summary.statistics.severityCounts.high} events
- Medium: ${summary.statistics.severityCounts.medium} events
- Low: ${summary.statistics.severityCounts.low} events

Recent Events:
${summary.events.slice(0, 10).map(event => 
  `- ${new Date(event.timestamp).toLocaleString()}: ${event.message}`
).join('\n')}

Generated on: ${new Date().toLocaleString()}
        `;

        // Create and download text file
        const blob = new Blob([textSummary], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `proctoring-summary-${interviewId}-${timestamp}.txt`;
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading summary:', err);
      setError('Failed to download summary: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex space-x-2">
        <button
          onClick={() => downloadReport('pdf')}
          disabled={isLoading}
          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : 'PDF'}
        </button>
        
        <button
          onClick={() => downloadReport('csv')}
          disabled={isLoading}
          className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : 'CSV'}
        </button>
        
        <button
          onClick={downloadSummary}
          disabled={isLoading}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : 'Summary'}
        </button>
      </div>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
};

export default ReportDownload;
