# Active Structural Lab Milestone

Current milestone: **Roof Resilience Physics M4 — Roof Sheet + Fastener / Connection Layer ACTIVE.**

M2 Roof Bay is closed through PR #112.

M3 Code Wind / Roof Zoning Engine is **CLOSED** through PR #135, merged on `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc` after the documentation-updated exact head passed the full 46/46 Engineering Checks suite.

## M4 completed foundation

### PR #136 — explicit roof-sheet fastener layout geometry

**MERGED** as `ec5e7c99994a4c5d52bdf2ad90a1790b13a8e181` after the exact documentation-updated head passed **46/46 Engineering Checks**.

Implemented:
1. Versioned `futoltech.roof-sheet-fastener-layout/1` acceptance record.
2. Exactly one explicit fastener row for every physical purlin.
3. Explicit screw stations along the rafter-to-rafter Roof Bay span.
4. Midpoint tributary strips crossed with exact physical purlin tributary bands.
5. Equal, irregular and custom/nonuniform layouts preserved without silent regularization.
6. Row-level and whole-Roof-Bay area conservation.
7. Deterministic mutation rejection and stale-project invalidation.
8. Fastener capacity forced to `UNRESOLVED`.
9. Timber nail/bolt Connection Lab equations are not reused as roofing self-drilling-screw capacity.

## Active M4 slice — PR #137

**PR #137 — M3 code-pressure → individual roof-fastener demand routing** is the current completed candidate slice.

Implemented:
1. Versioned `futoltech.roof-fastener-code-pressure-demand-routing/1` record.
2. Requires the exact accepted #136 fastener layout and both verified M3 `toward-surface` / `away-from-surface` physical pressure routes.
3. Intersects every accepted fastener tributary rectangle with every active M3 field/edge/corner pressure piece on the same purlin row.
4. Preserves multiple zone contributions when one screw tributary rectangle crosses a pressure-zone boundary; no one-screw/one-zone shortcut.
5. Calculates each signed contribution as `F = p_design × A_overlap`.
6. Preserves zone cell/type, directional pressure, minimum-pressure flag and governing raw pressure-case identity.
7. Per-fastener, per-row, per-zone and whole-bay area/force conservation must reproduce the source M3 route.
8. Equal and irregular screw layouts are regression protected.
9. Exact purlin-band mismatch and incomplete toward/away route sets fail visibly.
10. Fastener capacity remains `UNRESOLVED`; utilization remains `null`.
11. Named syntax coverage now explicitly includes both M4 fastener-layout and fastener-demand modules.
12. Preliminary exact implementation head `16e320317c10c1cbf5b64ace9d5cc3a677930bf5` passed the complete **46/46 Engineering Checks** suite.

Current merge gate for PR #137:
- Synchronize `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
- Then the **exact documentation-updated head must pass all 46/46 Engineering Checks again**.
- Only that exact head may merge.

Next M4 dependency after #137 merges:
**establish source-backed roof-sheet/self-drilling-screw capacity evidence contracts and the first demand-vs-capacity checks without inventing generic pull-out, pull-over, bearing, group or sheet capacities. Product/detail applicability, substrate, screw geometry and evidence provenance must be explicit before any utilization or PASS/FAIL is allowed.**

Permanent active-M4 boundary:
- M3 pressure/zoning and structural-action demand derivation remain closed/verified upstream work.
- M4 owns roof-sheet/fastener/purlin-to-rafter connection demand and eventual verified capacity work.
- PR #137 is demand routing only; it is not a capacity or connection PASS layer.
- Purlin member stress/deflection/capacity remains outside this M4 fastener-demand slice.
- Rafter/truss/system interaction remains M6 work.
- Cold-formed effective-width/local/distortional/LTB design remains M7 work.
- `authorizedCopyReviewRequired=true` remains permanent where governing code text must be verified against an authorized copy.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M4_ROOF_SHEET_FASTENER_LAYOUT_FOUNDATION.md`, and `M4_ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING.md`.
