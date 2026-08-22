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

Completed implementation candidate for the current M3 zoning slice: **source-backed symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections — PR #124**.

Implemented through PR #124 candidate:
1. Versioned `futoltech.wind-roof-zone-geometry/1` records attach to the accepted wind pressure context.
2. The supported initial geometry is an explicitly confirmed symmetric gable roof with source-referenced ridge direction and selected roof plane.
3. Roof Bay placement is registered inside whole-roof coordinates by ridge-parallel start station and bay span; local bay geometry is never guessed to be field, edge or corner.
4. The supported gable figure family respects the 27° boundary: `207E.4-2B` for `7° < θ <= 27°` and `207E.4-2C` for `27° < θ <= 45°`.
5. Edge dimension `a` is calculated in horizontal plan from the accepted least horizontal building dimension and the applicable source-backed height; low slopes require eave height while steeper roofs use the accepted mean roof height.
6. The eave strip is mapped to the sloping roof surface as `a / cos(θ)`; the ridge is not treated as an exterior roof edge in this symmetric-gable slice.
7. Zone 1/field, Zone 2/edge and Zone 3/corner are stored as deterministic non-overlapping roof-surface cells.
8. Every physical purlin tributary band is intersected with the zone cells. One band may therefore carry separate field, edge and corner areas instead of being assigned one convenient zone label.
9. Per-band and whole-Roof-Bay area-conservation checks must pass; deterministic serialization and mutation rejection protect the geometry.
10. Overhang geometry, external `GCp`, roof-sheet/fastener effective areas, external-minus-internal pressure combination, final code-derived pressure and automatic Roof Bay code-pressure routing remain blocked.
11. PR #124 preliminary exact head passed the complete Engineering Checks suite before these milestone files were advanced; the documentation-updated exact final head must also pass the complete suite before merge.

Current M3 task: **source-backed external roof `GCp` selection foundation**.

Dependency order for the next slice:
1. Consume the exact PR #124 zone geometry together with roof form/slope and the PR #123 purlin coefficient-selection effective wind area.
2. Select/interpolate external roof `GCp` only from the applicable supported figure/rule and preserve full provenance plus visible substitutions/benchmarks.
3. Do not collapse a purlin tributary band that crosses multiple zones into one coefficient; coefficient application must follow the actual zone-intersection pieces.
4. Keep roof-sheet and fastener effective areas separate and unresolved; they must not inherit the purlin effective area.
5. Keep external pressure term, external-minus-internal pressure combination, load combinations and automatic Roof Bay code pressure blocked until their own benchmarked gates are complete.

Permanent M3 rule: a resolved internal-pressure term, effective-wind-area basis, zone geometry or future external coefficient is not final roof pressure. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, zoning and pressure-combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, `M3_INTERNAL_PRESSURE_TERM.md`, `M3_ROOF_PURLIN_EFFECTIVE_WIND_AREA.md`, and `M3_ROOF_ZONE_GEOMETRY.md`.