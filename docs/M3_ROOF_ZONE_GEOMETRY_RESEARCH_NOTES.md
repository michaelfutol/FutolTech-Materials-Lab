# M3 Roof Zone Geometry — Source Checks

This note records the source checks used to shape the implementation candidate. It is not a substitute for an authorized NSCP copy.

- NSCP 2015 Part 1 Components & Cladding uses Figure 207E.4-2B for gable/hip roofs with `7° < theta <= 27°` and Figure 207E.4-2C for gable roofs with `27° < theta <= 45°`.
- The notation for edge dimension `a` is 10% of the least horizontal dimension or 0.4 times the applicable roof-height reference, whichever is smaller, but not less than either 4% of the least horizontal dimension or 0.9 m.
- For low slopes at or below 10°, the figure notation uses eave height rather than mean roof height.
- Zone geometry is based on horizontal-plan edge distance `a`; when represented on a sloped roof surface, the eave-normal distance is mapped by `a/cos(theta)`.
- The initial solver supports a symmetric gable roof only. Ridge-adjacent area is not modeled as an exterior-edge strip; edge and corner zones are formed from eave and gable-end strips.

Project use requires engineer verification against an authorized code copy before external coefficients or final pressures are accepted.
