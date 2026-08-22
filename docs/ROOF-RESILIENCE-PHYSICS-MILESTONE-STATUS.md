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
  - [x] Adopted code/version + wind-input provenance foundation — PR #113.
  - [x] Velocity-pressure chain — PR #114.
  - [x] Project wind-input acceptance — PR #115.
  - [x] Roof Bay project wind-input integration — PR #116.
  - [x] Enclosure + roof/building geometry input acceptance — PR #117.
  - [x] Roof Bay pressure-context acceptance + project JSON integration — PR #118.
  - [x] Source-backed base internal-pressure coefficient (`GCpi`) foundation — PR #119.
  - [x] Large-volume partially enclosed reduction factor (`Ri`) applicability + equation — PR #120; engineer-declared applicability, explicit conservative `Ri = 1.0`, source-referenced equation path, no silent beneficial reduction.
  - [~] Internal-pressure velocity-pressure selection + signed `qi(GCpi)` term — PR #121 candidate.
    - New `futoltech.wind-internal-pressure-term/1` record follows the exact upstream coefficient chain.
    - Enclosed: `qi = qh` for positive and negative internal-pressure cases.
    - Partially enclosed negative internal pressure: `qi = qh`.
    - Partially enclosed positive internal pressure: explicit conservative `qi = qh` or source-referenced `qz` at the highest opening affecting positive internal pressure.
    - Highest-opening elevation is never inferred.
    - Partially enclosed records cannot bypass the explicit `Ri` record, including the conservative `Ri = 1.0` path.
    - Signed internal-pressure term is stored as `qi * (GCpi)` and is not prematurely combined with external pressure.
    - Open building remains zero internal term because `GCpi = 0`.
    - Deterministic recalculation protects `qh`, optional `qz`, `qi`, coefficient carry-through and `qi(GCpi)`.
    - External pressure coefficients, effective wind area, field/edge/corner geometry, pressure combination, load combinations and final code-pressure routing remain blocked.
  - [ ] Begin source-backed external roof pressure coefficient implementation only after PR #121 is final-head green and merged.
  - [ ] Add effective wind area, field/edge/corner geometry, load combinations and final code-pressure routing only through their own source-backed gates.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.