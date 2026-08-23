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

Current completion candidate: **PR #130 — code-derived Roof Bay pressure routing + exact area/force/reaction/moment conservation**.

Implemented in the PR #130 candidate:
1. Versioned `futoltech.wind-roof-bay-code-pressure-routing/1` requires exactly one verified PR #129 net-pressure record for every physical purlin tributary band in one exact PR #124 Roof Bay zone-geometry record.
2. Routing direction is explicit: `toward-surface` or `away-from-surface`; strength/service load combinations are not created in this slice.
3. Every stored purlin-band zone piece is reconstructed as its exact physical intersection rectangle from the upstream whole-roof zone cell and physical tributary-band rectangle.
4. The selected directional **design pressure** is applied to that exact physical area; the governing raw `GCp`, `GCpi`, `qh`, raw net pressure and case identity remain attached.
5. Pressure becomes piece force by `F = p × A` and piecewise purlin line load by `w = p × tributary width`.
6. Rafter A/B reactions are resolved from the true spanwise resultant centroid, not by an assumed 50/50 split: `RB = F x̄/L`, `RA = F - RB`.
7. Each physical piece, every purlin and the complete Roof Bay are regression-protected for area, signed force and moment conservation.
8. The 25° benchmark bay crossing a gable-end strip intentionally produces asymmetric suction reactions: total `-46.769510965040396 kN`, Rafter A `-24.4711529728144 kN`, Rafter B `-22.298357992225995 kN`, with applied/reaction moment about A both `-89.19343196890398 kN·m`.
9. The toward-surface benchmark gives total `+19.79058581298942 kN` and equal A/B reactions because its spanwise pressure distribution is symmetric.
10. A 60 kph low-wind regression proves the router consumes the PR #129 minimum-governed `-0.77 kPa` design pressure rather than the smaller unfloored raw pressure.
11. The strengthened preliminary exact head passes the complete Engineering Checks suite, including an exact per-piece `RB·L = F·x̄` regression within `1e-12`.
12. Live manual-uniform Roof Bay UI remains active and distinct; piecewise purlin member response/capacity, rafter/connection capacity, roof-sheet/fastener design and load combinations remain blocked.

Current M3 task after PR #130 merges: **explicit code-wind load-case / load-combination identity**.

Dependency order:
1. Define source-backed wind load-case identity separately from the already derived pressure physics; combination factors must never be folded backward into `qh`, `GCp`, `GCpi` or the net-pressure calculation.
2. Preserve toward-surface / away-from-surface, zone-piece, purlin and governing raw-case identity through every generated wind case.
3. Keep strength/service or other applicable combination families explicit, traceable and procedure-scoped; do not silently select or mix combinations.
4. After case/combination identity is verified, add controlled Roof Bay project/UI activation of the code-derived route while retaining manual-uniform mode as a clearly separate option during transition.
5. Piecewise purlin stress/deflection under code pressure is a later member-response gate; routing alone does not promote purlin capacity.
6. Close M3 only after an independent end-to-end benchmark confirms accepted project/site inputs → `qh` → `GCp/GCpi` → minimum-governed net zone pressures → physical piecewise purlin loads → Rafter A/B reactions → explicit wind case identity, with conservation and final-head QA green.

Permanent M3 rule: procedure applicability, source provenance, physical area, pressure sign/case identity and conservation are all solver state. A verified routing record is not by itself a complete design combination or capacity check. Manual pressure remains available until the controlled code-derived activation gate passes.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_BAY_CODE_PRESSURE_ROUTING.md`.