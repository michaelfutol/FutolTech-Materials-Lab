# FutolNative Structures

A source-backed native-material structural design, analysis, failure-simulation and optimization platform.

The repository began as **FutolTech Materials Lab**. Materials Lab remains the verified member-analysis core and supplies material datasets, section properties, elastic tests and benchmarked calculations. The platform now expands that core into a visual section library, load-driven recommendations, bamboo-culm analysis, stock/splice planning, nonlinear steel-yield experiments, connections, frames, braces, progressive failure and optimization for coconut lumber, bamboo, Philippine timber, steel products and future native-material composites.

The project remains intentionally separate from the FutolTech Resilience Physics Engine. FutolNative Structures focuses on materials, members, joints and structural framing; RPE focuses on complete assemblies and multi-hazard response.

## Live development site

The current site is deployed through GitHub Pages after engineering checks pass:

https://michaelfutol.github.io/FutolTech-Materials-Lab/

Deployment source: GitHub Actions  
Default development branch: `main`

The repository and Pages path still use the original Materials Lab name during the transition. GitHub repository renaming is a separate administrative step.

## Active and experimental modules

```text
FutolNative Structures
├── Materials Lab                    active
│   ├── actual section dimensions and catalog properties
│   ├── elastic beam bending
│   ├── column compression, eccentricity and Euler buckling
│   └── calculation-driven limit warnings
├── Section & Materials Library      active
│   ├── visual cross-section sketches
│   ├── pipe / SHS / RHS / rolled-H classification
│   ├── source and market-status records
│   └── inactive Philippine timber research priorities
├── Load-Driven Recommender          experimental
│   ├── wood, round bamboo and steel candidate enumeration
│   ├── strength, deflection, mass and stock checks
│   └── lightest or lowest-utilisation ranking
├── Bamboo Culm Lab                  experimental
│   ├── measured butt / middle / top geometry
│   ├── tapered variable-EI beam analysis
│   └── permissible and characteristic bending estimates
├── Stock Length & Splice Designer   active demand planner
│   ├── stock-piece count and feasible splice zone
│   ├── local shear and moment demand
│   └── visual splice concepts
├── Steel Yield Lab                  experimental
│   ├── first-yield detection
│   ├── bilinear load–hold–unload cycle
│   └── idealised residual deformation
├── Connection Engine                next
│   ├── nails, screws and bolts
│   ├── plates, straps, welds and anchors
│   ├── bearing, withdrawal, slip and splitting
│   └── connection stiffness and progressive release
├── Frame Analyser                   next
│   ├── posts, beams, rafters and wall frames
│   ├── knee braces, single diagonals and X-bracing
│   ├── gravity, wind and combined actions
│   └── load redistribution after local failure
└── Optimizer                        expanding
    ├── classical auditable enumeration
    ├── future peso cost and embodied-carbon objectives
    ├── future brace, splice and connection choices
    └── later QUBO / BlueQubit candidate search with deterministic verification
```

## Product naming rule

The software separates material properties from product geometry:

- **steel pipe** — round products listed under pipe standards such as PNS 26 or ASTM A53
- **SHS / RHS structural hollow section** — square or rectangular structural tube products
- **rolled H / wide-flange section** — catalog rolled shapes using verified gross properties
- **GI** — galvanised coating only; it does not establish the base-steel grade

The provisional 250 MPa and 345 MPa steel records are product-neutral sensitivity datasets. A result becomes product-specific only when paired with an actual pipe, hollow section or rolled section, and still requires the governing standard and certificate.

## Current Materials Lab capabilities

- elastic beam finite-element analysis with a point load at any position
- independent fixed, pin, roller and free end restraints
- column compression, eccentricity, idealised P–Δ amplification and Euler buckling
- wood specimen lengths from 0.60 m to 3.60 m under the current coconut baseline
- steel specimen lengths from 0.60 m to 6.00 m under the current baseline
- solid rectangle, RHS/SHS, CHS/pipe, solid round and user-defined catalog sections
- actual measured dimensions, section rotation and source-labelled material properties
- solver-driven SVG deformation views
- automated closed-form and solver regression benchmarks using the Node test runner

The initial saved benchmark is a 3.0 m simply supported 50×100 mm coconut-wood member with a movable point load.

## Traditional Philippine timber policy

Apitong, Yakal, Guijo, Molave/Tugas, Ipil, Tanguile/Lauan, Narra and the ambiguous “Philippine mahogany” trade group are visible in the Library as research priorities, but they are **not active solver materials**.

They remain inactive until each record has:

- exact botanical and trade identity
- legal origin and current harvesting/transport documentation
- moisture and grade basis
- density and lower/mean stiffness values
- bending, compression, shear and tension properties appropriate to structural lumber
- actual dimensions and usable stock lengths
- nail/bolt embedment, splitting and connection data

Historical construction reputation is context, not a design value. No pending timber record is allowed to borrow properties from another species or trade group.

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
index.html                              Materials Lab application shell
library.html                            visual section and material library
recommend.html                          load-driven member recommender
bamboo.html                             tapered bamboo-culm analyser
splice.html                             stock-length and splice demand planner
yield.html                              experimental steel yield-cycle lab
src/app.js                              Materials Lab orchestration
src/libraryApp.js                       searchable library controller
src/solver/                             member, column, tapered-culm and nonlinear solvers
src/data/materials.js                   active source-labelled material datasets
src/data/phTraditionalTimberLibrary.js  inactive timber research priorities
src/data/sectionPresets.js              editable section/product inputs
src/components/                         calculated visualisations and section sketches
docs/PRODUCT_ARCHITECTURE.md            platform modules and staged development
docs/ENGINEERING_BASIS.md               equations, assumptions and modelling limits
docs/VALIDATION_MATRIX.md               benchmark register and verification status
docs/SOURCES.md                         bibliographic records and extracted values
```

## Current engineering boundary

The live modules are preliminary analytical comparison tools. They do not yet form a complete design-code or frame-analysis package.

Pending major checks include:

- steel local plate and lateral-torsional buckling
- physical connection stiffness and capacity
- wood and bamboo grading, moisture and load-duration effects
- bamboo nodes, ovality, crookedness and splitting
- tube/pipe manufacturing tolerances and certified grade
- nonlinear wood/bamboo damage and physical fracture
- support and connection failure with load redistribution
- probabilistic material variability

Until a constitutive law and benchmark exist, the interface may report a limit exceedance but must not visually claim a physical snap, local buckle or fracture.

## Engineering notice

This software is for research, education and preliminary engineering comparison. Published material properties are not a substitute for project-specific testing, code checks or professional engineering judgement. Results must not be treated as certified capacities.
