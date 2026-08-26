# M4 Roof-Sheet Positive-Pressure Capacity Evidence Acceptance

## Purpose

This M4 slice accepts **source-backed roof-sheet panel capacity evidence for loading that pushes the panel toward its supports** while preserving the exact applicability and basis of the source row.

Versioned record:

`futoltech.roof-sheet-positive-pressure-capacity-evidence/1`

This is an **evidence-acceptance layer only**. It does not calculate utilization and does not establish that a published span-table row applies to the active Roof Bay project.

## Why this is separate from roofing-screw uplift

PR #139 evaluates only basis-compatible individual fastener uplift mechanisms. PR #140 then resolves the opposite pressure direction as a roof-sheet → purlin support-line resultant rather than axial screw compression.

For positive/toward-support panel loading, panel structural behavior and local support behavior are separate from screw pull-out/pull-over.

A current public manufacturer example supporting this software boundary is MBCI exposed-fastener panel engineering data. Its load-table notes distinguish:

- loads that push the panel against its supports, for which listed panel limit states include flexure, shear, combined shear/flexure, web crippling at supports and deflection; and
- negative wind loads that pull the panel away from supports, with screw pullout/panel pullover checked separately.

Supporting public references checked 2026-08-26:

- MBCI, PBR & PBU Panels Technical/Installation Information, current web manual: https://www.mbci.com/wp-content/uploads/Widen%20Assets/ManualsMBCI25_PBR-PBU-Manual_0710239991101_MS_RevE_0725_WEB.pdf
- MBCI, PBD Roof Panel Allowable Load Table: https://www.mbci.com/wp-content/uploads/Widen%20Assets/Testing%20DocumentsPBD_Panel-Allowable-Load-Table_Roof.pdf

These references are **supporting examples of evidence structure**, not FutolTech project capacity values, not an NSCP substitute, and not authorization to use any MBCI value for a different product.

## Exact upstream product identity

This slice reuses the already-accepted roof-sheet product detail from `futoltech.roof-fastener-capacity-evidence/1` rather than creating a second conflicting product identity.

The accepted detail preserves:

- roof-sheet product ID;
- profile ID;
- base-metal thickness;
- material grade;
- Fy;
- Fu;
- source references.

The new positive-pressure evidence must explicitly cover those product properties or remain reference-only.

## Source row that must be preserved

Every accepted evidence row stores at minimum:

- evidence ID;
- source type;
- source/document reference and checked date;
- load direction = `toward-support`;
- source load category and original source label;
- span type (`1-span`, `2-span`, `3-span`, `4-span`, or explicitly `source-defined`);
- support spacing;
- overhang condition;
- uniform-pressure capacity value;
- capacity type and design basis;
- deflection-limit ratio when the source supplies one;
- source-covered limit states;
- product/profile/BMT/Fy/Fu applicability;
- source references for the condition, applicability and limit-state statements.

No row is reduced to a generic statement such as “0.5 mm sheet capacity = X kPa.”

## Product applicability

The record checks the source row against the exact already-accepted roof-sheet detail for:

1. product ID;
2. profile ID;
3. base-metal thickness;
4. yield strength;
5. ultimate strength.

If required applicability is missing, the row is retained only as:

`REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY`

If the source explicitly excludes the accepted product/detail, acceptance fails visibly.

If all required product fields are covered, the row may state:

`PRODUCT_APPLICABILITY_COMPLETE`

This status still does **not** mean that the source row applies to the active project span configuration.

## Why project span applicability remains unresolved

Manufacturer load tables commonly depend strongly on:

- one-span versus multi-span continuity;
- exact support spacing;
- end/interior support conditions;
- overhang restrictions;
- panel end laps and actual sheet continuity;
- sometimes installation/accessory requirements.

The current Roof Bay knows physical purlin locations but it does not yet prove how each actual roof sheet is continuous across those supports or where end laps occur.

Therefore this slice deliberately stores source span/support conditions but marks:

`projectPanelSpanConfigurationStatus = UNRESOLVED`

A later explicit panel-span configuration bridge must establish actual sheet continuity/support spacing before any source row can be used for project utilization.

## Capacity bases remain distinct

Stored capacity types remain distinct:

- nominal;
- allowable;
- design;
- test ultimate/reference.

Stored design bases remain distinct:

- LRFD;
- ASD;
- manufacturer-rated;
- test-reference;
- unclassified.

No resistance/safety-factor conversion is inferred by this evidence layer.

## Explicit unresolved boundaries

This slice does **not** implement:

- project panel span/continuity geometry;
- project span-table applicability;
- positive-pressure panel demand;
- demand/capacity basis alignment;
- positive-pressure panel utilization;
- exact local sheet-to-purlin contact footprint or stress;
- separate local sheet bearing/crushing capacity;
- purlin flange bearing/web crippling capacity;
- screw compression, bearing or shear capacity;
- roof-system PASS.

`roofSystemPass` remains `null`.

## Regression obligations

Deterministic tests must prove that:

- exact product-applicable evidence is accepted without creating utilization;
- incomplete product applicability stays reference-only;
- explicit product/profile/BMT/Fy/Fu mismatch is rejected;
- pull-away/uplift direction cannot enter this positive-pressure evidence path;
- malformed span/support/load-category metadata is rejected;
- duplicate evidence IDs and nonpositive capacities are rejected;
- source-covered limit states must be explicit;
- serialization is deterministic;
- stored evidence/detail mutation is rejected;
- project span applicability, utilization, local contact capacity and roof-system PASS cannot be promoted by mutation.

## Next dependency

After this evidence foundation is green, the next physically necessary bridge is an explicit **roof-sheet panel span / continuity configuration** tied to the actual Roof Bay purlin support geometry.

Only after that bridge exists may FutolTech decide whether a particular source-backed positive-pressure capacity row is applicable to a project strip/span.

Exact local sheet-to-purlin contact capacity remains a separate later dependency unless the accepted source explicitly resolves it.
