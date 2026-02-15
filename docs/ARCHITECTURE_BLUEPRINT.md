# ARCHITECTURE_BLUEPRINT.md

> **Purpose**
> This document is a **canonical architecture map** for the AIFace repository.
> It is designed to be:
>
> * a single source of truth
> * a navigation index for the existing documentation
> * a **mechanical blueprint** that Copilot (or a human) can use to reason about the project structure
>
> ⚠️ This document **does NOT introduce new architecture**.
> ⚠️ It only describes and organizes what already exists in the repository.

---

## 0. How to Read This Repository

The repository is organized as **four logical layers**, each mapped to a directory.

Each layer:

* has a clear responsibility
* is documented via Markdown files
* is independent but composable

This document explains:

1. what each layer is responsible for
2. which files belong to that layer
3. how the layers relate to each other

---

## 1. High-Level Layer Map

```
Layer 1 — Emotional Interface
  → emotional-interface/

Layer 2 — System Architecture & DSL
  → architecture/

Layer 3 — MCP & AI Agent Layer
  → mcp/

Layer 4 — Mobile Client
  → mobile/
```

---

## 2. Layer 1 — Emotional Interface

**Directory:** `emotional-interface/`

### Responsibility

This layer defines **how emotions are modeled, stabilized, and translated into visual intent**.

It is:

* LLM-agnostic
* UI-agnostic
* independent of MCP and transport

It answers the question:

> *How does an LLM emotion become a stable, continuous interface signal?*

### Files

```
emotional-interface/
├ 01_overview.md
├ 02_emotion_fsm.md
├ 03_face_mapping.md
├ 04_temporal_smoothing.md
├ 05_emotion_intent_sources.md
├ 06_risks_and_failsafe.md
└ emotional_interface_to_llm_architecture.md
```

### File Roles

* **01_overview.md**
  Conceptual introduction to the emotional interface layer.

* **02_emotion_fsm.md**
  Definition of the Emotion FSM: states, transitions, decay, invariants.

* **03_face_mapping.md**
  Mapping from abstract emotion state to parametric face representation.

* **04_temporal_smoothing.md**
  Time-based smoothing and animation principles.

* **05_emotion_intent_sources.md**
  Definition of emotion signal origins (INLINE / POST / HYBRID).

* **06_risks_and_failsafe.md**
  Safety rules, edge cases, and fail-safe behavior.

* **emotional_interface_to_llm_architecture.md**
  Summary document describing the emotional interface as a standalone architectural concept.

---

## 3. Layer 2 — System Architecture & DSL

**Directory:** `architecture/`

### Responsibility

This layer defines the **system-level architecture**, including:

* scene / DSL concepts
* validation rules
* transport-independent rendering contracts

It answers the question:

> *How are abstract interface intents represented and validated at the system level?*

### Files

```
architecture/
├ 00_overview.md
├ 10_dsl_and_validation.md
└ 25_display_transport.md
```

### File Roles

* **00_overview.md**
  High-level system architecture overview.

* **10_dsl_and_validation.md**
  Definition of the scene DSL and validation rules.

* **25_display_transport.md**
  Display and transport considerations between system components.

---

## 4. Layer 3 — MCP & AI Agent Layer

**Directory:** `mcp/`

### Responsibility

This layer describes **how MCP, AI agents, and cloud relay components interact**.

It answers the question:

> *How do AI agents and MCP participate in the overall system?*

### Files

```
mcp/
├ 30_mcp_server.md
├ 40_ai_agent.md
└ 50_cloud_relay.md
```

### File Roles

* **30_mcp_server.md**
  MCP server responsibilities and interaction model.

* **40_ai_agent.md**
  Role of the AI agent in the system.

* **50_cloud_relay.md**
  Optional cloud relay / mediation layer.

---

## 5. Layer 4 — Mobile Client

**Directory:** `mobile/`

### Responsibility

This layer documents the **mobile application**, focused on:

* rendering
* platform architecture
* implementation planning

It answers the question:

> *How is the emotional interface rendered on a mobile device?*

### Files

```
mobile/
├ 20_android_app.md
├ 21_android_implementation_plan.md
└ 22_android_architecture.md
```

### File Roles

* **20_android_app.md**
  Overview of the Android application.

* **21_android_implementation_plan.md**
  Step-by-step implementation plan.

* **22_android_architecture.md**
  Android-specific architectural decisions.

---

## 6. Cross-Cutting Concept Documents

### Root-Level Files

* **ai_face_agent_driven_vector_avatar_via_mcp.md**
  Early or exploratory concept document describing the overall idea.

These files are **not part of a specific layer**, but provide context.

---

## 7. Copilot / Automation Instructions

This document can be used by Copilot or other tools with the following rules:

```text
- Each layer maps to exactly one directory.
- Each file listed already exists and must not be invented.
- Do not merge layers.
- Do not introduce implementation details.
- Treat this document as an index and semantic map only.
```

---

## 8. Status

* This blueprint reflects the **current real repository structure**.
* No new components are introduced here.
* All future documentation should fit into one of the four layers.

---

**End of Architecture Blueprint**
