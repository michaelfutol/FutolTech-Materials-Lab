# M3 Project Wind Input Acceptance

Status: PR #115 candidate foundation · 2026-08-22

## Purpose

This slice creates an auditable acceptance layer between project records and the already benchmarked NSCP 2015 building velocity-pressure equation. It is deliberately **not** an automatic wind-map lookup and it does not yet calculate final roof pressures.

The project record must identify the site, occupancy category, basic wind speed and its selection provenance, exposure category, topographic factor `Kzt`, and velocity-pressure evaluation height. Each accepted value must carry an explicit source reference.

## Governing profile

Current implemented profile: **NSCP 2015, Volume 1, 7th Edition, 2nd Printing** (`ph-nscp-2015-v1-7e-2p`).

The occupancy-to-wind-speed-figure relation used by this acceptance layer is:

- Occupancy Category I → Figure `207A.5-1C`
- Occupancy Category II → Figure `207A.5-1B`
- Occupancy Categories III, IV and V → Figure `207A.5-1A`

This mapping is a clause-level implementation of NSCP 2015 Section 207A.5.1. Before project use, the engineer must verify the figure selection against an authorized copy of the adopted code. The repository does **not** store or recreate the wind-speed map contours or a province-by-province speed table.

## Accepted basic-wind-speed provenance modes

### 1. Authorized code map

Required metadata:
- numeric basic wind speed in kph;
- occupancy category;
- declared NSCP wind-speed figure matching the occupancy category;
- selection method: direct contour read or linear interpolation;
- source reference identifying the engineer/project record used to transcribe the value.

The software validates the occupancy-to-figure match, but it does not independently read the map image or verify the geographic contour.

### 2. Project design criteria

A project/government/client design criterion may be preserved as the explicit source of the adopted wind speed. It is labeled a **non-map source** and cannot claim that the code map itself has been verified by the software.

### 3. Site-specific study

A site-specific wind study may be preserved as the explicit source. It is also a **non-map source** unless the project record separately carries a matching code-map figure reference.

## Other accepted velocity-pressure inputs

Exposure Category B/C/D, `Kzt`, and evaluation height are accepted only as explicit engineer/project inputs with source references. This slice does not infer terrain exposure from an address, satellite imagery, nearby buildings, or land-use data. It does not derive `Kzt` automatically from terrain geometry.

The Department of Public Works and Highways structural-design TOR used by the project provenance record separately identifies basic wind speed, directionality, exposure category, topographic factor, gust effect, enclosure classification, and internal-pressure coefficient as wind-design parameters expected in structural analysis. Public reference: https://www.dpwh.gov.ph/dpwh/sites/default/files/webform/consultancy/advertisement/tor_22csoe01_-_22csoe13.pdf

## Versioned object

Schema: `futoltech.wind-project-input-acceptance/1`

An accepted record carries:
- project site and source reference;
- occupancy category and required NSCP wind-speed figure;
- basic wind speed, source type, source reference and selection method;
- exposure category and source reference;
- topographic factor `Kzt` and source reference;
- evaluation height and source reference;
- explicit flags showing that automatic map lookup, automatic exposure classification, automatic topographic derivation, pressure coefficients, and roof zoning are still unavailable.

Accepted records can feed `src/solver/windVelocityPressure.js` through `windProjectInputBridge.js`. The result remains **velocity pressure only**.

## Permanent boundary for this slice

`qz/qh` is not the final roof pressure. The following remain blocked:
- external pressure coefficients;
- internal pressure/enclosure coefficients;
- field/edge/corner roof-zone geometry;
- final positive/suction roof pressures;
- code-derived load routing into Roof Bay.

The existing manual uniform Roof Bay pressure path remains active and auditable until those layers are independently implemented and benchmarked.
