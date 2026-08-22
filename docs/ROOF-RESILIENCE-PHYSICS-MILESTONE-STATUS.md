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
  - [x] Enclosure + roof/building geometry input acceptance — PR #117; final-head Engineering Checks passed and PR merged.
    - Adds versioned `futoltech.wind-pressure-context-acceptance/1` records on top of a valid upstream accepted wind-project record.
    - Stores only the NSCP enclosure classification family `enclosed`, `partially-enclosed`, `open`; classification remains an engineer-declared project input, not an automatic code-definition result.
    - Requires separate enclosure-classification and building-envelope-opening assessment references.
    - Requires source-referenced roof form, plan length, plan width, mean roof height and roof slope.
    - Mean roof height must match the upstream accepted wind-project height.
  - [x] Roof Bay pressure-context acceptance + project JSON integration — PR #118; dedicated V9 Chromium gate, deterministic tests and complete final-head Engineering Checks passed before merge.
    - Exposes the pressure-context contract directly in Roof Bay only after accepted upstream wind inputs exist.
    - Mean roof height/source is inherited from the accepted wind-project record; pressure-context roof slope must match active Roof Bay slope.
    - Overall building plan dimensions remain explicit building-level inputs and are not inferred from bay dimensions.
    - Project JSON may embed `windPressureContextAcceptance` only with its exact upstream accepted wind-project record.
    - Editing accepted upstream wind inputs or active roof slope invalidates downstream context acceptance.
    - `pressureZoning.activePressureModel` remains `manual-uniform`, `codeBasis` remains null, regions remain empty, and `analysisBoundary.codeWindZoning` remains `UNRESOLVED`.
  - [~] Source-backed base internal-pressure coefficient (`GCpi`) foundation — PR #119 candidate.
    - New versioned `futoltech.wind-internal-pressure-coefficient/1` record attaches to the exact accepted pressure-context record.
    - Implements NSCP 2015 Section 207A.11.1 / Table 207A.11-1 base cases only: open `0.00`, enclosed `+0.18/-0.18`, partially enclosed `+0.55/-0.55`.
    - Preserves positive and negative internal-pressure cases separately.
    - Partially enclosed buildings remain blocked behind unresolved Section 207A.11.1.1 large-volume reduction-factor (`Ri`) applicability; `Ri` is not guessed or applied.
    - Explicit future project facts are required before `Ri` can be resolved: qualifying single unpartitioned volume, total envelope opening area, and unpartitioned internal volume.
    - Deterministic tests protect the table values, exact upstream enclosure attachment, round-trip serialization, and no-premature `Ri`/final-pressure promotion.
    - Internal-pressure velocity selection, external pressure coefficients, effective wind area, field/edge/corner geometry, load combinations and final code-pressure routing remain blocked.
  - [ ] Resolve and benchmark the large-volume `Ri` applicability/calculation path before partially enclosed GCpi can advance.
  - [ ] Add external pressure coefficients, effective wind area, field/edge/corner geometry, load combinations and final code-pressure routing only through their own source-backed gates.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard and `STATUS-ROOF-RESILIENCE.md` before merge. Do not use chat memory as the implementation record.