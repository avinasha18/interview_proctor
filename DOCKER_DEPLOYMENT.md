# Docker Deployment Guide for Exam Proctor

## Overview
This guide covers deploying the Exam Proctor application using Docker containers for all services.

## Architecture
- **ML Service**: Python FastAPI service for proctoring analysis
- **Server**: Node.js Express server for API and WebSocket
- **Client**: React frontend application
- **Database**: MongoDB for data storage

## Prerequisites
- Docker and Docker Compose installed
- Git repository cloned
- Environment variables configured

## Quick Start

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd Exam-proctor
```

### 2. Environment Setup
Create `.env` file in the root directory:
```env
# Database
MONGODB_URI=mongodb://mongo:27017/exam-proctor

# Server
NODE_ENV=production
PORT=3001
CLIENT_URL=http://localhost:5173
ML_SERVICE_URL=http://ml-service:8000

# Client
VITE_BACKEND_URL=http://localhost:3001

# ML Service
PORT=8000
BACKEND_URL=http://server:3001

# Cloudinary (for video storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### 3. Build and Run
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access Services
- **Client**: http://localhost:5173
- **Server API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **MongoDB**: localhost:27017

## Individual Service Deployment

### ML Service (Python)
```bash
cd app
docker build -t exam-proctor-ml .
docker run -p 8000:8000 exam-proctor-ml
```

### Server (Node.js)
```bash
cd server
docker build -t exam-proctor-server .
docker run -p 3001:3001 exam-proctor-server
```

### Client (React)
```bash
cd client
docker build -t exam-proctor-client .
docker run -p 80:80 exam-proctor-client
```

## Production Deployment

### 1. Environment Variables
Set production environment variables:
```bash
export NODE_ENV=production
export MONGODB_URI=mongodb://your-mongo-host:27017/exam-proctor
export CLOUDINARY_CLOUD_NAME=your-cloud-name
export CLOUDINARY_API_KEY=your-api-key
export CLOUDINARY_API_SECRET=your-api-secret
```

### 2. Build Production Images
```bash
# Build with production optimizations
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Health Checks
```bash
# Check all services
docker-compose ps

# Check ML service health
curl http://localhost:8000/health

# Check server health
curl http://localhost:3001/health

# Check client
curl http://localhost:80/health
```

## Docker Images Details

### ML Service Dockerfile Features
- **Multi-stage build**: Optimized for size and security
- **System dependencies**: OpenCV, MediaPipe, PyTorch support
- **Model pre-download**: YOLOv8 model downloaded during build
- **Non-root user**: Security best practice
- **Health checks**: Automatic service monitoring

### Server Dockerfile Features
- **Alpine Linux**: Minimal base image
- **Production dependencies**: Only necessary packages
- **Non-root user**: Security hardening
- **Health checks**: Service monitoring

### Client Dockerfile Features
- **Multi-stage build**: Separate build and runtime stages
- **Nginx**: High-performance web server
- **Static optimization**: Gzip compression and caching
- **SPA routing**: Client-side routing support

## Troubleshooting

### Common Issues

#### 1. ML Service Build Failures
```bash
# Check if all dependencies are installed
docker run --rm -it exam-proctor-ml python -c "import cv2, torch, mediapipe"

# Check model download
docker run --rm -it exam-proctor-ml python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

#### 2. Server Connection Issues
```bash
# Check server logs
docker-compose logs server

# Test API endpoints
curl http://localhost:3001/health
```

#### 3. Client Build Issues
```bash
# Check build logs
docker-compose logs client

# Test static files
curl http://localhost:80/
```

### Performance Optimization

#### 1. Resource Limits
```yaml
# In docker-compose.yml
services:
  ml-service:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

#### 2. Volume Optimization
```yaml
# Use named volumes for better performance
volumes:
  mongo_data:
    driver: local
```

#### 3. Network Optimization
```yaml
# Create custom network
networks:
  exam-proctor-network:
    driver: bridge
```

## Security Considerations

### 1. Non-root Users
All Dockerfiles use non-root users for security.

### 2. Secrets Management
```bash
# Use Docker secrets for sensitive data
echo "your-secret" | docker secret create db_password -
```

### 3. Network Security
```yaml
# Limit network exposure
services:
  mongo:
    networks:
      - internal
```

## Monitoring and Logging

### 1. Log Management
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f ml-service
```

### 2. Health Monitoring
```bash
# Check service health
docker-compose ps

# Monitor resource usage
docker stats
```

### 3. Backup Strategy
```bash
# Backup MongoDB data
docker-compose exec mongo mongodump --out /backup

# Backup volumes
docker run --rm -v exam-proctor_mongo_data:/data -v $(pwd):/backup alpine tar czf /backup/mongo-backup.tar.gz /data
```

## Scaling

### Horizontal Scaling
```yaml
# Scale ML service
docker-compose up -d --scale ml-service=3

# Use load balancer
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

### Vertical Scaling
```yaml
# Increase resources
services:
  ml-service:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
```

## Maintenance

### 1. Updates
```bash
# Pull latest images
docker-compose pull

# Rebuild services
docker-compose build --no-cache

# Restart services
docker-compose restart
```

### 2. Cleanup
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Support

For deployment issues:
1. Check Docker logs: `docker-compose logs`
2. Verify environment variables
3. Test individual services
4. Check resource usage: `docker stats`
5. Review health check status

---

**Note**: This deployment setup is optimized for production use with proper security, monitoring, and scaling capabilities.
