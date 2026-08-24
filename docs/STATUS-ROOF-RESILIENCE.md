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
- Manual-uniform pressure remains a valid distinct mode after M3; it is never silently replaced.
- M2 exit: applied roof load and reaction totals conserve within numerical tolerance; solver/visual paths use the same geometry.

## M3 — Code Wind / Roof Zoning Engine
**Status: CLOSED CANDIDATE — written M3 scope and exit benchmark are satisfied through PR #135. Preliminary exact #135 implementation head passed 46/46 Engineering Checks; the documentation-updated exact head must pass 46/46 again before merge makes closure final on `main`.**

### Completed M3 foundation

- **PR #113 — code/version + provenance:** source-backed NSCP 2015 Volume 1, 7th Edition, 2nd Printing profile and versioned wind-design basis.
- **PR #114 — velocity-pressure chain:** deterministic `qz = 0.613 Kz Kzt Kd V²`; benchmark Exposure C / `h=8.82 m` / `V=240 kph` / `Kzt=1.0` gives `qh = 2.257467958862151 kPa`.
- **PR #115 — project wind-input acceptance:** site/occupancy/wind-speed/exposure/Kzt/height acceptance with explicit provenance and no guessed embedded wind map.
- **PR #116 — project integration:** accepted wind inputs exposed in Roof Bay/project JSON while manual pressure remains a separate path.
- **PRs #117–#118 — pressure context:** engineer-declared enclosure plus source-backed roof/building geometry acceptance and Roof Bay/project JSON linkage.
- **PR #119 — base `GCpi`:** open `0.00`, enclosed `±0.18`, partially enclosed `±0.55` foundation.
- **PR #120 — large-volume `Ri`:** explicit engineer-gated partially enclosed reduction path; benchmark `Ri=0.8535533905932737` for `Vi=6950 m³`, `Aog=1.00 m²`.
- **PR #121 — internal-pressure term:** reusable velocity-selection/signed internal-pressure foundation; Part 3 opening-height `qi=qz` remains prohibited from the current low-rise Part 1 path. Merged as `5acab72d3848ee1b3e55191560577dc965b15d08`.
- **PR #123 — purlin C&C effective wind area:** physical load area and coefficient-selection effective wind area remain separate.
- **PR #124 — symmetric-gable zone geometry:** whole-roof registration, exact field/edge/corner purlin-band intersections, 2B/2C slope-family split and area conservation. Merged as `a0abdff0275ed6df35cf94317d4912c9be8e2f2b`.

### Completed M3 pressure chain

- **PR #127 — external roof `GCp`:** exact zone/effective-area coefficient selection; merged as `fce0c1e12535a9dca0d0eca44128204f9c913643`.
- **PR #128 — external `qh × GCp`:** exact accepted mean-roof-height `qh` times external coefficient; ±0.77 kPa floor deliberately not applied at this external-only stage. Merged as `3588219906b1171a348b5d4bf135e9476e1138db`.
- **PR #129 — low-rise Part 1 net roof pressure:** `p = qh[(GCp)-(GCpi)]`, complete raw external/internal sign matrix, and ±0.77 kPa minimum applied only to governing directional design envelopes. Merged as `51fbc2bdd6487b06b3255c98672f8c1c21853b5a`.

### Completed physical routing and structural-action chain

- **PR #130 — exact Roof Bay pressure routing:** one verified net-pressure record per physical purlin band; each field/edge/corner intersection remains an exact rectangle; `F=pA`; Rafter A/B from actual spanwise resultant; area/force/moment conservation at piece, purlin and bay levels. Merged as `f2bf5a83711d88736b2ffaa2e2a4d6001cc0e7cb`.
- **PR #131 — signed W identity:** separate `W-TOWARD` / `W-AWAY` actions plus source-backed W factors for supported strength templates; merged as `7727f5e009ceb67e7beb5db9be1dadc6a5ffa40a`.
- **PR #132 — companion actions:** D and Lr routed through the same physical geometry; purlin self-weight kept separately sourced inside D; L/H only as explicit target-specific zero/not-applicable decisions; R remains `UNRESOLVED`. Merged as `b656312b4c089717e2b0cdac44dee4d7570b5114`.
- **PR #133 — source-backed complete strength action results:** preserves six template × signed-W identities; unresolved R blocks 203-3/203-4; explicit engineer-sourced R-not-applicable decision releases the accepted Lr path; exact force/moment/purlin conservation remains protected. Merged as `d38fea07ee49438edd0481a48fa89730e4cc5488`.
- **PR #134 — controlled code-derived Roof Bay activation:** selects only a complete equilibrium-verified #133 result; exact accepted project/context compatibility; explicit self-weight/section evidence; no duplicate pressure/combination model; project JSON attachment; stale-input invalidation; manual-uniform M2 fallback preserved. Exact documentation-updated head passed 46/46 Engineering Checks and merged as `2f03ea6986c32cfcfff8f7656651a03d5845c440`.

### M3 exit audit — PR #135

Implemented and preliminary QA complete:
- Hardened `futoltech.roof-bay-code-derived-activation/1` so physical compatibility requires not only purlin station identity but exact derived tributary-band `stationM/startM/endM/widthM` identity.
- Added an adversarial fully valid upstream M3 chain with unchanged purlin stations but deliberately shifted tributary boundaries; activation rejects it as a different physical load-area geometry.
- Added an independent deterministic exit audit which manually re-evaluates:
  - Exposure-C Kz and `qh = 0.613 Kz Kzt Kd V²`;
  - Figure 207E.4-2B `GCp` log-area curves/plateaus;
  - every `qh[(GCp)-(GCpi)]` raw pressure;
  - ±0.77 kPa governing directional envelopes;
  - every physical `F=pA` piece, Rafter A/B reaction and applied moment;
  - D and Lr vertical totals plus 25° roof-normal/down-slope resolution;
  - selected `NSCP-203-4` away action result as `1.2D + 1.0W + 0.5Lr`; and
  - final controlled Roof Bay activation of the exact audited complete result.
- Preliminary exact implementation head `1a8a1d4edeec93179801762f86207f43a13a6a05` passed the complete **46/46 Engineering Checks** suite: syntax, V10 activation, deterministic engineering/audit tests, all protected labs/print paths and all NF-001 states.
- Public audit/boundary record: `docs/M3_END_TO_END_EXIT_AUDIT.md`.

### M3 closure interpretation

The written roadmap defines M3 as the code-wind/zoning engine with reproducible wind pressure, roof zones, signed pressure cases, traceable load combinations and an independent benchmark. The #135 audit satisfies that definition. Therefore piecewise purlin member response/capacity is **not** a hidden M3 exit requirement and must not hold M3 open.

Permanent post-M3 boundaries:
- Code-derived piecewise purlin stress/deflection and member capacity remain unresolved.
- Roof-sheet, fastener, cleat/weld and purlin-to-rafter connection capacity remain unresolved and belong to M4/later verified layers.
- Rafter/truss/system interaction belongs to M6.
- Cold-formed effective-width/local/distortional/LTB design belongs to M7.
- Rain load `R` remains unimplemented; absence is never interpreted as zero. Lr alternatives require the explicit engineer-sourced R-not-applicable decision contract.
- Public project calculations remain cross-checks only; `authorizedCopyReviewRequired=true` remains permanent for project use.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NEXT / NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. The next Roof Resilience milestone must stop treating roof-sheet-to-purlin and purlin-to-rafter transfer as automatic. Verified sheet/fastener/cleat/weld demand/capacity logic and an honest unresolved state are required before any roof-system PASS claim.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The M2/M3 project-data and load-path chain now provides a reproducible code-derived demand foundation for the later transparent Three.js roof viewer, system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.