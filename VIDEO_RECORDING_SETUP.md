# Video Recording Setup Guide

## Overview
The system now includes full video recording with audio that stores recordings in Cloudinary cloud storage.

## Features
- ✅ **Full Video Recording**: Records both video and audio during interviews
- ✅ **Cloud Storage**: Automatically uploads to Cloudinary
- ✅ **Real-time Streaming**: Maintains existing live streaming functionality
- ✅ **Automatic Management**: Starts/stops recording with interview lifecycle
- ✅ **Database Storage**: Stores video URLs in MongoDB

## Setup Requirements

### 1. Cloudinary Account
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 2. Environment Variables
Add these to your `server/.env` file:
```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Install Dependencies
```bash
cd server
npm install cloudinary multer fluent-ffmpeg
```

## How It Works

### Recording Flow
1. **Interview Start**: When candidate clicks "Start Interview"
   - Video recording begins automatically
   - Uses MediaRecorder API with WebM format
   - Records in 5-second chunks

2. **Real-time Upload**: 
   - Chunks sent to backend every 5 seconds
   - Backend stores chunks temporarily
   - Combines chunks into single video file

3. **Interview End**: When candidate leaves or interview ends
   - Recording stops automatically
   - Video uploaded to Cloudinary
   - URL stored in database
   - Temporary files cleaned up

### Technical Details

#### Frontend (`client/src/services/videoRecordingService.js`)
- Uses `navigator.mediaDevices.getUserMedia()` for video/audio
- MediaRecorder with WebM codec (VP9 + Opus)
- 1280x720 resolution, 30fps, 2.5Mbps video, 128kbps audio
- Automatic chunking every 5 seconds

#### Backend (`server/services/videoRecordingService.js`)
- Receives video chunks via HTTP POST
- Combines chunks into single WebM file
- Uploads to Cloudinary with optimization
- Stores URL in Interview model

#### Database Schema
```javascript
// Interview model now includes:
videoUrl: String,           // Cloudinary URL
recordingStatus: String     // 'not_started', 'recording', 'completed', 'failed'
```

## API Endpoints

### Recording Management
- `POST /api/recording/:id/start` - Start recording
- `POST /api/recording/:id/chunk` - Add video chunk
- `POST /api/recording/:id/stop` - Stop recording
- `GET /api/recording/:id/status` - Get recording status

## UI Indicators

### Candidate Portal
- Shows recording status: "🔴 Active" or "⏹️ Stopped"
- Displays recording status in debug info
- Automatic start/stop with interview lifecycle

### Interviewer Dashboard
- Video URL available in interview details
- Can access recorded video after interview completion

## File Structure
```
server/
├── services/
│   └── videoRecordingService.js    # Recording management
├── routes/
│   └── recording.js                # Recording API endpoints
├── models/
│   └── Interview.js                # Updated with video fields
└── temp/                          # Temporary video files

client/src/
├── services/
│   └── videoRecordingService.js    # Frontend recording service
└── components/
    └── CandidatePortal.jsx         # Updated with recording integration
```

## Troubleshooting

### Common Issues
1. **Recording not starting**: Check browser permissions for camera/microphone
2. **Upload failures**: Verify Cloudinary credentials
3. **Large file sizes**: Adjust video quality settings in `videoRecordingService.js`

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited support (may need fallback)

## Security Considerations
- Video files are stored securely in Cloudinary
- Temporary files are automatically cleaned up
- Access control through interview authentication
- No sensitive data in video metadata

## Performance Notes
- Recording runs parallel to existing functionality
- Minimal impact on live streaming
- Automatic cleanup prevents disk space issues
- Cloudinary handles video optimization and CDN delivery
