# Emotional Interface Overview

The Emotional Interface lives inside the MCP agent (`mcp/src/ai/agent.ts`) and translates discrete `EmotionIntent`s into continuous face behavior. This doc explains the implemented data flow and the role of each component.

## Pipeline (what is running)

1. **External tool** (CLI, inspector, or LLM) emits an `EmotionIntent` via MCP tools (`set_emotion`, `push_emotion_intent`).
2. **MCP agent** applies intent rules, enforces cooldowns/budgets/guards, and updates `AvatarConfig`.
3. **Scene generation**: `generateScene` emits the full Scene DSL for the current mood, while `generateMutationShapes` returns frequent micro changes.
4. **Display transport** relays the scene and mutation envelopes to every connected display through `DisplayClient` (`mcp/src/transports/display.ts`).
5. **Mobile renderer** receives `set_scene`/`apply_mutations` packets and paints primitives on a Compose canvas (`mobile/androidApp`).

## Key components

- **Emotion FSM** controls mood transitions and intensity caps (`Calm`, `Angry`, `Happy`, etc.).
- **Face mapping** uses helpers (brows, eyes, mouth) to map moods to shapes.
- **Temporal smoothing** maintains decay, breath, and blink timings.
- **Micro-mutations** add life via frequent `apply_mutations` batches (~5 shapes, low amplitude).

## Goals

- Keep the LLM stateless and turn-based.
- Deliver long-lived emotional continuity through the agent + renderer.
- Avoid direct LLM-to-display networking; MCP acts as the mediator.

## Non-goals

- No user emotion detection or personality simulation.
- No background LLM execution or direct control over the rendering client.
- No additional transports beyond the WebSocket path described in `docs/architecture/25_display_transport.md`.
