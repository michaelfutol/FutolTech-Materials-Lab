# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Completed M3.2 slice: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**. The dedicated M3 project-input Chromium gate and full Engineering Checks passed before merge, and PR #116 merged on 2026-08-22.

Completed M3.3 input-contract foundation: **source-backed enclosure classification + roof/building geometry input acceptance — PR #117**. The final-head Engineering Checks passed and PR #117 merged on 2026-08-22.

Current M3 task: **Roof Bay pressure-context acceptance + project JSON bridge — PR #118 candidate**.

Implemented in the PR #118 candidate:
1. Roof Bay exposes the merged `futoltech.wind-pressure-context-acceptance/1` workflow only after an upstream project wind-input record has been accepted.
2. Enclosure remains an `ENGINEER_DECLARED_PROJECT_INPUT`; the UI does not automatically evaluate the quantitative NSCP opening definitions.
3. Separate enclosure-classification and building-envelope-opening assessment references are required.
4. Source-referenced roof form, overall building plan length/width, mean roof height, and roof slope are explicit.
5. Mean roof height is inherited from the accepted upstream wind record, preserving the velocity-pressure height basis.
6. Pressure-context roof slope must match the active Roof Bay project slope; overall building plan dimensions are not incorrectly inferred from local bay dimensions.
7. A project carrying pressure context must also carry the exact upstream accepted wind-project record used to create it.
8. Accepted pressure context can be embedded in `futoltech.roof-bay-project/1` while `pressureZoning.activePressureModel` remains `manual-uniform`, `codeBasis` remains null, regions remain empty, and `codeWindZoning` remains `UNRESOLVED`.
9. Deterministic project tests and a dedicated real-Chromium V9 gate protect acceptance, export, anti-drift, invalidation, and no-premature-pressure-routing behavior.

Next step after PR #118 is final-head green and merged: begin a separate source-backed, independently benchmarked internal-pressure coefficient (`GCpi`) slice. External pressure coefficients, effective wind area, field/edge/corner zoning, load combinations, and final code-derived Roof Bay pressure remain blocked until their own gates are complete.

Permanent M3 rule: a verified velocity pressure and a traceable enclosure/roof-geometry context are still not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, and `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`.