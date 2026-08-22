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
**Status: ACTIVE — PRs #113 through #121 are merged; the next dependency is the roof C&C target/effective-wind-area foundation before external `GCp`.**

Completed in PR #113 — code/version + provenance:
- Source-backed wind-code profile registry for NSCP 2015 Volume 1, 7th Edition, 2nd Printing.
- Versioned `futoltech.wind-design-basis/1` provenance object with explicit required wind-input families and blockers.
- Roof Bay project JSON carries provenance while code zoning remains inactive.

Completed in PR #114 — velocity-pressure chain:
- Deterministic `qz = 0.613 Kz Kzt Kd V²` implementation.
- `Kd = 0.85`; Exposure B/C/D coefficient evaluation; 4.57 m minimum evaluation-height rule.
- Benchmark: Exposure C, `h = 8.82 m`, `V = 240 kph`, `Kzt = 1.0` gives `Kz = 0.974820633` and `q = 2.257468 kPa`.
- Final-head Engineering Checks passed before merge.

Completed in PR #115 — project wind-input acceptance:
- Versioned `futoltech.wind-project-input-acceptance/1` record for site, occupancy, wind speed provenance, exposure, Kzt and height.
- Occupancy-to-wind-map figure gate is explicit.
- Repository stores no guessed wind-map contour table.
- Final-head Engineering Checks passed before merge.

Completed in PR #116 — Roof Bay project-input integration:
- Source-referenced project wind inputs accepted in Roof Bay and carried into project JSON.
- `Kz` / `q` are visible and deterministically derived from the accepted record.
- Editing accepted inputs invalidates acceptance.
- `pressureZoning.activePressureModel` remains `manual-uniform`, `codeBasis` null, and regions empty.
- Full final-head Engineering Checks passed before merge.

Completed in PR #117 — enclosure + roof/building geometry input acceptance:
- Versioned `futoltech.wind-pressure-context-acceptance/1` on top of accepted wind-project inputs.
- Enclosure family: `enclosed`, `partially-enclosed`, `open`; classification remains engineer-declared.
- Separate enclosure/openings evidence plus source-referenced roof form, building plan dimensions, mean roof height and slope.
- Automatic enclosure-threshold evaluation remains unimplemented.
- Full final-head Engineering Checks passed before merge.

Completed in PR #118 — Roof Bay pressure-context integration:
- Pressure-context acceptance exposed in Roof Bay only after accepted upstream wind inputs.
- Mean roof height/source inherited from accepted wind record; context slope must match active Roof Bay slope.
- Project JSON carries the exact accepted pressure-context/upstream chain.
- V9 real-Chromium and deterministic gates protect acceptance, export and invalidation.
- Manual-uniform pressure remains active; code zones remain zero.
- Full final-head Engineering Checks passed before merge.

Completed in PR #119 — base internal-pressure coefficient (`GCpi`) foundation:
- Adds `futoltech.wind-internal-pressure-coefficient/1` attached to the exact accepted pressure-context record.
- NSCP 2015 base cases: open `0.00`, enclosed `+0.18/-0.18`, partially enclosed `+0.55/-0.55`.
- Positive and negative internal-pressure cases remain explicit.
- The partially enclosed path stops at an explicit Section 207A.11.1.1 large-volume `Ri` gate rather than silently assuming a reduction.
- Deterministic tests protect code-table values, upstream attachment, serialization and no-final-pressure promotion.
- Public boundary record: `docs/M3_INTERNAL_PRESSURE_COEFFICIENT.md`.

Completed in PR #120 — large-volume partially enclosed reduction factor (`Ri`):
- Adds `futoltech.wind-large-volume-reduction/1` downstream of the exact partially enclosed base-GCpi record.
- Applicability remains an engineer-declared fact.
- Non-qualifying path keeps `Ri = 1.0` and carries no unused `Aog`/`Vi` values.
- Qualifying path requires source-referenced `Aog` and `Vi`.
- Metric equation: `Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0`.
- Conservative `Ri = 1.0` remains explicit; equation reduction is never silently selected.
- Hand benchmark: `Vi = 6950 m³`, `Aog = 1.00 m²` gives `Ri = 0.8535533905932737`, and adjusted `GCpi = ±0.4694543648263006` when the reduction is selected.
- Public boundary/QA record: `docs/M3_LARGE_VOLUME_RI.md`.

Completed in PR #121 — internal-pressure velocity selection + signed term:
- Adds `futoltech.wind-internal-pressure-term/1` attached to the exact upstream coefficient chain.
- Enclosed buildings use `qi = qh` for both positive and negative internal pressure.
- Partially enclosed negative internal pressure uses `qi = qh`.
- Partially enclosed positive internal pressure can use either source-referenced `qz` at the highest opening affecting positive internal pressure or the explicit conservative `qi = qh` path.
- Highest-opening elevation is never inferred and is not retained when the conservative path is selected.
- Partially enclosed records cannot bypass the explicit `Ri` decision record, even when that record selects `Ri = 1.0`.
- Signed internal pressure is preserved as `qi * (GCpi)`; it is not prematurely combined with external pressure.
- Open buildings retain zero internal term because `GCpi = 0`.
- Validation deterministically recalculates `qh`, optional opening-height `qz`, coefficient carry-through, `qi`, and `qi(GCpi)` and rejects mutation.
- Exact final head `9a458078f610a35a678213583f0f91462bba7dcb` passed the complete Engineering Checks suite; PR #121 squash-merged as `5acab72d3848ee1b3e55191560577dc965b15d08`.
- External pressure coefficients, effective wind area, field/edge/corner zoning, pressure combination, load combinations and final code-derived Roof Bay pressure remain unimplemented.
- Public boundary/QA record: `docs/M3_INTERNAL_PRESSURE_TERM.md`.

Current M3 dependency — roof Components & Cladding target + effective wind area:
- Establish the supported roof design target/procedure explicitly before external coefficient selection; do not let MWFRS and C&C paths blur together.
- Treat coefficient-selection effective wind area as a distinct engineering quantity from actual tributary/load-application area.
- Start with only member/component classes whose geometry and applicability can be defended from the accepted Roof Bay/project record; unresolved sheet/fastener/component cases stay blocked.
- Where a code-permitted effective-width treatment can enlarge coefficient-selection area, make the selection explicit and engineer/evidence bounded rather than silently adopting the beneficial option.
- Add deterministic hand benchmarks and serialization/anti-mutation tests before any external `GCp` values are enabled.

Next M3 work after that foundation:
- Source-backed external roof pressure coefficient selection for supported roof form/slope/target/effective area.
- Field/edge/corner zone geometry and member/area assignment.
- External-minus-internal pressure combination with explicit sign conventions.
- Traceable load combinations.
- Automatic code-derived Roof Bay pressure only after the full chain passes independent benchmarks and final-head QA.

Permanent M3 boundary: a verified velocity pressure, accepted pressure context, base/adjusted `GCpi`, resolved internal-pressure term, or future effective-wind-area record still does not constitute final roof pressure. Manual pressure entry remains the active Roof Bay path until the complete internal/external coefficient, zoning and pressure-combination chain is verified.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2/M3 project-data and load-path work is structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.