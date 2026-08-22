# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Current M3 task: **source-backed project wind-input acceptance — PR #115 candidate**.

Implemented in the PR #115 candidate foundation:
1. Versioned `futoltech.wind-project-input-acceptance/1` record for site, occupancy category, basic wind speed provenance, exposure, `Kzt`, and evaluation height.
2. NSCP 2015 Section 207A.5.1 occupancy-to-wind-speed-figure gate: Category I → `207A.5-1C`; Category II → `207A.5-1B`; Categories III/IV/V → `207A.5-1A`.
3. No wind-map contour values or province speed table are embedded. Authorized code-map values remain engineer-transcribed project inputs with source references and selection method.
4. Project design criteria and site-specific studies can be preserved as explicit non-map sources without being mislabeled as software-verified code-map lookups.
5. Exposure B/C/D, topographic factor and evaluation height require explicit source references; no address-based terrain inference or automatic `Kzt` derivation is claimed.
6. Accepted project inputs can feed the already benchmarked velocity-pressure solver through a dedicated bridge while final roof pressure remains blocked.
7. Deterministic tests protect occupancy/figure matching, provenance, non-map source labeling, and anti-promotion flags.

Current PR #115 boundary: this is an input-acceptance/data-contract slice. Automatic geographic wind-map lookup, external/internal pressure coefficients, field/edge/corner geometry, and code-derived Roof Bay pressure remain unimplemented.

Next step inside M3 after the acceptance foundation is green: expose the accepted project-input workflow in Roof Bay and then resolve enclosure/roof geometry before any pressure-coefficient implementation is allowed.

Permanent M3 rule: a verified velocity pressure is not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, and `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`.
