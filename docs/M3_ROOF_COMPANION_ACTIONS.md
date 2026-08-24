# M3 Roof Companion Structural Actions

## Purpose

This record documents the M3 companion-action acceptance/routing layer downstream of `futoltech.wind-roof-load-case-combination/1` and upstream of complete strength-combination assembly.

Schema: `futoltech.wind-roof-companion-actions/1`.

The purpose of this slice is deliberately narrower than a full load-combination solver. It answers: **which non-wind structural actions actually act on the current roof-purlin target, where do they act, and are they source/assumption-traceable enough to be combined later?**

## Source boundary

Adopted code profile remains `ph-nscp-2015-v1-7e-2p` (NSCP 2015 Volume 1, 7th Edition, 2nd Printing). Project use requires checking an authorized code copy.

The code-action definitions are kept distinct:

- `D` — permanent/dead load acting on the target.
- `L` — ordinary live load; roof live load is not relabeled as `L`.
- `Lr` — roof live load.
- `R` — rain load on the undeflected roof.
- `H` — lateral soil/water pressure action.
- `W` — remains the already verified signed wind action from PR #131.

This distinction is critical because the current Roof Bay already had a field named `roofLiveLoadKPa`; it is accepted here only as an explicitly sourced **`Lr`** action, never silently converted to `L`.

## Current target-specific action state

For the present roof-purlin target:

1. `D` is accepted and physically routed when an explicit roof dead-load pressure and source reference are supplied.
2. Purlin self-weight is stored separately inside `D` as one source-referenced line load per physical purlin. It is not hidden inside the roof-area pressure and is not double-counted.
3. `Lr` is accepted and physically routed when an explicit roof live-load pressure and source reference are supplied.
4. `L` is carried as an explicit target-specific zero/not-applicable decision because the current target is the roof-purlin system and its variable gravity action is `Lr`, not ordinary floor live load.
5. `H` is carried as an explicit target-specific zero/not-applicable decision because the current roof-purlin target is not loaded by lateral soil/water pressure.
6. `R` remains `UNRESOLVED` until an actual project rain/drainage action or explicit project applicability decision is supplied.
7. `f1` remains unresolved as a coefficient, but `f1 × L` is zero in the current accepted target record because `L = 0`. A future nonzero `L` action must explicitly resolve `f1` before combination assembly.

Zero/not-applicable actions are **decisions with source/engineering references**, not silent defaults.

## Physical routing rule

Uniform roof-area `D` and `Lr` actions are partitioned over the same physical Roof Bay rectangles already proven by the PR #130 wind route. No new or parallel geometry is created.

For a physical piece of roof area `A` carrying vertical gravity pressure `q_v`:

- vertical force: `F_v = q_v A`
- roof-normal component: `F_n = F_v cos(theta)`
- roof-downslope component: `F_s = F_v sin(theta)`

The piece resultant is applied at its actual spanwise centroid. Simply supported Rafter A/B reactions are therefore derived from the same classical equilibrium rule already used by the verified routing layer.

Purlin self-weight is a distinct uniform line action. Its total vertical force is `w_sw L`; for a simply supported purlin its two support reactions are equal, then resolved into roof-normal and roof-downslope components using the accepted roof slope.

## Independent benchmark

Benchmark geometry:

- symmetric gable
- roof slope = `25 deg`
- Roof Bay span = `4.0 m`
- horizontal eave-to-ridge run = `4.0 m`
- roof slope length = `4 / cos(25 deg) = 4.413511675849967 m`
- Roof Bay surface area = `17.654046703399867 m2`

Accepted companion actions for the benchmark:

- roof-area dead load = `0.20 kPa`
- purlin self-weight = `0.05 kN/m` for each of two modeled purlins
- roof live load `Lr` = `0.75 kPa`

Expected `D` result:

- roof-area dead vertical force = `3.5308093406799737 kN`
- purlin self-weight vertical force = `0.4000000000000000 kN`
- total `D` vertical force = `3.9308093406799736 kN`
- total `D` roof-normal force = `3.5625231148146597 kN`
- total `D` roof-downslope force = `1.6612318107922752 kN`

Expected `Lr` result:

- vertical force = `13.2405350275499 kN`
- roof-normal force = `12.0 kN` (floating-point representation may be infinitesimally below 12)
- roof-downslope force = `5.595691897859982 kN`

Deterministic tests require Rafter A + Rafter B to reproduce each accepted action component and require the area-action pieces to retain the exact upstream physical piece identity/area.

## Combination readiness after this slice

The PR #131 templates remain unchanged:

- 203-3 wind branch: `1.2D + 1.6(Lr or R) + 0.5W`
- 203-4: `1.2D + 1.0W + f1L + 0.5(Lr or R)`
- 203-6: `0.9D + 1.0W + 1.6H`

This companion-action slice does **not** yet evaluate those full equations.

Current readiness:

- 203-3: `D` + `Lr` branch + `W` are available, but the `Lr or R` alternative must not be silently selected while `R` is unresolved.
- 203-4: `D` + `W` + zero `f1L` + `Lr` branch are available, but the `Lr or R` alternative remains gated by the unresolved `R` action/applicability decision.
- 203-6: `D` + `W` + explicit zero `H` are ready for the next assembly layer.

The next slice may assemble only those source-backed combination cases whose required action alternatives have been explicitly resolved. It must not treat unresolved `R` as zero by omission.

## Hard boundaries

This slice does not:

- calculate rain load `R`;
- silently choose `Lr` instead of `R`;
- create a final combined structural demand;
- resolve a nonzero ordinary live load `L` or `f1`;
- activate code-derived wind in the live Roof Bay UI;
- solve piecewise purlin stress/deflection under the combined actions;
- promote purlin, rafter, roof-sheet, fastener or connection capacity.

Permanent rule: **an absent action is not zero unless the project/target record explicitly says it is zero or not applicable, with traceable basis.**
