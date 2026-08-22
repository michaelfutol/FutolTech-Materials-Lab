# M3 Enclosure + Roof Geometry Input Acceptance

Status date: 2026-08-22

## Purpose

This slice creates the next evidence-gated input contract needed before internal/external wind-pressure coefficients or field/edge/corner zoning are implemented.

The versioned record is:

`futoltech.wind-pressure-context-acceptance/1`

It accepts two previously unresolved M3 input families:

1. an engineer-declared building enclosure classification with an explicit project opening-assessment reference; and
2. source-referenced building/roof geometry needed by later pressure-coefficient and zoning procedures.

It deliberately does **not** calculate `GCpi`, external pressure coefficients, effective wind area, roof zones or final roof pressure.

## Code basis and enclosure classification boundary

NSCP 2015 Section 207A.10.1 states that, for internal-pressure-coefficient purposes, buildings are classified as **enclosed**, **partially enclosed**, or **open**, using the definitions in Section 207A.2. Section 207A.10.2 requires a determination of openings in the building envelope for the enclosure classification.

This slice stores those three classification labels but does not encode the quantitative opening-definition tests. The accepted classification therefore remains:

`ENGINEER_DECLARED_PROJECT_INPUT`

and requires both:

- an enclosure-classification source/reference; and
- an opening-assessment source/reference.

Project use must still be checked against an authorized NSCP copy. The software does not claim that it has automatically proven the enclosure category.

## Accepted geometry

The pressure-context record requires explicit, source-referenced physical geometry:

- roof form: gable, hip, monoslope, flat or other;
- building plan length;
- building plan width;
- mean roof height;
- roof slope; and
- source references for roof form, plan dimensions, mean roof height and slope.

For this M3 slice, the mean-roof-height value must match the already accepted wind-project height. That prevents the pressure-context record from silently drifting away from the height used by the upstream velocity-pressure calculation.

The accepted roof-form labels are physical project descriptors only. They are not yet mapped to any NSCP external-pressure coefficient figure/table or procedure.

## Upstream dependency

A pressure-context record must contain a valid upstream:

`futoltech.wind-project-input-acceptance/1`

The adopted wind-code profile must remain identical to the upstream record. This preserves one traceable chain:

site / occupancy / wind speed / exposure / Kzt / height → enclosure + roof geometry → future pressure coefficients / zoning.

## Anti-promotion flags

The following implementation flags are hard-locked to `false` in this slice:

- automatic enclosure classification;
- code-definition threshold evaluation;
- internal pressure coefficient;
- external pressure coefficient;
- effective wind area;
- field/edge/corner geometry; and
- final roof pressure.

Validation rejects any mutated record that attempts to promote one of those capabilities.

## Deterministic QA

Tests protect:

- the three explicit enclosure labels;
- rejection of unsupported classification labels;
- required opening-assessment and geometry provenance;
- exact mean-roof-height consistency with the upstream accepted wind record;
- deterministic JSON serialization / round trip; and
- rejection of silent automatic-classification or coefficient-implementation claims.

## Next dependency

After this data-contract slice is merged, the next step is to expose the accepted enclosure/roof-geometry context in Roof Bay/project JSON. Only after that context is stable and source-backed should the code-specific internal-pressure coefficient, external-pressure coefficient and field/edge/corner zoning rules be implemented and independently benchmarked.
