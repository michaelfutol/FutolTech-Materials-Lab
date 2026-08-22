# M3 Roof C&C Zone Geometry

Status: implementation candidate on PR #124; not a completed milestone until exact-head Engineering Checks pass and all four project source-of-truth records are synchronized.

## Purpose

This slice resolves the geometry needed before external roof pressure coefficients can be selected for the supported roof-purlin Components & Cladding path.

It deliberately separates three things that must not be conflated:

1. whole-roof code zoning geometry;
2. the registered physical location of one Roof Bay within that roof; and
3. exact areas where each physical purlin tributary band intersects field, edge, and corner zones.

No `GCp` value or final code-derived pressure is produced here.

## Supported geometry

The initial implementation supports an engineer-confirmed symmetric gable roof using the accepted M3 pressure-context geometry and an explicit ridge direction. Each selected slope is represented in roof-surface coordinates:

- `x`: parallel to the ridge, from one gable end to the other;
- `y`: upslope from eave to ridge.

The Roof Bay must be registered by its ridge-parallel start coordinate and span. This prevents a local Roof Bay rectangle from being guessed as field, edge, or corner without knowing its location on the whole roof.

## NSCP figure boundary

For the supported gable-roof range:

- `7° < theta <= 27°` -> NSCP 2015 Figure `207E.4-2B`;
- `27° < theta <= 45°` -> NSCP 2015 Figure `207E.4-2C`.

The implementation does not collapse these into one figure family.

## Edge dimension `a`

The implemented plan-horizontal edge dimension is:

`a = max(min(0.10 * least horizontal dimension, 0.40 * reference height), max(0.04 * least horizontal dimension, 0.9 m))`

The reference height is explicit and source-backed:

- for `theta <= 10°`, eave height is required;
- for `theta > 10°`, the accepted mean roof height is required.

Because `a` is a horizontal-plan dimension, the eave strip is mapped onto the sloping roof surface as:

`a_surface = a / cos(theta)`

The ridge is not treated as an exterior roof edge in this symmetric gable-roof slice.

## Zone partition

The roof-surface plane is partitioned without overlap:

- Zone 3 / `corner`: overlap of an eave strip and a gable-end strip;
- Zone 2 / `edge`: remaining eave or gable-end strip;
- Zone 1 / `field`: the remaining roof surface.

The implementation constructs deterministic rectangular cells from geometric breakpoints. This remains well-defined even if a small roof causes nominal edge strips to consume most or all of a roof dimension.

## Purlin tributary-band intersections

The supplied Roof Bay tributary bands must form a contiguous, non-overlapping partition from eave to ridge. Each band is registered into whole-roof coordinates and intersected with every zone cell.

A single physical purlin tributary band may therefore contain more than one zone area. The record keeps those areas separately instead of assigning one arbitrary zone label to the whole member.

Every band has an area-conservation check, and the whole Roof Bay has a second conservation check:

`sum(zone-intersection areas) = physical Roof Bay area`

## Explicitly unresolved

This slice does **not** implement:

- external `GCp` selection or interpolation;
- roof-sheet effective wind area;
- fastener effective wind area;
- overhang geometry or overhang coefficients;
- external/internal pressure combination;
- final code-derived roof pressure;
- routing code-derived pressure into the active Roof Bay solver;
- purlin, sheet, fastener, rafter, or connection capacity claims.

The active Roof Bay manual-uniform wind pressure remains unchanged until the full code-pressure chain is independently benchmarked and accepted.

## Source discipline

The formulas and figure-family boundaries are recorded against NSCP 2015 Part 1 C&C provisions and corresponding ASCE 7-10 wind-load references. Project use still requires verification against an authorized code copy and engineer acceptance.
