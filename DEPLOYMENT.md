# 🚀 Deployment Guide

This guide covers deploying the Proctoring System to various platforms.

## 📋 Prerequisites

- Docker and Docker Compose installed
- MongoDB Atlas account (for production)
- Cloud platform account (AWS, GCP, Azure, Render, Railway)

## 🐳 Docker Deployment

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd Exam-proctor

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker
```bash
# Update environment variables for production
cp server/env.example server/.env
cp app/env.example app/.env

# Edit .env files with production values
# Then start services
docker-compose up -d
```

## ☁️ Cloud Deployment Options

### Option 1: Render (Recommended for beginners)

1. **Create Render Account**
   - Sign up at https://render.com
   - Connect your GitHub repository

2. **Deploy Backend Service**
   - Create new "Web Service"
   - Connect to your repository
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment Variables:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proctoring
     NODE_ENV=production
     CLIENT_URL=https://your-frontend-url.onrender.com
     ```

3. **Deploy Python ML Service**
   - Create new "Web Service"
   - Root Directory: `app`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     ```
     BACKEND_URL=https://your-backend-url.onrender.com
     ```

4. **Deploy Frontend**
   - Create new "Static Site"
   - Root Directory: `client`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

### Option 2: Railway

1. **Create Railway Account**
   - Sign up at https://railway.app
   - Connect GitHub repository

2. **Deploy Services**
   - Add services for each component (backend, python-service, frontend)
   - Configure environment variables
   - Deploy automatically

### Option 3: AWS ECS

1. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name proctoring-cluster
   ```

2. **Create Task Definitions**
   - Backend task definition
   - Python service task definition
   - Frontend task definition

3. **Deploy Services**
   ```bash
   aws ecs create-service --cluster proctoring-cluster --service-name backend
   ```

### Option 4: Google Cloud Run

1. **Build and Push Images**
   ```bash
   # Build images
   docker build -t gcr.io/PROJECT_ID/backend ./server
   docker build -t gcr.io/PROJECT_ID/python-service ./app
   docker build -t gcr.io/PROJECT_ID/frontend ./client

   # Push to registry
   docker push gcr.io/PROJECT_ID/backend
   docker push gcr.io/PROJECT_ID/python-service
   docker push gcr.io/PROJECT_ID/frontend
   ```

2. **Deploy Services**
   ```bash
   gcloud run deploy backend --image gcr.io/PROJECT_ID/backend
   gcloud run deploy python-service --image gcr.io/PROJECT_ID/python-service
   gcloud run deploy frontend --image gcr.io/PROJECT_ID/frontend
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Cluster**
   - Sign up at https://cloud.mongodb.com
   - Create free cluster
   - Get connection string

2. **Configure Access**
   - Create database user
   - Whitelist IP addresses
   - Update connection string in environment variables

### Self-hosted MongoDB

```bash
# Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0
```

## 🔧 Environment Configuration

### Production Environment Variables

#### Backend (.env)
```env
MONGODB_URI=
PORT=3001
NODE_ENV=production
CLIENT_URL=https://your-frontend-domain.com
PYTHON_SERVICE_URL=https://your-python-service-domain.com
```

#### Python Service (.env)
```env
BACKEND_URL=https://your-backend-domain.com
HOST=0.0.0.0
PORT=8000
FOCUS_TIMEOUT=5
FACE_TIMEOUT=10
```

## 🔒 Security Considerations

1. **HTTPS Only**
   - Use SSL certificates
   - Redirect HTTP to HTTPS

2. **Environment Variables**
   - Never commit .env files
   - Use secure secret management

3. **Database Security**
   - Use strong passwords
   - Enable authentication
   - Whitelist IP addresses

4. **API Security**
   - Implement rate limiting
   - Add authentication if needed
   - Validate input data

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Python Service: `GET /health`
- Frontend: Static file serving

### Logging
- Use structured logging
- Centralize logs with ELK stack or similar
- Monitor error rates and performance

### Metrics
- Track API response times
- Monitor database performance
- Track ML model accuracy

## 🚀 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

## 🔄 Scaling

### Horizontal Scaling
- Use load balancers
- Deploy multiple instances
- Use container orchestration (Kubernetes)

### Vertical Scaling
- Increase CPU/memory resources
- Optimize ML models
- Use CDN for static assets

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Update CLIENT_URL in backend
   - Check frontend API calls

2. **WebSocket Connection Failed**
   - Verify Python service URL
   - Check firewall settings

3. **ML Models Not Loading**
   - Check Python dependencies
   - Verify model files exist

4. **Database Connection Issues**
   - Verify MongoDB URI
   - Check network connectivity

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Test API endpoints
curl http://localhost:3001/health
curl http://localhost:8000/health

# Check database connection
mongo "mongodb://localhost:27017/proctoring"
```

## 📞 Support

For deployment issues:
- Check the logs
- Verify environment variables
- Test individual services
- Review the documentation
