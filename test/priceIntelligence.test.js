import test from 'node:test';
import assert from 'node:assert/strict';
import { PH_PRICE_OBSERVATIONS } from '../src/data/phPriceObservations.js';
import {
  PRICE_OVERRIDE_SCHEMA,
  applyEconomicsToComparison,
  buildPriceLedger,
  effectivePriceForPreset,
  memberProcurementEconomics,
  normalizePriceOverride,
  observationMatchesPreset
} from '../src/solver/priceIntelligence.js';

const cp2x4 = {
  id: 'ph-cp-nominal-c-purlin-2x4-nominal-1_2',
  productCategory: 'c-purlin',
  purlinDepthMm: 100,
  purlinFlangeMm: 50,
  thicknessMm: 1.2
};
const cp2x6 = {
  id: 'ph-cp-nominal-c-purlin-2x6-nominal-1_2',
  productCategory: 'c-purlin',
  purlinDepthMm: 150,
  purlinFlangeMm: 50,
  thicknessMm: 1.2
};
const shs = {
  id: 'shs-50-15',
  productCategory: 'shs',
  widthMm: 50,
  depthMm: 50,
  thicknessMm: 1.5
};

function manualOverride(overrides = {}) {
  return {
    schemaVersion: PRICE_OVERRIDE_SCHEMA,
    id: 'project-quote-cp2x4',
    presetId: cp2x4.id,
    supplier: 'Local Sorsogon supplier',
    supplierProduct: 'C-purlin 2x4 x 1.2 x 6m',
    sourceReference: 'Supplier quote SQ-001',
    enteredAt: '2026-09-03T20:30:00+08:00',
    unitPrice: 620,
    stockLengthM: 6,
    availability: 'quoted',
    ...overrides
  };
}

test('web observations match economic trade size without claiming engineering equivalence', () => {
  const matching = PH_PRICE_OBSERVATIONS.filter((item) => observationMatchesPreset(item, cp2x4));
  assert.equal(matching.length, 1);
  assert.equal(matching[0].unitPrice, 675);
  assert.equal(matching[0].engineeringEquivalence, false);
  assert.equal(observationMatchesPreset(matching[0], cp2x6), false);
  assert.equal(observationMatchesPreset(matching[0], shs), false);
});

test('freshest same-priority web observation is selected and stale state is explicit', () => {
  const ledger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    asOf: '2026-09-03T21:00:00+08:00',
    staleAfterDays: 30
  });
  const price = effectivePriceForPreset({ preset: cp2x6, ledger });
  assert.equal(price.status, 'WEB_OBSERVED');
  // Two current 2x6 observations exist. Same timestamp means deterministic lowest-price tie-break.
  assert.equal(price.selected.unitPrice, 665);
  assert.equal(price.candidates.length, 2);

  const staleLedger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    asOf: '2026-11-10T12:00:00+08:00',
    staleAfterDays: 30
  });
  assert.equal(effectivePriceForPreset({ preset: cp2x6, ledger: staleLedger }).status, 'STALE_WEB_OBSERVATION');
});

test('manual project override outranks web price and preserves source evidence', () => {
  const override = normalizePriceOverride(manualOverride());
  assert.equal(override.unitPrice, 620);
  const ledger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    overrides: [override],
    asOf: '2026-09-03T21:00:00+08:00'
  });
  const price = effectivePriceForPreset({ preset: cp2x4, ledger });
  assert.equal(price.status, 'MANUAL_OVERRIDE');
  assert.equal(price.selected.unitPrice, 620);
  assert.equal(price.selected.sourceReference, 'Supplier quote SQ-001');
  assert.equal(price.candidates.some((item) => item.sourceType === 'online-retail-listing'), true);
});

test('unpriced members remain unavailable instead of receiving guessed cost', () => {
  const ledger = buildPriceLedger({ observations: PH_PRICE_OBSERVATIONS, asOf: '2026-09-03T21:00:00+08:00' });
  const price = effectivePriceForPreset({ preset: shs, ledger });
  assert.equal(price.status, 'UNAVAILABLE');
  const economics = memberProcurementEconomics({ preset: shs, requiredLengthM: 3, massPerM: 2.5, physicalThresholdLoadKN: 20, effectivePrice: price });
  assert.equal(economics.procurementCost, null);
  assert.equal(economics.stockPieces, null);
});

test('procurement cost uses stock pieces and exposes waste instead of hiding it in a percentage', () => {
  const ledger = buildPriceLedger({ observations: PH_PRICE_OBSERVATIONS, overrides: [manualOverride()], asOf: '2026-09-03T21:00:00+08:00' });
  const price = effectivePriceForPreset({ preset: cp2x4, ledger });
  const economics = memberProcurementEconomics({
    preset: cp2x4,
    requiredLengthM: 7.5,
    massPerM: 4,
    physicalThresholdLoadKN: 30,
    effectivePrice: price
  });
  assert.equal(economics.stockPieces, 2);
  assert.equal(economics.purchasedLengthM, 12);
  assert.equal(economics.wasteLengthM, 4.5);
  assert.equal(economics.procurementCost, 1240);
  assert.equal(economics.purchasedMassKg, 48);
  assert.ok(Math.abs(economics.costPerPurchasedKg - 1240 / 48) < 1e-12);
  assert.ok(Math.abs(economics.costPerThresholdKN - 1240 / 30) < 1e-12);
  assert.match(economics.boundary, /splice/i);
});

test('economics enrichment never changes engineering pass/fail and adds separate economic winners', () => {
  const ledger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    overrides: [manualOverride({ unitPrice: 700 })],
    asOf: '2026-09-03T21:00:00+08:00'
  });
  const comparison = {
    mode: 'beam',
    records: [
      { comparisonId: 'member-a', pass: true, massPerM: 4, physicalThresholdLoadKN: 35, winnerFlags: { lightestPassing: true } },
      { comparisonId: 'member-b', pass: false, massPerM: 5, physicalThresholdLoadKN: 50, winnerFlags: { lightestPassing: false } }
    ]
  };
  const selections = [
    { preset: cp2x4 },
    { preset: cp2x6 }
  ];
  const result = applyEconomicsToComparison({ comparison, selections, lengthM: 3, ledger });
  assert.equal(result.records[0].pass, true);
  assert.equal(result.records[1].pass, false);
  assert.equal(result.records[0].economics.procurementCost, 700);
  assert.equal(result.records[1].economics.procurementCost, 665);
  assert.equal(result.records[1].winnerFlags.lowestProcurementCost, true);
  assert.equal(result.records[0].winnerFlags.lightestPassing, true);
  assert.equal(result.economics.priceCoverageComplete, true);
});

test('invalid zero/negative manual prices are rejected', () => {
  assert.throws(() => normalizePriceOverride(manualOverride({ unitPrice: 0 })), /greater than zero/);
  assert.throws(() => normalizePriceOverride(manualOverride({ stockLengthM: -6 })), /greater than zero/);
});
