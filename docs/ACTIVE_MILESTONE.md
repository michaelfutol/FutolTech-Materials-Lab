# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Completed implementation gate for M3.2: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**. The dedicated M3 project-input Chromium gate and the full Engineering Checks suite passed on the implementation head before merge.

PR #116 provides:
1. Roof Bay exposure of the versioned `futoltech.wind-project-input-acceptance/1` workflow for site, occupancy category, basic-wind-speed provenance, exposure, `Kzt`, and evaluation height.
2. Visible occupancy-matched NSCP wind-speed figure guidance while authorized code-map reads remain distinct from project design criteria and site-specific studies.
3. No contour value, province speed table, address-based terrain inference, or automatic `Kzt` derivation.
4. Source-referenced acceptance into the already benchmarked velocity-pressure chain with visible `Kz` and `q`.
5. Automatic invalidation of acceptance whenever an accepted input is edited.
6. Accepted input records embedded in `futoltech.roof-bay-project/1`, with the project `futoltech.wind-design-basis/1` state deterministically derived from the accepted record.
7. The live Roof Bay pressure path still `manual-uniform`; `pressureZoning.codeBasis` remains null and code-derived field/edge/corner regions remain empty.
8. Deterministic and real-Chromium regression protecting the acceptance → q → project-export chain and the no-premature-pressure-routing boundary.

Current M3 task after PR #116: **resolve and validate enclosure/internal-pressure classification plus roof geometry/plan inputs before any pressure-coefficient implementation is allowed**.

Still blocked: external/internal pressure coefficients, field/edge/corner geometry, effective-area zoning, load combinations, and final code-derived Roof Bay pressure.

Permanent M3 rule: a verified velocity pressure is not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, and `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`.
