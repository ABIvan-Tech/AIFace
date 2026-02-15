# AIFace Mobile Progress / TODO

Updated: 2026-02-10

## Current Progress

- [x] Base KMP structure in `mobile` is established and the project builds.
- [x] Android app launches.
- [x] Android runtime implemented:
  - [x] WebSocket display server (`ws://<ip>:8765`)
  - [x] mDNS/NSD advertising (`_ai-face._tcp`)
  - [x] UI state updates (advertising, clients, last message, errors)
- [x] Shared Compose UI/scene renderer works on Android and iOS.
- [x] Render crash on colors (`parseHexColor`) resolved.
- [x] Status bar overlap fixed:
  - [x] iOS: removed `.ignoresSafeArea()`
  - [x] Android: edge-to-edge enabled with correct insets handling
- [x] Added runtime advertising via `NSNetService` for iOS.
- [x] Added `NSLocalNetworkUsageDescription` and `NSBonjourServices` to `Info.plist` for iOS.
- [x] Fixed `SDK 'iphoneos' not found` error with fallback settings:
  - [x] in `mobile/.idea/runConfigurations/iosApp.xml` (`DEVELOPER_DIR`)
  - [x] in Xcode Build Phase (`iosApp.xcodeproj/project.pbxproj`)
- [x] Compilation check passes:
  - [x] `:shared:compileKotlinIosSimulatorArm64`
  - [x] `:androidApp:compileDebugKotlin`

## Pending Tasks (High Priority)
- [ ] iOS WebSocket listener: receive path implemented, but ACK send is temporarily disabled due to Kotlin/Native ↔ Network.framework interop crash. Implement safe native Swift wrapper for ACK and/or consider moving NW handling to Swift. See `mobile/docs/ios_network_interop_analysis.md`.
- [ ] Update iOS endpoint to real LAN IP (currently `0.0.0.0` placeholder in UI).
- [ ] Add/verify iOS runtime lifecycle handling (foreground/background, restart without leaks).
- [ ] Run end-to-end tests: controller -> Android display and controller -> iOS display over local network.
- [ ] Synchronize Android/iOS behavior for `connectedClients` and `lastMessageType`.
- [ ] Update `mobile/README.md` to reflect current actual status (some sections are outdated).
- [ ] Implement Swift bridge `IosWsBridge` to safely perform outbound sends (ACKs) via Network.framework (minimal `@objc` API called from Kotlin). See `mobile/docs/ios_network_interop_analysis.md` for plan.

## Pending Tasks (Medium Priority)
- [ ] Add Desktop app
- [ ] Add smoke/integration tests for transport/parser/reducer.
- [ ] Add network error handling and clear retry UX in UI.
  - [ ] Document Local Network permission UX on iOS after device testing (Info.plist keys already added).
- [ ] Clean up and unify run configurations (Android Studio/Xcode) for the team.

## Launch Readiness Criteria

- [ ] Android and iOS handle `hello | set_scene | apply_mutations | reset` identically at runtime.
- [ ] Discovery and endpoint work on both platforms in the same network without manual workarounds.
- [ ] Project builds stably from Android Studio and Xcode in a clean environment.
