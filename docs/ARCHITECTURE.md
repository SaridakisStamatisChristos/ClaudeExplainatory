# ClaudeExplainatory Architecture

## Speech: one native HyperFrames engine

Speech is generated using the installed HyperFrames local Kokoro TTS, not a second Python Kokoro library. Precise word timing comes from HyperFrames' local whisper.cpp transcription. The source adapter is src/audio/hyperframes.mjs.

1. SHA-256 of exact script text, voice ID and adapter version keys an isolated directory under .cache/voices/.
2. HyperFrames TTS creates narration.wav inside the directory.
3. HyperFrames transcribe writes word-level transcript.json into the same isolated directory, using English small.en or multilingual large-v3 selected by Kokoro voice prefix.
4. FFprobe measures WAV duration.
5. The adapter checks ordered transcription match for EVERY scripted word, timing chronology, finite timestamps and WAV bounds. On missing words or invalid data, rendering stops. No fabricated caption timings.
6. Only fully aligned audio metadata is cached in timing.json. Voice samples and normal renders use exactly the same pipeline.

On first use Kokoro and Whisper weights may download. No paid APIs or external TTS calls. Model-level end-to-end audio remains to be tested on a local machine.

## Visuals and outputs

src/spec.mjs checks strict unversioned v1 compatibility and explicit v2 editorial JSON. src/editorial/assets.mjs verifies local image paths, rejects traversal/URLs and stages local images. src/editorial/layout.mjs and src/composition.mjs render 1080x1920 full-canvas artwork, parallax, paper typography, GSAP deterministic camera movement and word-timed captions. There is no embedded player frame. The six older templates remain compatible. MP4 source seeking is not supported.

HyperFrames renders frames to an MP4. FFmpeg layers narration, synthesized CC0 sound effects from the Python3 standard-library-only tools/synth_sfx.py, and optional licensed music. Two-pass loudnorm targets -14 LUFS and -1.5 dBTP. Output: portrait MP4, landscape MP4, thumbnail stills, caption text and credits. Draft is capped at 10 seconds, 540x960. No network needed for video output after setup.

## Verification boundaries

- npm test: JSON validation, media security, full canvas, word alignment, adapter cache and mocked HyperFrames CLI calls
- npm run test:integration: real FFmpeg exports + mock HyperFrames TTS/transcribe/render, synthetic tone
- npm run test:hyperframes and npm run test:editorial: real HyperFrames short frame capture, synthetic timing
- npm run test:draft: real 8.4-second HyperFrames capture and portrait/landscape FFmpeg/FFprobe, synthetic tone
- NOT yet verified: genuine Kokoro model speech + Whisper word-match end-to-end, disconnected production and human visual signoff

ClaudeExplainatory is standalone and does not modify ClaudeCreate.
