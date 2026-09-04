# FutolTech Structural Lab — Price Intelligence v1

Status: implementation candidate

## Purpose

Add an economic dimension to Structural Lab simulations and Direct Compare without allowing market-price data to contaminate engineering material/section evidence.

Price Intelligence answers a different question from the structural solver:

- structural solver: **what does the member do under the selected load?**
- price ledger: **what would the selected physical stock currently cost to procure?**

The two are joined for comparison, but they remain separate evidence domains.

## Permanent doctrine

1. **Price is not engineering evidence.** A retail listing that looks like the same trade size/thickness does not prove identical geometry, grade, Fy/Fu, coating, certificate, bend radii, effective section properties, or design capacity.
2. **History is append-only.** A later price does not overwrite the price that was observed earlier. Each observation keeps supplier, source URL/reference, timestamp, unit, stock length, availability and location scope.
3. **Manual/project truth outranks web observation.** A current supplier quote, purchase-order price or explicit user/project override may supersede a web observation for project economics while preserving both records in history.
4. **Missing price stays unavailable.** Do not infer a price from mass, thickness, a neighboring product, or generic peso/kg unless the price basis itself is explicitly supplied.
5. **Stale is visible.** Web observations older than the configured freshness threshold remain traceable but are labeled stale rather than silently treated as current.
6. **Economic ranking never changes engineering PASS/FAIL.** Lowest cost, best cost/performance and structural adequacy are independent result dimensions.
7. **Procurement quantity is physical.** Material cost uses required commercial stock pieces and exposes purchased length and stock-length excess. Future BOM/Forward-Forensics layers will replace simplistic per-member excess with project-wide nesting/offcut reuse where implemented.
8. **No hidden installed-cost claim.** v1 material cost excludes labor, delivery, tax, fabrication, installation, fasteners/connections, equipment, lifecycle and financing unless separately sourced later.

## Versioned records

### `futoltech.price-observation/1`

Time-stamped market evidence, currently seeded with selected current Philippine online-retail C-purlin observations. Fields include:

- source type / supplier / supplier product / supplier reference;
- source URL;
- `observedAt` timestamp;
- PHP unit price;
- sale unit and stock length;
- availability and location scope;
- economic matching scope;
- `engineeringEquivalence=false` unless a future explicit engineering identity bridge proves otherwise.

### `futoltech.price-override/1`

User/project actual-price record. Required fields include:

- exact Structural Lab preset ID;
- actual price and stock length;
- supplier when known;
- quote/receipt/PO/source reference;
- timestamp.

Direct Compare v1 stores these overrides locally in the browser. The prepared cloud schema supports private per-user/project overrides when a dedicated backend is activated.

### `futoltech.price-ledger/1`

Resolver record which preserves observations and overrides and applies transparent source priority.

Initial priority:

1. manual/project override;
2. supplier quote / purchase order;
3. current online retail observation;
4. historical reference.

This priority decides the **economic price used**, not engineering product equivalence.

## Direct Compare Economics v1

Direct Compare adds a separate Economics panel for selected members.

When price evidence exists it displays:

- evidence state: WEB OBSERVED / STALE WEB / MANUAL-PROJECT;
- supplier/product and age/availability;
- price per commercial stock piece;
- stock length;
- number of stock pieces required by the selected member length;
- material procurement cost;
- purchased length;
- visible stock-length excess;
- lowest current material-cost highlight.

The user may enter an actual project price, stock length, supplier and source/quote reference. That override takes effect immediately and persists in browser local storage until cleared.

The economics UI must prove by regression that changing a price cannot change the engineering result cards or PASS/FAIL state.

## Current web seed — observation snapshot, not permanent price

Snapshot date: 2026-09-03 (Philippines time).

Initial CitiHardware observations used to exercise the architecture include selected 6 m × 1.2 mm C-purlins:

- DGP 2×3: PHP 445 / stock piece;
- Fleximetal galvanized 2×3: PHP 595 / stock piece;
- Fleximetal galvanized 2×4: PHP 675 / stock piece;
- DGP 2×6: PHP 665 / stock piece;
- Fleximetal galvanized 2×6: PHP 845 / stock piece.

These are **web-observed retail snapshots**, with source URLs retained in `src/data/phPriceObservations.js`. Store-specific availability, exact delivered product, tax/delivery and future price changes must be rechecked before procurement.

## Persistent database architecture

Prepared migration:

`supabase/migrations/20260903_price_intelligence_v1.sql`

Tables:

- `price_products` — economic matching identity only;
- `price_refresh_runs` — audit record for each server-side refresh attempt;
- `price_observations` — append-only market-price history;
- `project_price_overrides` — private project/user actual prices;
- `latest_price_observations` — convenience view over history.

RLS doctrine:

- curated market observations may be publicly readable;
- public/browser clients cannot write market observations;
- project overrides are private to their authenticated owner;
- future internet refresh runs server-side using a secured provider/Edge Function; the browser never receives a service-role key.

The migration is intentionally **prepared but not applied to an unrelated existing Supabase project**. A dedicated Structural Lab/FutolTech economics backend should be selected or created explicitly before migration.

## Real-time / refreshable price roadmap

“Real-time” in construction procurement should mean **refreshable, timestamped and attributable**, not a number scraped once and presented forever.

Planned provider gateway:

1. search/query selected supplier or retailer sources;
2. capture raw source snapshot and timestamp;
3. normalize sale unit / stock length / currency;
4. match only to the explicit economic identity scope;
5. append the observation;
6. preserve previous observations;
7. flag stale/unavailable/out-of-stock evidence;
8. allow project/manual override to remain governing when selected.

Provider adapters must be replaceable because retail websites, APIs and terms can change.

## Forward Forensics bridge

Price Intelligence is the market-evidence foundation for FutolTech **Forward Forensics / Pre-Construction Cost Forensics**.

Future chain:

`engineering quantity → detailing/BBS → stock nesting → BOM procurement quantity → current/quoted price → project budget → PO → delivery → fabrication → installation → reusable offcut → accountable loss/variance`

The intended outcome is not to investigate cost loss only after the project overruns. The expected physical-and-financial chain is reconstructed before procurement so deviations can be detected while they are still manageable.

For contractual work, contractual measurement quantity remains separately preserved where the contract measures net installed work. Internal procurement/budget quantity may legitimately follow BOM/purchased stock because that is the cash-out quantity. The two must be reconciled, not conflated.

## v1 boundaries

Not yet implemented:

- automatic scheduled internet refresh;
- supplier API integrations;
- cloud persistence in a dedicated production database;
- tax/delivery/fabrication/labor/installation cost;
- project-wide cutting/nesting and reusable offcut ledger;
- price forecasting;
- lifecycle/maintenance cost;
- carbon/EPD economics;
- automatic BOQ/BOM budget posting.

All of these remain future layers over the same price-history/provenance doctrine.
