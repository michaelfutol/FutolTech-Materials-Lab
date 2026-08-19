# C-Purlin Physics Bench · Shared Comparison Rule

The public C-purlin lesson remains a controlled comparison, not three independent tests.

## Canonical lesson

- Member A: C-purlin Orientation 0°
- Member B: the same C-purlin at Orientation 90°
- Member C: optional third C-purlin specimen
- Default rafter spacing / purlin span: 2.0 m
- Default roof slope: 0°
- Point load: one shared center point-load history from zero to the first gross-section yield reference among all active members

## Shared controls

The Physics Bench has one shared rafter-spacing/span control, one shared roof-slope control and one shared animation duration. These controls apply to every active member at the same time. The solver therefore compares member response under one common environment rather than allowing each member to receive its own span, slope or load history.

If Member C is enabled from the Physics Bench while the Direct Compare third slot is not already a C-purlin, the bench initializes Member C as another C100 specimen at 180° display orientation. The user may then select another C-purlin or orientation. In the current gross-axis model, 0°/180° share the major-axis screening state and 90°/270° share the minor-axis screening state; opening-direction torsion and shear-centre effects remain future cold-formed physics.

## Engineering boundary

The simply-supported benchmark deliberately isolates gross section orientation. The actual roof assembly context remains roof sheet tek-screwed to C-purlin and C-purlin welded to rafters, but weld rotational stiffness, screw restraint, roof-sheet restraint, effective width, local/distortional/LTB behavior, torsion and post-yield response are not credited until separately modeled and calibrated.
