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
8. [x] **Physical-Test Calibration v1** — evidence-preserving CSV intake, measured-vs-predicted response, sample statistics and versioned calibration packages.
9. [x] **Frame Analyzer / NF-001** — connected 2D frame, explicit spring/release states, elastic P–Δ, piecewise redistribution/mechanism detection and brace sensitivity.
10. [x] **FutolStructure / RPE interchange v1** — versioned component, demand, critical-specimen and evidence-bounded failure/RPE law exchange.
11. [x] **Roof Resilience Physics M2** — Roof Bay load routing, member selection/exploded trace, stable project JSON, custom/nonuniform purlin stations, reaction diagrams and M3-ready pressure-zone placeholders completed through PR #112 with the M2 exit gate green.
12. [~] **Roof Resilience Physics M3** — pressure derivation is implemented through the PR #129 net-pressure candidate: provenance → `qh` → project/pressure context → base/adjusted `GCpi` → purlin effective area → exact field/edge/corner geometry → external `GCp` → external `qh(GCp)` → low-rise `qh[(GCp)-(GCpi)]` raw cases and ±0.77 kPa minimum directional design envelopes. Current dependency is code-derived Roof Bay routing with exact force/reaction conservation, followed by traceable load-case identity and the M3 end-to-end exit benchmark.

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
- [x] Design Explorer Pareto view uses only available quantitative metrics; price/carbon remain explicitly unavailable until verified data exists.
- [x] Failure Physics v1 interprets only stored governing-limit events; it does not infer unimplemented local or post-failure mechanisms.
- [x] Failure Physics low-load column view remains straight until a stored instability event is actually crossed.
- [x] CAL-001 preserves original CSV and parsed raw fields in every versioned calibration package.
- [x] CAL-001 reports paired bias/MAE/RMSE plus specimen peak/failure scatter without silently mutating source properties.
- [x] NF-001 deterministic 2D frame solver reproduces a closed-form cantilever benchmark and distinguishes rigid, finite-spring and pin/release behavior.
- [x] NF-001 elastic P–Δ geometric-stiffness iteration reports convergence/amplification without claiming corotational, plastic-hinge or post-buckling response.
- [x] NF-001 piecewise-elastic connection redistribution uses only explicit moment thresholds/residual stiffness and surfaces singular mechanisms.
- [x] NF-001 Brace Adviser reports elastic drift sensitivity and brace axial demand only; brace capacity remains **UNRATED**.
- [x] Frame/brace semi-rigid properties are explicit user/research/CAL inputs and are never inferred from nail or bolt count.
- [x] Engineering CI exposes syntax, deterministic, each Chromium lab and PDF gates as separately auditable steps.
- [x] Structural Interchange v1 preserves source system, evidence/provenance, units, analysis boundaries and deterministic round-trip identity.
- [x] Structural Lab → FutolStructure component packages preserve material/section/member references and never upgrade sensitivity or SCREENING status.
- [x] FutolStructure → Structural Lab demand packages preserve signed P/V/M and case identity; critical-specimen requests are explicit selections, not automatic failure claims.
- [x] Structural Lab → RPE exports stored threshold events and marks post-threshold degradation/residual behavior **UNAVAILABLE** unless explicitly supplied/calibrated.
- [x] FT-CS-01 branded Direct Compare report with manual section-property and bending-response trace.
- [x] Chromium PDF gate: logical report pages = physical pages; no blank/overflow sheets.
- [x] Assembly Lab ASSY-001 bounded elastic composite-action model with independent/full-composite stiffness bounds and explicit η evidence status.

# 1 — Material Intelligence

- [~] Material schemas already carry core E/strength/density/source fields, but are not yet fully unified.
- [ ] Canonical schema for E, G, density, tension, compression, bending, shear, bearing, proportional/yield/ultimate references.
- [ ] Moisture, temperature, corrosion/treatment and aging modifiers only when source-backed.
- [~] Lower/mean/upper envelopes, sample count, COV and confidence interval now exist for CAL-001 supplied test samples; canonical material-record integration remains pending.
- [ ] Provenance ledger: citation, test standard, specimen basis, applicability boundary, date checked.
- [x] User-measured specimen/test records can be preserved with apparatus, instrument-calibration, operator and test-procedure metadata in CAL-001 packages.

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

# 8 — Physical-Test Calibration — v1 COMPLETE / parameter adoption bridge next

- [x] CSV/raw UTM or field-test importer with canonical required columns and optional prediction/event fields.
- [x] Measured-versus-predicted load–displacement overlay and paired bias/MAE/RMSE comparison.
- [x] Explicit source-marked failure rows remain separate from ordinary specimen peak-load statistics.
- [x] Sample count, sample SD, COV and 95% confidence interval where mathematically valid; Student-t is used for small samples.
- [x] Raw CSV and parsed raw fields are preserved in exported calibration evidence packages.
- [x] Metadata records target type/ID, procedure, laboratory, apparatus, instrument-calibration record, operator and notes.
- [x] Versioned calibration packages can target material, connection or composite-action models and are labeled **USER DATA / UNVERIFIED**.
- [x] Calibration output is additive and never silently overwrites published/source properties.
- [x] Real Chromium gate verifies known statistics and confirms measured-only data never receives invented prediction traces.
- [ ] Parameter fitting/adoption into canonical material/connection/assembly models requires a later explicit engineer-approved bridge.

# 9 — Structural Forensics

- [ ] Failed-member intake: photos, geometry, support/load/connection, corrosion/defects.
- [ ] Ranked candidate failure-sequence hypotheses with evidence/confidence.
- [ ] Explicit boundary: investigation aid, not automatic legal causation opinion.

# 10 — Field Mode

- [ ] Mobile-first specimen capture and offline draft.
- [ ] Photo + manual/AR dimensions; image identification only as a candidate requiring verification.
- [ ] Optional privacy-aware GPS/timestamp.
- [ ] Push verified specimen into project inventory.

# 11 — Frames and System-Level Bridge — v1 COMPLETE / deeper nonlinear connection physics pending

- [x] 2D connected frame solver with axial + Euler-Bernoulli bending DOFs and independent closed-form cantilever regression.
- [x] Rigid, true pin/moment-release and finite rotational-spring member ends.
- [x] Elastic P–Δ geometric-stiffness iteration with convergence and displacement-amplification reporting.
- [~] Connection-spring bridge accepts explicit kθ and optional thresholds from user/research/CAL evidence; Connection Lab does not yet generate a calibrated force–rotation law automatically.
- [~] Progressive connection release/redistribution and mechanism detection exist as a first-order piecewise-elastic threshold/degradation path; plastic rotation, hysteresis and nonlinear damage laws remain pending.
- [~] Brace Adviser v1 evaluates explicit diagonal E/A stiffness sensitivity and axial demand; brace/connection/gusset capacity remains **UNRATED**.
- [x] **NF-001:** 3 m × 3 m coconut-lumber wall-frame/portal integrated benchmark.
- [x] Fully released zero-energy joint-core rotation coordinates are treated as inactive DOFs when unloaded; a loaded disconnected DOF or actual singular structural state still fails visibly.
- [x] Real Chromium gates independently verify rigid, brace, semi-rigid, P–Δ and redistribution states in fresh browser sessions.

# 12 — FutolTech Ecosystem Integration — interchange v1 COMPLETE / broader orchestration pending

- [x] **Structural Lab → FutolStructure:** versioned material, section, member and optional connection/assembly/failure-law context objects with evidence and analysis boundaries preserved.
- [x] **FutolStructure → Structural Lab:** signed demand envelopes plus explicit critical-specimen requests for deeper component testing.
- [x] **Structural Lab/FutolStructure context → RPE:** component threshold/failure-law objects with degradation/residual behavior exported only when explicitly AVAILABLE.
- [x] Versioned interchange schema with source system, evidence/provenance, units, analysis boundary and unsupported-field handling.
- [x] Deterministic import/export/round-trip validation; unsupported schema/object types, malformed cross-references and duplicate IDs fail visibly.
- [ ] **CODA:** governing-code compliance/citations remain a separate compliance layer.
- [ ] **SARA:** non-code standards/best-practice layer.
- [x] External specialist solvers may verify/extend physics but never become the source of material/product truth.

# 13 — Roof Resilience Physics — M2 CLOSED / M3 ACTIVE

## M2 closed through PR #112

- [x] PR #108 — two-rafter Roof Bay, multiple purlins, tributary load routing, discrete reactions and vector conservation.
- [x] PR #109 — selectable purlin/tributary/reaction/formula trace, exploded load path and stable `futoltech.roof-bay-project/1` JSON.
- [x] PR #110 — optional custom/nonuniform purlin stations, exact physical tributary start/end boundaries, project round-trip and real-Chromium QA.
- [x] PR #111 — Rafter A/B reaction diagrams plus explicit roof-normal/down-slope conservation decomposition.
- [x] PR #112 — `futoltech.roof-pressure-zones/1` placeholder, roof-local coordinate frame and reserved field/edge/corner types with zero invented code zones.
- [x] Offset first/last purlins do not truncate roof demand: their tributary bands extend to the real 0 / roof-slope-length boundaries.
- [x] Base figure, selected-member overlay, rafter diagrams and conservation traces use the same solver geometry/load path.
- [x] Roof sheet, fastener, purlin-to-rafter connection and rafter/truss capacity remain explicitly **UNRESOLVED**.
- [x] M2 exit gate: reaction totals balance applied roof load within numerical tolerance and full final-head Engineering Checks are green.

## M3 active

- [x] PR #113 — code/version + wind-input provenance foundation.
- [x] PR #114 — benchmarked velocity-pressure chain; Exposure C / 8.82 m / 240 kph / Kzt 1.0 gives `Kz = 0.974820633`, `qh = 2.257467958862151 kPa` at full precision.
- [x] PR #115 — source-backed project wind-input acceptance, occupancy-to-map-figure gate, no embedded guessed wind map.
- [x] PR #116 — Roof Bay project-input UI/project JSON bridge while manual pressure remains active.
- [x] PR #117 — engineer-declared enclosure + source-backed roof/building geometry acceptance.
- [x] PR #118 — Roof Bay pressure-context UI/project JSON bridge.
- [x] PR #119 — base `GCpi`: open 0.00, enclosed ±0.18, partially enclosed ±0.55.
- [x] PR #120 — explicit partially enclosed large-volume `Ri` decision; benchmark `Ri = 0.8535533905932737` for `Vi=6950 m³`, `Aog=1.00 m²`.
- [x] PR #121 — reusable internal-pressure term foundation; current low-rise Part 1 path explicitly rejects the Part 3 opening-height `qi=qz` option.
- [x] PR #123 — roof-purlin C&C effective wind area kept separate from actual physical load area.
- [x] PR #124 — symmetric-gable 2B/2C zone geometry with exact field/edge/corner intersections and area conservation.
- [x] PR #127 — external roof `GCp` selection per actual zone piece; exact final-head Engineering Checks green and merged as `fce0c1e12535a9dca0d0eca44128204f9c913643`.
- [x] PR #128 — external-only `qh × GCp` per actual zone piece; exact final-head Engineering Checks green and merged as `3588219906b1171a348b5d4bf135e9476e1138db`.
- [x] PR #129 — `futoltech.wind-roof-net-pressure/1` low-rise Part 1 net-pressure implementation candidate.
- [x] PR #129 equation is `p = qh[(GCp)-(GCpi)]`; internal velocity basis is fixed at `qh`, and Part 3 opening-height `qi=qz` is blocked.
- [x] PR #129 enclosed cases use `GCpi = ±0.18`; partially enclosed cases require an exact PR #120 Ri decision record and use adjusted `GCpi` when reduction is selected.
- [x] PR #129 preserves every physical zone piece and the full external-sign × internal-sign raw case matrix before deriving directional design envelopes.
- [x] PR #129 enclosed field benchmark at `qh=2.257467958862151 kPa`: raw net `+0.4361292350490715`, `+1.2488177002394458`, `-2.294935139677715`, `-1.4822466744873406 kPa`; raw governing toward/away envelopes `+1.2488177002394458 / -2.294935139677715 kPa`.
- [x] PR #129 partially enclosed equation-Ri benchmark preserves `Ri=0.8535533905932737`, adjusted `GCpi=±0.4694543648263006`, and the complete raw case matrix.
- [x] PR #129 applies the **0.77 kPa minimum in either direction** only to directional net-design envelopes while retaining unfloored raw cases; a 60 kph regression yields exactly `+0.77 / -0.77 kPa` design envelopes.
- [x] PR #129 deterministic tests protect context/Ri linkage, raw and design values, serialization/mutation, Part 3 exclusion and downstream anti-promotion boundaries.
- [x] PR #129 preliminary implementation head passed the complete Engineering Checks suite after an unchanged rerun confirmed an unrelated legacy playback DOM-timing flake; this documentation-updated exact final head must also be fully green before merge.
- [!] Roof sheet and fastener effective areas remain unresolved and independent from the purlin effective area.
- [ ] **Current M3 slice after PR #129 merges:** route code-derived net design pressures into Roof Bay with explicit pressure-case identity and exact pressure-area → purlin-load → rafter-reaction conservation.
- [ ] Preserve field/edge/corner zone pieces; do not silently average them into one purlin pressure unless an explicit equivalent representation preserves total force and structural effect.
- [ ] Prove total applied code wind force equals routed purlin demand and Rafter A + Rafter B reactions within numerical tolerance.
- [ ] Keep manual-uniform and code-derived Roof Bay pressure modes visibly distinct until code routing is independently benchmarked and accepted.
- [ ] Add traceable wind load-case/load-combination identity through a separate source-backed gate; do not mix combination factors into pressure derivation.
- [ ] **M3 exit gate:** independent end-to-end benchmark from accepted project/site inputs → `qh` → `GCp/GCpi` → minimum-governed net zone pressure → purlin loads → rafter reactions, with all conservation checks and final-head QA green.

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
- 2026-08-18 — CAL-001 preserves raw test evidence, separates source-marked failure from ordinary peaks, reports transparent statistics, and exports additive versioned packages instead of silently rewriting canonical engineering properties.
- 2026-08-18 — NF-001 semi-rigid connection stiffness/capacity is never inferred from fastener count. Rigid/pin are explicit idealizations; finite kθ/thresholds are user/research/CAL inputs with evidence status.
- 2026-08-18 — NF-001 redistribution is piecewise elastic and may surface a mechanism; it does not invent plastic rotation, hysteresis or post-failure response.
- 2026-08-18 — Brace Adviser v1 is a system-stiffness/axial-demand sensitivity tool only. Brace capacity, buckling and gusset/connection design remain UNRATED.
- 2026-08-18 — A fully released, unloaded joint-core rotation may be an inactive zero-energy coordinate rather than a physical mechanism; loaded disconnected DOFs and actual singular structural systems still fail visibly.
- 2026-08-18 — Structural Interchange v1 uses versioned, deterministic solver-agnostic JSON with explicit source ownership, provenance, units and analysis boundaries. SCREENING/sensitivity evidence is never upgraded by exchange; RPE degradation/residual behavior remains **UNAVAILABLE** unless an explicit validated/calibrated source law supplies it.
- 2026-08-22 — Roof Resilience development uses `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` plus the dedicated status/checklist files as the execution source of truth. Each completed slice updates those records before merge.
- 2026-08-22 — M2 Roof Bay closed through PR #112 after the reaction-diagram and M3-ready pressure-zone placeholder slices passed full final-head Engineering Checks.
- 2026-08-22 — M3 begins with code/version provenance rather than equations. PR #113 identifies NSCP 2015 Volume 1, 7th Edition, 2nd Printing from public ASEP/DPWH evidence; its final-head Engineering Checks passed and it merged before equation work began.
- 2026-08-22 — PR #114 implements only the benchmarked velocity-pressure layer. The independent Exposure C / 8.82 m / 240 kph / Kzt 1.0 case reproduces Kz≈0.975 and q≈2.26 kPa, while map selection, Kzt derivation, pressure coefficients, roof zoning and final code pressure remain deliberately unimplemented.
- 2026-08-22 — PR #115 accepts project wind inputs only when their provenance is explicit. It validates occupancy-to-figure selection without embedding or reconstructing the NSCP wind maps, distinguishes code-map transcription from project-design-criteria/site-specific-study sources, keeps automatic terrain/Kzt inference plus final roof pressure blocked, passed final-head Engineering Checks and merged.
- 2026-08-22 — PR #116 brought the PR #115 acceptance contract into live Roof Bay/project JSON, kept accepted q visibly derived but non-final, preserved manual-uniform pressure, and passed dedicated browser plus full final-head Engineering Checks before merge.
- 2026-08-22 — PRs #117–#118 established source-backed enclosure/roof geometry and exposed that exact pressure context in Roof Bay/project JSON without automatic enclosure classification, coefficients or zones.
- 2026-08-22 — PRs #119–#121 completed reusable internal-pressure layers as separate auditable records: base `GCpi`, engineer-gated large-volume `Ri`, then velocity selection and signed pressure term. Procedure applicability remains separate; the Part 3 opening-height `qi=qz` option is not validly imported into the current Part 1 low-rise equation.
- 2026-08-22 — PR #121 exact final head passed the complete Engineering Checks suite after rerunning a legacy Chromium temp-profile cleanup flake; it squash-merged as `5acab72d3848ee1b3e55191560577dc965b15d08`.
- 2026-08-22 — PR #123 resolves only the current roof-purlin C&C target and coefficient-selection effective wind area. It keeps physical tributary/load area separate, makes one-third-span enlargement explicit and source-referenced, and leaves sheet/fastener area, zone geometry, external `GCp`, pressure combination and final code pressure blocked.
- 2026-08-22 — M3 sequencing is corrected so source-backed field/edge/corner zone geometry and physical purlin/tributary-band zone assignment precede external `GCp` lookup; zone-dependent coefficients will never be selected first and assigned a zone afterward.
- 2026-08-22 — PR #124 resolves that zoning dependency for an explicitly confirmed symmetric gable roof: whole-roof registration, the 27° figure-family split, horizontal-plan edge dimension `a`, `a/cos(θ)` roof-surface mapping, deterministic Zone 1/2/3 cells and exact purlin-band zone-area intersections are all separately conserved and regression protected.
- 2026-08-22 — PR #127 supersedes the conflicted PR #125 on the current Engineering Mode base and completes the external roof-purlin `GCp` selection layer.
- 2026-08-22 — Source verification distinguishes NSCP 207E.4 Part 1 (`h <= 18 m`) from Part 3 (`h > 18 m`): the current low-rise C&C net equation uses `qh[(GCp)-(GCpi)]`; opening-height `qi=qz` is a Part 3 option and is gated out.
- 2026-08-23 — PR #128 adds the independently benchmarked external-only `qh × GCp` layer per physical zone piece and leaves the 0.77 kPa minimum to net design pressure.
- 2026-08-23 — PR #129 adds the independently benchmarked low-rise net-pressure matrix and minimum directional envelopes while keeping load combinations and Roof Bay code-pressure routing as separate gates.