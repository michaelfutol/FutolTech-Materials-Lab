# FutolTech Roof Resilience Physics — Implementation Status

Status date: 2026-08-22

This file records implementation status only. The governing roadmap and milestone exit gates remain in `ROADMAP-ROOF-RESILIENCE-PHYSICS.md`.

## M0 — Product cleanup and navigation architecture
**Status: ACTIVE / foundation implemented.**

Implemented:
- Persistent primary workflow navigation: Home → Materials Comparison → C-Purlin Test → Roof Load Cases → Roof Bay → Advanced / R&D.
- Dedicated Advanced / R&D hub so specialist utilities can be grouped without becoming the main workflow.
- Generic Material Comparison and specialist C-purlin experience remain separated.
- Generic synchronized playback has been moved to a full-width row and 8/16/24-second recording is available, with 16 seconds as the default slow recording contract.
- Test Data Validation / Calibration is retained as an Advanced/R&D capability with a soft access gate on public GitHub Pages.

Still required before M0 exit:
- Audit and simplify legacy page-level status-pill clusters so they show page state rather than acting as a second crowded navigation system.
- Standardize HOME behavior and labels on remaining older pages.
- First-time-user navigation QA across desktop/mobile widths.

## M1 — C-Purlin Gravity + Wind Physics Bench
**Status: CORE IMPLEMENTED / continuing validation and polish.**

Implemented:
- Gravity, wind and combined load modes plus governing pressure workflows.
- Roof slope decomposition and C-section orientation mapping.
- Gross-section UDL moment, deflection and biaxial stress screening.
- Yield sequencing, synchronized visualization and WebM recording.
- PaperMatte / Lab Dark visualization and real-browser regression gates.

Permanent current boundary:
- Gross-section screening only; no effective-width, local/distortional/LTB or connection-capacity claim.

## M2 — Roof Bay Physics (2D / 2.5D)
**Status: ACTIVE / one checklist slice remains before current M2 exit.**

Foundation implemented in PR #108:
- Two adjacent rafter lines.
- Multiple purlin rows and equalized maximum-spacing layout.
- Explicit edge/interior tributary widths with full-roof coverage.
- Manual gravity/wind pressure routing from roof sheet area to each purlin.
- Existing gross-elastic C-purlin solver reused per tributary row.
- Simply-supported purlin reactions routed as discrete point loads into both rafter lines.
- Vector load-conservation check for applied roof pressure plus modeled purlin self-weight.
- Transparent 2D/2.5D roof-sheet context, fastener markers, reaction arrows and animated load path.
- Per-purlin station/load/reaction/moment/deflection/utilization table.
- Explicit `UNRESOLVED` states for roof sheet, fasteners, purlin-to-rafter connections and rafter/truss member capacity.

Completed in PR #109:
- [x] Member selection highlights the exact selected purlin, its tributary band, both rafter reaction points and synchronized formula/result trace.
- [x] Exploded demand-routing view: sheet → screws → selected purlin → rafters → supporting system.
- [x] Stable `futoltech.roof-bay-project/1` project JSON schema for later shared geometry/rendering/interchange work, with unresolved design layers prevented from silently becoming PASS.

Completed in PR #110:
- [x] Optional custom/nonuniform purlin station layout in addition to equalized maximum spacing.
- [x] Custom edge purlins may be offset from the physical roof boundary while tributary bands still terminate exactly at the roof eave/high-edge domain.
- [x] Exact tributary start/end boundaries are stored by the solver and used by both the base Roof Bay figure and selected-member overlay; the visual no longer assumes a symmetric band around an offset edge purlin.
- [x] Custom layout is preserved by project JSON round-trip and covered by deterministic + real-Chromium regression.

Completed in PR #111:
- [x] Separate Rafter A and Rafter B reaction diagrams show one discrete reaction station per modeled purlin.
- [x] Roof-normal and roof-downslope reaction components are separately visible with signed direction conventions.
- [x] Component conservation decomposes roof-area gravity, purlin self-weight and roof-normal wind before comparing the applied totals against Rafter A + Rafter B reaction totals.
- [x] Combined, gravity-only and wind-only component checks are regression-tested; wind-only uplift remains negative roof-normal and zero downslope.
- [x] Reaction diagrams remain demand-transfer views only and do not claim rafter/truss or connection capacity.

Remaining M2 checklist before moving the primary physics effort to M3:
- [ ] Roof-sheet pressure-zoning placeholders that can later accept M3 field/edge/corner zones without changing the shared M2 project geometry model.

M2 exit gate remains: summed reactions balance the applied roof load within numerical tolerance, with every displayed tributary/reaction path derived from the same solver model.

## M3 — Code Wind / Roof Zoning Engine
**Status: EARLY FOUNDATION ONLY.**

Existing work provides manual net-pressure inputs and code-assist experiments, but full reproducible code-derived wind zoning is not yet implemented. M3 remains the next major physics layer after the final M2 data-model slice is complete.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2 project-data and load-path work is being structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.
