# Android Display App - implementation roadmap (status)

This document records the current stages of the Android display implementation. All listed modules already exist under `mobile/androidApp` and `mobile/shared`.

## Completed stages

1. **Scaffolding & Compose screen** — `androidApp` builds, shows connection status, and renders the camera Canvas.
2. **DSL models** — `shared` defines `SceneDocument`, `Shape`, `Mutation`, `Transform`, `Style`, `Props`, and kotlinx.serialization adapters.
3. **Mutation reducer** — pure `applyMutations(scene, mutations)` updates a `Map<String, Shape>` without side effects.
4. **WebSocket server** — listens on port 8765, parses the JSON envelope, and routes `hello`, `set_scene`, `apply_mutations`, and `reset` commands.
5. **NSD/mDNS advertising** — `NsdManager` publishes `_ai-face._tcp` with TXT entries `schema=ai-face.v1` and `transport=ws`.
6. **Rendering & animation** — Compose Canvas draws circles/rectangles/lines/triangles and interpolates `transform`, `props`, and `style` changes.
7. **Monitoring** — the UI already shows `Advertising`, `Connected`, and `Last message` status indicators.

## Next steps

 - iOS stack (`mobile/iosApp`) status: receive path and mDNS advertising are implemented. Next step: implement a safe outbound send/ACK path on iOS via a small Swift-native bridge to avoid Kotlin/Native interop issues.
- Add transport-layer error logging if required for deeper debugging.
- Decisions for advanced features (ack/seq, pairing, background execution) are still pending.
