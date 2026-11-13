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

## New reusable art and transitions (latest feature-branch update)

AetherMotion commit `1805f161ff9a0904306a0864ff0938f75cd70aad` (already independently CI-tested) adds native nested groups, polygons, glows and frame-safe fade overlays. ClaudeExplainatory now pins that immutable revision, validates the richer primitives, and passes them through rather than forking a renderer.

Any scene object can be a native `group` with a `children` array and its own x/y/scale/rotation/opacity keyframes. Child coordinates are relative to the group's origin and children can themselves be groups; each part may have different tracks. This allows an articulated puppet, multi-part building or market stall to move as a whole while its parts change independently.

For reuse between scenes without duplicating a tree or building definition, add a top-level `scene_symbols` object. Every key names an array of local-coordinate drawables. Reference it via a simple scene instance:

```json
{
  "scene_symbols": {
    "lantern": [
      {"kind":"rect","id":"stand","x":-3,"y":-55,"width":6,"height":56,"color":"#755A42"},
      {"kind":"glow","id":"light","x":0,"y":-65,"radius":34,"color":"#F4BF75","opacity":0.7}
    ]
  },
  "scenes": [
    {
      "template": "scene_graph",
      "props": {
        "background":"#1D3040",
        "objects":[
          {"kind":"instance","id":"lantern1","symbol":"lantern","x":130,"y":680},
          {"kind":"instance","id":"lantern2","symbol":"lantern","x":[{"t":0,"value":350},{"t":1,"value":390}],"y":680}
        ]
      }
    }
  ]
}
```

The snippet shows only the symbol and scene-object structure, not a standalone complete script (which also needs narration, metadata, etc.). The contract limits catalog size, nested depth and expanded object count. It rejects unknown symbol names, recursive symbol references, duplicate internal IDs, unsafe asset locations and invalid tracks. The adapter expands every instance into AetherMotion `group` objects, generating stable namespaced IDs for all nested children. Root instance transforms can be animated separately; objects can share a symbol yet occupy different positions and scales.

For scene changes, add to a multi-shot `scene_graph` script:

```json
"scene_transition": {"kind":"fade","duration":0.26,"color":"#1C2937"}
```

This uses native camera-independent fade overlays. Between adjacent scenes, the outgoing shot becomes fully covered by the color and the incoming shot emerges through the **same** color. Total film frame count, speech starts and audio coverage are unchanged. Durations outside 0.10–0.80 seconds or too long relative to an individual narration shot are rejected.

Verified by [run 43451954677](https://github.com/SaridakisStamatisChristos/ClaudeExplainatory/actions/runs/43451954677): 60/60 unit checks; 147-frame scene graph at 30 FPS with moving groups, actors and asset instances; explicit transition-frame review of frames 58, 63, 68, 69, 74, 80 (full-color handoff at frames 68→69); and genuine local Kokoro/Whisper narrated exports (120 frames, 4.014 seconds, AAC 48 kHz, portrait and landscape). Artwork still consists of authored procedural primitives rather than arbitrary AI-generated animation from a single photograph. More advanced asset generation and character rigs remain open.

## Articulated characters (puppet v0.1)

A puppet is a **declarative compiler primitive**, not a new frame renderer. `src/motion/puppet.mjs` assembles a multi-part character out of nested native AetherMotion groups with separate rotating limbs, head, trunk, forearms, boots, garment polygons and facial details. It compiles action requests into deterministic sampled keyframe tracks bounded by the scene's actual frame count; the AetherMotion painter remains the only graphical backend. Its design is stylized editorial cartoons, not anatomically faithful inverse kinematics or accurate speech animation.

```json
{
  "id": "worker", "kind": "puppet", "x": 85, "y": 735, "height": 166,
  "skin": "#E5AD8C", "shirt": "#D9A75E", "trousers": "#425B79",
  "hair": "#3A2830", "shoes": "#292F39",
  "facing": "right", "outfit": "villager", "expression": "happy",
  "walk": {"start": 0, "end": 0.85, "cycles": 3.5, "strength": 0.8},
  "wave": {"start": 0.40, "end": 0.80, "cycles": 2, "arm": "right"}
}
```

The artist supplies basic position/color and action intent. `start/end` use normalized scene progress; `cycles` controls a gait or wave count and `strength` bounds the gait angle. Articulation keys are baked at compilation, retimed to the actual narration length. Every generated part receives a unique deterministic internal ID, even when many puppets share the scene. `height` controls character scale while the ground position remains the root origin. This prototype currently offers three outfits (villager, merchant, scholar) and four mouth/eye expressions, but is not genuine lip sync. The richer test demo intentionally places 2D landscape layers behind the figures; object ordering is painter's-order, not automatic depth estimation.

The complete ongoing rig and narrated example is `examples/scene_graph_puppets.json`. Full validation, deterministic frame generation and local-real-model acceptance run in GitHub CI. Avoid classifying a synthetic-tone test as narrated speech.

## Reusable motion behaviors

The renderer can produce different frames continuously without manually describing all intermediary positions. Any drawable, nested group, instance, procedural puppet, or reusable symbol-part may supply `behaviors` (1–4 entries). The compiler samples source pose plus motion at integer frame indices and emits native AetherMotion timeline keys. No runtime JavaScript expressions, randomness, model calls or per-scene animation programs are executed.

| Kind | Required parameters | Optional parameters | Semantics |
| --- | --- | --- | --- |
| `float` | `axis:"x" or "y"`, `amplitude` (0–120 px), `cycles` (0.25–12) | `phase` (0–1), `start/end` | Add sinusoidal offset along a single axis. |
| `sway` | `degrees` (0–32), `cycles` (0.25–12) | phase, start/end | Add oscillating clockwise rotation. |
| `pulse` | `amount` (0–0.65), `cycles` (0.25–12) | phase, start/end | Multiply the underlying scale by `1 + amount × sin(phase)`. |
| `orbit` | `radiusX/radiusY` (0–250 px, not both zero), cycles (0.25–12) | phase, start/end | Add a bounded 2D elliptical offset to the object's starting pose. |
| `path` | `points` (2–12 local `[dx,dy]` coordinates in ±2000 px) | `start/end`, `ease: "linear" or "smooth"`, `orient:boolean` | Follow the polyline by *distance* rather than by segment index; endpoints hold before and after the interval. |

The start/end window is normalized 0–1 within the spoken shot, with a minimum duration of 0.05. Periodic behaviors fade in/out at the edges of that window (returning to the source pose); path movements persist at their final offset. A `path` may compose with `float` or `sway`, but no object may have more than one `path`. Object position and rotation are additive; pulses multiply scale. Native bounds are enforced after composition. When an object has both authored tracks and behaviors, each frame samples the authored pose first and then applies the modifiers without modifying the source JSON.

**Example: animated flock**

```json
{
  "kind":"group","id":"flock","x":46,"y":440,
  "behaviors":[
    {"kind":"path","points":[[0,0],[85,-24],[180,-5],[284,-46],[390,-14]],"ease":"smooth"},
    {"kind":"float","axis":"y","amplitude":5.5,"cycles":3,"phase":0}
  ],
  "children":[
    {"kind":"path","id":"wing","points":[[-16,2],[0,-5],[16,2]],"stroke":3,"color":"#264656"}
  ]
}
```

For compact scenes of up to 256 frames the compiler evaluates every frame exactly; longer shots use up to 256 deterministic evenly distributed keys per property, subsequently interpolated by AetherMotion. Thus >256-frame behavior curves are an approximation, not a per-frame exact evaluation. Both paths and periodic modifiers are deterministic for a given JSON script and duration. Input path geometry and all behavior keys are strictly validated before rendering. The full `illustrated_village` sample demonstrates behaviors on a group, imported raster artwork, and expanded sprite instances; the short native smoke checks the visibly changing frames and repeated-frame hashes.

The first visual improvements are **stylized procedural motions**. Convincing character acting, complex natural phenomena, physically simulated collisions and photorealistic motion require better rigs, art assets and/or simulation and are not claimed to be solved.
