"""
Evaluation script: segment-based metrics, confusion matrix, and graphs.
Run from app dir: python evaluate.py eval_data/synthetic  or  python evaluate.py eval_data/real
"""
import os
import sys
import json
import time
import asyncio
from collections import defaultdict

import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, accuracy_score, roc_curve, auc

_app_dir = os.path.dirname(os.path.abspath(__file__))
_mpl_dir = os.path.join(_app_dir, "eval_data", ".matplotlib")
os.makedirs(_mpl_dir, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", _mpl_dir)

# Event types for confusion matrix and bar chart: face_missing, focus_lost, suspicious_object, drowsiness (no overall)
EVENT_TYPES_INCLUDED = ["face_missing", "focus_lost", "suspicious_object", "drowsiness"]

_simulated_time = None
def _mock_time():
    return _simulated_time


async def run_segment(proctoring, segment_id: str, frame_paths: list, eval_dir: str):
    global _simulated_time
    await proctoring.start_session(segment_id)
    predicted = set()
    for rel_path in frame_paths:
        full_path = os.path.join(_app_dir, eval_dir, rel_path)
        if not os.path.exists(full_path):
            continue
        frame = cv2.imread(full_path)
        if frame is None:
            continue
        orig_time = time.time
        time.time = _mock_time
        try:
            events = await proctoring.analyze_frame(frame, segment_id)
            for e in events:
                predicted.add(e.get("eventType"))
        finally:
            time.time = orig_time
        _simulated_time += 1.0
    await proctoring.end_session(segment_id)
    return predicted


def load_ground_truth(eval_dir: str):
    gt_path = os.path.join(_app_dir, eval_dir, "ground_truth.json")
    if not os.path.exists(gt_path):
        return None
    with open(gt_path) as f:
        return json.load(f)


def compute_metrics(segments, predictions, event_types):
    event_types = list(event_types)
    metrics = {}
    y_true_per_event = defaultdict(list)
    y_pred_per_event = defaultdict(list)
    for seg, pred in zip(segments, predictions):
        gt_events = set(seg.get("events") or [])
        for e in event_types:
            y_true_per_event[e].append(1 if e in gt_events else 0)
            y_pred_per_event[e].append(1 if e in pred else 0)
    for e in event_types:
        y_t = y_true_per_event[e]
        y_p = y_pred_per_event[e]
        if not y_t:
            continue
        p = precision_score(y_t, y_p, zero_division=0)
        r = recall_score(y_t, y_p, zero_division=0)
        f = f1_score(y_t, y_p, zero_division=0)
        acc = accuracy_score(y_t, y_p)
        cm = confusion_matrix(y_t, y_p)
        if cm.shape == (1, 1):
            v = int(cm.flat[0])
            tn, fp, fn, tp = (v, 0, 0, 0) if y_t[0] == 0 else (0, 0, 0, v)
        elif cm.shape == (2, 2):
            tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])
        else:
            tn = fp = fn = tp = 0
        metrics[e] = {
            "precision": round(p, 4), "recall": round(r, 4), "f1": round(f, 4), "accuracy": round(acc, 4),
            "TP": tp, "FP": fp, "FN": fn, "TN": tn,
            "confusion_matrix": [[tn, fp], [fn, tp]],
        }
    return metrics


def plot_confusion_matrices(metrics, event_types, out_dir: str):
    n = len(event_types)
    if n == 0:
        return
    cols = min(3, n)
    rows = (n + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(4 * cols, 4 * rows))
    axes = np.atleast_1d(axes).flatten()
    for i, e in enumerate(event_types):
        m = metrics.get(e)
        if not m:
            continue
        ax = axes[i] if i < len(axes) else None
        if ax is None:
            break
        cm = np.array(m["confusion_matrix"])
        sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax,
                    xticklabels=["Neg", "Pos"], yticklabels=["Neg", "Pos"])
        ax.set_title(f"Confusion matrix: {e}")
        ax.set_ylabel("True")
        ax.set_xlabel("Predicted")
    for j in range(i + 1, len(axes)):
        axes[j].set_visible(False)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "confusion_matrices.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved confusion_matrices.png to {out_dir}")


def plot_metrics_bars(metrics, event_types, out_dir: str):
    """Bar chart for event types only (no Overall). Zero values get min height so all bars are visible."""
    if not event_types:
        return
    labels = list(event_types)
    n = len(labels)
    x = np.arange(n)
    w = 0.2
    min_h = 0.03  # min bar height so 0 is still visible
    def _v(v):
        return max(v, min_h) if v == 0 else v
    accs = [_v(metrics.get(e, {}).get("accuracy", 0)) for e in event_types]
    prec = [_v(metrics.get(e, {}).get("precision", 0)) for e in event_types]
    rec = [_v(metrics.get(e, {}).get("recall", 0)) for e in event_types]
    f1s = [_v(metrics.get(e, {}).get("f1", 0)) for e in event_types]
    fig, ax = plt.subplots(figsize=(max(10, n * 1.2), 6))
    ax.bar(x - 1.5 * w, accs, w, label="Accuracy", color="darkviolet")
    ax.bar(x - 0.5 * w, prec, w, label="Precision", color="steelblue")
    ax.bar(x + 0.5 * w, rec, w, label="Recall", color="coral")
    ax.bar(x + 1.5 * w, f1s, w, label="F1", color="seagreen")
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=20, ha="right")
    ax.set_ylabel("Score")
    ax.set_ylim(0, 1.12)
    ax.legend(loc="lower right")
    ax.set_title("Accuracy, Precision, Recall, F1 (face_missing, focus_lost, suspicious_object, drowsiness)")
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "metrics_bars.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved metrics_bars.png to {out_dir}")


def plot_roc_curve(y_true_binary, predictions, out_dir: str):
    """ROC for violation vs normal. Score = number of event types predicted in segment."""
    scores = np.array([len(p) for p in predictions], dtype=float)
    if len(np.unique(y_true_binary)) < 2:
        return
    fpr, tpr, _ = roc_curve(y_true_binary, scores)
    roc_auc = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(fpr, tpr, color="darkorange", lw=2, label=f"ROC (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1.05)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve (Violation vs Normal)")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "roc_curve.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved roc_curve.png (AUC={roc_auc:.3f}) to {out_dir}")


def plot_overall_confusion(y_true_binary, y_pred_binary, out_dir: str):
    cm = confusion_matrix(y_true_binary, y_pred_binary)
    if cm.size < 4:
        return
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", ax=ax,
                xticklabels=["Normal", "Violation"], yticklabels=["Normal", "Violation"])
    ax.set_title("Overall: Violation vs Normal")
    ax.set_ylabel("True")
    ax.set_xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, "confusion_overall.png"), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Saved confusion_overall.png to {out_dir}")


async def main_async(eval_dir: str):
    from proctoring_service import ProctoringService
    proctoring = ProctoringService()
    await proctoring.initialize()
    segments = load_ground_truth(eval_dir)
    if not segments:
        print(f"No ground_truth.json in {eval_dir}. Record clips first: python record_eval_clips.py")
        return
    out_dir = os.path.join(_app_dir, eval_dir, "output")
    os.makedirs(out_dir, exist_ok=True)
    global _simulated_time
    _simulated_time = time.time()
    predictions = []
    for seg in segments:
        pred = await run_segment(proctoring, seg["segment_id"], seg["frame_paths"], eval_dir)
        predictions.append(pred)
        print(f"Segment {seg['segment_id']}: GT={seg.get('events')} Pred={sorted(pred)}")
    await proctoring.cleanup()
    event_types_all = sorted({e for seg in segments for e in (seg.get("events") or [])} | {e for pred in predictions for e in pred} | set(EVENT_TYPES_INCLUDED))
    metrics = compute_metrics(segments, predictions, event_types_all)
    event_types = [e for e in EVENT_TYPES_INCLUDED if e in metrics]
    y_true_bin = [1 if (seg.get("events") or []) else 0 for seg in segments]
    y_pred_bin = [1 if pred else 0 for pred in predictions]
    overall_accuracy = float(accuracy_score(y_true_bin, y_pred_bin)) if y_true_bin else 0.0
    try:
        plot_roc_curve(y_true_bin, predictions, out_dir)
    except Exception as ex:
        print("ROC plot skip:", ex)
    plot_confusion_matrices(metrics, event_types, out_dir)
    plot_metrics_bars(metrics, event_types, out_dir)
    results = {"overall_accuracy": round(overall_accuracy, 4), "per_event": {k: v for k, v in metrics.items() if k in EVENT_TYPES_INCLUDED}}
    with open(os.path.join(out_dir, "metrics.json"), "w") as f:
        json.dump(results, f, indent=2)
    print("\n--- Metrics (face_missing, focus_lost, suspicious_object, drowsiness) ---")
    print(f"Overall accuracy (violation vs normal): {overall_accuracy:.4f}")
    for e in event_types:
        m = metrics.get(e, {})
        print(f"{e}: Accuracy={m.get('accuracy')} Precision={m.get('precision')} Recall={m.get('recall')} F1={m.get('f1')}")
    print(f"\nResults written to {out_dir}")


def main():
    eval_dir = sys.argv[1] if len(sys.argv) > 1 else "eval_data/synthetic"
    asyncio.run(main_async(eval_dir))


if __name__ == "__main__":
    main()
