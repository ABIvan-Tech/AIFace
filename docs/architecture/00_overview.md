
# AI Face - Architecture (v1)

## Implemented components (code references)

- **MCP Server** (`mcp/src/index.ts`, `mcp/src/server.ts`): initializes the `Server` from `@modelcontextprotocol/sdk`, connects the stdio transport, registers the tools `list_displays`, `set_emotion`, `push_emotion_intent`, and `get_current_emotion`, exposes resources `spec`, `emotions`, `state`, starts `MDNSDiscovery`, and manages connected displays via `DisplayClient`.
- **AI Agent** (`mcp/src/ai/agent.ts`): maintains `AvatarConfig`, stabilizes emotions with an FSM (1s cooldown, intensity guards, transition budget = 6/min, angry TTL = 8s), generates Scene DSL and micro-mutations (`set_scene` / `apply_mutations`), and supports decay plus micro-movements (blink, breath).
- **Discovery & Display transport** (`mcp/src/discovery/mdns.ts`, `mcp/src/transports/display.ts`): MCP discovers `_ai-face._tcp`, constructs `DisplayClient` instances, connects to display WebSocket endpoints, and sends Scene DSL envelopes (`hello`, `set_scene`, `apply_mutations`, `reset`).
- **Mobile apps** (`mobile/androidApp`, `mobile/shared`, `mobile/iosApp`): Android hosts a WebSocket server at `ws://<ip>:8765`, advertises via NSD/mDNS, parses Scene DSL messages, keeps an in-memory scene, and renders primitives on a Compose Canvas.

## Data flow

1. External tools (CLI, inspector, or other processes) call MCP tools.
2. A client calls `set_emotion` or `push_emotion_intent`; the server forwards the `EmotionIntent` to the agent and receives an updated `AvatarConfig`.
3. The agent generates a serialized Scene DSL (`generateScene`) and micro-mutations (`generateMutationShapes`).
4. The MCP server broadcasts scenes/mutations to connected displays through `DisplayClient`.
5. The mobile app applies `set_scene` and `apply_mutations` and renders the resulting primitives.

## Responsibilities

- **Server**: network interaction, discovery, and display management.
- **Agent**: emotion FSM invariants, scene generation, and micro-mutation production.
- **Display**: render Scene DSL primitives.

## References

- DSL & validation: [10_dsl_and_validation.md](10_dsl_and_validation.md)
- Display transport: [25_display_transport.md](25_display_transport.md)
- MCP server: [../mcp/30_mcp_server.md](../mcp/30_mcp_server.md)
- AI agent: [../mcp/40_ai_agent.md](../mcp/40_ai_agent.md)
- Mobile app: [../mobile/20_android_app.md](../mobile/20_android_app.md)
- FSM tests: [../mcp/TEST_PLAN.md](../mcp/TEST_PLAN.md)

## High-level goals

AI Face v1 is an implementation where a local agent constructs and rarely mutates a vector face; the mobile app is a passive display. MCP defines the "physics of the world" (rules, constraints, and display endpoints).

### Core principles

- Vector-only rendering from a closed set of primitives.
- The user does not directly control the face.
- The agent receives rules and constraints exclusively via MCP.
- Semantic visual changes are infrequent and small; continuous life is provided by low-amplitude micro-mutations.

### Components summary

1) Android Display App (foreground): advertises `_ai-face._tcp`, hosts a local WebSocket server (8765), renders primitives and animates transitions. It is a passive renderer and should not implement emotion logic.

2) MCP Server (local): single source of truth for DSL, validation rules, discovery, and delivery. It exposes resources and tools to the agent and forwards scenes/mutations to connected displays.

3) Cloud AI Agent: maintains emotional state and decides when to reflect it visually. It only communicates via MCP and produces base scenes and mutation batches.

4) Cloud Relay (bridge): used when the agent is cloud-hosted and the MCP Server is local; the MCP Server keeps an outbound connection to a Relay which proxies traffic.

### Startup sequence (happy path)

1. Start MCP Server locally.
2. Start Android Display App.
3. Display advertises via mDNS.
4. MCP discovers and connects to the display.
5. Optional: cloud agent connects via relay and reads resources.
6. Agent generates base scene; MCP validates and delivers it.
7. Agent emits periodic mutation batches.

### Reconnect policy

On display reconnect, MCP may issue `reset` and the agent can regenerate a base scene.

## Document map

- DSL + validation: [10_dsl_and_validation.md](10_dsl_and_validation.md)
- Display transport: [25_display_transport.md](25_display_transport.md)
- Android app docs: [../mobile/20_android_app.md](../mobile/20_android_app.md)

## Scope notes

- Pairing and authentication are out of scope for MVP (trusted LAN). WebSocket is the supported transport for v1.

