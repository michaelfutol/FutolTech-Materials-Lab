# FutolTech Structural Lab — Master Implementation Checklist

> Permanent source of truth for the evolution of the former Materials Lab / Native Structures codebase into **FutolTech Structural Lab**. Update this file in every milestone PR. Chat history is not the project record.

## Status legend

- [x] implemented and protected by regression / browser / print gates as applicable
- [~] implemented only as research, preliminary, or screening scope
- [ ] planned
- [!] intentionally blocked until required evidence or physics exists

## Non-negotiable doctrine

- [x] Public product: **FutolTech Structural Lab**
- [x] Subtitle: **Virtual Materials, Members & Connection Testing**
- [x] Company/report identity: **FUTOLTECH ENGINEERING AND PROJECT SYSTEMS**
- [x] Never invent missing strength, geometry, fold dimensions, mass, connection capacity, price, carbon data, or failure laws.
- [x] Keep material-property evidence separate from product availability observations.
- [x] Use honest result states: **PASS / PRELIM PASS / SCREENING / FAIL** plus **MEMBER FEASIBLE / INCOMPLETE** for Design Explorer solution completeness.
- [x] A dropdown entry is never proof that a product is design-ready.
- [x] Whole-building analysis remains outside the core role; Structural Lab is the component/material/connection/assembly physics and evidence engine.
- [ ] Unified evidence badge: measured / manufacturer-published / standard / peer-reviewed / provisional / unknown.

# Milestone scoreboard

1. [x] **Public rebrand** — Native Structures → FutolTech Structural Lab, URLs preserved.
2. [x] **PH catalog expansion 01/02** — angle bars, studs/furring records, SHS 100×100×2, existing C-purlins/pipes/H/RHS/SHS.
3. [x] **Connection Lab v1** — nail/bolt/steel-side-plate research screening with manual trace and real Chromium QA.
4. [x] **Run to Governing Limit v1** — stored event chronology + PAUSE / STEP / STOP; no fake fracture/post-buckling animation.
5. [x] **Assembly Lab v1** — 2–3 ply coco/timber bounded composite-action screening with explicit η, manual trace and real Chromium QA.
6. [x] **Design Explorer v2** — reverse member query + stock/splice planning + connection completeness + evidence-bounded Pareto alternatives.
7. [x] **Failure Physics v1** — event-linked interpretation and visuals for supported serviceability/reference/yield/ultimate/global-column threshold events, with real Chromium QA.
8. [ ] **Physical-Test Calibration v1 — NEXT ACTIVE** — CSV/raw-test import, predicted-vs-measured, bias/scatter.
9. [ ] **Frame Analyzer / NF-001** — 2D connected frame with spring connections and redistribution.
10. [ ] **FutolStructure / RPE interchange** — reusable component and failure-law objects.

# Protected foundation

- [x] Source-backed coco, selected Philippine timber, bamboo, and steel baseline datasets.
- [x] Beam FEM and column compression/global-buckling screening.
- [x] Direct Compare for 2–3 members under common conditions.
- [x] Direct Compare animated **Find last passing load**, including compression zero-rounding protection.
- [x] Philippine GI pipe catalog; SHS/RHS; JIS H starter catalog.
- [x] Philippine C-purlin catalog, gross-property SCREENING, 0°/90°/180°/270° orientation and real-browser figure/state QA.
- [x] PH angle-bar starter catalog from exact current handbook rows with published kg/m and 6 m stock.
- [x] Angle main-lab geometry/orientation and Direct Compare gross leg-axis SCREENING.
- [!] Angle compression blocked pending Ixy/principal-axis and flexural-torsional behavior.
- [x] SHS 100×100×2.0 mm supplier-handbook-confirmed with 6.483 kg/m; delivered grade/thickness still project-specific.
- [x] Metal stud and double-furring PH library records.
- [!] Stud/furring independent member capacity blocked until complete fold geometry/design basis is verified.
- [x] Stock & Splice demand/planning foundation.
- [x] Steel Yield experimental load/unload/residual-deformation module.
- [x] Concrete Slab Shoring experimental load-path module.
- [x] Design Explorer DE-002 solution-package layer over deterministic member recommender.
- [x] Design Explorer exposes minimum stock-piece/splice lower bounds and blocks splice-required options on unverified connection design.
- [x] Design Explorer Pareto view uses only available numeric metrics; price/carbon remain explicitly unavailable until verified data exists.
- [x] Failure Physics v1 interprets only stored governing-limit events; it does not infer unimplemented local or post-failure mechanisms.
- [x] Failure Physics low-load column view remains straight until a stored instability event is actually crossed.
- [x] FT-CS-01 branded Direct Compare report with manual section-property and bending-response trace.
- [x] Chromium PDF gate: logical report pages = physical pages; no blank/overflow sheets.
- [x] Assembly Lab ASSY-001 bounded elastic composite-action model with independent/full-composite stiffness bounds and explicit η evidence status.

# 1 — Material Intelligence

- [~] Material schemas already carry core E/strength/density/source fields, but are not yet fully unified.
- [ ] Canonical schema for E, G, density, tension, compression, bending, shear, bearing, proportional/yield/ultimate references.
- [ ] Moisture, temperature, corrosion/treatment and aging modifiers only when source-backed.
- [ ] Lower/mean/upper envelopes, sample count, COV and confidence interval where evidence supports them.
- [ ] Provenance ledger: citation, test standard, specimen basis, applicability boundary, date checked.
- [ ] User-measured specimen records with instrument/calibration metadata.

# 2 — Section & Product Digital Twin

- [~] Actual geometry, orientation, source, stock length, mass and analysis boundaries already exist across current section records.
- [ ] One canonical specimen object for material + exact geometry + orientation + product/source + condition + defects + treatment + confidence.
- [ ] Parametric families: rectangle, round, CHS, RHS/SHS, angle, channel, C/Z purlin, H/I/T, stud/track, hat/furring, built-up.
- [ ] Published A/I/Z/mass override when more authoritative than idealized geometry.
- [ ] Measured-thickness / corrosion-loss mode.
- [ ] Holes, notches, knots, splits, crush zones, welds and prior-splice annotations.
- [ ] Figure with centroid, principal axes, extreme fibres and dimensions.

# 3 — Universal Virtual Test Machine

- [x] Bending foundation.
- [x] Compression foundation.
- [x] Steel yield/unload experimental path.
- [x] **Run to Governing Limit v1** with stored serviceability/reference/yield/screening/rupture events as supported by evidence.
- [x] PAUSE / RESUME / STEP / STOP controls on governing-limit run.
- [ ] Tension.
- [ ] Shear.
- [ ] Torsion.
- [ ] Bearing / crushing.
- [ ] Combined axial + bending.
- [ ] Local plate/wall buckling and LTB where governing methods are implemented.
- [ ] Repeat-cycle and general unload/reload controls beyond the steel-yield module.
- [ ] Unified load-displacement/stress-strain/stiffness timeline chart.
- [!] Impact/dynamic loading waits for validated dynamic physics.

## Run-to-Governing-Limit v1 rules

- [x] Ordinary steel terminal = **first yield**, never mislabeled fracture.
- [x] C-purlin terminal = gross first-yield **SCREENING**; local/distortional/LTB/restraint can govern earlier.
- [x] Angle terminal = gross leg-axis first-yield **SCREENING**; principal-axis/torsional instability is not inferred.
- [x] Coco with published ultimate reference can cross serviceability/allowable events to **published rupture reference**; exact specimen fracture is not claimed.
- [x] Provisional timber without rupture evidence stops at last verified working reference.
- [x] Columns stop at earliest implemented adverse limit; post-buckling/crushing is not simulated.
- [x] Every visible event marker comes from a stored solver event.

# 4 — Failure Physics Lab — v1 COMPLETE / deeper mechanisms pending

- [x] Elastic/serviceability/yield/rupture-reference event concepts.
- [x] No decorative fake snapping, cracking or buckling.
- [x] Event-linked interpretation panel follows the latest crossed stored solver event.
- [x] Steel first yield is shown as yield onset, never fracture.
- [x] Published timber ultimate bending is shown as a rupture reference plane, never an invented crack path.
- [x] Global-column instability cue appears only after a stored governing/Euler instability event; pre-event column remains straight.
- [x] Compression-reference cue does not invent crushing or splitting.
- [x] Real Chromium gate verifies steel yield onset and low-load pre-instability column behavior.
- [ ] Steel local buckling, LTB, net section, bearing/tear-out, weld/bolt failure.
- [ ] Timber bending rupture damage law, shear, fibre crushing, splitting, bearing, withdrawal/pull-through.
- [ ] Bamboo splitting/crushing/bolt-bearing/confinement only after validation.
- [ ] Event chronology extended to damage → stiffness degradation → local failure → redistribution → residual/collapse where evidence/model supports it.
- [ ] Damage/failure animation beyond supported threshold cues only when tied to validated stored events.

# 5 — Connection & Splice Laboratory

## Completed v1 research screen

- [x] Smooth-nail withdrawal FPL reference equation and handbook reduction references.
- [x] Annular-thread maximum withdrawal research equation without invented allowable reduction.
- [x] Historic single-nail lateral proportional-limit reference only inside supported FPL hardwood/softwood ranges.
- [x] Coconut palm remains unclassified unless evidence justifies a mapping/calibration.
- [x] Nail penetration research guidance.
- [x] Bolt wood dowel-bearing parallel/perpendicular equations + Hankinson interpolation.
- [x] Bolt spacing, loaded-end and edge-distance research screens.
- [x] Wood-side and steel-side-plate concepts with figures and manual calculation trace.
- [x] Multi-fastener n×single-fastener result labeled arithmetic upper bound, not group design capacity.
- [x] Real Chromium nail → bolt → steel-side-plate interaction gate.

## Still required for design-capable Connection Lab

- [ ] Current governing NDS/AWC dowel-yield design modes and adjustment factors.
- [ ] Nailed/screwed/bolted timber group action, splitting, row effects and deformation compatibility.
- [ ] Steel strap/plate bearing, net section and tear-out.
- [ ] Welded and bolted steel splices.
- [ ] Sleeve joints for tubes/pipes.
- [ ] Post bases, anchors and hold-downs.
- [ ] Connection force–displacement / rotational-spring law, not capacity-only.
- [ ] Member-versus-connection governing comparison integrated with Direct Compare/Design Explorer.

# 6 — Assembly Lab — v1 COMPLETE / calibration bridge next

- [x] Built-up coco/timber beam v1 with 2–3 plies.
- [x] Lower bound: independent plies / no composite transfer.
- [x] Upper bound: fully bonded/full-composite gross section.
- [x] Intermediate **degree of composite action η** with explicit evidence status.
- [x] Until calibrated connection-slip stiffness exists, η is user/measured/research input and cannot be silently inferred from “nailed together.”
- [x] Effective stiffness trace: `EI_eff = EI_independent + η(EI_full − EI_independent)` for the v1 bounded model.
- [x] Compare deflection and stress bounds against independent and full-composite cases.
- [x] Figure shows physical plies and interfaces; stacked and side-by-side arrangements are distinct.
- [x] Real Chromium interaction gate checks η endpoints, 2/3-ply figures and side-by-side no-depth-leverage boundary.
- [ ] Connect later to Connection Lab spring/slip law so η can be derived rather than assumed.
- [ ] Extend after timber v1: double/triple columns, back-to-back/boxed C-purlins, built-up light-gauge studs/channels, truss panel, shore+bearer+joist, post+beam+brace.
- [x] Permanent rule: adjacency alone never proves composite action.

# 7 — Design Explorer v2 — COMPLETE FOUNDATION

- [x] Load-driven reverse query: required span/load → candidate member solutions.
- [x] Wrap member candidates in explicit member + stock/splice + connection-completeness solution packages.
- [x] Verified stock-length planning uses a minimum stock-piece lower bound; splice overlap/detail is not invented.
- [x] Splice-required options are **INCOMPLETE** until an applicable design-verified connection exists.
- [x] No-splice options are **MEMBER FEASIBLE**, not whole-detail PASS, because end/support connections remain outside scope.
- [x] Pareto frontier implemented for currently available quantitative metrics: purchased-stock mass, governing utilisation, splice count and stock waste.
- [x] Price and carbon explicitly report UNAVAILABLE instead of fabricating rankings.
- [x] Real Chromium gate verifies a long low-load timber case cannot be promoted past `SPLICE CONNECTION REQUIRED / UNVERIFIED`.
- [x] Classical deterministic structural solver remains verifier; QUBO/quantum may search but never replace physics.
- [ ] Add verified supplier price feeds/snapshots before enabling peso-cost ranking.
- [ ] Add product EPD/source-backed carbon data before carbon ranking.
- [ ] Add availability confidence/evidence dimension without converting weak observations into engineering strength evidence.
- [ ] Integrate design-capable Connection Lab capacities once implemented so a complete member+connection package can earn a higher status.

# 8 — Physical-Test Calibration — NEXT ACTIVE

- [ ] CSV/raw UTM or field-test importer.
- [ ] Predicted vs measured load-displacement/failure comparison.
- [ ] Sample count, bias, COV/scatter, confidence interval.
- [ ] Preserve raw data and original published properties; calibration never silently overwrites them.
- [ ] Version calibrated material/connection/composite-action models.

# 9 — Structural Forensics

- [ ] Failed-member intake: photos, geometry, support/load/connection, corrosion/defects.
- [ ] Ranked candidate failure-sequence hypotheses with evidence/confidence.
- [ ] Explicit boundary: investigation aid, not automatic legal causation opinion.

# 10 — Field Mode

- [ ] Mobile-first specimen capture and offline draft.
- [ ] Photo + manual/AR dimensions; image identification only as a candidate requiring verification.
- [ ] Optional privacy-aware GPS/timestamp.
- [ ] Push verified specimen into project inventory.

# 11 — Frames and System-Level Bridge

- [ ] 2D connected frame solver.
- [ ] P–Δ / geometric nonlinearity.
- [ ] Connection Lab spring joints.
- [ ] Progressive local release/redistribution and mechanism detection.
- [ ] Brace adviser.
- [ ] **NF-001:** 3 m × 3 m coconut-lumber wall-frame integrated benchmark.

# 12 — FutolTech Ecosystem Integration

- [ ] **Structural Lab → FutolStructure:** validated material/member/connection/assembly objects and alternatives.
- [ ] **FutolStructure → Structural Lab:** demand envelopes and critical specimens for deeper testing.
- [ ] **Structural Lab/FutolStructure → RPE:** component failure/degradation/residual laws for resilience simulations.
- [ ] **CODA:** governing-code compliance/citations remain a separate compliance layer.
- [ ] **SARA:** non-code standards/best-practice layer.
- [x] External specialist solvers may verify/extend physics but never become the source of material/product truth.

# Definition of DONE for every new product/feature

1. [ ] **Source** — exact source/document/date/claim recorded.
2. [ ] **Geometry** — no missing dimension silently assumed.
3. [ ] **Material** — grade/strength verified or explicitly UNKNOWN/PROVISIONAL.
4. [ ] **Physics** — equations + applicability boundary documented.
5. [ ] **Status** — PASS/PRELIM PASS/SCREENING/FAIL is honest.
6. [ ] **Visual** — figure/orientation matches solver state.
7. [ ] **Manual check** — important results independently traceable.
8. [ ] **Regression** — deterministic tests for data/equations.
9. [ ] **Browser** — real Chromium state test where warranted.
10. [ ] **Print** — critical output fits branded report without blank/overflow sheets.
11. [ ] **No regression** — protected benchmark cases remain green.
12. [ ] **Checklist** — this file updated before merge.

# Decision log

- 2026-08-18 — Scope officially exceeded “Native Structures”; public identity became **FutolTech Structural Lab**.
- 2026-08-18 — User requested the full ultimate roadmap rather than a reduced subset; execution proceeds milestone-by-milestone without treating chat memory as the plan.
- 2026-08-18 — Angle products use exact source-backed catalog rows only; no Cartesian inference from supplier range statements.
- 2026-08-18 — Metal studs/furring remain library-only until full folded geometry/design basis is verified.
- 2026-08-18 — SHS 100×100×2.0 mm upgraded from user observation to current supplier-handbook-confirmed market size; delivered certificate remains project-specific.
- 2026-08-18 — Connection Lab v1 intentionally uses public research/reference equations and spacing screens; full current code design remains a later layer.
- 2026-08-18 — Run-to-Governing-Limit v1 records only evidence-supported events and deliberately stops before unimplemented fracture/post-buckling physics.
- 2026-08-18 — Assembly Lab v1 uses bounded composite action. “Nailed together” is not automatically full composite; connection slip/evidence governs η.
- 2026-08-18 — Side-by-side equal-depth plies do not gain major-axis EI from composite action in ASSY-001; stacked-through-depth plies provide the meaningful bounded composite-action case.
- 2026-08-18 — Design Explorer v2 separates a structurally feasible member from a complete structural solution. Stock/splice and connection dependencies are explicit, and missing price/carbon evidence remains unavailable rather than estimated.
- 2026-08-18 — Failure Physics v1 visual state is driven only by crossed stored solver events. Steel Fy is yield onset, published timber ultimate is a reference rather than a predicted crack, and a column remains visually straight before an implemented instability threshold is crossed.
