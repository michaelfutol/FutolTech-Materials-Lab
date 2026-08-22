# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Completed M3.2 slice: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**. The dedicated M3 project-input Chromium gate and full Engineering Checks passed before merge, and PR #116 merged on 2026-08-22.

Completed M3.3 input-contract foundation: **source-backed enclosure classification + roof/building geometry input acceptance — PR #117**. The final-head Engineering Checks passed and PR #117 merged on 2026-08-22.

Completed M3.3 Roof Bay integration: **pressure-context acceptance + project JSON bridge — PR #118**. The dedicated V9 real-Chromium gate, deterministic engineering tests, all legacy/browser gates and final-head Engineering Checks passed before merge; PR #118 merged on 2026-08-22.

Current M3 task: **source-backed NSCP 2015 base internal-pressure coefficient (`GCpi`) foundation — PR #119 candidate**.

Implemented in the PR #119 candidate:
1. Versioned `futoltech.wind-internal-pressure-coefficient/1` records require a valid upstream `futoltech.wind-pressure-context-acceptance/1` record.
2. The already accepted engineer-declared enclosure classification maps to NSCP 2015 Section 207A.11.1 / Table 207A.11-1 base cases: open `0.00`, enclosed `+0.18/-0.18`, partially enclosed `+0.55/-0.55`.
3. Positive and negative GCpi cases remain explicit rather than being collapsed into a magnitude-only value.
4. Partially enclosed buildings are deliberately blocked behind an unresolved NSCP 2015 Section 207A.11.1.1 large-volume reduction-factor (`Ri`) applicability gate.
5. `Ri` is not guessed or silently assumed to be 1.0 for partially enclosed buildings; the future project facts needed to resolve the provision are explicit.
6. Open/enclosed base classifications mark the partially-enclosed large-volume `Ri` gate as not applicable in this slice.
7. Deterministic tests protect all three base coefficient sets, exact upstream enclosure attachment, round-trip serialization, and anti-promotion of `Ri` or final pressure.
8. Internal-pressure velocity selection, external pressure coefficients, effective wind area, field/edge/corner zoning, pressure combination, load combinations, and final code-derived Roof Bay pressure remain hard-blocked.

Next step after PR #119 is final-head green and merged: add the quantitative large-volume/applicability inputs and independently benchmark the `Ri` rule before allowing a partially enclosed internal-pressure coefficient to advance further. Only after the internal-pressure chain is complete should external roof coefficients and zoning be promoted.

Permanent M3 rule: a verified velocity pressure, traceable enclosure/roof geometry, and even a base `GCpi` value are still not final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, and `M3_INTERNAL_PRESSURE_COEFFICIENT.md`.