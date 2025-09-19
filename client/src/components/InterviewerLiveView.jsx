import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import EventLog from './EventLog';
import ReportDownload from './ReportDownload';

const BACKEND_URL = 'http://localhost:3001';

const InterviewerLiveView = ({ interview, onBack, onRefresh }) => {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState(interview.status);
  const [candidateVideoUrl, setCandidateVideoUrl] = useState(null);
  const [candidateVideoFrame, setCandidateVideoFrame] = useState(null);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [freshInterviewData, setFreshInterviewData] = useState(interview);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to backend');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from backend');
      setIsConnected(false);
    });

    newSocket.on('proctoring-event', (eventData) => {
      console.log('Received proctoring event:', eventData);
      setEvents(prev => [eventData, ...prev]);
    });

    newSocket.on('candidate-disconnected', (data) => {
      console.log('Candidate disconnected:', data);
      setInterviewStatus('terminated');
      setError('Candidate disconnected from the interview');
    });

    // Listen for candidate video frames
    newSocket.on('candidate-video-frame', (data) => {
      console.log('Received candidate video frame');
      setCandidateVideoFrame(data.image);
    });

    // Listen for candidate started interview
    newSocket.on('candidate-started-interview', (data) => {
      console.log('Candidate started interview');
      setInterviewStatus('active');
    });

    // Join the interview room
    const interviewId = interview._id || interview.id;
    newSocket.emit('join-interview', interviewId);

    return () => {
      newSocket.close();
    };
  }, [interview._id]);

  // Fetch fresh data when interview status changes to completed
  useEffect(() => {
    if (interviewStatus === 'completed') {
      console.log('🔄 Interview completed, fetching fresh data...');
      fetchFreshInterviewData();
    }
  }, [interviewStatus]);

  const endInterview = async () => {
    if (isEndingInterview) {
      console.log('Interview end already in progress, ignoring duplicate click');
      return;
    }

    try {
      setIsEndingInterview(true);
      const interviewId = interview._id || interview.id;
      console.log('Ending interview with ID:', interviewId);
      
      // Immediately update UI state
      setInterviewStatus('completed');
      
      // Emit socket event to notify candidate that interview is ending
      if (socket) {
        socket.emit('end-interview', { interviewId });
      }
      
      // Process server request in background without blocking UI
      axios.post(`${BACKEND_URL}/api/interviews/${interviewId}/end`)
        .then(() => {
          console.log('✅ Interview ended successfully on server');
          // Fetch fresh data after server processing
          setTimeout(() => {
            fetchFreshInterviewData();
            onRefresh(); // Refresh parent data
          }, 1000); // Wait 1 second for server to process
        })
        .catch((err) => {
          console.error('❌ Error ending interview on server:', err);
          setError('Failed to end interview: ' + err.message);
        })
        .finally(() => {
          setIsEndingInterview(false);
        });
        
    } catch (err) {
      console.error('Error ending interview:', err);
      setError('Failed to end interview: ' + err.message);
      setIsEndingInterview(false); // Reset on error
    }
  };

  const fetchFreshInterviewData = async () => {
    try {
      setIsRefreshingData(true);
      const interviewId = interview._id || interview.id;
      console.log('🔄 Fetching fresh interview data for ID:', interviewId);
      const response = await axios.get(`${BACKEND_URL}/api/reports/${interviewId}/summary`);
      if (response.data.success) {
        const freshData = response.data.summary.interview;
        const freshStats = response.data.summary.statistics;
        console.log('✅ Fresh interview data fetched:', freshData);
        console.log('✅ Fresh statistics fetched:', freshStats);
        
        // Update both interview data and statistics
        setFreshInterviewData({
          ...freshData,
          focusLostCount: freshStats.focusLostCount,
          suspiciousEventsCount: freshStats.suspiciousEventsCount,
          integrityScore: freshStats.integrityScore,
          totalEvents: freshStats.totalEvents
        });
      }
    } catch (error) {
      console.error('❌ Error fetching fresh interview data:', error);
    } finally {
      setIsRefreshingData(false);
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
        onBack(); // Go back to dashboard
      } else {
        throw new Error(response.data.error || 'Failed to delete interview');
      }
    } catch (error) {
      console.error('❌ Error deleting interview:', error);
      alert('Failed to delete interview: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Interview Monitoring</h1>
              <div className="mt-2 flex items-center space-x-4">
                <p className="text-gray-600">
                  <strong>Candidate:</strong> {interview.candidateName}
                </p>
                <p className="text-gray-600">
                  <strong>Email:</strong> {interview.candidateEmail}
                </p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(interviewStatus)}`}>
                  {interviewStatus.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {interviewStatus === 'active' && (
                <button
                  onClick={endInterview}
                  disabled={isEndingInterview}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isEndingInterview
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isEndingInterview ? 'Ending...' : 'End Interview'}
                </button>
              )}
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {interviewStatus === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Video Feed */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Candidate Video Feed</h3>
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      candidateVideoFrame ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {candidateVideoFrame ? 'Live' : 'Waiting for Candidate'}
                    </div>
                    {candidateVideoFrame && (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600">Streaming</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {candidateVideoFrame ? (
                    <img
                      src={candidateVideoFrame}
                      alt="Candidate Video Feed"
                      className="w-full h-auto rounded-lg border border-gray-300"
                      style={{ maxHeight: '400px' }}
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-500">Waiting for Candidate</p>
                        <p className="text-xs text-gray-400 mt-1">Candidate needs to click "Start Interview"</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Monitoring Status</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Real-time focus detection</li>
                    <li>• Object detection (phones, books, etc.)</li>
                    <li>• Face tracking and analysis</li>
                    <li>• Automatic event logging</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Event Log */}
            <div className="lg:col-span-1">
              <EventLog events={events} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {interviewStatus === 'completed' ? 'Interview Completed' : 
                 interviewStatus === 'terminated' ? 'Interview Terminated' : 'Interview Scheduled'}
              </h2>
              
              {interviewStatus === 'terminated' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Interview Terminated</h3>
                    <p className="text-red-700">
                      The candidate disconnected from the interview. The session has been automatically terminated.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800">Duration</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {interview.duration || 0} min
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800">Focus Lost</h3>
                      <p className="text-2xl font-bold text-yellow-600">
                        {interview.focusLostCount || 0}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800">Suspicious Events</h3>
                      <p className="text-2xl font-bold text-red-600">
                        {interview.suspiciousEventsCount || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Summary</h3>
                    <p className="text-gray-600">
                      Interview was terminated due to candidate disconnection. 
                      Partial data is available for the duration the candidate was connected.
                    </p>
                  </div>

                  <ReportDownload interviewId={interview._id} />
                </div>
              ) : interviewStatus === 'completed' ? (
                <div className="space-y-4">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Interview Statistics</h3>
                      <div className="flex items-center space-x-2">
                        {isRefreshingData && (
                          <div className="flex items-center space-x-1 text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Refreshing...</span>
                          </div>
                        )}
                        {freshInterviewData.duration !== undefined && !isRefreshingData && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            ✅ Live Data
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800">Duration</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {freshInterviewData.duration !== undefined ? freshInterviewData.duration : (interview.duration || 0)} min
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800">Focus Lost</h3>
                      <p className="text-2xl font-bold text-yellow-600">
                        {freshInterviewData.focusLostCount !== undefined ? freshInterviewData.focusLostCount : (interview.focusLostCount || 0)}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800">Suspicious Events</h3>
                      <p className="text-2xl font-bold text-red-600">
                        {freshInterviewData.suspiciousEventsCount !== undefined ? freshInterviewData.suspiciousEventsCount : (interview.suspiciousEventsCount || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-6 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Integrity Score</h3>
                    <div className="flex items-center justify-center">
                      <div className={`text-4xl font-bold ${
                        (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 80 ? 'text-green-600' :
                        (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)}/100
                      </div>
                    </div>
                  </div>

                  <ReportDownload interviewId={interview._id} />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Interview Code: <strong>{interview.interviewCode}</strong>
                  </p>
                  <p className="text-gray-600">
                    Candidate Email: <strong>{interview.candidateEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Waiting for candidate to join...
                  </p>
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Share this code with the candidate: <strong>{interview.interviewCode}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interview Controls */}
        {interviewStatus === 'active' && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Interview Session: {interview.interviewCode}
                </h3>
                <p className="text-gray-600">
                  Started: {new Date(interview.startTime).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-4">
                <ReportDownload interviewId={interview._id} />
                {interviewStatus === 'completed' && (
                  <button
                    onClick={fetchFreshInterviewData}
                    disabled={isRefreshingData}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isRefreshingData
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isRefreshingData ? '🔄 Refreshing...' : '🔄 Refresh Data'}
                  </button>
                )}
                <button
                  onClick={endInterview}
                  disabled={isEndingInterview}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isEndingInterview
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isEndingInterview ? 'Ending...' : 'End Interview'}
                </button>
                <button
                  onClick={() => deleteInterview(interview._id)}
                  className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors"
                >
                  Delete Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewerLiveView;
