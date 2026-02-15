# Emotion FSM (implemented rules)

This document summarizes the invariants enforced inside `mcp/src/ai/agent.ts` by `applyIntent`, `tick`, and related helpers.

## Allowed moods

- `neutral`, `calm`, `happy`, `amused`, `nervous`, `sad`, `angry`
- At most one mood is active at a time; everything else is represented through intensity and transform adjustments.

## Intent gating

1. **Confidence gate**: clamp `confidence` to [0,1]; intents with `confidence < 0.2` are ignored.
2. **Global cooldown**: `INTENT_COOLDOWN_MS = 1000`. During cooldown only higher-priority intents (INLINE > HYBRID > POST) or intents with higher confidence than the last accepted one may override.
3. **Transition budget**: only `MAX_TRANSITIONS_PER_MIN = 6` transitions may occur inside a 60-second window. If the budget is exhausted, the agent resets to `calm` with a capped intensity (<= 0.35).

## Guarded transitions

- `neutral -> calm` is always permitted.
- `calm` may move to `happy`, `amused`, `nervous`, or `sad`.
- `happy` ↔ `amused` are mutually allowed.
- `angry` requires: `source === 'INLINE'`, `confidence >= 0.8`, and the previous mood is one of `{calm, neutral, nervous, sad}`.
- Any forbidden transition defaults to `calm` to avoid instability.

## Intensity caps

- `neutral` is always intensity 0.
- `angry` intensity is clamped to ≤ 0.6.
- `calm` intensity is clamped to ≤ 0.5.
- Other moods use the requested intensity, clamped to [0,1].

## Angry TTL

- Entering `angry` sets `angryUntilTs = now + 8000` ms.
- Once TTL expires, `tick()` forces the mood back to `calm` and limits intensity to ≤ 0.35.

## Decay & fail-safes

- `tick()` reduces intensity by `dt / DECAY_SECONDS` (with `DECAY_SECONDS = 75`), so without new intents the face gravity returns to `neutral` over ~75 seconds.
- When intensity falls below `INTENSITY_TO_CALM_THRESHOLD`, the agent moves to `calm`; if it drops below `CALM_TO_NEUTRAL_THRESHOLD` the agent becomes `neutral`.
- Every update uses `clamp01` or `lerp` helpers to keep numeric values valid.

## FSM invariants summary

- Only one mood at a time.
- Transitions respect cooldown, budget, and guard rules.
- The agent always decays toward `calm -> neutral` when inputs stop.
- Intent sources cannot force extreme moods without meeting confidence/priority requirements.
