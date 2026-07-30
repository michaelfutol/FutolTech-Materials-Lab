# FutolNative Structures

A source-backed native-material structural design, analysis, failure-simulation and optimization platform.

The repository began as **FutolTech Materials Lab**. Materials Lab remains the first verified module and supplies material datasets, section properties, member tests and benchmarked calculations. The platform now expands that core into connections, frames, braces, progressive failure and optimization for coconut lumber, bamboo, local timber, light steel and future native-material composites.

The project remains intentionally separate from the FutolTech Resilience Physics Engine. FutolNative Structures focuses on materials, members, joints and structural framing; RPE focuses on complete assemblies and multi-hazard response.

## Live development site

The current site is deployed through GitHub Pages after engineering checks pass:

https://michaelfutol.github.io/FutolTech-Materials-Lab/

Deployment source: GitHub Actions  
Default development branch: `main`

The repository and Pages path still use the original Materials Lab name during the transition. GitHub repository renaming is a separate administrative step.

## Platform modules

```text
FutolNative Structures
├── Materials Lab           active
│   ├── source-backed material datasets
│   ├── actual section geometry and catalog properties
│   ├── beam bending
│   ├── column compression and buckling
│   └── nonlinear failure timeline under development
├── Connection Engine       next
│   ├── nails, screws and bolts
│   ├── plates, straps, welds and anchors
│   ├── bearing, withdrawal, slip and splitting
│   └── connection stiffness and progressive release
├── Frame Analyser          next
│   ├── posts, beams, rafters and wall frames
│   ├── knee braces, single diagonals and X-bracing
│   ├── gravity, wind and combined actions
│   └── load redistribution after local failure
└── Optimizer               planned
    ├── minimum cost and weight
    ├── maximum native-material content
    ├── minimum number of braces and section sizes
    ├── connection and anchorage selection
    └── buildable commercial-length solutions
```

## Current Materials Lab capabilities

- elastic beam finite-element analysis with a point load at any position
- independent fixed, pin, roller and free end restraints
- column compression, eccentricity, idealised P–Δ amplification and Euler buckling
- wood specimen lengths from 0.60 m to 3.60 m
- steel specimen lengths from 0.60 m to 6.00 m
- solid rectangle, RHS/SHS, CHS/pipe, solid round and user-defined catalog sections
- actual measured dimensions, section rotation and source-labelled material properties
- solver-driven SVG deformation views
- automated closed-form benchmarks using the Node test runner

The initial saved benchmark is a 3.0 m simply supported 50×100 mm coconut-wood member with a movable point load. Generic steel-tube sensitivity cases remain explicitly marked as assumed until a product standard or mill certificate is attached.

## First full-structure benchmark

**NF-001 — 3 m × 3 m coconut-lumber wall frame**

- two posts with top and bottom rails
- selectable knee brace, single diagonal or X-brace
- nailed or bolted joints
- user-defined base anchorage
- gravity plus horizontal wind loading
- lower, mean and upper material-property envelopes
- member, connection and support failure sequence
- optimizer recommendations for brace layout, member orientation, fastener quantity and anchor requirement

## Run locally

No framework or package installation is required for the browser application. Serve the repository through any static server, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Run engineering checks with Node 22 or newer:

```bash
npm run verify
```

## Repository map

```text
index.html                         browser application shell
src/app.js                         interface and analysis orchestration
src/solver/                        section, beam, column and matrix solvers
src/data/materials.js              source-labelled material datasets
src/data/sectionPresets.js         editable convenience section inputs
src/components/                    calculated specimen visualisation
docs/PRODUCT_ARCHITECTURE.md       platform modules and staged development
docs/ENGINEERING_BASIS.md          equations, assumptions and modelling limits
docs/VALIDATION_MATRIX.md          benchmark register and verification status
docs/SOURCES.md                    bibliographic records and extracted values
```

## Current engineering boundary

The current live solver is benchmarked against initial closed-form elastic member cases. It is not yet the complete frame and nonlinear failure system. Local tube-wall buckling, lateral-torsional buckling, physical connection flexibility, wood fracture, moisture/time effects, plasticity, support failure and probabilistic material variability remain explicit development modules.

Until a constitutive law and benchmark exist, the interface may report a limit exceedance but must not visually claim a physical snap, local buckle or fracture.

## Engineering notice

This software is for research, education and preliminary engineering comparison. Published material properties are not a substitute for project-specific testing, code checks or professional engineering judgement. Results must not be treated as certified capacities.
