# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Current M3 task: **Code/version + wind-input provenance foundation — PR #113**.

Implemented in the PR #113 candidate:
1. Source-backed code-profile registry with initial Philippine profile `ph-nscp-2015-v1-7e-2p` — NSCP 2015, Volume 1, 7th Edition, 2nd Printing.
2. Versioned `futoltech.wind-design-basis/1` object carrying code identity, publisher/jurisdiction metadata, evidence records, required input families, formula status and blockers.
3. Eight wind-input families remain explicitly `UNRESOLVED`: site/location, basic wind speed, risk/importance, exposure/terrain, topography, enclosure/internal pressure, building height and roof geometry.
4. Velocity-pressure, external/internal coefficients, field/edge/corner geometry and load combinations remain `UNIMPLEMENTED`; code calculation remains `BLOCKED`.
5. Roof Bay project export carries the provenance object while `pressureZoning.codeBasis` remains null and the existing manual-uniform pressure stays active.
6. Visible M3 basis/provenance panel, deterministic anti-promotion tests, public-source documentation and a dedicated Chromium gate.

Immediate gate:
1. Require PR #113 final-head Engineering Checks to pass.
2. Mark this first M3 task complete only after merge.

Next M3 task after that gate: **implement the adopted-code velocity-pressure calculation chain with visible substitutions and independent hand benchmarks**. Do not enable field/edge/corner pressure coefficients yet.

Permanent M3 rule: identifying a code edition is not evidence that its equations, maps, coefficients or zoning rules have been implemented.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, and `M3_WIND_DESIGN_BASIS.md`.
