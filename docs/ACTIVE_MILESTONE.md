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

Completed roof C&C zoning geometry: **source-backed symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections — PR #124**, squash-merged as `a0abdff0275ed6df35cf94317d4912c9be8e2f2b` after exact final-head Engineering Checks passed.

Completed implementation candidate for the current coefficient slice: **source-backed external roof `GCp` selection for the supported purlin C&C path — PR #125**.

Implemented through PR #125 candidate:
1. Versioned `futoltech.wind-roof-external-gcp/1` records consume the exact PR #124 roof-zone geometry and PR #123 purlin effective-area records.
2. Both upstream records must reference the exact same accepted wind pressure context, purlin span, actual tributary width and actual physical load area.
3. Initial scope is an explicitly confirmed non-overhang symmetric gable roof with mean roof height `h <= 18 m`.
4. Figure selection remains inherited from verified PR #124 geometry: `207E.4-2B` for `7° < θ <= 27°`; `207E.4-2C` for `27° < θ <= 45°`.
5. Metric effective wind area is converted to ft² only for the published logarithmic curve equations; physical tributary/load area is never replaced by coefficient-selection area.
6. Curve evaluation preserves the `<=10 ft²` low-area plateau, `10–100 ft²` log10 interpolation region and `>=100 ft²` high-area plateau.
7. A purlin band crossing multiple roof zones receives separate positive and negative `GCp` cases for every actual field/edge/corner intersection piece. One convenient whole-member zone or coefficient is prohibited.
8. Independent deterministic benchmarks protect both 2B and 2C coefficient families, including one-third-span effective-area enlargement without changing physical zone-intersection area.
9. Provenance references must remain non-empty; fixed rule text and the engineering boundary cannot be silently rewritten during serialized round-trip.
10. The named syntax gate now explicitly covers both `windRoofZoneGeometry.js` and `windRoofExternalGcp.js`.
11. `GCp` remains dimensionless only. External pressure, internal/external combination, roof-sheet/fastener effective area, purlin capacity and automatic code-derived Roof Bay pressure all remain blocked.
12. PR #125 preliminary exact head `829b069513030057accf0fea3ab20316f4dafdb9` passed the complete Engineering Checks suite before these milestone files were advanced; the documentation-updated exact final head must also pass the complete suite before merge.

Current M3 task: **source-backed external roof pressure term `qh × GCp`**.

Dependency order for the next slice:
1. Consume the accepted project velocity-pressure chain and the exact PR #125 external `GCp` record.
2. Compute signed external pressure separately for every existing positive/negative coefficient case and every actual zone-intersection piece.
3. Preserve `qh`, `GCp`, sign convention, zone identity, effective-area provenance and actual physical zone area as separate traceable inputs.
4. Do **not** subtract the already-resolved internal term yet; external-minus-internal pressure is a later independent gate.
5. Keep load combinations, roof-sheet/fastener design, purlin capacity promotion and automatic Roof Bay code-pressure routing blocked until their own benchmarked gates are complete.

Permanent M3 rule: a resolved internal-pressure term, effective-wind-area basis, zone geometry, external coefficient or external pressure term is still not final net roof pressure. Manual pressure remains the active Roof Bay path until the complete external-minus-internal pressure and load-combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, `M3_INTERNAL_PRESSURE_TERM.md`, `M3_ROOF_PURLIN_EFFECTIVE_WIND_AREA.md`, `M3_ROOF_ZONE_GEOMETRY.md`, and `M3_ROOF_EXTERNAL_GCP.md`.