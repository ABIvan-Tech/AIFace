# Emotional Interface to LLM - implementation index

This document acts as the entry point for the Emotional Interface documentation that mirrors what is currently implemented in the codebase.

1. [01_overview](emotional-interface/01_overview.md) — explains how the agent constructs continuous emotional behavior, what components are involved, and how the Emotional Interface interacts with MCP.
2. [02_emotion_fsm](emotional-interface/02_emotion_fsm.md) — describes the FSM rules (`cooldown`, `transition budget`, `angry TTL`, `intensity caps`) enforced inside `mcp/src/ai/agent.ts`.
3. [03_face_mapping](emotional-interface/03_face_mapping.md) — documents how `FaceState` is mapped to Scene DSL shapes through helpers like `makeBrowShape`, `getEyeRadiusPx`, and `makeMouthShape`.
4. [04_temporal_smoothing](emotional-interface/04_temporal_smoothing.md) — covers the decay, breath/blink timers, and mutation cadence implemented in `agent.tick()` and `generateMutationShapes()`.
5. [05_emotion_intent_sources](emotional-interface/05_emotion_intent_sources.md) — lists the supported `EmotionIntent` fields, priorities (`INLINE`, `HYBRID`, `POST`), confidence gating, and override behavior during cooldown.
6. [06_risks_and_failsafe](emotional-interface/06_risks_and_failsafe.md) — outlines the implemented protections (forced CALM, intensity guard, error handling) that keep the system predictable.

The legacy single-document draft is preserved for reference: [emotional-interface/legacy_monolith.md](emotional-interface/legacy_monolith.md).

