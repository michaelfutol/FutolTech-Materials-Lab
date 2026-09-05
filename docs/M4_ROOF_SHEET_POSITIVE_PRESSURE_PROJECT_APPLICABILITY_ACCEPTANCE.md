# M4 Roof-Sheet Positive-Pressure Project Applicability Acceptance

## Scope

This M4 slice bridges the source-backed positive-pressure panel capacity evidence accepted in PR #141 to the explicit physical roof-sheet span/continuity/end-lap geometry accepted in PR #142.

The versioned record is:

`futoltech.roof-sheet-positive-pressure-project-applicability/1`

It decides **applicability only**. It does not select a governing capacity row or calculate utilization.

## Required project-to-source comparisons

For every accepted source evidence row and every physical sheet piece in every Roof Bay panel run, the bridge checks:

1. The #141 product applicability must already be complete.
2. The exact project sheet-piece span type must be explicitly covered by source applicability.
3. **Every actual purlin-to-purlin support spacing** within the piece must lie inside the source-backed support-spacing applicability range. Support spacings are never averaged.
4. The piece-specific overhang condition must be explicitly covered.
5. Load direction remains `toward-support`.
6. The target load category is explicit and source-referenced; a live-load/deflection row is not reused as positive-wind capacity unless its source applicability explicitly covers positive wind.

Missing project-applicability metadata remains reference-only. Explicit project mismatch is retained and classified as excluded rather than silently widened.

## Piece-specific overhang rule

Overhang is not assigned from the whole run by convenience.

- A piece reaching the eave is `with-overhang` only when the eave boundary extends beyond its first purlin support.
- A piece reaching the ridge is `with-overhang` only when the ridge boundary extends beyond its last purlin support.
- An interior physical piece created by end laps is `no-overhang` unless it itself reaches a roof edge beyond a support.

This matters because a run can contain edge pieces and interior pieces with different source applicability even though they belong to the same roof strip.

## Source consistency

When a #141 source applicability field is supplied for span type, support spacing, overhang, load direction or load category, it must cover the source row condition that the field accompanies. A contradictory evidence record is rejected.

`source-defined` is preserved as a literal source classification. It is **not a wildcard** for arbitrary project span or overhang conditions.

## Result classes

Per physical sheet piece, an evidence row is classified as one of:

- `PROJECT_APPLICABILITY_COMPLETE`
- `REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY`
- `REFERENCE_ONLY_INCOMPLETE_PROJECT_APPLICABILITY`
- `PROJECT_APPLICABILITY_EXCLUDED`

The record also reports which physical sheet pieces have at least one explicitly applicable evidence row. This is coverage information only; it is not capacity-row selection.

## Still unresolved after this slice

The following remain deliberately unresolved:

- governing capacity-row selection;
- interpolation or extrapolation between source rows;
- demand/capacity basis alignment;
- positive-pressure roof-sheet demand/capacity utilization;
- end-lap capacity or moment transfer across separate physical pieces;
- exact local sheet-to-purlin contact capacity;
- purlin local bearing/web crippling;
- screw compression/bearing/shear;
- fastener group action;
- purlin-to-rafter connection capacity;
- `roofSystemPass`.

A source row can be project-applicable and still be unusable for numerical utilization until demand and capacity bases are explicitly aligned in a later slice.

## Regression requirements

The deterministic suite protects against:

- averaging unequal project support spacings to manufacture a source match;
- treating whole-run overhang as every piece's overhang;
- treating `source-defined` as a wildcard;
- reusing a live-load/deflection row for positive wind without explicit source coverage;
- incomplete applicability being silently promoted;
- contradictory source applicability;
- post-acceptance applicability mutation;
- utilization or roof-PASS promotion.

Synthetic test values are regression fixtures only and are not manufacturer or project capacity data.
