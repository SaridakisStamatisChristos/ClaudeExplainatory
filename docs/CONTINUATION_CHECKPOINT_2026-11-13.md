# ClaudeExplainatory — Recovered Handoff & Production Continuation

**Reconstructed:** 2026-11-13  
**Canonical repository:** https://github.com/SaridakisStamatisChristos/ClaudeExplainatory  
**Development branch:** `feature/production-acceptance-v0.3`  
**Parent verified `main` commit:** `e6a593a2a12de128b94b95f6f9faa8447c9390a6`  
**Latest verified green workflow:** https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43389985663

## 1. Recovered owner requirements and boundaries

These are carried forward from the owner’s previous ClaudeCreate/ClaudeExplainatory work on 13 Nov 2026 and from the current repository rules:

1. **ClaudeExplainatory is independent of ClaudeCreate.** The editorial illustrated implementation was migrated out of ClaudeCreate. Do not move it back into ClaudeCreate or modify ClaudeCreate during this campaign.
2. **The visual is the entire video.** The reference screenshot represented the finished full-screen frame, not a media player within another frame. No fake playback chrome, inset player, status bar, video border or template wrapper. Use edge-to-edge illustration with integrated typography and safe caption regions.
3. **One unified audio/rendering stack:** HyperFrames provides local Kokoro TTS, local Whisper transcription/word timing and GSAP/video rendering; FFmpeg handles audio and exports. Do not reintroduce a second Python Kokoro or faster-whisper stack, pip requirements, or paid model APIs.
4. **JSON-driven production:** scripts should select scene templates, local media, voice, text, timing and motion. Maintain the strict explicit v2 envelope `schema_version: 2` + `mode: editorial_illustrated`; preserve all six legacy v1 templates and validation behavior.
5. **Production claims require real measurements.** Synthetic voice/timing tests do not prove real Kokoro/Whisper narration. Each claim must cite executed commands, logs, artifacts and inspected outputs.
6. **Local-first and reproducible:** do not use remote assets or paid video-render services. Reject unsafe media paths and unescaped script text. Preserve the original fixture art, licenses/credits and tests.
7. **Branch isolation:** do not alter or merge `main` without explicit authorization. Work on this dedicated feature branch.
8. **Render safety:** do not produce full-length or >10-second draft renders at 540×960 without the owner’s approval. Short acceptance clips are authorized by the inherited project tests.
9. **No premature dependency integration:** AetherMotion and AetherPaper remain separate. Integration is deferred until those projects have mature verified capabilities and contracts.

## 2. Repository reality as inspected on 13 Nov 2026

- The repository contains `bin/reel.mjs`, `src/spec.mjs`, `src/composition.mjs`, `src/editorial/{assets,layout}.mjs`, and `src/audio/hyperframes.mjs`.
- Four editorial scene templates exist: `editorial_split`, `illustration_motion`, `editorial_text_card`, `video_card` (compatibility name; **not** a fake player).
- Legacy six scene types remain supported.
- Original images are in `assets/editorial/`; JSON fixtures are in `examples/`.
- The native audio adapter writes a text file, calls HyperFrames `tts`, calls HyperFrames `transcribe` with Whisper and checks word alignment before caching.
- The final commit `e6a593a` verifies the installed HyperFrames TTS/transcription CLI help commands in CI. It **does not** prove that real Kokoro weights and Whisper ASR models completed a narrated render.
- `npm test`, integration, short HyperFrames editorial smoke tests and draft export are covered by GitHub Actions. The last green workflow is linked above.
- Real artifact `editorial-short-mp4` from run `43389985663`: contains 8.4s 540×960 portrait and 960×540 landscape MP4 files with synthetic test-tone audio, NOT narration. Also six stills in the workflow artifacts. The CI artifact expiry is **2026-11-20**, because `retention-days: 7`.
- Full-canvas output was inspected from the six saved stills. The visual is edge-to-edge with headlines/caption-like text. The sample reuses one landscape and illustrates bounded pan/zoom/parallax; it is **not** character animation or a quality-approved finished reel.
- The current repository has no committed production MP4 or GitHub Release video; media is under Actions artifacts.
- Not yet verified: genuine local Kokoro speech with Whisper word-level alignment and complete FFmpeg output; fully disconnected local production; real 15/30/60-second finished reels; richer animated characters/gestures/expressions; local source MP4 seeking.

## 3. Mandatory takeover sequence

Follow **Inspect → Implement → Execute → Verify → Repair → Commit**, preserving checkpoints and evidence.

### Phase A — Real model/audio acceptance (highest priority)

1. Inspect current CLI contract (especially installed HyperFrames version), model availability, caching paths and the exact JSON shape written by `hyperframes transcribe`. Do not infer real-model compatibility solely from `--help` or mocks.
2. Run a genuine **short** Kokoro `af_heart` speech sample from the actual CLI with model weights installed; verify generated WAV with FFprobe and, where feasible, listen/inspect intelligibility.
3. Transcribe it using local HyperFrames Whisper. Compare actual transcript format and timestamps against `src/audio/hyperframes.mjs`; repair only confirmed incompatibilities. Do **not** fabricate missing words or timestamps, and never mark a mock as a real-model pass.
4. Execute `npm run explain -- check examples/editorial_v2.example.json --target 15` and a controlled short real-model `preview`/`render` (clip <=10 seconds, draft 540×960). These commands require the models and browser locally. An inaccessible model runtime must be documented as BLOCKED, not passed.
5. Verify voice audibility, synchronized captions, FFprobe streams/duration, scene boundaries, loudness measurements and all produced outputs. Keep measured evidence in docs.
6. Add a clearly labeled optional real-model integration smoke test so CI can continue to run without downloading huge weights; retain deterministic unit and mock tests as separate gates.
7. Verify an offline/disconnected second pass **after** required assets and weights are cached. Document precise environment and what was disconnected.

### Phase B — Visual review and scene quality

1. Review six or more real timestamp stills, covering all four editorial scenes, portrait frame margins and headline/caption overlap, no fake player chrome, no exposed image edges.
2. Fix content legibility issues and transition seams; measure frame-time determinism and visual change.
3. Test longer script parsing and target-duration warnings without triggering unauthorized full-length render.
4. Improve scene variety while keeping full-screen illustrations and local assets. Distinguish camera motion of one still from genuine independent object/character animation.
5. After objective review, expand motion vocabulary, clip-to-clip transition types and multi-layer illustration composition behind explicit JSON schema changes. No silent breaking v1/v2 changes.

### Phase C — Independent animation capabilities (later, separately accepted)

Develop reusable object and character transforms/pose/timeline as a native feature only if independently verified. AetherMotion/AetherPaper integration remains deferred. Do not claim walking, speaking or physical object interaction until visible in real rendered video and tested.

### Phase D — Production readiness and durability

1. Run `npm test`, `npm run test:integration`, `npm run test:hyperframes`, `npm run test:editorial`, and `npm run test:draft`; record environment, exit codes, logs and artifact links.
2. Complete Linux Mint/Ubuntu fresh-install verification. README currently documents Node 22+, FFmpeg, Python3 (standard library only), espeak-ng, npm install and HyperFrames browser/model preparation.
3. Ensure permanent, rights-cleared acceptance artifacts can be retained without relying on seven-day Actions artifact storage. Do not commit heavyweight intermediate renders without need; consider a small reviewed reference clip on an explicit release or durable documented location.
4. Refresh stale migration-era docs. `docs/EDITORIAL_V0_2_ACCEPTANCE.md`, `docs/EDITORIAL_ILLUSTRATED_V0_2_SPEC.md` and `prompts/CLAUDE_EDITORIAL_REEL_MASTER.md` include historical ClaudeCreate feature-branch, inset-player or command wording: preserve context but clearly supersede inaccurate current instructions. The canonical CLI is `npm run explain -- ...`, while `npm run reel -- ...` is a compatible alias.
5. Mark every acceptance item **PASS (measured), FAIL (observed), BLOCKED (prerequisite missing), or NOT RUN**. No conflation of synthetic-audio tests with finished narrated production.
6. Commit each verified milestone on this feature branch and avoid changing `main` or other projects.

## 4. Baseline commands and references

```bash
git checkout feature/production-acceptance-v0.3
npm install --no-audit --no-fund
npm run doctor
npm test
npm run test:integration
npm run test:hyperframes
npm run test:editorial
npm run test:draft
npm run explain -- check examples/editorial_v2.example.json --target 15
# Genuine Kokoro/Whisper steps only after local models are ready:
npm run explain -- voice-sample
npm run explain -- preview examples/editorial_v2.example.json --draft --target 15
npm run explain -- render examples/editorial_v2.example.json --draft --target 15
```

**Caution:** A full example has multiple scenes; `--draft` is capped to 10s by the code, and speech for scenes beyond the cap may still be synthesized during preparation if the runtime is changed. Guard against unauthorized full-length rendering and distinguish capped test clips from finished reels.

Primary references:
- [README](../README.md)
- [Architecture](ARCHITECTURE.md)
- [Native HyperFrames speech](HYPERFRAMES_VOICE.md)
- [Full-canvas correction](EDITORIAL_FULL_CANVAS_V0_2.md)
- [Acceptance matrix (historical)](EDITORIAL_V0_2_ACCEPTANCE.md)
- [Current master script prompt](../prompts/CLAUDE_EDITORIAL_REEL_MASTER.md)
- [Migration notes](MIGRATION_FROM_CLAUDECREATE.md)
- [Main branch at baseline](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/commit/e6a593a2a12de128b94b95f6f9faa8447c9390a6)

## 5. First action for the next work session

**Do not rebuild the application.** Read this file, inspect `src/audio/hyperframes.mjs` and `bin/reel.mjs`, execute the current tests, then prove or falsify genuine HyperFrames Kokoro + Whisper round-trip on a <=10s draft. Repair demonstrated defects with regression tests, commit evidence to the feature branch, and report exact run results. If real weights or browser cannot be used in the execution environment, mark that gate BLOCKED and continue with independently testable improvements without claiming production completion.
