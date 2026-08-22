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
**Status: FOUNDATION IMPLEMENTED IN PR #108.**

Implemented in the first M2 slice:
- Two adjacent rafter lines.
- Multiple equally distributed purlin rows from eave to ridge/high edge.
- Requested purlin spacing treated as a maximum; actual equal spacing is recomputed so no tiny remainder bay is created.
- Explicit edge/interior tributary widths; summed tributary widths must equal the roof slope length.
- Manual gravity/wind pressure routing from roof sheet area to each purlin.
- Each purlin solved under the existing C-purlin gross elastic solver with its own tributary width.
- Simply-supported purlin reactions routed as discrete point loads into both rafter lines.
- Vector load-conservation check: summed rafter reactions must balance applied roof pressure plus modeled purlin self-weight within numerical tolerance.
- Transparent 2D/2.5D roof-sheet context, visible purlins, representative sheet fastener markers, reaction arrows and animated load path.
- Per-purlin table for station, tributary width, line load, reaction, moment, deflection and gross utilization.
- Explicit `UNRESOLVED` state for roof-sheet capacity, fastener capacity, purlin-to-rafter connection capacity and rafter/truss member capacity.
- JSON export.
- Deterministic solver tests plus a real-Chromium gate for default geometry, equal-spacing reflow, primary navigation, equilibrium and wind-only uplift routing.

Next M2 slices:
1. Member selection → highlight the exact tributary band, purlin, two reaction points and formula trace.
2. Exploded load-path mode separating sheet, screws, purlins and rafters visually.
3. Optional custom purlin station layout instead of equal spacing only.
4. Rafter reaction diagrams and conservation breakdown by roof-normal / downslope components.
5. Roof-sheet pressure zoning placeholders that can later accept M3 field/edge/corner zones without changing the M2 project data model.
6. Stable Roof Bay project JSON schema for later Three.js M5 rendering and RPE interchange.

## M3 — Code Wind / Roof Zoning Engine
**Status: EARLY FOUNDATION ONLY.**

Existing work provides manual net-pressure inputs and code-assist experiments, but full reproducible code-derived wind zoning is not yet implemented. M3 remains the next major physics layer after M2 load-path geometry is stable.

## M4 — Roof Sheet + Fastener / Connection Layer
**Status: NOT YET INTEGRATED.**

Connection Lab contains reusable research foundations. Roof Bay deliberately labels these links unresolved until verified sheet/fastener/cleat/weld data and checks are integrated.

## M5–M13
**Status: ROADMAP / enabling foundations only.**

The current M2 project-data and load-path work is being structured so it can feed the later transparent Three.js roof viewer, full roof-system solver, cold-formed design, automatic resizing, live formula cockpit, resilience/failure sequencing, local product calibration, professional package and final integrated Roof Resilience Physics Engine without duplicating geometry or inventing visual-only physics.
