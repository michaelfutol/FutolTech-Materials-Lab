# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics — M3 Code Wind / Roof Zoning Engine**.

M2 Roof Bay is closed through PR #112.

Completed M3 chain:
- **PR #113** — code/version + wind-input provenance.
- **PR #114** — benchmarked NSCP 2015 velocity-pressure chain.
- **PR #115** — source-backed project wind-input acceptance.
- **PR #116** — Roof Bay project wind-input + project JSON bridge.
- **PR #117** — enclosure + roof/building geometry acceptance.
- **PR #118** — Roof Bay pressure-context integration.
- **PR #119** — base `GCpi` foundation.
- **PR #120** — engineer-gated partially enclosed large-volume `Ri`.
- **PR #121** — reusable internal-pressure velocity/signed-term foundation; its Part 3 opening-height `qi=qz` path remains blocked from the current Part 1 low-rise route.
- **PR #123** — roof-purlin C&C effective wind area.
- **PR #124** — symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections.
- **PR #127** — external roof `GCp` selection.
- **PR #128** — independently benchmarked external-only `qh × GCp`; exact final-head Engineering Checks passed and it merged as `3588219906b1171a348b5d4bf135e9476e1138db`.
- **PR #129** — low-rise Part 1 net roof pressure `qh[(GCp) - (GCpi)]` + minimum directional design envelopes; exact final-head Engineering Checks passed and it merged as `51fbc2bdd6487b06b3255c98672f8c1c21853b5a`.
- **PR #130** — code-derived Roof Bay physical pressure routing with exact area/force/reaction/moment conservation; exact final-head Engineering Checks passed and it merged as `f2bf5a83711d88736b2ffaa2e2a4d6001cc0e7cb`.

Current completion candidate: **PR #131 — explicit roof wind action identity + source-backed strength-combination wind contribution templates**.

Implemented in the PR #131 candidate:
1. Versioned `futoltech.wind-roof-load-case-combination/1` consumes the exact paired PR #130 toward-surface and away-from-surface routing records.
2. The two verified directional actions remain distinct canonical cases: `W-TOWARD` and `W-AWAY`; case identity is not collapsed into one unsigned wind magnitude.
3. Each W case preserves the exact upstream purlin, field/edge/corner zone-piece, governing raw pressure-case, signed force and Rafter A/B reaction trace.
4. Pressure physics remains immutable upstream: no combination factor is folded backward into `qh`, `GCp`, `GCpi`, net pressure or PR #130 routing.
5. Source-backed NSCP 2015 Section 203.3.1 strength/LRFD wind-bearing templates are represented for the 203-3 wind branch (`0.5W`), 203-4 (`1.0W`) and 203-6 (`1.0W`).
6. The solver computes the **W contribution only** for each template and each wind direction.
7. Companion D/L/Lr/R/H terms and `f1` remain explicit unresolved inputs; therefore every full-combination result remains `null` rather than being fabricated from missing actions.
8. ASD/service combinations, complete combined member demand, live code-derived Roof Bay UI activation, piecewise purlin response/capacity and connection capacity remain blocked.
9. Deterministic tests protect exact W+/W− identity, `0.5W / 1.0W` scaling, physical route preservation, serialization/mutation and the hard `fullCombinationResult = null` boundary.
10. The preliminary exact implementation head passed the complete **45/45 Engineering Checks** suite.

Current M3 task after PR #131 merges: **accept and route the companion structural actions required to form complete source-backed roof combinations without manufacturing missing load components**.

Dependency order:
1. Define versioned, source/assumption-traceable companion action records for the applicable roof combination terms (D, L, Lr/R/H and required coefficients such as `f1`) rather than embedding anonymous scalar values in the combination solver.
2. Reuse existing Roof Bay gravity/self-weight information where physically equivalent, but do not silently relabel an existing manual load as a code action without an explicit mapping and provenance/assumption record.
3. Preserve signed action/case identity and units through combination assembly.
4. Only after all required terms for a selected template are available may the engine produce a non-null full combination result.
5. Controlled Roof Bay project/UI activation of the verified code-derived wind route follows the combination bridge; manual-uniform mode remains a clearly separate option during transition.
6. Piecewise purlin stress/deflection and capacity under code pressure remain a later member-response gate.
7. Close M3 only after an independent end-to-end benchmark confirms accepted project/site inputs → `qh` → `GCp/GCpi` → minimum-governed net zone pressures → physical piecewise purlin loads → Rafter A/B reactions → explicit W case → source-backed combination identity/result, with conservation and final-head QA green.

Permanent M3 rule: procedure applicability, source provenance, physical area, pressure sign/case identity, conservation and structural action identity are solver state. A verified W contribution is not a complete load combination until every required companion action is present and traceable. Manual pressure remains available until the controlled code-derived activation gate passes.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_WIND_LOAD_CASE_COMBINATION.md`.