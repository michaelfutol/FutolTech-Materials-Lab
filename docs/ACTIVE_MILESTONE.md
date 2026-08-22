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

Completed M3 zoning slice: **source-backed symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections — PR #124**.

Current completion candidate: **source-backed external roof `GCp` selection for the roof-purlin C&C target — successor to PR #125 on current `main`**.

Implemented through the external-`GCp` candidate:
1. Versioned `futoltech.wind-roof-zone-geometry/1` records attach to the accepted wind pressure context.
2. The supported initial geometry is an explicitly confirmed symmetric gable roof with source-referenced ridge direction and selected roof plane.
3. Roof Bay placement is registered inside whole-roof coordinates by ridge-parallel start station and bay span; local bay geometry is never guessed to be field, edge or corner.
4. The supported gable figure family respects the 27° boundary: `207E.4-2B` for `7° < θ <= 27°` and `207E.4-2C` for `27° < θ <= 45°`.
5. Edge dimension `a` is calculated in horizontal plan from the accepted least horizontal building dimension and the applicable source-backed height; low slopes require eave height while steeper roofs use the accepted mean roof height.
6. The eave strip is mapped to the sloping roof surface as `a / cos(θ)`; the ridge is not treated as an exterior roof edge in this symmetric-gable slice.
7. Zone 1/field, Zone 2/edge and Zone 3/corner are deterministic non-overlapping roof-surface cells.
8. Every physical purlin tributary band is intersected with the zone cells; one band may carry separate field, edge and corner areas.
9. The purlin coefficient-selection effective wind area remains distinct from the actual load-application area.
10. External `GCp` is selected from the applicable 2B/2C curve using the purlin effective wind area, with explicit low/high-area plateaus and log10 interpolation between 10 and 100 ft².
11. Positive and negative `GCp` remain separate for every actual zone-intersection piece; a multi-zone purlin is never collapsed to one convenient zone coefficient.
12. Deterministic benchmarks cover 2B and 2C coefficient values, effective-area enlargement, multi-zone behavior, serialization, provenance mutation, and anti-promotion boundaries.
13. Roof-sheet/fastener effective areas, external pressure term, external-minus-internal combination, final code-derived pressure and automatic Roof Bay code-pressure routing remain blocked.
14. The previously-green PR #125 implementation was transplanted onto current `main` after the FutolTech Engineering Mode merge; this documentation-updated exact head must pass the complete Engineering Checks suite before merge.

Current M3 task after this candidate merges: **source-backed external roof pressure term `qh × GCp` with explicit sign convention and per-zone-piece provenance**.

Dependency order for the next slices:
1. Multiply the verified `qh` by each resolved external `GCp` without yet combining internal pressure.
2. Preserve positive/downward and negative/suction external terms independently for each actual zone-intersection piece.
3. Benchmark the external term independently before combining it with `qi(GCpi)`.
4. Then implement `external - internal` pressure cases with transparent sign convention and governing envelopes.
5. Then add traceable code wind load-case/load-combination routing and activate code-derived Roof Bay pressure only after the complete chain passes independent end-to-end benchmarks.
6. Keep roof-sheet and fastener effective areas separate and unresolved; they must not inherit the purlin effective area.

Permanent M3 rule: a resolved internal-pressure term, effective-wind-area basis, zone geometry, external coefficient, or external pressure term alone is not final roof pressure. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, zoning and pressure-combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, `M3_INTERNAL_PRESSURE_TERM.md`, `M3_ROOF_PURLIN_EFFECTIVE_WIND_AREA.md`, `M3_ROOF_ZONE_GEOMETRY.md`, and `M3_ROOF_EXTERNAL_GCP.md`.