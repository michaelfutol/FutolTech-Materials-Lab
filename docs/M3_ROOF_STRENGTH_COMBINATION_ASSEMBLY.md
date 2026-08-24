# M3 Roof Strength Combination Assembly

## Scope

This slice adds a versioned action-result assembly layer for the supported NSCP 2015 Section 203.3.1 roof-purlin wind combinations after PR #131 wind-action identity and PR #132 companion-action acceptance/routing.

Schema: `futoltech.wind-roof-strength-combination-assembly/1`

The layer consumes the exact accepted `futoltech.wind-roof-companion-actions/1` record. It does not recompute `qh`, `GCp`, `GCpi`, net pressure, wind routing, D, Lr, purlin self-weight, L, or H.

## Supported strength templates

- 203-3 wind branch: `1.2D + 1.6(Lr or R) + 0.5W`
- 203-4: `1.2D + 1.0W + f1L + 0.5(Lr or R)`
- 203-6: `0.9D + 1.0W + 1.6H`

The current roof-purlin companion record has:

- accepted/routed D,
- accepted/routed Lr,
- L explicitly target-specific zero/not-applicable,
- H explicitly target-specific zero/not-applicable,
- R unresolved,
- f1 not numerically required while L is exactly zero.

## Lr-or-R hard gate

Two resolution states are supported.

### `unresolved`

R remains unresolved. The engine does **not** assume R=0, does not assume Lr governs, and does not add Lr and R together.

Result:

- both 203-3 wind-direction cases remain blocked,
- both 203-4 wind-direction cases remain blocked,
- both 203-6 wind-direction cases are complete because D and W are accepted and H is an explicit zero/not-applicable decision.

### `lr-selected-r-not-applicable`

This state requires all of the following:

- `engineerConfirmedRainNotApplicable=true`,
- a non-empty decision source reference,
- a non-empty rationale.

Only then may the accepted Lr action release the 203-3 and 203-4 Lr alternatives. The record does not claim that R was calculated or compared.

A future implemented R action must preserve separate Lr and R alternatives until the governing structural effect is selected from actual evaluated cases.

## Physical assembly

Each complete case preserves:

- the signed W direction and W case ID,
- every physical field/edge/corner wind piece,
- the exact D/Lr physical piece geometry,
- the wind governing raw pressure-case identity,
- D purlin self-weight as a separate trace inside D,
- purlin-level combined action results,
- Roof Bay total normal/down-slope forces,
- Rafter A/B normal/down-slope reactions,
- normal/down-slope moment about Rafter A.

Combination factors are applied only downstream of accepted action physics.

## Conservation gate

Every complete case checks:

1. roof-normal applied force = Rafter A normal + Rafter B normal,
2. roof-down-slope applied force = Rafter A parallel + Rafter B parallel,
3. roof-normal moment about Rafter A = Rafter B normal reaction × bay span,
4. roof-down-slope moment about Rafter A = Rafter B parallel reaction × bay span,
5. summed purlin normal force = Roof Bay normal force,
6. summed purlin parallel force = Roof Bay parallel force.

Any failed conservation check rejects the assembled result.

## Independent 25° benchmark

Benchmark companion actions:

- D roof-area load = `0.20 kPa`,
- purlin self-weight = `0.05 kN/m` for each of two benchmark purlins,
- Lr = `0.75 kPa`,
- W toward = `+19.79058581298942 kN` roof-normal,
- W away = `-46.769510965040396 kN` roof-normal.

Expected complete-case totals when the benchmark explicitly selects the Lr path:

- 203-3 toward: `+33.370320644272304 kN` normal, `+10.946585209526702 kN` down-slope,
- 203-3 away: `+0.09027225525739624 kN` normal, `+10.946585209526702 kN` down-slope,
- 203-4 toward: `+30.06561355076701 kN` normal, `+4.791324121880722 kN` down-slope,
- 203-4 away: `-36.494483227262805 kN` normal, `+4.791324121880722 kN` down-slope,
- 203-6 toward: `+22.996856616322614 kN` normal, `+1.4951086297130478 kN` down-slope,
- 203-6 away: `-43.5632401617072 kN` normal, `+1.4951086297130478 kN` down-slope.

## Public-source discrepancy and code boundary

Public Philippine government documents are not perfectly consistent in transcription of 203-3. Multiple recent DPWH structural plan sets show `1.6(Lr or R)`, consistent with the existing PR #131 source contract. One public BIR structural calculation shows `1.6(Lr + R)`.

Because those public project documents are cross-checks rather than the governing code text, the schema permanently records `authorizedCopyReviewRequired=true`. Project use must verify the exact equation against an authorized NSCP 2015 Volume 1, 7th Edition, 2nd Printing copy.

## Explicitly not implemented

- rain action R calculation,
- automatic governing Lr-or-R selection,
- ASD/service combinations,
- live code-derived Roof Bay UI activation,
- piecewise purlin stress/deflection response,
- purlin capacity promotion,
- connection/fastener/roof-sheet capacity.
