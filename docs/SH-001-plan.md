# SH-001 — Concrete Slab Shoring Calculator

## Locked scope

SH-001 replaces the retired RF-001 roof-frame experiment. It models an idealized temporary load path:

```text
fresh concrete + rebar allowance + pour live load + plywood self-weight
→ joists
→ bearers / stringers
→ vertical shores
→ base/supporting structure
```

The first benchmark is a 5 m × 5 m, 125 mm slab with 12.7 mm plywood, 300 mm target joist spacing, 800 mm target bearer spacing, 800 mm target shore spacing, 3.0 m shores and editable construction-load allowances.

## Bracing modes

- **Auto-Suggest:** tests zero through the selected maximum brace levels and recommends the fewest equally spaced levels that meet the selected preliminary shore-utilization target.
- **Manual:** accepts actual comma-separated elevations.

The governing column length is the longest segment between the base, brace levels and shore top. Every brace level assumes horizontal ledgers, diagonal bracing in both plan directions, adequate joints/anchorage and a complete lateral load path. The app does not design those brace members or connections yet.

## Current checks

- fresh-concrete and editable area-load breakdown
- even joist, bearer and shore grids that do not exceed requested spacing
- representative continuous-joist elastic bending/deflection
- each bearer under the actual series of joist reactions
- every bearer support reaction mapped to one shore
- corner, edge and interior shore tributary areas
- maximum shore compression and global-buckling screening
- load/reaction conservation regression
- plan and elevation diagrams

## Excluded from SH-001

Plywood panel capacity, local concrete heaping/pump impact, bearing, nails/clamps/wedges/U-heads/base plates, brace strength/stiffness, shore damage/reuse, settlement, soil or supporting-slab capacity, stripping/reshoring and multilevel construction-load distribution remain separate validation blocks.
