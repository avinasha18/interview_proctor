import React, { useState, useRef, useEffect } from 'react';
import { BACKEND_URL } from '../utils/config';
const VideoStream = ({ interviewId, pythonServiceUrl, onError, onEvent, isActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  console.log('🎥 VideoStream props:', { interviewId, isActive, pythonServiceUrl });

  useEffect(() => {
    // Auto-start streaming when component mounts and is active
    if (isActive) {
      console.log('🎥 VideoStream isActive=true, starting camera...');
      startCamera();
    } else {
      console.log('🎥 VideoStream isActive=false, not starting camera');
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
      console.log('🛑 Interview ended, stopping video stream and releasing media devices');
      stopStreaming();
    }
  }, [isActive]);

  const startCamera = async () => {
    if (!interviewId) {
      console.error('❌ Cannot start camera: interviewId is missing');
      setError('Interview ID is missing');
      return;
    }

    try {
      setError(null);
      console.log('🎥 Starting camera for interview:', interviewId);
      console.log('🎥 Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });

      console.log('✅ Camera access granted, media stream obtained');
      console.log('📹 Video tracks:', mediaStream.getVideoTracks().length);
      console.log('🎤 Audio tracks:', mediaStream.getAudioTracks().length);
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready before starting streaming
        videoRef.current.onloadedmetadata = () => {
          console.log('🎥 Video metadata loaded, starting streaming...');
          // Start WebSocket connection to Python service
          connectToPythonService();
          
          // Also start direct streaming to backend (fallback)
          startDirectStreaming();
        };
        
        // Fallback: start streaming after a delay if metadata doesn't load
        setTimeout(() => {
          if (!intervalRef.current) {
            console.log('🎥 Fallback: Starting streaming after timeout...');
            connectToPythonService();
            startDirectStreaming();
          }
        }, 3000);
      }
      
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

    if (!pythonServiceUrl) {
      console.error('Cannot connect to Python service: pythonServiceUrl is missing');
      console.log('Current hostname:', window.location.hostname);
      return;
    }

    try {
      const wsUrl = `${pythonServiceUrl.replace('http', 'ws')}/stream/${interviewId}`;
      console.log('🔌 Connecting to Python ML service:', wsUrl);
      console.log('🔍 Interview ID:', interviewId);
      console.log('🔍 Python Service URL:', pythonServiceUrl);
      
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
        console.error('❌ WebSocket URL:', wsUrl);
        console.error('❌ Python Service URL:', pythonServiceUrl);
        console.error('❌ Interview ID:', interviewId);
        setError(`Connection to ML service failed: ${pythonServiceUrl}`);
        onError && onError(`Connection to ML service failed: ${pythonServiceUrl}`);
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
      console.error('❌ Interview ID is not available for sending video frame');
      return;
    }

    // Check if frame data is too large (prevent 431 errors)
    const maxFrameSize = 500000; // 500KB limit
    if (imageData.length > maxFrameSize) {
      console.warn(`⚠️ Frame data too large (${imageData.length} bytes), skipping to prevent 431 error`);
      return;
    }

    try {
      console.log(`📤 Sending video frame to backend for interview: ${interviewId}`);
      console.log(`📤 Frame data length: ${imageData.length} bytes`);
      
      const response = await fetch(`${BACKEND_URL}/api/interviews/${interviewId}/video-stream`, {
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
        const errorText = await response.text();
        console.error('❌ Failed to send video to backend:', response.status, response.statusText, errorText);
        
        // If we get a 431 error, reduce quality further
        if (response.status === 431) {
          console.warn('⚠️ Received 431 error, frame data too large. Consider reducing quality further.');
        }
      } else {
        console.log('✅ Video frame sent successfully to backend');
      }
    } catch (error) {
      console.error('Error sending video to backend:', error);
    }
  };

  const startStreaming = () => {
    if (!videoRef.current || !wsRef.current) {
      console.log('❌ Cannot start streaming - missing video ref or WebSocket');
      return;
    }

    console.log('🎥 Starting video streaming...');
    // Simple, stable streaming - send frames every 1 second
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 1000);
  };

  const startDirectStreaming = () => {
    if (!videoRef.current) {
      console.log('❌ Cannot start direct streaming - missing video ref');
      return;
    }

    console.log('🎥 Starting direct video streaming to backend...');
    // Simple, stable direct streaming - send frames every 1 second
    intervalRef.current = setInterval(() => {
      captureAndSendFrameDirect();
    }, 1000);
  };

  const captureAndSendFrameDirect = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('❌ Cannot capture frame - missing video or canvas ref');
      return;
    }

    console.log('📸 Capturing video frame for direct streaming...');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!video.videoWidth || !video.videoHeight) {
        console.log('Video not ready yet');
        return;
      }

      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      // Set canvas size to match video
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

      // Convert canvas to base64 with reduced quality to prevent 431 errors
      const imageData = canvas.toDataURL('image/jpeg', 0.3);
      const base64Data = imageData.split(',')[1];

      // Send directly to backend
      sendVideoToBackend(base64Data);
      
    } catch (error) {
      console.error('Error capturing frame for direct streaming:', error);
    }
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('❌ Cannot capture frame - missing video or canvas ref');
      return;
    }

    console.log('📸 Capturing video frame...');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      // Reduce frame size to prevent payload errors (431 Request Header Fields Too Large)
      const maxWidth = 480;
      const maxHeight = 360;
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
      const imageData = canvas.toDataURL('image/jpeg', 0.3); // Further reduced quality for smaller payload
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

      // Send to backend for interviewer viewing (send only base64 part)
      sendVideoToBackend(base64Data);
    } catch (err) {
      console.error('Error capturing frame:', err);
    }
  };

  const stopStreaming = () => {
    console.log('🛑 Stopping video streaming and releasing media devices...');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('✅ Cleared streaming interval');
    }

    if (stream) {
      console.log('🛑 Stopping media tracks...');
      stream.getTracks().forEach(track => {
        console.log(`🛑 Stopping track: ${track.kind} (${track.label})`);
        track.stop();
      });
      setStream(null);
      console.log('✅ Media tracks stopped and stream cleared');
    }

    if (wsRef.current) {
      console.log('🛑 Closing WebSocket connection...');
      wsRef.current.close();
      wsRef.current = null;
      console.log('✅ WebSocket connection closed');
    }
    
    console.log('✅ Video streaming stopped and media devices released');
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
