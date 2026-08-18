# FutolTech Structural Lab — Master Implementation Checklist

> Permanent working checklist for the evolution of the former Native Structures / Materials Lab codebase into **FutolTech Structural Lab**.
>
> Update this file in every feature PR that materially changes scope or completes a checklist item. Do not rely on chat history as the only record.

## Status legend

- [x] implemented and regression-tested
- [ ] planned / not yet implemented
- [~] partially implemented or screening-only
- [!] blocked by missing verified engineering data, geometry, or governing design method

## Product identity and non-negotiable doctrine

- [x] Rebrand public-facing **Native Structures** identity to **FutolTech Structural Lab**.
- [x] Adopt product subtitle: **Virtual Materials, Members & Connection Testing**.
- [x] Keep Materials Lab as a core module rather than discarding it.
- [x] Preserve source provenance and explicit limitations for every material/product record.
- [x] Never invent missing material strength, dimensions, fold geometry, mass, failure law, or connection capacity.
- [x] Distinguish **PASS / PRELIM PASS / SCREENING / FAIL** according to what the implemented model actually proves.
- [ ] Add a unified confidence/evidence badge: measured / manufacturer-published / standard / peer-reviewed / provisional / unknown.
- [x] Rename package identity to `futoltech-structural-lab` after the public naming migration.
- [~] Keep the repository/Pages path `FutolTech-Materials-Lab` for URL continuity; administrative repository rename is intentionally deferred.

## NOW — Catalog Expansion 01

### Angle bars

- [~] Add **Angle bar / L-section** as a first-class section geometry in the Materials Lab.
- [~] Support equal and unequal legs using actual A × B × t dimensions.
- [~] Calculate gross A, centroid, Ix, Iy, Zx, Zy and radii from an idealized sharp-corner L section.
- [ ] Add root/toe-radius-aware rolled-angle properties when exact standard/catalog geometry is available.
- [~] Add actual L-shape section illustration and 0° / 90° / 180° / 270° orientation figure.
- [ ] Import exact PH market angle-size/thickness combinations and published mass/section properties from a verified handbook/catalog.
- [ ] Make verified angle presets available in Direct Compare.
- [ ] Add angle-specific compression/torsional-flexural buckling boundary before calling a complete angle-column design.

### Metal studs

- [x] Add current PH metal-stud product records to the Section & Materials Library.
- [x] Record UGC overall sizes/thickness range/length without converting published tensile strength into an assumed Fy.
- [x] Record current Knauf Philippines drywall system stud sizes and non-load-bearing system context.
- [!] Keep independent stud-member capacity inactive until full folded geometry and appropriate cold-formed design basis are verified.
- [ ] Acquire manufacturer profile drawings / brochures with web, flange, return lip, corner radius and coating/base-metal thickness.
- [ ] Derive/verify gross section properties from complete geometry.
- [ ] Implement effective-width/local/distortional/global buckling and screw/track restraint effects before structural PASS.

### Double metal furring

- [x] Add current PH double-furring market record to the Section & Materials Library.
- [x] Preserve UGC current thickness range and 5 m commercial length.
- [!] Do not invent hat-channel fold geometry not published by the cited current source.
- [ ] Add exact supplier/standard profile dimensions once verified.
- [ ] Implement gross section properties and orientation figures after full geometry is known.
- [ ] Add ceiling-system behavior later: hanger spacing, carrying channels, clips, board load, local buckling and connection checks.

## Existing foundation — protect with regression tests

- [x] Source-backed material datasets for coco lumber, selected Philippine timbers, bamboo, and steel baselines.
- [x] Beam FEM and column screening solver.
- [x] Direct Compare for 2–3 members under common conditions.
- [x] Philippine GI pipe catalog.
- [x] SHS / RHS geometry.
- [x] User-observed PH SHS 100×100×2.0 mm preset with explicit availability/grade verification boundary.
- [x] JIS H-section starter catalog.
- [x] Philippine C-purlin catalog and gross-property screening.
- [x] Four-way C-purlin installation orientation in main lab and Direct Compare.
- [x] Real Chromium regression gate for Direct Compare C-purlin 0°/90°/180°/270° state and figures.
- [x] One-touch main-lab load ramp to the strongest source-supported terminal reference.
- [x] Direct Compare “Find last passing load” with animated bracket/refine search.
- [x] Compression threshold search protected from zero-rounding in kgf/kN/tf.
- [x] Stock & Splice module foundation.
- [x] Steel yield / unload / residual-deformation experimental module.
- [x] Concrete slab shoring experimental module.
- [x] Load recommender / optimization foundation.
- [x] FT-CS-01 branded engineering comparison report.
- [x] Manual calculation trace for section properties and bending response.
- [x] Chromium PDF gate: logical report pages must equal physical pages and remain inside printable A4 body.

# Ultimate Structural Lab Roadmap

## 1. Material Intelligence

- [ ] Unified material schema for E, G, density, yield/proportional/ultimate strengths, compression, tension, bending, shear and bearing.
- [ ] Moisture, temperature, corrosion/treatment and aging modifiers where source-backed.
- [ ] Lower / mean / upper property envelopes and coefficient of variation where data supports them.
- [ ] Material provenance ledger with citation, specimen basis, test standard, sample count and applicability boundary.
- [ ] Local availability / supplier observations separated from engineering-property evidence.
- [ ] User-measured specimen records with date/location/instrument and calibration metadata.

## 2. Section & Product Digital Twin

- [ ] One canonical specimen object: material + actual geometry + orientation + source + stock length + measured condition + defects + treatment + confidence.
- [ ] Parametric section families: rectangle, round, CHS, RHS/SHS, angle, channel, C/Z purlin, H/I/T, hat/furring, stud/track, built-up sections.
- [ ] Catalog property override when published A/I/Z/mass is more authoritative than idealized geometry.
- [ ] Measured-thickness mode for corroded/under-gauge steel.
- [ ] Defect/condition annotations: holes, notches, corrosion loss, knots, splits, crush zones, welds and previous splices.
- [ ] Section image with centroid, principal axes, extreme fibres and dimensions.

## 3. Universal Virtual Test Machine

- [ ] Test selector: tension.
- [x] Test selector: compression foundation.
- [x] Test selector: bending foundation.
- [ ] Shear.
- [ ] Torsion.
- [ ] Bearing / crushing.
- [ ] Combined axial + bending.
- [ ] Local plate / wall buckling.
- [ ] Lateral-torsional buckling.
- [ ] Fatigue / cyclic loading where a source-backed law exists.
- [ ] Impact / dynamic loading only after validated physics exists.
- [ ] Controls: Play / Pause / Step / Stop / Unload / Reload / Repeat Cycle.
- [ ] Timeline chart: load, displacement, stress/strain, stiffness and event markers.

## 4. Failure Physics Lab

- [x] Store basic elastic/serviceability/yield/rupture threshold concepts.
- [ ] Governing-event timeline: serviceability → first damage/yield/slip → degradation → local failure → redistribution → collapse/residual state.
- [ ] Steel: yield, global buckling, local buckling, LTB, bearing, net-section/tear-out, weld and bolt failure.
- [ ] Timber: fibre crushing, bending rupture, shear, splitting, bearing, nail withdrawal/pull-through.
- [ ] Bamboo: splitting, crushing, bolt bearing, confinement and node effects only when validated.
- [ ] Every animation must correspond to a stored solver event; no decorative fake fracture.
- [ ] Rename generic “Find physical limit” to **Run to Governing Limit** once multi-limit chronology is implemented.

## 5. Connection & Splice Laboratory

- [x] Stock/splice planning foundation.
- [ ] Nailed timber lap splice.
- [ ] Screwed timber splice.
- [ ] Bolted timber splice.
- [ ] Steel strap + timber fasteners.
- [ ] Fish plates / gusset plates.
- [ ] Welded steel splice.
- [ ] Bolted steel splice.
- [ ] Sleeve splice for tubes/pipes where appropriate.
- [ ] Post bases / anchors / hold-downs.
- [ ] Connection force–displacement law, not capacity-only.
- [ ] Edge distance / end distance / spacing / group effects.
- [ ] Member-versus-connection governing comparison.

## 6. Assembly Lab

- [ ] Built-up timber/coco members with fastener slip and degree of composite action.
- [ ] Double/triple timber beams and columns.
- [ ] Back-to-back / boxed C-purlins.
- [ ] Built-up light-gauge studs/channels.
- [ ] Truss panel.
- [ ] Shore + bearer + joist assembly.
- [ ] Post + beam + brace assembly.
- [ ] Explicit rule: physical fasteners/connection stiffness determine composite action; adjacency alone does not.

## 7. Design Explorer

- [x] Load-driven recommender foundation.
- [ ] Reverse query: required span/load → feasible locally available members.
- [ ] Rank by strength/serviceability, mass, price, availability, waste, carbon and repairability.
- [ ] Multi-objective Pareto view rather than one opaque “best” answer.
- [ ] Availability-aware stock/splice option generation.
- [ ] Connection-aware alternatives so a strong member with a weak joint is not recommended as a complete solution.
- [ ] Classical optimizer backends first; QUBO/quantum backends remain optional search engines, never structural-physics solvers.

## 8. Physical-Test Calibration

- [ ] Import real UTM / field test CSV data.
- [ ] Compare predicted vs measured load–displacement and failure point.
- [ ] Store specimen count, mean bias, scatter/COV and confidence interval.
- [ ] Calibration must never silently overwrite published source values.
- [ ] Version calibrated models and preserve original raw test evidence.

## 9. Structural Forensics Mode

- [ ] Failed-member intake: photos, measured geometry, supports, loads, connection, corrosion/defect notes.
- [ ] Candidate failure-sequence reconstruction with ranked hypotheses.
- [ ] Evidence/confidence shown for every hypothesis.
- [ ] Explicit boundary: investigation aid, not automatic legal causation opinion.

## 10. Field Mode

- [ ] Mobile-first specimen capture.
- [ ] Photo + manual/AR dimensions.
- [ ] Product suggestion from image only as a candidate requiring field verification.
- [ ] Offline draft mode for project sites.
- [ ] GPS/location and timestamp optional and privacy-aware.
- [ ] Push verified specimen to Structural Lab project inventory.

## 11. Frames and System-Level Bridge

- [ ] 2D frame analyser with real joint/member connectivity.
- [ ] P–Δ / geometric nonlinearity.
- [ ] Spring connections from Connection Lab.
- [ ] Progressive local release and redistribution.
- [ ] Mechanism/instability detection.
- [ ] Brace adviser.
- [ ] NF-001 coconut-lumber wall-frame benchmark from existing Product Architecture.

## 12. FutolTech Ecosystem Integration

- [ ] **Structural Lab → FutolStructure:** validated component/material/connection objects and design alternatives.
- [ ] **FutolStructure → Structural Lab:** member demand envelopes and selected critical specimens for deeper testing.
- [ ] **Structural Lab / FutolStructure → RPE:** component failure laws, degradation and residual behavior for resilience simulations.
- [ ] **CODA:** governing code checks and code citations remain a compliance layer, not hidden inside raw material property data.
- [ ] **SARA:** standards/best-practice layer for non-code guidance.
- [ ] Solver adapters remain replaceable; external tools verify or extend physics without becoming the source of material truth.

# Standard implementation gate for every new product/feature

A checklist item is not “done” merely because it appears in a dropdown.

1. [ ] **Source gate** — source URL/document, date checked, exact claim captured.
2. [ ] **Geometry gate** — no missing dimension silently assumed.
3. [ ] **Material gate** — grade/strength is verified or explicitly UNKNOWN/PROVISIONAL.
4. [ ] **Physics gate** — equations and applicability boundaries documented.
5. [ ] **Status gate** — PASS vs PRELIM PASS vs SCREENING is honest.
6. [ ] **Visual gate** — section figure and orientation match solver state.
7. [ ] **Manual-check gate** — important calculations can be traced independently.
8. [ ] **Regression gate** — deterministic unit test for equations/data.
9. [ ] **Browser gate** — real Chromium interaction test for stateful UI where warranted.
10. [ ] **Print gate** — critical outputs fit branded report without blank/overflow pages.
11. [ ] **No-regression gate** — existing benchmark and source-backed cases remain green.
12. [ ] **Checklist update** — this master file reflects the new status before merge.

# Immediate execution order after Catalog Expansion 01

1. [x] Public rebrand to **FutolTech Structural Lab** across screen, print and docs without breaking URLs.
2. [ ] Complete PH angle catalog import with exact verified section table.
3. [ ] Connection Lab v1: nailed/bolted timber and simple steel plates/straps.
4. [ ] Run-to-Governing-Limit event timeline.
5. [ ] Assembly Lab v1: built-up coco/timber members with explicit fastener slip/composite action.
6. [ ] Design Explorer v2: member + splice + connection alternatives.
7. [ ] Failure Physics v1: verified steel/timber governing modes.
8. [ ] Physical-test calibration data model/importer.
9. [ ] Frame Analyser/NF-001 integrated benchmark.
10. [ ] RPE/FutolStructure interchange objects.

## Decision log

- 2026-08-18 — Product scope officially exceeds “Native Structures”; target public identity is **FutolTech Structural Lab**.
- 2026-08-18 — User requested the full ultimate roadmap, not a reduced subset.
- 2026-08-18 — Angle bars are allowed into the solver from actual A×B×t geometry with an explicitly idealized sharp-corner gross-property model.
- 2026-08-18 — Metal studs and double furring enter the library immediately, but independent section capacity remains blocked until complete folded geometry/design basis is verified. Missing folds are never invented.
- 2026-08-18 — Public product identity migrated to **FutolTech Structural Lab** with the Structural Lab package name; repository/Pages URL retained as `FutolTech-Materials-Lab` for continuity.
