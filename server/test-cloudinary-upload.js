import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
console.log('🔧 Cloudinary Config Check:');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');

try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully');
} catch (error) {
  console.error('❌ Error configuring Cloudinary:', error);
  process.exit(1);
}

async function testUpload() {
  try {
    // Find the video file in temp folder
    const tempDir = path.join(__dirname, 'temp');
    console.log(`📁 Looking for video files in: ${tempDir}`);
    
    if (!fs.existsSync(tempDir)) {
      console.error('❌ Temp directory does not exist');
      return;
    }
    
    const files = fs.readdirSync(tempDir);
    const videoFiles = files.filter(file => file.endsWith('.webm'));
    
    if (videoFiles.length === 0) {
      console.error('❌ No .webm video files found in temp directory');
      console.log('📁 Available files:', files);
      return;
    }
    
    // Use the first video file found
    const videoFile = videoFiles[0];
    const filePath = path.join(tempDir, videoFile);
    
    console.log(`📹 Found video file: ${videoFile}`);
    console.log(`📁 File path: ${filePath}`);
    
    // Check file details
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`📁 File size: ${stats.size} bytes (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.error('❌ File does not exist');
      return;
    }
    
    // Check Cloudinary config before upload
    console.log('🔧 Current Cloudinary config:', {
      cloud_name: cloudinary.config().cloud_name,
      api_key: cloudinary.config().api_key ? 'SET' : 'NOT SET',
      api_secret: cloudinary.config().api_secret ? 'SET' : 'NOT SET'
    });
    
    console.log('☁️ Starting upload to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: 'interview-recordings',
      public_id: `test_upload_${Date.now()}`,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Video uploaded successfully!');
    console.log(`🔗 Video URL: ${result.secure_url}`);
    console.log(`🆔 Public ID: ${result.public_id}`);
    console.log(`📊 File size: ${result.bytes} bytes`);
    console.log(`⏱️ Duration: ${result.duration} seconds`);
    
    // Test if we can access the video
    console.log('🧪 Testing video access...');
    try {
      const response = await fetch(result.secure_url);
      if (response.ok) {
        console.log('✅ Video is accessible via URL');
      } else {
        console.log('❌ Video URL is not accessible');
      }
    } catch (error) {
      console.log('❌ Error testing video access:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error uploading to Cloudinary:', error);
    console.error('❌ Error details:', {
      message: error.message,
      http_code: error.http_code,
      name: error.name
    });
  }
}

// Run the test
console.log('🚀 Starting Cloudinary upload test...');
testUpload().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
