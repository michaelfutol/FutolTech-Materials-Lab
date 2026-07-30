# Validation Matrix

| ID | Solver area | Reference case | Required result | Status |
|---|---|---|---|---|
| V-BM-001 | Beam | Simply supported, centre point load | δ = PL³/(48EI), Mmax = PL/4 | Automated |
| V-BM-002 | Beam | Cantilever, end point load | δ = PL³/(3EI) | Automated |
| V-BM-003 | Beam | Downward point load sign convention | Nodal transverse displacement is negative; SVG renders it below the undeformed line | Automated |
| V-BM-004 | Beam | Pin–roller versus roller–roller in vertical bending-only DOFs | Same flexural response; horizontal stability limitation documented | Automated |
| V-VIS-001 | Visualisation | Beam deformation at ×1 | Vertical pixels per millimetre equal horizontal geometric pixels per millimetre | Automated |
| V-VIS-002 | Visualisation | Requested deformation exceeds viewport | Display caps safely and reports effective magnification | Automated |
| V-SC-001 | Section | 50×100 mm solid rectangle | A, I and Z closed-form values | Automated |
| V-CL-001 | Column | Pin–pin Euler column | Pcr = π²EI/L² | Automated |
| V-CL-002 | Column | Fixed–fixed effective length | K = 0.5 | Automated |
| V-MAT-001 | Material | UH coconut rectangular-member averages | Dataset provenance review | Documented; independent extraction review pending |
| V-ST-001 | Steel | 50.8×50.8×1.5 RHS | Section-property independent cross-check | Pending |
| V-NL-001 | Nonlinear | P–Δ benchmark against nonlinear frame solver | Load–deflection curve | Future |
| V-LB-001 | Local buckling | Thin RHS shell benchmark | Critical load and mode | Future external FEA |
| V-TM-001 | Timber variability | Literature distribution / Monte Carlo | Capacity confidence band | Future |

No solver feature is labelled verified until an independent reference and tolerance are recorded here.