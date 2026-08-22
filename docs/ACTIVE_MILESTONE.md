# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed first M3 task: **Code/version + wind-input provenance foundation — PR #113**.

Current M3 task: **benchmarked NSCP 2015 velocity-pressure chain — PR #114 candidate**.

Implemented in the PR #114 candidate:
1. Deterministic building velocity-pressure solver: `qz = 0.613 Kz Kzt Kd V²`.
2. Building `Kd = 0.85`; Exposure B/C/D constants and Kz expression with the 4.57 m minimum evaluation height.
3. Explicit kph→m/s conversion and source-referenced `Kzt`; no automatic wind-map lookup and no silent topographic-factor assumption.
4. Independent benchmark: Exposure C, 8.82 m, 240 kph, Kzt 1.0 gives `Kz = 0.974820633` and `q = 2.257468 kPa` at full precision.
5. Wind-design-basis velocity-pressure state resolves only the six input families needed to justify/use this equation path; enclosure/internal pressure and roof geometry remain unresolved.
6. External/internal pressure coefficients, field/edge/corner geometry and load combinations remain unimplemented and blocked.
7. Visible substitutions + dedicated real-Chromium gate; stored results are deterministically recalculated during validation to reject altered q/Kz values.
8. The benchmark is deliberately isolated from the live Roof Bay: manual uniform pressure remains active, `pressureZoning.codeBasis` remains null, and project export remains provenance-only.

PR #114 gate:
1. Full final-head Engineering Checks must pass after checklist/status updates.
2. Mark the velocity-pressure slice complete only after merge.

Next M3 task after that gate: **source-backed project wind-input acceptance**, beginning with a defensible Philippine basic-wind-speed selection/provenance path and explicit validation of occupancy/risk, exposure, topography and height. Do not enable external/internal pressure coefficients or field/edge/corner zoning until these inputs are traceable and verified.

Permanent M3 rule: a verified velocity pressure is not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, and `M3_VELOCITY_PRESSURE.md`.
