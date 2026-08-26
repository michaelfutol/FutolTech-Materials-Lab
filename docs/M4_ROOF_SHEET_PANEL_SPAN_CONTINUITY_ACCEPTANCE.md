# M4 Roof-Sheet Panel Span / Continuity Acceptance

## Purpose

This M4 slice resolves a project-geometry dependency left intentionally open by PR #141.

PR #141 can accept source-backed positive-pressure roof-sheet capacity rows and verify that they cover the accepted roof-sheet product/profile/BMT/material. It deliberately cannot decide whether a source row applies to the actual project because panel span type, continuity, end laps and support spacing were not yet explicit.

This slice records those physical facts without selecting a capacity row or calculating utilization.

Versioned record:

`futoltech.roof-sheet-panel-span-continuity/1`

## Coordinate and span interpretation

The accepted Roof Bay frame is retained:

- `x` = Rafter A toward Rafter B;
- `y` = upslope from eave toward ridge.

Roof-sheet structural spans for this record are the **upslope distances between successive physical purlin support lines crossed by one physical sheet piece**.

The rafter-to-rafter Roof Bay width is not substituted for roof-sheet panel span.

## Explicit panel runs

One or more panel-run configurations partition the full Roof Bay width in `x`.

Each run records:

- a unique run identity;
- exact `x0/x1` coverage;
- a source reference for the run layout;
- one or more physical sheet pieces covering the full eave-to-ridge slope length;
- explicit end-lap records between adjacent physical pieces.

Multiple runs are allowed when different strips of the Roof Bay use different sheet-piece or lap arrangements. Run x-ranges must partition the full Roof Bay width with no gaps or overlaps.

## Physical sheet pieces

Each physical sheet piece records exact `y0/y1` limits and a source reference.

The solver derives, rather than guesses:

- every accepted purlin support line physically crossed by the piece;
- the ordered purlin-support sequence;
- each successive supported span length;
- span count;
- a `1-span` / `2-span` / `3-span` / `4-span` identity where directly representable, otherwise `source-defined` with the exact span count retained.

A piece must cross at least two physical purlin support lines to establish a supported panel span in this slice.

Continuity exists only within the same explicitly identified physical sheet piece across its listed internal supports.

## End laps and continuity breaks

Adjacent physical sheet pieces in one panel run must have a positive geometric overlap. Zero-overlap butt joints and gaps are not silently accepted as roof-sheet end laps.

Each end-lap record preserves:

- lower and upper physical piece identities;
- exact overlap interval;
- exact overlap length;
- detail/source reference;
- optional identified purlin support inside the overlap.

If a purlin support is identified, its physical station must lie inside the overlap interval.

If no purlin support is identified, the configuration may still be recorded, but the condition remains visibly unsupported/unresolved for later engineering eligibility.

An end lap is always a **monolithic-continuity break** in this slice. Overlap, screws or proximity do not justify treating two separate sheets as one continuous structural sheet without a later validated model.

## Edge geometry

For each run, the record retains the actual first and last purlin support stations and derives the eave/ridge edge distances to the Roof Bay boundaries. This preserves whether the project has roof-sheet overhang beyond the first/last purlin without assigning overhang capacity.

## Deterministic acceptance requirements

The record must reject:

- panel-run x gaps or overlaps;
- missing eave/ridge coverage;
- sheet-piece gaps or zero-overlap butt joints where an end lap is required;
- duplicate run or piece IDs;
- pieces outside the Roof Bay slope length;
- pieces that do not cross at least two accepted purlins;
- incorrect stated lap length;
- unknown lap-support purlins;
- a stated lap-support purlin outside the physical overlap;
- post-acceptance mutation of project basis, support/span geometry, laps or implementation boundary.

## Explicit unresolved boundaries

This slice does **not** implement:

- selection of a PR #141 capacity-evidence row for the project;
- comparison of project span type/support spacing/overhang with source applicability;
- demand/capacity basis alignment;
- positive-pressure roof-sheet utilization;
- end-lap strength or moment-transfer capacity;
- exact local sheet-to-purlin contact footprint/stress;
- purlin local bearing/web crippling;
- screw compression/bearing/shear;
- purlin member capacity;
- purlin-to-rafter capacity;
- roof-system PASS.

`roofSystemPass` remains `null`.

## Next dependency

After this geometry record is verified, the next M4 slice may compare the exact project panel-piece span type, each actual support spacing and relevant edge/overhang condition against the source applicability retained by PR #141.

Only source rows whose **product applicability and project span/support applicability are both explicitly satisfied** may proceed to a later demand/capacity basis-alignment and utilization layer.
