# ClaudeExplainatory

Local-first illustrated explainer video maker. The picture **is the whole video**, with pan/zoom, layered parallax, editorial typography and captions, not a simulated player inside the video.

ClaudeExplainatory works independently of ClaudeCreate. No paid model/API calls required.

## One audio/video engine: HyperFrames

HyperFrames supplies local Kokoro voice synthesis, local Whisper transcription for word-level captions, and video rendering. We call that existing CLI instead of maintaining another Python Kokoro and faster-whisper package.

- Narration: HyperFrames TTS (Kokoro, entirely on-device)
- Word timing: HyperFrames transcribe (local Whisper; every word must match the script)
- Video: HyperFrames + GSAP
- Audio mixing, normalization and exports: FFmpeg
- Python 3: standard-library sound effects, plus an **isolated** `.venv` with `kokoro-onnx` and `soundfile` required by HyperFrames itself

Models are downloaded by HyperFrames on first use and then cached. No API key needed. Fully disconnected production has not yet been independently tested.

## Install on Linux Mint or Ubuntu

Install Node.js **22+** with your preferred Node version manager when the distribution's package is older. Install the other dependencies:

~~~bash
sudo apt update
sudo apt install -y git ffmpeg python3 python3-venv espeak-ng
git clone --branch feature/production-acceptance-v0.3 https://github.com/SaridakisStamatisChristos/ClaudeExplainatory.git
cd ClaudeExplainatory
npm install --no-audit --no-fund
bash tools/setup_kokoro_runtime.sh
npm run doctor
~~~

If HyperFrames needs a rendering browser, install it once:

~~~bash
npx hyperframes browser ensure
npx hyperframes tts --list
~~~

**No separate Kokoro application or duplicate speech stack.** HyperFrames invokes `kokoro-onnx` from the project `.venv`, installed once using the setup script; the CLI still owns speech synthesis, and Whisper remains its local transcription engine.

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

Schema v2 must explicitly set schema_version:2 and mode:editorial_illustrated. Templates: editorial_split, illustration_motion, editorial_text_card, video_card (compatibility name, no fake player), diagram_reveal (animated vector nodes and connections), and kinetic_bars (staggered animated bars and values). The original six v1 scene types are supported for existing scripts.

Legacy illustrated scene media accepts existing local PNG/JPEG/WebP files under assets/, plus optional 2–5-layer parallax. The opt-in `scene_graph` backend also accepts local PNG/JPEG image objects and independently animated procedural characters via AetherMotion. MP4 clip inputs and realistic character rigs are not supported. Fake player chrome is prohibited.

## Tests

~~~bash
npm test
npm run test:integration
npm run test:hyperframes
npm run test:editorial
npm run test:draft
~~~

Unit tests mock speech/transcription and verify schema, strict word alignment, and audio cache. The FFmpeg integration test uses a mock HyperFrames CLI that emits synthetic tones. Video smoke tests use the real HyperFrames renderer with synthetic audio/timing. **Passing synthetic tests alone does NOT prove actual Kokoro + Whisper production.** Genuine Kokoro/Whisper acceptance and a four-scene narrated MP4 were independently machine-verified on 13 November 2026 (see checkpoint below). A fully disconnected render and human listening/visual sign-off remain outstanding.

## Documentation

- [Native HyperFrames speech integration](docs/HYPERFRAMES_VOICE.md)
- [Full-canvas artistic direction](docs/EDITORIAL_FULL_CANVAS_V0_2.md)
- [Editor JSON specification](docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Claude Chat script prompt](prompts/CLAUDE_EDITORIAL_REEL_MASTER.md)
- [Migration from ClaudeCreate](docs/MIGRATION_FROM_CLAUDECREATE.md)

ClaudeCreate is unaffected.

## Genuine model acceptance (not a mock)

The deterministic CI suite uses simulated audio and is separate from real speech acceptance. With Node 22+, `ffmpeg`, `ffprobe`, `espeak-ng`, and `npm install` completed, and `bash tools/setup_kokoro_runtime.sh` run once, execute:

~~~bash
npm run test:real-audio
npm run explain -- check examples/real_model_acceptance.json --target 15
npm run explain -- render examples/real_model_acceptance.json --draft --target 15
node tools/real_video_verify.mjs
~~~

The audio smoke test produces a short real Kokoro `af_heart` WAV, forces local Whisper `small` transcription, checks word alignment, measured duration, non-silent signal and verified warm cache. A local result is saved to `out/real-model-smoke/`. The video command creates a **maximum 10-second** real-model draft, with portrait and landscape MP4s under `out/what-a-river-connects-draft/`; the verifier checks actual streams, codecs, dimensions and duration.

A separate GitHub Actions job attempts genuine audio and video acceptance on pushes to the production-acceptance branch. Model downloads or native dependencies may prevent execution on CI; such a result is **NOT PASSED**, even if the independent baseline CI job succeeds. Inspect the job logs, `CI_STATUS.txt`, audio evidence, and the `real-model-acceptance` artifact. A machine pass is not equivalent to human listening, visual sign-off, or verified offline rendering. Do not interpret a synthetic test tone as speech.

## Deterministic procedural diagrams

The `diagram_reveal` editorial-v2 scene adds fully local vector animation driven by JSON instead of new animation code for each video. Nodes use unique identifiers, short labels, and normalized x/y coordinates from 0 to 1; links reference pairs of existing nodes. Motion reveals the nodes and draws connections over the spoken scene duration. The validator rejects malformed coordinates, duplicate IDs, missing endpoints and unexpected properties.

Run `npm run explain -- check examples/diagram_reveal.example.json --target 15` to validate the included example, and `npm run test:diagram` for a real 2-second HyperFrames animated-diagram video with determinism and visible-change checks (synthetic word timing; this does **not** constitute TTS acceptance). Actual illustrated character articulation is not yet implemented.

## JSON-controlled kinetic charts

`kinetic_bars` adds a genuinely animated, full-canvas chart, driven entirely by JSON. Bar lengths and numerical counters move on independent staggered GSAP tracks; a subtle light gradient crosses the entire illustration. Choose `tone` (`midnight` or `parchment`), `unit` (`percent` or `score`), `heading`, optional `kicker` and `note`, and 2–5 `bars` with a short `label` and an integer `value` in [0, 100]. The strict validator rejects invalid ranges, duplicate labels, unsupported tones and unexpected fields. Label fabricated example numbers as illustrative.

Use `npm run explain -- check examples/kinetic_bars.example.json --target 15`, then `npm run test:bars` to generate and check an actual 2-second 540x960 HyperFrames MP4 (synthetic timing, not TTS). The real Kokoro + Whisper acceptance example now includes four distinct scenes: original river illustration, animated vector diagram, moving data chart and final editorial title.

### Latest verified video checkpoint — 13 November 2026

At source commit `648e4e2918960b2d4450b52542c05791c88d042f` the [validation run](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43428630212) passed the entire baseline static, 47-unit-test and short-render suite, including a **real HyperFrames two-second kinetic chart MP4** and frame-determinism checks. The [four-scene narrated run](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43428527901) separately passed the Kokoro/Whisper and narrated video acceptance steps; it exported **8.152-second** H.264+AAC 48-kHz portrait (540×960) and landscape (960×540) videos. Its source differs from the current commit only in the later correction of an obsolete template-count test. The [narrated artifact](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43428527901/artifacts/14038494562) and [kinetic chart artifact](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43428630212/artifacts/14038770274) are temporary (retention seven days). Machine pass does not establish human speech-intelligibility, animation polish or fully disconnected operation.

## Reusable scene graph powered by AetherMotion (opt-in)

This is **not a new drawing engine**. The `scene_graph` template compiles a rigorously validated script into [AetherMotion](https://github.com/SaridakisStamatisChristos/AetherMotion)'s existing frame-indexed Canvas2D engine. It supports independent rectangles, circles, SVG-like stroked paths, text, imported local PNG/JPEG artwork, and a lightweight rigged cartoon actor with walking, gestures, expression and mouth movement. Every object can have its own position, scale, rotation and opacity keyframes; paths may progressively reveal; cameras can move and zoom. The built-in example depicts buildings emerging and two people walking across a growing town, **not just chart or diagram reveals**.

The source JSON uses **540×960 portrait authoring coordinates**. Animated properties may be fixed numbers or a `[{ "t": 0, "value": ... }, { "t": 1, "value": ..., "ease": "smooth" }]` sequence. A value of `t=1` means the last frame of that individual scene, so speech duration changes do not demand manual retiming. Supported easing: linear, smooth, hold. Each scene is assigned actual frame count from validated HyperFrames/Kokoro narration; the compiled film can be rendered deterministically at any integer frame index. The backend's actor is a basic procedural cartoon, **not** AI-generated photorealistic character performance.

**One-time local renderer setup:** clone AetherMotion into a sibling directory, check out the pinned compatible commit, install and build:

```bash
cd ..
git clone https://github.com/SaridakisStamatisChristos/AetherMotion.git
cd AetherMotion
git checkout 1805f161ff9a0904306a0864ff0938f75cd70aad
npm ci
npm run build
cd ../ClaudeExplainatory
export AETHERMOTION_CLI="$(pwd)/../AetherMotion/dist/cli/main.js"
npm run explain -- check examples/scene_graph_village.json --target 15
npm run explain -- preview examples/scene_graph_village.json --draft --target 15
npm run explain -- render examples/scene_graph_village.json --draft --target 15
```

The preview generates stills of the moving objects; render uses the **same local HyperFrames Kokoro and Whisper speech** and delegates only frame-by-frame graphics to AetherMotion, then loudness-normalizes and exports portrait/landscape videos. A standalone offline-asset smoke test uses FFmpeg-generated test tones and tests actual H.264/AAC frame output: `npm run test:scene-graph`. The real-model narration path is distinct.

For safety and clarity, a script using `scene_graph` must presently contain **only** graph scenes; old templates still work unchanged in their original pipeline. Scene graphs currently use `sfx: "none"`; mixing independent template types, richer character rigs, advanced asset creation, music and full-length production have not yet been verified. Use only local assets, not URLs or executable scene content. The engine's imported artwork is never generated automatically by a local renderer; you must supply it or generate it in a separate asset-preparation stage.

### Real-model scene graph acceptance

The `real-model-acceptance` CI job additionally renders the village-to-city example with actual HyperFrames Kokoro speech and Whisper alignment. It calls the pinned AetherMotion CPU renderer for every frame and uses FFmpeg to loudness-normalize, mux and export both sizes. The `scene-graph-acceptance.json` evidence (in the archived outputs) verifies H.264 30-fps portrait, AAC 48-kHz sound, bounded duration and **changing decoded frames**. Audio is genuinely narrated in this job, unlike the separate synthetic-speech geometry test. The 10-second draft limit remains enforced. Word-level transcription timings are checked, while the AetherMotion backend currently displays each phrase as a whole caption rather than karaoke word highlights.

The graph-only runtime deliberately rejects SFX other than `none`; music and template mixing are planned integrations. Imported pictures require actual local PNG/JPEG assets; image generation is not supplied by AetherMotion.

## Optional AI director: Gemini writes actions, not 30 images per second

To generate a **new animated-world JSON script from your own topic**, set a supported Gemini model and an API key. This is strictly opt-in: the local renderer does not require Gemini, and these credentials are not stored in the JSON. The director requests JSON from Gemini with a configured token budget, validates every field locally, and makes at most two bounded repair attempts. An invalid answer is **not rendered**.

```bash
export GEMINI_API_KEY="YOUR_PRIVATE_KEY"
export GEMINI_MODEL="YOUR_AVAILABLE_GEMINI_MODEL"

npm run direct:graph -- "A medieval town grows as travelers arrive" \
    out/town-generated.json --tokens 8192 --retries 1

npm run explain -- check out/town-generated.json --target 15
npm run explain -- render out/town-generated.json --draft --target 15
```

The director supports `--model MODEL`, `--tokens 2048..32768`, and `--retries 0..2`, reports provider token usage when returned, and refuses to overwrite an existing output file. The generated script uses normalized timeline positions (`t=0` to `t=1`) so AetherMotion independently generates **each frame** from the object paths, gestures, building growth, and camera curves. You are charged for model generation according to your provider plan, **not** for per-frame animation. Live Gemini provider access and cost have not been independently tested in CI; CI uses a deterministic fake transport to validate request construction and error handling.

### Demonstrated actual results

- [Pin-verifiable real 147-frame scene graph render](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43431447690/artifacts/14038908011): independent-object animation and deterministic frame extraction with synthetic speech.
- [Genuine narrated 4.01-second scene graph](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43431965655/artifacts/14038983780): real Kokoro/Whisper speech, AetherMotion actor/building movement, 120 frames and H.264/AAC portrait/landscape exports.
- [Complete scene graph authoring reference](docs/SCENE_GRAPH_RUNTIME.md).

**Known limitations:** visuals are currently composed from procedural shapes, stylized actors and user-supplied local images—not arbitrary high-detail AI-generated characters or complex image-to-video motion. Scenes are cut sequentially; polished transitions, character lip-sync and arbitrary mixed legacy templates remain future work. A successful software render does not itself guarantee engaging cinematic aesthetics.

### Hierarchical animation, reusable symbols and scene transitions — verified 13 November 2026

The current script supports **nested** `group` objects, filled `polygon` objects, radial `glow` effects, and a top-level named `scene_symbols` catalog. Define a reusable graphic as an array of local-coordinate drawable parts, then place it as `{"kind":"instance","id":"unique","symbol":"catalog_name","x":250,"y":600,"scale":0.9}`. The compiler expands these instances into isolated native AetherMotion groups, namespaces all child IDs, and preserves transform keyframes for independently moving versions of the same artwork. Symbols can include nested groups and assets but cannot reference other symbols (no recursion).

A global `scene_transition` such as `{"kind":"fade","duration":0.26,"color":"#1C2937"}` connects adjacent scenes through one consistent color without changing video duration or narrator timing. The underlying renderer applies these fades **after the camera**, so the overlay covers the entire portrait even during camera movement. These are fade-through-color transitions, **not** cross-dissolves of two simultaneous scenes.

The village demo at `examples/scene_graph_village.json` uses reusable cottage/tree instances in multiple shots, nested market-stall geometry, changing light, walking actors and a transition. Reproduce it with the AetherMotion setup above, then `npm run explain -- render examples/scene_graph_village.json --draft --target 15`. [Verified CI run 43451954677](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43451954677) passed **60 Node unit tests**, 147-frame synthetic-audio graphics verification, and a separate genuine Kokoro/Whisper **120-frame narrated** video in both sizes. Artifacts: [scene-graph 147-frame test](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43451954677/artifacts/14050622185) and [narrated MP4s](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43451954677/artifacts/14052705364). Both are retained for seven days. This is tested procedural 2D animation, not yet realistic illustration-to-video or studio-grade character acting.

## Articulated puppet animation — new draft prototype

The JSON `scene_graph` object kind `puppet` compiles into AetherMotion's existing nested group renderer. A character has a head, hair, facial features, independently pivoted arms/forearms, independently pivoted legs/knees/boots, tunic, and clothing details. The compiler samples a deterministic gait and wave action into bounded per-frame tracks. The shared renderer still handles the actual frames; no additional video model or image animation API is needed. Supported `outfit`: `villager`, `merchant`, `scholar`; palette: `skin`, `shirt`, `trousers`, `hair`, `shoes`; actions `walk` and `wave` with normalized start/end, cycles, strength, and arm. The `puppet` kind is valid as a normal scene object or a part of a reusable named scene symbol.

Run `npm run explain -- check examples/scene_graph_puppets.json --target 15` then `npm run explain -- render examples/scene_graph_puppets.json --draft --target 15` after the AetherMotion local setup. `npm run test:puppets` checks a real H.264/AAC 147-frame output with two scenes and visible changes using synthetic WAVs; the genuine-model acceptance also synthesizes and verifies the spoken version. Unlike the older primitive `actor`, a puppet is a layered animated 2D character, but it is **not** human-grade animation, face tracking, true lip sync or natural inverse kinematics.

### Next checkpoint: articulated character engine and illustrated depth

The enhanced demo `examples/scene_graph_puppets.json` uses three articulated puppet performers whose body parts are compiled to nested, independently animated shapes. Characters can walk (cyclic hip and knee motion) or wave (shoulder and forearm motion) as the camera moves. Costume options: villager, merchant and scholar. Scenery adds slow-moving cloud groups and layered polygon hills behind the actors; draw order explicitly keeps characters in the foreground. This is local procedural illustration—**not** photorealistic AI video synthesis or measured facial lip-sync.

Run `npm run explain -- check examples/scene_graph_puppets.json --target 15` and `npm run explain -- render examples/scene_graph_puppets.json --draft --target 15`. For reproducible offline rig tests, build the pinned sibling AetherMotion and run `npm run test:puppets`. The test produces a short MP4 and checks individual articulation tracks, unique nested object IDs, audio streams and frame determinism. The real-model CI renders a separate version with Kokoro speech and Whisper alignment. Sample test and speech results should be reviewed in the latest green Actions run before treating them as accepted.

## Editable illustration source pack (first reusable sprite pipeline)

A reproducible **authored art → transparent PNG → independently animated image layers → H.264 video** workflow now complements the basic primitive scene graph. The original artwork lives as editable SVG source files under `assets/artwork/medieval/` with a manifest, license statement, exact dimensions and checksums for generated files. The output is deliberately local and contains **no image-generating model calls**: `rsvg-convert` rasterizes the source once, AetherMotion animates the PNG layers every frame. You can add additional authored art packs later by extending the manifest and builder, without changing the frame painter.

Install the one new system dependency on Linux Mint or Ubuntu:

```bash
sudo apt install -y librsvg2-bin
npm run assets:build
npm run explain -- check examples/illustrated_village.json --target 15
npm run explain -- render examples/illustrated_village.json --draft --target 15
```

The script uses the same **full-frame scene graph**, named cottage/tree/traveler symbols and local PNG sprites with independent limb pivot rotations, movement, cloud drift and fades. Source is preserved, generated PNGs are ignored by Git, and the rasterizer verifies its own output dimensions and digest. The build step is explicit so users can modify a single SVG and regenerate artwork deterministically. Tests: `npm test` (after `assets:build`) and `npm run test:illustrated` with the pinned AetherMotion CLI. This first pack depicts a painterly medieval editorial village; it does **not** yet generate arbitrary new worlds or replace sprite illustration with neural image-to-video.
