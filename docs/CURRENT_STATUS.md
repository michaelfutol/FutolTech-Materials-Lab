# Current Structural Lab Status

Status date: 2026-08-22

The active engineering milestone is **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112. M3 code/version provenance merged in PR #113, the benchmarked NSCP 2015 velocity-pressure chain merged in PR #114, and source-backed project wind-input acceptance merged in PR #115 after final-head Engineering Checks passed.

The current PR #116 candidate exposes that acceptance workflow directly in Roof Bay and preserves accepted records in project JSON while keeping the live pressure model `manual-uniform`. Enclosure/internal-pressure classification, roof-plan geometry, external/internal pressure coefficients, field/edge/corner zoning, load combinations and final code-derived Roof Bay pressure remain intentionally blocked pending source-backed implementation and independent verification.
