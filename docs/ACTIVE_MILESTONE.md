# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Completed M3.2 slice: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**. The dedicated M3 project-input Chromium gate and full Engineering Checks passed before merge, and PR #116 merged on 2026-08-22.

Completed M3.3 input-contract foundation: **source-backed enclosure classification + roof/building geometry input acceptance — PR #117**. The final-head Engineering Checks passed and PR #117 merged on 2026-08-22.

Completed M3.3 Roof Bay integration: **pressure-context acceptance + project JSON bridge — PR #118**. The dedicated V9 real-Chromium gate, deterministic engineering tests, all legacy/browser gates and final-head Engineering Checks passed before merge; PR #118 merged on 2026-08-22.

Completed internal-pressure base layer: **NSCP 2015 base `GCpi` foundation — PR #119**. The exact final head passed syntax, deterministic engineering tests, all Roof Bay/M3 gates, 16-second recording regression, print/PDF/calibration protections and NF-001 frame regressions before PR #119 merged on 2026-08-22.

Current M3 task: **large-volume partially enclosed reduction-factor (`Ri`) applicability + equation — PR #120 candidate**.

Implemented in the PR #120 candidate:
1. Versioned `futoltech.wind-large-volume-reduction/1` records require the exact upstream partially enclosed base-GCpi record.
2. Applicability remains an engineer-declared project fact: the software does not infer that the building contains a qualifying single unpartitioned large volume.
3. If non-qualifying, `Ri = 1.0`, no unused `Aog`/`Vi` inputs are carried, and `GCpi = ±0.55` remains unchanged.
4. If qualifying, positive source-referenced `Aog` (total building-envelope opening area) and `Vi` (unpartitioned internal volume) are required.
5. The metric equation is explicit: `Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0`.
6. The code-permitted conservative `Ri = 1.0` path remains explicit; the software never silently selects the beneficial reduction.
7. Engineer selection is recorded as either `conservative-ri-1` or `equation-reduction`.
8. Deterministic benchmark: `Vi = 6950 m³`, `Aog = 1.00 m²` → `Ri = 0.8535533905932737`; applying it to base `GCpi = ±0.55` gives `±0.4694543648263006`.
9. Validation prevents mutation of the equation result, selected factor, adjusted GCpi, applicability, or downstream implementation flags.
10. Internal-pressure velocity selection, external pressure coefficients, effective wind area, field/edge/corner zoning, pressure combination, load combinations, and final code-derived Roof Bay pressure remain hard-blocked.

Next step after PR #120 is final-head green and merged: implement the applicable NSCP internal-pressure velocity-pressure selection/term as its own source-backed benchmarked slice before external pressure coefficients are introduced.

Permanent M3 rule: even a resolved base `GCpi` plus an auditable `Ri` is still not final roof pressure. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, velocity-pressure, zoning, and combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, and `M3_LARGE_VOLUME_RI.md`.