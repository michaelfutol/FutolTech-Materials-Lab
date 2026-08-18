# FutolTech Structural Lab — Product Architecture

## Purpose

**FutolTech Structural Lab** is the component-level structural physics and evidence layer of the FutolTech engineering ecosystem.

Its job is to answer:

> What can this material, member, connection or small assembly physically do, under what assumptions, evidence and uncertainty?

The product began with native and locally available construction materials, but its scope now includes conventional and cold-formed steel products, temporary works, connections and future assemblies. Coconut lumber, bamboo and Philippine timber remain important specialties rather than the boundary of the software.

Primary material/product families include:

- coconut lumber and other verified timber datasets
- bamboo and future engineered bamboo
- locally available sawn timber
- GI pipe, CHS, RHS/SHS and rolled steel
- C/Z purlins and other cold-formed products as the required design physics is implemented
- angle bars
- metal studs, tracks, furring and light-steel framing products
- steel straps, plates, bolts, welds and anchors
- future FRP, engineered wood and native-material composites when defensible source data exists

The platform must not hide uncertainty. Every material, member and connection property should carry its source, evidence status, applicability boundary and unresolved verification needs.

## Public and company identity

- Public product: **FutolTech Structural Lab**
- Product subtitle: **Virtual Materials, Members & Connection Testing**
- Company/report identity: **FUTOLTECH ENGINEERING AND PROJECT SYSTEMS**
- Repository/Pages path may remain `FutolTech-Materials-Lab` for continuity until an administrative rename is justified.

## Core engineering chain

```text
Published tests / standards / manufacturer data / measured specimens
                              ↓
                       Material Intelligence
                              ↓
                    Section / Product Digital Twin
                              ↓
                         Materials Lab
                              ↓
                Member response and limit states
                              ↓
                      Connection Laboratory
                              ↓
                         Assembly Lab
                              ↓
                     Frame/System bridge
                              ↓
               Failure chronology / redistribution
                              ↓
                    Design Explorer / optimizer
                              ↓
                 Engineer review and export
```

## Module 1 — Materials Lab

Status: active foundation

Responsibilities:

- store source-labelled material datasets
- calculate geometric and catalog section properties
- run member bending and compression tests now, with tension/shear/torsion/bearing staged later
- compare actual measured sections
- support orientation-sensitive response
- support lower/mean/upper material envelopes where evidence exists
- provide nonlinear constitutive laws and event timelines only as they are validated

Materials Lab remains a core module; the broader product name changes without discarding the tested foundation.

## Module 2 — Direct Compare

Status: active

Responsibilities:

- compare two or three selected alternatives under one common boundary/load case
- preserve product-specific geometry and evidence boundaries
- search for the last load where at least one member remains within the implemented checks
- expose orientation effects visually and numerically
- produce auditable branded calculation reports with manual calculation traces

## Module 3 — Section & Product Digital Twin

Status: partial / expanding

Target canonical object:

```text
material
+ actual geometry
+ orientation
+ source / product identity
+ stock length
+ measured condition
+ coating / treatment
+ defects / deterioration
+ evidence confidence
+ verified section properties when available
```

No missing fold, radius, grade or mass may be silently invented simply to activate a product in the solver.

## Module 4 — Connection & Splice Laboratory

Status: splice-demand foundation active; connection physics next

Initial connection families:

- timber-to-timber nails and screws
- timber-to-timber bolts and dowels
- steel strap-to-timber fasteners
- steel plate/fish-plate/gusset connections
- welded and bolted steel splices
- post bases, anchors and hold-downs
- later bamboo bolts, confinement, internal plugs, lashings and grouted joints

Required checks include:

- fastener lateral capacity
- withdrawal and pull-through
- timber embedment and crushing
- fastener bending/yielding
- splitting, end distance, edge distance and spacing
- group effects
- plate/washer bearing
- bolt-hole net section and tear-out
- joint slip, rotation and stiffness
- brittle, ductile or degrading failure law

A mature connection object must return both capacity and force–displacement behavior.

## Module 5 — Assembly Lab

Status: planned after Connection Lab v1

Initial assemblies:

- built-up coco/timber beams and columns
- double/triple timber members
- back-to-back and boxed C-purlins
- built-up light-gauge studs/channels
- truss panel
- shore + bearer + joist assembly
- post + beam + brace assembly

Fundamental rule:

> Adjacency alone never proves composite action. Physical fasteners, interface slip and connection stiffness determine whether pieces act together.

## Module 6 — Universal Virtual Test Machine

Status: bending/compression and steel-yield foundations active

Target tests:

- tension
- compression
- bending
- shear
- torsion
- bearing/crushing
- combined axial + bending
- local/global instability modes
- cyclic/fatigue where source-backed
- dynamic/impact only after validated physics exists

Target controls:

- Play
- Pause
- Step
- Stop
- Unload
- Reload
- Repeat Cycle

The test timeline should record serviceability, first yield/damage/slip, instability, governing failure, residual state and any redistribution event supported by the model.

## Module 7 — Failure Physics Lab

Status: threshold/yield/rupture foundations exist; full failure library staged

State progression target:

```text
elastic
→ serviceability exceeded
→ first yield / damage / slip
→ stiffness degradation
→ local member or connection failure
→ support release / member rupture / instability
→ redistributed stable state or collapse
→ residual deformation after unloading
```

Every visual failure event must correspond to a stored solver event. Decorative fake snapping, cracking or buckling is prohibited.

## Module 8 — Design Explorer

Status: recommender/optimization foundation active

Candidate actions include:

- change member material/size/thickness
- rotate a non-symmetric or rectangular member
- add a splice using available stock
- strengthen only the connection when it governs
- add braces
- alter fastener quantity/layout
- alter anchor/base detail
- compare repairable/sacrificial alternatives

Objectives may include:

- strength and serviceability
- minimum mass
- minimum installed cost
- local availability
- minimum waste
- minimum embodied carbon
- repairability
- controlled sacrificial behavior

Use deterministic structural physics as the verifier. Classical and optional QUBO/quantum search engines may explore candidates but do not replace the structural solver.

## Module 9 — Physical-Test Calibration

Status: planned

Requirements:

- import UTM or field-test CSV data
- preserve raw evidence
- compare predicted vs measured load–displacement and failure points
- calculate bias, scatter/COV and confidence intervals when sample size supports it
- version calibrated models
- never silently overwrite published property datasets

## Module 10 — Structural Forensics / Field Mode

Status: planned

Field/forensics workflows may capture:

- photos
- actual geometry/thickness
- supports and connection details
- corrosion, defects, splits, holes and prior splices
- candidate failure-sequence hypotheses with evidence/confidence

These tools are engineering investigation aids, not automatic legal-causation opinions.

## Module 11 — Frame Analyser

Status: planned after connection/assembly foundations

Initial scope:

- 2D posts, beams, rafters, rails and braces
- rigid, pinned and spring joints
- gravity, point, distributed and horizontal loads
- geometric nonlinearity / P–Δ
- member and connection force recovery
- support/anchorage limits
- load redistribution after local release
- mechanism/instability detection

The solver determines joint behavior from connectivity/stiffness; it must not assign every connected joint as a literal fixed support.

## First integrated benchmark — NF-001

### 3 m × 3 m coconut-lumber wall frame

NF-001 remains the first staged frame benchmark after the required connection laws exist.

Expected eventual outputs:

- joint displacement and frame drift
- member axial/shear/moment forces
- connection force and slip
- first governing limit state
- progressive failure sequence
- brace alternatives
- connection-aware optimization

## Ecosystem interoperability

### Structural Lab → FutolStructure

Validated component/material/connection objects and feasible alternatives.

### FutolStructure → Structural Lab

Member demand envelopes and selected critical specimens for deeper testing.

### Structural Lab / FutolStructure → RPE

Source-backed component failure laws, degradation and residual behavior for resilience simulations.

### CODA

Governing-code compliance layer and citations; code logic must not be hidden inside raw material-property data.

### SARA

Standards and best-practice intelligence for non-code guidance.

External specialist software may verify or extend advanced physics, but it does not become the source of truth for material/product evidence.

## Engineering boundary

Until a material law, connection law or failure mode has a defensible source and benchmark, the interface may identify an exceeded reference but must not claim a specific physical fracture, local buckle, connection failure or collapse animation.

The permanent implementation and definition-of-done checklist is maintained in `STRUCTURAL_LAB_MASTER_CHECKLIST.md`.
