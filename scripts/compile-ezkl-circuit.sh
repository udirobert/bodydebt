#!/bin/bash
# Compile the stress classifier ONNX model into EZKL ZK circuit artifacts.
#
# Prerequisites:
#   pip install ezkl
#   python scripts/generate-stress-model.py   (generates public/ezkl/model.onnx)
#
# Run: bash scripts/compile-ezkl-circuit.sh

set -euo pipefail

MODEL="public/ezkl/model.onnx"
OUT="public/ezkl"
INPUT="scripts/ezkl-input.json"

if [ ! -f "$MODEL" ]; then
  echo "ERROR: $MODEL not found. Run: python scripts/generate-stress-model.py"
  exit 1
fi

mkdir -p "$OUT"

echo "1/4 Generating witness..."
ezkl gen-witness --model "$MODEL" --data "$INPUT" --output "$OUT/witness.json"

echo "2/4 Compiling circuit..."
ezkl compile-circuit --model "$MODEL" --compiled-circuit "$OUT/compiled.ezkl"

echo "3/4 Downloading SRS..."
ezkl get-srs --output-dir "$OUT/srs/"

echo "4/4 Generating proving + verification keys..."
ezkl setup \
  --compiled-circuit "$OUT/compiled.ezkl" \
  --srs-dir "$OUT/srs/" \
  --pk-path "$OUT/pk.key" \
  --vk-path "$OUT/vk.key"

echo ""
echo "Done. Artifacts:"
ls -lh "$OUT/compiled.ezkl" "$OUT/pk.key" "$OUT/vk.key"
