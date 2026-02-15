# AIFace Mobile

A Kotlin Multiplatform project for the AI Face mobile display client.

The `mobile` application acts as a passive face renderer:
- Starts a WebSocket endpoint on the device.
- Advertises itself on the local network via mDNS/DNS-SD.
- Receives `scene` and `mutations` data.
- Draws primitives on Canvas and animates numeric value changes.

## Current Status

Android MVP is ready for launch:
- Foreground-only mode.
- WebSocket server at `ws://<phone-ip>:8765/`.
- mDNS service `_ai-face._tcp`.
- Support for `hello`, `set_scene`, `apply_mutations`, and `reset` messages.
- Rendering for `circle | ellipse | rect | line | triangle`.

iOS status (current):
- Compose UI and scene renderer run on iOS (shared KMP code).
- `NSNetService` advertising is enabled for discovery on iOS.
- The receive path (accepting `set_scene` / `apply_mutations`) is implemented and applies scenes.
- Outbound ACK/send from iOS is temporarily disabled due to Kotlin/Native ↔ Network.framework interop issues; a Swift-native bridge is planned (see `mobile/docs/ios_network_interop_analysis.md`).

## Project Structure

- `androidApp` — Android entry point and runtime (NSD + WebSocket server).
- `shared` — Common KMP code (scene models, transport message parser, mutation reducer, Compose UI/renderer).
- `iosApp` — iOS host project for the shared UI.

## Requirements

- JDK 17+
- Android Studio (latest stable version recommended)
- Xcode (for iOS builds on macOS)

## Quick Start (Android)

1. Open the `mobile` directory in Android Studio.
2. Select the `androidApp` configuration.
3. Run on a physical device or emulator.

Or via terminal:

```bash
cd mobile
./gradlew :androidApp:assembleDebug
```

APK location after build:

```text
mobile/androidApp/build/outputs/apk/debug/androidApp-debug.apk
```

## Verification Commands

```bash
cd mobile
./gradlew :shared:testDebugUnitTest
./gradlew :androidApp:assembleDebug
./gradlew :shared:compileKotlinIosSimulatorArm64
```

Note: `:shared:allTests` might fail depending on your local Xcode CLI configuration (`xcrun xcodebuild -version`).

## Network Protocol (v1)

### Discovery

- Service type: `_ai-face._tcp`
- Port: `8765`
- TXT: `schema=ai-face.v1`, `transport=ws`

### Transport

- WebSocket server: `ws://<phone-ip>:8765/`

### Envelope

```json
{
  "schema": "ai-face.v1",
  "type": "set_scene",
  "ts": 1730000000000,
  "payload": {}
}
```

### Supported Types

- `hello`
- `set_scene`
- `apply_mutations`
- `reset`

## Scene DSL

Key rules for the current DSL:
- `schema = ai-face.v1`
- World coordinates: `[-100, 100]`
- Primitives: `circle | ellipse | rect | line | triangle`
- Reserved ID: `face_base` (cannot be removed via `remove`)
- Limit: up to `20` shapes

Lightweight client-side validation is enabled:
- Invalid JSON or unsupported `schema`/`type` are ignored.
- Mutations are applied sequentially.
- `set_scene` replaces the entire scene.
- `reset` returns the scene to a neutral state.

## Documentation

Architectural documents are located in the root `docs` folder:

- `../docs/architecture/00_overview.md`
- `../docs/architecture/10_dsl_and_validation.md`
- `../docs/architecture/25_display_transport.md`
- `../docs/mobile/20_android_app.md`
- `../docs/mobile/21_android_implementation_plan.md`
- `../docs/mobile/22_android_architecture.md`

## MVP Limitations

 - No background mode: works only when the app is open.
 - ACKs / sequencing: Android sends simple ACKs; iOS outbound send/ACK is currently disabled to avoid a runtime interop crash (see `mobile/docs/ios_network_interop_analysis.md`).
 - No auth/pairing (assumes a trusted LAN).
 - Android runtime is fully implemented. iOS runtime now supports discovery and receiving scenes, but the safe outbound send path is pending (see TODO and docs).

## License

See `LICENSE`.
