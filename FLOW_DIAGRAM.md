# Flow Diagram – Interview Proctoring System

End-to-end architecture, data flow, and ML pipeline.

---

## 1. System Architecture (High-Level)

```mermaid
flowchart LR
    subgraph Client["🖥️ React Client (Port 3000)"]
        UI[UI / Dashboard]
        Cam[Camera Capture]
        WS_C[WebSocket Client]
    end

    subgraph Backend["⚙️ Node.js Backend (Port 3001)"]
        API[REST API]
        Socket[Socket.IO]
        DB_Store[(MongoDB)]
    end

    subgraph ML["🤖 Python ML Service (Port 8000)"]
        FastAPI[FastAPI]
        Proctor[ProctoringService]
    end

    Cam -->|base64 frames| WS_C
    WS_C <-->|WebSocket| FastAPI
    UI <-->|HTTP / Socket.IO| API
    API <--> DB_Store
    FastAPI --> Proctor
    Proctor -->|events| API
    API -->|events| UI
```

---

## 2. End-to-End Data Flow

```mermaid
flowchart TB
    subgraph Step1["1. Interview setup"]
        A1[User starts interview]
        A2[Backend creates interview]
        A3[Client gets interview ID]
    end

    subgraph Step2["2. Video stream"]
        B1[Client captures camera]
        B2[Frames → base64]
        B3[WebSocket: POST /stream/:id]
        B4[Python receives frame]
    end

    subgraph Step3["3. ML analysis"]
        C1[ProctoringService.analyze_frame]
        C2[Face detection + landmarks + YOLO]
        C3[Rule-based: focus, drowsiness, etc.]
        C4[Events list]
    end

    subgraph Step4["4. Events back"]
        D1[WebSocket → events to client]
        D2[HTTP POST → Backend /api/events/:id]
        D3[Backend saves to MongoDB]
        D4[Socket.IO → Interviewer UI]
    end

    A1 --> A2 --> A3
    A3 --> B1 --> B2 --> B3 --> B4
    B4 --> C1 --> C2 --> C3 --> C4
    C4 --> D1
    C4 --> D2 --> D3 --> D4
```

---

## 3. ML Pipeline (Per Frame)

```mermaid
flowchart TB
    subgraph Input["Input"]
        Frame[BGR Frame]
    end

    subgraph Preprocess["Preprocess"]
        RGB[cv2.cvtColor → RGB]
    end

    subgraph Models["ML / DL Models"]
        FD[MediaPipe Face Detector]
        FL[MediaPipe Face Landmarker]
        YOLO[YOLOv8n Object Detector]
    end

    subgraph Outputs["Model outputs"]
        O1[Face count, bboxes]
        O2[468 face landmarks]
        O3[Object classes + bboxes]
    end

    subgraph Rules["Rule-based logic (per session)"]
        R1[Face count > 1? → multiple_faces]
        R2[No face > 8s? → face_missing]
        R3[Landmarks: nose/eyes vs center → focus_lost after 5s]
        R4[EAR from landmarks → drowsiness after 2 frames]
        R5[YOLO: phone/book/laptop/etc. → suspicious_object]
    end

    subgraph Events["Events"]
        E[eventType, message, severity, metadata]
    end

    Frame --> RGB
    RGB --> FD
    RGB --> FL
    Frame --> YOLO
    FD --> O1
    FL --> O2
    YOLO --> O3
    O1 --> R1
    O1 --> R2
    O2 --> R3
    O2 --> R4
    O3 --> R5
    R1 --> E
    R2 --> E
    R3 --> E
    R4 --> E
    R5 --> E
```

---

## 4. ML Models Used

| Component | Model / method | Purpose |
|-----------|----------------|--------|
| **Face detection** | MediaPipe Face Detector (BlazeFace short-range) or Tasks API `face_detector.tflite` | Face count, presence |
| **Face landmarks** | MediaPipe Face Mesh / Face Landmarker (468 points) | Focus (nose/eyes vs center), drowsiness (EAR) |
| **Object detection** | YOLOv8n (Ultralytics, COCO) `yolov8n.pt` | Phone, book, laptop, mouse, keyboard, remote |
| **Focus** | Rule-based | Nose/face center vs screen center; timeout 5 s |
| **Drowsiness** | Rule-based | Eye Aspect Ratio (EAR) from landmarks; threshold + 2 frames |
| **Face missing** | Rule-based | No face for 8 s → event |
| **Event dedup** | Rule-based | Same event type cooldown 3 s |

---

## 5. Event Types (Output of ML Pipeline)

```mermaid
flowchart LR
    A[analyze_frame] --> B{face count?}
    B -->|0 for >8s| C[face_missing]
    B -->|>1| D[multiple_faces]
    B -->|1 + landmarks| E{focus / EAR / YOLO}
    E -->|look away >5s| F[focus_lost]
    E -->|low EAR 2 frames| G[drowsiness]
    E -->|YOLO: phone/book/etc.| H[suspicious_object]
    C --> I[Events list]
    D --> I
    F --> I
    G --> I
    H --> I
```

---

## 6. File / Component Map

| Layer | Location | Role |
|-------|----------|------|
| **Client** | `client/` (React, Vite) | UI, camera, WebSocket to ML, Socket.IO to backend |
| **Backend** | `server/` (Node, Express) | Interviews, events API, MongoDB, Socket.IO |
| **ML service** | `app/main.py` | FastAPI, WebSocket `/stream/:id`, POST `/analyze_frame` |
| **Proctoring logic** | `app/proctoring_service.py` | YOLO + MediaPipe + rules, session state, events |
| **Face models** | `app/models/face_detector.tflite`, `face_landmarker.task` | MediaPipe Tasks API assets |
| **YOLO** | `app/yolov8n.pt` | Ultralytics COCO object detection |

---

## 7. Quick Reference – Single Frame Flow

```
Camera → base64 → WebSocket → FastAPI
  → decode → BGR frame
  → ProctoringService.analyze_frame(frame, interview_id)
      → RGB → Face Detector → face count
      → RGB → Face Landmarker → 468 landmarks
      → BGR → YOLO → object boxes + classes
      → Session state (last_face_time, focus_lost_start, ear_frames, …)
      → Rules (timeouts, EAR, focus threshold, cooldown)
      → List of events
  → events → WebSocket reply + POST to Backend /api/events/:id
```

You can paste the Mermaid blocks into [Mermaid Live Editor](https://mermaid.live) to edit or export as PNG/SVG.
