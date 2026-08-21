# FutolTech Roof Resilience Physics — Milestone Roadmap

## Purpose
Evolve the current member-level Materials / Structural Lab into an explainable, source-backed roof-system design and resilience environment. The visual experience must remain understandable to engineers, builders, clients and students while every displayed result remains traceable to an explicit solver assumption, code basis, catalog source or user input.

## Governing product principles
- Keep the original C-Purlin point-load/orientation Test Bench as a stable educational benchmark.
- Keep the C-Purlin Gravity + Wind Physics bench as a separate load-case learning environment.
- Never use a visual animation to claim physics that the implemented solver does not contain.
- Separate code-required design from optional enhanced-resilience scenarios.
- A named extreme-typhoon scenario must resolve to explicit wind speed/hazard data, exposure, topography, internal pressure, roof zones and adopted code provisions; it must never be an unexplained multiplier.
- Preserve a visible load path: roof pressure -> sheet -> fasteners -> purlins -> rafters/trusses -> supports -> vertical/lateral system.
- Display source, assumptions, confidence/boundary and engineer-review status wherever the software moves from education into design recommendation.

## M0 — Product cleanup and navigation architecture
Goal: make every public tab self-explanatory before adding system complexity.

Deliverables:
- Audit every current tab against a plain-language question: “What problem does this page solve?”
- Primary navigation: Materials Comparison, C-Purlin Test, Roof Load Cases, future Roof System.
- Move research/advanced utilities that do not belong in the primary workflow into an Advanced / R&D group rather than deleting useful engineering capability.
- Consistent PaperMatte / Lab Dark, branding, print, video and shared units.
- No specialist C-purlin UI may leak into generic material tests.

Exit gate: a first-time engineer can identify the correct tool without prior explanation.

## M1 — C-Purlin Gravity + Wind Physics Bench
Goal: explain why gravity and wind are different load vectors on a sloping roof and how section orientation changes gross elastic response.

Deliverables:
- Gravity Only, Wind Only, Combined Gravity + Wind and Governing Uplift/Downward Envelope modes.
- Separate net uplift and net downward design-pressure inputs.
- Vertical gravity resolved into roof-normal and down-slope components.
- Roof-normal wind load.
- Area load x tributary width -> purlin line load.
- Purlin self-weight.
- 0/90/180/270-degree orientation mapping to gross major/minor axes.
- Simply-supported UDL moment/deflection equations and gross biaxial stress screen.
- Individual first-yield snapshots, gradual animation and PaperMatte/Lab Dark WebM export.
- Explicit boundary: no effective-width, local/distortional/LTB, fastener/cleat/weld or post-yield claim yet.

Exit gate: deterministic solver tests + real-browser gradual-animation/video regression.

## M2 — Roof Bay Physics (2D / 2.5D)
Goal: move from one isolated purlin to one physically understandable roof bay.

Geometry:
- Two adjacent rafters/truss lines.
- Multiple purlins at explicit spacing.
- Roof sheet spanning across purlins.
- Fastener locations shown but initially demand-routing only.
- Transparent/ghosted supporting frame context.

Physics:
- Tributary areas for interior, edge and end purlins.
- Roof sheet -> purlin -> rafter reaction transfer.
- Gravity and user-supplied wind pressures.
- Purlin reactions and rafter line/point loads.
- Animated load path with conservation checks.

Visuals:
- Toggle roof sheet opacity.
- Exploded load-path view.
- Member selection highlights corresponding formulas and diagrams.

Exit gate: summed reactions balance applied roof load within numerical tolerance.

## M3 — Code Wind / Roof Zoning Engine
Goal: replace user-entered net wind pressure with a reproducible code-derived option while keeping manual pressure entry available.

Inputs:
- Adopted code/version.
- Site/location or explicit basic wind speed.
- Risk/importance category.
- Exposure/terrain.
- Topographic factor where applicable.
- Enclosure/internal pressure classification.
- Building height and roof geometry/slope.
- Roof plan dimensions.

Outputs:
- Velocity pressure chain with visible substitutions.
- External/internal pressure coefficients.
- Field, edge and corner zones.
- Positive/downward and suction/uplift cases.
- Traceable load combinations.

Modes:
- Code Minimum / Required Baseline.
- Enhanced Resilience Scenario.
- User-defined / research scenario.
- Historical or synthetic typhoon scenario only when its hazard inputs are explicitly sourced.

Exit gate: benchmark examples independently reproduce hand/code calculations within declared tolerance.

## M4 — Roof Sheet + Fastener / Connection Layer
Goal: stop treating load transfer to the purlin as automatic.

Checks:
- Roof-sheet pressure demand.
- Tek-screw tributary demand and spacing.
- Pull-out / pull-over / bearing references where verified data exists.
- Purlin-to-rafter weld/cleat/bolt demand.
- Uplift reversal and connection governing state.
- Edge/corner fastener densification scenarios.

Visuals:
- Click a screw/cleat/weld to expose its demand path.
- Connection utilization heat map.
- Distinguish “member passes” from “connection unresolved/fails.”

Exit gate: no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

## M5 — Transparent 3D Roof Viewer
Goal: deliver the dream visual language without yet pretending the entire building is a high-fidelity FE model.

Rendering:
- Three.js roof-first perspective.
- Adjustable roof-sheet transparency.
- Ghosted walls, beams and columns for orientation only.
- Purlins, rafters/trusses, bracing and connections remain visually dominant.
- Orbit, section-cut, isolate-member and explode controls.

Live overlays:
- Gravity arrows.
- Wind pressure arrows by roof zone.
- Reaction/load-path arrows.
- Deflected shape with explicit magnification factor.
- Demand/capacity colors with accessible numeric labels.

Synchronization:
- Selecting a 3D member highlights the same member in formulas, charts and report data.

Exit gate: 3D geometry is driven from the same project data object used by the solver; no duplicated visual-only dimensions.

## M6 — Full Roof Structural System Solver
Goal: analyze interaction among roof members rather than independent beams only.

Scope:
- Multi-span purlins where applicable.
- Rafters / simple trusses / roof beams.
- Explicit bracing and sag-rod/tie behavior where modeled.
- Support releases and boundary conditions.
- Reaction transfer into supporting beams/columns as context.
- Serviceability and strength envelopes.

QA:
- Closed-form single-member benchmarks.
- Frame/truss benchmark models.
- Equilibrium/load conservation.
- Cross-check selected cases against ETABS/SAP2000/STAAD or other trusted solver output when appropriate.

Exit gate: solver hierarchy and assumptions are published and benchmarked before being labeled design-capable.

## M7 — Cold-Formed Steel Design Layer
Goal: graduate C-purlins from gross-section screening into defensible design checks.

Scope, subject to adopted code and verified implementation:
- Effective-width / local buckling.
- Distortional buckling.
- Lateral-torsional / flexural-torsional behavior as applicable.
- Interaction equations.
- Restraint assumptions from roof sheeting and bridging only when justified.
- Manufacturer/product-specific properties where certificates or reliable tables are available.

Exit gate: every promoted design check has a code clause/equation trace and regression benchmark.

## M8 — Automatic Roof Design / Resizing Engine
Goal: visually answer “what changes when we design for this hazard target?”

Comparison states:
- Existing / user-selected roof.
- Code Minimum design.
- Enhanced Resilience design.
- Explicit extreme-wind scenario.

Variables the optimizer may change only within user-approved catalogs/rules:
- Purlin section/thickness.
- Purlin spacing.
- Rafter/truss member sizes.
- Bracing layout.
- Roof-sheet thickness/profile where modeled.
- Fastener spacing/count/type from verified catalog constraints.
- Connection size/detail.

Objectives:
- Lowest mass.
- Lowest verified cost when price data exists.
- Minimum changes to existing design.
- Maximum reserve within a budget/mass constraint.

Visual output:
- Members resize live between scenarios.
- Before/after quantities and utilization.
- Explain every change: “C100x0.8 -> C100x1.2 because corner-zone uplift/weak-axis check governed,” etc.

Exit gate: optimizer cannot select an option whose required checks are unresolved.

## M9 — Live Formula + Diagram Cockpit
Goal: make the mathematics move with the physics rather than live in a separate report.

Panels synchronized to animation time/load factor:
- Current load combination.
- Substituted equations and running numbers.
- Reactions.
- Shear diagram.
- Moment diagram.
- Axial force where applicable.
- Deflection diagram.
- Stress / utilization diagram.
- Connection demand.
- First-yield / governing-limit timeline.

Exit gate: every plotted point is derived from the same solver frame shown in 3D/video.

## M10 — Resilience / Failure Sequence Engine
Goal: connect Roof System work to the wider FutolTech Resilience Physics Engine without inventing failure behavior.

Capabilities:
- Event sequence: serviceability -> first modeled strength/connection limit -> subsequent modeled limits.
- Uplift reversal visualization.
- Sacrificial component / load-path consequences only where evidence/model exists.
- Continue-after-first-limit mode only for members whose post-limit law is implemented and evidence-bounded.
- Export stable component/failure objects to RPE.

Future advanced mechanics:
- Nonlinear connectors.
- Connection slip.
- Progressive roof-sheet detachment.
- Debris/wind interaction via specialist solvers when justified.

Exit gate: no cinematic failure without a solver/evidence law.

## M11 — Calibration + Local Philippine Product Data
Goal: make the roof engine increasingly representative of what can actually be bought and built locally.

Data:
- Manufacturer section tables/certificates.
- Steel grade/coating evidence.
- Roof-sheet and fastener product data.
- Local price/availability snapshots with timestamp/source.
- Lab tests and field validation via Calibration Lab.

Outputs:
- Source confidence badges.
- Uncertainty bands / sensitivity where data is provisional.
- No hidden substitution of generic properties for unresolved products.

Exit gate: every selectable design product states whether it is verified, generic sensitivity, provisional or library-only.

## M12 — Professional Design Package / Collaboration
Goal: turn the visual physics into reproducible engineering deliverables.

Outputs:
- A4 calculation report with equation traces, assumptions, code references and governing checks.
- Roof plan / member schedule / connection schedule.
- Scenario comparison: existing vs code minimum vs enhanced resilience.
- WebM teaching/client animation.
- JSON / Structural Interchange package.
- Links to FutolStructure / ETABS bridge workflows where appropriate.
- Revision hash / project provenance.

Exit gate: another engineer can reproduce the result from the exported project inputs and references.

## M13 — Dream Build: FutolTech Roof Resilience Physics Engine
The final integrated experience:

1. User creates/imports roof geometry or selects a template.
2. Transparent 3D roof appears with walls/columns/beams ghosted and roof structure dominant.
3. User chooses site/code baseline and optional enhanced/extreme hazard scenario.
4. The engine derives roof zones, gravity/wind load cases and combinations.
5. Loads visibly travel from sheet -> screws -> purlins -> rafters/trusses -> supports.
6. Formulas and numerical substitutions animate in sync with the load timeline.
7. Shear, moment, deflection, stress and connection diagrams update beside the 3D model.
8. The system identifies governing members/connections with transparent assumptions and confidence.
9. “Code Minimum” generates the smallest verified compliant configuration permitted by the enabled design checks/catalogs.
10. “Enhanced Resilience” or an explicit typhoon scenario shows exactly which member sizes, spacings, fasteners, braces or details must change and why.
11. Before/after 3D geometry morphs between designs while quantities, mass, cost (when sourced) and reserve ratios update.
12. A controlled resilience animation shows only implemented/evidence-backed limit states and failure progression.
13. User exports a professional report, video, interoperable project package and an auditable design history.

## Recommended immediate order after M1 visual QA
M0 navigation cleanup -> M2 Roof Bay -> M3 code wind/zoning -> M4 connections -> M5 transparent 3D -> M6 system solver -> M7 cold-formed design -> M8 automatic resizing -> M9 live diagrams -> M10 resilience -> M11 calibration/local catalogs -> M12 professional package -> M13 integrated dream build.
