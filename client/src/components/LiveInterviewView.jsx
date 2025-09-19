import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import VideoCapture from './VideoCapture';
import EventLog from './EventLog';
import ReportDownload from './ReportDownload';

const BACKEND_URL = process.env.VITE_BACKEND_URL;
const PYTHON_SERVICE_URL = 'http://localhost:8000';

const LiveInterviewView = ({ interview, onBack, onRefresh }) => {
  const [socket, setSocket] = useState(null);
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [interviewStatus, setInterviewStatus] = useState(interview.status);

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

    // Join the interview room
    newSocket.emit('join-interview', interview._id);

    return () => {
      newSocket.close();
    };
  }, [interview._id]);

  const endInterview = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/interviews/${interview._id}/end`);
      setInterviewStatus('completed');
      onRefresh();
    } catch (err) {
      setError('Failed to end interview: ' + err.message);
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  End Interview
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
            {/* Video Monitoring */}
            <div className="lg:col-span-2">
              <VideoCapture 
                interviewId={interview._id}
                pythonServiceUrl={PYTHON_SERVICE_URL}
                onError={setError}
                isInterviewActive={interviewStatus === 'active'}
              />
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
                {interviewStatus === 'completed' ? 'Interview Completed' : 'Interview Scheduled'}
              </h2>
              
              {interviewStatus === 'completed' ? (
                <div className="space-y-4">
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Integrity Score</h3>
                    <div className="flex items-center justify-center">
                      <div className={`text-4xl font-bold ${
                        (interview.integrityScore || 0) >= 80 ? 'text-green-600' :
                        (interview.integrityScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {interview.integrityScore || 0}/100
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
                <button
                  onClick={endInterview}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveInterviewView;
