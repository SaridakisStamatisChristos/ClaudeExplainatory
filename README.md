# ClaudeExplainatory — Local Illustrated Explainer Video Studio

**A standalone application for full-canvas animated educational explainer reels.** This project contains the editorial video functionality formerly developed on ClaudeCreate's experimental v0.2 branch. It does **not** require installing or running ClaudeCreate.

The illustration **is the video**: original/local artwork fills the entire vertical frame, with animation, editorial text and timed subtitles layered over it. No fake embedded video player, border, play button, progress indicator or nested interface.

## Features

- Original or appropriately licensed local PNG/JPEG/WebP art, deterministic pan/zoom, optional 2–5 transparent parallax layers
- Four visual scene templates: `editorial_split`, `illustration_motion`, `editorial_text_card`, `video_card` (legacy name, **full canvas**)
- Explicit versioned JSON schema with strict validation, safe local media staging, text escaping, and predictable rendering
- Local Kokoro narration with word timestamps, HyperFrames + GSAP, FFmpeg audio mixing and measured two-pass loudness
- Vertical Instagram MP4, landscape YouTube MP4, captions, thumbnail stills, credits
- All six original classic templates remain supported for existing scripts, but the editorial ones are the focus
- Free, local rendering after initial setup; no paid APIs or cloud rendering

## Install — Linux Mint / Ubuntu

Prerequisites: **Node.js 22+**, Python **3.11/3.12**, FFmpeg / FFprobe, a Chromium browser supported by HyperFrames, and `espeak-ng`. Install the base packages:

```bash
sudo apt update
sudo apt install -y git curl ffmpeg espeak-ng libsndfile1 python3 python3-venv python3-pip build-essential
```

If your OS packages provide an older Node version, install Node 22+ from an appropriate Node version manager. If `python3` isn't 3.11/3.12, create the virtual environment using `python3.12 -m venv .venv` after installing it.

```bash
git clone https://github.com/SaridakisStamatisChristos/ClaudeExplainatory.git
cd ClaudeExplainatory
npm install --no-audit --no-fund
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
npm run doctor
```

HyperFrames may require a one-time compatible-browser installation. Kokoro / faster-whisper model files may download on first use; production is designed to work locally after dependencies are cached, but a fully disconnected end-to-end test is still pending.

## Create an illustrated explainer

The repository includes original demonstration artwork at `assets/editorial/demo-landscape.png` and a transparent foreground at `assets/editorial/demo-trees.png`. Start with `examples/editorial_v2.example.json`. It uses `"schema_version":2` and `"mode":"editorial_illustrated"`.

```bash
npm test
npm run explain -- check examples/editorial_v2.example.json --target 15
npm run explain -- preview examples/editorial_v2.example.json --draft --target 15
npm run explain -- render examples/editorial_v2.example.json --draft --target 15
```

The `preview` and `render` commands synthesize **real** Kokoro audio and require a working local model installation. `--draft` renders 540×960 and clips the rendered length at 10 seconds. The `--target` option sets checker expectations (15, 30 or 60 seconds), not a guaranteed final audio duration. `npm run reel` is a compatibility alias.

The original six classic templates work with unversioned v1 scripts. The new illustrated templates require explicit v2, preserve the maximum **16-word narration per scene**, and accept only local paths under `assets/`. No remote assets, arbitrary HTML/JS/CSS from JSON, missing files, or media path traversal. `player_chrome:true` is intentionally invalid; the video is full-screen. Local MP4 *input* clips are not yet supported pending deterministic seeking tests.

## Testing and status

```bash
npm test
npm run test:integration
npm run test:hyperframes
npm run test:editorial
npm run test:draft
```

The editorial HyperFrames smoke test is a real **2-second video capture** at 540×960 using synthetic word metadata. The draft smoke renders an **8.4-second video**, runs FFmpeg/FFprobe and creates both orientations using a **synthetic test tone**, **not Kokoro speech**. The other synthetic integration test uses a dummy renderer. CI status is not proof of a fully narrated Kokoro production reel.

**Outstanding gates:** actual Kokoro + end-to-end word alignment, fully disconnected production and independent aesthetic approval. Do not render >10 seconds at draft resolution without owner approval.

## Documentation

- [Editorial JSON spec](docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md)
- [Correct full-canvas visual direction](docs/EDITORIAL_FULL_CANVAS_V0_2.md)
- [Script schema and backward compatibility](docs/SCRIPT_SPEC.md)
- [Rendering architecture](docs/ARCHITECTURE.md)
- [Acceptance matrix](docs/EDITORIAL_V0_2_ACCEPTANCE.md)
- [Free Claude Chat script prompt](prompts/CLAUDE_EDITORIAL_REEL_MASTER.md)
- [Project split history](docs/MIGRATION_FROM_CLAUDECREATE.md)

The original general-purpose ClaudeCreate repository remains separate. No runtime dependency on ClaudeCreate is needed here.
