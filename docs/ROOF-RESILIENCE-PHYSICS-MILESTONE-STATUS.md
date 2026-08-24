# Roof Resilience Physics Milestone Status

Status date: 2026-08-24

- [~] **M0 — Product cleanup / navigation:** primary workflow + Advanced/R&D hub implemented; legacy page-level navigation cleanup and first-time-user responsive QA remain.
- [x] **M1 — C-Purlin Gravity + Wind Physics Bench:** core solver, animation/video and browser regression implemented; permanent gross-section/cold-formed boundaries remain explicit.
- [x] **M2 — Roof Bay Physics:** CLOSED after PR #112 final-head Engineering Checks passed and merged.
  - [x] PR #108 — two-rafter Roof Bay, tributary routing, reactions and conservation.
  - [x] PR #109 — selected purlin/tributary/reaction/formula trace, exploded load path and stable project JSON.
  - [x] PR #110 — custom/nonuniform purlin stations with exact physical tributary-band boundaries.
  - [x] PR #111 — Rafter A/B reaction diagrams with roof-normal/down-slope conservation.
  - [x] PR #112 — M3-ready pressure-zone schema/coordinate-frame placeholders with zero invented code zones.
  - [x] M2 exit gate: applied roof load and reactions conserve within numerical tolerance and the solver/visual paths share the same geometry.

- [x] **M3 — Code Wind / Roof Zoning:** CLOSED through PR #135; exact documentation-updated closure head passed 46/46 Engineering Checks and merged to `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc`.
  - [x] PRs #113–#124 — provenance, velocity pressure, accepted project/enclosure/roof inputs, GCpi/Ri foundation, effective wind area and exact symmetric-gable field/edge/corner geometry.
  - [x] PR #127 — external roof `GCp` selection per actual zone portion.
  - [x] PR #128 — external-only `qh × GCp`.
  - [x] PR #129 — low-rise Part 1 `p = qh[(GCp)-(GCpi)]` plus ±0.77 kPa directional design envelopes.
  - [x] PR #130 — exact physical code-pressure routing with piece/purlin/bay area-force-moment conservation.
  - [x] PR #131 — separate signed `W-TOWARD` / `W-AWAY` identities and source-backed W contributions.
  - [x] PR #132 — source-backed D/Lr companion actions; R remains `UNRESOLVED`.
  - [x] PR #133 — complete supported strength-action results with explicit Lr/R decision boundary.
  - [x] PR #134 — controlled code-derived Roof Bay activation with manual fallback and stale-state invalidation.
  - [x] PR #135 — independent end-to-end benchmark + exact tributary-band compatibility hardening; written M3 exit gate satisfied.
  - [!] Permanent post-M3 boundaries: purlin member capacity, roof-sheet/fastener/connection capacity, rafter/truss system analysis and cold-formed local/distortional/LTB design remain later milestones; rain `R` is never silently inferred as zero; authorized governing-code review remains required for project use.

- [~] **M4 — Roof Sheet + Fastener / Connection Layer:** ACTIVE.

  ### M4 physical fastener geometry
  - [x] **PR #136 — merged as `ec5e7c99994a4c5d52bdf2ad90a1790b13a8e181`.** Versioned `futoltech.roof-sheet-fastener-layout/1`; one explicit row per physical purlin; explicit along-span screw stations; midpoint screw tributary strips crossed with exact purlin bands; equal/irregular/custom layouts; exact area conservation; deterministic mutation/stale-project rejection; fastener capacity forced `UNRESOLVED`.
  - [x] PR #136 exact documentation-updated head passed the complete **46/46 Engineering Checks** suite before merge.
  - [!] Existing timber nail/bolt Connection Lab equations are not roofing self-drilling-screw capacity and must not be reused as such.

  ### M4 individual fastener pressure demand
  - [x] **PR #137 — merged as `6e5de1e29373c0657f7bb42fe16a415abca0229b`.** Versioned `futoltech.roof-fastener-code-pressure-demand-routing/1`.
  - [x] Requires both verified M3 `toward-surface` and `away-from-surface` routes plus the exact accepted #136 fastener layout.
  - [x] Every screw tributary rectangle is intersected with every active field/edge/corner pressure piece on the same purlin row.
  - [x] Multi-zone screw tributary rectangles preserve all overlap contributions instead of assigning one arbitrary zone.
  - [x] Each contribution retains zone/case identity and computes signed `F = p_design × A_overlap`.
  - [x] Per-fastener, row, zone and whole-bay area/force totals independently reconcile to the source M3 route.
  - [x] Equal and irregular fastener layouts plus exact purlin-band mismatch rejection are deterministic regressions.
  - [x] Fastener capacity stays `UNRESOLVED`; utilization is `null`; no sheet redistribution or capacity is inferred.
  - [x] PR #137 exact documentation-updated head passed the complete **46/46 Engineering Checks** suite before merge.

  ### M4 attachment-detail and capacity-evidence acceptance — PR #138 candidate
  - [x] Versioned `futoltech.roof-fastener-capacity-evidence/1` acceptance record.
  - [x] Accepted detail explicitly records roof-sheet product/profile/BMT/material Fy/Fu, purlin section/substrate BMT/material Fy/Fu, and self-drilling-screw geometry/material/attachment/penetration state with source references.
  - [x] Fastener system, purlin section and attachment position must match the exact accepted #136 layout.
  - [x] Installed thread penetration must meet an explicitly sourced minimum; insufficient installation penetration is rejected.
  - [x] Pull-out and pull-over evidence retain source/document/date, capacity value, capacity type and design basis without conversion.
  - [x] Nominal, ASD allowable, LRFD design, manufacturer-rated and ultimate-test references remain explicitly distinct.
  - [x] Pull-out applicability checks fastener identity/diameter, substrate BMT/Fu and minimum thread penetration.
  - [x] Pull-over applicability checks fastener identity, sheet product/profile, attachment position, bearing diameter and sheet BMT/Fu.
  - [x] Missing applicability stays `REFERENCE_ONLY_INCOMPLETE_APPLICABILITY`; supplied applicability that excludes the accepted detail fails visibly.
  - [x] Deterministic fingerprints and rebuild validation protect accepted detail/evidence against post-acceptance mutation.
  - [x] Regression capacities/properties are synthetic test fixtures only and are not production/product/project data.
  - [x] Demand/capacity basis alignment and pull-out/pull-over utilization remain unimplemented; all governing connection/roof PASS promotion remains blocked.
  - [x] Preliminary exact implementation head `8d71800b3d8e369b8aa721a89b3fa7b424557b87` passed the complete **46/46 Engineering Checks** suite.
  - [ ] PR #138 merge gate — all four authority records synchronized, then exact documentation-updated head must pass **46/46 Engineering Checks** before merge.

  ### Next M4 dependency
  - [ ] Align #137 individual screw demand with #138 pull-out/pull-over evidence only when evidence applicability is complete **and** demand/capacity design bases are compatible.
  - [ ] Never divide LRFD/strength demand by ASD allowable or ultimate-test reference capacity without an explicit source-backed basis conversion; unresolved basis compatibility must remain `UNRESOLVED`.
  - [ ] Compute pull-out/pull-over utilization only for eligible compatible evidence; retain mechanism identity and governing trace.
  - [ ] Later: fastener tension/shear and group action where justified, roof-sheet structural capacity, edge/corner densification scenarios, purlin-local effects, purlin-to-rafter cleat/bolt/weld demand/capacity and governing connection state.
  - [ ] M4 exit gate — no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md` before the next feature merge. Do not use chat memory as the implementation record.
