# ClaudeExplainatory

Local-first illustrated explainer video maker. The picture **is the whole video**, with pan/zoom, layered parallax, editorial typography and captions, not a simulated player inside the video.

ClaudeExplainatory works independently of ClaudeCreate. No paid model/API calls required.

## One audio/video engine: HyperFrames

HyperFrames supplies local Kokoro voice synthesis, local Whisper transcription for word-level captions, and video rendering. We call that existing CLI instead of maintaining another Python Kokoro and faster-whisper package.

- Narration: HyperFrames TTS (Kokoro, entirely on-device)
- Word timing: HyperFrames transcribe (local Whisper; every word must match the script)
- Video: HyperFrames + GSAP
- Audio mixing, normalization and exports: FFmpeg
- Python 3: standard-library-only for generating optional sound effects and one CI test; **no Python packages or virtual environment needed**

Models are downloaded by HyperFrames on first use and then cached. No API key needed. Fully disconnected production has not yet been independently tested.

## Install on Linux Mint or Ubuntu

Install Node.js **22+** with your preferred Node version manager when the distribution's package is older. Install the other dependencies:

~~~bash
sudo apt update
sudo apt install -y git ffmpeg python3 espeak-ng
git clone https://github.com/SaridakisStamatisChristos/ClaudeExplainatory.git
cd ClaudeExplainatory
npm install --no-audit --no-fund
npm run doctor
~~~

If HyperFrames needs a rendering browser, install it once:

~~~bash
npx hyperframes browser ensure
npx hyperframes tts --list
~~~

**No pip, Python venv, or separate Kokoro clone.** HyperFrames handles local model installation on the first narration/transcription run.

## Make a video

Start with the validated full-canvas script in examples/editorial_v2.example.json and our original example artwork under assets/editorial/.

~~~bash
npm run explain -- check examples/editorial_v2.example.json --target 15
npm run explain -- preview examples/editorial_v2.example.json --draft --target 15
npm run explain -- render examples/editorial_v2.example.json --draft --target 15
~~~

The first check uses no model. Preview generates word-synced still frames. Render uses Kokoro narration and creates a short portrait Instagram MP4 and landscape YouTube MP4, thumbnails, caption text and credits. Drafts are at most 10 seconds at 540x960. Full 1080x1920 production requires owner approval before extended rendering. The --target 15/30/60 flag sets warning expectations, not exact spoken duration.

Voice options:

~~~bash
npm run explain -- voice-sample
npm run explain -- voice-select af_heart
~~~

Schema v2 must explicitly set schema_version:2 and mode:editorial_illustrated. Templates: editorial_split, illustration_motion, editorial_text_card, video_card (last name retained only for compatibility; artwork remains full-canvas). The original six v1 scene types are supported for existing scripts.

Media is restricted to existing local PNG/JPEG/WebP files under assets/, and optional 2-5-layer parallax. MP4 clip inputs and independently animated characters are not yet implemented. Fake player chrome is prohibited.

## Tests

~~~bash
npm test
npm run test:integration
npm run test:hyperframes
npm run test:editorial
npm run test:draft
~~~

Unit tests mock speech/transcription and verify schema, strict word alignment, and audio cache. The FFmpeg integration test uses a mock HyperFrames CLI that emits synthetic tones. Video smoke tests use the real HyperFrames renderer with synthetic audio/timing. **Passing these tests does NOT prove an actual Kokoro + Whisper production run**; real model synthesis, word match, disconnected rendering and visual approval remain outstanding.

## Documentation

- [Native HyperFrames speech integration](docs/HYPERFRAMES_VOICE.md)
- [Full-canvas artistic direction](docs/EDITORIAL_FULL_CANVAS_V0_2.md)
- [Editor JSON specification](docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Claude Chat script prompt](prompts/CLAUDE_EDITORIAL_REEL_MASTER.md)
- [Migration from ClaudeCreate](docs/MIGRATION_FROM_CLAUDECREATE.md)

ClaudeCreate is unaffected.

## Genuine model acceptance (not a mock)

The deterministic CI suite uses simulated audio and is separate from real speech acceptance. With Node 22+, `ffmpeg`, `ffprobe`, `espeak-ng`, and `npm install` completed, run:

~~~bash
npm run test:real-audio
npm run explain -- check examples/real_model_acceptance.json --target 15
npm run explain -- render examples/real_model_acceptance.json --draft --target 15
node tools/real_video_verify.mjs
~~~

The audio smoke test produces a short real Kokoro `af_heart` WAV, forces local Whisper `small.en` transcription, checks word alignment, measured duration, non-silent signal and verified warm cache. A local result is saved to `out/real-model-smoke/`. The video command creates a **maximum 10-second** real-model draft, with portrait and landscape MP4s under `out/what-a-river-connects-draft/`; the verifier checks actual streams, codecs, dimensions and duration.

A separate GitHub Actions job attempts genuine audio and video acceptance on pushes to the production-acceptance branch. Model downloads or native dependencies may prevent execution on CI; such a result is **NOT PASSED**, even if the independent baseline CI job succeeds. Inspect the job logs, `CI_STATUS.txt`, audio evidence, and the `real-model-acceptance` artifact. A machine pass is not equivalent to human listening, visual sign-off, or verified offline rendering. Do not interpret a synthetic test tone as speech.
