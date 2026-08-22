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
**Status: ACTIVE — PRs #113 through #117 are merged; Roof Bay pressure-context acceptance + project JSON integration is the PR #118 candidate.**

Completed in PR #113:
- Source-backed wind-code profile registry.
- Initial Philippine profile identifies **NSCP 2015, Volume 1, 7th Edition, 2nd Printing**, with public evidence records from ASEP publisher/professional context and a DPWH structural-design TOR.
- Versioned `futoltech.wind-design-basis/1` provenance object carries code identity, publisher/jurisdiction metadata, evidence records, explicit required input families, formula-implementation state and blockers.
- Eight M3 input families are explicit in the provenance-only state: site/location, basic wind speed, risk/importance, exposure/terrain, topography, enclosure/internal pressure, building height and roof geometry.
- Roof Bay project JSON carries the provenance object while `pressureZoning.codeBasis` remains null, region polygons remain empty and the M2 manual-uniform pressure path remains active.
- Final-head full Engineering Checks passed and PR #113 merged.

Completed in PR #114 — velocity-pressure chain:
- Deterministic NSCP 2015 building equation `qz = 0.613 Kz Kzt Kd V²`, using V in m/s and q in Pa.
- Building directionality factor `Kd = 0.85` and Exposure B/C/D velocity-pressure coefficient evaluation are explicit.
- `Kz = 2.01(z/zg)^(2/alpha)` is implemented with the 4.57 m minimum evaluation height; the solver rejects extrapolation beyond the verified `zg` expression domain.
- Independent benchmark: Exposure C, `h = 8.82 m`, `V = 240 kph`, `Kzt = 1.0`, `Kd = 0.85` gives `Kz = 0.974820633` and `q = 2.257468 kPa` at full precision.
- External/internal pressure coefficients, field/edge/corner geometry and load combinations remain `UNIMPLEMENTED`.
- Final-head full Engineering Checks passed and PR #114 merged.

Completed in PR #115 — project wind-input acceptance foundation:
- Versioned `futoltech.wind-project-input-acceptance/1` record preserves project site, occupancy category, basic-wind-speed provenance, exposure, topographic factor and evaluation height.
- NSCP 2015 Section 207A.5.1 occupancy-to-figure gate is explicit: Category I → `207A.5-1C`; Category II → `207A.5-1B`; Categories III/IV/V → `207A.5-1A`.
- The repository stores no wind-map contour values and no province-by-province speed table.
- Exposure B/C/D, `Kzt`, and evaluation height require explicit source references.
- Accepted records can feed the benchmarked velocity-pressure solver without becoming final roof pressure.
- Final-head full Engineering Checks passed and PR #115 merged.

Completed in PR #116 — Roof Bay project-input integration:
- Roof Bay exposes explicit source-referenced project fields for site, occupancy, basic wind speed, source type/method/figure, exposure, `Kzt`, evaluation height and evidence references.
- `VALIDATE + ACCEPT FOR q` uses the PR #115 contract and PR #114 solver.
- Editing any accepted input invalidates acceptance.
- Accepted records can be embedded in `futoltech.roof-bay-project/1`; the project `windDesignBasis` is deterministically derived and validated from the accepted record.
- `pressureZoning.activePressureModel` remains `manual-uniform`, `pressureZoning.codeBasis` remains null and code-derived region polygons remain empty.
- Dedicated deterministic and real-Chromium QA passed together with the full final-head Engineering Checks, and PR #116 merged on 2026-08-22.
- Public boundary/QA record: `docs/M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`.

Completed in PR #117 — enclosure + roof/building geometry input acceptance:
- Adds versioned `futoltech.wind-pressure-context-acceptance/1` on top of a valid upstream accepted wind-project record.
- Uses the NSCP 2015 Section 207A.10.1 enclosure classification family: `enclosed`, `partially-enclosed`, and `open`.
- Classification remains `ENGINEER_DECLARED_PROJECT_INPUT`; automatic evaluation of the quantitative opening definitions is not implemented.
- Requires both an enclosure-classification source/reference and a separate building-envelope opening-assessment reference, consistent with the Section 207A.10.2 requirement to determine openings for enclosure classification.
- Requires source-referenced roof form, plan length, plan width, mean roof height and roof slope.
- Mean roof height must equal the already accepted wind-project height in this slice.
- Deterministic serialization and anti-promotion validation protect upstream provenance and prevent mutated records from claiming automatic classification or coefficient implementation.
- `automaticEnclosureClassificationImplemented`, `codeDefinitionThresholdEvaluationImplemented`, `internalPressureCoefficientImplemented`, `externalPressureCoefficientImplemented`, `effectiveWindAreaImplemented`, `fieldEdgeCornerGeometryImplemented`, and `finalRoofPressureImplemented` are hard-locked false.
- Final-head full Engineering Checks passed and PR #117 merged on 2026-08-22.
- Public boundary record: `docs/M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`.

Implemented in PR #118 candidate — Roof Bay pressure-context acceptance + project JSON bridge:
- Roof Bay exposes the merged pressure-context acceptance workflow only after the source-referenced project wind-input record is accepted.
- Enclosure remains engineer-declared and requires both classification and building-envelope openings evidence; no automatic code-definition threshold evaluation is claimed.
- Roof form, overall building plan dimensions, mean roof height and roof slope require explicit project provenance.
- Mean roof height/source is inherited from the accepted wind-project input record so the pressure context cannot detach from the velocity-pressure height basis.
- Pressure-context roof slope must match the active Roof Bay project slope; overall building plan length/width are not inferred from local rafter spacing or bay slope length.
- `futoltech.roof-bay-project/1` may carry an additive `windPressureContextAcceptance` field only when the exact upstream accepted wind-project record is also present.
- Editing an upstream wind input or the active Roof Bay roof slope invalidates downstream pressure-context acceptance.
- Deterministic project tests protect exact upstream attachment, slope consistency, schema round-trip and no-premature-zoning behavior.
- Dedicated real-Chromium V9 QA protects the visible acceptance → context → project-export → invalidation chain.
- `pressureZoning.activePressureModel` remains `manual-uniform`, `pressureZoning.codeBasis` remains null, region polygons remain empty, and `analysisBoundary.codeWindZoning` remains `UNRESOLVED`.
- Public boundary/QA record: `docs/M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`.

Next M3 work after PR #118 is final-head green and merged: implement and independently benchmark the exact source-backed internal-pressure coefficient (`GCpi`) rules in their own slice. External pressure coefficients, effective-area logic, field/edge/corner zoning, load combinations and final code-derived Roof Bay pressure routing remain blocked.

Permanent M3 boundary: a verified velocity pressure plus a traceable enclosure/roof-geometry context is still not a final roof pressure. Manual pressure entry remains the active auditable Roof Bay path until the complete coefficient/zoning chain is verified.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2/M3 project-data and load-path work is structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.