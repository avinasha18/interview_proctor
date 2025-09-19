import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import VideoStream from './VideoStream';
import EventLog from './EventLog';
import CandidateReport from './CandidateReport';
import videoRecordingService from '../services/videoRecordingService';

console.log('🔍 Video recording service imported:', videoRecordingService);

const BACKEND_URL = 'http://localhost:3001';
const PYTHON_SERVICE_URL = 'http://localhost:8000';

const CandidatePortal = ({ initialCode = '' }) => {
  const [interviewCode, setInterviewCode] = useState(initialCode);
  const [interview, setInterview] = useState(null);
  const [events, setEvents] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('not_started');

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedCode = localStorage.getItem('interviewCode');
    const savedInterview = localStorage.getItem('currentInterview');
    const savedStarted = localStorage.getItem('isInterviewStarted');
    
    if (savedCode && !interviewCode) {
      setInterviewCode(savedCode);
    }
    
    // Temporarily disable interview restoration to debug
    // if (savedInterview) {
    //   try {
    //     const parsedInterview = JSON.parse(savedInterview);
    //     console.log('Restored interview from localStorage:', parsedInterview);
    //     console.log('Interview ID:', parsedInterview._id);
    //     setInterview(parsedInterview);
    //   } catch (error) {
    //     console.error('Error parsing saved interview:', error);
    //   }
    // }
    
    // Don't auto-restore interview started state - require user to click Start Interview
    // if (savedStarted === 'true') {
    //   setIsInterviewStarted(true);
    // }
  }, []);

  useEffect(() => {
    if (interview) {
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

      // Listen for interview end event
    newSocket.on('interview-ended', async (data) => {
      console.log('Interview ended by interviewer:', data);
      
      // Stop video recording if active
      if (isRecording && interview) {
        try {
          console.log('🛑 Stopping video recording due to interview end...');
          const result = await videoRecordingService.stopRecording(interview.id);
          
          if (result.success) {
            console.log('✅ Video recording stopped successfully');
            setRecordingStatus('completed');
          } else {
            console.error('❌ Failed to stop video recording:', result.error);
          }
        } catch (error) {
          console.error('❌ Error stopping video recording:', error);
        }
      } else {
        console.log('ℹ️ No active recording to stop (may have been processed already)');
      }
      
      setShowReport(true);
      setIsRecording(false);
      setRecordingStatus('completed');
      // Clear any existing errors
      setError(null);
    });

    newSocket.on('candidate-disconnected', async () => {
      console.log('Disconnected from interview');
      
      // Stop video recording if active
      if (isRecording && interview) {
        try {
          console.log('🛑 Stopping video recording due to disconnect...');
          const result = await videoRecordingService.stopRecording(interview.id);
          
          if (result.success) {
            console.log('✅ Video recording stopped successfully');
            setRecordingStatus('completed');
          } else {
            console.error('❌ Failed to stop video recording:', result.error);
          }
        } catch (error) {
          console.error('❌ Error stopping video recording:', error);
        }
      } else {
        console.log('ℹ️ No active recording to stop (may have been processed already)');
      }
      
      setError('You have been disconnected from the interview');
      setIsRecording(false);
      setRecordingStatus('completed');
    });

      // Join the interview room
      newSocket.emit('join-interview', interview.id);

      return () => {
        newSocket.close();
      };
    }
  }, [interview]);

  const joinInterview = async () => {
    if (!interviewCode.trim()) {
      alert('Please enter the interview code');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${BACKEND_URL}/api/interviews/join/${interviewCode}`);
      
      if (response.data.success) {
        setInterview(response.data.interview);
        
        // Save state to localStorage
        localStorage.setItem('interviewCode', interviewCode);
        localStorage.setItem('currentInterview', JSON.stringify(response.data.interview));
      }
    } catch (error) {
      console.error('Error joining interview:', error);
      setError('Failed to join interview: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    console.log('🚀 startInterview function called!');
    console.log('📋 Interview object:', interview);
    console.log('🎥 Video recording service:', videoRecordingService);
    
    setIsInterviewStarted(true);
    localStorage.setItem('isInterviewStarted', 'true');
    
    // Start video recording
    try {
      console.log('🎥 Starting video recording for interview...', {
        interviewId: interview.id,
        candidateName: interview.candidateName,
        interview: interview
      });
      
      if (!videoRecordingService) {
        console.error('❌ Video recording service is not available!');
        setError('Video recording service not available');
        return;
      }
      
      const recordingResult = await videoRecordingService.startRecording(
        interview.id, 
        interview.candidateName
      );
      
      if (recordingResult.success) {
        setIsRecording(true);
        setRecordingStatus('recording');
        console.log('✅ Video recording started successfully');
      } else {
        console.error('❌ Failed to start video recording:', recordingResult.error);
        setError('Failed to start video recording: ' + recordingResult.error);
      }
    } catch (error) {
      console.error('❌ Error starting video recording:', error);
      setError('Error starting video recording: ' + error.message);
    }
    
    // Notify interviewer that candidate has started
    if (socket) {
      socket.emit('candidate-started-interview', interview.id);
    }
  };

  const leaveInterview = async () => {
    // Stop video recording if active
    if (isRecording && interview) {
      try {
        console.log('🛑 Stopping video recording...');
        const result = await videoRecordingService.stopRecording(interview.id);
        
        if (result.success) {
          console.log('✅ Video recording stopped successfully');
          setRecordingStatus('completed');
        } else {
          console.error('❌ Failed to stop video recording:', result.error);
        }
      } catch (error) {
        console.error('❌ Error stopping video recording:', error);
      }
    }

    setInterview(null);
    setEvents([]);
    setInterviewCode('');
    setError(null);
    setShowReport(false);
    setIsInterviewStarted(false);
    setIsRecording(false);
    setRecordingStatus('not_started');
    
    // Clear localStorage
    localStorage.removeItem('interviewCode');
    localStorage.removeItem('currentInterview');
    localStorage.removeItem('isInterviewStarted');
  };

  // Clear localStorage on component mount to start fresh
  useEffect(() => {
    localStorage.removeItem('currentInterview');
    console.log('Cleared localStorage to start fresh');
  }, []);

  // Show report if interview is completed
  if (showReport && interview) {
    const interviewId = interview._id || interview.id;
    console.log('Showing report for interview ID:', interviewId);
    return (
      <CandidateReport 
        interviewId={interviewId} 
        onBack={leaveInterview}
      />
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Interview</h1>
            <p className="text-gray-600">Enter your interview code to begin</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="interviewCode" className="block text-sm font-medium text-gray-700 mb-2">
                Interview Code
              </label>
              <input
                type="text"
                id="interviewCode"
                value={interviewCode || ''}
                onChange={(e) => setInterviewCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                placeholder="ABC123"
                maxLength="6"
                required
              />
            </div>

            <button
              onClick={joinInterview}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {loading ? 'Joining...' : 'Join Interview'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Ensure good lighting and clear background</li>
              <li>• Keep your face visible to the camera</li>
              <li>• Avoid using phones or other devices</li>
              <li>• Stay focused on the screen during the interview</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Interview Session</h1>
              <div className="mt-2 flex items-center space-x-4">
                <p className="text-gray-600">
                  <strong>Interviewer:</strong> {interview.interviewerName}
                </p>
                <p className="text-gray-600">
                  <strong>Code:</strong> {interviewCode}
                </p>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ACTIVE
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
              <button
                onClick={leaveInterview}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Leave Interview
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
        {console.log('🔍 isInterviewStarted state:', isInterviewStarted)}
        {!isInterviewStarted ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Interview?</h2>
              <p className="text-gray-600 mb-6">
                You are now connected to the interview session. Click the button below to start your video stream and begin the interview.
              </p>
              
              <button
                onClick={startInterview}
                className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
              >
                🎥 Start Interview
              </button>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">What happens when you start:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Your camera will be activated</li>
                  <li>• Video feed will be sent to interviewer</li>
                  <li>• Real-time monitoring will begin</li>
                  <li>• You'll see live event notifications</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Stream */}
            <div className="lg:col-span-1">
              {interview && interview.id ? (
                <VideoStream 
                  interviewId={interview.id}
                  pythonServiceUrl={PYTHON_SERVICE_URL}
                  onError={setError}
                  onEvent={(event) => {
                    console.log('Received proctoring event:', event);
                    setEvents(prev => [...prev, event]);
                  }}
                  isActive={isInterviewStarted && !showReport}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-center">
                    <p className="text-gray-500">Loading video stream...</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Interview: {interview ? 'Loaded' : 'Not loaded'} | 
                      ID: {interview?.id || 'No ID'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Recording: {isRecording ? '🔴 Active' : '⏹️ Stopped'} | 
                      Status: {recordingStatus}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Full interview object: {JSON.stringify(interview, null, 2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Event Log */}
            <div className="lg:col-span-1">
              <EventLog events={events} />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Interview Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-3">✅ Do:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Look directly at the camera/screen</li>
                <li>• Ensure good lighting</li>
                <li>• Keep your face visible</li>
                <li>• Stay in frame during the interview</li>
                <li>• Maintain focus on the screen</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-3">❌ Avoid:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Using phones or other devices</li>
                <li>• Looking away from screen frequently</li>
                <li>• Having multiple people in frame</li>
                <li>• Using unauthorized materials</li>
                <li>• Covering your face</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Important</h4>
            <p className="text-sm text-blue-700">
              Your video feed is automatically being monitored by the interviewer. 
              Any violations will be logged and affect your integrity score. 
              Stay focused and follow the guidelines above.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CandidatePortal;
