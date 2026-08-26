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

### PR #139 — basis-compatible individual roof-fastener uplift utilization

**MERGED** as `91400114a54cc074d7763c7f5df4eb0f37165245`. Exact documentation-updated head `e819720a3d6699a7714b25390cc37688b191fcc9` passed the complete **46/46 Engineering Checks** suite with no rerun and no branch mutation before merge.

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
10. Toward-surface compression/bearing remains unresolved by #139.
11. Fastener group action, roof-sheet structural capacity, purlin-local capacity, purlin-to-rafter connection capacity and whole-roof PASS remain unimplemented.
12. `roofSystemPass` is forced to `null` even when every currently evaluated individual uplift screw passes.
13. Deterministic validation rejects utilization mutation, upstream layout mismatch, unknown scope evidence, unsupported demand-basis shortcuts and roof-system promotion.

### PR #140 — roof-sheet → purlin support-contact demand routing

**MERGED** as `dfe58947f09fbd214f590b999ac02886419677b6`. Exact documentation-updated head `7fc6d10614e7304dedc0ccdb15ac3318c0f57b82` passed the complete **46/46 Engineering Checks** suite before merge.

Implemented:
1. Versioned `futoltech.roof-sheet-purlin-support-contact-demand-routing/1` record.
2. Resolves verified `toward-surface` roof pressure as a **roof-sheet → purlin support-line resultant**, not axial compression in each roofing screw.
3. For every verified M3 pressure piece, support-line demand is `w = p_design × tributary width` and piece force is `F = w × segment length = p_design × area`.
4. Preserves exact purlin identity/station, tributary-band geometry, spanwise segment, field/edge/corner zone identity, minimum-pressure flag and governing raw pressure case.
5. Reproduces source M3 piece, row, zone and whole-bay area/normal-force totals within engineering tolerance.
6. Keeps the PR #137 toward-surface screw tributary partition only as an independent conservation audit; changing screw stations/count does not redefine inward support-line demand.
7. Blocks promotion of positive-pressure screw cells into screw axial-compression capacity/utilization.
8. Exact local sheet-to-purlin contact footprint stays `UNRESOLVED` because panel profile/support detail governs it.
9. Roof-sheet positive-pressure capacity, local sheet bearing/crushing, purlin local bearing/web crippling, screw bearing/shear, group action, purlin member capacity, purlin-to-rafter capacity and roof-system PASS remain unresolved.

### PR #141 — roof-sheet positive-pressure capacity-evidence acceptance

**MERGED** as `6d84e1be0db8853ae503603b96edfd099171faca`. Exact documentation-updated head `1e4843d061d7e6f1e6f503998e1c4726f2e32703` passed the complete **46/46 Engineering Checks** suite before merge.

Implemented:
1. Versioned `futoltech.roof-sheet-positive-pressure-capacity-evidence/1` acceptance record.
2. Reuses the exact accepted roof-sheet product/profile/BMT/material detail from #138 instead of creating a second product identity.
3. Accepts only source-backed panel capacity evidence for loading that pushes the sheet `toward-support`.
4. Preserves source/document/date, original source load-category label, span type, support spacing, overhang condition, uniform-pressure capacity, capacity type/design basis, deflection limit when supplied and explicitly source-covered limit states.
5. Checks product applicability against exact product ID, profile ID, BMT, Fy and Fu.
6. Missing required product applicability remains `REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY`; explicit mismatch is rejected.
7. `PRODUCT_APPLICABILITY_COMPLETE` does **not** mean project-applicable: actual sheet continuity/end laps/support spacing/span configuration are not inferred from purlin locations.
8. Project panel-span configuration, project span applicability, positive-pressure panel demand/utilization, exact local sheet-to-purlin contact capacity, purlin local bearing/web crippling, screw compression/bearing/shear and roof-system PASS remain `UNRESOLVED`.
9. Nominal, allowable/ASD, LRFD design, manufacturer-rated and ultimate/test-reference bases remain distinct; no factor conversion is inferred.
10. Deterministic validation rejects evidence/detail mutation, unsupported direction/category/span metadata and fake project applicability/utilization/PASS promotion.
11. Synthetic regression capacities are test fixtures only; no manufacturer/project value is imported into production data.

## Active M4 slice — PR #142

**PR #142 — explicit roof-sheet panel span / continuity / end-lap geometry** is the current preliminary-green candidate slice.

Implemented:
1. Versioned `futoltech.roof-sheet-panel-span-continuity/1` acceptance record.
2. Roof-sheet structural spans are explicitly the **upslope distances between successive physical purlin support lines** crossed by one physical sheet piece; the rafter-to-rafter Roof Bay x-span is never substituted for sheet span.
3. Explicit panel runs partition the complete Roof Bay width with no x-direction gaps or overlaps.
4. Each physical sheet piece has explicit eave-to-ridge `y0/y1` limits and derives the exact ordered purlin support sequence, every successive support-span length, exact span count and supported span-type identity.
5. Each piece must cross at least two accepted purlin support lines; pieces outside the Roof Bay slope domain fail visibly.
6. Adjacent physical sheet pieces require a positive geometric end-lap overlap; gaps and zero-overlap butt joints are rejected.
7. Each end lap preserves exact lower/upper piece identities, overlap interval, overlap length, detail source and optional identified purlin support physically inside the overlap.
8. An end lap between separate physical pieces is always a **monolithic-continuity break** in this slice; overlap or screws never create continuous-sheet action by assumption.
9. A lap with no identified purlin support may be recorded only as a visibly unresolved/unrated condition.
10. Eave/ridge edge distances relative to first/last purlin supports are preserved without assigning overhang capacity.
11. Deterministic fingerprints/rebuild validation reject stored span, support, lap, project-basis or implementation-boundary mutation.
12. Project source-row applicability, demand/capacity basis alignment, panel utilization, end-lap capacity, exact local sheet-to-purlin contact capacity, purlin local bearing/web crippling, screw compression/bearing/shear and roof-system PASS remain unresolved.
13. Preliminary exact implementation/test/doc head `d10d3c5ea78fc7de94373b73ade5522596d74c5b` passed the complete **46/46 Engineering Checks** suite on an unchanged rerun after one unrelated legacy C-purlin Polish V3 null-DOM timing flake.

Current merge gate for PR #142:
- Synchronize `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
- Then the **exact documentation-updated head must pass all 46/46 Engineering Checks again**.
- Only that exact green head may merge.

Next M4 dependency after #142 merges:
**compare each physical sheet piece’s exact span type, every actual support spacing and relevant roof-edge/overhang condition against the source applicability retained by #141. Only explicit product + project applicability may proceed toward later demand/capacity basis alignment and utilization.**

Permanent active-M4 boundary:
- M3 pressure/zoning and structural-action demand derivation remain closed/verified upstream work.
- #136 provides physical screw geometry; #137 provides signed individual screw wind demand; #138 provides exact attachment/product identity and uplift evidence eligibility; #139 adds strict basis-compatible individual uplift utilization; #140 routes toward-surface pressure to the physical purlin support line; #141 accepts source-backed positive-pressure panel capacity rows; #142 accepts explicit project panel span/continuity/end-lap geometry without rating it.
- No generic pull-out, pull-over, bearing, group or sheet capacity is inferred from screw count, sheet thickness, geometry or a generic product label.
- Fastener tension/shear, combined interaction, group action, exact local roof-sheet contact capacity, end-lap strength, purlin-local failure and purlin-to-rafter cleat/bolt/weld capacity remain unresolved.
- Purlin member stress/deflection/capacity remains outside these M4 fastener/sheet-support slices.
- Rafter/truss/system interaction remains M6 work.
- Cold-formed effective-width/local/distortional/LTB design remains M7 work.
- `roofSystemPass` remains `null` until the roadmap exit condition is satisfied.
- `authorizedCopyReviewRequired=true` remains permanent where governing code text must be verified against an authorized copy.

Detailed scope and gates live in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`, `STATUS-ROOF-RESILIENCE.md`, `ROOF-RESILIENCE-PHYSICS-MILESTONE-STATUS.md`, `STRUCTURAL_LAB_MASTER_CHECKLIST.md`, `M4_ROOF_SHEET_FASTENER_LAYOUT_FOUNDATION.md`, `M4_ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING.md`, `M4_ROOF_FASTENER_CAPACITY_EVIDENCE_ACCEPTANCE.md`, `M4_ROOF_FASTENER_BASIS_COMPATIBLE_UTILIZATION.md`, `M4_ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING.md`, `M4_ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_ACCEPTANCE.md`, and `M4_ROOF_SHEET_PANEL_SPAN_CONTINUITY_ACCEPTANCE.md`.