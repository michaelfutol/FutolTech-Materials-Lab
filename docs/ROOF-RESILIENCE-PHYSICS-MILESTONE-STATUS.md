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
  - [x] Internal-pressure velocity-pressure selection + signed `qi(GCpi)` term — PR #121.
    - `futoltech.wind-internal-pressure-term/1` follows the exact upstream coefficient chain.
    - Enclosed: `qi = qh` for positive and negative internal-pressure cases.
    - Partially enclosed negative internal pressure: `qi = qh`.
    - Partially enclosed positive internal pressure: explicit conservative `qi = qh` or source-referenced `qz` at the highest opening affecting positive internal pressure.
    - Highest-opening elevation is never inferred.
    - Partially enclosed records cannot bypass the explicit `Ri` record, including the conservative `Ri = 1.0` path.
    - Signed internal-pressure term is stored as `qi * (GCpi)` and is not prematurely combined with external pressure.
    - Open building remains zero internal term because `GCpi = 0`.
    - Deterministic recalculation protects `qh`, optional `qz`, `qi`, coefficient carry-through and `qi(GCpi)`.
    - Exact final head `9a458078f610a35a678213583f0f91462bba7dcb` passed the full Engineering Checks suite; PR #121 squash-merged as `5acab72d3848ee1b3e55191560577dc965b15d08`.
  - [ ] **Current:** implement a source-backed roof Components & Cladding design-target + effective-wind-area foundation before external `GCp` selection.
    - Keep coefficient-selection effective area distinct from the actual roof tributary/load-application area.
    - Do not make roof sheet, fastener and purlin targets share one coefficient path by default.
    - Any code-permitted effective-width treatment must remain explicit and evidence/engineer bounded; no silent beneficial enlargement.
  - [ ] Implement external roof pressure coefficients only after the supported target/effective area is resolved and independently benchmarked.
  - [ ] Implement field/edge/corner geometry, external-minus-internal pressure combination, load combinations and final code-pressure routing only through their own source-backed gates.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md` before the next feature merge. Do not use chat memory as the implementation record.