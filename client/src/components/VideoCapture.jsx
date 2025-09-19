import React, { useState, useRef, useEffect } from 'react';

const VideoCapture = ({ interviewId, pythonServiceUrl, onError, isInterviewActive }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopStreaming();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Stop streaming when interview ends
  useEffect(() => {
    if (!isInterviewActive && isStreaming) {
      stopStreaming();
    }
  }, [isInterviewActive]);

  const startCamera = async () => {
    try {
      setError(null);
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
    try {
      const ws = new WebSocket(`${pythonServiceUrl.replace('http', 'ws')}/stream/${interviewId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Python ML service');
        startStreaming();
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'events' && data.events) {
          console.log('Received events from ML service:', data.events);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection to ML service failed');
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

    } catch (err) {
      console.error('Failed to connect to Python service:', err);
      setError('Failed to connect to ML service');
    }
  };

  const startStreaming = () => {
    if (!videoRef.current || !wsRef.current) return;

    setIsStreaming(true);
    
    // Send frames every 1 second
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 1000);
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      // Send to Python service
      const message = {
        image: base64Data,
        timestamp: Date.now()
      };

      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('Error capturing frame:', err);
    }
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    
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
    if (isStreaming) {
      stopStreaming();
    } else {
      startCamera();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Feed</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleStreaming}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isStreaming
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isStreaming ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isStreaming 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isStreaming ? 'Active' : 'Inactive'}
          </div>
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
          style={{ maxHeight: '400px' }}
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
              <p className="mt-2 text-sm text-gray-500">Click "Start Monitoring" to begin</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-1">Monitoring Features</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Face detection and focus tracking</li>
          <li>• Suspicious object detection (phones, books, etc.)</li>
          <li>• Multiple face detection</li>
          <li>• Real-time event logging</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoCapture;
