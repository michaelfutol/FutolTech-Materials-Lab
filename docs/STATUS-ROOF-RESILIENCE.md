# FutolTech Roof Resilience Physics — Implementation Status

Status date: 2026-08-22

This file records implementation status only. The governing roadmap and milestone exit gates remain in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`.

## M0 — Product cleanup and navigation architecture
**Status: ACTIVE / foundation implemented.**

Implemented:
- Persistent primary workflow navigation: Home → Materials Comparison → C-Purlin Test → Roof Load Cases → Roof Bay → Advanced / R&D.
- Dedicated Advanced / R&D hub so specialist utilities can be grouped without becoming the main workflow.
- Generic Material Comparison and specialist C-purlin experience remain separated.
- Generic synchronized playback has been moved to a full-width row and 8/16/24-second recording is available, with 16 seconds as the default slow recording contract.
- Test Data Validation / Calibration is retained as an Advanced/R&D capability with a soft access gate on public GitHub Pages.

Still required before M0 exit:
- Audit and simplify legacy page-level status-pill clusters so they show page state rather than acting as a second crowded navigation system.
- Standardize HOME behavior and labels on remaining older pages.
- First-time-user navigation QA across desktop/mobile widths.

## M1 — C-Purlin Gravity + Wind Physics Bench
**Status: CORE IMPLEMENTED / continuing validation and polish.**

Implemented:
- Gravity, wind and combined load modes plus governing pressure workflows.
- Roof slope decomposition and C-section orientation mapping.
- Gross-section UDL moment, deflection and biaxial stress screening.
- Yield sequencing, synchronized visualization and WebM recording.
- PaperMatte / Lab Dark visualization and real-browser regression gates.

Permanent current boundary:
- Gross-section screening only; no effective-width, local/distortional/LTB or connection-capacity claim.

## M2 — Roof Bay Physics (2D / 2.5D)
**Status: CLOSED — all current M2 checklist slices and the milestone exit gate passed on PR #112 final-head Engineering Checks and merged.**

Foundation implemented in PR #108:
- Two adjacent rafter lines.
- Multiple purlin rows and equalized maximum-spacing layout.
- Explicit edge/interior tributary widths with full-roof coverage.
- Manual gravity/wind pressure routing from roof sheet area to each purlin.
- Existing gross-elastic C-purlin solver reused per tributary row.
- Simply-supported purlin reactions routed as discrete point loads into both rafter lines.
- Vector load-conservation check for applied roof pressure plus modeled purlin self-weight.
- Transparent 2D/2.5D roof-sheet context, fastener markers, reaction arrows and animated load path.
- Per-purlin station/load/reaction/moment/deflection/utilization table.
- Explicit `UNRESOLVED` states for roof sheet, fasteners, purlin-to-rafter connections and rafter/truss member capacity.

Completed in PR #109:
- [x] Member selection highlights the exact selected purlin, its tributary band, both rafter reaction points and synchronized formula/result trace.
- [x] Exploded demand-routing view: sheet → screws → selected purlin → rafters → supporting system.
- [x] Stable `futoltech.roof-bay-project/1` project JSON schema for later shared geometry/rendering/interchange work, with unresolved design layers prevented from silently becoming PASS.

Completed in PR #110:
- [x] Optional custom/nonuniform purlin station layout in addition to equalized maximum spacing.
- [x] Custom edge purlins may be offset from the physical roof boundary while tributary bands still terminate exactly at the roof eave/high-edge domain.
- [x] Exact tributary start/end boundaries are stored by the solver and used by both the base Roof Bay figure and selected-member overlay; the visual no longer assumes a symmetric band around an offset edge purlin.
- [x] Custom layout is preserved by project JSON round-trip and covered by deterministic + real-Chromium regression.

Completed in PR #111:
- [x] Separate Rafter A and Rafter B reaction diagrams show one discrete reaction station per modeled purlin.
- [x] Roof-normal and roof-downslope reaction components are separately visible with signed direction conventions.
- [x] Component conservation decomposes roof-area gravity, purlin self-weight and roof-normal wind before comparing the applied totals against Rafter A + Rafter B reaction totals.
- [x] Combined, gravity-only and wind-only component checks are regression-tested; wind-only uplift remains negative roof-normal and zero downslope.
- [x] Reaction diagrams remain demand-transfer views only and do not claim rafter/truss or connection capacity.

Completed in PR #112:
- [x] Stable `futoltech.roof-pressure-zones/1` placeholder schema added without changing the existing M2 bay dimensions or purlin layout model.
- [x] Roof-local coordinate frame is explicit: origin at Rafter A/eave, x toward Rafter B, y upslope, with extents tied to the solver geometry.
- [x] Field / edge / corner region types are reserved for M3, while M2 stores zero region polygons, zero purlin-zone assignments and no code basis.
- [x] Current active pressure model remains one manual uniform wind pressure; M2 validation rejects any silent promotion to code-derived zoning.
- [x] Solver JSON and project JSON carry the same unresolved pressure-zone bridge, with backward compatibility for older schema-v1 files that omit the new additive fields.
- [x] Visible M2→M3 bridge panel states that no code zones are applied; deterministic and dedicated real-Chromium gates protect the boundary.

M2 exit gate:
- [x] Summed reactions balance the applied roof load within numerical tolerance.
- [x] Every displayed tributary/reaction path is derived from the same solver model.
- [x] The future M3 field/edge/corner zoning interface is reserved without inventing code dimensions, coefficients or pressures.
- [x] PR #112 final-head full Engineering Checks passed, including syntax, deterministic engineering tests, all Roof Bay Chromium gates, legacy lab/browser gates and PDF/print protections.

## M3 — Code Wind / Roof Zoning Engine
**Status: ACTIVE — provenance foundation merged in PR #113; benchmarked velocity-pressure slice is the PR #114 candidate.**

Completed in PR #113:
- Source-backed wind-code profile registry.
- Initial Philippine profile identifies **NSCP 2015, Volume 1, 7th Edition, 2nd Printing**, with public evidence records from ASEP publisher/professional context and a DPWH structural-design TOR.
- Versioned `futoltech.wind-design-basis/1` provenance object carries code identity, publisher/jurisdiction metadata, evidence records, explicit required input families, formula-implementation state and blockers.
- Eight M3 input families are explicit in the provenance-only state: site/location, basic wind speed, risk/importance, exposure/terrain, topography, enclosure/internal pressure, building height and roof geometry.
- Roof Bay project JSON carries the provenance object while `pressureZoning.codeBasis` remains null, region polygons remain empty and the M2 manual-uniform pressure path remains active.
- Evidence comparison is canonicalized before equality checking, preserving deterministic JSON round-trip while still rejecting semantic provenance mutations.
- Public source/boundary record: `docs/M3_WIND_DESIGN_BASIS.md`.
- Final-head full Engineering Checks passed and PR #113 merged.

Implemented in PR #114 candidate — velocity-pressure chain:
- Deterministic NSCP 2015 building equation `qz = 0.613 Kz Kzt Kd V²`, using V in m/s and q in Pa.
- Building directionality factor `Kd = 0.85` and Exposure B/C/D velocity-pressure coefficient evaluation are explicit.
- `Kz = 2.01(z/zg)^(2/alpha)` is implemented with the 4.57 m minimum evaluation height; the solver rejects extrapolation beyond the verified `zg` expression domain.
- Basic wind speed is accepted in kph and converted visibly to m/s. No Philippine map lookup is yet implemented.
- `Kzt` remains an explicit input with source/reference; no silent flat-terrain assumption or automatic topographic derivation is made.
- Independent benchmark: Exposure C, `h = 8.82 m`, `V = 240 kph`, `Kzt = 1.0`, `Kd = 0.85` gives `Kz = 0.974820633` and `q = 2.257468 kPa` at full precision, consistent with the rounded worked example.
- `futoltech.wind-design-basis/1` can represent a source-referenced `VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED` state without promoting the rest of the wind engine.
- Six input families may be resolved for this slice — site/location, basic wind speed, occupancy/risk basis, exposure/terrain, topography and height — while enclosure/internal pressure and roof geometry remain `UNRESOLVED`.
- External pressure coefficients, internal pressure coefficients, field/edge/corner geometry and load combinations remain `UNIMPLEMENTED`.
- Stored velocity-pressure output is recalculated during validation so mutated `Kz` or q cannot be accepted as source truth.
- Visible M3.1 benchmark panel exposes the substitutions and result; dedicated Chromium QA asserts that this benchmark is **not** routed into the live Roof Bay pressure model or project export.
- Public equation/benchmark/boundary record: `docs/M3_VELOCITY_PRESSURE.md`.

PR #114 completion gate:
- [ ] Full final-head Engineering Checks pass after all source-of-truth status updates.
- [ ] Merge to `main` before marking the velocity-pressure slice complete.

Next M3 task after PR #114: build the source-backed project wind-input acceptance path, especially defensible Philippine basic-wind-speed selection and explicit applicability/provenance for occupancy/risk, exposure, topography and height. Pressure coefficients and roof zoning remain blocked until that input layer is verified.

Permanent M3 boundary: a verified velocity pressure is not a final roof pressure. Manual pressure entry remains the active auditable Roof Bay path until external/internal pressure coefficients, roof zoning and project integration are independently verified.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2 project-data and load-path work is structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.
