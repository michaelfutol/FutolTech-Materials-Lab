# Roof Resilience Physics Milestone Status

Status date: 2026-08-24

- [~] **M0 — Product cleanup / navigation:** primary workflow + Advanced/R&D hub implemented; legacy page-level navigation cleanup and first-time-user responsive QA remain.
- [x] **M1 — C-Purlin Gravity + Wind Physics Bench:** core solver, animation/video and browser regression implemented; permanent gross-section/cold-formed boundaries remain explicit.
- [x] **M2 — Roof Bay Physics:** CLOSED after PR #112 final-head Engineering Checks passed and merged.
  - [x] PR #108 — two-rafter Roof Bay, tributary routing, reactions and conservation.
  - [x] PR #109 — selected purlin/tributary/reaction/formula trace, exploded load path and stable project JSON.
  - [x] PR #110 — custom/nonuniform purlin stations with exact physical tributary-band boundaries.
  - [x] PR #111 — Rafter A/B reaction diagrams with roof-normal/down-slope conservation.
  - [x] PR #112 — M3-ready pressure-zone schema/coordinate-frame placeholders with zero invented code zones.
  - [x] M2 exit gate: applied roof load and reactions conserve within numerical tolerance and the solver/visual paths share the same geometry.

- [x] **M3 — Code Wind / Roof Zoning:** CLOSED through PR #135; exact documentation-updated closure head passed 46/46 Engineering Checks and merged to `main` as `c81032f977d35025474b495c6bf82cbc88bf1bdc`.

  ### M3 provenance and pressure foundation
  - [x] PR #113 — adopted code/version + wind-input provenance.
  - [x] PR #114 — benchmarked velocity-pressure chain; Exposure C / `h=8.82 m` / `V=240 kph` / `Kzt=1.0` gives `qh = 2.257467958862151 kPa`.
  - [x] PR #115 — source-backed project wind-input acceptance with no reconstructed/guessed wind-map table.
  - [x] PR #116 — accepted project wind inputs integrated into Roof Bay/project JSON while manual pressure remains available.
  - [x] PR #117 — source-backed enclosure + roof/building geometry acceptance.
  - [x] PR #118 — pressure-context integration into Roof Bay/project JSON.
  - [x] PR #119 — base `GCpi` foundation: open `0.00`, enclosed `±0.18`, partially enclosed `±0.55`.
  - [x] PR #120 — engineer-gated large-volume partially-enclosed `Ri`; benchmark `Ri = 0.8535533905932737` for `Vi=6950 m³`, `Aog=1.00 m²`.
  - [x] PR #121 — reusable internal-pressure velocity/signed-term foundation; the Part 3 opening-height `qi=qz` path remains blocked from the current low-rise Part 1 C&C procedure.
  - [x] PR #123 — roof-purlin Components & Cladding target + coefficient-selection effective wind area, kept distinct from physical load area.
  - [x] PR #124 — symmetric-gable field/edge/corner geometry with exact purlin tributary-band intersections and area conservation.
  - [x] PR #127 — external roof `GCp` selection per actual zone portion.
  - [x] PR #128 — external-only `qh × GCp`.
  - [x] PR #129 — low-rise Part 1 `p = qh[(GCp)-(GCpi)]` net-pressure matrix plus ±0.77 kPa directional design envelopes.

  ### M3 physical routing and structural-action chain
  - [x] PR #130 — exact physical Roof Bay code-pressure routing; each field/edge/corner rectangle uses `F=pA`, true spanwise resultants, and per-piece/purlin/bay area-force-moment conservation.
  - [x] PR #131 — separate signed `W-TOWARD` / `W-AWAY` identities and source-backed W contributions for supported NSCP strength templates.
  - [x] PR #132 — source-backed D/Lr companion actions routed through the same physical geometry. Purlin self-weight remains a separate line action inside D; L/H are explicit target-specific zero/not-applicable decisions; R remains `UNRESOLVED`.
  - [x] PR #133 — complete strength-combination action-result assembly. With unresolved R, 203-3/203-4 remain blocked and only 203-6 is complete; the Lr alternatives require an explicit engineer-sourced `lr-selected-r-not-applicable` decision. Exact force/moment/purlin conservation remains protected.
  - [x] PR #134 — controlled code-derived Roof Bay activation. It selects one already-complete equilibrium-verified #133 case, never recomputes upstream pressure/combination physics, retains the original M2 manual-uniform fallback, attaches the validated activation to project JSON, and invalidates it on stale project/upstream changes.

  ### M3 independent exit audit — PR #135
  - [x] Exit audit independently re-evaluates the benchmark from accepted site/project inputs rather than trusting copied intermediate solver outputs.
  - [x] Exposure-C `Kz` and `qh = 0.613 Kz Kzt Kd V²` reproduce `2.257467958862151 kPa`.
  - [x] Figure 207E.4-2B external `GCp` values are independently reconstructed from the stored 10–100 ft² log10 curve equations/plateaus.
  - [x] Every raw `qh[(GCp)-(GCpi)]` pressure and its ±0.77 kPa governing directional design envelope is independently reproduced.
  - [x] Every physical zone-piece load is independently reproduced as `F=pA`, including exact Rafter A/B reactions and applied moments from the true spanwise centroid.
  - [x] D and Lr are independently reconstructed from roof area and separate purlin self-weight, then resolved by the accepted 25° slope.
  - [x] The selected `NSCP-203-4` away case is independently reconstructed as `1.2D + 1.0W + 0.5Lr` for the explicit benchmark Lr path.
  - [x] Controlled activation exposes exactly the audited complete combination result and retains manual fallback.
  - [x] Exit review found and fixed a general-case activation integrity gap: centerline station equality alone was not enough to prove identical physical load area. Activation now requires exact station/start/end/width agreement for every derived purlin tributary band.
  - [x] Adversarial regression builds a fully valid upstream M3 assembly with unchanged purlin stations but shifted tributary boundaries; activation correctly rejects it.
  - [x] **Written M3 exit gate satisfied and merged:** accepted project/site inputs → `qh` → `GCp/GCpi` → net zone pressure → exact physical purlin-piece routing → Rafter A/B → signed W → companions → complete source-backed strength combination → controlled activation, with provenance/identity/conservation and independent benchmark checks.

  ### Permanent post-M3 boundaries
  - [!] M3 closure does not promote purlin member stress/deflection/capacity under code-derived piecewise demand.
  - [!] Roof-sheet, screw/fastener and purlin-to-rafter connection demand/capacity remain M4/later work.
  - [!] Rafter/truss/system interaction remains M6 work.
  - [!] Cold-formed effective-width/local/distortional/LTB design remains M7 work.
  - [!] Rain `R` is not implemented and is never inferred as zero. The Lr path is released only by the explicit engineer-sourced R-not-applicable decision contract.
  - [!] Public project calculations remain cross-checks, not substitutes for an authorized governing NSCP copy; `authorizedCopyReviewRequired=true` remains permanent for project use.

- [~] **M4 — Roof Sheet + Fastener / Connection Layer:** ACTIVE.
  - [x] PR #136 candidate — explicit physical roof-sheet fastener layout geometry foundation: one fastener row per purlin, explicit along-span screw stations, midpoint tributary strips crossed with exact purlin tributary bands, irregular/custom layouts, exact area conservation, deterministic mutation/stale-project rejection, and forced `UNRESOLVED` capacity state.
  - [x] Preliminary exact implementation head `d60aa4e78e4d7aaebcd8cba82be0034d672b5f96` passed the complete **46/46 Engineering Checks** suite.
  - [!] Existing timber nail/bolt Connection Lab equations are not roofing self-drilling-screw capacity and must not be reused as such.
  - [ ] Next M4 slice — intersect verified M3 field/edge/corner pressure pieces with each accepted fastener tributary rectangle to derive individual signed screw demand with exact area/force conservation, still without a pull-out/pull-over/sheet/connection-capacity claim.
  - [ ] Later M4 slices — verified roof-sheet demand/capacity, source-backed Tek-screw pull-out/pull-over/bearing where data exists, edge/corner densification, purlin-to-rafter cleat/bolt/weld demand and governing connection state.
  - [ ] M4 exit gate — no roof-system PASS unless every required modeled connection in the load path is checked or explicitly marked unresolved.

- [ ] **M5–M13:** follow `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` in order unless an explicit engineering dependency requires resequencing.

Rule: after each completed Roof Resilience task, update this scoreboard, `STATUS-ROOF-RESILIENCE.md`, `ACTIVE_MILESTONE.md`, and `STRUCTURAL_LAB_MASTER_CHECKLIST.md` before the next feature merge. Do not use chat memory as the implementation record.
