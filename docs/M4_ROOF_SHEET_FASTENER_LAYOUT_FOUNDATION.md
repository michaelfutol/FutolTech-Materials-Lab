# M4 Roof Sheet + Fastener / Connection Layer — Fastener Layout Foundation

Status: **FOUNDATION CANDIDATE — geometry/evidence acceptance only; demand routing and all capacities remain unresolved.**

## Why M4 starts here

M3 closes with a verified code-derived pressure/load-combination demand chain through controlled Roof Bay activation. M4 must stop treating the transfer from roof sheet to purlins, and from purlins to rafters/trusses, as automatic.

The existing FutolTech Connection Lab is useful research infrastructure for timber nails and bolts, but it does not contain verified roofing self-drilling-screw pull-out/pull-over design or steel roof-sheet connection capacity. Those research equations must not be relabeled as roofing-screw capacity.

The first M4 dependency is therefore **physical attachment geometry**, not capacity. Before a pressure can be assigned to a screw, the engine must know where every screw is and what physical roof area is being routed toward that attachment under the adopted demand-routing assumption.

## Versioned contract

Schema: `futoltech.roof-sheet-fastener-layout/1`

Current status: `FASTENER_LAYOUT_ACCEPTED_DEMAND_AND_CAPACITY_UNRESOLVED`

The record consumes one validated `futoltech.roof-bay-project/1` and requires:

- one explicit fastener row for every physical Roof Bay purlin;
- explicit fastener x-stations measured in the accepted roof-local frame from Rafter A toward Rafter B;
- fastener system identity/description and a source reference;
- attachment position classification (`crest`, `pan`, or explicitly described other detail);
- a traceable roof fastening layout source; and
- a traceable engineer/project basis for the midpoint tributary-strip area-share assumption used only for later demand routing.

No equal screw spacing is inferred. Irregular screw positions are preserved exactly.

## Physical geometry rule

For each purlin row:

1. The accepted Roof Bay purlin centerline and its exact upslope tributary band come from the same M2/M3 geometry chain.
2. Fastener positions along the rafter-to-rafter span are explicit inputs.
3. Adjacent fastener midpoint boundaries define an along-span tributary strip for geometry-only demand sharing.
4. The first strip extends to Rafter A (`x=0`) and the last strip extends to Rafter B (`x=span`).
5. Each fastener tributary rectangle is the Cartesian product of that along-span strip and the physical purlin tributary band.
6. All fastener tributary rectangles on a purlin must exactly recover that purlin-band Roof Bay area.
7. All rows combined must exactly recover the complete Roof Bay area.

This is an **area partition for demand routing**, not proof that a real profiled roof sheet distributes load equally or only by nearest-fastener tributary area.

## Deterministic anti-mutation rule

Validation independently reconstructs every midpoint strip from the stored fastener x-stations. It rejects records where someone later changes:

- a fastener x or y position;
- purlin-row identity/order;
- any tributary rectangle boundary or area;
- row or whole-bay conservation totals; or
- the accepted Roof Bay geometry.

The JSON record therefore cannot be hand-edited into a different fastener layout while retaining stale stored tributary geometry.

## Explicitly unresolved in this slice

- Code pressure → individual fastener demand routing.
- Strength/service load combinations at individual fasteners.
- Roof-sheet bending, local deformation, diaphragm action or profile capacity.
- Screw pull-out from the purlin.
- Screw pull-over through the sheet/washer region.
- Screw bearing/tilting/washer action.
- Fastener group stiffness, redistribution or prying.
- Side-lap/end-lap behavior.
- Purlin local failure around the screw.
- Purlin-to-rafter weld/cleat/bolt demand or capacity.
- Any connection PASS/FAIL or roof-system PASS.

Fastener product identity is stored only for traceability. `capacityStatus` is forced to `UNRESOLVED` and validation rejects any silent promotion.

## Deterministic benchmark

The first benchmark uses a 3.0 m rafter spacing × 4.0 m roof-slope-length bay with equalized 0.8 m maximum purlin spacing. Six physical purlin rows and five explicit fasteners per row produce 30 physical attachment nodes. Their midpoint tributary rectangles must sum to exactly `12.0 m²`, the Roof Bay physical area.

Additional regressions protect:

- irregular fastener spacing without regularization;
- custom/nonuniform purlin stations and their exact upslope tributary bands;
- missing/extra/duplicate purlin rows;
- duplicate, unsorted or out-of-span fastener stations;
- deterministic JSON round-trip;
- post-creation fastener/rectangle mutation rejection;
- capacity-promotion rejection; and
- stale Roof Bay geometry invalidation.

## Next dependency after this foundation

Route one already-verified M3 directional code-pressure record through the exact intersection of each M3 field/edge/corner pressure piece and each accepted fastener tributary rectangle. That next layer must prove area and force conservation from roof pressure pieces to individual sheet-fastener demand **without yet claiming screw or sheet capacity**.
