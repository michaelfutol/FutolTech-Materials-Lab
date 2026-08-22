# Roof Resilience Physics Milestone Status

Status date: 2026-08-22

- [~] **M0 — Product cleanup / navigation:** primary workflow + Advanced/R&D hub implemented; legacy page-level navigation cleanup and first-time-user responsive QA remain.
- [x] **M1 — C-Purlin Gravity + Wind Physics Bench:** core solver, animation/video and browser regression implemented; permanent gross-section/cold-formed boundaries remain explicit.
- [x] **M2 — Roof Bay Physics:** current milestone scope CLOSED after PR #112 final-head Engineering Checks passed and merged.
  - [x] Two-rafter Roof Bay, equalized purlin layout, tributary routing, reaction transfer and conservation — PR #108.
  - [x] Selected purlin/tributary/reaction/formula trace, exploded load path and stable project JSON — PR #109.
  - [x] Custom/nonuniform purlin station layout with exact physical tributary-band boundaries and project round-trip — PR #110.
  - [x] Rafter A/B reaction diagrams with separate roof-normal / downslope conservation breakdown — PR #111.
  - [x] M3-ready roof pressure-zone schema/coordinate-frame placeholders with field/edge/corner types reserved and zero invented code zones — PR #112.
  - [x] Exit gate: reactions balance applied roof load within numerical tolerance, visual and solver paths remain synchronized, and full final-head CI is green.
- [~] **M3 — Code Wind / Roof Zoning:** ACTIVE.
  - [x] Adopted code/version + wind-input provenance foundation — PR #113; final-head Engineering Checks passed before merge.
    - Initial source-backed profile: NSCP 2015, Volume 1, 7th Edition, 2nd Printing.
    - Versioned `futoltech.wind-design-basis/1` object is carried by Roof Bay export.
    - Eight required wind-input families remain `UNRESOLVED`.
    - Velocity-pressure, coefficients, zone geometry and load combinations remain `UNIMPLEMENTED`; code calculation remains `BLOCKED`.
    - Existing manual uniform pressure remains active; no code-derived pressure is claimed.
    - Deterministic serialization now compares evidence canonically so object key ordering cannot create a false provenance mismatch while semantic mutations are still rejected.
  - [ ] Implement and hand-benchmark the velocity-pressure chain before applying zone coefficients.
  - [ ] Resolve/validate code input families with source references and applicability rules.
  - [ ] Add field/edge/corner geometry and positive/suction pressures only from explicit code rules and traceable inputs.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.
