# Android Display App - Kotlin Multiplatform architecture

The project is structured as Kotlin Multiplatform so the same domain logic can be shared between Android and (potentially) iOS.

## Modules

- `shared` — `commonMain` holds the DSL models (`SceneDocument`, `Shape`, `Transform`, `Style`, `Mutation`), `applyMutations`, and renderer/math helpers. `androidMain` extends the common model with WebSocket + NSD logic.
- `androidApp` — Compose UI, WebSocket server, status bar, and Canvas renderer. Includes platform-specific adapters for the shared module.
 - `iosApp` — iOS host that runs the shared Compose UI. It advertises via `NSNetService` and the receive path for `set_scene` / `apply_mutations` is implemented. Outbound WebSocket send/ACK operations are currently routed to a disabled path in Kotlin/Native due to interop instability; a Swift bridge is planned.

## Layers

1. **Domain** — immutable models and the `applyMutations` reducer; no platform APIs.
2. **Data / Transport** — platform implementations that parse JSON and dispatch events to the domain layer (WebSocket server, NSD advertising).
3. **UI** — `Compose` (Android) or `SwiftUI` (iOS) listens to a state flow and renders Canvas primitives.

## Message flow

1. The WebSocket server accepts envelopes with `schema = ai-face.v1` and deserializes `set_scene`, `apply_mutations`, and `reset` using `kotlinx.serialization`.
2. `set_scene` replaces the entire scene and triggers a UI animation.
3. `apply_mutations` applies `update/add/remove` operations to the scene cache and refreshes the canvas.
4. `reset` clears the scene and renders a neutral placeholder until the next update.

## Settings and dependencies

- JSON serialization: handled by `kotlinx.serialization` in the shared module.
- Networking: the Android WebSocket server is implemented in `androidApp` (custom Ktor or standard `ServerSocket`).
- Dependency injection/status objects: wired manually; no DI framework is currently used.

## Testing

- The `shared` module includes unit tests for `applyMutations`.
- Manual verification flow: run `androidApp` from Android Studio and send JSON payloads from a desktop script.
