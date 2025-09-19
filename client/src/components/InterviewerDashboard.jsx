import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InterviewScheduler from './InterviewScheduler';
import InterviewerLiveView from './InterviewerLiveView';

const BACKEND_URL = 'http://localhost:3001';

const InterviewerDashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('interviewerEmail');
    const savedAuth = localStorage.getItem('isAuthenticated');
    
    if (savedEmail && savedAuth === 'true') {
      setInterviewerEmail(savedEmail);
      setIsAuthenticated(true);
    }
  }, []);

  const authenticateInterviewer = async () => {
    if (!interviewerEmail.trim()) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // First authenticate the interviewer
      const authResponse = await axios.post(`${BACKEND_URL}/api/interviews/authenticate-interviewer`, {
        email: interviewerEmail
      });
      
      if (authResponse.data.success) {
        // Then fetch their interviews
        const interviewsResponse = await axios.get(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}`);
          if (interviewsResponse.data.success) {
            setInterviews(interviewsResponse.data.interviews);
            setIsAuthenticated(true);
            
            // Save state to localStorage
            localStorage.setItem('interviewerEmail', interviewerEmail);
            localStorage.setItem('isAuthenticated', 'true');
          }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Failed to authenticate. Please check your email format.');
    } finally {
      setLoading(false);
    }
  };

  const refreshInterviews = async () => {
    if (interviewerEmail) {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}`);
        if (response.data.success) {
          // Filter out terminated interviews from the main list
          const activeInterviews = response.data.interviews.filter(interview => 
            interview.status !== 'terminated'
          );
          setInterviews(activeInterviews);
        }
      } catch (error) {
        console.error('Failed to refresh interviews:', error);
      }
    }
  };

  const deleteInterview = async (interviewId) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone and will also delete the video from Cloudinary.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting interview:', interviewId);
      const response = await axios.delete(`${BACKEND_URL}/api/interviews/${interviewId}`);
      
      if (response.data.success) {
        console.log('✅ Interview deleted successfully');
        alert('Interview deleted successfully!');
        refreshInterviews(); // Refresh the list
      } else {
        throw new Error(response.data.error || 'Failed to delete interview');
      }
    } catch (error) {
      console.error('❌ Error deleting interview:', error);
      alert('Failed to delete interview: ' + error.message);
    }
  };

  const deleteAllInterviews = async () => {
    if (!confirm('Are you sure you want to delete ALL interviews? This action cannot be undone and will also delete all videos from Cloudinary.')) {
      return;
    }

    try {
      console.log('🗑️ Deleting all interviews');
      const response = await axios.delete(`${BACKEND_URL}/api/interviews/interviewer/${interviewerEmail}/all`);
      
      if (response.data.success) {
        console.log('✅ All interviews deleted successfully');
        alert('All interviews deleted successfully!');
        setInterviews([]); // Clear the list
      } else {
        throw new Error(response.data.error || 'Failed to delete all interviews');
      }
    } catch (error) {
      console.error('❌ Error deleting all interviews:', error);
      alert('Failed to delete all interviews: ' + error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('interviewerEmail');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('selectedInterview');
    setInterviewerEmail('');
    setIsAuthenticated(false);
    setInterviews([]);
    setSelectedInterview(null);
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshInterviews();
      const interval = setInterval(refreshInterviews, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, interviewerEmail]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Interviewer Login</h1>
            <p className="text-gray-600">Enter your email to access your interviews</p>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Interviewer Email
              </label>
              <input
                type="email"
                id="email"
                value={interviewerEmail || ''}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="interviewer@company.com"
                required
              />
            </div>

            <button
              onClick={authenticateInterviewer}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedInterview) {
    return (
      <InterviewerLiveView
        interview={selectedInterview}
        onBack={() => setSelectedInterview(null)}
        onRefresh={refreshInterviews}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interviewer Dashboard</h1>
              <p className="text-gray-600 mt-2">Welcome, {interviewerEmail}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={refreshInterviews}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
              {interviews.length > 0 && (
                <button
                  onClick={deleteAllInterviews}
                  className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                >
                  🗑️ Delete All
                </button>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Interview Scheduler */}
        <div className="mb-6">
          <InterviewScheduler 
            interviewerEmail={interviewerEmail}
            onInterviewScheduled={refreshInterviews}
          />
        </div>

        {/* Interviews List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Interview History</h2>
            <div className="flex space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Total: {interviews.length}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Completed: {interviews.filter(i => i.status === 'completed').length}
              </span>
            </div>
          </div>
          
          {interviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-2">No interviews scheduled yet</p>
              <p className="text-sm text-gray-400 mt-1">Schedule your first interview above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div
                  key={interview._id}
                  className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {interview.candidateName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          interview.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : interview.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : interview.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {interview.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            <strong>Candidate Email:</strong> {interview.candidateEmail}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Interview Code:</strong> 
                            <span className="ml-2 px-2 py-1 bg-gray-100 rounded font-mono text-xs">
                              {interview.interviewCode}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Scheduled:</strong> {new Date(interview.startTime).toLocaleString()}
                          </p>
                          {interview.videoUrl && (
                            <p className="text-sm text-green-600">
                              <strong>🎥 Video:</strong> Available
                            </p>
                          )}
                          {interview.recordingStatus && (
                            <p className="text-sm text-gray-600">
                              <strong>Recording:</strong> {interview.recordingStatus}
                            </p>
                          )}
                        </div>
                        
                        {interview.status === 'completed' && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Duration</p>
                                <p className="font-semibold">{interview.duration || 0} min</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Focus Lost</p>
                                <p className="font-semibold">{interview.focusLostCount || 0}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Suspicious Events</p>
                                <p className="font-semibold">{interview.suspiciousEventsCount || 0}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Integrity Score:</span>
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                (interview.integrityScore || 0) >= 80 ? 'bg-green-100 text-green-800' :
                                (interview.integrityScore || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {interview.integrityScore || 0}/100
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {interview.status === 'active' && (
                        <button
                          onClick={() => setSelectedInterview(interview)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          View Live
                        </button>
                      )}
                      {interview.status === 'completed' && (
                        <>
                          <button
                            onClick={() => setSelectedInterview(interview)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            View Report
                          </button>
                          {interview.videoUrl && (
                            <button
                              onClick={() => window.open(interview.videoUrl, '_blank')}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                            >
                              🎥 Show Video
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`http://localhost:3001/api/reports/${interview._id}/pdf`, '_blank')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            Download PDF
                          </button>
                          <button
                            onClick={() => deleteInterview(interview._id)}
                            className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors text-sm"
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                      {interview.status === 'scheduled' && (
                        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                          Waiting for candidate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewerDashboard;
