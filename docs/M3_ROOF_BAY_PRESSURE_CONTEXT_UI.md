# M3 Roof Bay Pressure-Context Acceptance UI

Status date: 2026-08-22

## Purpose

This M3.3 slice exposes the merged `futoltech.wind-pressure-context-acceptance/1` contract directly in Roof Bay and carries a validated pressure-context record into `futoltech.roof-bay-project/1` without promoting velocity pressure or context inputs into final code-derived roof pressure.

The UI accepts only after the upstream `futoltech.wind-project-input-acceptance/1` record has been validated.

## Accepted context

The panel records:

- engineer-declared enclosure classification: `enclosed`, `partially-enclosed`, or `open`;
- enclosure-classification source reference;
- separate building-envelope openings assessment reference;
- roof form;
- roof-form source reference;
- overall building plan length and width;
- plan-dimension source reference;
- mean roof height and source reference inherited from the accepted upstream wind-project record;
- roof slope and source reference; and
- optional project review note.

The enclosure category remains `ENGINEER_DECLARED_PROJECT_INPUT`. The UI does not evaluate the quantitative NSCP opening-definition thresholds.

## Anti-drift rules

A pressure-context record cannot be exported with a Roof Bay project unless:

1. the project also carries a valid accepted wind-project input record;
2. the pressure-context record contains the exact same upstream wind-project input record;
3. the adopted code profile remains identical; and
4. the pressure-context roof slope matches the active Roof Bay project slope.

Building plan length and width remain building-level geometry. They are not inferred from the local Roof Bay rafter spacing or roof-slope length.

Editing the upstream accepted wind inputs invalidates the downstream pressure-context acceptance. Editing the Roof Bay roof slope also invalidates the accepted pressure context.

## Project JSON bridge

When a valid accepted pressure-context record exists, the Roof Bay project export can include:

`windPressureContextAcceptance`

The additive schema-v1 field preserves the exact source-backed chain:

site / occupancy / wind speed / exposure / Kzt / height → enclosure + building/roof geometry → future coefficient/zoning work.

Older schema-v1 project records remain valid without this additive field.

## Permanent boundary of this slice

Even with both accepted M3 input records present:

- `pressureZoning.activePressureModel` remains `manual-uniform`;
- `pressureZoning.codeBasis` remains `null`;
- `pressureZoning.regions` remains empty;
- `analysisBoundary.codeWindZoning` remains `UNRESOLVED`;
- automatic enclosure classification remains unimplemented;
- code-definition threshold evaluation remains unimplemented;
- `GCpi` remains unimplemented;
- external pressure coefficients remain unimplemented;
- effective wind area remains unimplemented;
- field/edge/corner dimensions and polygons remain unimplemented; and
- final code-derived roof pressure remains unimplemented.

## QA contract

The deterministic project tests protect exact upstream-record attachment, roof-slope consistency, round-trip serialization and the no-premature-zoning boundary.

The dedicated real-Chromium V9 gate must verify:

1. pressure context starts blocked until the wind-project input record is accepted;
2. the accepted upstream mean roof height and source are inherited into the context panel;
3. source-referenced enclosure and roof/building geometry can be accepted;
4. the context record remains engineer-declared rather than automatically classified;
5. Roof Bay project JSON embeds the accepted pressure-context record and its exact upstream evidence chain;
6. manual-uniform pressure, null code basis and zero code zones remain enforced; and
7. editing an upstream accepted wind input invalidates the downstream context.

## Next M3 dependency

After this UI/project bridge is merged and final-head Engineering Checks are green, the next M3 engineering slice may begin source-backed implementation and independent benchmarking of internal-pressure coefficient rules (`GCpi`). External pressure coefficients, effective-wind-area logic, field/edge/corner zoning, load combinations and final Roof Bay code-pressure routing remain blocked until their own explicit implementation and verification gates are complete.