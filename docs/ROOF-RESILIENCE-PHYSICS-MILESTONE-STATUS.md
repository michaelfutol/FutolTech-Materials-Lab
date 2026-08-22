# Roof Resilience Physics Milestone Status

Status date: 2026-08-22

- [~] **M0 — Product cleanup / navigation:** primary workflow + Advanced/R&D hub implemented; legacy page-level navigation cleanup and first-time-user responsive QA remain.
- [x] **M1 — C-Purlin Gravity + Wind Physics Bench:** core solver, animation/video and browser regression implemented; permanent gross-section/cold-formed boundaries remain explicit.
- [~] **M2 — Roof Bay Physics:** exit candidate in PR #112; all planned current-scope slices are implemented and M2 closes only after the full PR head passes Engineering Checks and merges.
  - [x] Two-rafter Roof Bay, equalized purlin layout, tributary routing, reaction transfer and conservation — PR #108.
  - [x] Selected purlin/tributary/reaction/formula trace, exploded load path and stable project JSON — PR #109.
  - [x] Custom/nonuniform purlin station layout with exact physical tributary-band boundaries and project round-trip — PR #110.
  - [x] Rafter A/B reaction diagrams with separate roof-normal / downslope conservation breakdown — PR #111.
  - [x] M3-ready roof pressure-zone schema/coordinate-frame placeholders with field/edge/corner types reserved and zero invented code zones — PR #112.
  - [ ] PR #112 full Engineering Checks + merge to `main` before changing M2 from exit candidate to closed.
- [~] **M3 — Code Wind / Roof Zoning:** next primary physics milestone after M2 closes; current manual-pressure path and reserved zone schema are not yet a reproducible code wind engine.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.
