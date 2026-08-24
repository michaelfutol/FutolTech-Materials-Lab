# FutolTech Roof Resilience Physics — Implementation Status

Status date: 2026-08-24

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
- Added an independent deterministic exit audit which manually re-evaluates:
  - Exposure-C Kz and `qh = 0.613 Kz Kzt Kd V²`;
  - Figure 207E.4-2B `GCp` log-area curves/plateaus;
  - every `qh[(GCp)-(GCpi)]` raw pressure;
  - ±0.77 kPa governing directional envelopes;
  - every physical `F=pA` piece, Rafter A/B reaction and applied moment;
  - D and Lr vertical totals plus 25° roof-normal/down-slope resolution;
  - selected `NSCP-203-4` away action result as `1.2D + 1.0W + 0.5Lr`; and
  - final controlled Roof Bay activation of the exact audited complete result.
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
**Status: ACTIVE — first geometry/evidence foundation is a green PR #136 candidate; final documentation-updated merge gate remains.**

### PR #136 — explicit roof-sheet fastener layout geometry foundation

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
- Preliminary exact implementation head `d60aa4e78e4d7aaebcd8cba82be0034d672b5f96` passed **46/46 Engineering Checks** after replacing one binary floating-point deep-equality assertion with the existing `1e-12` engineering-tolerance comparison. Geometry and conservation results were unchanged.

Current boundary:
- No M3 pressure-to-fastener routing yet.
- No roof-sheet demand/capacity.
- No screw pull-out, pull-over, bearing or group capacity.
- No purlin-local fastener effect or purlin-to-rafter cleat/bolt/weld capacity.
- No roof-system PASS may be inferred from accepted fastener geometry.

Next M4 dependency:
- Intersect verified M3 field/edge/corner pressure pieces with each accepted fastener tributary rectangle.
- Derive individual signed screw demand and row/whole-bay totals from exact physical area overlap.
- Protect area/force conservation and case identity.
- Continue to report connection capacity as `UNRESOLVED` until source-backed product/detail capacity data is implemented.

M4 exit remains the roadmap rule: no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The M2/M3 project-data and load-path chain plus the active M4 attachment-geometry foundation provide the basis for the later transparent Three.js roof viewer, system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.
