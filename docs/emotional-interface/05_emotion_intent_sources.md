# EmotionIntent sources & schema

`EmotionIntent` (defined in `mcp/src/ai/agent.ts`) captures the emotional signal that the agent consumes. It has the following shape:

```ts
interface EmotionIntent {
  source: 'INLINE' | 'HYBRID' | 'POST';
  mood: Mood;
  intensity: number; // 0..1
  confidence: number; // 0..1
  timestamp?: number;
}
```

## Sources & priorities

- `INLINE`: created by `setMood`, highest priority, default confidence = 1.
- `HYBRID`: defined for future use, currently treated as medium priority.
- `POST`: used for `push_emotion_intent` and external signals; lowest priority.

While the cooldown (`INTENT_COOLDOWN_MS = 1000`) is active, `shouldOverrideDuringCooldown` allows only:

1. Higher-priority sources (e.g., `INLINE` > `HYBRID` > `POST`).
2. Same-priority intents with confidence strictly greater than the last accepted intent.

## Confidence & timestamp

- Confidence is clamped to [0,1]; values < 0.2 are dropped before the FSM sees them.
- Timestamp is optional; if missing, the server uses `Date.now()`.
- The last accepted intent is stored (`lastAcceptedIntent`) so cooldown overrides can compare priority/confidence.

## Intensity handling

- Intensities are clamped to [0,1].
- `neutral` intensity is forced to 0.
- Additional caps: `angry <= 0.6`, `calm <= 0.5`.
- `DEFAULT_INTENSITY_IF_OMITTED = 0.7` is applied when `setMood` is invoked without a specific intensity.

## Summary

The FSM does not care about the source beyond the priority rules above. This abstraction allows different emitters (LLMs, heuristics, post-processors) to feed into the emotional pipeline without changing the core guards.
