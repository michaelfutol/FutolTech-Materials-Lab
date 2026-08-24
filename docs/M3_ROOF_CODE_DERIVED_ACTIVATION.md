# M3 Controlled Code-Derived Roof Bay Activation

Status date: 2026-08-24

PR: **#134 — controlled activation of one verified complete Roof Bay strength-combination action result**.

## Purpose

This slice connects the verified M3 action/combination chain to the live Roof Bay workflow without rewriting or duplicating the existing M2 manual-uniform solver.

Schema: `futoltech.roof-bay-code-derived-activation/1`.

The activation record consumes one already-verified `futoltech.wind-roof-strength-combination-assembly/1` record from PR #133 and selects exactly one case whose `fullCombinationResult` exists, whose status is `COMPLETE_STRENGTH_COMBINATION_ACTION_RESULT`, and whose stored force/moment equilibrium check passes.

## Activation gates

A complete case may become active only when all of the following are true:

1. The imported PR #133 assembly validates without mutation.
2. The assembly's accepted pressure-context record exactly matches the active Roof Bay pressure-context record.
3. Roof Bay rafter spacing / purlin span matches the verified assembly span.
4. Roof slope length and roof slope angle match.
5. The exact physical purlin stations match the verified pressure-routing record.
6. Active Roof Bay dead-load pressure equals the accepted `D` roof-area pressure used by PR #132.
7. Active Roof Bay roof-live pressure equals the accepted `Lr` pressure used by PR #132.
8. The engineer explicitly confirms, with a traceable source reference, that the PR #132 purlin self-weight line-action basis corresponds to the currently selected Roof Bay C-purlin section. PR #132 did not encode section ID, so this relationship is never inferred automatically.
9. A traceable activation/review source reference is present.

Any failed gate leaves the page in the separate M2 manual-uniform fallback state.

## What activation means

When active, the V10 Roof Bay panel displays the selected PR #133 action result directly:

- template/case identity,
- signed wind direction/case identity,
- selected `Lr` / `R` state where applicable,
- roof-normal combined force,
- roof-downslope combined force,
- Rafter A/B roof-normal reactions,
- stored force/moment equilibrium PASS state.

The V10 UI does **not** recompute `qh`, `GCp`, `GCpi`, zone geometry, net pressure, physical pressure routing, W actions, companion actions, or strength combinations. Those remain owned by their verified upstream records.

## Manual fallback preservation

The original M2 manual-uniform Roof Bay solver remains intact and separate.

- `pressureZoning.activePressureModel` remains `manual-uniform` in the retained M2 project basis.
- Code-derived activation is an attached selected-demand record; it does not rewrite the M2 pressure placeholder or M2 member-response calculation.
- A visible **RETURN TO MANUAL FALLBACK** control removes the active selection.
- Any Roof Bay/project input edit after activation invalidates the activation immediately and returns the page to manual fallback.
- Changes to accepted wind-input or pressure-context records invalidate activation.

## Project JSON

When a compatible complete case is active, Roof Bay project export attaches the validated activation record as `codeDerivedActivation` while retaining the base M2/manual project state.

The activation record stores its exact project compatibility basis and exact upstream PR #133 assembly. Revalidation detects later project edits rather than allowing a stale action result to remain attached silently.

## Rain / `(Lr or R)` boundary

PR #134 does not invent or resolve rain action.

- If `R` remains unresolved, PR #133 leaves 203-3 and 203-4 incomplete.
- V10 exposes only complete activation choices; therefore unresolved-rain benchmark data exposes only the two 203-6 wind-direction cases.
- Blocked 203-3/203-4 alternatives cannot be selected or promoted by the UI.
- If an explicit engineer-sourced `R not applicable` decision released the Lr alternative upstream, those complete PR #133 cases may be activated subject to all #134 compatibility gates.

## Permanent engineering boundary

PR #134 activates an already-complete **action result**, not member design capacity.

Still unresolved / not promoted by this slice:

- piecewise purlin stress and deflection under the code-derived zone-piece demand,
- cold-formed local/distortional/LTB checks,
- roof-sheet capacity,
- screw/fastener pull-out or pull-over capacity,
- purlin-to-rafter connection capacity,
- rafter/truss member capacity,
- automatic resizing or PASS/FAIL member design under the activated code-derived demand.

The existing manual M2 gross-section member response remains a separate fallback/screening calculation and must never be mislabeled as the response to the activated M3 piecewise combination.

## QA contract

Deterministic tests protect:

- complete-case-only activation,
- unresolved-rain blocking,
- exact pressure-context matching,
- span/slope/purlin-station compatibility,
- D and Lr compatibility,
- explicit self-weight-to-section confirmation/source evidence,
- deterministic serialization/round-trip,
- stale-project detection.

Dedicated Chromium V10 QA reconstructs the benchmark M3 chain from solver modules and verifies:

1. manual fallback at startup,
2. activation of a complete verified case,
3. displayed demand equals the stored PR #133 result,
4. project JSON carries the activation record,
5. the retained M2 pressure model stays manual-uniform,
6. an active Roof Bay input edit invalidates the selection,
7. unresolved rain exposes only two complete 203-6 choices,
8. manual fallback remains recoverable.

The preliminary implementation head passed all **46/46 Engineering Checks**. The documentation-updated exact final head must also pass 46/46 before PR #134 may merge.

## Next M3 dependency

After PR #134 merges, the next engineering slice is the independent end-to-end M3 benchmark / exit audit across the complete accepted chain:

accepted project/site inputs → `qh` → external/internal coefficients → minimum-governed net zone pressure → exact physical purlin-piece routing → Rafter A/B reactions → signed W identity → companion actions → complete source-backed strength combination → controlled Roof Bay activation.

M3 closes only if that independent end-to-end audit confirms identity, provenance, units, sign, area/force/moment conservation, activation compatibility, and exact-final-head QA. Piecewise member response/capacity may remain a separately gated next phase if the exit audit confirms that M3's defined scope ends at verified activated action demand rather than capacity.