# M3 Low-Rise Roof Net Pressure — Purlin C&C

Status: implementation candidate. This slice is not milestone-complete until the preliminary implementation head passes the complete Engineering Checks suite, all four Roof Resilience source-of-truth records are synchronized, and the documentation-updated exact final head is fully green before merge.

## Purpose

This slice combines the already-verified external roof pressure term with the applicable internal-pressure coefficient for the currently supported **roof-purlin Components & Cladding** target.

For the current NSCP 2015 Part 1 low-rise path (`h <= 18 m`), the implemented equation is:

`p = qh[(GCp) - (GCpi)]`

The internal velocity-pressure basis is therefore the same mean-roof-height `qh` already carried by the external pressure chain. The higher-building Part 3 opening-height `qi=qz` option is explicitly blocked from this path.

## Supported scope

- Code profile: `ph-nscp-2015-v1-7e-2p`.
- Procedure: Components & Cladding.
- Target: roof purlin.
- Roof geometry/coefficient scope inherited from PRs #123–#128: non-overhang symmetric gable, `h <= 18 m`, with exact field/edge/corner zone-intersection pieces.
- Enclosure: enclosed or partially enclosed only for this Part 1 path.
- Enclosed internal coefficient cases: `GCpi = +0.18, -0.18`.
- Partially enclosed: uses the explicit PR #120 `Ri` decision record and its adjusted `GCpi` cases. A partially enclosed net-pressure record cannot bypass the Ri decision even when `Ri = 1.0` is selected conservatively.

## Sign convention

All pressure signs are **normal to the roof surface**:

- positive pressure = toward the roof surface;
- negative pressure = away from the roof surface / suction.

These signs are not global vertical directions.

Every physical field/edge/corner piece crossed by the selected purlin tributary band remains separate. The solver forms every applicable external-sign × internal-sign case before deriving directional envelopes; it does not average coefficients or pressures across zones.

## Minimum Components & Cladding pressure

The minimum design pressure is `0.77 kPa` in either direction normal to the surface.

This implementation preserves two layers separately:

1. **raw calculated net cases** from `qh[(GCp)-(GCpi)]`; and
2. **directional design envelopes**, where the governing toward-surface pressure is not less than `+0.77 kPa` and the governing away-from-surface pressure is not less severe than `-0.77 kPa`.

This separation is intentional. The minimum is not retroactively applied to `GCp`, `qh(GCp)`, or any individual upstream external-only term.

## Deterministic enclosed benchmark

Using the established project benchmark:

- Exposure C;
- mean roof height `h = 8.82 m`;
- basic wind speed `V = 240 kph`;
- `Kzt = 1.0`;
- `qh = 2.257467958862151 kPa`;
- 25° Figure 207E.4-2B field external pressures from PR #128:
  - positive external = `+0.8424734676442587 kPa`;
  - negative external = `-1.8885909070825277 kPa`.

With enclosed `GCpi = ±0.18`, the field raw cases are:

- external positive, internal `+0.18` → `+0.4361292350490715 kPa`;
- external positive, internal `-0.18` → `+1.2488177002394458 kPa`;
- external negative, internal `+0.18` → `-2.294935139677715 kPa`;
- external negative, internal `-0.18` → `-1.4822466744873406 kPa`.

Therefore the raw governing field envelopes are:

- toward surface: `+1.2488177002394458 kPa`;
- away from surface: `-2.294935139677715 kPa`.

The 0.77 kPa minimum does not alter either of those benchmark envelopes because both already exceed the minimum magnitude.

## Partially enclosed Ri benchmark

For the established large-volume benchmark:

- `Vi = 6950 m³`;
- `Aog = 1.00 m²`;
- equation-selected `Ri = 0.8535533905932737`;
- adjusted `GCpi = ±0.4694543648263006`.

With the same field external pressures and `qh`, the raw field cases include:

- external positive, internal positive → `-0.21730471909909777 kPa`;
- external positive, internal negative → `+1.9022516543876151 kPa`;
- external negative, internal positive → `-2.9483690938258844 kPa`;
- external negative, internal negative → `-0.8288127203391713 kPa`.

This benchmark proves that external sign alone does not determine the final net direction; the internal-pressure sign must remain an explicit case.

## Minimum-pressure regression

A deliberately low-wind test uses the same geometry with `V = 60 kph`. The raw governing pressures remain below `0.77 kPa` in magnitude, while the separately stored design envelopes become exactly:

- `+0.77 kPa` toward surface; and
- `-0.77 kPa` away from surface.

The raw cases remain unchanged and traceable.

## Explicitly unresolved after this slice

This record does **not** yet:

- create strength/service wind load combinations;
- choose a final project combination;
- route the code-derived zone pressures into Roof Bay purlin demands/reactions;
- replace the current manual-uniform Roof Bay pressure path;
- resolve roof-sheet effective wind area;
- resolve fastener effective wind area or fastener capacity;
- resolve purlin-to-rafter connection capacity;
- promote purlin capacity beyond the existing supported screening/design boundaries.

## Sources / verification boundary

- NSCP 2015 Volume 1, 7th Edition, Part 1 Components & Cladding roof-pressure provisions for buildings with `h <= 18 m` — net-pressure equation and procedure applicability. Verify against an authorized code copy before project use.
- NSCP 2015 internal-pressure coefficient provisions — base `GCpi` and qualifying partially enclosed large-volume `Ri` adjustment. Verify against an authorized code copy before project use.
- NSCP 2015 Components & Cladding minimum design pressure requirement — `0.77 kPa` in either direction normal to the surface. Verify against an authorized code copy before project use.

Permanent boundary: the existence of a verified net-pressure record still does not activate code-derived Roof Bay pressure. Routing, load-case identity, force/reaction conservation and the M3 end-to-end benchmark remain separate gates.