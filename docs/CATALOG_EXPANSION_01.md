# Structural Lab Catalog Expansion 01 — Engineering Basis

## Scope

This increment begins the transition from the narrow “Native Structures” scope toward FutolTech Structural Lab by adding:

- actual-dimension steel angle-bar geometry for beam screening;
- source-backed Philippine metal-stud market records;
- source-backed Philippine double-furring market records;
- a permanent master implementation checklist.

## Angle-bar property basis

The main Materials Lab accepts an idealized steel L-section defined by:

- vertical leg A = `depthMm`
- horizontal leg B = `widthMm`
- uniform thickness t = `thicknessMm`

Gross properties are calculated as the union of a vertical `t × A` rectangle and a horizontal `B × t` rectangle, less the duplicated `t × t` corner square. Centroidal `Ix` and `Iy` are obtained by the parallel-axis theorem about axes parallel to the physical legs. Elastic section moduli use the farthest extreme fibre from the calculated centroid.

This is deliberately a **sharp-corner gross-section approximation**. Hot-rolled root/toe radii are not inferred. When a verified product handbook supplies exact A/I/Z/mass values, those catalog values should supersede the idealized geometry for that product.

Column compression is intentionally disabled for this new angle geometry until principal-axis and torsional/flexural-torsional buckling treatment is implemented.

## Philippine source observations recorded

### Regan angle bars

Official product page checked 2026-08-18:

- equal legs: 20×20 mm through 250×250 mm;
- unequal legs: 75×50 mm through 150×100 mm;
- thickness range: 2.0–35 mm;
- standard length: 6 m;
- supplier identifies the product as mill-certified hot-rolled mild carbon steel.

The source page describes market ranges. It does not prove that every possible size/thickness combination in those ranges is stocked, so the app does not manufacture a Cartesian product of fake presets.

### UGC metal studs

Official product page checked 2026-08-18:

- 30×50, 30×65, 30×75, 30×90 mm;
- nominal thickness 0.40–0.80 mm;
- commercial length 3.00 m;
- Z40 coating;
- published minimum tensile strength 275 MPa.

The 275 MPa figure is retained as a tensile-strength claim and is **not converted into an assumed yield strength**.

### Knauf Philippines drywall studs

Official Philippines drywall-system page checked 2026-08-18 lists, among others:

- 64×33.5×0.50 mm BMT;
- 76×33.5×0.50 mm BMT;
- 92×33.5×0.55 mm BMT.

The standard wall-partition system is explicitly described as non-load-bearing. These records therefore enter the product library without an independent structural member PASS claim.

### UGC double furring

Official product page checked 2026-08-18:

- nominal thickness 0.30–0.80 mm;
- commercial length 5.00 m;
- application: ceiling and cladding frame.

The current public page does not provide enough fold dimensions to reconstruct a unique hat/furring section. The product is therefore library-only until full profile geometry is verified.

## Activation rule for thin cold-formed products

A market listing is not automatically a solver section. Metal studs, furring, tracks, hats and similar profiles become solver-active only after the app has enough verified geometry and the relevant cold-formed limit-state model to avoid false confidence.
