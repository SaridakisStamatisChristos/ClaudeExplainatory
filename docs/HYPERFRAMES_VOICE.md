# Native HyperFrames Kokoro + transcription

HyperFrames includes Kokoro-82M TTS and local Whisper transcription. ClaudeExplainatory uses those directly, eliminating the redundant project-level speech pipeline (tools/tts.py and requirements.txt). HyperFrames itself **requires** an isolated Python `kokoro-onnx` and `soundfile` runtime for its Kokoro command, as confirmed by actual CI execution. This is a dependency of the *single* HyperFrames engine, not a second TTS implementation.

## Install

~~~bash
sudo apt install -y ffmpeg python3 python3-venv espeak-ng
npm install
bash tools/setup_kokoro_runtime.sh
npx hyperframes tts --list
~~~

Python3 remains for stdlib sound-effect synthesis and mock CI. For genuine Kokoro synthesis, use the isolated `.venv` created by `setup_kokoro_runtime.sh`; CLI runners automatically use `.venv/bin/python` through `HYPERFRAMES_PYTHON`, unless that environment variable was explicitly set.

## Commands used by the app

~~~bash
node_modules/.bin/hyperframes tts "An idea begins with a question." \
  --voice af_heart --speed 1 --output /absolute/cache/narration.wav

node_modules/.bin/hyperframes transcribe /absolute/cache/narration.wav \
  --dir /absolute/cache --engine whisper --model small.en --language en --json

ffprobe -v error -show_entries format=duration -of json /absolute/cache/narration.wav
~~~

Each scene has its own hash-keyed .cache/voices/<hash>/ working directory. HyperFrames writes transcript.json as an array of word entries with text/start/end. The adapter matches the original script words in order and refuses missing words, impossible timestamp ranges or unreadable WAV lengths. There is no timing approximation if ASR fails. The cache holds only validated metadata, including an SHA-256 audio fingerprint. A damaged WAV or mismatched cache entry triggers complete regeneration. Transcription word alignment is strict and reports inserted, missing or unexpected trailing speech; no timestamps are invented.

American and British voices use English small.en; other supported Kokoro prefixes choose the corresponding language and multilingual large-v3. The multilingual small model is the local-first default instead of immediately downloading the multi-gigabyte large-v3 model. Model files may be downloaded on first use and can be large. Voice samples use the same adapter.

The unit tests exercise the bridge with a simulated CLI, not model weights. Production Kokoro+Whisper integration still requires a genuine local model run; a green synthetic CI result must not be described as proof.

Reference: https://hyperframes.app/docs/5-packages/cli
