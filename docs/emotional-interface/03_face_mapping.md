# Face mapping — moods → Scene DSL

The agent maps `FaceState` (mood + intensity + micro offsets) to Scene DSL primitives using helper functions inside `mcp/src/ai/agent.ts`.

## Required shape IDs

Each generated scene includes:

- `background` (rect 200×200)
- `face_base` (circle radius 90)
- `left_brow`, `right_brow` (`line`)
- `left_eye`, `right_eye` (`circle`/`ellipse`)
- `mouth` (`line` or `arc`)

These IDs remain constant so mutation batches can find them easily.

## Helper functions

- `makeBrowShape(mood, intensity, breath, rotationScale)`: positions/bends brows using `getBrowProps` and `getMoodRotation`.
- `makeEye(mood, intensity, blink)`: sets eye radius via `getEyeRadiusPx` and applies blink offsets.
- `makeMouthShape(mood, intensity)`: returns either a line or arc with curvature determined by `getMouthProps` and `lerpRecord`.

Intensity blends between neutral and mood-specific parameters:

```ts
final = neutralRecord + (moodRecord - neutralRecord) * intensity
```

This prevents exaggerated expressions.

## Micro offsets

- **Breath** adds a sin-based y-offset to brows/eyes/mouth (amplitude ≈ 2.5).
- **Blink** temporarily shrinks eye radius for ~140 ms when the `blinkUntilTs` timer is active.
- **Jitter** uses subtle rotation tweaks for `angry`/`nervous` states.

## Enforcement

- All transform/prop values are clamped to the [-100, 100] canvas to avoid render glitches.
- Negative intensities or NaNs are prevented by `clamp01` and `lerp` helpers.
- The scene generator ensures `face_base` renders first and is never removed.
