# ClaudeExplainatory scene-graph runtime — first integrated release

## Why this exists

Before this integration, each new style needed a new template (`kinetic_bars`, `diagram_reveal`, etc.). Those remain supported. The new `scene_graph` backend delegates all **general object painting and integer-frame interpolation** to the independent AetherMotion repository rather than copying its painter. This integration owns only the interpretation of ClaudeExplainatory's editorial-v2 script format, asset preflights, narration-to-frame timing, speech synthesis/transcription, publishing and acceptance tests.

AetherMotion source pinned: `1805f161ff9a0904306a0864ff0938f75cd70aad` (MIT license), loaded externally through `AETHERMOTION_CLI`. No source vendoring, submodules or modifications to that other repository.

## Source script contract

Each `scene_graph` production currently uses `schema_version:2`, `mode:"editorial_illustrated"`, and graph-only scenes. The standard narration fields `say`, `highlight`, `illustrative`, `sfx:"none"` and `props` remain required. A scene's props contains:

- `background`: a solid `#RRGGBB` base.
- `style`: optional AetherMotion `cartoon`, `whiteboard`, `infographic`, optional accent/ink/penWidth.
- `camera`: optional x/y and zoom tracks, relative to AetherMotion's top-left origin.
- `objects`: 1–80 ordered drawables, independent IDs and independent motion tracks.

Supported drawables at this checkpoint: `rect`, `circle`, `path`, `text`, `image` (preexisting local PNG/JPEG only), and AetherMotion's basic `actor` (parameters for skin/shirt/trousers/hair/shoes, phase/stride/gesture/mouth/expression). These are representational primitives, not generative AI assets.

Each animatable property is either a finite number or strictly increasing normalized keys:

```json
"x": [
  { "t": 0, "value": 60, "ease": "smooth" },
  { "t": 1, "value": 340 }
]
```

`t` is **relative within one scene**, not an absolute timestamp. The adapter converts it to AetherMotion integer frames `round(t * (frames - 1))` based on measured speech duration at 30 FPS. Duplicate keys after rounding fail before render. Supported easing: `linear`, `smooth`, `hold`. The adapter scales native 540×960 geometry to 1080×1920 for nondraft portrait delivery; the current release's verified output is draft only.

### Animation example: one walking figure

```json
{
  "id": "builder",
  "kind": "actor",
  "x": [{"t": 0, "value": 42}, {"t": 1, "value": 355}],
  "y": 730,
  "height": 114,
  "skin": "#E5AD8C",
  "shirt": "#EAB66E",
  "trousers": "#425B79",
  "hair": "#3A2830",
  "shoes": "#292F39",
  "expression": "happy",
  "phase": [{"t": 0, "value": 0}, {"t": 1, "value": 5}],
  "stride": 15,
  "gesture": [{"t": 0, "value": 0}, {"t": 1, "value": 1}]
}
```

Those tracks change how an already modeled primitive actor behaves *at each frame*. They do not synthesize a realistic walk video from a single portrait.

## Executable production stages

1. The CLI checks the source with `src/spec.mjs` and `src/motion/contract.mjs`.
2. HyperFrames performs local Kokoro speech synthesis and Whisper word-level recognition. No ASR timestamp is fabricated.
3. `src/motion/bridge.mjs` calculates 30-fps integer scene lengths and converts normalized object/camera tracks into AetherMotion film v0.1. It stages safe local assets and WAVs in the working directory.
4. The external AetherMotion CLI independently validates, renders and verifies the native scene graph. The painter evaluates scene-local frame numbers, so buildings, roads, people, and the camera can move together or separately.
5. The original FFmpeg path extracts the completed audio track, normalizes it, exports portrait and landscape H.264/AAC with original caption/credits files.

The `tools/scene_graph_smoke.mjs` acceptance performs 147 actual AetherMotion frames with synthetic tones (no Kokoro). The real-model job separately verifies native Kokoro + Whisper over a 120-frame movie with captions.

## Model-assisted production

The optional `src/motion/director.mjs` calls Gemini only when explicitly launched, with a model/token cap and bounded retries. Its response is an **untrusted storyboard candidate** until parsed and validated by the existing scene contract. No network operation happens while a scene is rendered. Output scripts can be kept, edited, reviewed and reproduced without the director. The tests simulate Gemini but do not guarantee that a specific Gemini model will generate attractive or valid plans every time.

## Next structural milestones

- A unified timeline that mixes old editorial template shots and new AetherMotion scene-graph shots without double rendering or awkward jump cuts.
- User-authored shot transitions, camera depth, richer 2D actor/sprite rigs and articulated objects rather than simple stick-figure primitives.
- A reusable asset ingestion/creation pipeline for nonprocedural settings and characters, with rights/provenance validation.
- A verified full-duration 15/30/60-second release and truly disconnected Linux Mint fresh installation.
- Actual listening and human visual-quality acceptance, plus performance/cost measurements on the owner's equipment.

These are explicitly **not** claimed as completed by the current short drafts.
