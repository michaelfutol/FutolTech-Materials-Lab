# FutolTech Materials Lab

A source-backed virtual laboratory for structural materials and individual-member behaviour.

The project is intentionally separate from the FutolTech Resilience Physics Engine. Materials Lab focuses on one-dimensional structural members and traceable engineering calculations; RPE focuses on complete assemblies and hazard response.

## Live development site

The current development branch is deployed through GitHub Pages after the engineering checks pass:

https://michaelfutol.github.io/FutolTech-Materials-Lab/

Deployment source: GitHub Actions  
Development branch: `feat/member-test-bench-foundation`

## Foundation release

The first working test bench includes:

- elastic beam finite-element analysis with a point load at any position
- independent fixed, pin, roller and free end restraints
- column compression, eccentricity, idealised P–Δ amplification and Euler buckling
- wood specimen lengths from 0.60 m to 3.60 m
- steel specimen lengths from 0.60 m to 6.00 m
- solid rectangular and rectangular/square hollow sections
- solver-driven SVG deformation views
- source status, confidence and limitations for every material dataset
- automated closed-form benchmarks using the Node test runner

The initial saved benchmark is a 3.0 m simply supported 50×100 mm coconut-wood member with a movable point load. Generic 50.8×50.8×1.5 mm steel-tube sensitivity cases are included but deliberately marked as assumed until a product standard or mill certificate is attached.

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
index.html                    browser test bench
src/app.js                    interface and analysis orchestration
src/solver/                   section, beam, column and matrix solvers
src/data/materials.js         source-labelled material datasets
src/components/               calculated specimen visualisation
docs/ENGINEERING_BASIS.md     equations, assumptions and modelling limits
docs/VALIDATION_MATRIX.md     benchmark register and verification status
docs/SOURCES.md               bibliographic records and extracted values
```

## Current engineering boundary

The foundation solver is benchmarked against initial closed-form elastic cases; it is not yet the full nonlinear laboratory. Local tube-wall buckling, lateral-torsional buckling, connection flexibility, wood fracture, moisture/time effects, plasticity and probabilistic material variability remain explicit future modules.

## Engineering notice

This software is for research, education and preliminary engineering comparison. Published material properties are not a substitute for project-specific testing, code checks or professional engineering judgement. Results must not be treated as certified capacities.