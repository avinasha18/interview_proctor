import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import EventLog from './EventLog';
import ReportDownload from './ReportDownload';

import { BACKEND_URL } from '../utils/config';

const InterviewerLiveView = ({ interview, onBack, onRefresh }) => {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState(interview.status);
  const [candidateVideoUrl, setCandidateVideoUrl] = useState(null);
  const [candidateVideoFrame, setCandidateVideoFrame] = useState(null);
  const [lastFrameTime, setLastFrameTime] = useState(null);
  const lastVideoFrameRef = useRef(null);
  const [isEndingInterview, setIsEndingInterview] = useState(false);
  const [freshInterviewData, setFreshInterviewData] = useState(interview);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  
  // Frame buffering and stability
  const frameBufferRef = useRef([]);
  const frameValidationTimeoutRef = useRef(null);
  const lastFrameUpdateRef = useRef(0);
  const [isReceivingFrames, setIsReceivingFrames] = useState(false);
  const [frameError, setFrameError] = useState(null);

  const fetchExistingEvents = async () => {
    try {
      const interviewId = interview._id || interview.id;
      console.log('📋 Fetching existing events for interview:', interviewId);
      
      const response = await axios.get(`${BACKEND_URL}/api/interviews/${interviewId}/events`);
      if (response.data.success) {
        console.log('📋 Loaded existing events:', response.data.events.length);
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error('❌ Error fetching existing events:', error);
    }
  };

  // Frame validation and buffering functions
  const validateFrame = (frameData) => {
    if (!frameData || typeof frameData !== 'string') {
      console.log('❌ Frame validation failed: not a string');
      return false;
    }
    
    // Check if it's a valid base64 image (either data URL or raw base64)
    const isDataUrl = frameData.startsWith('data:image/');
    const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(frameData);
    
    if (!isDataUrl && !isBase64) {
      console.log('❌ Frame validation failed: not valid base64 or data URL');
      return false;
    }
    
    // Check minimum size (at least 50 characters for a valid image)
    if (frameData.length < 50) {
      console.log('❌ Frame validation failed: too small, length:', frameData.length);
      return false;
    }
    
    console.log('✅ Frame validation passed');
    return true;
  };

  const addFrameToBuffer = (frameData) => {
    console.log('🔄 Processing frame data:', {
      type: typeof frameData,
      length: frameData?.length,
      isValid: validateFrame(frameData),
      preview: frameData?.substring(0, 30) + '...'
    });
    
    if (!validateFrame(frameData)) {
      console.warn('⚠️ Invalid frame data received, skipping');
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastFrameUpdateRef.current;
    
    // Throttle frame updates to prevent flickering (max 10 FPS)
    if (timeSinceLastUpdate < 100) {
      console.log('⏱️ Frame throttled (too fast)');
      return;
    }

    // Clear any previous frame errors
    setFrameError(null);
    
    // Add to buffer (keep last 5 frames for better stability)
    frameBufferRef.current.push({
      data: frameData,
      timestamp: now
    });
    
    // Keep only last 5 frames
    if (frameBufferRef.current.length > 5) {
      frameBufferRef.current.shift();
    }
    
    // Update current frame with the latest valid frame
    setCandidateVideoFrame(frameData);
    lastVideoFrameRef.current = frameData;
    setLastFrameTime(now);
    setIsReceivingFrames(true);
    lastFrameUpdateRef.current = now;
    
    console.log('✅ Frame added to buffer, buffer size:', frameBufferRef.current.length);
    
    // Clear any existing timeout
    if (frameValidationTimeoutRef.current) {
      clearTimeout(frameValidationTimeoutRef.current);
    }
    
    // Set timeout to detect if frames stop coming
    frameValidationTimeoutRef.current = setTimeout(() => {
      setIsReceivingFrames(false);
      console.log('⚠️ No frames received for 3 seconds');
    }, 3000);
  };

  const getStableFrame = () => {
    // Return the most recent valid frame from buffer
    let frameData = null;
    if (frameBufferRef.current.length > 0) {
      frameData = frameBufferRef.current[frameBufferRef.current.length - 1].data;
      console.log('📸 Getting frame from buffer, buffer size:', frameBufferRef.current.length);
    } else {
      frameData = candidateVideoFrame;
      console.log('📸 Getting frame from candidateVideoFrame');
    }
    
    // Convert raw base64 to data URL if needed
    if (frameData && !frameData.startsWith('data:image/')) {
      const dataUrl = `data:image/jpeg;base64,${frameData}`;
      console.log('📸 Converted base64 to data URL, length:', dataUrl.length);
      return dataUrl;
    }
    
    console.log('📸 Returning frame data as-is, length:', frameData?.length);
    return frameData;
  };

  // Enhanced frame error recovery
  const handleFrameError = () => {
    console.log('🔄 Frame error detected, attempting recovery...');
    
    // Clear the current frame to trigger a refresh
    setCandidateVideoFrame(null);
    
    // Try to get a frame from the buffer
    if (frameBufferRef.current.length > 0) {
      const lastValidFrame = frameBufferRef.current[frameBufferRef.current.length - 1];
      if (lastValidFrame && validateFrame(lastValidFrame.data)) {
        console.log('✅ Recovered frame from buffer');
        setCandidateVideoFrame(lastValidFrame.data);
        setFrameError(null);
        return;
      }
    }
    
    // If no valid frame in buffer, wait for next frame
    console.log('⏳ Waiting for next valid frame...');
  };

  // Simple debug for video frame changes
  useEffect(() => {
    if (candidateVideoFrame) {
      console.log('📹 New video frame received');
    }
  }, [candidateVideoFrame]);

  useEffect(() => {
    // Fetch existing events first
    fetchExistingEvents();
    
    // Initialize socket connection with larger message size limits
    const newSocket = io(BACKEND_URL, {
      maxHttpBufferSize: 50 * 1024 * 1024, // 50MB limit
      timeout: 60000,
      forceNew: true
    });
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
      console.log('📹 Received candidate video frame');
      console.log('📹 Frame data type:', typeof data?.image);
      console.log('📹 Frame data length:', data?.image?.length);
      console.log('📹 Frame data preview:', data?.image?.substring(0, 50) + '...');
      
      if (data && data.image) {
        addFrameToBuffer(data.image);
      } else {
        console.warn('⚠️ Received invalid video frame data:', data);
        // Don't set frame error here, just log it
      }
    });

    // Listen for candidate started interview
    newSocket.on('candidate-started-interview', (data) => {
      console.log('Candidate started interview');
      setInterviewStatus('active');
    });

    // Join the interview room
    const interviewId = interview._id || interview.id;
    console.log('🔍 Interviewer joining interview room:', interviewId);
    console.log('🔍 Interview object:', interview);
    newSocket.emit('join-interview', interviewId);

    return () => {
      newSocket.close();
      // Cleanup frame validation timeout
      if (frameValidationTimeoutRef.current) {
        clearTimeout(frameValidationTimeoutRef.current);
      }
    };
  }, [interview._id]);

  // Fetch fresh data when interview status changes to completed
  useEffect(() => {
    if (interviewStatus === 'completed') {
      console.log('🔄 Interview completed, fetching fresh data...');
      fetchFreshInterviewData();
    }
  }, [interviewStatus]);

  // Also fetch fresh data when component mounts if interview is already completed
  useEffect(() => {
    if (interview.status === 'completed' && !freshInterviewData.duration) {
      console.log('🔄 Interview already completed, fetching fresh data on mount...');
      fetchFreshInterviewData();
    }
  }, [interview.status]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Live Interview Monitoring</h1>
              <div className="mt-2 flex items-center space-x-4">
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Candidate:</strong> {interview.candidateName}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <strong>Email:</strong> {interview.candidateEmail}
                </p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(interviewStatus)}`}>
                  {interviewStatus.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {interviewStatus === 'active' && (
                <button
                  onClick={endInterview}
                  disabled={isEndingInterview}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                    isEndingInterview
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                  }`}
                >
                  {isEndingInterview ? 'Ending...' : 'End Interview'}
                </button>
              )}
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-medium shadow-sm"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {interviewStatus === 'active' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidate Video Feed */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Candidate Video Feed</h3>
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isReceivingFrames ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                      candidateVideoFrame ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {isReceivingFrames ? 'Live Streaming' : 
                       candidateVideoFrame ? 'Stable Feed' : 
                       'Waiting for Candidate'}
                    </div>
                    {candidateVideoFrame && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isReceivingFrames ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
                        <span className={`text-sm ${isReceivingFrames ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                          {isReceivingFrames ? 'Active' : 'Stable'}
                        </span>
                        {lastFrameTime && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({Math.round((Date.now() - lastFrameTime) / 1000)}s ago)
                          </span>
                        )}
                      </div>
                    )}
                    {frameError && (
                      <div className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs">
                        Frame Error
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative">
                  {/* Fixed size container to prevent flickering */}
                  <div className="w-full h-80 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden relative">
                    {getStableFrame() ? (
                      <img
                        src={getStableFrame()}
                        alt="Candidate Video Feed"
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          // Use enhanced error recovery
                          handleFrameError();
                        }}
                        onLoad={() => {
                          // Clear any previous errors when image loads successfully
                          setFrameError(null);
                        }}
                        style={{ 
                          imageRendering: 'auto',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Waiting for Candidate</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Candidate needs to click "Start Interview"</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Frame error overlay */}
                    {frameError && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 rounded text-xs">
                        {frameError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Monitoring Status</h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Real-time focus detection</li>
                    <li>• Object detection (phones, books, etc.)</li>
                    <li>• Face tracking and analysis</li>
                    <li>• Automatic event logging</li>
                    <li>• Stable frame buffering (no flickering)</li>
                    <li>• Frame validation and error handling</li>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {interviewStatus === 'completed' ? 'Interview Completed' : 
                 interviewStatus === 'terminated' ? 'Interview Terminated' : 'Interview Scheduled'}
              </h2>
              
              {interviewStatus === 'terminated' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Interview Terminated</h3>
                    <p className="text-red-700 dark:text-red-300">
                      The candidate disconnected from the interview. The session has been automatically terminated.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold text-blue-800 dark:text-blue-200">Duration</h3>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {freshInterviewData.duration !== undefined ? freshInterviewData.duration : (interview.duration || 0)} min
                      </p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Focus Lost</h3>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {freshInterviewData.focusLostCount !== undefined ? freshInterviewData.focusLostCount : (interview.focusLostCount || 0)}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <h3 className="font-semibold text-red-800 dark:text-red-200">Suspicious Events</h3>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {freshInterviewData.suspiciousEventsCount !== undefined ? freshInterviewData.suspiciousEventsCount : (interview.suspiciousEventsCount || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg mb-6 border border-gray-200 dark:border-gray-600">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Session Summary</h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Interview was terminated due to candidate disconnection. 
                      Partial data is available for the duration the candidate was connected.
                    </p>
                  </div>

                  <ReportDownload interviewId={interview._id} />
                </div>
              ) : interviewStatus === 'completed' ? (
                <div className="space-y-6">
                  {/* Header with Live Data Indicator */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Interview Statistics</h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive analysis of the interview session</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {isRefreshingData && (
                          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                            <span className="text-sm font-medium">Refreshing...</span>
                          </div>
                        )}
                        {freshInterviewData.duration !== undefined && !isRefreshingData && (
                          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">✅ Live Data</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Duration</p>
                          <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                            {freshInterviewData.duration !== undefined ? freshInterviewData.duration : (interview.duration || 0)}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">minutes</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Focus Lost</p>
                          <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-200">
                            {freshInterviewData.focusLostCount !== undefined ? freshInterviewData.focusLostCount : (interview.focusLostCount || 0)}
                          </p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400">incidents</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl border border-red-200 dark:border-red-800 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600 dark:text-red-400">Suspicious Events</p>
                          <p className="text-3xl font-bold text-red-800 dark:text-red-200">
                            {freshInterviewData.suspiciousEventsCount !== undefined ? freshInterviewData.suspiciousEventsCount : (interview.suspiciousEventsCount || 0)}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400">detected</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Integrity Score */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-8 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Integrity Score</h3>
                      <div className="relative inline-block">
                        <div className={`text-6xl font-bold ${
                          (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 80 ? 'text-green-600 dark:text-green-400' :
                          (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)}
                        </div>
                        <div className="text-2xl font-semibold text-gray-600 dark:text-gray-400">/100</div>
                      </div>
                      <div className={`mt-4 px-4 py-2 rounded-full text-sm font-medium inline-block ${
                        (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' :
                        (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      }`}>
                        {(freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 80 ? 'Excellent Performance' :
                         (freshInterviewData.integrityScore !== undefined ? freshInterviewData.integrityScore : (interview.integrityScore || 0)) >= 60 ? 'Good Performance' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div>

                  <ReportDownload interviewId={interview._id} />
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Interview Code: <strong className="text-gray-900 dark:text-gray-100">{interview.interviewCode}</strong>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Candidate Email: <strong className="text-gray-900 dark:text-gray-100">{interview.candidateEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Waiting for candidate to join...
                  </p>
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Share this code with the candidate: <strong className="text-yellow-900 dark:text-yellow-100">{interview.interviewCode}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interview Controls */}
        {interviewStatus === 'active' && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Interview Session: {interview.interviewCode}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Started: {new Date(interview.startTime).toLocaleString()}
                </p>
              </div>
              <div className="flex space-x-4">
                <ReportDownload interviewId={interview._id} />
                {interviewStatus === 'completed' && (
                  <button
                    onClick={fetchFreshInterviewData}
                    disabled={isRefreshingData}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium shadow-sm ${
                      isRefreshingData
                        ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                    }`}
                  >
                    {isRefreshingData ? '🔄 Refreshing...' : '🔄 Refresh Data'}
                  </button>
                )}
                <button
                  onClick={endInterview}
                  disabled={isEndingInterview}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium shadow-sm ${
                    isEndingInterview
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed'
                      : 'bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600'
                  }`}
                >
                  {isEndingInterview ? 'Ending...' : 'End Interview'}
                </button>
                <button
                  onClick={() => deleteInterview(interview._id)}
                  className="px-4 py-2 bg-red-800 dark:bg-red-900 text-white rounded-lg hover:bg-red-900 dark:hover:bg-red-800 transition-colors font-medium shadow-sm"
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
