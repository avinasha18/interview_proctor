from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import json
import time
import asyncio
import httpx
from typing import Dict, List
import mediapipe as mp
import torch
from PIL import Image
import io
import os
from dotenv import load_dotenv

from proctoring_service import ProctoringService

load_dotenv()

app = FastAPI(title="Proctoring ML Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize proctoring service
proctoring_service = ProctoringService()

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Node.js backend URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

@app.get("/")
async def root():
    return {"message": "Proctoring ML Service is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/analyze_frame")
async def analyze_frame(frame_data: dict):
    """
    Analyze a single frame for proctoring events
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(frame_data["image"])
        image = Image.open(io.BytesIO(image_data))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Analyze frame
        events = await proctoring_service.analyze_frame(frame)
        
        return {
            "success": True,
            "events": events,
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/stream/{interview_id}")
async def websocket_endpoint(websocket: WebSocket, interview_id: str):
    """
    WebSocket endpoint for real-time video stream analysis
    """
    await websocket.accept()
    active_connections[interview_id] = websocket
    
    try:
        # Initialize proctoring session
        await proctoring_service.start_session(interview_id)
        
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            if "image" in frame_data:
                # Decode base64 image
                image_data = base64.b64decode(frame_data["image"])
                image = Image.open(io.BytesIO(image_data))
                frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
                
                # Analyze frame
                events = await proctoring_service.analyze_frame(frame)
                
                # Send events back to client (always send, even if empty)
                await websocket.send_text(json.dumps({
                    "type": "events",
                    "events": events,
                    "timestamp": time.time(),
                    "frame_processed": True
                }))
                
                # Send events to Node.js backend only if there are events
                if events:
                    await send_events_to_backend(interview_id, events)
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for interview {interview_id}")
    except Exception as e:
        print(f"Error in WebSocket connection: {e}")
    finally:
        # Clean up
        if interview_id in active_connections:
            del active_connections[interview_id]
        await proctoring_service.end_session(interview_id)

async def send_events_to_backend(interview_id: str, events: List[dict]):
    """
    Send events to Node.js backend
    """
    try:
        async with httpx.AsyncClient() as client:
            for event in events:
                await client.post(
                    f"{BACKEND_URL}/api/events/{interview_id}",
                    json=event,
                    timeout=5.0
                )
    except Exception as e:
        print(f"Error sending events to backend: {e}")

@app.on_event("startup")
async def startup_event():
    """
    Initialize models on startup
    """
    print("Initializing proctoring service...")
    await proctoring_service.initialize()
    print("Proctoring service initialized successfully!")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Cleanup on shutdown
    """
    print("Shutting down proctoring service...")
    await proctoring_service.cleanup()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
