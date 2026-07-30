# FutolNative Structures — Product Architecture

## Purpose

FutolNative Structures is a source-backed structural design, analysis and optimization platform for materials and construction systems that are poorly represented in mainstream structural software.

Primary initial materials:

- coconut lumber
- bamboo and engineered bamboo
- locally available sawn timber
- light-gauge and commercial steel sections
- steel straps, plates and anchors
- future abaca, coir and native-material composites when sufficient source data exists

The platform must not hide uncertainty. Every material, member and connection property carries its source, status, confidence, modifiers and limitations.

## Core engineering chain

```text
Published tests and standards
            ↓
Materials Lab
            ↓
Member capacity and deformation
            ↓
Connection stiffness and capacity
            ↓
2D/3D frame analysis
            ↓
Progressive failure and redistribution
            ↓
Brace/member/connection optimization
            ↓
Engineer review and export
```

## Module 1 — Materials Lab

Status: active foundation

Responsibilities:

- store source-labelled material datasets
- calculate section geometry and properties
- run beam, column, tension and shear member tests
- compare actual measured sections
- support lower, mean and upper material envelopes
- provide nonlinear constitutive laws and event timelines as they are validated

The Materials Lab is retained as a module rather than discarded during the platform conversion.

## Module 2 — Connection Engine

Status: next major module

Initial connection families:

- timber-to-timber nails and screws
- timber-to-timber bolts and dowels
- steel strap-to-timber fasteners
- steel plate-to-timber bolts
- post bases, anchors and hold-downs
- later bamboo bolts, confinement, internal plugs, lashings and grouted joints

Required checks:

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

The connection object must return both capacity and force–displacement behavior.

## Module 3 — Frame Analyser

Status: next major module

Initial scope:

- 2D posts, beams, rafters, rails and braces
- common rigid joints, pinned joints and spring connections
- gravity, point, distributed and horizontal wind loads
- geometric nonlinearity and P–Δ
- member and connection force recovery
- support and anchorage capacity
- load redistribution after a local release
- instability/mechanism detection

The frame solver must determine joint rotations from connectivity and stiffness. It must not assign every monolithic or connected joint as a literal fixed support.

## Module 4 — Failure Engine

Status: tracked in issue #5

State progression:

```text
elastic
→ serviceability exceeded
→ first yield/damage/slip
→ stiffness degradation
→ local member or connection failure
→ support release or member rupture
→ redistributed stable state or collapse
→ residual deformation after unloading
```

Every visual failure event must correspond to a stored solver state and source-backed rule.

## Module 5 — Brace Adviser and Optimizer

Status: planned after the first frame and connection models

Candidate actions:

- add one diagonal brace
- add X-bracing
- add knee braces
- add steel strap bracing
- increase member depth or thickness
- rotate a rectangular member
- strengthen only the connection
- increase nail/screw count or diameter
- increase bolt diameter, washer or plate
- improve post base or hold-down

Optimization objectives:

- minimum cost
- minimum mass
- minimum number of braces
- minimum number of different member sizes
- maximum native-material content
- minimum imported steel
- minimum embodied carbon
- maximum repairability
- controlled sacrificial failure

Constraints:

- strength and stability limits
- serviceability and drift limits
- connection capacity and spacing
- anchorage and load-path requirements
- commercial lengths and available sections
- constructability rules

## First integrated benchmark — NF-001

### 3 m × 3 m coconut-lumber wall frame

Geometry:

- two posts
- top and bottom rails
- optional knee brace, single diagonal or X-brace

Inputs:

- actual member dimensions and orientation
- material lower/mean/upper dataset
- nail or bolt type, diameter, length and quantity
- base anchorage
- gravity and horizontal load

Required outputs:

- joint displacement and frame drift
- member axial, shear and moment forces
- connection force and slip
- first governing limit state
- progressive failure sequence
- brace alternatives
- lowest-cost compliant configuration

## Interoperability boundary

FutolNative Structures owns the canonical native-material model, source register and decision engine.

External programs may later be used for:

- benchmark verification
- advanced shell/local-buckling analysis
- general structural export
- BIM and fabrication outputs

External software is a verifier or service, not the source of truth for native-material properties and optimization decisions.

## Engineering boundary

Until a material law, connection law or failure mode has a cited basis and benchmark, the interface may identify an exceeded reference but must not claim a specific physical fracture, local buckle or collapse animation.
