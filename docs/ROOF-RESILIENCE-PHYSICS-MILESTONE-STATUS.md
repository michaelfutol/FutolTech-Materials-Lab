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
  - [x] Roof Bay project wind-input integration — PR #116; dedicated M3 Chromium gate and full final-head Engineering Checks passed before merge.
  - [x] Enclosure + roof/building geometry input acceptance — PR #117; final-head Engineering Checks passed and PR merged.
  - [x] Roof Bay pressure-context acceptance + project JSON integration — PR #118; dedicated V9 Chromium gate, deterministic tests and complete final-head Engineering Checks passed before merge.
  - [x] Source-backed base internal-pressure coefficient (`GCpi`) foundation — PR #119; exact final-head Engineering Checks passed before merge.
    - `futoltech.wind-internal-pressure-coefficient/1` attaches to the exact accepted pressure-context record.
    - Base cases: open `0.00`, enclosed `+0.18/-0.18`, partially enclosed `+0.55/-0.55`.
    - Positive and negative cases remain separate.
    - Partially enclosed base GCpi remains upstream evidence for the large-volume `Ri` path rather than becoming final pressure.
  - [~] Large-volume partially enclosed reduction factor (`Ri`) applicability + equation — PR #120 candidate.
    - New `futoltech.wind-large-volume-reduction/1` record requires the exact partially enclosed base-GCpi record.
    - Applicability remains engineer-declared: the software does not automatically decide whether the building contains a qualifying single unpartitioned large volume.
    - Non-qualifying path keeps `Ri = 1.0` and carries no unused `Aog` or `Vi` values.
    - Qualifying path requires positive source-referenced `Aog` and `Vi`.
    - Metric equation: `Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0`.
    - Conservative `Ri = 1.0` remains an explicit selectable path; the reduced value is never silently adopted.
    - Hand benchmark: `Vi = 6950 m³`, `Aog = 1.00 m²` gives `Ri = 0.8535533905932737` and adjusted `GCpi = ±0.4694543648263006` if the equation reduction is selected.
    - Validation protects applicability, equation output, selected factor, adjusted GCpi, source references, serialization, and downstream no-final-pressure boundaries.
    - Internal-pressure velocity selection, external pressure coefficients, effective wind area, field/edge/corner geometry, pressure combination, load combinations and final code-pressure routing remain blocked.
  - [ ] Implement and independently benchmark internal-pressure velocity-pressure selection/term after PR #120 is merged.
  - [ ] Add external pressure coefficients, effective wind area, field/edge/corner geometry, load combinations and final code-pressure routing only through their own source-backed gates.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.