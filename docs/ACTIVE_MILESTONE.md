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
- **PR #132** — companion structural action acceptance/routing; exact final-head 45/45 Engineering Checks passed and it merged as `b656312b4c089717e2b0cdac44dee4d7570b5114`.

Current completion candidate: **PR #133 — source-backed roof strength-combination action-result assembly**.

Implemented in the PR #133 candidate:
1. Versioned `futoltech.wind-roof-strength-combination-assembly/1` consumes the exact PR #132 companion-action record and its paired signed W cases.
2. All six template × wind-direction identities are preserved for NSCP-203-3-W, 203-4 and 203-6; toward/away W is never collapsed into one unsigned case.
3. With `R` unresolved, 203-3 and 203-4 remain explicitly blocked; both 203-6 directions assemble completely from accepted D + W + explicit target-specific H=0.
4. An `lr-selected-r-not-applicable` path exists only with `engineerConfirmedRainNotApplicable=true`, a non-empty decision source reference and a non-empty rationale. It does not claim R was calculated or compared.
5. Complete 203-3/203-4 Lr-path cases preserve exact physical field/edge/corner pieces, governing W raw-case identity, D/Lr action geometry and D purlin self-weight trace.
6. Combination factors remain downstream of immutable `qh`, `GCp`, `GCpi`, net pressure, physical W routing and accepted gravity-action physics.
7. Every complete case checks roof-normal force, roof-downslope force, normal moment, downslope moment and purlin-to-Roof-Bay conservation against Rafter A/B reactions.
8. 25° Lr benchmark reproduces: 203-3 toward `+33.370320644272304 kN` normal / `+10.946585209526702 kN` downslope; 203-3 away `+0.09027225525739624 / +10.946585209526702 kN`; 203-4 toward `+30.06561355076701 / +4.791324121880722 kN`; 203-4 away `-36.494483227262805 / +4.791324121880722 kN`; 203-6 toward `+22.996856616322614 / +1.4951086297130478 kN`; 203-6 away `-43.5632401617072 / +1.4951086297130478 kN`.
9. Public government project documents conflict on one 203-3 transcription: multiple DPWH plans show `1.6(Lr or R)`, while one BIR calculation shows `1.6(Lr + R)`. `authorizedCopyReviewRequired=true` therefore remains permanent before project use.
10. Rain-load calculation, automatic governing Lr/R selection, code-derived Roof Bay UI activation, piecewise purlin response/capacity and connection capacity remain blocked.
11. Preliminary exact implementation head passed the complete **45/45 Engineering Checks** suite.

Current M3 task after PR #133 merges: **controlled project/UI activation of the verified code-derived Roof Bay route and complete strength-combination result, while retaining manual-uniform mode as a visibly separate transition path**.

Dependency order:
1. Expose only accepted/verified code-derived records already produced by the M3 chain; the UI must never recompute a parallel hidden pressure or combination model.
2. Require explicit `Lr or R` resolution before presenting 203-3/203-4 as complete; unresolved rain must remain visibly blocked.
3. Keep manual-uniform Roof Bay mode selectable and clearly labeled rather than silently replacing it.
4. Preserve selected W direction, physical zone-piece identity, companion-action provenance and combination case ID in project JSON/print trace.
5. Run a dedicated real-Chromium activation/invalidation gate.
6. After activation, perform the independent end-to-end M3 benchmark from accepted site/project inputs through complete combination result and close M3 only if full final-head QA remains green.
7. Piecewise purlin stress/deflection and capacity under code pressure remain a later member-response gate after M3.

Permanent M3 rule: an absent action is not zero unless the project/target record explicitly says it is zero or not applicable with traceable basis. Complete combination status requires every required action/alternative to be resolved. Public project calculations are cross-checks, not substitutes for the authorized governing code text.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_STRENGTH_COMBINATION_ASSEMBLY.md`.