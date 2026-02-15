# iOS Network.framework interop: root cause analysis and Swift wrapper plan

Date: 2026-02-15

## Summary

We observed runtime crashes on iOS when the shared Kotlin/Native code attempted to send ACK frames using Apple's Network.framework (`nw_connection_send`) and when Kotlin attempted to bridge Obj‑C/C blocks into Kotlin lambdas. Android (Ktor) does not show this problem because it runs on the JVM and avoids Obj‑C interop entirely.

This document explains the root cause and outlines a pragmatic implementation plan: a thin native Swift wrapper that owns all Network.framework callbacks and exposes a small, safe API usable from Kotlin/Native.

## Root cause

- Crash: NSGenericException: `Converting Obj-C blocks with non-reference-typed return value to kotlin.Any is not supported (v)`.
- Trigger: Kotlin/Native attempted to convert Objective‑C blocks (used by Network.framework callbacks and completion handlers) into Kotlin closures or `kotlin.Any` values. Some Network.framework callbacks use C/Obj‑C block signatures that do not map cleanly to Kotlin/Native reference types.
- Symptom: app crashes during `nw_connection_send` or when a completion/state callback fires; repeated reconnects or EOF observed when completion/context were passed incorrectly.

## Why Android is unaffected

- `AndroidWebSocketDisplayServer` uses Ktor on the JVM. Sending frames uses coroutine-friendly `session.send(text)` and does not cross into Obj‑C/C. There is no block/closure bridging layer, so no crash surface.

## Recommended solution (safe, robust)

Implement a native Swift wrapper that hosts the Network.framework code (NWListener/NWConnection). The Swift wrapper will:

- Own NWListener and NWConnection lifecycles entirely on the Swift side.
- Perform all reads and writes in Swift; keep Obj‑C blocks / Swift closures internal to Swift.
- Provide a minimal Objective‑C/Swift API that Kotlin/Native can call safely (no Obj‑C blocks returned into Kotlin). For example:
  - `IosWsBridge.shared.start(port: Int)`
  - `IosWsBridge.shared.stop()`
  - `IosWsBridge.shared.sendAck(_ data: Data)` — a fire-and-forget method where Swift handles completion internally and does not return Obj‑C blocks to Kotlin.
  - Events from Swift → Kotlin: keep these to simple reference-typed callbacks, or expose a polling/state API. Prefer `Void`-returning methods and notifications rather than passing Obj‑C blocks into Kotlin.

Benefits:

- Swift/Obj‑C are the native owners of Network.framework semantics and closures — they will correctly handle block lifetimes and types.
- Kotlin/Native side avoids converting Obj‑C blocks to Kotlin lambdas; interop surface is reduced to simple method calls that map cleanly to Kotlin types.

## Implementation plan (concrete steps)

1. Add a Swift bridge file into the iOS app target: `mobile/iosApp/iosApp/IosWsBridge.swift`.

2. Implement the bridge as a singleton `NSObject` subclass so it is visible to Kotlin/Native via the generated Objective‑C header. Example sketch:

```swift
import Foundation
import Network

@objc public class IosWsBridge: NSObject {
    @objc public static let shared = IosWsBridge()

    private var listener: NWListener?

    @objc public func start(onPort port: Int) {
        // create NWListener, set queue, set state handler, and new connection handler
    }

    @objc public func stop() {
        listener?.cancel()
        listener = nil
    }

    @objc public func sendAck(_ data: Data) {
        // iterate active NWConnection(s) and call connection.send(content:completion: .contentProcessed)
        // handle completion inside Swift (log errors) — do NOT expose the completion block to Kotlin
    }
}
```

3. Add a bridging header if needed or ensure the Swift file is part of the `iosApp` Xcode target so Kotlin/Native sees the generated header in the framework.

4. Replace the fragile Kotlin `nw_...` calls used for sending ACKs with calls into the Swift bridge from `IosWebSocketDisplayServer`:

```kotlin
// instead of calling nw_connection_send from Kotlin/Native:
IosWsBridge.shared.sendAck(dataBytes)
```

5. Keep receive path in Kotlin or move receive loop to Swift if desired. If Kotlin must handle incoming frames, prefer a simple callback surface where Swift calls a Kotlin-exposed function with a reference-typed parameter (for example, posts a `String` payload via a stable, exported C function) — but start with only outbound ACKs handled by Swift to minimize changes.

6. Test cycle:
  - Add `IosWsBridge.swift` to iOS target and build.
  - Run CLI scenario (persistent client or existing ephemeral client) and verify no crashes, and that the client sees ACK or fast response.

## Minimal integration notes

- Kotlin/Native will generate a header for Swift `@objc` classes; you can call them from Kotlin as normal `objc` interop types. Prefer `Data`, `String`, `Int`, and `Void` return types in Swift `@objc` methods.
- Avoid returning Swift/Obj‑C blocks or structs to Kotlin.

## Next actions I can take for you

- Create the Swift bridge file `IosWsBridge.swift` and the Kotlin glue (small changes in `IosWebSocketDisplayServer`) as a focused patch, compile the iOS `:shared` target, and run a quick smoke check.
- Alternatively, implement a persistent CLI connection (one WebSocket for the whole menu session) — smaller effort and improves UX while we add Swift bridge.

If you want, I can implement the Swift wrapper now and run the build checks. Which option do you prefer? (Swift wrapper recommended.)