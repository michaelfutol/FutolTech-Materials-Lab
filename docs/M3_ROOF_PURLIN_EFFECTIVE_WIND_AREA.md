# M3 Roof Purlin Components & Cladding Effective Wind Area

## Scope
This slice establishes a source-referenced **Components & Cladding (C&C)** design target and coefficient-selection effective wind area for the currently supported **roof purlin** target.

It does **not** select external roof `GCp` and does **not** calculate final roof pressure.

## Why this is a separate layer
The effective wind area used to select a C&C pressure coefficient is not necessarily the same quantity as the physical roof area that actually transfers pressure into the purlin.

For the supported purlin target this slice therefore keeps two areas explicit:

- **Actual load-application / tributary area** = purlin span × actual tributary width.
- **Coefficient-selection effective wind area** = purlin span × selected effective width.

The existing Roof Bay tributary bands remain the physical load-routing geometry. This M3 record must not rewrite those bands merely to obtain a different coefficient-selection area.

## Implemented effective-width selections
The record requires an explicit engineer/source-referenced selection:

1. `actual-tributary-width`
   - Uses the actual tributary width as the coefficient-selection effective width.
   - This preserves the smaller-area/conservative coefficient-selection basis when the actual width is below one-third of the span.

2. `one-third-span-minimum`
   - Uses `max(actual tributary width, span / 3)` as the coefficient-selection effective width.
   - The resulting effective wind area may be larger than the actual tributary area **for coefficient selection only**.
   - The physical wind load is still applied over the actual tributary/load-application area.

No beneficial enlargement is silently selected. The selection and its source/reference are mandatory project facts.

## Source / verification boundary
Primary rule reference: NSCP 2015 Components & Cladding effective-wind-area definition associated with the roof `GCp` figures. Publicly accessible NSCP text mirrors show the span × effective-width definition, the one-third-span minimum treatment, and the distinction between coefficient-selection area and actual tributary/load area. Project use still requires verification against an authorized NSCP copy and the exact applicable roof C&C figure/procedure.

This slice intentionally does not reproduce or embed the external-pressure coefficient figures/tables.

## Deterministic benchmark
For a roof purlin with:

- span = `4.0 m`
- actual tributary width = `1.0 m`

Actual load-application area:

`A_actual = 4.0 × 1.0 = 4.0 m²`

One-third-span reference width:

`b_1/3 = 4.0 / 3 = 1.333333333... m`

If the explicit `one-third-span-minimum` selection is used:

`A_eff = 4.0 × 1.333333333... = 5.333333333... m²`

The `5.333... m²` value is used only for future coefficient selection. The pressure-derived load still acts on the actual `4.0 m²` tributary area.

## Data contract
Schema: `futoltech.wind-roof-purlin-effective-area/1`

The record preserves:
- the exact accepted upstream wind pressure-context record;
- C&C procedure identity;
- target class = roof purlin;
- purlin span and actual tributary width with source reference;
- actual load-application area;
- explicit effective-width selection and source reference;
- one-third-span reference width;
- selected effective width;
- coefficient-selection effective wind area;
- whether coefficient-selection area exceeds actual tributary area;
- hard implementation boundaries preventing promotion into external `GCp`, zone pressure or final roof pressure.

## Still blocked
- Roof-sheet effective wind area.
- Fastener effective wind area and the fastener tributary-area cap.
- External roof `GCp` values / interpolation.
- Field / edge / corner geometry and assignments.
- External-minus-internal pressure combination.
- Load combinations.
- Automatic code-derived Roof Bay pressure.
- Purlin capacity upgrade from this area record.

Manual uniform pressure remains the active Roof Bay loading path until the complete external/internal coefficient, zoning and pressure-combination chain is independently implemented and benchmarked.
