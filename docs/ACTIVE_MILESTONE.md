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
- **PR #133** — source-backed strength-combination action-result assembly; exact documentation-updated final head passed 45/45 Engineering Checks and it merged as `d38fea07ee49438edd0481a48fa89730e4cc5488`.

Current completion candidate: **PR #134 — controlled code-derived Roof Bay demand activation**.

Implemented in the PR #134 candidate:
1. Versioned `futoltech.roof-bay-code-derived-activation/1` selects exactly one already-complete PR #133 action result; it never recalculates `qh`, `GCp`, `GCpi`, zoning, pressure routing, companion actions or combinations.
2. Activation requires an exact accepted pressure-context match plus matching rafter spacing/span, roof slope length, roof slope angle, exact physical purlin stations, D roof-area pressure and Lr pressure.
3. PR #132 did not encode selected C-purlin section ID inside its purlin self-weight actions. #134 therefore requires explicit engineer confirmation plus a traceable source reference that the imported self-weight basis matches the active Roof Bay section; this relation is never inferred.
4. Only cases whose PR #133 `fullCombinationResult` exists, whose status is `COMPLETE_STRENGTH_COMBINATION_ACTION_RESULT`, and whose stored equilibrium passes may be activated.
5. With rain unresolved, the V10 activation chooser exposes only the two complete 203-6 wind-direction cases; blocked 203-3/203-4 cases cannot leak into the selectable list.
6. The original M2 manual-uniform solver remains intact as a separate fallback. `pressureZoning.activePressureModel` remains `manual-uniform`; activation is an attached selected-demand record, not a rewrite of the M2 solver.
7. Any active Roof Bay/project input edit, accepted wind-input change or accepted pressure-context change invalidates the code-derived activation immediately and restores manual fallback.
8. Roof Bay project JSON attaches the validated activation as `codeDerivedActivation` while preserving the base M2/manual project state.
9. V10 displays only the selected verified template/case identity, W direction, Lr/R state, combined roof-normal/down-slope forces, Rafter A/B normal reactions and stored equilibrium result.
10. Piecewise purlin stress/deflection under code-derived demand, cold-formed local/distortional/LTB, roof-sheet/fastener/connection capacity, rafter/truss capacity and any member PASS/FAIL promotion remain blocked.
11. Dedicated real-Chromium QA reconstructs the benchmark M3 chain from solver modules and proves activation, exact result display, project JSON attachment, stale-input invalidation, unresolved-rain filtering and manual fallback.
12. Preliminary exact implementation head passed the complete **46/46 Engineering Checks** suite.

Current M3 task after PR #134 merges: **perform the independent end-to-end M3 exit audit / benchmark**.

Dependency order:
1. Reconstruct one accepted project/site benchmark from source-referenced inputs rather than importing precomputed intermediate values.
2. Trace the exact identity chain: accepted site/project inputs → `qh` → external/internal coefficient state → raw and minimum-governed net zone pressures → exact physical purlin-piece routing → Rafter A/B reactions → signed W cases → D/Lr/L/H/R companion state → complete source-backed strength combination → controlled Roof Bay activation.
3. Independently verify units, sign convention, pressure-zone/physical-piece identity, area conservation, force conservation and moment conservation at every available boundary.
4. Confirm unresolved alternatives remain blocked rather than silently zero/selected.
5. Confirm project JSON preserves the accepted evidence/identity chain and stale changes invalidate downstream activation.
6. Decide M3 closure only from the written M3 scope: if the verified activated structural action demand is the M3 endpoint, close M3 after the exit audit; piecewise purlin member response/capacity then begins the separate later member-response gate. If the roadmap explicitly requires member response inside M3, do not close until that requirement is met.
7. Exact documentation-updated final-head QA must remain green before any milestone close/merge.

Permanent M3 rule: an absent action is not zero unless the project/target record explicitly says it is zero or not applicable with traceable basis. Complete combination status requires every required action/alternative to be resolved. Public project calculations are cross-checks, not substitutes for the authorized governing code text. UI activation never upgrades a verified action result into a member-capacity claim.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_CODE_DERIVED_ACTIVATION.md`.