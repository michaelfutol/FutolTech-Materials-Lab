# FutolTech Structural Lab — Phase 2 Checklist

> Phase 1 foundation milestones 1–10 are complete. This file is the bounded execution list for the next visible/physics expansion. Keep source engineering truth separate from visualization.

## Non-negotiable Phase 2 rules

- Visualization consumes solver states; it never invents structural physics.
- Yield load/time, instability events and other markers must trace to deterministic solver data.
- A displayed time requires an explicit load-time history. Quasi-static virtual time is not dynamic time integration.
- No decorative cracking, snapping, local buckling, fracture, post-buckling or residual stiffness without a validated model/evidence source.
- Browser visualization and Blender are renderers, not engineering truth engines.
- RPE remains the whole-structure hazard/progressive-failure simulator; Structural Lab remains specimen/member/connection/assembly testing.

## Phase 2 execution chunks

### 2A — SIM-VIZ-001 Specimen Simulation Console — COMPLETE

- [x] Solver-driven beam/column specimen playback shell.
- [x] Explicit user-selected quasi-static loading rate, kN/s.
- [x] Virtual test time derived from applied load / selected loading rate.
- [x] Live load, deflection/stress response and crossed governing event.
- [x] PLAY action delegates to the existing trusted Run-to-Governing-Limit solver path.
- [x] Beam displayed deformation follows current solver deflection and selected magnification.
- [x] Column remains visually straight until an implemented stored instability event is crossed.
- [x] Dynamic-time disclaimer visible in the UI.
- [x] Real Chromium SIM-VIZ regression green on PR head before merge.
- [x] Existing full Structural Lab/PDF gates remain green before merge.

### 2B — PRINT-TYPE-001 FutolTech Typewriter Print Theme — NEXT

- [ ] Optional/default clean typewriter typography for engineering printouts.
- [ ] Use an open-licensed embeddable typewriter family; do not distribute font files from tooling environments.
- [ ] Target approximately 11 pt body text, with tables only reduced where necessary for pagination.
- [ ] Preserve current clean FutolTech letterhead, whitespace, equations and tables.
- [ ] Font only: no aged paper, notebook ruling, scribbles or decorative distressing in formal reports.
- [ ] PDF pagination/blank-page Chromium regression required.

### 2C — SKETCH-001 Engineering Pencil Illustration Theme

- [ ] Optional hand-drawn/pencil line style for specimen figures, sections, supports, arrows and FBDs.
- [ ] Optional handwritten-style dimension labels while numeric equations/results stay clear and typed.
- [ ] Geometry/dimensions must be generated from the same section/member state used by the solver.
- [ ] Standard Engineering linework remains available for formal submission.
- [ ] Pencil style must never distort dimensions or hide orientation.

### 2D — SIM-VIZ-002 Side-by-Side Comparison Playback

- [ ] Synchronize Member A/B/C under the exact same load-time history.
- [ ] Show live P, M/P, stress, deflection/utilization and governing event for each member.
- [ ] C-purlin 0° vs 90° becomes a canonical visual benchmark.
- [ ] Pause/step/scrub timeline.
- [ ] Export deterministic simulation-state JSON for external rendering.

### 2E — VIDEO-001 Blender Rendering Export

- [ ] Define versioned simulation-frame JSON contract.
- [ ] Blender Python importer creates geometry/materials/camera/load arrows/event overlays from Structural Lab/RPE state data.
- [ ] Blender only renders supplied states; it does not calculate yield/fracture/capacity.
- [ ] Automated MP4 render proof-of-concept for one canonical member test.
- [ ] Later reuse the same frame contract from RPE whole-structure simulations.

### 2F — Deeper validated specimen physics

- [ ] Tension.
- [ ] Shear.
- [ ] Bearing/crushing.
- [ ] Combined axial + bending.
- [ ] Steel local plate/wall buckling and LTB.
- [ ] Cold-formed C-purlin/stud local/distortional/global interaction using an appropriate validated method/solver.
- [ ] Timber splitting/shear/bearing/withdrawal damage laws after validation.
- [ ] General nonlinear unload/reload only where constitutive law is supported.
- [ ] OpenSees/other specialist solver bridge where higher-fidelity nonlinear response is warranted.

### 2G — Physical laboratory calibration bridge

- [ ] Connect CAL-001 evidence packages to engineer-approved parameter adoption.
- [ ] Preserve raw physical test evidence and version every adopted calibration.
- [ ] Report predicted-vs-measured bias/scatter by specimen family.
- [ ] Use real laboratory data to validate/calibrate simulation event thresholds and response curves.
- [ ] Never silently rewrite published/source properties.

## Deployment note

- 2026-08-19 — GitHub Pages public URL returned 404 after the Structural Lab source repository became private. Keep the source private. Preferred public-test architecture is a Vercel deployment connected once to the private Git repository, after which deployments can be managed separately from source visibility.
