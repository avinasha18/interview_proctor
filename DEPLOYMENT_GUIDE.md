# Exam Proctor Deployment Guide

This guide will help you deploy the Exam Proctor application on Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com) for video storage
3. **MongoDB Atlas**: Sign up at [mongodb.com/atlas](https://mongodb.com/atlas) for database

## Step 1: Prepare Environment Variables

### Server Environment Variables
Create these environment variables in your Render dashboard:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/exam-proctor
CLIENT_URL=https://your-client-app.onrender.com
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Client Environment Variables
```
VITE_BACKEND_URL=https://your-server-app.onrender.com
```

## Step 2: Deploy Server (Backend)

1. **Connect Repository**: Connect your GitHub repository to Render
2. **Create Web Service**: 
   - Type: Web Service
   - Name: `exam-proctor-server`
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Root Directory: `server`

3. **Configure Environment Variables**: Add all server environment variables
4. **Deploy**: Click "Create Web Service"

## Step 3: Deploy Client (Frontend)

1. **Create Static Site**:
   - Type: Static Site
   - Name: `exam-proctor-client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Root Directory: `client`

2. **Configure Environment Variables**: Add client environment variables
3. **Deploy**: Click "Create Static Site"

## Step 4: Deploy Python ML Service (Optional)

If you want to deploy the Python ML service separately:

1. **Create Web Service**:
   - Type: Web Service
   - Name: `exam-proctor-ml`
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - Root Directory: `app`

2. **Environment Variables**:
   ```
   PORT=8000
   BACKEND_URL=https://your-server-app.onrender.com
   ```

## Step 5: Update URLs

After deployment, update the URLs in your configuration:

1. **Server**: Update `CLIENT_URL` to your client's Render URL
2. **Client**: Update `VITE_BACKEND_URL` to your server's Render URL
3. **Python ML**: Update `BACKEND_URL` to your server's Render URL

## Step 6: Database Setup

### Option 1: MongoDB Atlas (Recommended)
1. Create a MongoDB Atlas cluster
2. Get the connection string
3. Add it to your server environment variables

### Option 2: Render Database
1. Create a MongoDB database in Render
2. Use the provided connection string

## Step 7: Cloudinary Setup

1. Create a Cloudinary account
2. Get your cloud name, API key, and API secret
3. Add them to your server environment variables

## File Structure for Deployment

```
exam-proctor/
├── server/
│   ├── vercel.json
│   ├── render.yaml
│   ├── package.json
│   ├── index.js
│   └── ...
├── client/
│   ├── vercel.json
│   ├── render.yaml
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── app/
│   ├── requirements.txt
│   ├── main.py
│   └── ...
└── DEPLOYMENT_GUIDE.md
```

## Important Notes

1. **CORS**: Make sure CORS is properly configured in your server
2. **WebSocket**: Render supports WebSockets, but you may need to configure them properly
3. **File Uploads**: Large video files are handled by Cloudinary
4. **Environment**: Always use production environment variables
5. **Logs**: Check Render logs for any deployment issues

## Troubleshooting

### Common Issues:

1. **Build Failures**: Check your package.json and requirements.txt
2. **Environment Variables**: Ensure all required variables are set
3. **CORS Errors**: Update CLIENT_URL in server environment
4. **Database Connection**: Verify MongoDB connection string
5. **WebSocket Issues**: Check if WebSocket connections are working

### Logs:
- Server logs: Available in Render dashboard
- Client logs: Check browser console
- ML service logs: Available in Render dashboard

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure CORS properly for production
3. **Rate Limiting**: Consider implementing rate limiting
4. **HTTPS**: Render provides HTTPS by default
5. **Database**: Use MongoDB Atlas with proper security settings

## Performance Optimization

1. **CDN**: Render provides CDN for static assets
2. **Caching**: Implement proper caching strategies
3. **Database Indexing**: Add indexes for frequently queried fields
4. **Image Optimization**: Use Cloudinary's optimization features

## Monitoring

1. **Uptime**: Monitor service uptime
2. **Performance**: Check response times
3. **Errors**: Monitor error rates
4. **Usage**: Track resource usage

## Support

For deployment issues:
1. Check Render documentation
2. Review application logs
3. Verify environment variables
4. Test locally first

---

**Note**: Replace `your-server-app.onrender.com` and `your-client-app.onrender.com` with your actual Render URLs after deployment.
