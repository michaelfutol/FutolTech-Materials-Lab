# M3 Internal Pressure Coefficient — Base GCpi Foundation

Status date: 2026-08-22

## Purpose

This M3 slice resolves only the NSCP 2015 base internal-pressure coefficient cases associated with an already accepted engineer-declared enclosure classification.

It intentionally does **not** calculate final roof pressure.

## Governing references

Adopted project code profile:

- `ph-nscp-2015-v1-7e-2p`
- National Structural Code of the Philippines 2015, Volume 1, 7th Edition, 2nd Printing

Rule references:

- NSCP 2015 Section 207A.10 — enclosure classification
- NSCP 2015 Section 207A.11.1 and Table 207A.11-1 — internal pressure coefficient, `GCpi`
- NSCP 2015 Section 207A.11.1.1 — reduction factor `Ri` for qualifying partially enclosed large-volume buildings

Project use still requires verification against an authorized code copy.

## Base coefficient cases implemented

The solver maps the already accepted enclosure classification to the base Table 207A.11-1 cases:

| Enclosure classification | Base GCpi cases |
| --- | --- |
| Open | `0.00` |
| Enclosed | `+0.18`, `-0.18` |
| Partially enclosed | `+0.55`, `-0.55` |

Positive and negative cases remain separate because both signs must be considered as internal pressure acting toward or away from the internal surfaces.

## Large-volume Ri gate

The partially enclosed base values are **not treated as final internal-pressure coefficients** in this slice.

NSCP 2015 Section 207A.11.1.1 provides a reduction-factor path for a partially enclosed building containing a single unpartitioned large volume. The current pressure-context record does not yet carry the quantitative project facts needed to resolve that provision.

For partially enclosed buildings the solver therefore returns:

- base `GCpi = +0.55 / -0.55`;
- `Ri applicability = UNRESOLVED`;
- `Ri = null`;
- `Ri applied = false`; and
- an explicit list of required future project facts: single-unpartitioned-volume applicability, total building-envelope opening area, and unpartitioned internal volume.

For open and enclosed classifications, this M3 implementation marks the partially-enclosed large-volume `Ri` gate as not applicable to that base classification.

## Data contract

Schema:

`futoltech.wind-internal-pressure-coefficient/1`

The record carries:

- the exact upstream `futoltech.wind-pressure-context-acceptance/1` record;
- adopted code profile;
- enclosure classification;
- base GCpi cases;
- sign convention;
- code-rule references;
- explicit `Ri` status; and
- implementation flags that prevent unimplemented downstream capabilities from being promoted.

## Hard boundary

This slice does not implement:

- automatic enclosure classification;
- quantitative enclosure-definition threshold checks;
- `Ri` applicability evaluation or reduction-factor calculation;
- internal-pressure velocity selection (`qi`, `qh`, `qz` as applicable);
- external pressure coefficients;
- effective wind area;
- field/edge/corner roof geometry;
- pressure combination with external pressure; or
- final code-derived Roof Bay pressure.

Manual-uniform Roof Bay pressure therefore remains the active pressure path.

## Deterministic QA

Tests protect:

1. open → `0.00` only;
2. enclosed → `+0.18 / -0.18`;
3. partially enclosed → `+0.55 / -0.55` while `Ri` remains unresolved and unapplied;
4. exact round-trip serialization;
5. no mutation of code-table base values;
6. no detachment from the upstream accepted enclosure classification; and
7. no promotion of `Ri` or final-pressure flags.

## Next dependency

After this foundation is final-head green and merged, the next M3 slice should accept the quantitative large-volume/applicability inputs and independently benchmark the `Ri` rule before any partially enclosed internal-pressure coefficient is allowed to advance toward final pressure.

Only after the internal-pressure chain is complete should external roof pressure coefficients, effective wind area, roof zoning, and final pressure combination be enabled.