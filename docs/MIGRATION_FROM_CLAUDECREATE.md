# Separation from ClaudeCreate

**Date:** 2026-11-13.

ClaudeExplainatory is the standalone destination for the full-canvas editorial explainer system developed on ClaudeCreate's `feature/editorial-illustrated-v0.2` branch.

Transferred: original procedural landscape and transparent foreground, JSON v2 validator, four editorial scene types, local secure asset resolver, HyperFrames/GSAP composition, Kokoro TTS and timed captions, FFmpeg exports, CLI, examples, CI and regression tests. The reusable six classic templates remain supported by the migrated code as optional compatibility.

**Reason:** The owner wanted the illustrated content to become the whole video—not a fake framed player within another reel—and subsequently requested this capability live in its own repository.

**Boundaries:** This new repo runs independently and needs no code from ClaudeCreate at runtime. ClaudeCreate main remains the original six-template general-purpose reel maker. Its former experimental editorial branch is being cleaned to match the main source tree, not merged into main.

**Verification:** Short HyperFrames and synthetic-audio exports may pass CI. Actual Kokoro end-to-end, offline-disconnected production and artist signoff remain separately unverified. MP4 source seeking is not enabled. No >10-second draft renders without approval.

Original development checkpoint: https://github.com/SaridakisStamatisChristos/ClaudeCreate/commit/3715435bb9b26cfc64e933e1f564571bfdae2ce7
