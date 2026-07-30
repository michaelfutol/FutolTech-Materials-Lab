# Engineering Basis — Foundation Release

## Purpose

FutolTech Materials Lab is a source-backed virtual test bench for individual structural members. The calculation engine is deliberately separated from the visual layer so that every graphic can be traced to solver output.

## Units

The solver uses a consistent N–mm–MPa system internally:

- force: newtons
- length: millimetres
- stress and modulus: MPa = N/mm²
- second moment of area: mm⁴

User inputs and reports may display metres and kilonewtons, but conversion occurs at the solver boundary.

## Beam model

The foundation release uses a two-node Euler–Bernoulli beam finite element with two degrees of freedom per node: transverse displacement and rotation. Point loads are inserted as exact nodes, allowing the load to be placed anywhere along the member without using a separate closed-form equation for each position.

Supported idealised end restraints:

- fixed
- pin
- roller
- free

The current line-element result covers elastic bending, reactions, internal end moments, stress and deflection. It does not yet cover shear deformation, lateral-torsional buckling, local plate buckling, connection flexibility, fracture or plastic hinge spread.

## Column model

The foundation column module calculates:

- area and weak-axis radius of gyration
- idealised effective-length factor K
- slenderness KL/r
- Euler elastic critical load
- material squash/compression reference
- governing predicted capacity as the lesser of Euler and material compression
- elastic axial shortening
- eccentric-load moment and an elastic secant-style P–Δ amplification

The K factors are idealised and require later connection-stiffness modelling. Pin and roller are treated as rotation-free but laterally restrained in the buckling plane.

## Material evidence

Each dataset stores a source label, evidence status, confidence and limitations. The initial coconut-wood dataset is based on Aaron Erickson and Ian N. Robertson, *Structural Properties of Coconut Wood*, University of Hawaiʻi Research Report UHM/CEE/07-02, April 2007.

The selected full-scale rectangular-member averages are:

- wet density: 0.91 g/cm³
- modulus of elasticity: 13.1 GPa
- maximum bending stress: 72.9 MPa
- proposed safe allowable bending stress: 2,230 psi, approximately 15.4 MPa

The stored 46.2 MPa compression reference is only a provisional average from short, approximately 8-inch-diameter round-log specimens. It is not a verified sawn 2×4 compression value. The report also states that its full-scale rectangular-member tests were conducted similarly to ASTM D198 but did not strictly follow every requirement, and some moisture and environmental records were incomplete.

The generic steel datasets are intentionally marked assumed and low confidence. “GI” identifies galvanised coating, not base-steel grade.

## Engineering boundary

This software is for research, learning and preliminary comparison. It does not create certified material properties or code-compliant member capacities. Project use requires verified materials, appropriate design standards, connection checks and licensed professional review.
