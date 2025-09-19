import React, { useState, useRef, useEffect } from 'react';

const VideoStream = ({ interviewId, pythonServiceUrl, onError, onEvent, isActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  console.log('VideoStream props:', { interviewId, isActive });

  useEffect(() => {
    // Auto-start streaming when component mounts and is active
    if (isActive) {
      startCamera();
    }
    
    return () => {
      // Cleanup on unmount
      stopStreaming();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isActive]);

  // Stop streaming when not active
  useEffect(() => {
    if (!isActive && stream) {
      stopStreaming();
    }
  }, [isActive]);

  const startCamera = async () => {
    if (!interviewId) {
      console.error('Cannot start camera: interviewId is missing');
      setError('Interview ID is missing');
      return;
    }

    try {
      setError(null);
      console.log('🎥 Starting camera for interview:', interviewId);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Start WebSocket connection to Python service
      connectToPythonService();
      
    } catch (err) {
      const errorMessage = 'Failed to access camera: ' + err.message;
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const connectToPythonService = () => {
    if (!interviewId) {
      console.error('Cannot connect to Python service: interviewId is missing');
      return;
    }

    try {
      const wsUrl = `${pythonServiceUrl.replace('http', 'ws')}/stream/${interviewId}`;
      console.log('Connecting to Python ML service:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to Python ML service');
        startStreaming();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received from ML service:', data);
          if (data.type === 'events' && data.events) {
            console.log('🎯 ML Events:', data.events);
            // Forward events to parent component
            if (data.events && data.events.length > 0) {
              data.events.forEach(event => {
                onEvent && onEvent(event);
              });
            }
          }
        } catch (error) {
          console.error('Error parsing ML service response:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('Connection to ML service failed');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        // Attempt to reconnect after 3 seconds
        if (event.code !== 1000) { // Not a normal closure
          console.log('🔄 Attempting to reconnect in 3 seconds...');
          setTimeout(() => {
            if (interviewId && isActive) {
              connectToPythonService();
            }
          }, 3000);
        }
      };

    } catch (err) {
      console.error('Failed to connect to Python service:', err);
      setError('Failed to connect to ML service');
    }
  };

  const sendVideoToBackend = async (imageData) => {
    if (!interviewId) {
      console.error('Interview ID is not available');
      return;
    }

    try {
      console.log(`Sending video frame to backend for interview: ${interviewId}`);
      const response = await fetch(`http://localhost:3001/api/interviews/${interviewId}/video-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send video to backend:', response.status, response.statusText);
      } else {
        console.log('Video frame sent successfully to backend');
      }
    } catch (error) {
      console.error('Error sending video to backend:', error);
    }
  };

  const startStreaming = () => {
    if (!videoRef.current || !wsRef.current) return;

    // Send frames every 2 seconds to prevent payload errors
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 2000);
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      // Reduce frame size to prevent payload errors
      const maxWidth = 640;
      const maxHeight = 480;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Calculate scaled dimensions
      let canvasWidth = videoWidth;
      let canvasHeight = videoHeight;
      
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const aspectRatio = videoWidth / videoHeight;
        if (videoWidth > videoHeight) {
          canvasWidth = maxWidth;
          canvasHeight = maxWidth / aspectRatio;
        } else {
          canvasHeight = maxHeight;
          canvasWidth = maxHeight * aspectRatio;
        }
      }
      
      // Set canvas size
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw video frame to canvas with scaling
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

      // Convert canvas to base64 with higher compression
      const imageData = canvas.toDataURL('image/jpeg', 0.5); // Reduced quality
      const base64Data = imageData.split(',')[1];

      // Send to Python service for ML analysis
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const message = {
          image: base64Data,
          timestamp: Date.now()
        };
        console.log('📤 Sending frame to Python ML service');
        wsRef.current.send(JSON.stringify(message));
      } else {
        console.log('❌ WebSocket not ready for ML service:', wsRef.current?.readyState);
      }

      // Send to backend for interviewer viewing
      sendVideoToBackend(imageData);
    } catch (err) {
      console.error('Error capturing frame:', err);
    }
  };

  const stopStreaming = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const toggleStreaming = () => {
    if (stream) {
      stopStreaming();
    } else {
      startCamera();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Stream</h3>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            stream ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {stream ? 'Live Streaming' : 'Connecting...'}
          </div>
          {stream && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">Active</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto rounded-lg border border-gray-300"
          style={{ maxHeight: '300px' }}
        />
        
        {/* Hidden canvas for frame capture */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">Click "Start Stream" to begin</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-1">Stream Status</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Video feed is sent to interviewer</li>
          <li>• Real-time monitoring active</li>
          <li>• Events logged automatically</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoStream;
