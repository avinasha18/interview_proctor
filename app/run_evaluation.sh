#!/usr/bin/env bash
# Generate synthetic eval data and run evaluation (metrics + confusion matrix + bar graphs).
# Run from project root: ./app/run_evaluation.sh
# Or from app dir with venv: cd app && source venv/bin/activate && ./run_evaluation.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
# Use local matplotlib cache so evaluation works in restricted envs
export MPLCONFIGDIR="${SCRIPT_DIR}/eval_data/.matplotlib"
mkdir -p "$MPLCONFIGDIR"

echo "Step 1: Generating synthetic evaluation data..."
python3 generate_eval_data.py 2>/dev/null || python generate_eval_data.py

echo ""
echo "Step 2: Running evaluation (this loads ML models and may take a minute)..."
python3 evaluate.py eval_data/synthetic 2>/dev/null || python evaluate.py eval_data/synthetic

echo ""
echo "Done. Check output in: $SCRIPT_DIR/eval_data/synthetic/output/"
echo "  - metrics.json          (accuracy, precision, recall, F1 per event)"
echo "  - metrics_bars.png       (bar graph: Accuracy, Precision, Recall, F1)"
echo "  - confusion_matrices.png (confusion matrix per event type)"
echo "  - confusion_overall.png  (overall violation vs normal)"
