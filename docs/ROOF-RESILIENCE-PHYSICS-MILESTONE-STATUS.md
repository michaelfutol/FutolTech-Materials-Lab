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
    - Manual uniform pressure remains active until later code-derived pressure/zoning slices are verified.
  - [~] Velocity-pressure chain — PR #114 candidate; merge requires final-head full Engineering Checks.
    - Implements `qz = 0.613 Kz Kzt Kd V²` for the adopted NSCP 2015 building path, with building `Kd = 0.85` and Exposure B/C/D Kz evaluation.
    - Uses the 4.57 m minimum Kz evaluation height and explicit kph→m/s conversion; no wind-speed map lookup or silent Kzt assumption is added.
    - Independent Exposure C / 8.82 m / 240 kph / Kzt 1.0 benchmark gives `Kz = 0.974820633` and `q = 2.257468 kPa` at full solver precision.
    - Source-referenced velocity-pressure state resolves only site, speed, occupancy/risk basis, exposure, topography and height; enclosure/internal pressure and roof geometry remain `UNRESOLVED`.
    - External/internal pressure coefficients, field/edge/corner geometry and load combinations remain `UNIMPLEMENTED`.
    - The benchmark is visible and regression-protected but deliberately not routed into Roof Bay; project pressure remains `manual-uniform`, `pressureZoning.codeBasis` remains null and code-derived regions remain empty.
  - [ ] Resolve/validate project wind-input families with source references and applicability rules, including a defensible Philippine basic-wind-speed selection path, before pressure coefficients are enabled.
  - [ ] Add field/edge/corner geometry and positive/suction pressures only from explicit code rules and traceable inputs.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.
