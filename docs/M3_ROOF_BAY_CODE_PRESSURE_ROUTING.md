# M3 Roof Bay Code-Pressure Routing

Status: implementation candidate for the next Roof Resilience Physics M3 slice.

## Purpose

This slice takes the already verified low-rise Part 1 roof-purlin C&C net-design pressure records and routes them through the **actual Roof Bay geometry** without reverting to one convenient uniform pressure or an assumed 50/50 rafter split.

Schema: `futoltech.wind-roof-bay-code-pressure-routing/1`.

## Inputs

The router requires exactly one `futoltech.wind-roof-net-pressure/1` record for **every physical purlin tributary band** in one resolved Roof Bay. All supplied records must reference the exact same `futoltech.wind-roof-zone-geometry/1` record.

The selected routing direction is explicit:

- `toward-surface` — positive normal design pressure,
- `away-from-surface` — negative normal design pressure / suction.

This is a directional design-envelope routing record. Strength/service load combinations are not created in this slice.

## Physical routing

For every purlin tributary-band zone piece:

1. Recover the exact intersection rectangle from the stored whole-roof zone cell and the stored physical tributary-band rectangle.
2. Select the corresponding field/edge/corner directional **design pressure** from the verified net-pressure record.
3. Preserve the governing raw external/internal case identity (`GCp`, `GCpi`, `qh`, raw net pressure and case ID).
4. Convert pressure to force using the actual physical area:

   `F = p × A`

5. Convert the same pressure over the piece tributary width into a piecewise purlin line load:

   `w = p × tributary width`

6. Locate the resultant at the true spanwise centroid of the physical rectangle.
7. Resolve simply-supported Rafter A/B reactions from statics:

   `RB = F x̄ / L`

   `RA = F - RB`

No equal reaction split is assumed unless the physical loading actually produces one.

## Conservation gates

Every purlin and the full Roof Bay must independently satisfy:

- zone-piece area sum = physical tributary/load-application area,
- `RA + RB = applied normal force`,
- `RB × L = Σ(F × x̄)` about Rafter A,
- complete Roof Bay routed area = resolved Roof Bay area.

All checks are signed. Positive acts toward the roof surface; negative acts away from the roof surface. Roof-downslope wind is zero in this routing slice.

## Deterministic benchmark

The regression case uses the established 25° symmetric-gable geometry, 4.0 m rafter spacing, Roof Bay registered from ridge-parallel x = 0.4 m to 4.4 m, Exposure C, `h = 8.82 m`, `V = 240 kph`, `Kzt = 1.0`, enclosed building, and two physical purlin tributary bands.

The bay intersects the left gable-end strip. Under the governing away-from-surface design envelope, that makes the suction distribution asymmetric along the purlin span and therefore the rafter reactions are intentionally unequal:

- total code-wind normal force: `-46.769510965040396 kN`,
- Rafter A: `-24.4711529728144 kN`,
- Rafter B: `-22.298357992225995 kN`,
- applied moment about Rafter A: `-89.19343196890398 kN·m`,
- reaction moment about Rafter A: `-89.19343196890398 kN·m`.

A low-wind regression also verifies that once the net-pressure layer applies the ±0.77 kPa minimum, the router uses the **design** pressure rather than the smaller unfloored raw pressure. When every piece is governed by `-0.77 kPa`, total routed force is exactly `-0.77 × Roof Bay area` and the symmetric uniform pressure produces equal Rafter A/B reactions.

## Strict boundary

This slice does **not**:

- generate strength or service load combinations,
- replace the currently live manual-uniform Roof Bay UI path,
- solve purlin moment/stress/deflection under the new piecewise code-pressure loading,
- rate purlin capacity,
- rate rafters/trusses or connections,
- resolve roof-sheet or fastener effective wind area/capacity,
- claim the M3 exit gate is complete.

The next gate after this routing foundation is an explicit code-wind load-case / combination identity layer and then controlled Roof Bay UI/project activation only after end-to-end regression remains green.
