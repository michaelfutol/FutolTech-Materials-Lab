# FutolTech Structural Lab

**Virtual Materials, Members & Connection Testing**

FutolTech Structural Lab is a source-backed structural engineering laboratory for testing, comparing and understanding materials, individual members, connections and small assemblies before they are promoted into whole-structure models.

The project began as **FutolTech Materials Lab** and later expanded beyond the earlier **Native Structures / FutolNative Structures** scope. Materials Lab remains the verified member-analysis core, but the product now includes Philippine-market steel products, timber, bamboo, shoring, splice demand, nonlinear steel-yield experiments, optimization and a staged path toward connections, assemblies, failure physics and frame analysis.

The public product name is **FutolTech Structural Lab**. The company/report identity remains **FUTOLTECH ENGINEERING AND PROJECT SYSTEMS**.

## Live development site

https://michaelfutol.github.io/FutolTech-Materials-Lab/

Deployment source: GitHub Actions  
Default development branch: `main`

The repository and Pages URL intentionally retain the original `FutolTech-Materials-Lab` path for continuity. Repository renaming is a separate administrative step and is not required for the public product rebrand.

## Product doctrine

Structural Lab must remain auditable and conservative about what each model proves.

- Never invent missing material strength, section dimensions, folded geometry, mass, connection capacity or failure laws.
- Keep material-property evidence separate from local-market availability observations.
- Distinguish **PASS / PRELIM PASS / SCREENING / FAIL** according to the implemented physics.
- Every important result should be independently traceable by equations, source records or benchmark tests.
- Stateful UI features require real-browser regression tests where practical.
- Critical engineering reports must pass physical PDF pagination/overflow QA.
- Whole-building analysis remains a different layer; Structural Lab specializes in materials, members, connections, assemblies and failure behavior.

## Current modules

```text
FutolTech Structural Lab
├── Materials Lab                    active
│   ├── actual dimensions / catalog properties
│   ├── elastic beam bending
│   ├── column compression, eccentricity and Euler buckling screening
│   ├── 0° / 90° / 180° / 270° section orientation
│   └── one-touch load ramp to the strongest supported terminal reference
├── Direct Compare                   active
│   ├── 2–3 members under one common load/boundary case
│   ├── bending and compression
│   ├── animated last-passing-load search
│   └── branded manual-calculation comparison report
├── Section & Materials Library      active
│   ├── source and market status
│   ├── visual section sketches
│   ├── GI pipe / SHS / RHS / H / C-purlin / angle records
│   └── timber, bamboo, metal-stud and furring records
├── Concrete Slab Shoring            experimental
├── Bamboo Culm Lab                  experimental
├── Stock Length & Splice Designer   active demand planner
├── Steel Yield Lab                  experimental
├── Load-Driven Recommender          experimental
├── Connection Lab                   next major physics module
├── Assembly Lab                     planned
├── Failure Physics Lab              planned / partial foundations
├── Frame Analyser                   planned
└── Design Explorer                  expanding
```

## Current section/product coverage

### Solver-ready or screening-capable

- solid rectangle
- solid round
- CHS / GI pipe
- RHS / SHS
- user-defined catalog sections
- JIS H-section starter catalog
- Philippine C-purlin gross-section screening
- angle bar / L-section using actual A × B × t with an idealized sharp-corner gross-property model
- SHS 100×100×2.0 mm user-observed Philippine-market preset pending supplier/certificate verification

### Library-only until adequate geometry/design basis exists

- selected Philippine metal studs
- double metal furring
- product records with incomplete fold geometry or unknown grade

Library-only status is intentional: visibility does not imply solver approval.

## Materials and grade policy

Material properties and product geometry are separate objects.

- **GI** describes galvanizing/coating; it is not a steel grade.
- **steel pipe** and **SHS/RHS** are different product families even when geometrically similar.
- provisional 250 MPa and 345 MPa steel records are sensitivity/baseline datasets until the delivered product grade is verified.
- timber species, moisture, grade, defects and legal origin remain essential project inputs.
- bamboo geometry and properties require specimen-specific verification.

## Manual calculation and report philosophy

Direct Compare produces the FT-CS-01 engineering report with intentional A4 landscape pages. The report includes:

- test arrangement and selected alternatives
- side-by-side engineering results
- section-property derivation
- C-purlin orientation trace where applicable
- reactions, moment, stress and serviceability hand checks
- comparison of closed-form checks against FEM output
- explicit engineering boundaries and required verification

The report letterhead uses **FUTOLTECH ENGINEERING AND PROJECT SYSTEMS** and the engineer identity configured in the print module.

## Roadmap source of truth

The permanent implementation checklist is:

`docs/STRUCTURAL_LAB_MASTER_CHECKLIST.md`

That file records the full roadmap, current status, engineering blockers and the definition-of-done gates for every new feature. Chat history is not the only project record.

Major roadmap families:

1. Material Intelligence
2. Section & Product Digital Twins
3. Universal Virtual Test Machine
4. Failure Physics Lab
5. Connection & Splice Laboratory
6. Assembly Lab
7. Design Explorer
8. Physical-Test Calibration
9. Structural Forensics Mode
10. Field Mode
11. Frames and system-level bridge
12. FutolStructure / RPE / CODA / SARA integration

## Ecosystem boundary

### Structural Lab
Answers: **What can this material, member, connection or assembly physically do, under what evidence and assumptions?**

### FutolStructure
Uses validated component objects to model and design structural systems.

### Resilience Physics Engine (RPE)
Consumes component failure/degradation laws for extreme-event and progressive-failure simulation.

### CODA / SARA
Provide governing-code compliance and standards/best-practice layers without contaminating raw material-property evidence.

Structural Lab should not become an ETABS clone. Whole-building system analysis belongs to FutolStructure and specialist solvers; Structural Lab remains the component-level testing and evidence engine.

## First integrated frame benchmark

**NF-001 — 3 m × 3 m coconut-lumber wall frame** remains the first staged frame benchmark after the required connection and assembly physics are mature enough.

Expected future outputs include member forces, joint slip, drift, governing limit state, progressive release/redistribution, brace alternatives and connection-aware optimization.

## Run locally

No framework installation is required for the static browser app. Serve the repository, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Run engineering verification with Node 22 or newer:

```bash
npm run verify
```

The verification chain includes syntax checks, deterministic engineering/data tests, real Chromium interaction tests and the Direct Compare physical PDF gate.

## Engineering notice

FutolTech Structural Lab is for research, education and preliminary engineering comparison. Published or provisional material properties are not substitutes for project-specific testing, governing code checks, verified product certificates, complete connection design or professional engineering judgement. Results must not be treated as certified capacities beyond the explicit status and model boundary shown by the software.
