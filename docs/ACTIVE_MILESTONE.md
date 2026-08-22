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

Completed partially enclosed large-volume layer: **engineer-gated `Ri` applicability + equation — PR #120**. The slice preserves the conservative `Ri = 1.0` path, requires source-referenced `Aog` and `Vi` for the equation path, and never silently selects the beneficial reduction.

Completed internal-pressure velocity layer: **source-backed `qi` selection + signed `qi(GCpi)` term — PR #121**. The exact PR head `9a458078f610a35a678213583f0f91462bba7dcb` passed the complete Engineering Checks suite before merge; PR #121 was squash-merged as `5acab72d3848ee1b3e55191560577dc965b15d08` on 2026-08-22.

Implemented through PR #121:
1. Versioned `futoltech.wind-internal-pressure-term/1` records stay attached to the exact accepted upstream coefficient chain.
2. Enclosed buildings use `qi = qh` for both positive and negative internal-pressure cases.
3. Partially enclosed negative internal pressure uses `qi = qh`.
4. Partially enclosed positive internal pressure may use source-referenced `qz` at the highest relevant opening or the explicit conservative `qi = qh` path.
5. The highest-opening elevation is never inferred; exact-opening `qz` requires the project elevation and source reference.
6. Partially enclosed records may not bypass the explicit `Ri` decision record, including the conservative `Ri = 1.0` path.
7. The signed internal-pressure term is preserved as `qi * (GCpi)` rather than being prematurely combined with an external coefficient.
8. Open buildings retain `GCpi = 0` and therefore zero internal-pressure term.
9. Deterministic validation recalculates `qh`, optional opening-height `qz`, `qi`, and `qi(GCpi)` and rejects mutation.
10. External pressure coefficients, effective wind area, field/edge/corner zoning, pressure combination, load combinations, and final code-derived Roof Bay pressure remain hard-blocked.

Current M3 task: **roof Components & Cladding target/procedure + effective-wind-area foundation**.

Dependency order for this next slice:
1. Explicitly distinguish the roof C&C design target from MWFRS rather than allowing one coefficient path to serve every roof item.
2. Define source-backed effective-wind-area records for the supported roof component/member class, keeping actual load tributary area separate from coefficient-selection effective area.
3. Require explicit project/member geometry and evidence where the value cannot be deterministically derived from the accepted Roof Bay geometry.
4. Preserve conservative/engineer-selection boundaries where the code permits an effective-width treatment; no silent beneficial area enlargement.
5. Keep external `GCp`, field/edge/corner coefficient mapping, external-minus-internal pressure combination, load combinations, and automatic Roof Bay code pressure blocked until their own benchmarked gates are complete.

Permanent M3 rule: even a resolved internal-pressure term and effective-wind-area basis are not final roof pressure. Manual pressure remains the active Roof Bay path until the complete internal/external coefficient, zoning, and pressure-combination chain is verified.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_WIND_DESIGN_BASIS.md`, `M3_VELOCITY_PRESSURE.md`, `M3_PROJECT_WIND_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PROJECT_WIND_INPUT_UI.md`, `M3_ENCLOSURE_ROOF_GEOMETRY_INPUT_ACCEPTANCE.md`, `M3_ROOF_BAY_PRESSURE_CONTEXT_UI.md`, `M3_INTERNAL_PRESSURE_COEFFICIENT.md`, `M3_LARGE_VOLUME_RI.md`, and `M3_INTERNAL_PRESSURE_TERM.md`.