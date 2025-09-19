import cv2
import time
import torch
import mediapipe as mp
import numpy as np
from typing import List, Dict, Optional
import asyncio
import math

class ProctoringService:
    def __init__(self):
        self.model = None
        self.face_detector = None
        self.face_mesh = None
        self.sessions = {}
        
        # Configuration
        self.focus_timeout = 7  # seconds
        self.face_timeout = 10  # seconds
        self.drowsiness_threshold = 0.25
        self.focus_threshold = 0.35  # 15% deviation from center
        self.ear_frames = 0  # Counter for consecutive low EAR frames
        self.ear_threshold_frames = 3  # Number of frames to confirm drowsiness
        
        # YOLOv8 classes that are actually detected - using COCO dataset classes
        self.target_objects = [
            "cell phone", "book", "laptop", "mouse", "keyboard", "remote"
        ]
        
        # Event deduplication
        self.last_events = {}  # Store last event of each type per session
        self.event_cooldown = 3  # Minimum seconds between same event type
        
    async def initialize(self):
        """Initialize ML models"""
        try:
            # Load YOLOv8 model (better object detection)
            from ultralytics import YOLO
            self.model = YOLO('yolov8n.pt')  # nano version for faster inference
            print("YOLOv8 model loaded successfully")
            
            # Initialize MediaPipe face detection and face mesh
            self.mp_face = mp.solutions.face_detection
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_detector = self.mp_face.FaceDetection(
                model_selection=0,
                min_detection_confidence=0.6
            )
            self.face_mesh = self.mp_face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6
            )
            print("MediaPipe face detector and face mesh initialized")
            
        except Exception as e:
            print(f"Error initializing models: {e}")
            raise e
    
    def euclidean_distance(self, point1, point2):
        """Calculate Euclidean distance between two points"""
        return math.sqrt((point1.x - point2.x)**2 + (point1.y - point2.y)**2)
    
    def calculate_eye_aspect_ratio(self, eye_landmarks):
        """Calculate Eye Aspect Ratio for drowsiness detection"""
        try:
            # Use proper eye landmark points for MediaPipe face mesh
            # Eye landmarks are passed as a list of landmark objects
            if len(eye_landmarks) < 6:
                return 0.3
                
            # Calculate vertical distances
            vertical_1 = self.euclidean_distance(eye_landmarks[1], eye_landmarks[5])
            vertical_2 = self.euclidean_distance(eye_landmarks[2], eye_landmarks[4])
            
            # Calculate horizontal distance
            horizontal = self.euclidean_distance(eye_landmarks[0], eye_landmarks[3])
            
            # Calculate EAR
            if horizontal > 0:
                ear = (vertical_1 + vertical_2) / (2.0 * horizontal)
                return ear
            return 0.3  # Default EAR
        except Exception as e:
            print(f"Error calculating EAR: {e}")
            return 0.3  # Default EAR
    
    def is_drowsy(self, face_landmarks):
        """Check if the person is drowsy based on eye closure"""
        try:
            # Corrected MediaPipe face mesh landmark indices for better EAR calculation
            # Left eye landmarks (more accurate)
            left_eye_points = [
                face_landmarks[33],   # Left corner
                face_landmarks[159], face_landmarks[158], face_landmarks[157], # Top points
                face_landmarks[133],  # Right corner  
                face_landmarks[153], face_landmarks[145], face_landmarks[144]  # Bottom points
            ]
            
            # Right eye landmarks (more accurate) 
            right_eye_points = [
                face_landmarks[362],  # Left corner
                face_landmarks[386], face_landmarks[387], face_landmarks[388], # Top points
                face_landmarks[263],  # Right corner
                face_landmarks[373], face_landmarks[374], face_landmarks[380]  # Bottom points
            ]
            
            # Simplified EAR calculation using just vertical/horizontal ratio
            def simple_ear(eye_points):
                # Get corner points
                left_corner = eye_points[0]
                right_corner = eye_points[4] 
                
                # Get top and bottom points (use middle ones)
                top_point = eye_points[2]
                bottom_point = eye_points[6]
                
                # Calculate distances
                horizontal = abs(left_corner.x - right_corner.x)
                vertical = abs(top_point.y - bottom_point.y)
                
                if horizontal > 0:
                    return vertical / horizontal
                return 0.3
            
            # Calculate EAR for both eyes using simplified method
            left_ear = simple_ear(left_eye_points)
            right_ear = simple_ear(right_eye_points)
            
            
            # Calculate EAR for both eyes using simplified method
            left_ear = simple_ear(left_eye_points)
            right_ear = simple_ear(right_eye_points)
            
            # Average EAR
            avg_ear = (left_ear + right_ear) / 2
            
            print(f"👁️ EAR Values - Left: {left_ear:.3f}, Right: {right_ear:.3f}, Avg: {avg_ear:.3f}")
            
            # LOWERED threshold for better detection
            drowsiness_threshold = 0.18  # Increased to catch your range
            
            # Check if EAR is below threshold
            if avg_ear < drowsiness_threshold:
                self.ear_frames += 1
                print(f"🔍 Low EAR detected! Frame {self.ear_frames}/2")
            else:
                if self.ear_frames > 0:
                    print(f"🔄 EAR reset - was {self.ear_frames} frames")
                self.ear_frames = 0
            
            # Return True if eyes have been closed for enough consecutive frames
            is_drowsy = self.ear_frames >= 2  # Reduced to just 2 frames!
            
            if is_drowsy:
                print(f"😴 DROWSINESS DETECTED - EAR: {avg_ear:.3f}, Frames: {self.ear_frames}")
            
            return is_drowsy
            
        except Exception as e:
            print(f"Error in drowsiness detection: {e}")
            self.ear_frames = 0
            return False
    
    def is_looking_at_screen_advanced(self, face_landmarks, frame_width, frame_height):
        """Advanced screen focus detection using nose and eye positions"""
        try:
            # Get nose tip (landmark 1) and chin (landmark 18)
            nose_tip = face_landmarks[1]
            chin = face_landmarks[18]
            
            # Get left and right eye centers
            left_eye_center = face_landmarks[468]  # Left eye center
            right_eye_center = face_landmarks[473]  # Right eye center
            
            # Calculate face center using nose tip
            face_center_x = nose_tip.x
            face_center_y = nose_tip.y
            
            # Screen center in normalized coordinates
            screen_center_x = 0.5
            screen_center_y = 0.5
            
            # Calculate horizontal deviation
            horizontal_deviation = abs(face_center_x - screen_center_x)
            
            # Calculate vertical deviation (for head tilt detection)
            vertical_deviation = abs(face_center_y - screen_center_y)
            
            # Check if looking at screen (within threshold)
            is_focused_horizontal = horizontal_deviation < self.focus_threshold
            is_focused_vertical = vertical_deviation < 0.2  # Allow more vertical movement
            
            is_focused = is_focused_horizontal and is_focused_vertical
            
            print(f"🎯 Focus Analysis - H_dev: {horizontal_deviation:.3f}, V_dev: {vertical_deviation:.3f}, Focused: {is_focused}")
            
            return is_focused
            
        except Exception as e:
            print(f"Error in advanced focus detection: {e}")
            # Fallback to simple detection
            return self.is_looking_at_screen_simple(face_landmarks, frame_width, frame_height)
    
    def is_looking_at_screen_simple(self, face_landmarks, frame_width, frame_height):
        """Simple fallback focus detection"""
        try:
            # Use nose tip for simple detection
            nose_tip = face_landmarks[1]
            face_center_x = nose_tip.x
            
            # Check if face is roughly centered
            screen_center_x = 0.5
            deviation = abs(face_center_x - screen_center_x)
            
            return deviation < self.focus_threshold
            
        except Exception as e:
            print(f"Error in simple focus detection: {e}")
            return True  # Default to focused if detection fails
    
    async def start_session(self, interview_id: str):
        """Start a new proctoring session"""
        self.sessions[interview_id] = {
            "last_focus_time": time.time(),
            "last_face_time": time.time(),
            "start_time": time.time(),
            "events": [],
            "last_event_times": {},  # Track last event times for deduplication
            "focus_lost_start": None,  # Track when focus was first lost
            "is_currently_focused": True
        }
        self.last_events[interview_id] = {}
        self.ear_frames = 0  # Reset drowsiness counter
        print(f"✅ Started proctoring session for interview {interview_id}")
    
    async def end_session(self, interview_id: str):
        """End a proctoring session"""
        if interview_id in self.sessions:
            del self.sessions[interview_id]
        if interview_id in self.last_events:
            del self.last_events[interview_id]
        print(f"❌ Ended proctoring session for interview {interview_id}")
    
    def should_send_event(self, interview_id: str, event_type: str, current_time: float) -> bool:
        """Check if event should be sent (deduplication logic)"""
        if interview_id not in self.sessions:
            return False
            
        session = self.sessions[interview_id]
        last_event_time = session["last_event_times"].get(event_type, 0)
        
        # Only send event if enough time has passed since last event of same type
        return current_time - last_event_time >= self.event_cooldown
    
    def record_event_time(self, interview_id: str, event_type: str, current_time: float):
        """Record the time when an event was sent"""
        if interview_id in self.sessions:
            self.sessions[interview_id]["last_event_times"][event_type] = current_time
    
    async def analyze_frame(self, frame: np.ndarray, interview_id: str = None) -> List[Dict]:
        """Analyze a single frame for proctoring events"""
        events = []
        current_time = time.time()
        
        # Convert frame to RGB for MediaPipe
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, _ = frame.shape
        
        # Get or create session
        if interview_id is None:
            interview_id = list(self.sessions.keys())[0] if self.sessions else "default"
        
        if interview_id not in self.sessions:
            await self.start_session(interview_id)
        
        session = self.sessions[interview_id]
        
        # Face detection
        face_results = self.face_detector.process(img_rgb)
        face_mesh_results = self.face_mesh.process(img_rgb)
        num_faces = 0
        face_detected = False
        
        if face_results.detections:
            num_faces = len(face_results.detections)
            face_detected = True
            
            # Check for multiple faces
            if num_faces > 1 and self.should_send_event(interview_id, "multiple_faces", current_time):
                events.append({
                    "eventType": "multiple_faces",
                    "message": f"Multiple faces detected ({num_faces})",
                    "severity": "high",
                    "metadata": {"face_count": num_faces}
                })
                self.record_event_time(interview_id, "multiple_faces", current_time)
                print(f"🚨 Multiple faces detected: {num_faces}")
            
            # Face mesh analysis for focus and drowsiness
            if face_mesh_results.multi_face_landmarks:
                for face_landmarks in face_mesh_results.multi_face_landmarks:
                    try:
                        landmarks_list = face_landmarks.landmark
                        
                        # Enhanced focus detection
                        is_focused = self.is_looking_at_screen_advanced(landmarks_list, w, h)
                        
                        # Focus tracking logic
                        if is_focused:
                            if not session["is_currently_focused"]:
                                print("🎯 Focus regained!")
                                session["is_currently_focused"] = True
                                session["focus_lost_start"] = None
                            session["last_focus_time"] = current_time
                        else:
                            if session["is_currently_focused"]:
                                # Just lost focus
                                print("⚠️ Focus lost - starting timer")
                                session["is_currently_focused"] = False
                                session["focus_lost_start"] = current_time
                            elif session["focus_lost_start"]:
                                # Check if focus has been lost for too long
                                focus_lost_duration = current_time - session["focus_lost_start"]
                                if focus_lost_duration > self.focus_timeout and self.should_send_event(interview_id, "focus_lost", current_time):
                                    print(f"🚨 FOCUS LOST EVENT - Duration: {focus_lost_duration:.1f}s")
                                    events.append({
                                        "eventType": "focus_lost",
                                        "message": f"Not looking at screen for {focus_lost_duration:.1f}s",
                                        "severity": "medium",
                                        "metadata": {"duration": focus_lost_duration}
                                    })
                                    self.record_event_time(interview_id, "focus_lost", current_time)
                        
                        # Drowsiness detection
                        is_drowsy = self.is_drowsy(landmarks_list)
                        
                        if is_drowsy and self.should_send_event(interview_id, "drowsiness", current_time):
                            print(f"🚨 DROWSINESS EVENT TRIGGERED")
                            events.append({
                                "eventType": "drowsiness",
                                "message": "Candidate appears drowsy (eyes closed)",
                                "severity": "medium",
                                "metadata": {
                                    "detection_type": "eye_closure",
                                    "consecutive_frames": self.ear_frames
                                }
                            })
                            self.record_event_time(interview_id, "drowsiness", current_time)
                    
                    except Exception as e:
                        print(f"Error processing face landmarks: {e}")
                        # Reset to safe defaults
                        session["last_focus_time"] = current_time
                        session["is_currently_focused"] = True
                        session["focus_lost_start"] = None
            
            session["last_face_time"] = current_time
        
        # No face detected
        if not face_detected:
            face_missing_duration = current_time - session["last_face_time"]
            if face_missing_duration > self.face_timeout and self.should_send_event(interview_id, "face_missing", current_time):
                print(f"🚨 FACE MISSING EVENT - Duration: {face_missing_duration:.1f}s")
                events.append({
                    "eventType": "face_missing",
                    "message": f"No face detected for {face_missing_duration:.1f}s",
                    "severity": "high",
                    "metadata": {"duration": face_missing_duration}
                })
                self.record_event_time(interview_id, "face_missing", current_time)
            
            # Reset focus state when no face is detected
            session["is_currently_focused"] = True
            session["focus_lost_start"] = None
            self.ear_frames = 0  # Reset drowsiness counter
        
        # Object detection using YOLOv8
        if self.model:
            try:
                results = self.model(frame, verbose=False, conf=0.3)
                
                for result in results:
                    boxes = result.boxes
                    if boxes is not None:
                        for box in boxes:
                            class_id = int(box.cls[0])
                            confidence = float(box.conf[0])
                            label = self.model.names[class_id]
                            
                            # Reduced confidence thresholds for better detection
                            if label == "cell phone" and confidence > 0.3:
                                threshold_met = True
                            elif label in ["book", "laptop"] and confidence > 0.2:
                                threshold_met = True
                            elif label in self.target_objects and confidence > 0.3:
                                threshold_met = True
                            else:
                                threshold_met = False
                            
                            if threshold_met:
                                event_key = f"suspicious_object_{label}"
                                
                                if self.should_send_event(interview_id, event_key, current_time):
                                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                                    
                                    # Object name mapping
                                    object_names = {
                                        "cell phone": "Mobile Phone",
                                        "book": "Book/Notes",
                                        "laptop": "Laptop/Computer",
                                        "mouse": "Computer Mouse",
                                        "keyboard": "Keyboard"
                                    }
                                    object_name = object_names.get(label, label.replace('_', ' ').title())
                                    
                                    events.append({
                                        "eventType": "suspicious_object",
                                        "message": f"⚠️ {object_name} detected!",
                                        "severity": "high",
                                        "metadata": {
                                            "object": label,
                                            "confidence": confidence,
                                            "bbox": [x1, y1, x2, y2],
                                            "object_name": object_name
                                        }
                                    })
                                    self.record_event_time(interview_id, event_key, current_time)
                                    print(f"🚨 Detected {object_name} with confidence {confidence:.2f}")
                                    
            except Exception as e:
                print(f"Error in object detection: {e}")
        
        # Add timestamps to all events
        for event in events:
            event["timestamp"] = current_time
            event["interview_id"] = interview_id
        
        return events
    
    def get_session_stats(self, interview_id: str) -> Dict:
        """Get statistics for a session"""
        if interview_id not in self.sessions:
            return {}
        
        session = self.sessions[interview_id]
        current_time = time.time()
        
        return {
            "session_duration": current_time - session["start_time"],
            "last_face_seen": current_time - session["last_face_time"],
            "last_focused": current_time - session["last_focus_time"],
            "total_events": len(session["events"]),
            "currently_focused": session.get("is_currently_focused", True)
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if hasattr(self, 'face_detector') and self.face_detector:
                self.face_detector.close()
            if hasattr(self, 'face_mesh') and self.face_mesh:
                self.face_mesh.close()
            print("✅ Proctoring service cleaned up successfully")
        except Exception as e:
            print(f"Error during cleanup: {e}")

# Example usage and testing
async def test_proctoring():
    """Test the proctoring service"""
    proctoring = ProctoringService()
    await proctoring.initialize()
    
    # Start webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Cannot open camera")
        return
    
    interview_id = "test_interview_001"
    await proctoring.start_session(interview_id)
    
    print("🎥 Starting proctoring test... Press 'q' to quit")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Analyze frame
            events = await proctoring.analyze_frame(frame, interview_id)
            
            # Display events
            for event in events:
                print(f"📢 EVENT: {event['eventType']} - {event['message']}")
            
            # Show frame (optional)
            cv2.imshow('Proctoring Test', frame)
            
            # Break on 'q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    except KeyboardInterrupt:
        print("Test interrupted by user")
    
    finally:
        cap.release()
        cv2.destroyAllWindows()
        await proctoring.end_session(interview_id)
        await proctoring.cleanup()

if __name__ == "__main__":
    # Run the test
    asyncio.run(test_proctoring())