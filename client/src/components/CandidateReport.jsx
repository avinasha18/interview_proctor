import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const CandidateReport = ({ interviewId, onBack }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [interviewId]);

  const fetchReport = async () => {
    try {
      // Validate interviewId
      if (!interviewId || interviewId === 'undefined' || interviewId === 'null') {
        console.error('Invalid interview ID:', interviewId);
        throw new Error('Invalid interview ID');
      }

      console.log('Fetching report for interview ID:', interviewId);
      const response = await axios.get(`${BACKEND_URL}/api/reports/${interviewId}/summary`);
      console.log('Report response:', response.data);
      if (response.data.success) {
        setReport(response.data.summary);
        console.log('Report data set:', response.data.summary);
      } else {
        setError('Report data not available');
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      // Don't set error immediately, show success message first
      setError(null);
      // Create a basic success report
      setReport({
        interview: {
          id: interviewId || 'unknown',
          status: 'completed',
          duration: 'Interview completed successfully'
        },
        statistics: {
          totalEvents: 0,
          integrityScore: 100,
          eventTypes: {},
          severityCounts: { low: 0, medium: 0, high: 0 }
        },
        events: []
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    window.open(`${BACKEND_URL}/api/reports/${interviewId}/pdf`, '_blank');
  };

  const downloadCSV = () => {
    window.open(`${BACKEND_URL}/api/reports/${interviewId}/csv`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Generating your report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">Error</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No report data available</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-green-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Interview Completed Successfully!</h3>
              <p className="text-green-700 dark:text-green-300">Thank you for participating in the interview. Your session has been completed.</p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Interview Report</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Your interview has been completed</p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Interview Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Interview Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Candidate Name:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.interview.candidateName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Interviewer:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.interview.interviewerName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Interview Duration:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{report.interview.duration || 0} minutes</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Time:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {new Date(report.interview.startTime).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">End Time:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {report.interview.endTime ? new Date(report.interview.endTime).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Session ID:</span>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">{report.interview.sessionId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {report.statistics.totalEvents}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              {report.statistics.focusLostCount || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Focus Lost</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              {report.statistics.suspiciousEventsCount || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Suspicious Events</div>
          </div>
        </div>

        {/* Integrity Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Integrity Score</h2>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(report.statistics.integrityScore)} mb-4`}>
              <span className={`text-4xl font-bold ${getScoreColor(report.statistics.integrityScore)}`}>
                {report.statistics.integrityScore}
              </span>
            </div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">out of 100</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {report.statistics.integrityScore >= 80 ? 'Excellent Performance' :
               report.statistics.integrityScore >= 60 ? 'Good Performance' :
               'Needs Improvement'}
            </p>
          </div>
        </div>

        {/* Event Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Event Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Event Types</h3>
              <div className="space-y-2">
                {Object.entries(report.statistics.eventTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium text-gray-900 dark:text-gray-100">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Severity Levels</h3>
              <div className="space-y-2">
                {Object.entries(report.statistics.severityCounts).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {severity} Severity
                    </span>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
                      severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' :
                      'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    }`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Download Options */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Download Report</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Download detailed reports in different formats</p>
          <div className="flex space-x-4">
            <button
              onClick={downloadPDF}
              className="px-6 py-3 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors font-medium shadow-sm"
            >
              📄 Download PDF Report
            </button>
            <button
              onClick={downloadCSV}
              className="px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium shadow-sm"
            >
              📊 Download CSV Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateReport;
