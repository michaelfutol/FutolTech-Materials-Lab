# FutolTech Structural Interchange v1

Schema: `futoltech.structural-interchange/1`

This document defines the first solver-agnostic data contract connecting **FutolTech Structural Lab**, **FutolStructure**, and the **FutolTech Resilience Physics Engine (RPE)**.

The contract moves evidence-bounded engineering objects between systems. It is not a shortcut around verification, code design, model QA, or engineer judgment.

## Core rules

Every interchange object carries:

- a versioned `schemaVersion`;
- an explicit `objectType` and stable `id`;
- the `sourceSystem` that owns the supplied information;
- an `evidenceStatus`;
- at least one provenance record;
- an explicit units map;
- an `analysisBoundary` describing what the object does and does not establish;
- JSON data appropriate to the object type.

Unsupported schema versions and object types fail validation visibly. Missing provenance, units, mandatory object fields, duplicate IDs, malformed references, or non-finite engineering values are rejected instead of silently repaired.

## Supported source systems

- `FutolTech Structural Lab`
- `FutolStructure`
- `RPE`

## Object types

- `material`
- `section`
- `member`
- `connection-law`
- `assembly`
- `failure-law`
- `demand-envelope`
- `critical-specimen-request`
- `rpe-component-law`

## Evidence states

The v1 contract recognizes:

- `measured`
- `manufacturer-published`
- `standard`
- `peer-reviewed`
- `calibrated`
- `provisional`
- `user-supplied`
- `assumed-sensitivity`
- `unknown`

Evidence status travels with the object. Interchange never upgrades a source record merely because another solver consumes it. In particular, a generic steel Fy sensitivity dataset remains sensitivity data, and C-purlin/angle gross-property screening remains screening after export.

## Direction A — Structural Lab → FutolStructure

Structural Lab can export a component package containing material, section and member objects, with optional connection, assembly and failure-law context.

The member references its material and section by ID instead of copying anonymous values. Section geometry and gross properties travel with their source/analysis boundary. Project-specific steel grade, delivered thickness, grading, defects, local buckling, connection design, and other unavailable checks are not inferred.

Example logical package:

```json
{
  "schemaVersion": "futoltech.structural-interchange/1",
  "packageId": "pkg-B1",
  "sourceSystem": "FutolTech Structural Lab",
  "targetSystem": "FutolStructure",
  "objects": [
    { "objectType": "material", "id": "material:coco-uh-2007-average" },
    { "objectType": "section", "id": "section:wood-2x4" },
    {
      "objectType": "member",
      "id": "member:B1",
      "data": {
        "materialId": "material:coco-uh-2007-average",
        "sectionId": "section:wood-2x4",
        "lengthM": 3,
        "orientationDeg": 0
      }
    }
  ]
}
```

The real serialized objects contain evidence, provenance, units and analysis boundaries; the abbreviated example above shows reference structure only.

## Direction B — FutolStructure → Structural Lab

FutolStructure can return signed demand envelopes with project/member/load-case identity. Axial force, shear and moment retain their algebraic sign. Structural Lab may summarize the maximum absolute imported action while retaining the governing source case ID.

A `critical-specimen-request` is an explicit work request for deeper component testing. It is not automatically created because a number is large, and it is not itself a failure or code-compliance conclusion.

Structural Lab does not silently change the source model, support assumptions, geometry, load cases, combinations, or imported demand.

## Direction C — Structural Lab → RPE

RPE receives component threshold laws derived from **stored solver events**, such as:

- serviceability references;
- material working/reference thresholds;
- steel first yield;
- gross first-yield screening for C-purlins/angles;
- published timber rupture references;
- implemented column governing/instability thresholds.

The event marked `terminal: true` is authoritative; array order is not used to infer terminal behavior.

A threshold is not automatically a damage law. Every `failure-law` and `rpe-component-law` explicitly states whether residual/degradation behavior is:

- `AVAILABLE` — only when the source object actually supplies a validated/calibrated law; or
- `UNAVAILABLE` — no post-threshold stiffness, residual strength, fracture, local buckling, post-buckling or damage evolution may be invented from the threshold alone.

For example, ordinary steel Fy may be exported as **FIRST YIELD**, but that does not authorize RPE to invent a residual-stiffness ratio or fracture curve.

## Deterministic serialization

Interchange JSON uses stable key ordering for deterministic serialization. A valid package must serialize → parse → serialize identically under the same v1 contract. Duplicate IDs and broken package references are rejected.

This deterministic form is intended to support later hashing, audit trails, reproducible exchange, and repository fixtures.

## Compatibility and versioning

Consumers accept only schema versions they explicitly support. V1 does not silently coerce a future or unknown schema into the current model. A future contract change that alters meaning or required fields must use a new schema version and an explicit migration path.

## Non-goals of v1

Interchange v1 does **not**:

- turn Structural Lab screening into code design;
- make FutolStructure or RPE the source of material/product truth;
- infer missing geometry, grade, connection stiffness or capacity;
- infer CODA/SARA compliance;
- fit or adopt calibration parameters without an explicit engineer-approved bridge;
- infer fracture or residual behavior from yield alone;
- mutate the FutolStructure source model when consuming demand;
- replace external specialist solvers or engineer verification.

## Implementation files

- `src/interchange/structuralInterchange.js` — canonical schema, validation, deterministic serialization and generic constructors.
- `src/interchange/componentPackage.js` — Structural Lab → FutolStructure component packages.
- `src/interchange/demandBridge.js` — FutolStructure → Structural Lab demand/critical-specimen bridge.
- `src/interchange/rpeBridge.js` — stored threshold/failure laws → evidence-bounded RPE component laws.

Regression suites under `test/` protect version rejection, round-trip stability, evidence/status preservation, signed demand ownership, cross-reference integrity, screening boundaries, and the no-invented-degradation rule.
