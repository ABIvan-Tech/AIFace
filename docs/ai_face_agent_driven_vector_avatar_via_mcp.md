# AI Face — agent-driven vector avatar via MCP

This documentation describes the code that is actually running in this repository at the time of the current commit. The system is an agent-driven vector avatar powered by MCP, a TypeScript server, and a Compose-based mobile renderer.

## Running components

- **Node.js MCP Server** (`mcp/src/index.ts`, `mcp/src/server.ts`, `mcp/src/utils/types.ts`): configures `MCPServerConfig`, opens the stdio transport, registers tools/resources, starts `MDNSDiscovery`, and streams scenes/mutations to displays via `DisplayClient`.
- **AI Agent** (`mcp/src/ai/agent.ts`): holds a single `AvatarConfig`, enforces the emotion FSM (intent cooldown, transition budget, intensity caps, angry TTL), emits full Scene DSL via `generateScene`, and keeps producing micro-mutations via `generateMutationShapes`. The agent runs a tick loop for decay and blink/breath timers.
- **Display transport** (`mcp/src/transports/display.ts`): `DisplayClient` connects to mobile WS endpoints, sends `hello`, `set_scene`, `apply_mutations`, `reset`, and ensures reconnection.
- **Discovery** (`mcp/src/discovery/mdns.ts`): listens for `_ai-face._tcp` services on port 8765 and maintains the display map.
- **Mobile apps** (`mobile/androidApp`, `mobile/shared`, `mobile/iosApp`): the Android app hosts `ws://<phone-ip>:8765`, advertises via mDNS, renders primitives from Scene DSL, and applies mutation batches. iOS sources are a placeholder for parity.
 - **Mobile apps** (`mobile/androidApp`, `mobile/shared`, `mobile/iosApp`): the Android app hosts `ws://<phone-ip>:8765`, advertises via mDNS, renders primitives from Scene DSL, and applies mutation batches. iOS now runs the shared Compose UI and advertises via `NSNetService`; the iOS receive path (accepting `set_scene` / `apply_mutations`) is implemented and applies scenes. Outbound sends (ACKs) from iOS are temporarily disabled due to Kotlin/Native ↔ Network.framework interop issues — see `mobile/docs/ios_network_interop_analysis.md` for details.
- **FSM tests** (`tests/agent.fsm.test.mjs`): cover cooldown, priorities, intensity guards, transition budget, angry TTL, and mutation generation; run via `npm test`.

## Responsibilities

1. **AI Agent** decides the emotional state, generates scenes, and keeps micro-movements alive.
2. **MCP Server** exposes tools (`set_emotion`, `push_emotion_intent`, `list_displays`, `get_current_emotion`), serves resources (`spec`, `emotions`, `state`), validates invariants, and ships scenes to displays.
3. **Displays (Android/iOS)** passively render the incoming Scene DSL and extend the execution by hosting a WebSocket server and Compose Canvas.

## References

- [Display transport](architecture/25_display_transport.md)
- [Scene DSL & validation](architecture/10_dsl_and_validation.md)
- [MCP server details](mcp/30_mcp_server.md)
- [AI agent behavior](mcp/40_ai_agent.md)
- [Android app docs](mobile/20_android_app.md)
- [FSM tests & plan](mcp/TEST_PLAN.md)

## Non-goals

- Cloud relays, authentication, or wide-area deployments are out of scope for v1.
- The avatar does not infer user feelings; it purely mirrors the agent’s internal FSM.
- No additional frameworks or technologies beyond the listed modules are involved in the working system.
