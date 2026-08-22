# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is now closed after its final planned data-model slice passed the PR #112 final-head Engineering Checks.

Completed M2 slices:
1. Roof Bay foundation: two rafters, multiple purlins, tributary routing, reactions and conservation — PR #108.
2. Selectable member load path, exploded view and stable project JSON — PR #109.
3. Custom/nonuniform purlin stations with exact physical tributary bands — PR #110.
4. Rafter A/B reaction diagrams with separate roof-normal and downslope conservation traces — PR #111.
5. M3-ready field/edge/corner pressure-zone schema and roof-local coordinate frame, with zero invented code zones in M2 — PR #112.

M3 next tasks, in checklist order:
1. Define the adopted code/version and wind-input provenance object used by every code-derived result.
2. Implement the velocity-pressure calculation chain with visible substitutions and deterministic hand benchmarks.
3. Add exposure/terrain, topographic, enclosure/internal-pressure and building/roof geometry inputs only as required by the adopted code path.
4. Populate field/edge/corner geometry and positive/suction pressure regions only after the code rules and benchmark chain are verified.
5. Preserve manual pressure entry as an explicit user-defined/research path rather than silently replacing it.

Permanent M3 rule: the reserved `futoltech.roof-pressure-zones/1` interface is not evidence that any code zoning has already been calculated.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, and `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`.
