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
const unpricedShs = {
  id: 'shs-38-12',
  productCategory: 'shs',
  widthMm: 38,
  depthMm: 38,
  thicknessMm: 1.2
};
const coco2x4 = {
  id: 'wood-2x4',
  productCategory: 'sawn-wood',
  widthMm: 50,
  depthMm: 100,
  materialId: 'coco-uh-2007-average'
};
const tanguile2x4 = {
  ...coco2x4,
  materialId: 'timber-tanguile-ph-80-provisional'
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

test('web observations match economic trade size and thickness without claiming engineering equivalence', () => {
  const matching = PH_PRICE_OBSERVATIONS.filter((item) => observationMatchesPreset(item, cp2x4));
  assert.ok(matching.length >= 2);
  assert.equal(matching.some((item) => item.unitPrice === 675), true);
  assert.equal(matching.some((item) => item.unitPrice === 600), true);
  assert.equal(matching.every((item) => item.match?.thicknessMm === 1.2), true);
  assert.equal(matching.every((item) => item.engineeringEquivalence === false), true);
  const alphaOneMm = PH_PRICE_OBSERVATIONS.find((item) => item.match?.tradeSize === '2x4' && item.match?.thicknessMm === 1.0);
  assert.ok(alphaOneMm);
  assert.equal(observationMatchesPreset(alphaOneMm, cp2x4), false);
  assert.equal(observationMatchesPreset(matching[0], cp2x6), false);
  assert.equal(observationMatchesPreset(matching[0], unpricedShs), false);
});

test('available current observations outrank unavailable ones, then lower normalized price wins', () => {
  const ledger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    asOf: '2026-09-04T16:00:00+08:00',
    staleAfterDays: 30
  });
  const price = effectivePriceForPreset({ preset: cp2x6, ledger });
  assert.equal(price.status, 'WEB_OBSERVED');
  assert.equal(price.selected.unitPrice, 665);
  assert.ok(price.candidates.length >= 3);

  const cp2x3 = {
    id: 'ph-cp-nominal-c-purlin-2x3-nominal-1_2',
    productCategory: 'c-purlin',
    purlinDepthMm: 75,
    purlinFlangeMm: 50,
    thicknessMm: 1.2
  };
  const cp2x3Price = effectivePriceForPreset({ preset: cp2x3, ledger });
  assert.equal(cp2x3Price.selected.unitPrice, 580);
  assert.doesNotMatch(cp2x3Price.selected.availability, /out[- ]?of[- ]?stock/i);

  const staleLedger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    asOf: '2026-11-10T12:00:00+08:00',
    staleAfterDays: 30
  });
  assert.equal(effectivePriceForPreset({ preset: cp2x6, ledger: staleLedger }).status, 'STALE_WEB_OBSERVATION');
});

test('material-scoped wood prices do not leak across species datasets', () => {
  const cocoMatches = PH_PRICE_OBSERVATIONS.filter((item) => observationMatchesPreset(item, coco2x4));
  assert.equal(cocoMatches.some((item) => item.unitPrice === 240), true);
  const sameObservation = cocoMatches.find((item) => item.unitPrice === 240);
  assert.equal(observationMatchesPreset(sameObservation, tanguile2x4), false);
});

test('exact-preset observations do not leak to a different steel section', () => {
  const heavy40 = {
    id: 'ph-pipe-PNS26 heavy-40',
    productCategory: 'steel-pipe',
    diameterMm: 48.3,
    thicknessMm: 3.7
  };
  const light40 = {
    id: 'ph-pipe-PNS26 light-40',
    productCategory: 'steel-pipe',
    diameterMm: 48.3,
    thicknessMm: 2.9
  };
  const matching = PH_PRICE_OBSERVATIONS.filter((item) => observationMatchesPreset(item, heavy40));
  assert.equal(matching.some((item) => item.unitPrice === 1962.65), true);
  const heavyObservation = matching.find((item) => item.unitPrice === 1962.65);
  assert.equal(observationMatchesPreset(heavyObservation, light40), false);
});

test('manual project override outranks web price and preserves source evidence', () => {
  const override = normalizePriceOverride(manualOverride());
  assert.equal(override.unitPrice, 620);
  const ledger = buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    overrides: [override],
    asOf: '2026-09-04T16:00:00+08:00'
  });
  const price = effectivePriceForPreset({ preset: cp2x4, ledger });
  assert.equal(price.status, 'MANUAL_OVERRIDE');
  assert.equal(price.selected.unitPrice, 620);
  assert.equal(price.selected.sourceReference, 'Supplier quote SQ-001');
  assert.equal(price.candidates.some((item) => item.sourceType === 'online-retail-listing'), true);
});

test('unpriced members remain unavailable instead of receiving guessed cost', () => {
  const ledger = buildPriceLedger({ observations: PH_PRICE_OBSERVATIONS, asOf: '2026-09-04T16:00:00+08:00' });
  const price = effectivePriceForPreset({ preset: unpricedShs, ledger });
  assert.equal(price.status, 'UNAVAILABLE');
  const economics = memberProcurementEconomics({ preset: unpricedShs, requiredLengthM: 3, massPerM: 2.5, physicalThresholdLoadKN: 20, effectivePrice: price });
  assert.equal(economics.procurementCost, null);
  assert.equal(economics.stockPieces, null);
});

test('procurement cost uses stock pieces and exposes waste instead of hiding it in a percentage', () => {
  const ledger = buildPriceLedger({ observations: PH_PRICE_OBSERVATIONS, overrides: [manualOverride()], asOf: '2026-09-04T16:00:00+08:00' });
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
    asOf: '2026-09-04T16:00:00+08:00'
  });
  const comparison = {
    mode: 'beam',
    records: [
      { comparisonId: 'member-a', pass: true, massPerM: 4, physicalThresholdLoadKN: 35, winnerFlags: { lightestPassing: true } },
      { comparisonId: 'member-b', pass: false, massPerM: 5, physicalThresholdLoadKN: 50, winnerFlags: { lightestPassing: false } }
    ]
  };
  const selections = [
    { preset: cp2x4, materialId: 'steel-generic-250' },
    { preset: cp2x6, materialId: 'steel-generic-250' }
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
