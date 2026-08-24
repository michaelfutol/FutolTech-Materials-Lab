# M3 Roof Wind Load-Case / Strength-Combination Identity

Status: implementation candidate for the next Roof Resilience Physics M3 slice.

## Purpose

This slice sits downstream of the verified code-pressure routing record. Its job is to give the signed wind action an explicit load-case identity and to represent the supported NSCP 2015 strength/LRFD wind-bearing combination templates **without pretending the companion gravity/live/rain/hydro actions have already been resolved**.

Schema: `futoltech.wind-roof-load-case-combination/1`.

## Wind load cases

The solver requires the two verified PR #130 routing records for the exact same Roof Bay geometry and exact same upstream net-pressure record set:

- `W-CNC-ROOF-TOWARD` — positive/toward-surface code-wind action,
- `W-CNC-ROOF-AWAY` — negative/away-from-surface code-wind action / suction.

Each W case retains:

- complete upstream routing provenance,
- total signed wind force,
- Rafter A/B reactions,
- applied moment,
- each purlin contribution,
- every physical field/edge/corner piece,
- each piece's governing raw `GCp`, `GCpi`, `qh`, raw net-pressure and case identity.

Toward and away cases are never collapsed into one unsigned wind magnitude.

## NSCP strength/LRFD templates

Source boundary: NSCP 2015 Section 203.3.1, with authorized-code-copy review required for project use. Public Philippine structural-calculation references are retained only as cross-checks, not as a substitute for the authorized code.

The initial supported wind-bearing strength templates are:

### `NSCP-203-3-W`

Wind-bearing alternative of Equation 203-3:

`1.2D + 1.6(Lr or R) + 0.5W`

This explicitly selects the `0.5W` branch of `(f1L or 0.5W)`. The mutually exclusive `f1L` branch is not added simultaneously.

Wind factor implemented: **0.5**.

Required companion actions still unresolved here:

- `D`,
- `Lr or R`.

### `NSCP-203-4`

`1.2D + 1.0W + f1L + 0.5(Lr or R)`

Wind factor implemented: **1.0**.

Required companion actions still unresolved here:

- `D`,
- `L`,
- `Lr or R`,
- code/project resolution of `f1`.

### `NSCP-203-6`

`0.9D + 1.0W + 1.6H`

Wind factor implemented: **1.0**.

Required companion actions still unresolved here:

- `D`,
- `H`.

## What is calculated

For every template × wind-direction pair, the solver calculates only the **W contribution**:

- signed wind force,
- Rafter A/B wind reactions,
- wind moment,
- purlin wind contributions,
- every physical zone-piece pressure/force contribution.

For a source wind quantity `QW`, the stored contribution is:

`QW,combination = gammaW × QW`

where `gammaW` is the template's verified wind factor.

The source code-derived design pressure is preserved separately from the factored combination contribution. The pressure derivation chain (`qh`, `GCp`, `GCpi`, net pressure and the ±0.77 kPa minimum where governing) is never recalculated or altered by the combination factor.

## Deterministic benchmark

Using the verified PR #130 25° Roof Bay benchmark:

### Base W actions

Toward-surface:

- total W force = `+19.79058581298942 kN`.

Away-from-surface:

- total W force = `-46.769510965040396 kN`,
- Rafter A = `-24.4711529728144 kN`,
- Rafter B = `-22.298357992225995 kN`,
- moment about Rafter A = `-89.19343196890398 kN·m`.

### Equation 203-3 wind contribution (`0.5W`)

Away-from-surface:

- total wind contribution = `-23.384755482520198 kN`,
- Rafter A wind contribution = `-12.2355764864072 kN`,
- Rafter B wind contribution = `-11.149178996112997 kN`,
- moment contribution about Rafter A = `-44.59671598445199 kN·m`.

### Equations 203-4 / 203-6 wind contribution (`1.0W`)

The signed wind contribution remains exactly the verified base W action because the wind factor is `1.0`.

Every physical piece retains its original design pressure and governing raw-case identity while the separate combination W contribution is scaled by the template factor.

## Strict boundary

This slice does **not**:

- calculate a complete strength combination result,
- assume unresolved `D`, `L`, `Lr`, `R`, `H` actions are zero,
- automatically resolve `f1`,
- implement allowable-stress/ASD combinations,
- route or classify the existing Roof Bay gravity terms as code `D`, `Lr`, `R`, or `H` without a separate source-backed bridge,
- replace the live manual-uniform Roof Bay UI mode,
- activate the code-derived route in project/UI state,
- solve piecewise purlin stress/deflection,
- promote purlin, rafter or connection capacity.

Every generated strength-template case therefore keeps:

`fullCombinationResult = null`

and status:

`WIND_CONTRIBUTION_ONLY_COMPANION_ACTIONS_UNRESOLVED`.

## Next dependency

Before a complete strength combination can be calculated, the project needs a source-backed companion-action acceptance/classification bridge for the applicable `D`, `L`, `Lr`, `R`, `H` and `f1` terms. Only after those actions are explicit should complete combination evaluation and controlled code-derived Roof Bay activation proceed.
