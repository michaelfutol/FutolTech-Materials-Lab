# FutolTech Roof Resilience Physics — Implementation Status

Status date: 2026-08-26

This file records implementation status only. The governing roadmap and milestone exit gates remain in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`.

## M0 — Product cleanup and navigation architecture
**Status: ACTIVE / foundation implemented.**

Implemented:
- Persistent primary workflow navigation: Home → Materials Comparison → C-Purlin Test → Roof Load Cases → Roof Bay → Advanced / R&D.
- Dedicated Advanced / R&D hub so specialist utilities can be grouped without becoming the main workflow.
- Generic Material Comparison and specialist C-purlin experience remain separated.
- Generic synchronized playback has a full-width row and 8/16/24-second recording, with 16 seconds as the default slow recording contract.
- Test Data Validation / Calibration remains an Advanced/R&D capability with a soft access gate on public GitHub Pages.
- FutolTech Engineering Mode v1 is the shared static engineering UI identity; time-of-day ambience/living-object overlays are explicitly excluded from engineering apps.

Still required before M0 exit:
- Audit/simplify legacy page-level status-pill clusters so they show state rather than becoming a second navigation system.
- Standardize HOME behavior/labels on remaining older pages.
- First-time-user navigation QA across desktop/mobile widths.

## M1 — C-Purlin Gravity + Wind Physics Bench
**Status: CORE IMPLEMENTED / continuing validation and polish.**

Implemented:
- Gravity, wind and combined load modes plus governing pressure workflows.
- Roof-slope decomposition and C-section orientation mapping.
- Gross-section UDL moment, deflection and biaxial stress screening.
- Yield sequencing, synchronized visualization and WebM recording.
- PaperMatte / Lab Dark visualization and real-browser regression gates.

Permanent current boundary:
- Gross-section screening only; no effective-width, local/distortional/LTB or connection-capacity claim.

## M2 — Roof Bay Physics (2D / 2.5D)
**Status: CLOSED — current M2 scope passed its exit gate and merged through PR #112.**

Completed chain:
- PR #108 — two adjacent rafter lines, multiple purlins, exact tributary routing, manual gravity/wind area pressure, purlin reactions and vector conservation.
- PR #109 — selectable purlin/tributary/reaction/formula trace, exploded load path and stable `futoltech.roof-bay-project/1` project JSON.
- PR #110 — custom/nonuniform purlin stations with exact physical tributary boundaries and project round-trip.
- PR #111 — separate Rafter A/B reaction diagrams plus roof-normal/down-slope conservation decomposition.
- PR #112 — stable `futoltech.roof-pressure-zones/1` placeholder and roof-local coordinate frame with zero invented M3 code zones.

Permanent M2 boundaries:
- Roof sheet, fasteners, purlin-to-rafter connection and rafter/truss capacity remain unresolved until their later verified layers.
- Manual-uniform pressure remains a valid distinct mode after M3; it is never silently replaced.
- M2 exit: applied roof load and reaction totals conserve within numerical tolerance; solver/visual paths use the same geometry.

## M3 — Code Wind / Roof Zoning Engine
**Status: CLOSED — written M3 scope and independent exit benchmark passed exact-final-head 46/46 Engineering Checks and PR #135 merged to `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc`.**

### Completed M3 foundation

- **PR #113 — code/version + provenance:** source-backed NSCP 2015 Volume 1, 7th Edition, 2nd Printing profile and versioned wind-design basis.
- **PR #114 — velocity-pressure chain:** deterministic `qz = 0.613 Kz Kzt Kd V²`; benchmark Exposure C / `h=8.82 m` / `V=240 kph` / `Kzt=1.0` gives `qh = 2.257467958862151 kPa`.
- **PR #115 — project wind-input acceptance:** site/occupancy/wind-speed/exposure/Kzt/height acceptance with explicit provenance and no guessed embedded wind map.
- **PR #116 — project integration:** accepted wind inputs exposed in Roof Bay/project JSON while manual pressure remains a separate path.
- **PRs #117–#118 — pressure context:** engineer-declared enclosure plus source-backed roof/building geometry acceptance and Roof Bay/project JSON linkage.
- **PR #119 — base `GCpi`:** open `0.00`, enclosed `±0.18`, partially enclosed `±0.55` foundation.
- **PR #120 — large-volume `Ri`:** explicit engineer-gated partially enclosed reduction path; benchmark `Ri=0.8535533905932737` for `Vi=6950 m³`, `Aog=1.00 m²`.
- **PR #121 — internal-pressure term:** reusable velocity-selection/signed internal-pressure foundation; Part 3 opening-height `qi=qz` remains prohibited from the current low-rise Part 1 path.
- **PR #123 — purlin C&C effective wind area:** physical load area and coefficient-selection effective wind area remain separate.
- **PR #124 — symmetric-gable zone geometry:** whole-roof registration, exact field/edge/corner purlin-band intersections, 2B/2C slope-family split and area conservation.

### Completed M3 pressure chain

- **PR #127 — external roof `GCp`:** exact zone/effective-area coefficient selection.
- **PR #128 — external `qh × GCp`:** exact accepted mean-roof-height `qh` times external coefficient; ±0.77 kPa floor deliberately not applied at this external-only stage.
- **PR #129 — low-rise Part 1 net roof pressure:** `p = qh[(GCp)-(GCpi)]`, complete raw external/internal sign matrix, and ±0.77 kPa minimum applied only to governing directional design envelopes.

### Completed physical routing and structural-action chain

- **PR #130 — exact Roof Bay pressure routing:** one verified net-pressure record per physical purlin band; each field/edge/corner intersection remains an exact rectangle; `F=pA`; Rafter A/B from actual spanwise resultant; area/force/moment conservation at piece, purlin and bay levels.
- **PR #131 — signed W identity:** separate `W-TOWARD` / `W-AWAY` actions plus source-backed W factors for supported strength templates.
- **PR #132 — companion actions:** D and Lr routed through the same physical geometry; purlin self-weight kept separately sourced inside D; L/H only as explicit target-specific zero/not-applicable decisions; R remains `UNRESOLVED`.
- **PR #133 — source-backed complete strength action results:** preserves six template × signed-W identities; unresolved R blocks 203-3/203-4; explicit engineer-sourced R-not-applicable decision releases the accepted Lr path; exact force/moment/purlin conservation remains protected.
- **PR #134 — controlled code-derived Roof Bay activation:** selects only a complete equilibrium-verified #133 result; exact accepted project/context compatibility; explicit self-weight/section evidence; no duplicate pressure/combination model; project JSON attachment; stale-input invalidation; manual-uniform M2 fallback preserved.

### M3 exit audit — PR #135

Completed and merged:
- Hardened `futoltech.roof-bay-code-derived-activation/1` so physical compatibility requires not only purlin station identity but exact derived tributary-band `stationM/startM/endM/widthM` identity.
- Added an adversarial fully valid upstream M3 chain with unchanged purlin stations but deliberately shifted tributary boundaries; activation rejects it as a different physical load-area geometry.
- Added an independent deterministic exit audit which manually re-evaluates the complete accepted chain from Kz/qh through controlled activation.
- Exact documentation-updated PR #135 closure head passed the complete **46/46 Engineering Checks** suite and merged to `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc`.
- Public audit/boundary record: `docs/M3_END_TO_END_EXIT_AUDIT.md`.

### Permanent post-M3 boundaries

- Code-derived piecewise purlin stress/deflection and member capacity remain unresolved.
- Roof-sheet, fastener, cleat/weld and purlin-to-rafter connection capacity remain unresolved and belong to M4/later verified layers.
- Rafter/truss/system interaction belongs to M6.
- Cold-formed effective-width/local/distortional/LTB design belongs to M7.
- Rain load `R` remains unimplemented; absence is never interpreted as zero. Lr alternatives require the explicit engineer-sourced R-not-applicable decision contract.
- Public project calculations remain cross-checks only; `authorizedCopyReviewRequired=true` remains permanent for project use.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: ACTIVE — PR #136–#141 are merged; PR #142 explicit panel span/continuity/end-lap configuration is preliminary-green and awaiting authority-synchronized exact-final-head verification.**

### PR #136 — explicit roof-sheet fastener layout geometry — MERGED

Merged as `ec5e7c99994a4c5d52bdf2ad90a1790b13a8e181` after the documentation-updated exact head passed **46/46 Engineering Checks**.

Implemented:
- Versioned `futoltech.roof-sheet-fastener-layout/1` record.
- One explicit fastener row per physical purlin, explicit screw x-stations and midpoint tributary strips crossed with exact purlin bands.
- Equal, irregular and custom/nonuniform layouts preserve supplied geometry without silent regularization.
- Row/whole-bay area conservation, deterministic serialization, stored-geometry mutation rejection and stale-project invalidation.
- Fastener capacity remains `UNRESOLVED`; timber nail/bolt Connection Lab equations are not reused as roofing screw capacity.

### PR #137 — individual fastener code-pressure demand routing — MERGED

Merged as `6e5de1e29373c0657f7bb42fe16a415abca0229b` after the exact documentation-updated head passed **46/46 Engineering Checks**.

Implemented:
- Versioned `futoltech.roof-fastener-code-pressure-demand-routing/1` record.
- Exact accepted #136 fastener geometry consumes both verified M3 toward/away physical pressure routes without recomputing zoning/pressure.
- Every screw tributary rectangle is intersected with active field/edge/corner pieces; multi-zone screw contributions remain separate.
- Each contribution preserves zone/case identity and signed `F = p_design × A_overlap`.
- Screw/row/zone/bay area/force totals conserve back to source M3.
- Capacity/utilization remains unresolved.

### PR #138 — attachment-detail + capacity-evidence acceptance — MERGED

Merged as `471a62cbe305e385a9542f9f3324e251c06a7981`. Exact documentation-updated head `5aabbb5f9bc2f795a73cffde13917a41484ee25a` passed **46/46 Engineering Checks** on an unchanged rerun after one unrelated legacy C-purlin V3 transient DOM-timing flake.

Implemented:
- Versioned `futoltech.roof-fastener-capacity-evidence/1` record.
- Exact roof-sheet, purlin substrate and self-drilling-screw attachment detail with source references and penetration requirement.
- Pull-out/pull-over evidence keeps source, applicability, capacity type and basis distinct.
- Missing applicability stays reference-only; explicit mismatch fails; deterministic fingerprints prevent mutation.
- Capacity scope such as single-fastener versus assembly/group is not inferred.

### PR #139 — basis-compatible individual uplift utilization — MERGED

Merged as `91400114a54cc074d7763c7f5df4eb0f37165245`. Exact documentation-updated head `e819720a3d6699a7714b25390cc37688b191fcc9` passed the complete **46/46 Engineering Checks** suite.

Implemented:
- Versioned `futoltech.roof-fastener-capacity-utilization/1` record.
- Numerical evaluation limited to `away-from-surface` individual-screw uplift.
- Complete applicability + explicit source-backed `single-fastener` scope + explicit demand/capacity basis compatibility required before utilization.
- Current supported ratio is LRFD demand / LRFD `design` capacity only; no ASD/nominal/manufacturer/test shortcut conversion.
- Pull-out/pull-over remain separate and both must be eligible before local PASS/FAIL.
- Group action, roof-sheet structural capacity, purlin-local effects, purlin-to-rafter capacity and roof-system PASS remain unresolved.

### PR #140 — roof-sheet → purlin support-contact demand routing — MERGED

Merged as `dfe58947f09fbd214f590b999ac02886419677b6`. Exact documentation-updated head `7fc6d10614e7304dedc0ccdb15ac3318c0f57b82` passed the complete **46/46 Engineering Checks** suite before merge.

Implemented:
- Versioned `futoltech.roof-sheet-purlin-support-contact-demand-routing/1` record.
- Positive/toward-surface roof pressure is a **roof-sheet → purlin support-line resultant**, not axial compression in each roofing screw.
- For each verified piece: `w = p_design × pressure tributary width`, `F = w × segment length = p_design × area`.
- Exact purlin/tributary/segment/zone/raw-pressure identity and piece/row/zone/bay conservation are preserved.
- #137 positive screw cells remain a conservation partition only; changing screw stations does not change inward support-line demand.
- Exact local sheet-to-purlin contact footprint, panel positive-pressure capacity, sheet bearing/crushing, purlin local bearing/web crippling, screw bearing/shear, group action and downstream connection/system capacities remain unresolved.
- Engineering-boundary record: `docs/M4_ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING.md`.

### PR #141 — roof-sheet positive-pressure capacity-evidence acceptance — MERGED

Merged as `6d84e1be0db8853ae503603b96edfd099171faca` after exact documentation-updated head `1e4843d061d7e6f1e6f503998e1c4726f2e32703` passed the complete **46/46 Engineering Checks** suite.

Implemented:
- Versioned `futoltech.roof-sheet-positive-pressure-capacity-evidence/1` record.
- Reuses exact accepted roof-sheet product/profile/BMT/material detail from #138.
- Accepts source-backed panel capacity evidence only for loading that pushes the panel `toward-support`.
- Every row preserves source/document/date, original source load label, span type, support spacing, overhang condition, uniform pressure capacity, capacity type/design basis, optional sourced deflection limit and explicitly source-covered limit states.
- Product applicability is checked against product ID, profile ID, BMT, Fy and Fu.
- Missing required product applicability remains `REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY`; explicit mismatch fails visibly.
- Product applicability does not imply project applicability. Actual sheet continuity/end laps/support spacing/span configuration are deliberately not inferred from purlin geometry.
- `projectPanelSpanConfigurationStatus`, project span applicability, panel demand/utilization, exact local sheet-to-purlin contact capacity, purlin local bearing/web crippling, screw compression/bearing/shear and roof-system PASS remain `UNRESOLVED`.
- Nominal, allowable/ASD, LRFD design, manufacturer-rated and ultimate/test-reference values remain distinct; no conversion is inferred.
- Deterministic tests reject direction/category/span errors, duplicate/nonpositive evidence, applicability mismatch, evidence/detail mutation and fake project applicability/utilization/PASS promotion.
- Synthetic regression capacities are test fixtures only, not production manufacturer/project data.
- Engineering-boundary record: `docs/M4_ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_ACCEPTANCE.md`.

### PR #142 — explicit roof-sheet panel span / continuity / end-lap configuration — CANDIDATE

Implemented:
- Versioned `futoltech.roof-sheet-panel-span-continuity/1` acceptance record.
- Treats roof-sheet structural spans as **upslope distances between successive physical purlin support lines**, not the rafter-to-rafter Roof Bay x-span.
- Panel runs must partition the full Roof Bay width with no x-direction gaps or overlaps.
- Each physical sheet piece records its eave/ridge extent and source reference, then deterministically derives the exact purlin support sequence, successive support-span lengths, span count and span type.
- Continuity exists only inside one explicitly identified physical sheet piece across the supports it actually crosses.
- Adjacent physical sheet pieces require explicit positive end-lap overlap; a butt joint or gap is rejected.
- Every end lap records overlap geometry, lap length, detail source and optional identified purlin support inside the lap.
- An end lap between separate sheet pieces is a **monolithic-continuity break**; overlapping/fastening does not silently create continuous-sheet action.
- A missing lap-support purlin may be recorded but remains visibly unresolved/unrated.
- Nonuniform/custom purlin stations are regression protected; floating-point comparison uses engineering tolerance rather than decimal-string equality.
- Deterministic validation rejects run gaps/overlaps, sheet-piece gaps/butt joints, incorrect lap length, unknown/out-of-lap supports, insufficient supported span geometry, stored-span mutation and fake project-applicability/utilization/PASS promotion.
- Preliminary exact implementation/test/doc head `d10d3c5ea78fc7de94373b73ade5522596d74c5b` passed the complete **46/46 Engineering Checks** suite on an unchanged rerun after one unrelated legacy C-purlin V3 transient DOM-timing flake.
- Engineering-boundary record: `docs/M4_ROOF_SHEET_PANEL_SPAN_CONTINUITY_ACCEPTANCE.md`.

Current PR #142 merge gate:
- all four permanent authority records synchronized;
- exact documentation-updated head must pass **46/46 Engineering Checks** again;
- only that exact green head may merge.

Current boundary:
- No numerical utilization is allowed merely because a panel capacity row exists or project span geometry is now known.
- #142 does not select a #141 capacity row and does not decide project capacity-evidence applicability.
- End-lap strength and continuity across separate sheet pieces remain unrated unless a later explicit applicable model/evidence supports them.
- Exact local sheet-to-purlin contact footprint/stress remains unresolved unless explicitly source-backed.
- Purlin local bearing/web crippling remains in the purlin-capacity layer; it is not hidden inside a roofing screw check.
- Fastener group action, screw tension/shear interaction and purlin-to-rafter cleat/bolt/weld capacity remain unresolved.
- No roof-system PASS exists from #136–#142 alone.

Next M4 dependency:
- Compare each exact project sheet-piece span type, every actual support spacing and relevant edge/overhang condition against accepted #141 source applicability.
- Only explicit product + project applicability may proceed to demand/capacity basis alignment and later positive-pressure utilization.
- Resolve exact local contact/bearing only where explicit applicable evidence/physics exists.
- Continue through fastener group action, purlin-local effects and purlin-to-rafter connection checks in physical load-path order.

M4 exit remains the roadmap rule: no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The M2/M3 project-data and load-path chain plus the active M4 geometry/demand/evidence/utilization/support-contact/panel-evidence foundations provide the basis for the later transparent roof viewer, system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.