# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 foundation: **Code/version + wind-input provenance — PR #113**.

Completed M3.1 slice: **benchmarked NSCP 2015 velocity-pressure chain — PR #114**.

Completed M3 input-contract slice: **source-backed project wind-input acceptance — PR #115**.

Completed M3.2 slice: **Roof Bay project wind-input acceptance + project JSON bridge — PR #116**.

Completed M3.3 input-contract foundation: **source-backed enclosure classification + roof/building geometry input acceptance — PR #117**.

Completed M3.3 Roof Bay integration: **pressure-context acceptance + project JSON bridge — PR #118**.

Completed internal-pressure base layer: **NSCP 2015 base `GCpi` foundation — PR #119**.

Completed partially enclosed large-volume layer: **engineer-gated `Ri` applicability + equation — PR #120**.

Completed internal-pressure velocity layer: **source-backed `qi` selection + signed `qi(GCpi)` term — PR #121**.

Completed roof C&C effective-area foundation: **source-backed roof-purlin target + coefficient-selection effective wind area — PR #123**.

Implemented through PR #123:
1. Versioned `futoltech.wind-roof-purlin-effective-area/1` records attach to the accepted wind pressure context.
2. The supported target is explicitly `roof-purlin` under the Components & Cladding procedure; MWFRS is not silently substituted.
3. Actual load-application area remains `purlin span × actual tributary width`.
4. Coefficient-selection effective wind area remains a separate quantity: `purlin span × selected effective width`.
5. `actual-tributary-width` and explicit `one-third-span-minimum` selections are supported; the latter uses `max(actual tributary width, span/3)`.
6. Any coefficient-area enlargement is source/engineer selected and never changes the physical Roof Bay tributary/load area.
7. Deterministic benchmark: 4.0 m span × 1.0 m actual tributary width gives 4.0 m² actual load area and 5.333333333... m² coefficient-selection area when the one-third-span path is explicitly selected.
8. Roof-sheet and fastener effective areas remain unresolved; fasteners do not inherit the purlin area.
9. External `GCp`, field/edge/corner geometry, external-minus-internal pressure combination, load combinations, purlin capacity promotion, and final code-derived Roof Bay pressure remain hard-blocked.
10. The implementation head passed the complete preliminary Engineering Checks suite before these milestone files were advanced; the documentation-updated exact head must also pass the full suite before merge.

Current M3 task: **source-backed roof C&C zone geometry + purlin zone assignment foundation**.

Dependency order for this next slice:
1. Resolve the applicable roof-local field/edge/corner zone geometry from the accepted building/roof geometry and governing C&C procedure without embedding external coefficient values yet.
2. Map each physical Roof Bay purlin/tributary band to the code zones it actually intersects; do not label an entire purlin by convenience when its tributary area spans multiple zones.
3. Preserve the existing roof-local coordinate frame from M2 so solver, diagram, project JSON, zone geometry and later pressure routing share one geometry source.
4. Keep external `GCp` lookup blocked until zone identity, roof form/slope and the PR #123 effective-area record can be supplied together to the coefficient-selection layer.
5. Keep external-minus-internal pressure combination, load combinations and automatic Roof Bay code pressure blocked until their own benchmarked gates are complete.

Permanent M3 rule: a resolved internal-pressure term, effective-wind-area basis, or future zone geometry is not final roof pressure. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, zoning, and pressure-combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, `M3_INTERNAL_PRESSURE_TERM.md`, and `M3_ROOF_PURLIN_EFFECTIVE_WIND_AREA.md`.