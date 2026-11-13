#!/usr/bin/env bash
# Install HyperFrames' required Kokoro runtime, not a separate TTS pipeline.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v python3 >/dev/null 2>&1; then
  echo "Install Python3 and python3-venv first" >&2
  exit 1
fi
python3 -m venv .venv
.venv/bin/python -m pip install --disable-pip-version-check kokoro-onnx soundfile
.venv/bin/python -c 'import kokoro_onnx, soundfile; print("HyperFrames Kokoro runtime installed")'
printf 'HyperFrames Python: %s\n' "$PWD/.venv/bin/python"
