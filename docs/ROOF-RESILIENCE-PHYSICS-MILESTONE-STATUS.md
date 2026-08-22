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
  - [x] Velocity-pressure chain — PR #114; final-head Engineering Checks passed and PR merged.
  - [x] Project wind-input acceptance — PR #115; final-head Engineering Checks passed and PR merged.
  - [x] Roof Bay project wind-input integration — PR #116; dedicated M3 Chromium gate and full final-head Engineering Checks passed before merge, and the PR merged.
    - Roof Bay accepts the source-referenced project record, shows `Kz` / `q`, embeds the accepted record in project JSON, and invalidates acceptance after edits.
    - The project wind-design basis is deterministically derived from the accepted record.
    - `pressureZoning.activePressureModel` remains `manual-uniform`, `codeBasis` remains null and regions remain empty.
  - [~] Enclosure + roof/building geometry input acceptance — PR #117 candidate.
    - Adds versioned `futoltech.wind-pressure-context-acceptance/1` records on top of a valid upstream accepted wind-project record.
    - Stores only the NSCP enclosure classification family `enclosed`, `partially-enclosed`, `open`; classification remains an engineer-declared project input, not an automatic code-definition result.
    - Requires separate enclosure-classification and building-envelope-opening assessment references.
    - Requires source-referenced roof form, plan length, plan width, mean roof height and roof slope.
    - Mean roof height must match the upstream accepted wind-project height.
    - Deterministic tests protect serialization, provenance, height consistency and anti-promotion flags.
    - Automatic enclosure classification, code threshold evaluation, `GCpi`, external pressure coefficients, effective wind area, field/edge/corner zoning and final roof pressure remain blocked.
  - [ ] Expose the accepted pressure-context record in Roof Bay/project JSON after PR #117.
  - [ ] Add internal/external pressure coefficients and field/edge/corner geometry only from explicit code rules, source-backed inputs and independent benchmark checks.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.
