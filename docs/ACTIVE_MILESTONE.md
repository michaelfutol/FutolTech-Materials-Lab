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

### PR #138 — explicit attachment-detail and capacity-evidence acceptance

**MERGED** as `471a62cbe305e385a9542f9f3324e251c06a7981`. The exact documentation-updated head `5aabbb5f9bc2f795a73cffde13917a41484ee25a` passed **46/46 Engineering Checks** on an unchanged rerun after one unrelated legacy C-purlin V3 transient DOM-timing flake.

Implemented:
1. Versioned `futoltech.roof-fastener-capacity-evidence/1` acceptance record.
2. Exact roof-sheet product/profile, BMT, material Fy/Fu and source references.
3. Exact purlin substrate section, BMT, material Fy/Fu and source references.
4. Exact self-drilling-screw identity, geometry, bearing component, attachment position and installation penetration evidence.
5. Installed thread penetration must meet an explicitly sourced minimum.
6. Pull-out and pull-over evidence retain source/document/date, capacity value, capacity type and design basis.
7. Nominal, ASD allowable, LRFD design, manufacturer-rated and ultimate/test references remain distinct; no factor conversion is inferred.
8. Mechanism-specific applicability is checked against the accepted physical attachment detail.
9. Missing required applicability remains reference-only; explicit mismatch is rejected.
10. Deterministic fingerprints/rebuild validation reject accepted-detail or evidence mutation.
11. Regression values are synthetic test fixtures only, not product/project capacity data.
12. Capacity scope such as single-fastener versus assembly/group is not inferred by #138.

## Active M4 slice — PR #139

**PR #139 — basis-compatible individual roof-fastener uplift utilization** is the current preliminary-green candidate slice.

Implemented:
1. Versioned `futoltech.roof-fastener-capacity-utilization/1` record.
2. Consumes the exact accepted #137 individual screw demand route and #138 attachment/capacity-evidence record; it does not recompute pressure or capacity evidence.
3. Current evaluated direction is `away-from-surface` individual-screw uplift only.
4. A mechanism becomes eligible only when #138 applicability is complete, the source explicitly establishes `single-fastener` capacity scope, and demand/capacity basis compatibility is explicitly accepted.
5. Current compatible numerical path is explicitly source-backed LRFD demand versus LRFD `design` capacity.
6. ASD allowable, nominal, manufacturer-rated, ultimate/test-reference and unresolved-basis evidence remain blocked from numerical utilization; no convenience conversion is invented.
7. Pull-out and pull-over remain separate mechanism checks with their own evidence identity and utilization.
8. Both mechanisms must be eligible before an individual screw receives a local uplift PASS/FAIL state.
9. A deliberately low eligible synthetic pull-over design capacity regression produces a genuine local FAIL; ordinary synthetic passing capacities are test fixtures only.
10. Toward-surface compression/bearing remains `UNRESOLVED_COMPRESSION_BEARING_PATH` with `utilization=null`.
11. Fastener group action, roof-sheet structural capacity, purlin-local capacity, purlin-to-rafter connection capacity and whole-roof PASS remain unimplemented.
12. `roofSystemPass` is forced to `null` even when every currently evaluated individual uplift screw passes.
13. Deterministic validation rejects utilization mutation, upstream layout mismatch, unknown scope evidence, unsupported demand-basis shortcuts and roof-system promotion.
14. Preliminary exact implementation head `fd64ace9c0750bc63d451cb4429b7b20e1caf690` passed the complete **46/46 Engineering Checks** suite.

Current merge gate for PR #139:
- Synchronize `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
- Then the **exact documentation-updated head must pass all 46/46 Engineering Checks again**.
- Only that exact head may merge.

Next M4 dependency after #139 merges:
**continue the physical connection load path without promoting a roof-system PASS: resolve the toward-surface bearing/compression path and then source-backed group/sheet/local/purlin-to-rafter connection checks in dependency order.**

Permanent active-M4 boundary:
- M3 pressure/zoning and structural-action demand derivation remain closed/verified upstream work.
- #136 provides physical screw geometry; #137 provides signed individual screw wind demand; #138 provides attachment/evidence eligibility; #139 adds only strict basis-compatible individual uplift utilization.
- No generic pull-out, pull-over, bearing, group or sheet capacity is inferred from screw count, geometry or a generic “Tek screw” label.
- Fastener tension/shear, combined interaction, group action, roof-sheet structural capacity, purlin-local failure and purlin-to-rafter cleat/bolt/weld capacity remain unresolved.
- Toward-surface bearing/compression is not covered by #139.
- Purlin member stress/deflection/capacity remains outside these M4 fastener slices.
- Rafter/truss/system interaction remains M6 work.
- Cold-formed effective-width/local/distortional/LTB design remains M7 work.
- `authorizedCopyReviewRequired=true` remains permanent where governing code text must be verified against an authorized copy.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M4_ROOF_SHEET_FASTENER_LAYOUT_FOUNDATION.md`, `M4_ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING.md`, `M4_ROOF_FASTENER_CAPACITY_EVIDENCE_ACCEPTANCE.md`, and `M4_ROOF_FASTENER_BASIS_COMPATIBLE_UTILIZATION.md`.
