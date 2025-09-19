import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import axios from 'axios';
import { 
  Video, 
  Calendar, 
  Shield, 
  Eye, 
  Phone, 
  Book,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  PlayCircle,
  StopCircle
} from 'lucide-react';

import VideoStream from './VideoStream';
import EventLog from './EventLog';
import CandidateReport from './CandidateReport';
import videoRecordingService from '../services/videoRecordingService';
import Button from './ui/Button';
import Input from './ui/Input';
import { Card, CardContent, CardHeader } from './ui/Card';
import Badge from './ui/Badge';
import ThemeToggle from './ui/ThemeToggle';
import { BACKEND_URL, PYTHON_SERVICE_URL } from '../utils/config';
console.log('🔍 Video recording service imported:', videoRecordingService);

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
              videoRecordingService.forceStopRecording();
            }
          } catch (error) {
            console.error('❌ Error stopping video recording:', error);
            videoRecordingService.forceStopRecording();
          }
        } else {
          console.log('ℹ️ No active recording to stop (may have been processed already)');
          videoRecordingService.forceStopRecording();
        }
        
        setIsInterviewStarted(false);
        setShowReport(true);
        setIsRecording(false);
        setRecordingStatus('completed');
        setError(null);
      });

      // Listen for end-interview event from interviewer
      newSocket.on('end-interview', async (data) => {
        console.log('Received end-interview event from interviewer:', data);
        
        if (isRecording && interview) {
          try {
            console.log('🛑 Stopping video recording due to interviewer ending interview...');
            const result = await videoRecordingService.stopRecording(interview.id);
            
            if (result.success) {
              console.log('✅ Video recording stopped successfully');
              setRecordingStatus('completed');
            } else {
              console.error('❌ Failed to stop video recording:', result.error);
              videoRecordingService.forceStopRecording();
            }
          } catch (error) {
            console.error('❌ Error stopping video recording:', error);
            videoRecordingService.forceStopRecording();
          }
        } else {
          console.log('ℹ️ No active recording to stop (may have been processed already)');
          videoRecordingService.forceStopRecording();
        }
        
        setIsInterviewStarted(false);
        setShowReport(true);
        setIsRecording(false);
        setRecordingStatus('completed');
        setError(null);
      });

      newSocket.on('candidate-disconnected', async () => {
        console.log('Disconnected from interview');
        
        if (isRecording && interview) {
          try {
            console.log('🛑 Stopping video recording due to disconnect...');
            const result = await videoRecordingService.stopRecording(interview.id);
            
            if (result.success) {
              console.log('✅ Video recording stopped successfully');
              setRecordingStatus('completed');
            } else {
              console.error('❌ Failed to stop video recording:', result.error);
              videoRecordingService.forceStopRecording();
            }
          } catch (error) {
            console.error('❌ Error stopping video recording:', error);
            videoRecordingService.forceStopRecording();
          }
        } else {
          console.log('ℹ️ No active recording to stop (may have been processed already)');
          videoRecordingService.forceStopRecording();
        }
        
        setError('You have been disconnected from the interview');
        setIsRecording(false);
        setRecordingStatus('completed');
      });

      // Join the interview room
      const interviewId = interview.id; // Use the MongoDB _id from join response
      newSocket.emit('join-interview', interviewId);

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
        console.log('📋 Interview object received from server:', response.data.interview);
        console.log('📋 Interview ID property:', response.data.interview.id);
        console.log('📋 Interview _ID property:', response.data.interview._id);
        setInterview(response.data.interview);
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
    
    // Verify interview exists on server before starting recording
    try {
      // The join endpoint returns id: interview._id, so we should use interview.id for verification
      const interviewId = interview.id; // This is the MongoDB _id from the join response
      console.log('🔍 Verifying interview exists on server...');
      console.log('🔍 Using interview ID:', interviewId);
      console.log('🔍 Interview object:', interview);
      console.log('🔍 Verification URL:', `${BACKEND_URL}/api/interviews/${interviewId}`);
      
      const verifyResponse = await axios.get(`${BACKEND_URL}/api/interviews/${interviewId}`);
      if (!verifyResponse.data.success) {
        throw new Error('Interview not found on server');
      }
      console.log('✅ Interview verified on server');
    } catch (verifyError) {
      console.error('❌ Interview verification failed:', verifyError);
      setError('Interview not found. Please try joining again.');
      return;
    }

    // Start video recording
    try {
      // Use the same ID that was verified - interview.id (which is the MongoDB _id)
      const interviewId = interview.id;
      console.log('🎥 Starting video recording for interview...', {
        interviewId: interviewId,
        candidateName: interview.candidateName,
        interview: interview
      });
      
      if (!videoRecordingService) {
        console.error('❌ Video recording service is not available!');
        setError('Video recording service not available');
        return;
      }
      
      const recordingResult = await videoRecordingService.startRecording(
        interviewId, 
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
      const interviewId = interview.id; // Use the MongoDB _id from join response
      socket.emit('candidate-started-interview', interviewId);
    }
  };

  const leaveInterview = async () => {
    // Notify server that candidate is leaving
    if (socket && interview) {
      console.log('📤 Notifying server that candidate is leaving interview');
      socket.emit('candidate-leaving', {
        interviewId: interview.id,
        candidateName: interview.candidateName,
        timestamp: new Date().toISOString()
      });
    }

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
          videoRecordingService.forceStopRecording();
        }
      } catch (error) {
        console.error('❌ Error stopping video recording:', error);
        videoRecordingService.forceStopRecording();
      }
    } else {
      videoRecordingService.forceStopRecording();
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        
        <div className="flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-2xl">
              <CardHeader className="text-center space-y-4 pb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center"
                >
                  <Video className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Join Interview
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Enter your interview code to begin
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <div className="flex items-center space-x-3">
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-4">
                  <Input
                    label="Interview Code"
                    type="text"
                    value={interviewCode || ''}
                    onChange={(e) => setInterviewCode(e.target.value.toUpperCase())}
                    className="text-center text-xl font-mono tracking-wider"
                    placeholder="ABC123"
                    maxLength="6"
                    required
                  />

                  <Button
                    onClick={joinInterview}
                    loading={loading}
                    className="w-full py-4 text-lg"
                    size="xl"
                  >
                    {loading ? 'Joining...' : 'Join Interview'}
                  </Button>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800"
                >
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Interview Guidelines
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <span>Good lighting</span>
                    </div>
                    <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                      <Video className="w-4 h-4 flex-shrink-0" />
                      <span>Clear background</span>
                    </div>
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span>No devices</span>
                    </div>
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <Book className="w-4 h-4 flex-shrink-0" />
                      <span>No materials</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold">Interview Session</h1>
                  <div className="flex items-center space-x-6 text-indigo-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Interviewer:</span>
                      <span>{interview.interviewerName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Code:</span>
                      <code className="px-2 py-1 bg-white/20 rounded font-mono text-sm">
                        {interviewCode}
                      </code>
                    </div>
                    <Badge variant="success" className="bg-emerald-500/20 text-emerald-100">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                      ACTIVE
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant={isConnected ? 'success' : 'error'}
                    className={isConnected ? 'bg-emerald-500/20 text-emerald-100' : 'bg-red-500/20 text-red-100'}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  {isRecording && (
                    <Badge variant="error" className="bg-red-500/20 text-red-100">
                      <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
                      RECORDING
                    </Badge>
                  )}
                  <Button
                    onClick={leaveInterview}
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    Leave Interview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-red-800 dark:text-red-300">Error</h3>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {!isInterviewStarted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="text-center shadow-xl">
              <CardContent className="p-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mb-6"
                >
                  <PlayCircle className="w-10 h-10 text-white" />
                </motion.div>
                
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Ready to Start Interview?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                  You are now connected to the interview session. Click the button below to start your video stream and begin the interview.
                </p>
                
                <Button
                  onClick={startInterview}
                  variant="success"
                  size="xl"
                  className="px-12 py-4 text-lg font-semibold shadow-lg"
                >
                  <PlayCircle className="w-6 h-6 mr-3" />
                  Start Interview
                </Button>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800"
                >
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
                    What happens when you start:
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                      <Video className="w-4 h-4 flex-shrink-0" />
                      <span>Camera activated</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                      <Eye className="w-4 h-4 flex-shrink-0" />
                      <span>Video sent to interviewer</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                      <Shield className="w-4 h-4 flex-shrink-0" />
                      <span>Real-time monitoring</span>
                    </div>
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>Event notifications</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Video Stream */}
            <motion.div 
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {interview && interview.id ? (
                <>
                  {console.log('🎥 VideoStream conditions:', { 
                    isInterviewStarted, 
                    showReport, 
                    isActive: isInterviewStarted && !showReport,
                    interviewId: interview.id 
                  })}
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
                </>
              ) : (
                <Card className="h-96">
                  <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
                      <p className="text-gray-500 dark:text-gray-400">Loading video stream...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Event Log */}
            <motion.div 
              className="lg:col-span-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <EventLog events={events} />
            </motion.div>
          </motion.div>
        )}

        {/* Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Shield className="w-6 h-6 mr-2 text-indigo-600" />
                Interview Guidelines
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Do:
                  </h4>
                  <div className="space-y-3">
                    {[
                      'Look directly at the camera/screen',
                      'Ensure good lighting',
                      'Keep your face visible',
                      'Stay in frame during the interview',
                      'Maintain focus on the screen'
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center space-x-3 text-gray-600 dark:text-gray-400"
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Avoid:
                  </h4>
                  <div className="space-y-3">
                    {[
                      'Using phones or other devices',
                      'Looking away from screen frequently',
                      'Having multiple people in frame',
                      'Using unauthorized materials',
                      'Covering your face'
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        className="flex items-center space-x-3 text-gray-600 dark:text-gray-400"
                      >
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Important</h4>
                <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                  Your video feed is automatically being monitored by the interviewer. 
                  Any violations will be logged and affect your integrity score. 
                  Stay focused and follow the guidelines above.
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default CandidatePortal;