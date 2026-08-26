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
**Status: ACTIVE — PR #136/#137/#138/#139 are merged; PR #140 toward-surface support-contact demand routing is preliminary-green and awaiting authority-synchronized exact-final-head verification.**

### PR #136 — explicit roof-sheet fastener layout geometry — MERGED

Merged as `ec5e7c99994a4c5d52bdf2ad90a1790b13a8e181` after the documentation-updated exact head passed **46/46 Engineering Checks**.

Implemented:
- Versioned `futoltech.roof-sheet-fastener-layout/1` record.
- Exactly one explicit fastener row per physical purlin.
- Explicit screw x-stations along the rafter-to-rafter Roof Bay span.
- Midpoint tributary strips crossed with exact physical purlin tributary bands.
- Equal, irregular and custom/nonuniform purlin/fastener layouts preserve supplied geometry without silent regularization.
- Row-level and whole-Roof-Bay area conservation.
- Deterministic serialization, stored-geometry mutation rejection and stale-project invalidation.
- Fastener capacity remains forced to `UNRESOLVED`.
- Existing timber nail/bolt Connection Lab equations are explicitly not reused as roofing self-drilling-screw capacity.

### PR #137 — individual fastener code-pressure demand routing — MERGED

Merged as `6e5de1e29373c0657f7bb42fe16a415abca0229b` after the exact documentation-updated head passed **46/46 Engineering Checks**.

Implemented:
- Versioned `futoltech.roof-fastener-code-pressure-demand-routing/1` record.
- Consumes the exact accepted #136 fastener layout plus both verified M3 toward/away physical pressure routes; it does not recompute wind zoning or pressure.
- Requires exact Roof Bay span/slope-length, purlin labels, stations and tributary boundaries between fastener geometry and M3 pressure routing.
- Intersects every fastener tributary rectangle with each active M3 field/edge/corner pressure piece on the same row.
- A screw crossing a zone boundary preserves all physical overlap contributions instead of being assigned one arbitrary zone.
- Each contribution preserves zone/case identity and computes signed normal force `F = p_design × A_overlap`.
- Per-fastener tributary area, purlin-row area/force, field/edge/corner area/force and whole-bay area/force independently reproduce the source M3 route.
- Both toward-surface and away-from-surface demand maps stay distinct.
- Equal and irregular screw layouts are regression protected.
- Fastener `capacityStatus` remains `UNRESOLVED`; `utilization` remains `null`.
- Engineering-boundary record: `docs/M4_ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING.md`.

### PR #138 — attachment-detail + capacity-evidence acceptance — MERGED

Merged as `471a62cbe305e385a9542f9f3324e251c06a7981`. Exact documentation-updated head `5aabbb5f9bc2f795a73cffde13917a41484ee25a` passed **46/46 Engineering Checks** on an unchanged rerun after one unrelated legacy C-purlin V3 transient DOM-timing flake.

Implemented:
- Versioned `futoltech.roof-fastener-capacity-evidence/1` record.
- Accepts exact roof-sheet product/profile/BMT/material Fy/Fu and source references.
- Accepts exact purlin section/substrate BMT/material Fy/Fu and source references.
- Accepts exact self-drilling-screw system/diameter/thread/head-or-washer bearing geometry/drill point/material/attachment position and installation penetration references.
- Fastener ID, purlin section ID and attachment position must match the already-accepted #136 layout.
- Installed thread penetration must satisfy an explicitly sourced minimum.
- Pull-out/pull-over evidence stores source type, source/document/date, capacity value, capacity type, design basis and basis-source reference.
- Nominal, ASD allowable, LRFD design, manufacturer-rated, test-reference and unclassified bases remain distinct; #138 performs no factor conversion.
- Pull-out applicability requires explicit fastener identity/diameter, substrate BMT/Fu and minimum thread penetration coverage.
- Pull-over applicability requires explicit fastener identity, sheet product/profile, attachment position, bearing diameter and sheet BMT/Fu coverage.
- Missing applicability is retained only as `REFERENCE_ONLY_INCOMPLETE_APPLICABILITY`; supplied limits that exclude the actual attachment detail fail visibly.
- Deterministic fingerprints plus rebuild validation protect accepted detail/evidence from accidental post-acceptance mutation.
- Synthetic regression values are labeled test fixtures and are not manufacturer/product/project data.
- Capacity scope such as single-fastener versus assembly/group is not inferred.
- Engineering-boundary record: `docs/M4_ROOF_FASTENER_CAPACITY_EVIDENCE_ACCEPTANCE.md`.

### PR #139 — basis-compatible individual uplift utilization — MERGED

Merged as `91400114a54cc074d7763c7f5df4eb0f37165245`. Exact documentation-updated head `e819720a3d6699a7714b25390cc37688b191fcc9` passed the complete **46/46 Engineering Checks** suite with no rerun and no branch mutation.

Implemented:
- Versioned `futoltech.roof-fastener-capacity-utilization/1` record.
- Consumes exact #137 demand and #138 evidence/attachment records and verifies that both reference the same accepted roof-sheet fastener layout.
- Numerical evaluation is deliberately limited to `away-from-surface` individual-screw uplift.
- Each pull-out/pull-over mechanism requires complete #138 applicability, explicit source-backed `single-fastener` scope acceptance, and explicit demand/capacity basis compatibility before utilization exists.
- Current supported compatible ratio is LRFD demand / LRFD `design` capacity only.
- ASD allowable, nominal, manufacturer-rated, ultimate/test-reference and unresolved-basis values are not converted by assumption and remain blocked from utilization.
- Pull-out and pull-over remain separate mechanisms with retained evidence identity and separate utilization.
- Both mechanisms must be eligible before an individual screw receives a local uplift PASS/FAIL state; otherwise it remains `INCOMPLETE`.
- Toward-surface compression/bearing remained unresolved by #139.
- Group action, roof-sheet structural capacity, purlin-local effects and purlin-to-rafter capacity remain unimplemented.
- Even if all currently evaluated individual uplift screws pass, `roofSystemPass` remains forced to `null`.
- Deterministic regression proves both an eligible synthetic PASS case and a deliberately low eligible pull-over local FAIL case, while mutation/shortcut/whole-roof-promotion attempts are rejected.
- Engineering-boundary record: `docs/M4_ROOF_FASTENER_BASIS_COMPATIBLE_UTILIZATION.md`.

### PR #140 — roof-sheet → purlin support-contact demand routing — CANDIDATE

Implemented:
- Versioned `futoltech.roof-sheet-purlin-support-contact-demand-routing/1` record.
- Consumes the exact verified M4 #137 demand routing and its preserved M3 toward-surface route; it does not recompute wind pressure or zoning.
- Treats positive/toward-surface roof pressure as a **roof-sheet → purlin support-line resultant**, not as axial compression in each roofing screw.
- For each verified pressure piece, computes `w = p_design × pressure tributary width` and `F = w × spanwise segment length = p_design × area`.
- Preserves purlin label/station, exact tributary-band geometry, spanwise segment, field/edge/corner zone identity, zone number, minimum-pressure flag and governing raw pressure-case identity.
- Piece/row/zone/whole-bay area and normal-force totals reproduce the source M3 toward-surface route within engineering tolerance.
- The #137 toward-surface fastener partition is retained only as an independent conservation audit; screw spacing/count does not define the inward support-line resultant.
- Moving screw stations while preserving the physical roof/purlin pressure geometry does not change the inward support-line demand.
- Positive fastener cells cannot be promoted into screw axial-compression capacity/utilization.
- Exact local sheet-to-purlin contact footprint is `UNRESOLVED` because it depends on the actual panel profile and support detail.
- Roof-sheet positive-pressure bending/local capacity, local sheet bearing/crushing, purlin local bearing/web crippling, screw bearing/shear, group action, purlin member capacity and purlin-to-rafter capacity remain unresolved.
- `roofSystemPass` remains `null`; no toward-surface capacity or whole-roof PASS is created.
- Deterministic rebuild/serialization rejects altered support-line demand, fake capacity promotion and upstream-route mutation.
- Preliminary exact implementation head `884624fb69ec557f53ec50f9fd4775a00e3d156f` passed the complete **46/46 Engineering Checks** suite on an unchanged rerun after one unrelated legacy dedicated C-purlin playback DOM-timing flake.
- Engineering-boundary record: `docs/M4_ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING.md`.

Current PR #140 merge gate:
- all four permanent authority records synchronized;
- exact documentation-updated head must pass **46/46 Engineering Checks** again;
- only that exact green head may merge.

Current boundary:
- No numerical utilization is allowed merely because a capacity number exists.
- No LRFD/strength demand may be divided by ASD allowable or ultimate/test-reference capacity without explicit source-backed compatibility/conversion.
- No generic capacity may be inferred from screw count, screw label, purlin thickness or sheet thickness alone.
- Toward-surface support-line demand is now routed, but exact local contact/bearing capacity remains unresolved.
- Fastener tensile/shear capacity and interaction remain unresolved.
- Group action/redistribution remains unresolved.
- Roof-sheet structural capacity remains unresolved.
- Purlin-local fastener/contact effects and purlin-to-rafter cleat/bolt/weld capacity remain unresolved.
- No roof-system PASS exists from #136–#140 alone.

Next M4 dependency:
- Accept and evaluate source-backed roof-sheet positive-pressure/local support-contact limit states without inventing a contact footprint or borrowing uplift capacities.
- Add fastener group action/redistribution only from source-backed physics/evidence; `n × single-fastener` is not automatically a group design capacity.
- Add roof-sheet structural/pull-through/local capacity and edge/corner densification scenarios only from verified evidence/physics.
- Continue through purlin-local fastener/contact effects and purlin-to-rafter cleat/bolt/weld demand/capacity in physical load-path order.

M4 exit remains the roadmap rule: no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The M2/M3 project-data and load-path chain plus the active M4 attachment-demand/evidence/utilization/support-contact foundation provide the basis for the later transparent Three.js roof viewer, system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.
