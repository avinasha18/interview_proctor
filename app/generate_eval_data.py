"""
Generate synthetic evaluation data: frames + segment-based ground truth.
Run from repo root: python -m app.generate_eval_data
Uses PIL so no cv2 required for this script.
"""
import os
import json
import urllib.request
from io import BytesIO

import numpy as np
from PIL import Image

EVAL_DIR = os.path.join(os.path.dirname(__file__), "eval_data", "synthetic")
FRAMES_DIR = os.path.join(EVAL_DIR, "frames")
FACE_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Jim_Carrey_2008.jpg/220px-Jim_Carrey_2008.jpg"


def save_image_rgb(path: str, arr: np.ndarray):
    """Save BGR or RGB numpy array (H, W, 3) as JPEG."""
    if arr.shape[2] == 3 and arr.dtype == np.uint8:
        pil_img = Image.fromarray(arr)
        pil_img.save(path, "JPEG", quality=85)


def download_face_image():
    path = os.path.join(FRAMES_DIR, "face_sample.jpg")
    if os.path.exists(path):
        return path
    os.makedirs(FRAMES_DIR, exist_ok=True)
    try:
        with urllib.request.urlopen(FACE_URL, timeout=10) as resp:
            data = resp.read()
        img = Image.open(BytesIO(data))
        arr = np.array(img)
        if len(arr.shape) == 2:
            arr = np.stack([arr, arr, arr], axis=-1)
        save_image_rgb(path, arr)
        return path
    except Exception:
        gray = np.full((480, 640, 3), 128, dtype=np.uint8)
        save_image_rgb(path, gray)
        return path


def main():
    os.makedirs(FRAMES_DIR, exist_ok=True)
    segments = []
    frames_subdir = "frames"

    # 1) Face sample for "normal" segments
    face_path = download_face_image()
    face_img = np.array(Image.open(face_path))
    if len(face_img.shape) == 2:
        face_img = np.stack([face_img, face_img, face_img], axis=-1)
    if face_img.dtype != np.uint8:
        face_img = (np.clip(face_img, 0, 255)).astype(np.uint8)
    h, w = 480, 640
    if face_img.shape[0] != h or face_img.shape[1] != w:
        pil = Image.fromarray(face_img)
        face_img = np.array(pil.resize((w, h), Image.Resampling.LANCZOS))
        if len(face_img.shape) == 2:
            face_img = np.stack([face_img, face_img, face_img], axis=-1)

    # 2) Normal segments: 3 segments, 30 frames each (face visible)
    for i in range(3):
        frame_paths = []
        for j in range(30):
            fname = f"normal_{i+1}_frame_{j:03d}.jpg"
            path = os.path.join(FRAMES_DIR, fname)
            save_image_rgb(path, face_img)
            frame_paths.append(os.path.join(frames_subdir, fname))
        segments.append({
            "segment_id": f"normal_{i+1}",
            "frame_paths": frame_paths,
            "events": []
        })

    # 3) Face-missing segments: 3 segments, 90 black frames each (~9 sec no face)
    for i in range(3):
        frame_paths = []
        for j in range(90):
            fname = f"face_missing_{i+1}_frame_{j:03d}.jpg"
            path = os.path.join(FRAMES_DIR, fname)
            black = np.zeros((h, w, 3), dtype=np.uint8)
            save_image_rgb(path, black)
            frame_paths.append(os.path.join(frames_subdir, fname))
        segments.append({
            "segment_id": f"face_missing_{i+1}",
            "frame_paths": frame_paths,
            "events": ["face_missing"]
        })

    gt_path = os.path.join(EVAL_DIR, "ground_truth.json")
    with open(gt_path, "w") as f:
        json.dump(segments, f, indent=2)

    print(f"Generated {len(segments)} segments under {EVAL_DIR}")
    print(f"Ground truth: {gt_path}")


if __name__ == "__main__":
    main()
