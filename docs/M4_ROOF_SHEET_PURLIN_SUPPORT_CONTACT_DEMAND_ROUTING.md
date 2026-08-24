# M4 Roof-Sheet → Purlin Support-Contact Demand Routing

## Purpose

This M4 slice resolves the physical interpretation of the already-preserved **toward-surface** roof pressure path.

It deliberately does **not** treat the positive/toward-surface pressure share stored in PR #137 as axial compression demand in each roofing screw.

Instead, the verified M3 pressure pieces are handed off as a **roof-sheet → purlin support-line resultant**.

Versioned record:

`futoltech.roof-sheet-purlin-support-contact-demand-routing/1`

## Engineering interpretation

For through-fastened metal roof systems, gravity/positive-pressure behavior and uplift behavior are not the same connection problem.

Supporting guidance used for this software load-path interpretation:

- Metal Building Manufacturers Association, *Roof Framing Design Guide for Metal Building Systems*, 2nd Edition, 2024.
- Chapter 2 separates gravity-loading assumptions for purlins supporting through-fastened panels from the uplift-loading R-factor method.
- Section 2.2.1 discusses the through-fastened panel attached to the purlin compression flange under gravity loading.
- Section 2.2.2 separately addresses uplift behavior.

This MBMA reference is **supporting engineering guidance**, not a substitute for the governing project code or an authorized NSCP copy. Existing `authorizedCopyReviewRequired=true` project-code boundaries remain unchanged.

## Implemented demand handoff

For each verified M3 toward-surface physical pressure piece on each purlin tributary band:

`w_support = p_design × b_tributary`

where:

- `p_design` = verified positive/toward-surface design pressure, kPa = kN/m²;
- `b_tributary` = physical upslope tributary width of that exact field/edge/corner piece, m;
- `w_support` = roof-sheet-to-purlin support-line resultant, kN/m.

The exact piece force remains:

`F_piece = w_support × L_piece = p_design × A_piece`

The record does not create a new wind-pressure calculation. It reuses and independently checks the existing verified M3 `piecewiseLineLoadKNM` and exact physical pressure-piece geometry.

## Why PR #137 fastener cells remain but are not screw compression

PR #137 partitions both pressure directions into accepted screw tributary rectangles so area/force conservation and zone identity are preserved.

For uplift, that discrete partition is used by PR #139 because the roofing screws act as anchors and pull-out/pull-over can be screw-specific limit states.

For toward-surface loading, this slice uses the PR #137 screw partition only as a **conservation audit**:

- summed fastener-cell pressure area must equal the verified source pressure area;
- summed positive fastener-cell force must equal the purlin support-line resultant;
- changing screw station locations must not change the support-line demand.

The individual positive cell force is therefore **not promoted to axial compression in the screw**.

## Preserved provenance

Each support segment retains:

- purlin identity and station;
- exact spanwise segment limits;
- physical upslope tributary width;
- field / edge / corner identity;
- zone cell and zone number;
- governing raw pressure-case identity;
- minimum-pressure flag;
- design pressure;
- source pressure area;
- support-line load in kN/m;
- exact normal force in kN.

## Conservation requirements

The solver independently protects:

1. `A_piece = L_piece × b_tributary`;
2. `w_support = p_design × b_tributary`;
3. `F_piece = w_support × L_piece`;
4. piece force equals the verified source M3 force;
5. each purlin row reproduces its M3 area and force;
6. the PR #137 positive fastener partition reproduces the same row force only as an audit;
7. field/edge/corner totals reproduce the M3 zone totals;
8. whole-Roof-Bay area and force reproduce the verified toward-surface M3 route.

## Explicit unresolved boundaries

This slice does **not** implement:

- axial compression capacity of the roofing screw;
- exact local sheet-to-purlin contact footprint or contact stress;
- roof-sheet positive-pressure bending/local capacity;
- panel rib/flat local bearing or crushing capacity;
- purlin local flange bearing or web crippling capacity;
- purlin member strength/serviceability capacity;
- screw bearing or shear capacity;
- fastener group action;
- purlin-to-rafter cleat/bolt/weld capacity;
- any toward-surface utilization ratio;
- any roof-system PASS.

All such states remain explicitly `UNRESOLVED`.

## Regression obligations

The deterministic QA matrix must prove that:

- support-line load is independently reproduced from pressure × physical tributary width;
- piece force is independently reproduced from line load × segment length;
- exact field/edge/corner and governing raw-case identity is retained;
- moving screw stations does not change inward support-line demand;
- stored support-line mutation is rejected;
- capacity/utilization or screw-compression promotion is rejected;
- roof-system PASS remains `null`.

## Next dependency

After this demand handoff is verified, the next M4 capacity work should require exact source-backed evidence for the relevant **roof-sheet positive-pressure / local support-contact limit states** before any toward-surface PASS can exist.

Purlin local bearing/web crippling and purlin member design must remain in their correct purlin-capacity layer rather than being hidden inside a roofing-screw check.
