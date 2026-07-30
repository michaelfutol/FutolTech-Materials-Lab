# Philippine Steel Market Library

FutolNative Structures maintains a source-backed catalog of steel sections confirmed in the Philippine market.

## Data status

Every catalog entry must carry:

- product family and shape;
- standard and edition claimed by the source;
- nominal designation;
- actual dimensions used for analysis;
- calculated and/or published mass per metre;
- source organization and access date;
- market status: confirmed catalog, quoted/on-request, or standard-only;
- analysis status: ready, provisional, or blocked pending properties;
- stock-length evidence where available;
- grade confidence and certificate requirement.

## Initial official pipe source

Supreme Steel Pipe Corporation publishes Philippine-market ERW BI/GI dimensions under PNS 26:2018 and ASTM A53. The first analysis-ready catalog includes:

- PNS 26:2018 light-gauge BI/GI pipe, nominal 15–300 mm;
- PNS 26:2018 heavy-gauge / Schedule 40 BI/GI pipe, nominal 15–300 mm;
- ASTM A53 heavy-gauge BI/GI pipe, nominal 350–800 mm.

BI and GI are finish/procurement choices, not steel grades. The same geometry may be offered in both finishes. Structural analysis still requires the selected material/grade dataset and, for design use, a verified product standard or mill certificate.

## Wide flange / I / H sections

Philippine suppliers advertise W-series, I-beam, H-beam, metric wide-flange sections, and commonly 6 m / 12 m lengths. A section is not analysis-ready until a controlled source provides all required properties or sufficient exact geometry to calculate them:

- area A;
- Ix and Iy;
- Zx and Zy;
- overall depth and width;
- web and flange thicknesses;
- mass per metre;
- applicable section standard and grade.

Availability evidence and section-property evidence may come from different controlled sources, but both must be recorded. No section will enter the optimizer from a marketing designation alone.

## Optimization rule

Market availability narrows the candidate set. It does not prove adequacy. Every candidate selected by the classical or future QUBO optimizer must be rechecked by the deterministic structural solver, including governing stability and connection checks when those modules are available.
