# Display Transport Protocol (v1)

This document describes what MCP Server actually sends to the Android Display App via `DisplayClient` (`mcp/src/transports/display.ts`).

## Transport stack

- Protocol: WebSocket.
- Display App: listens on `ws://<phone-ip>:8765` (`mobile/androidApp`).
- MCP Server: WebSocket client that upgrades its connection with `DisplayClient` and forwards scenes/mutations.
- Discovery: MCP learns the WebSocket endpoint through `_ai-face._tcp` mDNS (`mcp/src/discovery/mdns.ts`).

## Envelope structure

Every message is a JSON object sent over WebSocket:

```json
{
  "schema": "ai-face.v1",
  "type": "hello | set_scene | apply_mutations | reset",
  "ts": 1730000000000,
  "payload": { /* type-specific data */ }
}
```

All timestamps (`ts`) are milliseconds since epoch, and `schema` never changes in v1.

## Message types

1. **hello**
   - Sent once immediately after the WebSocket connection is established.
   - Payload identifies the client and protocol version: `{ "client": "mcp-server", "protocol": "display-transport.v1" }`.
2. **set_scene**
   - Delivers a full `SceneDocument` (`generateScene()` output) during initial connect or when the agent performs a major emotion change.
   - Payload: `{ "scene": SceneDocument }`.
3. **apply_mutations**
   - Carries a mutation batch produced by `generateMutationShapes()`.
   - Used for micro-movements such as blink, breath, and jitter; payload: `{ "mutations": Mutation[] }`.
4. **reset**
   - Instructs the display to clear its current scene before a new `set_scene` arrives.
   - Payload is optional and typically contains `{ "reason": "reconnect" }`.

## Display behavior (`mobile/androidApp`)

- `set_scene`: replaces the entire in-memory scene reference and rerenders the Compose Canvas.
- `apply_mutations`: iterates over the batch and applies `update`/`add`/`remove` operations; the agent generally only issues `update` for mandatory shapes (`left_brow`, `right_brow`, `left_eye`, `right_eye`, `mouth`).
- `reset`: wipes the scene, leaving the display in a neutral configuration until the next `set_scene`.
- Invalid messages (bad JSON, unknown schema/type) are ignored to keep the render loop simple.

## Discovery & reconnection

1. Display advertises `_ai-face._tcp` with port 8765, schema `ai-face.v1`, and TXT entry `transport=ws`.
2. MCP Server polls via `MDNSDiscovery` and, upon finding a host, instantiates `DisplayClient`.
3. `DisplayClient` maintains `isConnected`, retries with exponential backoff, and issues `reset`+`set_scene` on reconnect.

## Scenarios

- **Startup**: Display advertises → MCP connects → `hello` + `set_scene`.
- **Micro-mutations**: Agent emits `apply_mutations` every ~50–200 ms.
- **Reconnect**: MCP sends `reset`, waits for ack, then `set_scene` to rebuild the scene.

## Error handling & validation

- Display ignores invalid JSON, unsupported schema, or mismatched IDs.
- Mutations targeting missing IDs are skipped quietly; the agent avoids this by keeping mandatory IDs constant.
- MCP never sends duplicate `mutation` IDs within a batch.
- Future extensions may add `ack`/`error` message types for debugging, but v1 keeps the display passive.

## References

- [Display transport source](../mcp/src/transports/display.ts)
- [Android Display App](../mobile/20_android_app.md)
