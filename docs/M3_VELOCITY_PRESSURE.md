# M3 Velocity-Pressure Chain — NSCP 2015

Status date: 2026-08-22

This note records the first implemented code-equation slice of the FutolTech Roof Resilience Physics M3 wind engine. It is deliberately limited to the **building velocity-pressure chain**. It does **not** yet calculate external pressure coefficients, internal pressure, field/edge/corner roof zones, or final roof design pressures.

## Implemented equation

For the adopted Philippine profile, the implemented velocity-pressure expression is:

`qz = 0.613 Kz Kzt Kd V²`

with `V` in m/s and `qz` in Pa.

The implemented building directionality factor is `Kd = 0.85`. The velocity-pressure exposure coefficient is evaluated as:

- for `z >= 4.57 m`: `Kz = 2.01 (z / zg)^(2/alpha)`;
- for `z < 4.57 m`: the same expression is evaluated at `z = 4.57 m`.

The current solver supports Exposure B, C and D using the following constants from the NSCP terrain-exposure table used by the wind provisions:

| Exposure | alpha | zg (m) |
|---|---:|---:|
| B | 7.0 | 365.76 |
| C | 9.5 | 274.32 |
| D | 11.5 | 213.36 |

The solver intentionally rejects `z > zg` rather than extrapolating beyond the verified expression domain.

## Implemented boundary

The velocity-pressure solver accepts four numeric/classification inputs required directly by the equation chain:

1. evaluation height `z` or mean-roof height `h`, in metres;
2. Exposure B/C/D;
3. basic wind speed in kph, converted internally to m/s;
4. explicit topographic factor `Kzt`.

The wind-design-basis wrapper additionally requires source/provenance for site/location, occupancy/risk category, wind speed, exposure, topography and height before it will expose a velocity-pressure result. Occupancy/risk category and location are preserved because they justify the selected wind speed even though they do not multiply `qz` directly in this equation.

No automatic Philippine wind-map lookup is implemented in this slice. No automatic topographic-factor derivation is implemented. A numeric `Kzt` must be supplied with an explicit source/reference.

## Independent benchmark

The deterministic benchmark follows a publicly available NSCP 2015 directional-procedure worked example prepared for civil-engineering instruction:

- basic wind speed: `240 kph` = `66.6666667 m/s`;
- Exposure C;
- mean roof height: `8.82 m`;
- `Kzt = 1.0`;
- building `Kd = 0.85`.

Using full precision rather than rounding `Kz` early:

`Kz = 2.01 (8.82 / 274.32)^(2 / 9.5) = 0.974820633`

`qh = 0.613(0.974820633)(1.0)(0.85)(66.6666667²) = 2257.468 Pa = 2.257468 kPa`

The instructional example reports the rounded values `Kz ≈ 0.975` and `q ≈ 2.26 kPa`, which is consistent with the deterministic solver result.

## Public evidence used for this slice

1. **NSCP 2015 public mirror — code text cross-check only, not publisher-controlled distribution**  
   https://studylib.net/doc/27848536/nscp-2015  
   Used to cross-check Section 207B.3.1/207B.3.2, Table 207A.6-1, Table 207A.9-1 and the `0.613 Kz Kzt Kd V²` expression.

2. **Sevieri et al., UCL Discovery — Filipino roof vulnerability research**  
   https://discovery.ucl.ac.uk/id/eprint/10161616/1/Sevieri_et_al.pdf  
   Independently states that NSCP 2015 is consistent with ASCE 7-10 for the discussed wind provisions and gives `qh = 0.613 Kh Kzt Kd v²` for Filipino roof applications.

3. **New Era University instructional worked example — independent hand benchmark**  
   https://pdfcoffee.com/part-3-calculation-of-wind-loads-for-buildings-using-directional-procedure-pdf-free.html  
   Provides the 8.82 m / Exposure C / 240 kph / Kzt 1.0 worked path, including rounded `Kz ≈ 0.975` and `q ≈ 2.26 kPa`.

4. **ASEP publisher context and DPWH project reference**  
   Already recorded in `src/data/windCodeProfiles.js` and `docs/M3_WIND_DESIGN_BASIS.md` for adopted-code identity/provenance.

## Permanent non-promotion rules

- A verified velocity pressure is **not** a final roof pressure.
- `Kzt = 1.0` is not assumed silently for project work; it must come from an explicit project/code basis.
- The program does not infer a wind speed from location until a source-backed map/lookup layer is implemented.
- Pressure coefficients, enclosure/internal pressure, effective wind area, field/edge/corner zoning and load combinations remain `UNIMPLEMENTED` in this slice.
- Roof Bay keeps the manual uniform-pressure path active until the full code pressure/zoning chain is independently verified.
