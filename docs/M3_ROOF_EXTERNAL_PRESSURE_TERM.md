# M3 External Roof Pressure Term — `qh(GCp)`

Status: implementation candidate. Do not mark the milestone complete until the preliminary implementation head passes the complete Engineering Checks suite, all four Roof Resilience source-of-truth records are synchronized, and the documentation-updated exact final head is fully green.

## Purpose

This slice converts the already-verified external roof coefficient from PR #127 into an **external-only pressure term** for the current low-rise roof-purlin Components & Cladding path:

`p_external = qh(GCp)`

The solver does not yet subtract internal pressure and does not yet produce final design pressure.

## Applicability inherited from PR #127

- NSCP 2015 profile `ph-nscp-2015-v1-7e-2p`.
- Part 1 low-rise Components & Cladding path.
- Roof-purlin target.
- Enclosed or partially enclosed building only.
- `h <= 18 m`.
- Supported symmetric-gable Figure `207E.4-2B` / `207E.4-2C` geometry.
- No roof-overhang coefficient path.
- Open buildings remain outside this solver path.

## `qh` basis

The external-pressure record does not accept a new free-form velocity pressure.

It walks back through the exact accepted project context already carried by the PR #127 `GCp` record and recalculates mean-roof-height velocity pressure using the benchmarked PR #114 chain:

`qh = 0.613 Kz Kzt Kd V²`

with `Kd = 0.85` for the current building chain.

The accepted mean roof height in the pressure context must match the project-input velocity-pressure evaluation height. A mismatch is rejected instead of silently using one value.

## Sign convention

- Positive `GCp` → positive external pressure **toward the roof surface**.
- Negative `GCp` → negative external pressure **away from the roof surface (suction)**.

These are roof-surface-normal directions. They are deliberately not relabeled as global vertical “downward/uplift” in this solver because global direction depends on roof-plane geometry.

Every physical field/edge/corner intersection piece keeps its own coefficient and external pressure term. The solver never averages a multi-zone purlin into one coefficient or one fictitious zone.

## Independent benchmark

For the existing benchmark inputs:

- Exposure C
- `h = 8.82 m`
- `V = 240 kph`
- `Kzt = 1.0`

PR #114 gives:

- `Kz = 0.9748206328451855`
- `qh = 2.257467958862151 kPa`

For the 25° / 4.0 m² Figure 207E.4-2B coefficient benchmark from PR #127:

- positive all zones `GCp = +0.3731939868014326` → `p_external = +0.8424734676442587 kPa` toward surface;
- Zone 1 `GCp = -0.8365969934007164` → `-1.8885909070825277 kPa` away from surface;
- Zone 2 `GCp = -1.3829849670035819` → `-3.1220442505986155 kPa` away from surface;
- Zone 3 `GCp = -2.219581960404298` → `-5.0106351576811425 kPa` away from surface.

For the 30° / 4.8 m² Figure 207E.4-2C benchmark:

- positive `GCp = +0.8286788687959539` → `+1.8707159944929983 kPa`;
- Zone 1 negative `GCp = -0.8573577375919077` → `-1.9354576218962756 kPa`;
- Zones 2/3 negative `GCp = -1.0573577375919077` → `-2.3869512136687057 kPa`.

## Why the 0.77 kPa minimum is not applied here

NSCP 207E.2.2 establishes a minimum Components & Cladding **design pressure** of `0.77 kPa` acting in either direction normal to the surface. That is a net-design-pressure rule, not an external-coefficient or external-only-term rule.

This implementation therefore deliberately allows `|qh(GCp)| < 0.77 kPa` at this intermediate stage. A deterministic low-wind benchmark protects that boundary. The minimum will be applied only after external and internal pressure have been combined in the later net-pressure/design-envelope gate.

## Next gate

For the present `h <= 18 m` Part 1 path, the next pressure-combination layer will implement:

`p = qh[(GCp) - (GCpi)]`

with the internal velocity basis fixed to `qh` for this procedure. PR #121's Part 3 opening-height `qi=qz` option must not be silently imported into this low-rise path.

The combination layer will preserve both positive and negative `GCpi` cases, form governing toward-surface / away-from-surface raw envelopes, and only then apply the `0.77 kPa` minimum in both directions.

## Explicitly unresolved

This slice does **not**:

- subtract `qh(GCpi)`;
- use a Part 3 opening-height `qi=qz` option;
- apply the `0.77 kPa` minimum net pressure;
- form governing net pressure envelopes;
- create structural load combinations;
- route code pressure automatically into Roof Bay;
- resolve roof-sheet/fastener effective area or capacity;
- promote purlin capacity/design status.

Manual-uniform Roof Bay pressure remains active until the later pressure-combination and routing gates pass independent end-to-end benchmarks.

## Sources

- NSCP 2015 Section 207E.4.2 — Part 1 low-rise Components & Cladding pressure equation and use of `qh`.
- NSCP 2015 Figures 207E.4-2B / 207E.4-2C notes — `GCp` used with `qh`; positive/negative directions toward/away from the surface.
- NSCP 2015 Section 207E.2.2 — minimum `0.77 kPa` C&C design pressure, deliberately deferred to the net-pressure gate.
- Existing repository PR #114 velocity-pressure benchmark and PR #127 external roof `GCp` benchmark provide the independent numeric chain used by regression tests.
