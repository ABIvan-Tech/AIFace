# MCP Test Plan (v1)

## Automated coverage

- `tests/agent.fsm.test.mjs` exercises the emotion FSM guards:
  - default `mood` and `intensity` behavior.
  - cooldown gating and `shouldOverrideDuringCooldown` logic.
  - confidence thresholds and intensity caps (`angry <= 0.6`, `calm <= 0.5`).
  - transition budget (max 6 transitions per minute).
  - angry TTL fallback to `calm`.
  - micro-mutation generation (`apply_mutations` updates brows, eyes, mouth).

## Commands

```bash
npm test
```

`npm test` runs TypeScript compilation (`npm run build` indirectly) and executes `node --test tests/agent.fsm.test.mjs`.
For iterative development, you can run `npm run build` (this also catches tsconfig errors) followed by `node --test tests/agent.fsm.test.mjs` to focus on the FSM assertions.

## Failure handling

- When a test fails, inspect `tests/agent.fsm.test.mjs` to determine which invariant (cooldown, transition guard, decay, etc.) broke.
- Logging inside the agent helps trace the exact timestamps/intensities that caused the assertion to fail.

## Manual verification (occasionally)

1. Start the MCP server locally (`npm run start` in `mcp/`).
2. Run `npm run test:agent` if defined, otherwise reuse `npm test`.
3. Exercise the CLI tools (`set_emotion`, `push_emotion_intent`, etc.) through the MCP stdin interface to confirm the agent emits the appropriate scenes.

## Notes

- No UI tests exist yet; the mobile display is validated manually by watching the Compose render stream.
- When new intents/guards are added, expand `tests/agent.fsm.test.mjs` before wiring them into the server.
