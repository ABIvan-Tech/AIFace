# Temporal smoothing & micro-movements

Temporal smoothing is implemented inside `agent.tick()` and `generateMutationShapes()` to keep the face alive between semantic emotion changes.

## Timing model

- MCP’s tick loop runs every ~200 ms (`startTickLoop`).
- Each tick computes `dtMs = now - lastTickTs` and `dtSec = dtMs / 1000`.
- `DECAY_SECONDS = 75`, so intensity decays by `dtSec / 75` per tick. Without new intents the mood drifts toward `calm → neutral` over about 75 seconds.

## Breath & blink

- `breathPhase` increments by `dtSec * 2π * 0.18`; `breath = sin(breathPhase) * 2.5` adds small vertical offsets to brows/eyes/mouth.
- Blink scheduling: `nextBlinkAtTs` is sampled between 2.5 and 5.5 seconds; each blink lasts ~140 ms (`blinkUntilTs`). During a blink the eye radius collapses, and it restores afterward.
- Blink/breath values feed into both `generateScene` and `generateMutationShapes` so the display receives consistent motion.

## Mutation cadence

- Micro-movements are emitted only when displays are connected.
- Each mutation batch includes updates for `left_brow`, `right_brow`, `left_eye`, `right_eye`, and `mouth` with small transform/style deltas.
- Batches are small (≤ 5 updates) and keep magnitude low (no removal/add operations in MVP).

## Fail-safe behavior

- When no inputs arrive for a while, intensity decay and blink/breath timers still keep the face breathing and occasionally blinking.
- Time-based transitions ensure the face never gets stuck in an extreme mood without new intents.
