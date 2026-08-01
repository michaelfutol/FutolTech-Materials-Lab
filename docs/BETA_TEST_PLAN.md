# FutolNative Structures — Beta Stabilization Test Plan

Status: feature-frozen for user testing

## Purpose

Use the live GitHub Pages app repeatedly to find numerical, workflow, UI, naming, source-data, and browser issues before adding more major features.

## Test rule

For every issue, record:

- page/module
- exact inputs
- expected behavior
- actual behavior
- screenshot
- browser/device
- whether Ctrl+F5 changes the result

## Core test matrix

### Materials Lab

- Beam: pin + roller, cantilever left/right, fixed-ended cases where supported
- Column: end restraints, eccentricity direction, weak-axis buckling
- Actual section dimensions and 90° rotation
- kgf/kN/tf conversion
- serviceability, allowable, yield, rupture and buckling warnings

### Steel Yield Lab

- preset switching and custom RHS/SHS sizes
- below-yield unload returns to zero
- above-yield unload leaves residual deformation
- load cap and unsupported-case warnings
- timeline playback and manual scrubber

### Bamboo Culm Lab

- butt-left versus butt-right
- mean-E versus minimum-E
- variable butt/middle/top geometry
- pin + roller and cantilever behavior
- permissible and characteristic threshold warnings

### Stock & Splice

- all visual splice cards
- material filtering
- stock-piece count, overlap and waste
- feasible splice zone
- shear/moment demand at splice
- provisional-capacity warnings

### Load Recommender

- wood, bamboo, steel and mixed searches
- 100 kgf, 1,000 kgf and higher-load cases
- centre and off-centre point loads
- lowest mass versus lowest utilisation
- classical versus local QUBO agreement
- Library links and product naming

### Section & Materials Library

- pipe versus SHS/RHS naming
- section sketches and dimensions
- Apitong, Yakal, Red Lauan, White Lauan, Tanguile and Narra search
- inactive/pending records never enter the solver
- source and market-status display

## Severity

- P0: unsafe or materially wrong numerical result
- P1: wrong recommendation, missing warning, stale input, or silent reset
- P2: misleading label, visualization, unit, or workflow problem
- P3: cosmetic or convenience issue

## Feature freeze

During stabilization, merge only:

- bug fixes
- numerical validation improvements
- clearer warnings and labels
- missing tests
- source corrections
- small usability fixes discovered during testing

Defer major new modules, large catalogs, remote BlueQubit integration, full frame analysis, connection design, and nonlinear timber fracture until the beta backlog is understood.
