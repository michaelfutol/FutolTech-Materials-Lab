# M3 External Roof `GCp` — Purlin C&C Foundation

Status: implementation candidate for PR #125. It is not milestone-complete until the preliminary implementation head is green, all four project source-of-truth records are synchronized, and the documentation-updated exact final head passes the complete Engineering Checks suite.

## Purpose

This slice resolves only the **external pressure coefficient `GCp`** for the currently supported roof-purlin Components & Cladding target.

It consumes two already-verified M3 inputs together:

1. PR #123 `futoltech.wind-roof-purlin-effective-area/1` — the purlin's coefficient-selection effective wind area, kept separate from physical tributary/load area; and
2. PR #124 `futoltech.wind-roof-zone-geometry/1` — exact field/edge/corner areas for the selected physical purlin tributary band.

A purlin band crossing more than one zone receives a separate coefficient case for every zone portion. The software does not assign one convenient whole-member zone.

## Initial supported scope

- Code profile: `ph-nscp-2015-v1-7e-2p`.
- Procedure: Components & Cladding.
- Target: roof purlin.
- Roof: explicitly confirmed symmetric gable.
- Mean roof height: `h <= 18 m`.
- Roof slopes already supported by PR #124:
  - Figure `207E.4-2B`: `7° < theta <= 27°`;
  - Figure `207E.4-2C`: `27° < theta <= 45°`.
- Roof-overhang coefficient cases are not supported in this slice.

## Curve evaluation

The NSCP figures use effective wind area on a logarithmic axis. The implemented interpolation is cross-checked against the corresponding ASCE 7-10 Wind Loads Guide equation tables for Figures 30.4-2B and 30.4-2C.

The purlin effective area is stored in square metres, then converted to square feet solely to evaluate those published equation forms. The underlying physical tributary area is never converted into or replaced by the coefficient-selection area.

For curve evaluation:

- effective area at or below `10 ft²` uses the low-area graph plateau;
- `10 ft² < A < 100 ft²` uses the applicable `log10(A)` equation;
- effective area at or above `100 ft²` uses the high-area graph plateau.

Both maximum positive and maximum negative external coefficients remain explicit.

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

## Explicitly unresolved

This slice does **not**:

- multiply `GCp` by `qh`;
- calculate an external pressure term;
- combine external and internal pressure;
- create wind load combinations;
- resolve roof-sheet effective area;
- resolve fastener effective area;
- rate purlin capacity;
- activate code-derived pressure in Roof Bay.

Manual-uniform Roof Bay wind pressure therefore remains the active pressure path until the later pressure-chain gates are independently benchmarked and accepted.

## Sources

- NSCP 2015 Volume 1, 7th Edition, Figures 207E.4-2B and 207E.4-2C — applicability, zones and external roof `GCp` curves. Verify against an authorized copy before project use.
- *Wind Loads: Guide to the Wind Load Provisions of ASCE 7-10*, Tables G2-3 and G2-4 — equation cross-check for the logarithmic graph segments corresponding to ASCE Figures 30.4-2B and 30.4-2C.
