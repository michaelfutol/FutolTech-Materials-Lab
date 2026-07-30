# Material Sources

## COC-001 — Coconut wood experimental baseline

**Bibliographic record**

Aaron Erickson and Ian N. Robertson. *Structural Properties of Coconut Wood*. University of Hawaiʻi, College of Engineering, Department of Civil and Environmental Engineering. Research Report UHM/CEE/07-02. April 2007.

**Values currently stored**

| Property | Stored value | Basis |
|---|---:|---|
| Wet density | 910 kg/m³ | Average of full-scale rectangular beam specimens |
| Modulus of elasticity | 13.1 GPa | Average of full-scale rectangular beam specimens |
| Maximum bending stress | 72.9 MPa | Average of full-scale rectangular beam specimens |
| Proposed safe allowable bending stress | 15.4 MPa | Report recommendation, converted from 2,230 psi |
| Compression parallel reference | 46.2 MPa | Approximate reported average of short round-log compression specimens |

**Limitations carried into the software**

- The compression tests used approximately 8-inch-diameter round specimens about 11 inches long; the result is not a sawn 2×4 compression design value.
- The full-scale rectangular-member tests were conducted similarly to ASTM D198, but the report states that the standard was not followed strictly.
- Some full-scale tests lacked complete moisture-content, density, temperature or humidity records.
- Coconut wood is strongly non-uniform through the stem and over its height. Density, moisture, processing, treatment and specimen location must eventually become explicit model variables.
- The dataset is a research baseline, not a universal Philippine coconut-lumber grade.

**Software status**

`published / medium confidence / research comparison only`

## STEEL-BASELINE-001 — Generic rectangular hollow section steel

The initial 250 MPa and 345 MPa steel datasets are sensitivity baselines only. They are not tied to a named manufacturer, product standard or mill certificate.

Before a steel result can be promoted beyond low-confidence comparison, the record must include:

- base-steel grade and governing product standard
- measured outside dimensions and wall thickness
- corner radii
- mass per metre
- yield and tensile strength
- weld-seam information
- galvanised coating specification
- geometric tolerances and known imperfections

“GI” describes galvanised coating and does not establish the strength grade of the underlying steel.
