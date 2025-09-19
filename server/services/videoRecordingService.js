import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
console.log('🔧 Cloudinary Config Check:');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

// Debug: Show actual values (masked for security)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('  CLOUDINARY_CLOUD_NAME value:', process.env.CLOUDINARY_CLOUD_NAME);
}
if (process.env.CLOUDINARY_API_KEY) {
  console.log('  CLOUDINARY_API_KEY value:', process.env.CLOUDINARY_API_KEY.substring(0, 6) + '...');
}
if (process.env.CLOUDINARY_API_SECRET) {
  console.log('  CLOUDINARY_API_SECRET value:', process.env.CLOUDINARY_API_SECRET.substring(0, 6) + '...');
}

// Try different configuration approaches
try {
  // Method 1: Direct config
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  // Method 2: Using CLOUDINARY_URL if available
  if (process.env.CLOUDINARY_URL) {
    console.log('🔧 Using CLOUDINARY_URL for configuration');
    cloudinary.config();
  }
  
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Error configuring Cloudinary:', error);
}

class VideoRecordingService {
  constructor() {
    this.recordings = new Map(); // Store active recordings
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async startRecording(interviewId, candidateName) {
    try {
      console.log(`🎥 Starting video recording for interview: ${interviewId}`);
      
      const recordingData = {
        interviewId,
        candidateName,
        startTime: new Date(),
        chunks: [],
        isRecording: true
      };

      this.recordings.set(interviewId, recordingData);
      
      // Update interview status
      const Interview = (await import('../models/Interview.js')).default;
      await Interview.findByIdAndUpdate(interviewId, {
        recordingStatus: 'recording'
      });

      console.log(`✅ Recording started for interview: ${interviewId}`);
      return { success: true, message: 'Recording started' };
    } catch (error) {
      console.error('Error starting recording:', error);
      return { success: false, error: error.message };
    }
  }

  async addVideoChunk(interviewId, videoBlob) {
    try {
      const recording = this.recordings.get(interviewId);
      if (!recording || !recording.isRecording) {
        console.log(`⚠️ No active recording found for interview: ${interviewId}`);
        return { success: false, error: 'No active recording' };
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(videoBlob.split(',')[1], 'base64');
      
      // Store chunks in memory instead of writing directly to file
      recording.chunks.push(buffer);

      console.log(`📹 Added video chunk for interview: ${interviewId}, chunks: ${recording.chunks.length}, size: ${buffer.length} bytes`);
      return { success: true };
    } catch (error) {
      console.error('Error adding video chunk:', error);
      return { success: false, error: error.message };
    }
  }

  async stopRecording(interviewId) {
    try {
      const recording = this.recordings.get(interviewId);
      if (!recording) {
        console.log(`⚠️ No recording found for interview: ${interviewId}`);
        return { success: false, error: 'No recording found' };
      }

      console.log(`🛑 Stopping recording for interview: ${interviewId}`);
      recording.isRecording = false;

      // Combine all chunks into a single buffer
      const totalSize = recording.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedBuffer = Buffer.concat(recording.chunks, totalSize);
      
      console.log(`📊 Total video size: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

      // Create proper WebM file
      const tempFilePath = path.join(this.tempDir, `${interviewId}_recording.webm`);
      
      // Write the combined buffer to file
      fs.writeFileSync(tempFilePath, combinedBuffer);
      console.log(`💾 Video file created: ${tempFilePath}`);

      // Validate the video file before upload
      const isValidVideo = await this.validateVideoFile(tempFilePath);
      if (!isValidVideo) {
        throw new Error('Generated video file is invalid or corrupted');
      }

      // Upload to Cloudinary
      const uploadResult = await this.uploadToCloudinary(tempFilePath, interviewId, recording.candidateName);
      
      if (uploadResult.success) {
        // Update interview with video URL
        const Interview = (await import('../models/Interview.js')).default;
        await Interview.findByIdAndUpdate(interviewId, {
          videoUrl: uploadResult.url,
          recordingStatus: 'completed'
        });

        // Clean up temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        // Remove from active recordings
        this.recordings.delete(interviewId);

        console.log(`✅ Recording completed and uploaded for interview: ${interviewId}`);
        return { 
          success: true, 
          videoUrl: uploadResult.url,
          message: 'Recording completed and uploaded successfully' 
        };
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      
      // Update interview status to failed
      const Interview = (await import('../models/Interview.js')).default;
      await Interview.findByIdAndUpdate(interviewId, {
        recordingStatus: 'failed'
      });

      return { success: false, error: error.message };
    }
  }

  async validateVideoFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log('❌ Video file does not exist');
        return false;
      }

      const stats = fs.statSync(filePath);
      console.log(`📊 Video file size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // Check minimum file size (WebM files should be at least a few KB)
      if (stats.size < 1024) {
        console.log('❌ Video file too small, likely corrupted');
        return false;
      }

      // Check WebM file signature (first 4 bytes should be 0x1A45DFA3)
      const buffer = fs.readFileSync(filePath, { start: 0, end: 3 });
      const signature = buffer.readUInt32BE(0);
      const webmSignature = 0x1A45DFA3;
      
      if (signature !== webmSignature) {
        console.log(`❌ Invalid WebM signature. Expected: 0x${webmSignature.toString(16)}, Got: 0x${signature.toString(16)}`);
        return false;
      }

      console.log('✅ Video file validation passed');
      return true;
    } catch (error) {
      console.error('❌ Error validating video file:', error);
      return false;
    }
  }

  async uploadToCloudinary(filePath, interviewId, candidateName) {
    try {
      console.log(`☁️ Uploading video to Cloudinary for interview: ${interviewId}`);
      console.log(`📁 File path: ${filePath}`);
      console.log(`📁 File exists: ${fs.existsSync(filePath)}`);
      
      // Check if file exists and get size
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`📁 File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Check file size limits (Cloudinary free plan: 100MB)
        if (stats.size > 100 * 1024 * 1024) {
          throw new Error('Video file too large for upload (max 100MB)');
        }
      }
      
      // Check Cloudinary config before upload
      const config = cloudinary.config();
      console.log('🔧 Current Cloudinary config:', {
        cloud_name: config.cloud_name || 'NOT SET',
        api_key: config.api_key ? 'SET' : 'NOT SET',
        api_secret: config.api_secret ? 'SET' : 'NOT SET'
      });
      
      // Re-configure if needed
      if (!config.api_key || !config.cloud_name || !config.api_secret) {
        console.log('🔧 Re-configuring Cloudinary...');
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
      }
      
      // Upload with proper options for WebM videos
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'video',
        folder: 'interview-recordings',
        public_id: `interview_${interviewId}_${candidateName.replace(/\s+/g, '_')}`,
        // Use eager transformations for better compatibility
        eager: [
          { quality: 'auto', fetch_format: 'auto' }
        ],
        // Enable async processing for large files
        eager_async: true,
        // Add metadata
        context: {
          interview_id: interviewId,
          candidate_name: candidateName,
          recorded_at: new Date().toISOString()
        }
      });

      console.log(`✅ Video uploaded successfully: ${result.secure_url}`);
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (error) {
      console.error('❌ Error uploading to Cloudinary:', error);
      console.error('❌ Error details:', {
        message: error.message,
        http_code: error.http_code,
        name: error.name
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  getRecordingStatus(interviewId) {
    const recording = this.recordings.get(interviewId);
    return recording ? {
      isRecording: recording.isRecording,
      startTime: recording.startTime,
      chunksCount: recording.chunks.length
    } : null;
  }

  // Check if recording exists (for cleanup purposes)
  hasRecording(interviewId) {
    return this.recordings.has(interviewId);
  }

  // Clean up old recordings (call this periodically)
  cleanupOldRecordings() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [interviewId, recording] of this.recordings.entries()) {
      if (now - recording.startTime > maxAge) {
        console.log(`🧹 Cleaning up old recording for interview: ${interviewId}`);
        this.recordings.delete(interviewId);
      }
    }
  }
}

export default new VideoRecordingService();
