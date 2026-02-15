# MCP Server (local)

The local MCP server (`mcp/src/index.ts`, `mcp/src/server.ts`) is the orchestrator that exposes tools/resources, discovers displays, and relays scenes and mutation streams from the embedded AI agent.

## Startup flow

1. `MCPAIFaceServer` is constructed with `MCPServerConfig` (name, version, `stdio` transport, discovery settings).
2. `initialize()` waits for `aiAgent.initialize()`, spins up `MDNSDiscovery` with the configured discovery options, and listens for `_ai-face._tcp` services.
3. When a display advertises, MCP selects an IPv4 endpoint (if available), instantiates `DisplayClient`, connects, and immediately sends the current scene (`agent.generateScene`).
4. After discovery is running, `start()` connects the MCP server to `StdioServerTransport`, making tools accessible over stdin/stdout.

## Tools

- `list_displays()`: returns `{ name, connected }` for each active `DisplayClient`.
- `set_emotion({ mood, intensity? })`: calls `agent.setMood`, regenerates the scene, and broadcasts it.
- `push_emotion_intent({ source, mood, intensity, confidence, timestamp? })`: builds an `EmotionIntent`, applies it via the agent, and shares the resulting scene.
- `get_current_emotion()`: reads `agent.getAvatar()` to return the active `AvatarConfig`.

Tool responses are wrapped in `content` JSON strings, and runtime exceptions are converted to `McpError(ErrorCode.InternalError)`.

## Resources

- `ai-face://resources/spec`: returns the DSL spec document (`docs/architecture/10_dsl_and_validation.md`).
- `ai-face://resources/emotions`: returns the emotion glossary.
- `ai-face://resources/state`: serializes the current `AvatarConfig` from `agent.getAvatar()`.

No other resources are published in v1; MCP clients rely on these URIs for metadata and state.

## Display management & discovery

- `MDNSDiscovery` (based on `bonjour-service`) watches `_ai-face._tcp` on port 8765.
- Each discovered service (prefer IPv4) spawns a `DisplayClient` that connects to `ws://host:port/`.
- On disconnect, the client is removed from the internal map and reconnection logs go to `console.error`.
- `DisplayClient` exposes `setScene`, `applyMutations`, `reset`, and manages `isConnected`/reconnect logic.

## Scene transport

- `broadcastScene()` asks the agent for `generateScene()` and calls `setScene(scene)` on every client.
- `tickLoop` (200 ms interval) calls `agent.tick()` and `generateMutationShapes()`, then pushes `applyMutations` to all clients.
- Errors from send operations are logged but do not crash the server.

## Shutdown

- `shutdown()` stops the tick loop, halts `MDNSDiscovery`, and shuts down the agent.
- `stopTickLoop()` clears the interval timer, preventing extra mutation batches.
- `DisplayClient` connections are gracefully closed when the server exits.

## Known gaps

- There is no cloud relay or remote agent bridge yet; everything runs inside a LAN.
- Tools are limited to the four endpoints above, and no automatic hard limits are enforced beyond the agent's FSM.
