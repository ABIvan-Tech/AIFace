---
last_updated: 2026-04-09
purpose: "Durable project decisions and invariants for the Copilot CLI native control plane."
---

# Project Decisions

## How to Use

- Add entries only when a decision is durable and likely to matter in future sessions.
- Prefer linking to code/paths and stating invariants/constraints over narrative.
- If a decision is superseded, append an "Update" note to the original entry.
- Keep runtime scratch notes out of this file.
- Separate verified repo facts from assumptions or interpretations.

## Entry Template

```md
## <Decision Title> — YYYY-MM-DD

### Facts
- Verified repo facts with file/path references.

### Inferences
- Assumptions or interpretations that still need validation.

### Decision
- The durable rule, invariant, or operating choice.

### Consequences
- What this changes, constrains, or requires going forward.
```

## Onboarding Snapshot Template

Use this after project familiarization / onboarding runs:

```md
## Onboarding Snapshot — YYYY-MM-DD

### Facts
- Major modules / packages
- Run / build / test commands
- Key conventions and invariants
- Top risks or TODOs worth remembering

### Inferences
- Only if necessary, clearly marked
```

## Entries

_No starter-specific decisions recorded._

Project-specific adopters should replace this placeholder with decisions for their own repository.
