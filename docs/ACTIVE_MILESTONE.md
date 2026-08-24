# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics M4 — Roof Sheet + Fastener / Connection Layer ACTIVE.**

M2 Roof Bay is closed through PR #112.

M3 Code Wind / Roof Zoning Engine is **CLOSED** through PR #135, merged on `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc` after the documentation-updated exact head passed the full 46/46 Engineering Checks suite.

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
- **PR #128** — external-only `qh × GCp`.
- **PR #129** — low-rise Part 1 net roof pressure + minimum directional design envelopes.
- **PR #130** — exact physical Roof Bay code-pressure routing/conservation.
- **PR #131** — signed `W-TOWARD` / `W-AWAY` identity + source-backed strength-template W contributions.
- **PR #132** — companion structural action acceptance/routing.
- **PR #133** — source-backed strength-combination action-result assembly.
- **PR #134** — controlled code-derived Roof Bay demand activation with manual-uniform fallback retained.
- **PR #135** — independent end-to-end M3 exit audit + exact tributary-band compatibility hardening; merged as `c81032f977d35025474b495c6bf82cbc88bf1bdc` after exact-final-head 46/46 Engineering Checks.

## Active M4 slice — PR #136

**PR #136 — explicit roof-sheet fastener layout geometry foundation** is the current completed candidate slice.

Implemented:
1. Versioned `futoltech.roof-sheet-fastener-layout/1` acceptance record.
2. Exactly one explicit fastener row for every physical purlin.
3. Explicit screw stations along the rafter-to-rafter Roof Bay span.
4. Midpoint tributary strips crossed with the exact physical purlin tributary bands.
5. Equal, irregular and custom/nonuniform purlin/fastener layouts preserved without silent regularization.
6. Row-level and whole-Roof-Bay area conservation.
7. Deterministic serialization, post-creation geometry mutation rejection and stale-project invalidation.
8. Fastener capacity remains forced to `UNRESOLVED`.
9. Existing timber nail/bolt Connection Lab equations are explicitly not reused as roofing self-drilling-screw capacity.
10. Preliminary exact implementation head `d60aa4e78e4d7aaebcd8cba82be0034d672b5f96` passed the complete **46/46 Engineering Checks** suite after the custom-layout floating-point assertion was corrected to engineering-tolerance comparison.

Current merge gate for PR #136:
- Synchronize `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
- Then the **exact documentation-updated head must pass all 46/46 Engineering Checks again**.
- Only that exact head may merge.

Next M4 dependency after #136 merges:
**intersect the verified M3 field/edge/corner pressure pieces with each accepted fastener tributary rectangle to derive individual signed screw demand, while preserving exact area/force conservation and still making no pull-out, pull-over, roof-sheet or connection-capacity claim.**

Permanent post-M3 / active-M4 boundary:
- M3 closure means code wind/zoning/load-combination demand derivation and controlled activation are complete for the implemented scope.
- M4 now owns roof-sheet/fastener/purlin-to-rafter connection demand and eventual verified capacity work.
- Purlin member stress/deflection/capacity remains outside M4 fastener geometry work and still awaits its appropriate later design layer.
- Rafter/truss/system interaction remains M6 work.
- Cold-formed effective-width/local/distortional/LTB design remains M7 work.
- `authorizedCopyReviewRequired=true` remains permanent for project use where governing NSCP text must be verified against an authorized copy.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M3_END_TO_END_EXIT_AUDIT.md`, and `M4_ROOF_SHEET_FASTENER_LAYOUT_FOUNDATION.md`.
