# C-Purlin Physics Test Bench · SIM-VIZ-003

## Purpose

This public demonstration makes the orientation effect of a cold-formed C-purlin understandable without hiding the mechanics behind a static PASS/FAIL table. The canonical test compares the same C-purlin at 0° and 90° under one rising center point load.

The visualization is solver-driven. Every displayed frame uses the same Structural Lab member-analysis path used by Direct Compare; the animation does not invent a separate visual-only capacity law.

## Canonical public test

- Section: Colorsteel C100 H100×B38×A15 × 0.80 mm preset
- Material reference: current selected steel dataset; canonical benchmark uses generic Fy = 250 MPa sensitivity
- Rafter spacing / C-purlin span: **2.0 m default**, adjustable from 0.8 m to 4.0 m
- Support idealization: simply supported
- Point load: center of span, increased from zero
- Public load readout: kgf (familiar kilogram-force equivalent), with kN retained as the solver/engineering unit
- Orientation A: 0°
- Orientation B: 90°
- Roof slope: 0° default, user-adjustable for the special C-purlin slope screening model
- Playback: 12 s dramatic default, with 16 s slow, 8 s normal and 5 s quick options
- Terminal event: **first gross-section yield reference reached by either compared member**

The common test stops at the first yield event. It does not extrapolate an unimplemented post-yield shape for the weaker member merely to make the video more dramatic.

## Live equations

For the 0° roof-slope benchmark with a simply supported center point load, the visualization reports the familiar elastic relations while the solver values change:

- `Mmax = P L / 4`
- `sigma = M / Z`
- `delta_max = P L^3 / (48 E I)`

When roof slope is non-zero, the vertical load is resolved into two components of the same vector:

- `P_perp = P cos(theta)`
- `P_parallel = P sin(theta)`

The current C-purlin slope model then performs gross biaxial elastic screening using the corresponding gross section axes. The original vertical load is not treated as a third independent load.

## Actual assembly context

The intended real roof assembly is:

- roof sheet **tek-screwed to the C-purlin**; and
- C-purlin **welded to the rafter**.

Version 1 does **not** automatically convert those physical details into a mathematically fixed-fixed member. Weld rotational stiffness, rafter stiffness, local wall deformation, screw restraint, sheeting restraint and roof-system load sharing require a connection/system model or physical calibration before their benefit can be credited.

The simply-supported benchmark is therefore deliberate: it isolates gross section orientation under common conditions.

## Video export

The browser creates a dedicated 1280×720 engineering animation canvas. The canvas contains the rising load arrow, both compared members, deflected shapes, orientation sketches, live equations, utilization state, span, slope and the first-yield target.

`RECORD + DOWNLOAD VIDEO` uses the browser `MediaRecorder` API with `canvas.captureStream(30)` and exports a WebM video when the test reaches first yield. No external screen-recording service is required.

The animation duration is presentation timing only. It is **not** physical dynamic time and must not be interpreted as impact, fatigue, earthquake or strain-rate behavior.

## Engineering boundary

C-purlin results remain **gross-section SCREENING**. This module does not yet claim a complete cold-formed steel design capacity. Pending advanced layers include:

- effective-width/local buckling;
- distortional buckling;
- lateral-torsional/torsional behavior;
- weld stiffness and failure;
- tek-screw restraint, pull-out/bearing and slip;
- roof-sheet restraint and diaphragm/load-path behavior;
- imperfections and residual stresses;
- nonlinear/post-yield material behavior; and
- physical laboratory calibration.

These are intended later RPE/Structural Lab extensions, not values to be guessed for a public animation.

## Public-access direction

The current direction is intentionally open for observation, testing and knowledge sharing. Access gating can be introduced later after the test bench and its validation/calibration workflow are mature.
