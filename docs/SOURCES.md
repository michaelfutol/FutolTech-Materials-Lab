# Material and Product Sources

This register separates four different kinds of evidence:

1. **material-property source** — stiffness, strength, density or permissible values;
2. **section-property source** — dimensions, mass, area, inertia and section modulus;
3. **market-status source** — evidence that a product family is sold or catalogued in the Philippines;
4. **identity / legality source** — botanical, trade-group, harvesting and transport context.

A source in one category does not automatically satisfy another. A manufacturer pipe table, for example, does not establish the steel yield strength unless the governing product grade or mill certificate is also known.

## COC-001 — Coconut wood experimental baseline

**Bibliographic record**

Aaron Erickson and Ian N. Robertson. *Structural Properties of Coconut Wood*. University of Hawaiʻi, College of Engineering, Department of Civil and Environmental Engineering. Research Report UHM/CEE/07-02. April 2007.

**Values currently stored**

| Property | Stored value | Basis |
|---|---:|---|
| Density | 910 kg/m³ | Average of full-scale rectangular beam specimens |
| Modulus of elasticity | 13.1 GPa | Average of full-scale rectangular beam specimens |
| Maximum bending stress | 72.9 MPa | Average of full-scale rectangular beam specimens |
| Proposed safe allowable bending stress | 15.4 MPa | Report recommendation, converted from 2,230 psi |
| Compression parallel reference | 46.2 MPa | Approximate reported average of short round-log compression specimens |

**Limitations carried into the software**

- The compression tests used approximately 8-inch-diameter round specimens about 11 inches long; the result is not a sawn 2×4 compression design value.
- The full-scale rectangular-member tests were conducted similarly to ASTM D198, but the report states that the standard was not followed strictly.
- Some full-scale tests lacked complete moisture-content, density, temperature or humidity records.
- Coconut wood is strongly non-uniform through the stem and over its height.
- The dataset is a research baseline, not a universal Philippine coconut-lumber grade.

**Software status**

`published / medium confidence / research comparison only`

## PH-WOOD-2025 — Five Philippine wood research averages

**Bibliographic record stored in the app**

Marasigan, Daguinod and Villareal. *Physico-Mechanical Properties of Two Native Tree Species in the Philippines and Their Potential as Alternatives to Exotic Industrial Tree Plantation Species*. Environment and Natural Resources Journal, volume 23, issue 4, 2025.

**Datasets currently stored**

- Bagalunga (*Melia azedarach*)
- Falcata (*Falcataria falcata*)
- Gmelina (*Gmelina arborea*)
- Kalumpit (*Terminalia microcarpa*)
- Big-leaf mahogany (*Swietenia macrophylla*)

The app stores the published research averages for density proxy, modulus of elasticity, stress at proportional limit, modulus of rupture and compression parallel to grain.

**Limitations carried into the software**

- ASTM D143 small-clear-specimen averages at 12% moisture content are not graded structural-lumber design values.
- Stress at proportional limit is used only as an elastic comparison reference, not a code allowable.
- Defects, member size, moisture, treatment, load duration and reliability adjustments remain required.
- The big-leaf mahogany dataset must not be applied to lumber sold only under the ambiguous trade term “Philippine mahogany.”

**Software status**

`published research average / research-only comparison`

## BAMBOO-BLUM-2018 — Kawayan-tinik full-culm baseline

**Bibliographic record**

C. Salzer, H. Wallbaum, M. A. Alipon and L. F. Lopez. “Determining Material Suitability for Low-Rise Housing in the Philippines: Physical and Mechanical Properties of the Bamboo Species *Bambusa blumeana*.” *BioResources* 13(1), 2018.

**Values currently stored**

| Property | Stored value | Software use |
|---|---:|---|
| Mean modulus of elasticity | 13.1 GPa | Mean-stiffness case |
| Reported minimum modulus | 7.4 GPa | Conservative sensitivity case |
| Density | 570 kg/m³ | Estimated culm mass |
| Suggested permissible bending | 7.7 MPa | First comparison limit |
| Characteristic bending | 34.6 MPa | Physical-threshold estimate |
| Compression parallel | 8.0 MPa | Stored research reference |
| Shear parallel | 1.1 MPa | Stored for future checks |
| Tension parallel | 21 MPa | Stored for future checks |

The app also stores study-mean butt, middle and top outside diameters and wall thicknesses as convenience geometry. BC-001 permits replacement with actual measurements.

**Limitations carried into the software**

- Values apply to quality-controlled mature *Bambusa blumeana* and the study’s building-method assumptions.
- Every actual culm requires measurement and quality control.
- Taper, nodes, ovality, crookedness, moisture, treatment, durability, splitting and connection behavior remain separate checks.

**Software status**

`peer-reviewed Philippine full-culm study / elastic comparison`

## STEEL-MAT-001 — Product-neutral steel sensitivity datasets

The provisional 250 MPa and 345 MPa records are not tied to one pipe, SHS/RHS or rolled shape. They exist for sensitivity comparisons.

Before a steel material record can be promoted beyond low-confidence comparison, it must include:

- base-steel grade and governing product standard;
- measured dimensions and thickness;
- yield and tensile strength;
- geometric tolerances;
- manufacturing and weld-seam information where applicable;
- coating specification where applicable;
- mill or product certificate.

“GI” describes galvanised coating and does not establish the strength grade of the underlying steel.

## PH-PIPE-001 — Philippine BI/GI steel-pipe geometry library

**Source**

Supreme Steel Pipe Corporation official manufacturer product tables for:

- PNS 26:2018 light-gauge ERW BI/GI pipe;
- PNS 26:2018 heavy-gauge / Schedule 40 ERW BI/GI pipe;
- ASTM A53/A53M heavy-gauge ERW BI/GI pipe.

**Values stored per pipe record**

- nominal designation;
- actual outside diameter;
- nominal wall thickness;
- published mass per metre;
- BI/GI finish options;
- source and market-status labels.

**Analysis rule**

- nominal outside diameter and wall thickness generate gross elastic section properties;
- published mass per metre is used for mass ranking when available;
- the provisional steel material record remains separate from the pipe geometry;
- exact product standard, grade, thickness tolerance and certificate remain required.

**Software status**

`official manufacturer geometry/mass catalog / grade verification required`

## ROLLED-H-001 — JIS rolled-H gross section properties

**Source**

JFE Steel Corporation official metric H-shape catalog using JIS G 3192 series properties.

**Values stored per record**

- depth and flange width;
- web and flange thickness;
- gross area and published mass per metre;
- strong- and weak-axis moments of inertia;
- strong- and weak-axis elastic section moduli.

Philippine supplier references establish local availability of the general H/wide-flange product family, but exact size, grade and stock remain supplier-confirmation items.

**Limitations carried into the software**

- gross elastic section strength is not a complete rolled-beam design check;
- lateral-torsional buckling, flange/web slenderness, local buckling, unbraced length and code classification remain pending;
- the provisional steel grade must be replaced by the delivered product certificate.

**Software status**

`official section properties / Philippine family availability / exact inventory to verify`

## PH-TIMBER-CONTEXT-001 — Traditional timber identity and use context

**Historical source**

Food and Agriculture Organization of the United Nations. “Philippine forests and forestry.” *Unasylva*, volume 2, number 6.

The historical source provides context for established construction uses of Apitong, Guijo, Yakal, Lauan/Tanguile and related Philippine timbers. It does not supply a modern graded-lumber design dataset.

**Current legal/administrative source**

Department of Environment and Natural Resources, Forest Management Bureau. “Timber Harvesting and Transport.” Current online service and policy reference.

The FMB reference identifies permit, origin and transport-document requirements and recognizes timber trade groups including Philippine Mahogany, Guijo, Yakal and Apitong. It also identifies premium species and current documentation pathways.

**Library-only records**

- Apitong group
- Yakal group
- Guijo group
- Molave / Tugas
- Ipil
- Tanguile / red and white Lauan groups
- Narra
- “Philippine mahogany” trade group

**Activation rule**

These records contain no numerical engineering properties and are excluded from every solver. Activation requires exact botanical identity, legal origin, grading/moisture basis, structural mechanical properties, actual dimensions, stock lengths and connection data.

**Software status**

`visible research priorities / inactive / no capacity assigned`

## Source-governance rules

1. Never convert a traditional-use description into a strength value.
2. Never apply a species dataset to an unidentified trade group.
3. Never use a manufacturer geometry table as proof of steel grade.
4. Never label a research average as a certified design allowable.
5. Preserve source status, confidence and limitations beside every dataset.
6. Keep a material or section inactive when the required evidence package is incomplete.
