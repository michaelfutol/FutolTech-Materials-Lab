# SH-001 Engineering Reliability Audit

Status: beta screening module, not a construction-release design calculator.

## What can be trusted now

Within the stated idealisations, SH-001 is useful for:

- calculating fresh-concrete, plywood, rebar, construction and miscellaneous area-load components;
- generating equal joist, bearer and shore grids that do not exceed the requested maximum spacing;
- displaying the number and position of shores;
- calculating corner, edge and interior tributary areas;
- finite-element elastic bending analysis of the selected joist and bearer sections;
- mapping bearer support reactions into a shore schedule;
- checking total vertical-load versus total shore-reaction equilibrium;
- comparing the effect of shore material, section, height, eccentricity and assumed unbraced length;
- showing how equally spaced assumed brace levels reduce the longest unbraced segment;
- preliminary AISC-style global steel-column buckling comparison through the shared column solver;
- natural-material compression screening against the currently selected research/provisional property record.

These calculations are suitable for debugging layouts, comparing alternatives, understanding load paths and identifying obviously inadequate arrangements.

## P1 correction required before stronger reliance

### Actual joist reactions must feed the bearers

The current implementation analyses a representative continuous joist, but bearer point loads are still generated through equivalent tributary allocation. The total load is conserved, but the individual support-reaction pattern of a continuous joist is not transferred literally to each bearer.

Required correction:

1. analyse every joist line using its own edge or interior tributary width;
2. obtain the calculated reaction at every bearer support;
3. place that reaction as a point load on the matching bearer;
4. add bearer self-weight separately;
5. rerun each bearer and map its reactions to shores;
6. retain global reaction-equilibrium tests and add reaction-pattern benchmarks.

Until this is completed, bearer and shore reactions should be treated as preliminary load-distribution estimates, not exact continuous-framing reactions.

## Current results that are screening only

### Joists and bearers

- Steel bending currently compares stress with a first-yield property record.
- Local plate buckling, lateral-torsional buckling, section compactness, holes, dents, corrosion and connection restraint are not checked.
- Wood values depend on provisional or research datasets and do not yet include complete grading, moisture, duration, repetitive-member or defect adjustments.
- Deflection limits are selectable preliminary ratios, not a verified formwork-finish criterion.
- Actual delivered dimensions cannot yet be edited directly inside SH-001; nominal presets must be verified elsewhere.

Therefore even a passing joist or bearer must remain `SCREENING`, not final approval.

### Shores

- Steel shore screening includes a preliminary global column curve, but not local wall buckling, damaged/reused condition, holes, couplers, adjustable-jack extension, clamps or certified prop capacity.
- Coco and hardwood shores use research/provisional compression properties and are not code-rated shore capacities.
- Top and bottom conditions are idealised as pin-like.
- Eccentricity is user-entered; the default is not a measured site imperfection.
- Base and head bearing, wedges, U-heads, sole plates and support settlement are not checked.

### Auto-Suggested brace levels

Auto-Suggest is only an **unbraced-length trial**. It assumes every level has:

- adequately stiff and strong horizontal ledgers;
- diagonal bracing in both plan directions;
- adequate clamps, nails, bolts or welds;
- anchorage and a complete load path;
- restraint in the governing weak direction.

The module does not design those brace members or connections. The suggested elevations must never be read as a complete bracing design.

## Missing system checks

The current module does not yet verify:

- plywood bending, shear, rolling shear, punching or panel-joint layout;
- joist and bearer bearing perpendicular to grain;
- connection capacity and slip;
- local concrete accumulation, pump-hose impact or moving concentrated loads;
- beams, drop panels, openings and thickened zones;
- nonuniform pour sequence and partial loading;
- shore settlement or uneven engagement;
- base/sole-plate bearing on soil or an existing slab;
- supporting-slab age and strength;
- stripping, reshoring and multilevel construction-load distribution;
- global shoring-frame sway and notional horizontal loads;
- accidental removal or failure of one shore;
- code load combinations and project-specific temporary-works requirements.

## Reliability classification

| Output | Current reliance |
|---|---|
| Area-load arithmetic | High, when inputs are correct |
| Grid count and actual equal spacing | High |
| Tributary areas | High for the generated regular grid |
| Total vertical-load equilibrium | High |
| Joist elastic response | Moderate screening |
| Bearer and individual shore reactions | Preliminary until actual joist reactions are transferred |
| Steel shore global buckling comparison | Moderate screening only |
| Coco/hardwood shore capacity | Research screening only |
| Auto brace elevations | Conceptual unbraced-length suggestion only |
| Complete shoring safety | Not established |

## Release gates before actual design reliance

1. Transfer actual joist FEM reactions to bearers.
2. Add plywood panel checks and panel layout.
3. Add verified temporary-works load cases, concentrated loads and pour sequence.
4. Add bearing, connection, head/base and sole-plate checks.
5. Add brace-member, brace-connection and whole-grid stability checks.
6. Add actual measured section inputs inside SH-001.
7. Add steel local-buckling/product-certification checks and timber grading adjustments.
8. Add supporting soil/slab and reshoring checks.
9. Validate against hand calculations and at least one independently modelled real project.
10. Keep a qualified engineer review and site inspection gate before construction.
