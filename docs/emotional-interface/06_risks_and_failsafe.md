# Risks & fail-safe protections

This document enumerates the risks the Emotional Interface guards against and the current fail-safe implementation in `mcp/src/ai/agent.ts`.

| Risk | Guarded behavior |
| --- | --- |
| Too-frequent transitions | Global cooldown (`INTENT_COOLDOWN_MS = 1000`) plus transition budget (max 6 transitions per minute). Budget exhaustion forces `calm` with intensity ≤ 0.35. |
| Low-confidence inputs | Intents with `confidence < 0.2` are ignored; cooldown overrides require higher confidence or higher-priority sources. |
| Forbidden transitions | `guardTransition` forces `calm` when a requested transition is not permitted (e.g., `happy -> angry`). |
| Excessive intensity | Intensity is clamped to [0,1]; `angry ≤ 0.6`, `calm ≤ 0.5`, `neutral = 0`. |
| Prolonged anger | `angryUntilTs = now + 8000`. After the TTL expires, `tick()` forces `calm` and reduces intensity. |
| No input | Decay (`DECAY_SECONDS = 75`) steadily drives the face toward `calm/neutral`. |

Additional protections:

- Intent processing updates diagnostic fields (`lastAcceptedIntent`, `transitionHistoryTs`, `moodEnteredAtTs`) to keep the FSM auditable.
- Numeric calculations always use `clamp01`/`lerp` to avoid invalid geometry.
- Errors inside the agent are caught and logged; MCP continues running.

## Philosophy

> No emotion is better than a wrong emotion.

The system consistently prefers **under-expression** in ambiguous or failure scenarios. All guard logic is implemented before we consider adding new moods or transports.
