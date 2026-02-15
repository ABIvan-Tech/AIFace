# Android Display App - implementation (v1)

## What is already implemented

- `mobile/androidApp` launches an Android app with a Jetpack Compose screen and an internal WebSocket server on `ws://<phone-ip>:8765`.
- `NsdManager` advertises `_ai-face._tcp` with TXT entries `schema=ai-face.v1` and `transport=ws` so the MCP server can discover the display.
- Incoming scenes and mutation batches are parsed with `kotlinx.serialization` models defined in `mobile/shared/src/commonMain` and stored in memory.
- The Compose Canvas draws circles, ellipses, rectangles, lines, and triangles (no raster textures) and tween-animates numeric fields when `set_scene` or `apply_mutations` arrive.

## Network stack

- The WebSocket server runs inside `androidApp` (currently a custom implementation, could use Ktor). It accepts JSON envelopes whose `schema` is `ai-face.v1`.
- Supported `type`s are `hello`, `set_scene`, `apply_mutations`, and `reset`; unknown types or malformed JSON are ignored and do not crash the app.
- `apply_mutations` applies each operation sequentially by replacing the shape that matches the `id`.

## Rendering details

- World coordinates `[-100, 100]` are mapped to pixels via `scale = min(width, height) / 220` with the center at the View’s origin.
- Primitives are drawn in the order defined by the `scene` array to preserve layering.
- Animation uses clocked tweens for smooth interpolation of `transform`, `props`, and `style` fields as updates arrive.

## Project structure

- `androidApp/` — entry point with Compose UI, the WebSocket server, NSD advertiser, and status instrumentation.
- `shared/` — Kotlin Multiplatform module with Scene/Shape/Mutation models, the `applyMutations` reducer, renderer helpers, and animation math.
 - `iosApp/` — iOS host that runs the shared Compose UI and advertises via `NSNetService`. The iOS receive path is implemented and applies incoming `set_scene` / `apply_mutations` messages; outbound ACK/send from iOS is temporarily disabled pending a Swift-native bridge.

## Constraints

- The app runs **only in the foreground**; background services (wakelocks, background mDNS) are not implemented.
- There is no pairing or authentication; the app assumes a trusted LAN and an open WebSocket.
- Scene validation is handled entirely on the MCP server/agent side; the Android client only renders whatever it receives.
