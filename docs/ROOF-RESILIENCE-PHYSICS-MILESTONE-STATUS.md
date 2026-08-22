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
  - [x] Large-volume partially enclosed reduction factor (`Ri`) applicability + equation — PR #120.
  - [x] Internal-pressure velocity-pressure selection + signed `qi(GCpi)` term — PR #121.
  - [x] Roof-purlin Components & Cladding target + effective-wind-area foundation — PR #123.
    - Schema: `futoltech.wind-roof-purlin-effective-area/1`.
    - Target is explicitly `roof-purlin` under Components & Cladding; no MWFRS substitution.
    - Actual load area = purlin span × actual tributary width.
    - Coefficient-selection effective area = purlin span × explicitly selected effective width.
    - Supported selections: actual tributary width or source-referenced one-third-span minimum `max(actual width, span/3)`.
    - Enlarging the coefficient-selection area never changes the physical tributary/load-application area.
    - 4.0 m × 1.0 m benchmark: actual area = 4.0 m²; one-third-span coefficient area = 5.333333333... m².
    - Roof sheet and fastener effective areas remain unresolved; fasteners cannot inherit purlin area.
    - External `GCp`, code zones, pressure combination, load combinations, purlin capacity promotion and final Roof Bay code pressure remain blocked.
  - [x] Source-backed symmetric-gable field/edge/corner zone geometry + physical purlin tributary-band zone intersections — PR #124 implementation candidate.
    - Schema: `futoltech.wind-roof-zone-geometry/1`.
    - Roof Bay placement is explicitly registered within whole-roof ridge-parallel coordinates; no local-bay zone guessing.
    - Gable figure family preserves the 27° split: `207E.4-2B` for `7° < θ <= 27°`; `207E.4-2C` for `27° < θ <= 45°`.
    - Edge dimension `a` is resolved in horizontal plan from the accepted least horizontal dimension and source-backed applicable height; low-slope cases require eave height.
    - The eave strip is mapped onto the sloping roof surface as `a/cos(θ)`.
    - Zone 1/field, Zone 2/edge and Zone 3/corner use deterministic non-overlapping roof-surface cells.
    - A purlin tributary band may retain separate field/edge/corner intersection areas; no convenient whole-member zone label is substituted.
    - Every band and the complete Roof Bay preserve area conservation and deterministic round-trip/mutation protection.
    - Overhangs, external `GCp`, roof-sheet/fastener effective area, pressure combination and final code-derived Roof Bay pressure remain blocked.
    - Preliminary implementation head passed the complete Engineering Checks suite; this documentation-updated exact head must also be fully green before PR #124 merge.
  - [ ] **Current:** implement source-backed external roof `GCp` selection using roof form/slope + PR #124 zone identity/intersection + PR #123 purlin effective wind area together.
    - Do not apply one convenient `GCp` to a purlin band crossing multiple zones.
    - Preserve the exact applicable figure/rule, coefficient-selection area and any interpolation/substitution trace.
    - Keep roof-sheet and fastener effective areas separate and unresolved.
  - [ ] Implement external pressure term only after the supported external `GCp` layer is independently benchmarked.
  - [ ] Implement external-minus-internal pressure combination, load combinations and final code-pressure routing only through their own source-backed gates.
- [ ] **M4 — Roof Sheet + Fastener / Connection Layer:** reusable Connection Lab foundations exist; Roof Bay integration remains unresolved.
- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md` before the next feature merge. Do not use chat memory as the implementation record.