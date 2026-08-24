# Active Structural Lab Milestone

Current milestone transition: **Roof Resilience Physics M3 — Code Wind / Roof Zoning Engine CLOSED CANDIDATE; M4 Roof Sheet + Fastener / Connection Layer is next after PR #135 merges.**

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
- **PR #121** — reusable internal-pressure velocity/signed-term foundation; Part 3 opening-height `qi=qz` remains blocked from the current Part 1 low-rise route.
- **PR #123** — roof-purlin C&C effective wind area.
- **PR #124** — symmetric-gable field/edge/corner geometry + exact purlin tributary-band zone intersections.
- **PR #127** — external roof `GCp` selection.
- **PR #128** — external-only `qh × GCp`; merged as `3588219906b1171a348b5d4bf135e9476e1138db`.
- **PR #129** — low-rise Part 1 net roof pressure + minimum directional design envelopes; merged as `51fbc2bdd6487b06b3255c98672f8c1c21853b5a`.
- **PR #130** — exact physical Roof Bay code-pressure routing/conservation; merged as `f2bf5a83711d88736b2ffaa2e2a4d6001cc0e7cb`.
- **PR #131** — signed `W-TOWARD` / `W-AWAY` identity + source-backed strength-template W contributions; merged as `7727f5e009ceb67e7beb5db9be1dadc6a5ffa40a`.
- **PR #132** — companion structural action acceptance/routing; merged as `b656312b4c089717e2b0cdac44dee4d7570b5114`.
- **PR #133** — source-backed strength-combination action-result assembly; merged as `d38fea07ee49438edd0481a48fa89730e4cc5488`.
- **PR #134** — controlled code-derived Roof Bay demand activation with manual-uniform fallback retained; exact documentation-updated head passed 46/46 Engineering Checks and merged as `2f03ea6986c32cfcfff8f7656651a03d5845c440`.
- **PR #135 candidate** — independent end-to-end M3 exit audit + exact tributary-band compatibility hardening. Preliminary exact implementation head `1a8a1d4edeec93179801762f86207f43a13a6a05` passed the complete 46/46 Engineering Checks suite.

Why M3 may close after PR #135:
1. The written M3 roadmap ends at reproducible code-derived wind/zoning, signed pressure cases, traceable load combinations and an independent benchmark; it does not require member-capacity design.
2. The exit audit independently reconstructs Exposure-C `Kz/qh`, Figure 207E.4-2B `GCp`, `qh[(GCp)-(GCpi)]`, the ±0.77 kPa directional envelopes, each physical `F=pA` zone piece, exact Rafter A/B statics, D/Lr slope resolution, the selected 203-4 away combination and controlled Roof Bay activation.
3. The audit added an adversarial geometry regression: a fully valid upstream M3 chain with unchanged purlin centerlines but shifted tributary-band boundaries must be rejected. Activation now requires exact station/start/end/width compatibility for every purlin band.
4. Unresolved rain remains unresolved. 203-3/203-4 cannot become complete unless the explicit engineer-sourced `lr-selected-r-not-applicable` decision contract is satisfied; absence is never treated as `R=0`.
5. The original M2 manual-uniform Roof Bay solver remains a separate fallback and is never overwritten by code-derived activation.

Permanent post-M3 boundary:
- M3 closure means **code wind/zoning/load-combination demand derivation and controlled activation are complete for the implemented scope**.
- It does **not** mean purlin stress/deflection/capacity, roof-sheet capacity, screw/fastener capacity, purlin-to-rafter connection capacity, rafter/truss capacity, or cold-formed local/distortional/LTB design is complete.
- Those responsibilities remain later gates: M4 connections/sheet-fasteners, M6 system solver and M7 cold-formed design.
- `authorizedCopyReviewRequired=true` remains permanent for project use where the governing NSCP text must be verified against an authorized copy.

Merge gate for PR #135: after these closure records are synchronized, the **exact documentation-updated head must pass all 46/46 Engineering Checks again**. Only that exact head may be merged. After merge, the next active Roof Resilience milestone is **M4 — Roof Sheet + Fastener / Connection Layer**.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and `M3_END_TO_END_EXIT_AUDIT.md`.