# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Completed M3.2 slice: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**. The dedicated M3 project-input Chromium gate and full Engineering Checks passed before merge, and PR #116 merged on 2026-08-22.

Current M3 task: **source-backed enclosure classification + roof/building geometry input acceptance — PR #117 candidate**.

Implemented in the PR #117 candidate foundation:
1. Versioned `futoltech.wind-pressure-context-acceptance/1` record requiring a valid upstream `futoltech.wind-project-input-acceptance/1` record.
2. Explicit enclosure labels `enclosed`, `partially-enclosed`, and `open`, consistent with the NSCP 2015 Section 207A.10.1 classification family.
3. The classification remains `ENGINEER_DECLARED_PROJECT_INPUT`; the software does not yet evaluate the quantitative opening definitions automatically.
4. An enclosure-classification reference and a separate project opening-assessment reference are mandatory, reflecting the Section 207A.10.2 need to determine building-envelope openings.
5. Source-referenced roof/building geometry is explicit: roof form, plan length, plan width, mean roof height, and roof slope.
6. Mean roof height must match the upstream accepted wind-project height so the pressure-context record cannot silently detach from the velocity-pressure basis.
7. Deterministic serialization and validation protect the full upstream evidence chain.
8. Automatic enclosure classification, code-definition threshold evaluation, `GCpi`, external pressure coefficients, effective wind area, field/edge/corner zoning, and final roof pressure remain hard-blocked.

Next step after the PR #117 foundation is green: expose the accepted enclosure/roof-geometry context in Roof Bay/project JSON. Only then should the exact code-specific internal/external pressure coefficient and zoning rules be implemented and independently benchmarked.

Permanent M3 rule: a verified velocity pressure and a traceable enclosure/roof-geometry context are still not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, and `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`.
