# Roof Resilience Physics Milestone Status

Status date: 2026-08-26

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

  ### M4 attachment-detail and capacity-evidence acceptance
  - [x] **PR #138 — merged as `471a62cbe305e385a9542f9f3324e251c06a7981`.** Versioned `futoltech.roof-fastener-capacity-evidence/1` acceptance record.
  - [x] Accepted detail explicitly records roof-sheet product/profile/BMT/material Fy/Fu, purlin section/substrate BMT/material Fy/Fu, and self-drilling-screw geometry/material/attachment/penetration state with source references.
  - [x] Fastener system, purlin section and attachment position must match the exact accepted #136 layout.
  - [x] Installed thread penetration must meet an explicitly sourced minimum; insufficient installation penetration is rejected.
  - [x] Pull-out and pull-over evidence retain source/document/date, capacity value, capacity type and design basis without conversion.
  - [x] Nominal, ASD allowable, LRFD design, manufacturer-rated and ultimate/test references remain explicitly distinct.
  - [x] Pull-out applicability checks fastener identity/diameter, substrate BMT/Fu and minimum thread penetration.
  - [x] Pull-over applicability checks fastener identity, sheet product/profile, attachment position, bearing diameter and sheet BMT/Fu.
  - [x] Missing applicability stays `REFERENCE_ONLY_INCOMPLETE_APPLICABILITY`; supplied applicability that excludes the accepted detail fails visibly.
  - [x] Deterministic fingerprints and rebuild validation protect accepted detail/evidence against post-acceptance mutation.
  - [x] Regression capacities/properties are synthetic test fixtures only and are not production/product/project data.
  - [x] Capacity scope such as single-fastener versus assembly/group is deliberately not inferred by #138.
  - [x] Exact documentation-updated head `5aabbb5f9bc2f795a73cffde13917a41484ee25a` passed **46/46 Engineering Checks** on an unchanged rerun after one unrelated legacy V3 DOM-timing flake.

  ### M4 basis-compatible individual uplift utilization
  - [x] **PR #139 — merged as `91400114a54cc074d7763c7f5df4eb0f37165245`.** Versioned `futoltech.roof-fastener-capacity-utilization/1` record.
  - [x] Consumes the exact #137 demand route and #138 attachment/evidence record without recalculating wind pressure or evidence capacity.
  - [x] Numerical utilization is limited to `away-from-surface` individual-screw uplift in this slice.
  - [x] A pull-out or pull-over mechanism is eligible only when #138 applicability is complete, its source scope is explicitly accepted as `single-fastener`, and demand/capacity engineering bases are explicitly compatible.
  - [x] Current compatible numerical path is source-backed LRFD demand against LRFD `design` capacity only.
  - [x] ASD allowable, nominal, manufacturer-rated, ultimate/test-reference and unresolved-basis evidence stay blocked from a numerical ratio; no inferred conversion is allowed.
  - [x] Pull-out and pull-over remain separate mechanism records and retain evidence identity.
  - [x] Both mechanisms must be eligible before an individual screw receives a local uplift PASS/FAIL state; otherwise it remains `INCOMPLETE`.
  - [x] Toward-surface compression/bearing remains unresolved by #139.
  - [x] Group action, roof-sheet structural capacity, purlin-local effects and purlin-to-rafter capacity remain unimplemented.
  - [x] Even if all currently evaluated individual uplift screws pass, `roofSystemPass` remains forced to `null`.
  - [x] Exact documentation-updated head `e819720a3d6699a7714b25390cc37688b191fcc9` passed the complete **46/46 Engineering Checks** suite before merge.

  ### M4 toward-surface support-contact demand routing
  - [x] **PR #140 — merged as `dfe58947f09fbd214f590b999ac02886419677b6`.** Versioned `futoltech.roof-sheet-purlin-support-contact-demand-routing/1` record.
  - [x] Verified positive/toward-surface roof pressure is routed as a **roof-sheet → purlin support-line resultant**, not as axial compression in every roofing screw.
  - [x] Each verified pressure piece computes `w = p_design × pressure tributary width` and `F = w × segment length = p_design × area`.
  - [x] Purlin label/station, exact tributary band, span segment, zone cell/type/number, minimum-pressure flag and governing raw pressure-case identity are retained.
  - [x] Piece, purlin-row, zone and whole-bay area/normal-force conservation reproduce the accepted M3 toward-surface route.
  - [x] The #137 toward-surface screw tributary partition is retained only as a conservation audit; moving screw stations does not change the physical inward support-line demand.
  - [x] Positive-pressure screw cells cannot be promoted into screw axial-compression capacity/utilization.
  - [x] Local sheet-to-purlin contact footprint is explicitly `UNRESOLVED` because the exact panel profile/support detail governs it.
  - [x] Roof-sheet positive-pressure capacity, sheet bearing/crushing, purlin local bearing/web crippling, screw bearing/shear, group action, purlin member capacity and purlin-to-rafter capacity remain unresolved.
  - [x] `roofSystemPass` remains `null`; #140 is a demand-routing slice, not a capacity/PASS slice.
  - [x] Deterministic round-trip and mutation checks reject altered line demand, fake capacity promotion and upstream-route mismatch.
  - [x] Exact documentation-updated head `7fc6d10614e7304dedc0ccdb15ac3318c0f57b82` passed the complete **46/46 Engineering Checks** suite before merge.

  ### M4 roof-sheet positive-pressure capacity evidence
  - [x] **PR #141 — merged as `6d84e1be0db8853ae503603b96edfd099171faca`.** Versioned `futoltech.roof-sheet-positive-pressure-capacity-evidence/1` record.
  - [x] Reuses the exact accepted #138 roof-sheet product/profile/BMT/material detail.
  - [x] Accepts source-backed panel capacity evidence only for loading that pushes the panel `toward-support`.
  - [x] Preserves source/document/date, source load-category label, span type, support spacing, overhang condition, uniform-pressure capacity, capacity type/design basis, deflection limit when supplied and source-covered limit states.
  - [x] Product applicability checks exact product ID, profile ID, BMT, Fy and Fu.
  - [x] Missing required product applicability remains `REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY`; explicit mismatch fails visibly.
  - [x] `PRODUCT_APPLICABILITY_COMPLETE` is not promoted to project applicability: actual panel continuity, end laps, support spacing and span configuration remain unresolved.
  - [x] Project panel-span configuration, project span applicability, positive-pressure panel demand/utilization, exact local sheet-to-purlin contact capacity, purlin local bearing/web crippling, screw compression/bearing/shear and roof-system PASS remain unresolved.
  - [x] Nominal, allowable/ASD, LRFD design, manufacturer-rated and ultimate/test-reference evidence stays basis-distinct; no conversion is inferred.
  - [x] Deterministic regressions reject unsupported direction/category/span metadata, duplicate/nonpositive evidence, evidence/detail mutation and fake applicability/utilization/PASS promotion.
  - [x] Synthetic capacity values are test fixtures only and are not production/manufacturer/project data.
  - [x] Exact documentation-updated head `1e4843d061d7e6f1e6f503998e1c4726f2e32703` passed the complete **46/46 Engineering Checks** suite before merge.

  ### M4 explicit roof-sheet panel span / continuity / end-lap geometry — PR #142 candidate
  - [x] Versioned `futoltech.roof-sheet-panel-span-continuity/1` acceptance record implemented.
  - [x] Sheet structural span is measured upslope between successive physical purlin support lines crossed by one physical sheet piece; rafter-to-rafter width is not substituted.
  - [x] Explicit panel runs must partition the complete Roof Bay x-width without gaps or overlaps.
  - [x] Each physical piece preserves explicit y-limits/source reference and derives exact ordered support sequence, successive span lengths, span count and span type.
  - [x] A physical piece must cross at least two accepted purlins; out-of-domain pieces fail visibly.
  - [x] Adjacent physical pieces require positive geometric end-lap overlap; gaps and zero-overlap butt joints are rejected.
  - [x] Each end lap preserves physical piece identities, overlap interval/length, detail source and optional purlin support located inside the overlap.
  - [x] Separate physical pieces are never promoted to monolithic sheet continuity across an end lap.
  - [x] An end lap without an identified purlin support can remain recorded only as visibly unresolved/unrated.
  - [x] First/last purlin edge distances preserve eave/ridge overhang geometry without creating overhang capacity.
  - [x] Deterministic fingerprints/rebuild validation reject geometry/project-basis mutation and fake applicability/utilization/PASS promotion.
  - [x] Project capacity-evidence applicability, demand/capacity basis alignment, positive-pressure panel utilization, end-lap capacity, exact local contact, purlin local bearing/web crippling, screw compression/bearing/shear and roof-system PASS remain unresolved.
  - [x] Preliminary exact implementation/test/doc head `d10d3c5ea78fc7de94373b73ade5522596d74c5b` passed the complete **46/46 Engineering Checks** suite on an unchanged rerun after one unrelated legacy C-purlin Polish V3 null-DOM timing flake.
  - [ ] PR #142 merge gate — all four authority records synchronized, then exact documentation-updated head must pass **46/46 Engineering Checks** before merge.

  ### Next M4 dependency
  - [ ] Compare each #142 physical sheet piece against #141 evidence: exact span type, every actual support spacing, load direction/category and relevant roof-edge/overhang condition.
  - [ ] Only rows with explicit product + project applicability may advance to later demand/capacity basis alignment and utilization.
  - [ ] Do not extend continuity through end laps unless an explicit validated model supports it; unsupported/unresolved lap conditions remain blockers.
  - [ ] Resolve exact local sheet-to-purlin contact/bearing only from explicit applicable evidence/physics; do not infer contact footprint from sheet thickness.
  - [ ] Add source-backed fastener group action/redistribution only when justified; never infer group capacity as `n × single-fastener`.
  - [ ] Add purlin-local fastener/contact effects and purlin-to-rafter cleat/bolt/weld demand/capacity in physical load-path order.
  - [ ] M4 exit gate — no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md` before the next feature merge. Do not use chat memory as the implementation record.