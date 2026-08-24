# FutolTech Roof Resilience Physics — Implementation Status

Status date: 2026-08-24

This file records implementation status only. The governing roadmap and milestone exit gates remain in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`.

## M0 — Product cleanup and navigation architecture
**Status: ACTIVE / foundation implemented.**

Implemented:
- Persistent primary workflow navigation: Home → Materials Comparison → C-Purlin Test → Roof Load Cases → Roof Bay → Advanced / R&D.
- Dedicated Advanced / R&D hub so specialist utilities can be grouped without becoming the main workflow.
- Generic Material Comparison and specialist C-purlin experience remain separated.
- Generic synchronized playback has a full-width row and 8/16/24-second recording, with 16 seconds as the default slow recording contract.
- Test Data Validation / Calibration remains an Advanced/R&D capability with a soft access gate on public GitHub Pages.
- FutolTech Engineering Mode v1 is the shared static engineering UI identity; time-of-day ambience/living-object overlays are explicitly excluded from engineering apps.

Still required before M0 exit:
- Audit/simplify legacy page-level status-pill clusters so they show state rather than becoming a second navigation system.
- Standardize HOME behavior/labels on remaining older pages.
- First-time-user navigation QA across desktop/mobile widths.

## M1 — C-Purlin Gravity + Wind Physics Bench
**Status: CORE IMPLEMENTED / continuing validation and polish.**

Implemented:
- Gravity, wind and combined load modes plus governing pressure workflows.
- Roof-slope decomposition and C-section orientation mapping.
- Gross-section UDL moment, deflection and biaxial stress screening.
- Yield sequencing, synchronized visualization and WebM recording.
- PaperMatte / Lab Dark visualization and real-browser regression gates.

Permanent current boundary:
- Gross-section screening only; no effective-width, local/distortional/LTB or connection-capacity claim.

## M2 — Roof Bay Physics (2D / 2.5D)
**Status: CLOSED — current M2 scope passed its exit gate and merged through PR #112.**

Completed chain:
- PR #108 — two adjacent rafter lines, multiple purlins, exact tributary routing, manual gravity/wind area pressure, purlin reactions and vector conservation.
- PR #109 — selectable purlin/tributary/reaction/formula trace, exploded load path and stable `futoltech.roof-bay-project/1` project JSON.
- PR #110 — custom/nonuniform purlin stations with exact physical tributary boundaries and project round-trip.
- PR #111 — separate Rafter A/B reaction diagrams plus roof-normal/down-slope conservation decomposition.
- PR #112 — stable `futoltech.roof-pressure-zones/1` placeholder and roof-local coordinate frame with zero invented M3 code zones.

Permanent M2 boundaries:
- Roof sheet, fasteners, purlin-to-rafter connection and rafter/truss capacity remain unresolved until their later verified layers.
- Manual-uniform pressure remains a valid distinct mode during M3 transition.
- M2 exit: applied roof load and reaction totals conserve within numerical tolerance; solver/visual paths use the same geometry.

## M3 — Code Wind / Roof Zoning Engine
**Status: ACTIVE — pressure derivation, physical Roof Bay routing, W identity and source-backed companion-action acceptance are implemented through the PR #132 completion candidate.**

### Completed M3 foundation

**PR #113 — code/version + provenance**
- Source-backed NSCP 2015 Volume 1, 7th Edition, 2nd Printing profile.
- Versioned `futoltech.wind-design-basis/1` with explicit required input families/blockers.

**PR #114 — velocity-pressure chain**
- Deterministic `qz = 0.613 Kz Kzt Kd V²`.
- `Kd=0.85`; Exposure B/C/D evaluation and 4.57 m minimum evaluation-height rule.
- Benchmark Exposure C / `h=8.82 m` / `V=240 kph` / `Kzt=1.0`: `Kz=0.974820633`, `q≈2.257468 kPa`.

**PR #115 — project wind-input acceptance**
- Versioned site/occupancy/wind-speed/exposure/Kzt/height acceptance with provenance.
- Occupancy-to-map figure gate explicit; no guessed wind-map contour table stored.

**PR #116 — Roof Bay project-input integration**
- Accepted wind input chain exposed in Roof Bay/project JSON while manual pressure remains active.

**PRs #117–#118 — pressure context**
- Engineer-declared enclosure plus source-backed roof/building geometry acceptance.
- Exact pressure context carried into Roof Bay/project JSON; automatic enclosure classification remains unimplemented.

**PR #119 — base `GCpi`**
- Open `0.00`, enclosed `±0.18`, partially enclosed `±0.55` foundation with explicit positive/negative cases.

**PR #120 — large-volume `Ri`**
- Engineer-gated applicability and equation path.
- Benchmark `Vi=6950 m³`, `Aog=1.00 m²`: `Ri=0.8535533905932737`, adjusted `GCpi=±0.4694543648263006`.

**PR #121 — reusable internal-pressure term**
- Separate auditable internal-pressure term foundation.
- Procedure boundary remains explicit: Part 3 opening-height `qi=qz` cannot be reused in the current `h<=18 m` Part 1 C&C route.
- Exact final head passed the complete Engineering Checks suite and merged as `5acab72d3848ee1b3e55191560577dc965b15d08`.

**PR #123 — purlin C&C effective wind area**
- Schema `futoltech.wind-roof-purlin-effective-area/1`.
- Physical load area and coefficient-selection effective area remain separate.
- Roof-sheet/fastener effective areas remain independently unresolved.

**PR #124 — symmetric-gable C&C zone geometry**
- Schema `futoltech.wind-roof-zone-geometry/1`.
- Whole-roof registration + exact field/edge/corner purlin-band intersections.
- Figure split: `207E.4-2B` for `7°<θ<=27°`; `207E.4-2C` for `27°<θ<=45°`.
- Exact final-head Engineering Checks passed; merged as `a0abdff0275ed6df35cf94317d4912c9be8e2f2b`.

### Completed M3 pressure chain

**PR #127 — external roof `GCp` selection**
- Schema `futoltech.wind-roof-external-gcp/1`.
- Uses exact PR #123 effective area + PR #124 physical zone pieces.
- 25° / 4.0 m² benchmark: positive `+0.3731939868`; negative Z1 `-0.8365969934`, Z2 `-1.3829849670`, Z3 `-2.2195819604`.
- Current Part 1 scope: enclosed/partially-enclosed symmetric gable, `h<=18 m`; open buildings rejected to their separate procedure.
- Merged as `fce0c1e12535a9dca0d0eca44128204f9c913643`.

**PR #128 — external `qh × GCp`**
- Schema `futoltech.wind-roof-external-pressure-term/1`.
- Reuses exact accepted `qh`; stores signed toward/away external terms per physical zone piece.
- ±0.77 kPa minimum explicitly not applied at this external-only stage.
- Merged as `3588219906b1171a348b5d4bf135e9476e1138db`.

**PR #129 — low-rise Part 1 net roof pressure**
- Schema `futoltech.wind-roof-net-pressure/1`.
- Equation `p = qh[(GCp)-(GCpi)]`; current internal velocity basis fixed at `qh`.
- Complete external-sign × internal-sign raw case matrix retained per physical zone piece.
- ±0.77 kPa C&C minimum applied only to directional design envelopes; raw pressures remain separately traceable.
- 60 kph regression yields exact `+0.77/-0.77 kPa` design envelopes while retaining lower raw values.
- Exact final-head Engineering Checks passed; merged as `51fbc2bdd6487b06b3255c98672f8c1c21853b5a`.

### Completed M3 physical routing and action identity

**PR #130 — code-derived Roof Bay pressure routing + conservation**
- Schema `futoltech.wind-roof-bay-code-pressure-routing/1`.
- Requires exactly one verified net-pressure record per physical purlin tributary band and the exact same zone geometry.
- Reconstructs every physical field/edge/corner rectangle; no convenient whole-purlin pressure substitution.
- `F=pA`; piecewise line load uses actual tributary width; Rafter A/B reactions come from true spanwise resultant location.
- Area, signed force and moment conservation checked per piece, per purlin and whole Roof Bay.
- 25° away benchmark: total `-46.769510965040396 kN`, A `-24.4711529728144 kN`, B `-22.298357992225995 kN`, moment about A `-89.19343196890398 kN·m`.
- Strengthened per-piece regression protects `|RB·L-F·x̄|<1e-12`.
- Exact final 45/45 Engineering Checks passed; merged as `f2bf5a83711d88736b2ffaa2e2a4d6001cc0e7cb`.

**PR #131 — explicit W action + strength-template W contributions**
- Schema `futoltech.wind-roof-load-case-combination/1`.
- Separate `W-TOWARD` and `W-AWAY` actions retain full purlin/zone-piece/governing raw-case trace.
- Source-backed NSCP 2015 Section 203.3.1 wind-bearing strength templates: 203-3 wind branch `0.5W`, 203-4 `1.0W`, 203-6 `1.0W`.
- Only W contribution is evaluated; combination factors never rewrite upstream pressure/routing physics.
- Full combination stays `null` while companion actions are unresolved.
- Exact documentation-updated final head passed 45/45 Engineering Checks; merged as `7727f5e009ceb67e7beb5db9be1dadc6a5ffa40a`.

### Current completion candidate — PR #132 companion structural actions

- Adds `futoltech.wind-roof-companion-actions/1` downstream of the exact PR #131 record.
- `D` and `Lr` are distinct source-referenced vertical gravity actions; `roofLiveLoad` is never relabeled as ordinary `L`.
- Uniform roof-area `D` and `Lr` are partitioned over the same exact PR #130 physical rectangles used by W.
- Vertical gravity resolves into roof-normal/down-slope components using the accepted roof slope and actual spanwise piece locations.
- Purlin self-weight is a separate line action inside `D`, one sourced entry per purlin; it is not hidden in or double-counted with roof-area pressure.
- `L` and `H` are only explicit target-specific zero/not-applicable decisions with source/engineering basis for the current roof-purlin target.
- `R` remains `UNRESOLVED`; missing rain data is never treated as zero.
- `f1×L` is zero because accepted `L=0`; `f1` itself remains uninferred.
- Benchmark geometry: 25°, 4.0 m bay, area `17.654046703399867 m²`.
- Benchmark `D`: `0.20 kPa` area load + two `0.05 kN/m` purlin self-weights → `3.9308093406799736 kN` vertical / `3.5625231148146597 kN` normal / `1.6612318107922752 kN` downslope.
- Benchmark `Lr=0.75 kPa`: `13.2405350275499 kN` vertical / `12.0 kN` normal / `5.595691897859982 kN` downslope.
- Deterministic tests protect D/Lr identity, physical piece preservation, gravity decomposition, self-weight anti-double-counting, L/H zero decisions, unresolved R, public-state round-trip and anti-promotion boundaries.
- Preliminary exact implementation head passed the complete 45/45 Engineering Checks suite.
- Complete strength-combination assembly, rain/action-alternative selection, live code-derived Roof Bay activation and member/capacity promotion remain blocked.
- Public boundary/QA record: `docs/M3_ROOF_COMPANION_ACTIONS.md`.

## Current M3 dependency — rain/action-alternative resolution + complete combination assembly

- Resolve `R` through an explicit project rain action or explicit source/engineering-backed applicability decision; unresolved R cannot silently become zero.
- Preserve `D`, `L`, `Lr`, `R`, `H`, W direction and exact physical load-path identity through combination assembly.
- Assemble 203-6 only when D/W/H are explicit. Assemble 203-3/203-4 only after the `(Lr or R)` alternative is explicitly selected/resolved.
- Keep all combination factors downstream of immutable pressure/action records.
- Only a fully resolved source-backed combination may produce a non-null complete result.

## Remaining M3 work after complete combination assembly

- Controlled code-derived Roof Bay project/UI activation while retaining a clearly distinct manual-uniform option during transition.
- Piecewise purlin member response/capacity under code-derived/combined loading through a separate gate.
- Independent end-to-end benchmark: project/site inputs → `qh` → `GCp/GCpi` → minimum-governed net zone pressures → physical purlin piece loads → Rafter A/B reactions → W identity → companion actions → complete source-backed combination result.
- Close M3 only after all conservation checks and complete exact-final-head Engineering Checks are green.

Permanent M3 boundary: verified pressure derivation, physical routing, wind-action identity, companion-action acceptance, complete combination assembly and member/capacity response are separate responsibilities. Procedure applicability, source provenance, physical area, pressure sign/case identity, structural action identity and conservation remain explicit solver state.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2/M3 project-data and load-path work is structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.