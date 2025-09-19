class VideoRecordingService {
  constructor() {
    console.log('🎥 VideoRecordingService constructor called');
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.isRecording = false;
    this.recordingChunks = [];
    this.recordingInterval = null;
    this.BACKEND_URL = 'http://localhost:3001';
  }

  async startRecording(interviewId, candidateName) {
    try {
      console.log('🎥 Starting video recording...', { interviewId, candidateName });
      
      // Get user media with both video and audio
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Create MediaRecorder with better WebM configuration
      const options = {
        mimeType: 'video/webm;codecs=vp8,opus', // Use VP8 for better compatibility
        videoBitsPerSecond: 2000000, // 2 Mbps - more conservative bitrate
        audioBitsPerSecond: 128000   // 128 kbps
      };

      // Fallback to default if VP8 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
        console.log('⚠️ VP8 not supported, using default WebM codec');
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingChunks.push(event.data);
          console.log(`📹 Recording chunk: ${event.data.size} bytes`);
        }
      };

      // Start recording with longer chunks for better WebM structure
      this.mediaRecorder.start(5000); // Record in 5-second chunks for better WebM container structure
      this.isRecording = true;

      // Send chunks to backend every 2 seconds
      this.recordingInterval = setInterval(() => {
        this.sendChunksToBackend(interviewId);
      }, 2000);

      // Notify backend that recording started
      try {
        await this.notifyRecordingStart(interviewId, candidateName);
        console.log('✅ Video recording started successfully');
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to notify backend of recording start:', error);
        // Stop the local recording if backend notification fails
        this.mediaRecorder.stop();
        this.isRecording = false;
        if (this.recordingInterval) {
          clearInterval(this.recordingInterval);
          this.recordingInterval = null;
        }
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop());
          this.mediaStream = null;
        }
        return { success: false, error: `Failed to start recording: ${error.message}` };
      }
    } catch (error) {
      console.error('❌ Error starting video recording:', error);
      return { success: false, error: error.message };
    }
  }

  async stopRecording(interviewId) {
    try {
      console.log('🛑 Stopping video recording...');
      
      if (!this.mediaRecorder || !this.isRecording) {
        console.log('⚠️ No active recording to stop');
        return { success: false, error: 'No active recording' };
      }

      // Stop the MediaRecorder
      this.mediaRecorder.stop();
      this.isRecording = false;

      // Clear interval
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      // Send final chunks
      console.log('📤 Sending final chunks to backend...');
      await this.sendChunksToBackend(interviewId);

      // Stop all tracks
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Wait a moment for chunks to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Notify backend that recording stopped
      console.log('📤 Notifying backend to stop recording...');
      const result = await this.notifyRecordingStop(interviewId);
      
      if (result.success) {
        console.log('✅ Video recording stopped and uploaded successfully');
      } else {
        console.error('❌ Failed to stop recording on server:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error stopping video recording:', error);
      return { success: false, error: error.message };
    }
  }

  async sendChunksToBackend(interviewId) {
    if (this.recordingChunks.length === 0) return;

    try {
      // Combine chunks into a single blob
      const blob = new Blob(this.recordingChunks, { type: 'video/webm' });
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        
        try {
          const response = await fetch(`${this.BACKEND_URL}/api/recording/${interviewId}/chunk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              videoBlob: base64Data
            })
          });

          if (response.ok) {
            console.log(`📤 Sent ${this.recordingChunks.length} chunks to backend`);
            this.recordingChunks = []; // Clear sent chunks
          } else {
            console.error('❌ Failed to send chunks to backend');
          }
        } catch (error) {
          console.error('❌ Error sending chunks to backend:', error);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('❌ Error processing chunks:', error);
    }
  }

  async notifyRecordingStart(interviewId, candidateName) {
    try {
      console.log(`📤 Notifying backend to start recording for interview: ${interviewId}`);
      console.log(`📤 Making request to: ${this.BACKEND_URL}/api/recording/${interviewId}/start`);
      console.log(`📤 Candidate name: ${candidateName}`);
      
      const response = await fetch(`${this.BACKEND_URL}/api/recording/${interviewId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateName: candidateName
        })
      });

      console.log(`📤 Response status: ${response.status}`);
      console.log(`📤 Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Response error: ${errorText}`);
        throw new Error(`Failed to notify recording start: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Recording start notified to backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error notifying recording start:', error);
      throw error; // Re-throw to let the caller handle it
    }
  }

  async notifyRecordingStop(interviewId) {
    try {
      console.log(`📤 Notifying backend to stop recording for interview: ${interviewId}`);
      console.log(`📤 Making request to: ${this.BACKEND_URL}/api/recording/${interviewId}/stop`);
      
      const response = await fetch(`${this.BACKEND_URL}/api/recording/${interviewId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log(`📤 Response status: ${response.status}`);
      console.log(`📤 Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Response error: ${errorText}`);
        throw new Error(`Failed to notify recording stop: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Recording stop notified to backend:', result);
      return result;
    } catch (error) {
      console.error('❌ Error notifying recording stop:', error);
      return { success: false, error: error.message };
    }
  }

  getRecordingStatus() {
    return {
      isRecording: this.isRecording,
      chunksCount: this.recordingChunks.length
    };
  }
}

export default new VideoRecordingService();
