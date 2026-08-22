# M3 Roof Bay Project Wind Input Acceptance

Status date: 2026-08-22

## Purpose

This M3.2 slice exposes the already implemented `futoltech.wind-project-input-acceptance/1` contract directly in Roof Bay so an engineer can enter explicit, source-referenced project wind inputs and run the benchmarked velocity-pressure chain without pretending that velocity pressure is a final roof pressure.

## Accepted input families

The Roof Bay panel accepts the same evidence-gated input families protected by the project-input contract:

- project site / location and source reference;
- occupancy category and source reference;
- basic wind speed in kph;
- basic-wind-speed source type and source reference;
- source selection method;
- the declared NSCP wind-speed figure when the source is an authorized code-map read;
- exposure category B/C/D and source reference;
- topographic factor `Kzt` and source reference; and
- velocity-pressure evaluation / mean-roof height and source reference.

The occupancy-to-wind-speed-figure gate remains:

- Category I → Figure `207A.5-1C`;
- Category II → Figure `207A.5-1B`; and
- Categories III, IV and V → Figure `207A.5-1A`.

No contour value, municipal/provincial wind-speed table or geographic lookup is embedded by this UI. An authorized-code-map wind speed is still an engineer/project input with an explicit reference and selection method.

## Acceptance behavior

`VALIDATE + ACCEPT FOR q` calls the project-input acceptance layer and then the already benchmarked velocity-pressure solver. A successful record is labeled `ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY` and exposes the calculated `Kz` and `q` in the UI.

The independent regression case remains:

- Exposure C;
- `h = 8.82 m`;
- `V = 240 kph`;
- `Kzt = 1.0`;
- building `Kd = 0.85`;
- `Kz = 0.974820633`; and
- `q = 2.257468 kPa`.

Editing an accepted input invalidates the accepted state. The user must validate again so a stale `q` cannot remain attached to changed project inputs.

## Roof Bay project bridge

When an accepted input record exists, `EXPORT PROJECT JSON` embeds that record in the existing `futoltech.roof-bay-project/1` package. The project then deterministically derives its `futoltech.wind-design-basis/1` velocity-pressure state from the accepted record.

Validation recalculates that derived state and rejects a project whose stored wind-design basis no longer matches the accepted source record.

Older project files that do not contain the additive accepted-input field remain valid under schema v1.

## Permanent boundary of this slice

A verified velocity pressure is **not** a final roof pressure.

This slice does not implement or activate:

- enclosure / internal-pressure classification;
- roof-plan geometry required by coefficient/zoning rules;
- external pressure coefficients;
- internal pressure coefficients;
- field / edge / corner zone dimensions or polygons;
- effective-area coefficient selection;
- positive/downward or suction/uplift code-derived final pressures;
- code wind load combinations; or
- automatic routing of a code-derived pressure into the live Roof Bay solver.

`pressureZoning.activePressureModel` therefore remains `manual-uniform`, `pressureZoning.codeBasis` remains `null`, and `pressureZoning.regions` remains empty even after project inputs are accepted and `q` is available.

## QA contract

The dedicated real-Chromium regression must verify all of the following before merge:

1. the input panel mounts in an unaccepted state;
2. occupancy III displays Figure `207A.5-1A` guidance;
3. the source-referenced benchmark accepts and reproduces the protected `Kz` and `q` values;
4. accepted project inputs are embedded in Roof Bay project JSON;
5. the project wind-design basis is derived from, and cannot detach from, the accepted record;
6. manual-uniform Roof Bay pressure remains active with zero code zones; and
7. changing an accepted input invalidates the accepted state.

## Next M3 dependency

After this slice is merged, the next engineering task is to resolve and validate enclosure/internal-pressure classification together with the roof geometry/plan inputs required by the adopted code. External/internal pressure coefficients and field/edge/corner zoning remain blocked until those dependencies and their exact code rules are source-backed and independently benchmarked.
