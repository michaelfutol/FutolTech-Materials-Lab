import { PRICE_OBSERVATION_SCHEMA } from '../data/phPriceObservations.js';

export const PRICE_LEDGER_SCHEMA = 'futoltech.price-ledger/1';
export const PRICE_OVERRIDE_SCHEMA = 'futoltech.price-override/1';

const SOURCE_PRIORITY = Object.freeze({
  'manual-project-override': 100,
  'supplier-quote': 90,
  'purchase-order': 90,
  'online-retail-listing': 60,
  'historical-reference': 30
});
const EPS = 1e-9;

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function positive(value, label) {
  const number = finite(value, label);
  if (!(number > 0)) throw new Error(`${label} must be greater than zero.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function optionalText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function timestamp(value, label) {
  const text = nonEmpty(value, label);
  const time = Date.parse(text);
  if (!Number.isFinite(time)) throw new Error(`${label} must be a valid ISO date/time.`);
  return { text, time };
}
function sameNumber(a, b, tolerance = EPS) { return Math.abs(Number(a) - Number(b)) <= tolerance; }

function normalizeObservation(input, index = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`Price observation ${index + 1} must be an object.`);
  if (input.schemaVersion !== PRICE_OBSERVATION_SCHEMA) throw new Error(`Unsupported price observation schema '${input.schemaVersion}'.`);
  const observed = timestamp(input.observedAt, `observations[${index}].observedAt`);
  const sourceType = nonEmpty(input.sourceType, `observations[${index}].sourceType`);
  if (!(sourceType in SOURCE_PRIORITY)) throw new Error(`Unsupported price source type '${sourceType}'.`);
  const unit = nonEmpty(input.unit, `observations[${index}].unit`);
  if (unit !== 'stock-piece') throw new Error('Price Intelligence v1 supports stock-piece prices only.');
  const currency = nonEmpty(input.currency, `observations[${index}].currency`).toUpperCase();
  if (currency !== 'PHP') throw new Error('Price Intelligence v1 supports PHP observations only.');
  return {
    schemaVersion: PRICE_OBSERVATION_SCHEMA,
    id: nonEmpty(input.id, `observations[${index}].id`),
    sourceType,
    supplier: nonEmpty(input.supplier, `observations[${index}].supplier`),
    supplierProduct: nonEmpty(input.supplierProduct, `observations[${index}].supplierProduct`),
    supplierReference: optionalText(input.supplierReference),
    sourceUrl: nonEmpty(input.sourceUrl, `observations[${index}].sourceUrl`),
    observedAt: observed.text,
    observedAtMs: observed.time,
    currency,
    unit,
    unitPrice: positive(input.unitPrice, `observations[${index}].unitPrice`),
    stockLengthM: positive(input.stockLengthM, `observations[${index}].stockLengthM`),
    availability: nonEmpty(input.availability, `observations[${index}].availability`),
    locationScope: nonEmpty(input.locationScope, `observations[${index}].locationScope`),
    match: clone(input.match ?? {}),
    matchScope: nonEmpty(input.matchScope, `observations[${index}].matchScope`),
    engineeringEquivalence: input.engineeringEquivalence === true,
    evidenceStatus: nonEmpty(input.evidenceStatus, `observations[${index}].evidenceStatus`)
  };
}

export function normalizePriceOverride(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Price override must be an object.');
  if (input.schemaVersion && input.schemaVersion !== PRICE_OVERRIDE_SCHEMA) throw new Error(`Unsupported price override schema '${input.schemaVersion}'.`);
  const entered = timestamp(input.enteredAt, 'override.enteredAt');
  return {
    schemaVersion: PRICE_OVERRIDE_SCHEMA,
    id: nonEmpty(input.id, 'override.id'),
    presetId: nonEmpty(input.presetId, 'override.presetId'),
    sourceType: 'manual-project-override',
    supplier: optionalText(input.supplier) ?? 'Manual / project override',
    supplierProduct: optionalText(input.supplierProduct),
    sourceReference: nonEmpty(input.sourceReference, 'override.sourceReference'),
    enteredAt: entered.text,
    enteredAtMs: entered.time,
    currency: 'PHP',
    unit: 'stock-piece',
    unitPrice: positive(input.unitPrice, 'override.unitPrice'),
    stockLengthM: positive(input.stockLengthM, 'override.stockLengthM'),
    availability: optionalText(input.availability) ?? 'user-confirmed / verify before PO',
    note: optionalText(input.note)
  };
}

function tradeSizeForPreset(preset) {
  if (preset?.productCategory !== 'c-purlin') return null;
  const depth = Number(preset.purlinDepthMm ?? preset.depthMm);
  const flange = Number(preset.purlinFlangeMm ?? preset.widthMm);
  const depthIn = depth / 25.4;
  const flangeIn = flange / 25.4;
  // Philippine trade sizes commonly use rounded metric dimensions (for example,
  // 150 mm for nominal 6 in and 250 mm for nominal 10 in). This tolerance is
  // economic-catalog matching only; it never changes the engineering geometry.
  const near = (value, target) => Math.abs(value - target) <= 0.2;
  if (near(flangeIn, 2) && near(depthIn, 3)) return '2x3';
  if (near(flangeIn, 2) && near(depthIn, 4)) return '2x4';
  if (near(flangeIn, 2) && near(depthIn, 6)) return '2x6';
  if (near(flangeIn, 2) && near(depthIn, 7)) return '2x7';
  if (near(flangeIn, 2) && near(depthIn, 8)) return '2x8';
  if (near(flangeIn, 2) && near(depthIn, 10)) return '2x10';
  return null;
}

export function observationMatchesPreset(observation, preset) {
  if (!observation || !preset) return false;
  const match = observation.match ?? {};
  if (match.presetId && preset.id !== match.presetId) return false;
  if (match.materialId && preset.materialId !== match.materialId) return false;
  if (match.productCategory && preset.productCategory !== match.productCategory) return false;
  if (match.tradeSize && tradeSizeForPreset(preset) !== match.tradeSize) return false;
  const comparisons = [
    ['depthMm', preset.purlinDepthMm ?? preset.depthMm],
    ['flangeMm', preset.purlinFlangeMm ?? preset.widthMm],
    ['thicknessMm', preset.thicknessMm]
  ];
  for (const [key, actual] of comparisons) {
    if (match[key] == null) continue;
    if (!Number.isFinite(Number(actual)) || !sameNumber(match[key], actual, 0.51)) return false;
  }
  return true;
}

export function buildPriceLedger({ observations = [], overrides = [], asOf = null, staleAfterDays = 30 } = {}) {
  const normalizedObservations = observations.map(normalizeObservation);
  const normalizedOverrides = overrides.map(normalizePriceOverride);
  const ids = new Set();
  for (const item of [...normalizedObservations, ...normalizedOverrides]) {
    if (ids.has(item.id)) throw new Error(`Duplicate price record id '${item.id}'.`);
    ids.add(item.id);
  }
  const asOfTime = asOf == null ? null : timestamp(asOf, 'asOf');
  return {
    schemaVersion: PRICE_LEDGER_SCHEMA,
    currency: 'PHP',
    asOf: asOfTime?.text ?? null,
    staleAfterDays: positive(staleAfterDays, 'staleAfterDays'),
    observations: normalizedObservations.map(({ observedAtMs, ...item }) => item),
    overrides: normalizedOverrides.map(({ enteredAtMs, ...item }) => item),
    policy: {
      priority: ['manual-project-override', 'supplier-quote', 'purchase-order', 'online-retail-listing', 'historical-reference'],
      engineeringPropertiesNeverMutatedByPriceData: true,
      manualOverrideWins: true,
      priceHistoryPreserved: true
    }
  };
}

function ageDays(iso, asOf) {
  if (!asOf) return null;
  return Math.max(0, (Date.parse(asOf) - Date.parse(iso)) / 86400000);
}

function availabilityRank(value) {
  const text = String(value ?? '').toLowerCase();
  if (/out[- ]?of[- ]?stock|sold out|unavailable/.test(text)) return 0;
  if (/low[- ]?stock|limited/.test(text)) return 2;
  if (/available|in stock|listed with quantity input/.test(text)) return 3;
  return 1;
}

export function effectivePriceForPreset({ preset, ledger, asOf = null } = {}) {
  if (!preset?.id) throw new Error('A preset with id is required for price resolution.');
  if (!ledger || ledger.schemaVersion !== PRICE_LEDGER_SCHEMA) throw new Error('A valid Price Ledger v1 record is required.');
  const effectiveAsOf = asOf ?? ledger.asOf;
  const candidates = [];
  for (const override of ledger.overrides) {
    if (override.presetId !== preset.id) continue;
    candidates.push({
      id: override.id,
      sourceType: override.sourceType,
      supplier: override.supplier,
      supplierProduct: override.supplierProduct,
      sourceReference: override.sourceReference,
      sourceUrl: null,
      timestamp: override.enteredAt,
      unitPrice: override.unitPrice,
      stockLengthM: override.stockLengthM,
      availability: override.availability,
      matchScope: 'exact-preset-manual-override',
      engineeringEquivalence: false,
      priority: SOURCE_PRIORITY[override.sourceType],
      manualOverride: true,
      note: override.note
    });
  }
  for (const observation of ledger.observations) {
    if (!observationMatchesPreset(observation, preset)) continue;
    candidates.push({
      id: observation.id,
      sourceType: observation.sourceType,
      supplier: observation.supplier,
      supplierProduct: observation.supplierProduct,
      sourceReference: observation.supplierReference,
      sourceUrl: observation.sourceUrl,
      timestamp: observation.observedAt,
      unitPrice: observation.unitPrice,
      stockLengthM: observation.stockLengthM,
      availability: observation.availability,
      matchScope: observation.matchScope,
      engineeringEquivalence: observation.engineeringEquivalence,
      priority: SOURCE_PRIORITY[observation.sourceType],
      manualOverride: false,
      note: null
    });
  }
  const candidateIsStale = (item) => {
    const days = ageDays(item.timestamp, effectiveAsOf);
    return days != null && days > ledger.staleAfterDays;
  };
  candidates.sort((a, b) => (
    b.priority - a.priority ||
    availabilityRank(b.availability) - availabilityRank(a.availability) ||
    Number(candidateIsStale(a)) - Number(candidateIsStale(b)) ||
    (a.unitPrice / a.stockLengthM) - (b.unitPrice / b.stockLengthM) ||
    Date.parse(b.timestamp) - Date.parse(a.timestamp)
  ));
  const selected = candidates[0] ?? null;
  if (!selected) {
    return {
      status: 'UNAVAILABLE',
      presetId: preset.id,
      currency: 'PHP',
      selected: null,
      candidates: [],
      note: 'No current price observation or manual/project override matches this preset.'
    };
  }
  const daysOld = ageDays(selected.timestamp, effectiveAsOf);
  const stale = daysOld != null && daysOld > ledger.staleAfterDays;
  return {
    status: selected.manualOverride ? 'MANUAL_OVERRIDE' : stale ? 'STALE_WEB_OBSERVATION' : 'WEB_OBSERVED',
    presetId: preset.id,
    currency: 'PHP',
    selected: {
      ...selected,
      ageDays: daysOld,
      stale
    },
    candidates: candidates.map((item) => ({ ...item, ageDays: ageDays(item.timestamp, effectiveAsOf) })),
    note: selected.manualOverride
      ? 'Manual/project price overrides all web observations for this preset.'
      : 'Web price is an economic observation only; verify supplier, stock, taxes, delivery and exact product before procurement.'
  };
}

export function memberProcurementEconomics({ preset, requiredLengthM, massPerM = null, physicalThresholdLoadKN = null, effectivePrice } = {}) {
  const lengthM = positive(requiredLengthM, 'requiredLengthM');
  if (!effectivePrice || effectivePrice.status === 'UNAVAILABLE' || !effectivePrice.selected) {
    return {
      priceStatus: 'UNAVAILABLE',
      currency: 'PHP',
      procurementCost: null,
      stockPieces: null,
      purchasedLengthM: null,
      wasteLengthM: null,
      costPerUsedM: null,
      costPerPurchasedKg: null,
      costPerThresholdKN: null,
      source: null
    };
  }
  const stockLengthM = positive(effectivePrice.selected.stockLengthM, 'stockLengthM');
  const stockPieces = Math.ceil(lengthM / stockLengthM - EPS);
  const purchasedLengthM = stockPieces * stockLengthM;
  const wasteLengthM = Math.max(0, purchasedLengthM - lengthM);
  const procurementCost = stockPieces * effectivePrice.selected.unitPrice;
  const purchasedMassKg = Number.isFinite(Number(massPerM)) ? purchasedLengthM * Number(massPerM) : null;
  return {
    priceStatus: effectivePrice.status,
    currency: 'PHP',
    stockPieces,
    stockLengthM,
    unitPricePerStockPiece: effectivePrice.selected.unitPrice,
    procurementCost,
    requiredLengthM: lengthM,
    purchasedLengthM,
    wasteLengthM,
    wastePercentOfPurchasedLength: purchasedLengthM > 0 ? wasteLengthM / purchasedLengthM * 100 : null,
    costPerUsedM: procurementCost / lengthM,
    purchasedMassKg,
    costPerPurchasedKg: purchasedMassKg > 0 ? procurementCost / purchasedMassKg : null,
    costPerThresholdKN: Number.isFinite(Number(physicalThresholdLoadKN)) && Number(physicalThresholdLoadKN) > 0
      ? procurementCost / Number(physicalThresholdLoadKN)
      : null,
    source: clone(effectivePrice.selected),
    boundary: stockPieces > 1
      ? 'Procurement material cost only. Required splice/connection detail and its cost remain additional/unresolved.'
      : 'Procurement material cost only. Delivery, taxes, fabrication, installation and connection costs are not included unless separately supplied.'
  };
}

export function applyEconomicsToComparison({ comparison, selections, lengthM, ledger, asOf = null } = {}) {
  if (!comparison?.records || !Array.isArray(selections) || selections.length !== comparison.records.length) {
    throw new Error('Comparison records and selections must align for economics enrichment.');
  }
  const records = comparison.records.map((record, index) => {
    const selection = selections[index];
    const preset = {
      ...selection.preset,
      materialId: selection.material?.id ?? selection.materialId ?? null
    };
    const effectivePrice = effectivePriceForPreset({ preset, ledger, asOf });
    const economics = memberProcurementEconomics({
      preset,
      requiredLengthM: lengthM,
      massPerM: record.massPerM,
      physicalThresholdLoadKN: record.physicalThresholdLoadKN,
      effectivePrice
    });
    return { ...record, economics };
  });
  const priced = records.filter((record) => Number.isFinite(record.economics.procurementCost));
  const cheapest = priced.reduce((best, record) => (!best || record.economics.procurementCost < best.economics.procurementCost ? record : best), null);
  const bestCostPerThreshold = priced
    .filter((record) => Number.isFinite(record.economics.costPerThresholdKN))
    .reduce((best, record) => (!best || record.economics.costPerThresholdKN < best.economics.costPerThresholdKN ? record : best), null);
  return {
    ...comparison,
    records: records.map((record) => ({
      ...record,
      winnerFlags: {
        ...record.winnerFlags,
        lowestProcurementCost: cheapest?.comparisonId === record.comparisonId,
        bestCostPerThreshold: bestCostPerThreshold?.comparisonId === record.comparisonId
      }
    })),
    economics: {
      pricedCount: priced.length,
      comparisonCount: records.length,
      priceCoverageComplete: priced.length === records.length,
      cheapestComparisonId: cheapest?.comparisonId ?? null,
      bestCostPerThresholdComparisonId: bestCostPerThreshold?.comparisonId ?? null,
      boundary: 'Economics v1 ranks material procurement cost only from time-stamped market observations or explicit manual/project overrides. It does not change engineering PASS/FAIL and does not yet include labor, delivery, tax, fabrication, connection, lifecycle or full installed cost.'
    }
  };
}
