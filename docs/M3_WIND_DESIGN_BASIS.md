# M3 Wind Design Basis — Provenance Foundation

Status date: 2026-08-22

## Purpose

The first M3 slice identifies the wind-code edition and preserves its source/provenance before any code-derived wind equation is enabled. It does **not** calculate design velocity pressure, pressure coefficients, field/edge/corner geometry, internal pressure or load combinations.

## Initial Philippine code profile

Profile ID: `ph-nscp-2015-v1-7e-2p`

- National Structural Code of the Philippines
- Volume 1 — Buildings, Towers and Other Vertical Structures
- 7th Edition
- 2015
- 2nd Printing
- Publisher context: Association of Structural Engineers of the Philippines, Inc. (ASEP)

The software status is `REFERENCE_IDENTIFIED_RULES_UNIMPLEMENTED`. This means the edition identity has public evidence, but the Structural Lab has not yet implemented or benchmarked the code's wind rules.

## Public provenance records

1. **ASEP publisher context** — `https://aseponline.org/about/`
   - ASEP identifies the National Structural Code of the Philippines among its publications and describes its role in codes and standards.
2. **DPWH structural-design TOR** — `https://www.dpwh.gov.ph/dpwh/sites/default/files/webform/consultancy/advertisement/tor_22csoe01_-_22csoe13.pdf`
   - The TOR lists NSCP 2015, Volume 1, 7th Edition, 2nd Printing among structural design standards/references and separately identifies wind-input categories such as basic wind speed, directionality, exposure, topography, enclosure and internal pressure.
3. **ASEP 2025 professional-practice context** — `https://aseponline.org/news-events/page/4/`
   - ASEP advertised a 2025 structural-design workshop that explicitly included NSCP 2015 among the standards/practices covered.

These records support code identity and contemporary professional/government-reference context only. They do not substitute for the purchased/licensed code text or clause-level implementation evidence.

## `futoltech.wind-design-basis/1`

The versioned object records:

- adopted code profile + edition/publisher/jurisdiction metadata;
- exact public evidence records and claims;
- explicit required input families;
- formula-implementation status;
- blockers that prevent code-wind calculation;
- whether the existing manual-pressure path remains available.

Required input families are currently all `UNRESOLVED`:

1. Site / location
2. Basic wind speed
3. Risk / importance category
4. Exposure / terrain
5. Topography
6. Enclosure / internal pressure classification
7. Building mean roof / reference height
8. Roof geometry / slope / plan dimensions

## Hard boundary in this slice

The following remain `UNIMPLEMENTED` and code calculation remains `BLOCKED`:

- velocity-pressure chain;
- external pressure coefficients;
- internal pressure coefficients;
- field/edge/corner geometry;
- code load combinations.

The Roof Bay M2 pressure path therefore remains `manual-uniform`. `pressureZoning.codeBasis` remains `null`, region polygons remain empty and no purlin is assigned to a code wind zone.

## Next M3 task

Implement the adopted-code velocity-pressure chain with visible substitutions and independent hand benchmarks. Do not enable code-derived roof pressures until the equation chain, units, applicability boundaries and source references are verified.
