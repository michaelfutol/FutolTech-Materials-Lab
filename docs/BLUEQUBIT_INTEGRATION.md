# BlueQubit integration boundary

FutolNative Structures will use BlueQubit only as an experimental QUBO/QAOA search backend after a deterministic classical optimizer exists for the same candidate problem.

## Security

The public GitHub Pages app must never contain a BlueQubit API token. The token belongs in a server-side environment variable named `BLUEQUBIT_API_TOKEN` on a secure backend. Browser code sends only a sanitized optimization problem to that backend.

## Verification sequence

1. Generate candidates and engineering constraints classically.
2. Solve the small case exactly or by classical exhaustive/heuristic search.
3. Encode the discrete selection problem as QUBO.
4. Submit the QUBO/QAOA experiment through the secure backend.
5. Decode the proposed solution.
6. Re-run every selected member, connection, brace, splice, and frame through the deterministic solver.
7. Reject any infeasible decoded solution.
8. Compare objective quality, runtime, repeatability, and cost with the classical benchmark.

BlueQubit never replaces structural analysis or professional verification.
