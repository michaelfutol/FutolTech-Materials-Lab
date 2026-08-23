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

Completed internal-pressure velocity layer: **source-backed `qi` selection + signed `qi(GCpi)` term — PR #121**. This remains a reusable/general pressure-term foundation, but its opening-height `qi=qz` option belongs to the higher-building Part 3 procedure and is not automatically reused by the current `h <= 18 m` Part 1 C&C path.

Completed roof C&C effective-area foundation: **source-backed roof-purlin target + coefficient-selection effective wind area — PR #123**.

Completed M3 zoning slice: **source-backed symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections — PR #124**.

Completed external-coefficient slice: **source-backed external roof `GCp` selection for roof-purlin C&C — PR #127**.

Current completion candidate: **source-backed external roof pressure term `qh × GCp` — PR #128**.

Implemented through the PR #128 candidate:
1. The exact accepted project wind/context chain remains the single source for mean-roof-height velocity pressure `qh`.
2. External `GCp` remains tied to the exact PR #123 effective wind area and PR #124 physical zone-intersection pieces.
3. `qh × GCp` is evaluated independently for every actual field/edge/corner zone piece; coefficients are never averaged across a multi-zone purlin band.
4. Positive external pressure is defined as **toward the roof surface**; negative external pressure is **away from the roof surface / suction**.
5. The benchmarked Exposure C, `h=8.82 m`, `V=240 kph`, `Kzt=1.0` chain gives `qh = 2.257467958862151 kPa` and preserves the corresponding positive/negative external pressures per zone piece.
6. Deterministic tests protect 2B/2C external-pressure values, exact upstream provenance, serialization/mutation boundaries, and physical zone-piece separation.
7. A deliberately low-pressure regression proves the NSCP minimum C&C pressure is **not** applied to this external-only term.
8. Internal-pressure subtraction, governing net-pressure envelopes, the ±0.77 kPa minimum, load combinations, and automatic Roof Bay code-pressure routing remain blocked.
9. Roof-sheet and fastener effective wind areas remain separate and unresolved; they cannot inherit the purlin effective area.

Current M3 task after PR #128 merges: **low-rise Part 1 net roof pressure `qh[(GCp) - (GCpi)]`**.

Dependency order for the next slices:
1. Combine each verified external zone-piece term with both applicable internal `GCpi` signs using the current Part 1 rule and `qh` as the internal velocity basis.
2. Do **not** import PR #121's Part 3 opening-height `qi=qz` option into the current `h <= 18 m` path.
3. Preserve and benchmark all toward-surface and away-from-surface net cases before selecting governing envelopes.
4. Apply the NSCP minimum C&C pressure of **0.77 kPa in either direction** only at the net-design-pressure stage, never to `GCp` or the external-only term.
5. Then add traceable code wind load-case/load-combination routing and activate code-derived Roof Bay pressure only after the complete chain passes independent end-to-end benchmarks and conservation checks.
6. Keep roof-sheet and fastener effective areas separate and unresolved; they must not inherit the purlin effective area.

Permanent M3 rule: a resolved internal-pressure term, effective-wind-area basis, zone geometry, external coefficient, or external-only pressure term alone is not final roof pressure. Procedure applicability is part of the solver state. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, zoning, net-pressure, minimum-pressure and routing chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, `M3_INTERNAL_PRESSURE_TERM.md`, `M3_ROOF_PURLIN_EFFECTIVE_WIND_AREA.md`, `M3_ROOF_ZONE_GEOMETRY.md`, `M3_ROOF_EXTERNAL_GCP.md`, and `M3_ROOF_EXTERNAL_PRESSURE_TERM.md`.