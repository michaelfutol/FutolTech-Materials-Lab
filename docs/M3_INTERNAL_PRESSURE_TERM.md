# M3 Internal-Pressure Velocity Selection + Term

## Scope
This slice resolves the internal-pressure velocity pressure `qi` and the signed internal-pressure term `qi(GCpi)` downstream of the already accepted M3 wind-project, pressure-context, base-GCpi and (where applicable) large-volume `Ri` records.

It does **not** calculate final roof pressure.

## Implemented rule
For the current NSCP 2015 directional-procedure foundation:

- Enclosed building: `qi = qh` for positive and negative internal-pressure cases.
- Partially enclosed building, negative internal pressure: `qi = qh`.
- Partially enclosed building, positive internal pressure: either
  - `qi = qz` at the height of the highest opening that can affect positive internal pressure, using an explicit source-referenced project elevation; or
  - the conservative permitted evaluation `qi = qh`.
- Open building: base `GCpi = 0`, so the internal-pressure term is zero.

The signed term is calculated as:

`p_internal = qi * (GCpi)`

This term is preserved separately so later work can combine it with a verified external-pressure term without losing sign or provenance.

## Source / verification boundary
Primary rule reference: NSCP 2015 wind design-pressure provisions associated with the directional procedure and Section 207A.11 internal pressure. Publicly accessible NSCP text mirrors show the same `qi` selection rule; project use still requires verification against an authorized code copy.

The repository does not infer a highest-opening elevation. If the exact `qz` path is selected, both the elevation and its source reference are mandatory. If the conservative `qh` path is selected, no unused opening elevation is retained.

## Upstream chain
1. `futoltech.wind-project-input-acceptance/1`
2. `futoltech.wind-pressure-context-acceptance/1`
3. `futoltech.wind-internal-pressure-coefficient/1`
4. For partially enclosed buildings only: `futoltech.wind-large-volume-reduction/1`
5. This slice: `futoltech.wind-internal-pressure-term/1`

A partially enclosed record may not bypass the explicit `Ri` decision record, even when the selected factor is the conservative `Ri = 1.0` path.

## Deterministic QA
Tests protect:
- enclosed `qh` selection for both GCpi signs;
- partially enclosed negative `qh` selection;
- partially enclosed positive exact-opening `qz` and conservative `qh` paths;
- carry-through of adjusted GCpi after a selected Ri reduction;
- open-building zero internal term;
- rejection of a partially enclosed record that bypasses the Ri decision;
- deterministic serialization / round-trip;
- rejection of mutated `qi` or `qi(GCpi)` results.

## Still blocked
- External roof pressure coefficients.
- Effective wind area.
- Field / edge / corner zone geometry.
- External-minus-internal pressure combination.
- Load combinations.
- Automatic code-derived Roof Bay pressure.

Manual uniform pressure remains the active Roof Bay loading path until these downstream layers are independently implemented and benchmarked.