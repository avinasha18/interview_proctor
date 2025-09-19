# Vercel Environment Variable Fix

## Problem
The client is getting `undefined` in API URLs, causing requests to fail:
```
POST https://interview-proctor-system.vercel.app/undefined/api/interviews/authenticate-interviewer 405 (Method Not Allowed)
```

## Root Cause
1. **Wrong Environment Variable Usage**: Some components were using `process.env.VITE_BACKEND_URL` instead of `import.meta.env.VITE_BACKEND_URL`
2. **Missing Environment Variable**: `VITE_BACKEND_URL` not set in Vercel deployment
3. **No Fallback**: No fallback URL when environment variable is undefined

## Solutions Applied

### 1. Fixed Environment Variable Usage
Changed all components to use the correct Vite environment variable syntax:

**Before:**
```javascript
const BACKEND_URL = process.env.VITE_BACKEND_URL;
```

**After:**
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

### 2. Updated Vercel Configuration
Updated `client/vercel.json` with proper backend URL:

```json
{
  "env": {
    "VITE_BACKEND_URL": "https://exam-proctor-server.onrender.com"
  }
}
```

### 3. Added Fallback URLs
All components now have fallback URLs for local development:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

## Files Updated

### Components Fixed:
- `client/src/services/videoRecordingService.jsx`
- `client/src/components/VideoStream.jsx`
- `client/src/components/ReportDownload.jsx`
- `client/src/components/LiveInterviewView.jsx`
- `client/src/components/InterviewScheduler.jsx`
- `client/src/components/InterviewerLiveView.jsx`
- `client/src/components/InterviewerDashboard.jsx`
- `client/src/components/CandidateReport.jsx`

### Configuration Updated:
- `client/vercel.json` - Added proper environment variable

## Deployment Steps

### 1. Update Vercel Environment Variables
In your Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add: `VITE_BACKEND_URL` = `https://your-server-url.onrender.com`

### 2. Redeploy
```bash
# Commit changes
git add .
git commit -m "Fix environment variable usage for Vercel deployment"
git push

# Trigger redeploy in Vercel
```

### 3. Verify Fix
After deployment, check:
1. Browser console for any remaining `undefined` errors
2. Network tab to verify correct API URLs
3. Application functionality

## Environment Variable Setup

### For Vercel Deployment:
```env
VITE_BACKEND_URL=https://exam-proctor-server.onrender.com
```

### For Local Development:
```env
VITE_BACKEND_URL=http://localhost:3001
```

### For Production:
```env
VITE_BACKEND_URL=https://your-production-server.com
```

## Testing

### 1. Local Testing
```bash
# Set environment variable
export VITE_BACKEND_URL=http://localhost:3001

# Start development server
npm run dev
```

### 2. Build Testing
```bash
# Build with environment variable
VITE_BACKEND_URL=https://your-server.com npm run build

# Preview build
npm run preview
```

### 3. Verify URLs
Check that all API calls use the correct URL:
- No `undefined` in URLs
- Correct protocol (https for production)
- Correct domain

## Common Issues

### 1. Still Getting Undefined
- Check Vercel environment variables are set
- Verify the variable name is exactly `VITE_BACKEND_URL`
- Clear browser cache

### 2. CORS Errors
- Ensure server has correct CORS configuration
- Check `CLIENT_URL` in server environment variables

### 3. 405 Method Not Allowed
- Verify server is running
- Check API endpoint exists
- Verify HTTP method is correct

## Prevention

### 1. Always Use Import Meta
In Vite projects, always use:
```javascript
import.meta.env.VITE_VARIABLE_NAME
```

### 2. Add Fallbacks
Always provide fallback values:
```javascript
const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

### 3. Environment Validation
Add validation for required environment variables:
```javascript
if (!import.meta.env.VITE_BACKEND_URL) {
  console.error('VITE_BACKEND_URL is not set');
}
```

## Support

If issues persist:
1. Check Vercel build logs
2. Verify environment variables in Vercel dashboard
3. Test locally with environment variables
4. Check browser network tab for actual URLs being called
