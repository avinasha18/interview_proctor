"""
Record REAL evaluation clips from your webcam and build ground truth for real metrics.
Run: cd app && source venv/bin/activate && python record_eval_clips.py

- Press SPACE to start/stop recording a segment.
- When you STOP, press a number to label: 1=normal, 2=face_missing, 3=focus_lost, 4=multiple_faces, 5=suspicious_object, 6=drowsiness
- Record at least 3 "normal" (look at camera) and 3 "face_missing" (leave frame 8+ sec) for meaningful metrics.
- Press 'q' to quit and save ground_truth.json. Then run: python evaluate.py eval_data/real
"""
import os
import json
import cv2

EVAL_DIR = os.path.join(os.path.dirname(__file__), "eval_data", "real")
FRAMES_DIR = os.path.join(EVAL_DIR, "frames")
EVENT_KEYS = {
    "1": [],
    "2": ["face_missing"],
    "3": ["focus_lost"],
    "4": ["multiple_faces"],
    "5": ["suspicious_object"],
    "6": ["drowsiness"],
}
EVENT_NAMES = {"1": "normal", "2": "face_missing", "3": "focus_lost", "4": "multiple_faces", "5": "suspicious_object", "6": "drowsiness"}


def main():
    os.makedirs(FRAMES_DIR, exist_ok=True)
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Could not open webcam. Try changing 0 to 1 in cv2.VideoCapture(0).")
        return
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    print("Record REAL clips for evaluation.")
    print("  SPACE = start/stop segment")
    print("  When you STOP: 1=normal, 2=face_missing, 3=focus_lost, 4=multi_face, 5=suspicious, 6=drowsy")
    print("  q = quit and save")
    print("  Tip: For 'normal' look at camera. For 'face_missing' leave the frame 8+ seconds then stop.")
    segments = []
    segment_id = 0
    recording = False
    frame_list = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if recording:
            frame_list.append(frame.copy())
            cv2.putText(frame, "RECORDING - SPACE to stop", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        else:
            cv2.putText(frame, "SPACE to start segment", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.imshow("Record eval clips (SPACE=start/stop, 1-6=label, q=quit)", frame)
        key = cv2.waitKey(1) & 0xFF
        if key == ord(" "):
            if not recording:
                recording = True
                frame_list = []
                print("Recording... (leave frame 8+ sec for face_missing, then SPACE + 2)")
            else:
                recording = False
                if not frame_list:
                    print("No frames captured, segment ignored.")
                    continue
                print("Label this segment: 1=normal 2=face_missing 3=focus_lost 4=multi 5=suspicious 6=drowsy")
                label_key = None
                while True:
                    k = cv2.waitKey(0) & 0xFF
                    if k == ord("q"):
                        break
                    label_key = chr(k) if k else ""
                    if label_key in EVENT_KEYS:
                        break
                if label_key not in EVENT_KEYS:
                    print("Skipped segment.")
                    continue
                segment_id += 1
                seg_name = f"real_{segment_id}"
                events = EVENT_KEYS[label_key]
                frame_paths = []
                for i, f in enumerate(frame_list):
                    fname = f"{seg_name}_frame_{i:04d}.jpg"
                    path = os.path.join(FRAMES_DIR, fname)
                    cv2.imwrite(path, f)
                    frame_paths.append(os.path.join("frames", fname))
                segments.append({"segment_id": seg_name, "frame_paths": frame_paths, "events": events})
                print(f"Saved segment {seg_name} ({len(frame_paths)} frames) as {EVENT_NAMES[label_key]} {events}")
        if key == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()
    if segments:
        gt_path = os.path.join(EVAL_DIR, "ground_truth.json")
        with open(gt_path, "w") as f:
            json.dump(segments, f, indent=2)
        print(f"Saved {len(segments)} segments to {gt_path}")
        print("Run for REAL metrics:  python evaluate.py eval_data/real")
    else:
        print("No segments saved.")


if __name__ == "__main__":
    main()
