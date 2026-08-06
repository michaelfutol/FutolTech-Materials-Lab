# RF-001 Roof Frame Load Path

## Purpose
Convert a roof area load into the actual sequence of joist reactions applied to a selected rafter or supporting beam, then analyse that member with optional intermediate support and a splice-on-support idealisation.

## Load path

Area load (kN/m² or kgf/m²)
→ line load on each joist using its tributary strip width
→ joist end reaction
→ point load at the joist/rafter intersection
→ rafter support reactions, moments, stress and deflection

## First acceptance case
- Rafter length: 5.0 m
- Joist span between rafters: 5.0 m
- Joist spacing: 0.30 m
- One supported roof bay
- Optional extra support
- Optional splice directly over the extra support

## Engineering boundaries
- A splice does not create support. The splice-on-support model is valid only when a real post, beam, wall or other verified support exists at the same location.
- A continuous rafter over an extra support and a non-moment splice over that support are different structural systems and must be analysed differently.
- The first release checks the selected rafter. Joist member capacity, connections, uplift, roof diaphragm action, lateral stability, bearing and full wind design remain separate checks.
- Area load must be assembled from the applicable project dead, live, wind or maintenance load cases. Do not combine incompatible load directions or code cases into one arbitrary total.
