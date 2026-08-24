# M4 Roof Fastener Code-Pressure Demand Routing

Status: implementation candidate pending full Engineering Checks and milestone-record synchronization.

## Purpose

Route the already-verified M3 roof Components & Cladding directional pressure pieces into the explicit physical roof-sheet fastener tributary rectangles accepted by PR #136. This slice makes fastener demand visible and auditable without inventing any connection capacity.

## Versioned record

`futoltech.roof-fastener-code-pressure-demand-routing/1`

## Inputs

- One validated `futoltech.roof-sheet-fastener-layout/1` record.
- Exactly two validated `futoltech.wind-roof-bay-code-pressure-routing/1` records:
  - `toward-surface`
  - `away-from-surface`
- Explicit source/reference for the pressure-to-fastener routing decision.

The fastener layout and both M3 routes must describe the exact same Roof Bay span, roof-slope length, purlin labels, purlin stations and purlin tributary start/end/width geometry.

## Demand routing

For each fastener tributary rectangle and every verified M3 pressure piece on the same purlin row:

1. Convert the source M3 piece to the Roof Bay local span coordinate frame.
2. Intersect it with the accepted fastener tributary rectangle.
3. Preserve the source zone-cell identity, Zone 1/2/3 type, directional design pressure, minimum-pressure flag and governing raw pressure-case trace.
4. Calculate the contribution as:

`F_fastener,piece = p_design × A_overlap`

5. Sum all overlapping contributions to obtain the signed normal demand assigned to that physical fastener.

A fastener is not forced into one zone. If its tributary rectangle crosses field/edge/corner boundaries, all physical overlap contributions remain explicit.

## Conservation gates

For each wind direction:

- Every fastener overlap-area sum must equal its accepted tributary rectangle area.
- Every purlin-row fastener area sum must equal the exact source M3 purlin load area.
- Every purlin-row screw-force sum must equal the exact source M3 purlin normal wind force.
- Whole-Roof-Bay fastener area and signed force must equal the source M3 applied wind area/force.
- Field/edge/corner area and signed-force totals must independently reproduce the source M3 zone totals.

## Sign convention

- Positive normal demand: toward roof surface.
- Negative normal demand: away from roof surface / suction.

Both directions remain separate. They are never collapsed into an unsigned or arbitrarily governing screw demand in this slice.

## Permanent boundary for this slice

This is **demand routing only**. It does not implement or imply:

- roof-sheet structural redistribution or sheet capacity;
- self-drilling-screw pull-out capacity;
- pull-over / pull-through capacity;
- bearing, washer or local sheet capacity;
- fastener group redistribution/capacity;
- purlin local failure around the fastener;
- purlin-to-rafter cleat/bolt/weld capacity;
- connection utilization or PASS/FAIL;
- a complete factored connection-design check.

The fastener system therefore remains `capacityStatus: UNRESOLVED` and every routed fastener has `utilization: null`.

## QA requirements

Deterministic tests must protect:

- both signed M3 directions;
- multi-zone fastener overlap behavior;
- equal and irregular fastener layouts;
- per-fastener, per-row, per-zone and whole-bay area/force conservation;
- exact mismatch rejection for stale/different purlin geometry;
- deterministic round-trip identity;
- mutation rejection; and
- anti-promotion of any capacity/utilization claim.

The feature cannot be promoted in the Roadmap until the complete preliminary Engineering Checks suite passes. After the four permanent authority files are updated, the exact documentation-updated head must pass the full suite again before merge.
