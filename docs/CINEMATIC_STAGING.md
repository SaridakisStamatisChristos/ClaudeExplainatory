# Cinematic staging and locomotion — source-level design

## Purpose and ownership

ClaudeExplainatory keeps one renderer: pinned AetherMotion paints frames. This release adds *pre-render authoring compilation* for consistent 2.5D camera staging and reusable, physically more plausible travel-driven sprite gait. No new per-frame renderer, model dependency or remote asset loader is introduced. Work remains on the feature branch; old v1/v2 templates stay untouched.

## Depth and parallax

Any **top-level** scene graph drawable, including an image, text, `puppet`, `instance` or `group`, may set `depth` from 0 through 1.8 (default implicit value 1). Depth denotes response to camera translation, not scale or z-sorting. The canonical world-to-screen camera transform in AetherMotion is `screenX=(worldX-cameraX)*zoom`. To make authored layer depth `d` respond proportionally, ClaudeExplainatory emits `worldX'=worldX+(1-d)*cameraX` (and the same for Y), so final `screenX=(worldX-d*cameraX)*zoom`. Parent and nested child transforms remain with AetherMotion.

Conventions: 0 is a screen-locked sky or static typography; ~0.28 distant landscape; ~0.72 buildings; 1.0 normal world; ~1.3 foreground people. Source properties are never forwarded as unknown AetherMotion fields. The compiler samples up to 256 bounded integer source frames to combine camera compensation with existing motion tracks; render output still runs at **30 FPS**, not 256 FPS. Long shots with more than 256 source frames interpolate between these keys, which is an approximation and may need higher-precision handling for fast high-frequency effects. Camera zoom remains shared; depth affects translation only. Do not use depth on children of a group or on reusable symbol definitions, because transform nesting would make that ambiguous.

## Layered biped locomotion

Optional `locomotion` is supported **only on `instance`** objects bound to a reusable symbol that contains `rearLeg` and `frontLeg` groups, `rearArm` and `frontArm` groups, `headPivot` group, and `torso` image. Contract: `stepLength` (30–180 symbol units), `legSwing` (4–45°), `armSwing` (0–35°), `bounce` (0–10 symbol px), `lift` (0–16 symbol px); optional normalized start/end [0,1] for a bounded walking interval. All five numeric parameters are required.

The compiler derives a world-X displacement trajectory from authored x-keyframes and any applicable motion behavior. It integrates absolute displacement to form the gait phase (two footfalls per full cycle), adjusts step size using the instance's authored scale and attenuates gait amplitude based on local velocity. Leg swing is opposite between front and rear legs; arm swing counterbalances; foot groups lift during swing; head and torso receive small vertical motion. A stationary actor gets zero swing and a character that stops moving stops its gait. The original reusable asset stays immutable, so the same symbol can animate at different speeds.

This is **stylized layered sprite animation**, not verified biomechanical gait or planted-foot inverse kinematics; rapid direction reversals and camera zoom can still produce visual sliding. Lip sync, automatic shadow projection for arbitrary characters and physics-based fabric motion are not implemented.

## Assets and visual coherence

The original vector source `assets/artwork/medieval/contact-shadow.svg` produces a locally rasterized transparent `contact-shadow.png` in the reproducible 12-asset `assets:build` process. The common `traveler` source symbol contains that shadow as a back-most layer beneath the sprites. The shadow receives the same position/scale as its character and is not an independent scene object. Scene backgrounds and character sprites remain original vector masters in GitHub.

## Acceptance

`tests/cinematic_staging.test.mjs` checks camera cancellation at depth zero, relative hill movement, foreground depth exaggeration, output bounds, immutability, displacement-driven swinging, stationary poses, stopping, backwards movement, strict validator failures, and shadow asset staging. Existing `npm run test:illustrated` exercises actual AetherMotion native H.264/AAC output and deterministic decoded frame changes with two shots. Genuine Kokoro/Whisper voice is a separate CI job and should not be conflated with synthetic-tone animation tests.

CI must be green on the exact head commit before considering these source changes verified. Artistic quality is still a subjective human review; automated pixel differences do not establish high-end animation aesthetics.

## Next measurable steps

- Optimize long-shot (>256 frame) combined camera and motion curves without sacrificing hold discontinuities.
- Measure at least two feet's screen-space slide distance across contacts before claiming foot planting.
- Review foreground and background visual quality on three nonadjacent decoded frames and compare against the previous asset pack.
- Permit seamless mixed template / graph shots only after an explicit shared render composition interface.
