# M4 Roof Fastener Basis-Compatible Utilization

## Scope

This slice introduces the first individual roof-sheet fastener demand/capacity utilization layer. It consumes only already-verified M4 screw demand from `futoltech.roof-fastener-code-pressure-demand-routing/1` and already-accepted attachment/capacity evidence from `futoltech.roof-fastener-capacity-evidence/1`.

The new record is `futoltech.roof-fastener-capacity-utilization/1`.

## Implemented path

`verified M3 roof C&C pressure pieces -> accepted M4 screw tributary rectangles -> individual away-from-surface screw demand -> eligibility gate -> pull-out/pull-over utilization`

For an eligible mechanism:

`utilization = |individual screw away-from-surface normal demand| / accepted single-fastener LRFD design capacity`

The sign of the upstream demand remains traceable. The utilization calculation uses the magnitude only after confirming the selected route is the `away-from-surface` uplift direction.

## Three mandatory eligibility gates

A numerical capacity stored by PR #138 does **not** automatically become usable for one-screw utilization. Every mechanism must satisfy all three gates:

1. **Applicability complete** — the PR #138 evidence applicability must fully cover the exact accepted roof-sheet / fastener / purlin attachment detail.
2. **Capacity scope source-accepted as `single-fastener`** — kN values are never assumed to represent one screw. Assembly, panel, group, or unspecified scope is not eligible for this v1 individual-screw comparison.
3. **Demand/capacity basis compatible** — this v1 path accepts only an explicitly source-referenced LRFD demand basis compared with evidence whose `capacityType=design` and `designBasis=lrfd`.

Missing any gate produces a visible blocked/incomplete state and no utilization for that mechanism.

## Basis boundary

This v1 slice performs **no** conversion of:

- ASD allowable capacity to LRFD design capacity;
- nominal capacity to design capacity;
- manufacturer-rated values to another design basis;
- laboratory/test ultimate reference to design resistance.

Those values remain useful evidence records but cannot be divided into the current LRFD demand by convenience.

## Capacity-scope boundary

PR #138 intentionally archives evidence without inferring whether a published kN value represents one fastener, a group, or a tested panel/assembly. This slice therefore adds a separate source-referenced `capacityScopeAcceptance` and requires `scope=single-fastener` before individual screw utilization is allowed.

## Local result states

For away-from-surface uplift:

- each eligible pull-out/pull-over mechanism receives a utilization ratio;
- a mechanism is `PASS` at utilization <= 1.0 and `FAIL` above 1.0 within numerical tolerance;
- an individual screw earns local connection `PASS` or `FAIL` only when **both** pull-out and pull-over are eligible;
- otherwise the screw remains `INCOMPLETE` even if one mechanism has a numerical utilization;
- the Roof Bay summary may identify the governing individual screw/mechanism but **`roofSystemPass` remains null**.

## Explicitly unresolved

This slice does not implement:

- toward-surface compression/bearing capacity;
- fastener tension/shear interaction;
- fastener group action or load redistribution after local failure;
- roof-sheet structural capacity / local tearing / bearing;
- purlin local connection failure;
- purlin-to-rafter cleat / bolt / weld capacity;
- roof-system PASS promotion.

The toward-surface route remains visible as `UNRESOLVED_COMPRESSION_BEARING_PATH`.

## Test data boundary

All capacity numbers used in deterministic regression tests are synthetic fixtures only. They are not manufacturer, project, code, or laboratory production values and must never populate a design catalog.

## Next dependency

After this slice is accepted and merged, M4 still requires the remaining modeled connection/load-path checks required by the roadmap, including source-backed roof-sheet/bearing behavior and purlin-to-rafter connection demand/capacity. No roof-system PASS is permitted while those remain unresolved.
