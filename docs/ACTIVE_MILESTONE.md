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
- **PR #128** — independently benchmarked external-only `qh × GCp`; merged as `3588219906b1171a348b5d4bf135e9476e1138db`.
- **PR #129** — low-rise Part 1 net roof pressure + minimum directional design envelopes; merged as `51fbc2bdd6487b06b3255c98672f8c1c21853b5a`.
- **PR #130** — exact physical Roof Bay code-pressure routing/conservation; merged as `f2bf5a83711d88736b2ffaa2e2a4d6001cc0e7cb`.
- **PR #131** — explicit `W-TOWARD` / `W-AWAY` identity + source-backed strength-template W contributions; exact final-head 45/45 Engineering Checks passed and it merged as `7727f5e009ceb67e7beb5db9be1dadc6a5ffa40a`.

Current completion candidate: **PR #132 — companion structural action acceptance/routing**.

Implemented in the PR #132 candidate:
1. Versioned `futoltech.wind-roof-companion-actions/1` consumes the exact PR #131 wind-action/combination record.
2. `D` and `Lr` remain distinct actions. Roof live load is never relabeled as ordinary `L`.
3. Source-referenced roof-area `D` and `Lr` are partitioned over the exact same physical Roof Bay rectangles already verified by PR #130.
4. Vertical gravity is resolved into roof-normal and roof-downslope components from the accepted roof slope; Rafter A/B reactions use the actual spanwise piece location.
5. Purlin self-weight is a separate source-referenced line action inside `D`, one entry per physical purlin, so it is not double-counted as roof-area pressure.
6. `L` and `H` are accepted only as explicit target-specific zero/not-applicable decisions with traceable basis for the current roof-purlin target.
7. `R` remains `UNRESOLVED`; absence of rain input is not treated as zero.
8. `f1 × L` is resolved as zero only because the accepted current target has `L = 0`; `f1` itself is not silently inferred.
9. 25° benchmark: Roof Bay area `17.654046703399867 m²`; `D = 0.20 kPa` plus two `0.05 kN/m` purlin self-weights gives `3.9308093406799736 kN` vertical, `3.5625231148146597 kN` roof-normal and `1.6612318107922752 kN` downslope. `Lr = 0.75 kPa` gives `13.2405350275499 kN` vertical, `12.0 kN` roof-normal and `5.595691897859982 kN` downslope.
10. Complete strength combinations, rain calculation/applicability selection, code-derived Roof Bay UI activation and member/capacity promotion remain blocked.
11. Preliminary exact implementation head passed the complete **45/45 Engineering Checks** suite.

Current M3 task after PR #132 merges: **resolve the rain/action-alternative decision required by `(Lr or R)` and assemble only those complete source-backed strength combinations whose required actions are actually available**.

Dependency order:
1. Resolve `R` with an explicit project rain action or an explicit source/engineering-backed applicability decision; never convert unresolved R to zero by omission.
2. Preserve `D`, `L`, `Lr`, `R`, `H`, W direction and every physical load-path identity through combination assembly.
3. Assemble NSCP-203-6 immediately only when all required actions are explicitly resolved; assemble 203-3/203-4 only after the `Lr or R` alternative is explicit.
4. Keep combination factors downstream of immutable pressure/action physics.
5. Controlled code-derived Roof Bay project/UI activation follows verified complete combination assembly; manual-uniform mode remains clearly distinct during transition.
6. Piecewise purlin stress/deflection and capacity under code pressure remain a later member-response gate.
7. Close M3 only after an independent end-to-end benchmark confirms accepted project/site inputs → `qh` → `GCp/GCpi` → net zone pressures → physical purlin loads → Rafter A/B reactions → W identity → companion actions → complete source-backed combination assembly, with conservation and final-head QA green.

Permanent M3 rule: an absent action is not zero unless the project/target record explicitly says it is zero or not applicable with traceable basis. Complete combination status requires every required action/alternative to be resolved.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_COMPANION_ACTIONS.md`.