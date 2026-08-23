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

Current completion candidate: **PR #129 — low-rise Part 1 net roof pressure `qh[(GCp) - (GCpi)]` + minimum directional design envelopes**.

Implemented in the PR #129 candidate:
1. Versioned `futoltech.wind-roof-net-pressure/1` consumes the exact PR #128 external-pressure record and an internal `GCpi` record tied to the exact same accepted pressure context.
2. Current procedure remains Part 1 Components & Cladding, roof-purlin target, `h <= 18 m`, enclosed or partially enclosed.
3. Internal velocity basis is forced to `qh`; PR #121's Part 3 opening-height `qi=qz` option is explicitly prohibited.
4. Enclosed cases use `GCpi = ±0.18`.
5. Partially enclosed cases require an explicit PR #120 `Ri` decision record even when conservative `Ri = 1.0` is selected; equation-reduced adjusted `GCpi` is supported and benchmarked.
6. Every physical field/edge/corner zone piece retains the full external-positive/external-negative × internal-positive/internal-negative raw case matrix.
7. Raw calculated net pressure is retained separately from the governing directional design envelope.
8. The **0.77 kPa minimum in either direction** is applied only to the directional net-design envelopes, never retroactively to `GCp` or `qh(GCp)`.
9. Enclosed field benchmark at `qh = 2.257467958862151 kPa` resolves raw cases `+0.4361292350490715`, `+1.2488177002394458`, `-2.294935139677715`, and `-1.4822466744873406 kPa`; raw governing field envelopes are `+1.2488177002394458` and `-2.294935139677715 kPa`.
10. Partially enclosed equation-Ri benchmark uses `Ri = 0.8535533905932737`, adjusted `GCpi = ±0.4694543648263006`, and preserves the corresponding raw case matrix.
11. A 60 kph low-pressure regression preserves the small raw calculations but returns design envelopes exactly `+0.77 / -0.77 kPa`.
12. Preliminary exact implementation head passed the complete Engineering Checks suite after an unchanged rerun confirmed an unrelated legacy playback DOM-timing flake.
13. Load combinations, code-derived Roof Bay routing, roof-sheet/fastener design, connection capacity and purlin-capacity promotion remain blocked.

Current M3 task after PR #129 merges: **route the verified net design pressures into Roof Bay with explicit case identity and exact force/reaction conservation**.

Dependency order:
1. Preserve zone-piece and toward/away case identity when converting pressure × actual physical zone area into purlin demand.
2. Do not average field/edge/corner pressures into one convenient uniform purlin pressure unless a separately justified equivalent-load representation preserves force and effect.
3. Prove pressure-area force totals equal routed purlin loads within numerical tolerance.
4. Prove Rafter A + Rafter B reaction totals equal the routed code wind demand within numerical tolerance, alongside the existing gravity/self-weight decomposition.
5. Keep the existing manual-uniform Roof Bay pressure mode available and clearly distinct during transition; code-derived mode activates only after this routing gate is verified.
6. Add explicit code wind case/combination identity only through a traceable separate gate; do not silently mix ultimate/service combinations into the pressure coefficient calculation.
7. Close M3 only after an independent end-to-end benchmark confirms site/project inputs → `qh` → `GCp/GCpi` → minimum-governed net zone pressures → purlin loads → rafter reactions.

Permanent M3 rule: procedure applicability, source provenance, physical area, pressure sign/case identity and conservation are all solver state. A verified net-pressure record is not by itself a complete Roof Bay load path. Manual pressure remains available until the code-derived routing chain passes its exit gate.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, and the dedicated M3 engineering records through `M3_ROOF_NET_PRESSURE.md`.