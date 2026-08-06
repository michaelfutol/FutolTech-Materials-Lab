# SH-001 Engineering Audit — 2026-08-06

## Bottom line

SH-001 is useful for **preliminary load take-down, grid sensitivity, member comparison and bug-finding**. It is not yet a construction-release shoring design program.

Use it to answer questions such as:

- How many shores result from a target spacing?
- How does slab thickness or construction load change the reaction map?
- Which joist, bearer or shore becomes critical first under the current idealised model?
- How does changing from 2×3 coco to a selected GI pipe change the individual-shore buckling screen?
- Where are the maximum calculated reactions?

Do not use it by itself to authorize a concrete pour, remove shores, select brace hardware, approve reused lumber/pipe, or certify the supporting soil/slab.

## Deep-pass result

### Corrected in SH2

1. **Actual joist reactions now feed the bearers.**
   - SH1 analysed a representative continuous joist but created bearer loads from geometric tributary rectangles.
   - That conserved total vertical load but could miss the peak reaction at individual continuous supports.
   - SH2 analyses every joist and transfers each calculated support reaction to the matching bearer.

2. **Actual bearer reactions feed the shores.**
   - Every shore reaction is taken from the bearer finite-element result.
   - The schedule keeps geometric tributary area only as a location/reference value; it is no longer presented as the reaction calculation itself.

3. **Reaction conservation remains a regression gate.**
   - Total signed shore reactions must balance fresh concrete, plywood, entered allowances, joist self-weight and bearer self-weight within numerical tolerance.

4. **Contact-loss/uplift is no longer silently hidden.**
   - A negative joist or bearer support reaction means the current contact-only model needs redistribution or a connection capable of tension.
   - SH2 stops and reports the condition instead of clamping it to zero and continuing.

5. **Auto-brace target uses both capacity and amplified stress.**
   - SH1 could stop when capacity utilization met the target even if stress utilization remained above the target but below 100%.
   - SH2 requires both ratios to meet the selected target.

6. **All SH-001 passing results remain `SCREENING`.**
   - Steel local buckling, section tolerances, actual grade, bearing, heads/bases and connections are not complete.
   - Natural-timber values still need exact species, visual grade, moisture, defects and source reconciliation.

7. **“No intermediate brace level” is clarified.**
   - It means only that the isolated shore did not need an intermediate point for the current global-buckling screen.
   - It never means the shoring field can be erected without ledgers, diagonal bracing, anchorage and a complete lateral load path.

## What is grounded well enough for beta use

| Item | Current confidence | Notes |
|---|---|---|
| Unit conversion | High | kgf, kN, kPa and geometry conversions are explicit. |
| Fresh-concrete and plywood self-weight | High for entered values | User remains responsible for project values. |
| Equal grid generation | High | Actual spacing never exceeds the requested target. |
| Linear-elastic beam FEM | Good for idealised prismatic members | Existing reaction and closed-form regression tests remain active. |
| Joist → bearer → shore vertical load path | Good for the stated continuous-member model | SH2 transfers calculated reactions at every stage. |
| Reaction balance | High numerical confidence | A balance error is displayed and regression-tested. |
| Global steel-column screening | Moderate | Uses an AISC-style flexural-buckling curve and ASD divisor, but not local buckling or certified product data. |
| Coco/common timber screening | Low-to-moderate | Useful for sensitivity only; grading, defects, duration, moisture and column adjustment are incomplete. |
| Brace-height effect on isolated-shore buckling | Moderate as a sensitivity study | Uses the longest segment and ideal lateral restraint; brace strength/stiffness is not designed. |

## Important modelling assumptions

### Continuous joists and bearers

The current joists and bearers are treated as uncut members continuous over every shown support. This can differ materially from:

- separate simple spans;
- butt joints or overlaps away from supports;
- splices directly over supports;
- loose stacked members with connection slip;
- members that lift off a support.

A later release needs selectable `continuous`, `simple spans`, and `splice-over-support` systems.

### Distributed load

Area load is converted into joist line load. The beam FEM represents a uniform line load with closely spaced equivalent point loads. This is a standard numerical approximation, but mesh sensitivity remains part of validation.

### Construction load

The 250 kgf/m² default is approximately 2.45 kPa. It is a visible editable benchmark—not an automatic project value. Local heaping, pump-hose action, buggy/cart loads, stored reinforcement, impact and uneven placement may govern and are not represented by one uniform number.

### Individual shore model

The shore is currently an idealised straight prismatic column with:

- pin-like end assumption;
- editable eccentricity;
- longest unbraced segment;
- global flexural buckling;
- no connection slip or frame sway interaction.

For GI pipe/SHS, the current model does not yet check local wall buckling, dents, corrosion, holes, welds, jack extensions or actual certificate values. For timber it does not yet include a code-grade column-stability factor, knots, slope of grain, checks/splits, decay or reuse damage.

## Missing checks before construction use

1. Plywood bending, shear, bearing and local punching.
2. Joist/bearer shear, bearing and support crushing.
3. Simple-span and splice alternatives.
4. Nail, clamp, wedge, weld, U-head and base-plate checks.
5. Steel local buckling, effective area and product tolerances.
6. Timber grade, moisture, duration, size and column-stability adjustments.
7. Horizontal construction loads and full brace-member/joint design.
8. Sole plates, soil bearing, supporting slab strength and settlement.
9. Concentrated concrete piles, pump hose, carts/equipment and pour sequencing.
10. Inspection of reused or damaged members.
11. Stripping, reshoring and multilevel construction-load distribution.
12. Project drawings, erection tolerances and field inspection records.

## Safety references used to set the boundary

- ACI PRC-347-14(21), *Guide to Formwork for Concrete*: design chapter covers loads, member capacities, shores, bracing/lacing, foundations and settlement.
- ACI PRC-347.2-17(25), *Guide for Shoring/Reshoring of Concrete Multistory Buildings*: covers construction loads, load distribution, early-age slab strength and multistory sequences.
- OSHA 29 CFR 1926.703: formwork is to support reasonably anticipated vertical and lateral loads; shoring plans, inspections, sills, heads/bases and eccentric loading are specifically addressed.

Official reference pages:

- https://www.concrete.org/store/productdetail.aspx?Format=PROTECTED_PDF&ItemID=347U14&Language=English&Units=US_AND_METRIC
- https://www.concrete.org/store/productdetail.aspx?ItemID=347217&Language=English&Units=US_AND_METRIC
- https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.703

## Current trust statement

**Reasonable to trust:** arithmetic, unit conversion, idealised elastic vertical load path, support-reaction mapping, grid/count calculations and comparative trends within the same assumptions.

**Do not yet trust as final capacity:** any green-looking or low-utilisation result as permission to build or pour. The current output is a screening result until the missing member, connection, bracing, foundation and construction-sequence checks are added and independently verified.
