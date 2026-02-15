# Scene DSL & Validation (ai-face.v1)

This document records the DSL that the agent produces and the runtime guarantees we rely on while dispatching scenes to the display.

## Top-level envelope

Every payload targets the `ai-face.v1` schema and carries a scene composed from a fixed set of shapes.

```json
{
  "schema": "ai-face.v1",
  "scene": [ /* Shape */ ]
}
```

## Coordinate system

- Face center lives at (0, 0).
- X and Y coordinates stay within the range [-100, 100].
- Rotations are degrees applied before translation in the render stack.
- Most shapes are centered around the face but translation helpers keep them inside the canvas.

## Supported primitives

Shape  | Required fields        | Notes
------ | ---------------------- | -----
`circle`| `radius`               | used for pupils, blush dots, and decorative highlights
`ellipse`| `rx`, `ry`             | typically for the eyes and cheeks
`rect` | `width`, `height`       | background or layering masks, usually 200×200
`line` | `x1`, `y1`, `x2`, `y2` | brows, mouth curve segments, or nose bridge
`arc`  | `radius`, `startAngle`, `endAngle` | occasional mouth variations

Every shape carries `transform`, `style`, and `props` and receives a unique `id` so mutations can find it later.

## Required elements

The agent always emits these shapes in every `scene` payload:

- `face_base`: circle radius 90 rendered behind everything else.
- `background`: rect 200×200.
- `left_brow` / `right_brow`, `left_eye` / `right_eye`, and `mouth`.

None of the mandatory IDs are removed at runtime.

## Mutation protocol

1. `set_scene`: replaces the entire mesh of shapes and is used when a new display connects or when the agent pivots into a different primary emotion.
2. `apply_mutations`: patches transforms/styles on existing shapes for micro-movements (blink, micro-breath, brow twitch). The display matches shapes by `id`.
3. `reset`: issued by the MCP server (see `DisplayClient.reset`) to clear the scene before the agent pushes another `set_scene`.

## Constraint checklist enforced by the agent

- Intensity values stay within [0, 1].
- Absolute position helpers clamp X/Y to the [-100, 100] box.
- `face_base` and `background` render order is preserved and never dropped.
- `angry` never exceeds 0.6 intensity; `calm` caps at 0.5; `neutral` is always 0.
- Transform, style, and props are always populated for every shape.

## Validation notes

A standalone validator is not implemented yet— the agent builds scenes by construction. Still, MCP assumes these invariants:

- Every shape ID is unique and still present when mutations arrive.
- Mandatory IDs are part of every `scene` payload.
- Numeric ranges respect the geometry limits.
- Brows/mouth geometry preserves left/right symmetry when required.

These constraints are the baseline for any future server-side validation logic.

## Future signal

If we ever add a schema validator, this document will become the single source of truth for the rules the validator enforces.
