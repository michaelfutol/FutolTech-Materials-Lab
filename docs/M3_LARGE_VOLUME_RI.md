# M3 Large-Volume Internal-Pressure Reduction Factor — Ri

Status date: 2026-08-22

## Purpose

This M3 slice implements the NSCP 2015 Section 207A.11.1.1 large-volume reduction-factor path downstream of the already verified partially enclosed base internal-pressure coefficient.

It does not calculate final roof pressure.

## Governing code path

Adopted code profile:

- `ph-nscp-2015-v1-7e-2p`
- National Structural Code of the Philippines 2015, Volume 1, 7th Edition, 2nd Printing

Rule path:

1. Engineer-declared enclosure classification is accepted upstream.
2. PR #119 resolves the partially enclosed base `GCpi = +0.55 / -0.55`.
3. NSCP 2015 Section 207A.11.1.1 applies only when a partially enclosed building contains a single unpartitioned large volume.
4. For that qualifying condition the provision permits conservative `Ri = 1.0` or the large-volume equation, with the equation result not exceeding 1.0.

Project use must still be checked against an authorized code copy.

## Metric equation

Implemented metric form:

`Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0`

where:

- `Aog` = total area of openings in the building envelope, walls and roof, m²;
- `Vi` = unpartitioned internal volume, m³.

The implementation preserves the code-permitted conservative `Ri = 1.0` path. It never silently chooses the beneficial reduction.

## Applicability remains engineer-declared

The software does not infer that a building contains a qualifying single unpartitioned large volume. The project record must state this explicitly and preserve an applicability source/reference.

If the engineer declares the building does **not** satisfy that condition:

- `Ri = 1.0`;
- no quantitative `Aog` or `Vi` values are carried;
- the base `+0.55 / -0.55` cases remain unchanged.

If the engineer declares that the building **does** satisfy the condition:

- positive `Aog` and `Vi` are required;
- each quantitative value requires a project source/reference;
- the equation result is calculated deterministically; and
- the application choice must be explicit: `conservative-ri-1` or `equation-reduction`.

## Deterministic benchmark

Use:

- `Vi = 6950 m³`
- `Aog = 1.00 m²`

Then:

- `Vi / (6950 Aog) = 1.0`
- `Ri = 0.5 * (1 + 1/sqrt(2))`
- `Ri = 0.8535533905932737`

For partially enclosed base `GCpi = ±0.55`, selecting the equation reduction gives:

- adjusted `GCpi = ±0.4694543648263006`

Selecting the conservative option keeps `GCpi = ±0.55`.

## Data contract

Schema:

`futoltech.wind-large-volume-reduction/1`

The record carries:

- exact upstream `futoltech.wind-internal-pressure-coefficient/1` base record;
- engineer-declared applicability and source;
- `Aog` and source when qualifying;
- `Vi` and source when qualifying;
- deterministic equation ratio and `Ri`;
- explicit application choice;
- selected `Ri`;
- base and adjusted GCpi cases; and
- downstream implementation boundaries.

## Hard boundaries

This slice does not implement:

- automatic large-volume applicability classification;
- internal-pressure velocity-pressure selection (`qi`, `qh`, or `qz` as applicable);
- external pressure coefficients;
- effective wind area;
- field/edge/corner roof geometry;
- internal/external pressure combination;
- load combinations; or
- final code-derived Roof Bay pressure.

Manual-uniform Roof Bay pressure remains the active pressure path.

## QA contract

Deterministic tests protect:

1. the hand benchmark `Ri = 0.8535533905932737` for `Vi=6950 m³`, `Aog=1 m²`;
2. conservative `Ri=1.0` selection for a qualifying building;
3. explicit equation-reduction selection;
4. non-qualifying path with no unused quantitative inputs;
5. rejection of open/enclosed upstream classifications;
6. positive/source-backed `Aog` and `Vi` requirements;
7. exact round-trip serialization; and
8. rejection of mutated `Ri`, adjusted GCpi, or final-pressure promotion.

## Next M3 dependency

After this slice is final-head green and merged, internal-pressure work should proceed to the exact velocity-pressure selection and internal-pressure term used by the applicable NSCP roof-pressure procedure. External pressure coefficients and roof zoning should remain separate source-backed slices so the final combination is auditable rather than hidden in one large implementation.