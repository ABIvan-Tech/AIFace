# AI Agent (embedded in MCP)

The agent implementation lives in `mcp/src/ai/agent.ts`. It embeds emotion logic, generates the base scene, and drives micro-movements through mutation batches.

## Supported moods

- `neutral`, `calm`, `happy`, `amused`, `nervous`, `sad`, `angry`
- `neutral` and `calm` act as fallback states when invariants fail.
- Each mood has intensity capped in [0, 1], with `angry <= 0.6` and `calm <= 0.5`.

## Public API

1. `initialize()`: sets up timers, marks the agent as running, and initializes internal state.
2. `getAvatar()`: returns the current `AvatarConfig` describing mood/intensity/scene metadata.
3. `setMood(mood, intensity?)`: creates an inline `EmotionIntent` with confidence 1.0 and routes it through `applyIntent`.
4. `pushEmotionIntent(intent)`: accepts external intents (`INLINE`, `POST`, `HYBRID`), evaluates cooldown/priority, and updates the FSM.
5. `tick(dtMs)`: invoked by the MCP tick loop (~200 ms); decays intensity, advances timers, and schedules blinks/breaths.
6. `generateScene(avatar)`: constructs the full `SceneDocument` with mandatory shapes (`background`, `face_base`, brows/eyes/mouth, etc.).
7. `generateMutationShapes()`: returns the updated variants for mandatory IDs so `apply_mutations` stays small.

## Intent logic (`applyIntent`)

- **Confidence gate:** clamp confidence to [0, 1]; ignore intents with confidence < 0.2.
- **Cooldown:** global `INTENT_COOLDOWN_MS = 1000`. While cooling down, only higher-priority intents (INLINE > HYBRID > POST) or higher-confidence overrides are accepted.
- **Transition budget:** `MAX_TRANSITIONS_PER_MIN = 6` within a 60 s window. Exceeding the budget forces the agent into `calm` with intensity <= 0.35.
- **Guarded transitions:** only specific transitions are permitted (e.g., `neutral/calm` -> `happy/amused/nervous/sad`, `happy <-> amused`). `angry` requires `source === 'INLINE'`, `confidence >= 0.8`, and only moves from `calm`, `neutral`, `nervous`, or `sad`.
- **Intensity caps:** `neutral` is always 0, `angry` is capped at 0.6, `calm` at 0.5, and all intensities are clamped to [0, 1].
- **Angry TTL:** `angry` can only persist for 8000 ms (`ANGRY_TTL_MS`); after expiry the agent decays into `calm`.

These rules guarantee stable, human-readable transitions even when external systems flood the agent with intents.

## Decay & micro-movements

- **Decay:** intensity drifts toward 0 at a rate of `dt / DECAY_SECONDS` with `DECAY_SECONDS = 75`. Without new intents the agent eventually returns to `neutral`/`calm`.
- **Blinking:** scheduled every 2.5–5.5 s (`nextBlinkAtTs`); each blink compresses the eyes for ~140 ms.
- **Breathing:** a low-frequency sinusoid drives `breathPhase`, slightly shifting brows, eyes, and mouth to keep the face alive.
- Timers such as `lastIntentTs`, `moodEnteredAtTs`, `angryUntilTs`, and `lastTickTs` support cooldowns and TTLs.

## Scene & mutation generation

- `generateScene` constructs required shapes using helpers (`makeBrowShape`, `makeEye`, `makeMouthShape`, etc.) and enforces that `face_base` and `background` appear first.
- The scene always contains mandatory IDs (`background`, `face_base`, `left_brow`, `right_brow`, `left_eye`, `right_eye`, `mouth`).
- `generateMutationShapes` produces updated shapes for the brows, eyes, and mouth. Each mutation blends the current mood target with micro offsets (breath, blink, jitter). Batches usually consist of `update` ops only.
- Shape math clamps positions/resizes to the [-100, 100] range so the display layer never receives out-of-bounds geometry.

## Robustness

- All numeric helpers (`clamp01`, `lerp`, `mix`) prevent NaN/Infinity and keep transforms valid.
- Intent handling populates diagnostic metadata (`lastAcceptedIntent`, `transitionHistoryTs`, `moodEnteredAtTs`), enabling audit trails and cooldown logic.
- Errors are caught inside the agent; MCP logs them in `console.error` so the tick loop keeps running.

## Future thoughts

- The agent currently lives alongside the server. If we later split it into a separate service, the same FSM/rules documented here must stay intact.
- Additional moods or mutation shapes should reuse the existing helper patterns to avoid introducing new invariants.
