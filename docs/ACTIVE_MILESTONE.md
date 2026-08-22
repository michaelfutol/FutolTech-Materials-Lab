# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**. PR #114 merged only after final-head Engineering Checks passed.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**. PR #115 final-head Engineering Checks passed and the PR merged on 2026-08-22.

Current M3 task: **expose project wind-input acceptance in Roof Bay and preserve it in project JSON — PR #116 candidate**.

Implemented in the PR #116 candidate slice:
1. Roof Bay now exposes the versioned `futoltech.wind-project-input-acceptance/1` workflow for site, occupancy category, basic-wind-speed provenance, exposure, `Kzt`, and evaluation height.
2. The UI displays the occupancy-matched NSCP wind-speed figure and keeps authorized code-map reads distinct from project design criteria and site-specific studies.
3. No contour value, province speed table, address-based terrain inference, or automatic `Kzt` derivation is introduced.
4. A valid source-referenced project record can run the already benchmarked velocity-pressure chain and visibly report `Kz` and `q`.
5. Editing an accepted input invalidates the accepted state so a stale velocity pressure cannot remain attached to changed project inputs.
6. `EXPORT PROJECT JSON` can embed the accepted wind-input record and deterministically derive the project `futoltech.wind-design-basis/1` velocity-pressure state from it.
7. The live Roof Bay pressure path remains `manual-uniform`; `pressureZoning.codeBasis` remains null and code-derived field/edge/corner regions remain empty.
8. Deterministic and dedicated real-Chromium QA protect the acceptance → q → project-export chain and the no-premature-pressure-routing boundary.

Current PR #116 boundary: enclosure/internal-pressure classification, roof-plan geometry required by code coefficient/zoning rules, external/internal pressure coefficients, field/edge/corner geometry, load combinations, and final code-derived Roof Bay pressure remain unimplemented.

Next step inside M3 after the Roof Bay acceptance bridge is green: resolve and validate enclosure/internal-pressure classification and roof geometry/plan inputs before any pressure-coefficient implementation is allowed.

Permanent M3 rule: a verified velocity pressure is not a final roof pressure. Manual pressure remains the active Roof Bay path until the complete coefficient/zoning chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, and `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`.
