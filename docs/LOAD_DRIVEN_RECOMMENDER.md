# Load-Driven Member Recommender

FutolNative Structures will support reverse selection: begin with a required load, span, support condition, load position, and serviceability limit, then enumerate source-backed material/section candidates and rank only those that satisfy the selected checks.

The first implementation is deterministic enumeration, not quantum computing. It is the auditable baseline needed before a later QUBO formulation can optimize interacting choices such as member sizes, braces, connections, stock lengths, splices, cost, weight, and native-material content.

## Initial candidate checks

- source-backed or explicitly provisional material dataset
- actual preset section geometry
- elastic beam stress and deflection
- wood allowable bending reference
- wood published-average rupture-load estimate
- steel first-yield estimate
- material commercial-length boundary / splice-required flag
- mass per metre and total member mass

## Later optimization variables

- member material and section
- orientation
- brace layout
- nail, screw, bolt, strap, weld, and anchor choice
- stock-length cutting and splice placement
- cost, weight, embodied carbon, repairability, and native-material percentage

A quantum/QUBO solver may later search the discrete combinatorial problem, but every selected candidate must still be verified by the classical structural solver and connection checks.