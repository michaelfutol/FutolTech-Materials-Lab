# M3 External Roof `GCp` — Purlin C&C Foundation

Status: completion candidate on PR #127, the clean current-`main` successor to PR #125 after the FutolTech Engineering Mode merge. All four project source-of-truth records are synchronized; this exact final implementation/documentation head must pass the complete Engineering Checks suite before merge.

## Purpose

This slice resolves only the **external pressure coefficient `GCp`** for the currently supported roof-purlin Components & Cladding target.

It consumes two already-verified M3 inputs together:

1. PR #123 `futoltech.wind-roof-purlin-effective-area/1` — the purlin's coefficient-selection effective wind area, kept separate from physical tributary/load area; and
2. PR #124 `futoltech.wind-roof-zone-geometry/1` — exact field/edge/corner areas for the selected physical purlin tributary band.

A purlin band crossing more than one zone receives a separate coefficient case for every zone portion. The software does not assign one convenient whole-member zone.

## Initial supported scope

- Code profile: `ph-nscp-2015-v1-7e-2p`.
- Procedure: Part 1 low-rise Components & Cladding.
- Target: roof purlin.
- Building enclosure: **enclosed or partially enclosed only**.
- Open buildings are rejected from this solver path and require the separate open-building Components & Cladding procedure.
- Roof: explicitly confirmed symmetric gable.
- Mean roof height: `h <= 18 m`.
- Roof slopes already supported by PR #124:
  - Figure `207E.4-2B`: `7° < theta <= 27°`;
  - Figure `207E.4-2C`: `27° < theta <= 45°`.
- Roof-overhang coefficient cases are not supported in this slice.

The enclosure restriction is deterministic: the exact accepted pressure-context classification is carried into the `GCp` record and `open` is rejected before coefficient selection.

## Curve evaluation

The NSCP figures use effective wind area on a logarithmic axis. The implemented interpolation is cross-checked against the corresponding ASCE 7-10 Wind Loads Guide equation tables for Figures 30.4-2B and 30.4-2C.

The purlin effective area is stored in square metres, then converted to square feet solely to evaluate those published equation forms. The underlying physical tributary area is never converted into or replaced by the coefficient-selection area.

For curve evaluation:

- effective area at or below `10 ft²` uses the low-area graph plateau;
- `10 ft² < A < 100 ft²` uses the applicable `log10(A)` equation;
- effective area at or above `100 ft²` uses the high-area graph plateau.

Both maximum positive and maximum negative external coefficients remain explicit. Positive `GCp` denotes pressure toward the roof surface; negative `GCp` denotes pressure away from the surface (suction). The figure scale is used with `qh` in the current low-rise path.

### Figure 207E.4-2B / ASCE 30.4-2B cross-check

For the interpolation region `10 < A < 100 ft²`:

- positive, Zones 1/2/3: `GCp = 0.7 - 0.2 log10(A)`;
- negative Zone 1: `GCp = -1.0 + 0.1 log10(A)`;
- negative Zone 2: `GCp = -2.2 + 0.5 log10(A)`;
- negative Zone 3: `GCp = -3.2 + 0.6 log10(A)`.

### Figure 207E.4-2C / ASCE 30.4-2C cross-check

For the interpolation region `10 < A < 100 ft²`:

- positive, Zones 1/2/3: `GCp = 1.0 - 0.1 log10(A)`;
- negative Zone 1: `GCp = -1.2 + 0.2 log10(A)`;
- negative Zones 2/3: `GCp = -1.4 + 0.2 log10(A)`.

The stored record also carries the exact figure/source references used for project acceptance. Authorized-code-copy verification remains required before project use.

## Deterministic benchmarks

For a 25° roof under Figure 207E.4-2B and a purlin effective area of `4.0 m²` (`43.0556416668 ft²`):

- positive Zones 1/2/3: `+0.3731939868`;
- negative Zone 1: `-0.8365969934`;
- negative Zone 2: `-1.3829849670`;
- negative Zone 3: `-2.2195819604`.

For a 30° roof under Figure 207E.4-2C and a `4.8 m²` effective-area benchmark:

- positive Zones 1/2/3: `+0.8286788688`;
- negative Zone 1: `-0.8573577376`;
- negative Zones 2/3: `-1.0573577376`.

The deterministic suite also verifies that partially enclosed buildings remain accepted while an open-building pressure context is rejected from this Part 1 figure path.

## Pressure-chain boundary after this slice

This record is still **coefficient-only**.

The next gate will calculate the external-only term:

`p_external = qh(GCp)`

for every resolved positive/negative zone-intersection case.

Only after that external term is independently benchmarked may the present low-rise Part 1 path form net pressure using:

`p = qh[(GCp) - (GCpi)]`.

The Part 3 higher-building option that can use opening-height `qi=qz` is not automatically applicable to this current `h <= 18 m` path; the low-rise combination gate will require the internal velocity basis to be `qh`.

The NSCP minimum Components & Cladding design pressure of `0.77 kPa` acting in either direction normal to the surface is also a **net design-pressure requirement**. It is intentionally not applied to `GCp` or to the external-only `qh(GCp)` term; it will be enforced at the later net-pressure/design-envelope gate.

## Explicitly unresolved

This slice does **not**:

- multiply `GCp` by `qh`;
- calculate an external pressure term;
- combine external and internal pressure;
- apply the `0.77 kPa` minimum net Components & Cladding pressure;
- create wind load combinations;
- resolve roof-sheet effective area;
- resolve fastener effective area;
- rate purlin capacity;
- activate code-derived pressure in Roof Bay.

Manual-uniform Roof Bay wind pressure therefore remains the active pressure path until the later pressure-chain gates are independently benchmarked and accepted.

## Sources

- NSCP 2015 Volume 1, 7th Edition, Part 1 / Section 207E.4 and Figures 207E.4-2B and 207E.4-2C — low-rise enclosed/partially-enclosed C&C applicability, use of `GCp` with `qh`, zones and external roof coefficient curves. Verify against an authorized copy before project use.
- NSCP 2015 Section 207E.2.2 — minimum Components & Cladding net design pressure of `0.77 kPa` in either direction normal to the surface; deliberately reserved for the later net-pressure gate.
- NSCP 2015 Part 3 / Section 207E.6 — separate higher-building pressure procedure and opening-height internal-velocity option; not silently imported into this Part 1 path.
- *Wind Loads: Guide to the Wind Load Provisions of ASCE 7-10*, Tables G2-3 and G2-4 — equation cross-check for the logarithmic graph segments corresponding to ASCE Figures 30.4-2B and 30.4-2C.
