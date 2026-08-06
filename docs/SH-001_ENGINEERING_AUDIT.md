# SH-001 Engineering Reliability Audit

Status: beta screening module, not a construction-release design calculator.

## Deep-pass result

SH2 corrected the main P1 load-path weakness found in SH1:

1. every joist is analysed using its actual edge or interior tributary width;
2. each calculated joist support reaction is applied to the matching bearer;
3. every bearer is analysed under that actual series of joist reactions;
4. each bearer support reaction becomes the calculated load of its shore;
5. the schedule retains geometric tributary area only as a location/reference value;
6. total vertical load and total shore reactions remain subject to an equilibrium regression;
7. negative support reactions now stop the calculation as possible contact loss instead of being silently hidden;
8. Auto bracing must meet both capacity and amplified-stress targets;
9. all passing SH-001 results remain `SCREENING`.

## What can reasonably be trusted now

Within the stated idealisations, SH-001 is useful for:

- fresh-concrete, plywood, rebar, construction and miscellaneous area-load arithmetic;
- equal joist, bearer and shore grids that do not exceed the entered target spacing;
- shore count, positions and geometric tributary areas;
- linear-elastic analysis of continuous prismatic joists and bearers;
- actual calculated vertical reaction transfer from joists to bearers to shores;
- total vertical-load versus total shore-reaction equilibrium;
- spacing, material, section, orientation and load sensitivity comparisons;
- preliminary individual-shore global-buckling comparison;
- showing how assumed intermediate lateral restraints change the longest unbraced shore segment.

These are appropriate for layout study, comparison, debugging and identifying clearly poor arrangements.

## Main modelling assumptions

- Joists and bearers are uncut members continuous over every shown support.
- Uniform line load is represented by closely spaced equivalent point loads in the beam FEM.
- Shores are idealised straight prismatic pin-ended columns with user-entered eccentricity.
- An entered brace elevation is treated as ideal lateral restraint of the shore in its governing buckling direction.
- Vertical contact is compression-only; a negative reaction produces an error because redistribution/contact behaviour is not yet modelled.

Simple spans, loose stacked members, splice-over-support behaviour, connection slip and partial contact can produce materially different results.

## Current results that remain screening only

### Joists and bearers

- Steel bending is compared with a first-yield property record.
- Local plate buckling, lateral-torsional buckling, section compactness, holes, dents, corrosion and connection restraint are not checked.
- Wood values do not yet include complete grading, moisture, duration, repetitive-member, size or defect adjustments.
- Deflection ratios are selectable preliminary screens, not verified project formwork tolerances.
- Nominal presets still require actual delivered dimensions.

### Shores

- Steel screening includes a preliminary global column curve, but not local wall buckling, damage/reuse, holes, couplers, jack extension, clamps or certified prop capacity.
- Coco and hardwood compression records are research/provisional screening values, not code-rated shore capacities.
- Head and base bearing, wedges, U-heads, sole plates and settlement are not checked.

### Auto brace levels

Auto only tests the unbraced length of an individual shore. Even when it reports zero intermediate levels, the complete shoring field still needs a verified lateral system. The calculator does not design ledger/diagonal members, connections or anchorage.

## Missing checks before construction use

- plywood bending, shear, punching and panel joints;
- joist/bearer shear, bearing and support crushing;
- simple-span and splice alternatives;
- nails, clamps, wedges, welds, U-heads and base plates;
- steel local buckling and actual product tolerances/certificates;
- timber grading, defects, moisture, duration and column-stability adjustments;
- horizontal construction loads and whole-grid sway stability;
- brace strength, stiffness, connections and anchorage;
- sole plates, soil bearing, supporting-slab capacity and settlement;
- local concrete piles, pump-hose impact, carts/equipment and uneven pour sequence;
- stripping, reshoring and multilevel construction-load distribution;
- inspection of damaged or reused members.

## Reliability classification

| Output | Current reliance |
|---|---|
| Unit and load arithmetic | High when inputs are correct |
| Grid count and equal spacing | High |
| Idealised joist/bearer FEM | Moderate-to-good screening |
| Vertical reaction chain | Good for the continuous-member model |
| Reaction equilibrium | High numerical confidence |
| Steel shore global buckling | Moderate screening only |
| Coco/hardwood shore capacity | Research screening only |
| Auto brace elevations | Individual-column sensitivity only |
| Complete shoring safety | Not established |

## Bottom line

Reasonable to rely on the arithmetic, regular-grid geometry, idealised elastic vertical load path, reaction mapping and comparative trends under identical assumptions.

Do not treat a low utilisation or `SCREENING` result as permission to fabricate, erect or pour. A complete temporary-works design still needs the missing member, connection, bracing, foundation and construction-sequence checks plus qualified engineering review and site inspection.
