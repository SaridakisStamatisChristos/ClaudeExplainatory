# ClaudeExplainatory — repository engineering rules

Standalone, local-first illustrated explanatory videos. The artwork **is the video**, never a fake player inside a video.

- Keep v2 JSON explicit and strict; old v1 script compatibility is deliberate.
- Use only local asset roots, escape all script text; no remote production asset services or paid render APIs.
- Real Kokoro timestamps are required for production, never manufacture them silently.
- Test renders only <=10 seconds at 540×960 without additional approval.
- Leave real moving characters and local MP4 input unsupported until implemented/verified independently.
- Preserve original fixture art, credits, CI and regression tests.
- Do not write editorial code into ClaudeCreate; this repository is now the canonical development home.
