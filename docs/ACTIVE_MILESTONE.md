# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M2 Roof Bay exit candidate (PR #112)**.

Completed M2 slices:
1. Roof Bay foundation: two rafters, multiple purlins, tributary routing, reactions and conservation — PR #108.
2. Selectable member load path, exploded view and stable project JSON — PR #109.
3. Custom/nonuniform purlin stations with exact physical tributary bands — PR #110.
4. Rafter A/B reaction diagrams with separate roof-normal and downslope conservation traces — PR #111.
5. M3-ready field/edge/corner pressure-zone schema and roof-local coordinate frame, with zero invented code zones in M2 — PR #112.

Immediate gate:
1. Require the full PR #112 Engineering Checks suite to pass on the final head.
2. Merge PR #112 only after that green gate.
3. Mark **M2 CLOSED** on `main`.

Next primary physics milestone after M2 closes: **M3 — Code Wind / Roof Zoning Engine**. Begin with explicit adopted code/version and wind-basis inputs; preserve manual pressure entry as an auditable alternate path. Do not populate field/edge/corner regions until the governing code geometry and coefficient rules are implemented and benchmarked.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, and `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`.
