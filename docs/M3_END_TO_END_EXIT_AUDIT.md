# M3 Roof Resilience Physics — Independent End-to-End Exit Audit

Status: **EXIT-AUDIT CANDIDATE — M3 remains ACTIVE until the exact documentation-updated head passes the complete Engineering Checks suite.**

## Purpose

This record defines the final independent audit required by `ROADMAP-ROOF-RESILIENCE-PHYSICS.md` before the Code Wind / Roof Zoning Engine (M3) may be marked closed. M3 closure means the accepted project/site wind inputs can be reproduced through code-derived roof zoning/pressure, physical Roof Bay routing, signed wind-action identity, source-backed companion actions, complete supported strength-combination action result, and controlled project/UI activation. It does **not** mean purlin, roof-sheet, fastener, rafter, truss or connection capacity has been solved.

## Exit-audit benchmark

The deterministic benchmark uses the already source-gated M3 chain with:

- Site: Sta. Magdalena, Sorsogon, Philippines.
- Adopted code profile: `ph-nscp-2015-v1-7e-2p`.
- Occupancy category III.
- Basic wind speed: 240 kph, explicitly represented as an engineer transcription from the authorized code map.
- Exposure C.
- `Kzt = 1.0` from the accepted benchmark project record.
- Mean roof height: 8.82 m.
- Enclosed building, `GCpi = ±0.18`.
- Symmetric gable roof, 25° slope, Figure 207E.4-2B path.
- Roof Bay: 3.0 m rafter spacing × 4.0 m roof-slope length.
- Equalized maximum purlin spacing input: 0.8 m.
- Dead roof-area pressure: 0.20 kPa.
- Purlin self-weight benchmark: 0.05 kN/m per physical purlin.
- Roof live action `Lr = 0.75 kPa`.
- Rain `R` is not calculated by M3. For the complete 203-3/203-4 audit path, the benchmark uses the existing explicit engineer-controlled `lr-selected-r-not-applicable` decision contract; unresolved R remains blocked elsewhere.
- Selected activation audit case: `NSCP-203-4`, away-from-surface W, accepted Lr path.

## Independent calculations protected by the audit

`test/m3RoofEndToEndExitAudit.test.js` independently reconstructs the following without calling the corresponding downstream solver functions for the comparison calculation:

1. Exposure-C velocity-pressure coefficient and `qh = 0.613 Kz Kzt Kd V²`, reproducing `qh = 2.257467958862151 kPa` at the declared benchmark precision.
2. Figure 207E.4-2B roof-purlin external `GCp` values from the stored 10–100 ft² log10 curve equations/plateaus for every active field/edge/corner coefficient case.
3. Every raw low-rise Part 1 net pressure from `p = qh[(GCp) - (GCpi)]`.
4. The ±0.77 kPa Components & Cladding minimum applied only to the governing toward/away design envelopes.
5. Each physical zone-piece load from `F = pA`, plus Rafter A/B reactions from the true spanwise centroid and applied moment `F x̄`.
6. Whole-route force/reaction/moment totals for both `W-TOWARD` and `W-AWAY`.
7. Dead and roof-live gravity totals from physical Roof Bay area plus separate purlin self-weight, resolved into roof-normal and down-slope components by the accepted 25° slope.
8. The selected 203-4 away combination directly as `1.2D + 1.0W + 0.5Lr` for this target, with ordinary `L` already an explicit target-specific zero decision and the explicit Lr/R resolution record preserved.
9. Controlled Roof Bay activation must expose the exact verified complete combination result while retaining the manual-uniform fallback and all compatibility flags.

## Exit-audit hardening discovered during review

The audit found one general-case activation integrity gap after PR #134: exact purlin centerline stations were checked, but the activation contract did not independently compare the derived physical tributary-band start/end boundaries. Physical pressure demand is area-dependent, so station identity alone is not sufficient proof of identical load-area geometry.

The exit-audit branch therefore strengthens `futoltech.roof-bay-code-derived-activation/1` to require exact compatibility of:

- purlin station,
- tributary start,
- tributary end, and
- tributary width

for every purlin band.

An adversarial regression constructs a fully valid upstream M3 assembly with the same purlin stations but deliberately shifted first/interior tributary boundary. Controlled activation must reject that assembly as physically incompatible with the active Roof Bay project.

## Permanent boundaries after M3 closure

Even if this audit passes and M3 closes:

- The original C-Purlin Test Bench is retained.
- Manual-uniform Roof Bay pressure remains a separate explicit mode/fallback.
- Code-derived piecewise purlin stress, deflection and capacity are **not** M3 deliverables.
- Roof-sheet, screw/fastener and purlin-to-rafter connection demand/capacity belong to M4 and later verified connection work.
- System interaction, rafters/trusses and multi-span behavior belong to M6.
- Defensible cold-formed steel effective-width/local/distortional/LTB design belongs to M7.
- Rain load `R` remains unimplemented; no M3 record may infer `R=0` from absence. The Lr path may be released only by the existing explicit engineer-sourced R-not-applicable decision contract.
- Public government project calculations remain cross-check evidence, not a substitute for an authorized governing NSCP copy. `authorizedCopyReviewRequired=true` remains permanent for project use.

## Closure gate

M3 may be changed from ACTIVE to CLOSED only when all of the following are true on one exact head:

- the adversarial tributary-boundary regression passes;
- the independent numerical end-to-end audit passes;
- the dedicated controlled-activation Chromium gate passes;
- deterministic engineering tests pass;
- all legacy Structural Lab, print and NF-001 regression gates pass;
- all four permanent Roof Resilience source-of-truth records are updated consistently to M3 CLOSED without promoting member/connection capacity; and
- the resulting documentation-updated exact head passes the complete Engineering Checks suite again before merge.
