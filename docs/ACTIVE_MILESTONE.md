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

### PR #137 — M3 code-pressure → individual roof-fastener demand routing

**MERGED** as `6e5de1e29373c0657f7bb42fe16a415abca0229b` after the exact documentation-updated head passed **46/46 Engineering Checks**.

Implemented:
1. Versioned `futoltech.roof-fastener-code-pressure-demand-routing/1` record.
2. Requires the exact accepted #136 fastener layout and both verified M3 `toward-surface` / `away-from-surface` physical pressure routes.
3. Intersects every accepted fastener tributary rectangle with every active M3 field/edge/corner pressure piece on the same purlin row.
4. Preserves multiple zone contributions when one screw tributary rectangle crosses a pressure-zone boundary; no one-screw/one-zone shortcut.
5. Calculates each signed contribution as `F = p_design × A_overlap`.
6. Preserves zone cell/type, directional pressure, minimum-pressure flag and governing raw pressure-case identity.
7. Per-fastener, per-row, per-zone and whole-bay area/force conservation reproduce the source M3 route.
8. Equal and irregular screw layouts are regression protected.
9. Exact purlin-band mismatch and incomplete toward/away route sets fail visibly.
10. Fastener capacity remains `UNRESOLVED`; utilization remains `null`.

## Active M4 slice — PR #138

**PR #138 — explicit roof-sheet / self-drilling-screw attachment-detail and capacity-evidence acceptance** is the current completed candidate slice.

Implemented:
1. Versioned `futoltech.roof-fastener-capacity-evidence/1` acceptance record.
2. Exact roof-sheet product/profile, base-metal thickness, material Fy/Fu and source references.
3. Exact purlin substrate section, base-metal thickness, material Fy/Fu and source references.
4. Exact self-drilling-screw identity, diameter, thread description, head/bearing component, bearing diameter, drill point, material description and attachment position.
5. Installed thread penetration must meet an explicitly sourced minimum installation penetration.
6. Pull-out and pull-over evidence retain source type, source/document/date, capacity value, capacity type and design basis.
7. Nominal, ASD allowable, LRFD design, manufacturer-rated and ultimate-test references remain distinct; this slice performs no factor conversion.
8. Mechanism-specific applicability is checked against the accepted physical attachment detail.
9. Missing required applicability remains `REFERENCE_ONLY_INCOMPLETE_APPLICABILITY`; it is never silently treated as a match.
10. Explicit source applicability that excludes the accepted detail is rejected.
11. Accepted detail/evidence mutation is protected by deterministic record-integrity fingerprints plus deterministic rebuild validation.
12. Regression values are clearly synthetic test fixtures only and are not product/project capacity data.
13. Demand/capacity basis alignment, pull-out utilization, pull-over utilization and all governing PASS states remain deliberately unimplemented.
14. Preliminary exact implementation head `8d71800b3d8e369b8aa721a89b3fa7b424557b87` passed the complete **46/46 Engineering Checks** suite.

Current merge gate for PR #138:
- Synchronize `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
- Then the **exact documentation-updated head must pass all 46/46 Engineering Checks again**.
- Only that exact head may merge.

Next M4 dependency after #138 merges:
**align individual #137 screw demand with #138 capacity evidence only when source applicability is complete and demand/capacity design bases are demonstrably compatible. If strength/LRFD versus ASD/manufacturer/test-reference basis compatibility is unresolved, utilization must remain `UNRESOLVED` rather than forcing a ratio.**

Permanent active-M4 boundary:
- M3 pressure/zoning and structural-action demand derivation remain closed/verified upstream work.
- M4 owns roof-sheet/fastener/purlin-to-rafter connection demand and eventual verified capacity work.
- #136 provides physical screw geometry; #137 provides signed individual screw wind demand; #138 provides attachment-detail/evidence eligibility only.
- No generic pull-out, pull-over, bearing, group or sheet capacity is inferred from screw count, geometry or a generic “Tek screw” label.
- Fastener tension/shear, combined interaction, group action, roof-sheet structural capacity, purlin-local failure and purlin-to-rafter cleat/bolt/weld capacity remain unresolved.
- Purlin member stress/deflection/capacity remains outside these M4 fastener slices.
- Rafter/truss/system interaction remains M6 work.
- Cold-formed effective-width/local/distortional/LTB design remains M7 work.
- `authorizedCopyReviewRequired=true` remains permanent where governing code text must be verified against an authorized copy.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M4_ROOF_SHEET_FASTENER_LAYOUT_FOUNDATION.md`, `M4_ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING.md`, and `M4_ROOF_FASTENER_CAPACITY_EVIDENCE_ACCEPTANCE.md`.
