# 📄 Proctoring System for Video Interviews

A comprehensive video proctoring system that detects focus, suspicious objects, and monitors interview integrity in real-time.

## 🎯 Features

- **Real-time Focus Detection**: Monitors if candidate is looking at screen
- **Face Detection**: Tracks face presence and multiple faces
- **Object Detection**: Identifies phones, books, laptops, and other suspicious items
- **Live Event Logging**: Real-time alerts and event tracking
- **Report Generation**: PDF, CSV, and text report downloads
- **WebSocket Communication**: Real-time data streaming between services
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Node.js API    │    │ Python ML      │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│  (FastAPI)      │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   MongoDB        │    │   YOLOv5 +      │
│   Connection    │    │   Database      │    │   MediaPipe     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Exam-proctor
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Python ML Service: http://localhost:8000

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB
- Git

#### Backend Setup
```bash
cd server
npm install
cp env.example .env
# Edit .env with your MongoDB connection string
npm run dev
```

#### Python ML Service Setup
```bash
cd app
pip install -r requirements.txt
cp env.example .env
# Edit .env with your backend URL
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd client
npm install
npm run dev
```

## 📱 Usage

1. **Start Interview**
   - Enter candidate and interviewer names
   - Click "Start Interview"

2. **Enable Monitoring**
   - Click "Start Monitoring" to begin camera access
   - Allow camera and microphone permissions

3. **Monitor Events**
   - View real-time events in the Event Log panel
   - Events include focus loss, face detection, suspicious objects

4. **Download Reports**
   - Click PDF, CSV, or Summary buttons to download reports
   - Reports include detailed event logs and integrity scores

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/proctoring
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
PYTHON_SERVICE_URL=http://localhost:8000
```

#### Python Service (.env)
```env
BACKEND_URL=http://localhost:3001
HOST=0.0.0.0
PORT=8000
FOCUS_TIMEOUT=5
FACE_TIMEOUT=10
```

## 📊 API Endpoints

### Interviews
- `POST /api/interviews/start` - Start new interview
- `POST /api/interviews/:id/end` - End interview
- `GET /api/interviews/:id` - Get interview details
- `GET /api/interviews/:id/events` - Get interview events

### Reports
- `GET /api/reports/:id/pdf` - Download PDF report
- `GET /api/reports/:id/csv` - Download CSV report
- `GET /api/reports/:id/summary` - Get report summary

### Events
- `POST /api/events/:interviewId` - Log proctoring event

## 🧠 ML Models

- **YOLOv5**: Object detection for phones, books, laptops, papers
- **MediaPipe**: Face detection and tracking
- **Custom Logic**: Focus detection and eye tracking

## 📈 Event Types

- `focus_lost`: Candidate not looking at screen for >5 seconds
- `face_missing`: No face detected for >10 seconds
- `multiple_faces`: Multiple faces detected in frame
- `suspicious_object`: Unauthorized items detected
- `eye_closure`: Eye closure/drowsiness detected
- `audio_detected`: Background voices detected

## 🚀 Deployment

### Production Deployment

1. **Update environment variables** for production
2. **Use Docker Compose** for easy deployment
3. **Configure reverse proxy** (nginx) for SSL
4. **Set up MongoDB Atlas** for database hosting
5. **Deploy to cloud platforms** (AWS, GCP, Azure)

### Cloud Deployment Options

- **Render**: Easy deployment with automatic SSL
- **Railway**: Simple deployment with built-in databases
- **AWS ECS**: Scalable container deployment
- **Google Cloud Run**: Serverless container deployment

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Python service tests
cd app
pytest

# Frontend tests
cd client
npm test
```

## 📝 Development

### Adding New Features

1. **Backend**: Add routes in `server/routes/`
2. **Python ML**: Add models in `app/proctoring_service.py`
3. **Frontend**: Add components in `client/src/components/`

### Code Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.jsx        # Main app component
├── server/                # Node.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   └── index.js          # Main server file
├── app/                  # Python ML service
│   ├── main.py           # FastAPI app
│   └── proctoring_service.py  # ML logic
└── docker-compose.yml    # Docker configuration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🎯 Future Enhancements

- [ ] Audio analysis for background voices
- [ ] Advanced eye tracking
- [ ] Machine learning model improvements
- [ ] Mobile app support
- [ ] Multi-language support
- [ ] Advanced reporting features
