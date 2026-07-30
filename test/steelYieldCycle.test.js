import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateSectionProperties } from '../src/solver/sections.js';
import {
  buildSteelYieldHistory,
  createSteelYieldModel,
  evaluateSteelYieldState
} from '../src/solver/steelYieldCycle.js';

const section = calculateSectionProperties({
  type: 'rhs',
  widthMm: 50,
  depthMm: 50,
  thicknessMm: 1.5
});

function model(overrides = {}) {
  return createSteelYieldModel({
    lengthM: 3,
    elasticModulusMPa: 200_000,
    inertiaMm4: section.ixMm4,
    sectionModulusMm3: section.zxMm3,
    yieldStrengthMPa: 250,
    leftSupport: 'pin',
    rightSupport: 'roller',
    loadPositionM: 1.5,
    requestedPeakLoadKN: 2,
    postYieldTangentRatio: 0.05,
    loadingDurationS: 5,
    holdDurationS: 1,
    unloadingDurationS: 5,
    residualDurationS: 2,
    ...overrides
  });
}

test('first-yield load follows My divided by the exact elastic moment per kN', () => {
  const result = model();
  const expectedYieldMoment = 250 * section.zxMm3 / 1_000_000;
  const expectedYieldLoad = expectedYieldMoment / 0.75;
  assert.ok(Math.abs(result.yieldMomentKNm - expectedYieldMoment) < 1e-9);
  assert.ok(Math.abs(result.firstYieldLoadKN - expectedYieldLoad) < 1e-6);
  assert.equal(result.hingeLocationM, 1.5);
});

test('a below-yield load cycle returns to zero without residual deformation', () => {
  const result = model({ requestedPeakLoadKN: 1 });
  const finalState = evaluateSteelYieldState(result, result.totalDurationS);
  assert.equal(finalState.state, 'returned-to-zero');
  assert.ok(finalState.residualDeflectionMm < 1e-9);
  assert.ok(finalState.maxDeflectionMm < 1e-9);
});

test('a post-yield cycle leaves nonzero residual deformation after full unloading', () => {
  const result = model();
  const peakState = evaluateSteelYieldState(result, result.loadingDurationS + result.holdDurationS / 2);
  const finalState = evaluateSteelYieldState(result, result.totalDurationS);
  assert.equal(peakState.state, 'plastic-hold');
  assert.equal(finalState.state, 'residual-deformation');
  assert.ok(finalState.residualDeflectionMm > 0);
  assert.ok(finalState.maxDeflectionMm > 0);
  const elasticRecovery = result.elasticComplianceMmPerKN * result.analysedPeakLoadKN;
  assert.ok(Math.abs((peakState.maxDeflectionMm - finalState.maxDeflectionMm) - elasticRecovery) < 1e-6);
});

test('first yield occurs at the proportional loading time', () => {
  const result = model();
  const state = evaluateSteelYieldState(result, result.loadingDurationS);
  const expected = result.loadingDurationS * result.firstYieldLoadKN / result.analysedPeakLoadKN;
  assert.ok(Math.abs(state.firstYieldTimeS - expected) < 1e-9);
});

test('the NL-001 load cap prevents pretending to model far beyond first yield', () => {
  const result = model({ requestedPeakLoadKN: 20 });
  assert.equal(result.terminatedAtModelLimit, true);
  assert.ok(Math.abs(result.analysedPeakLoadKN - result.firstYieldLoadKN * 1.2) < 1e-9);
});

test('fixed-fixed post-yield response is rejected until multi-hinge redistribution exists', () => {
  assert.throws(() => model({ leftSupport: 'fixed', rightSupport: 'fixed' }), /multiple plastic hinges/i);
});

test('history contains loading, unloading, and residual states', () => {
  const history = buildSteelYieldHistory(model(), 81);
  assert.ok(history.some((point) => point.state === 'yielding'));
  assert.ok(history.some((point) => point.state === 'elastic-unloading-with-residual'));
  assert.equal(history.at(-1).state, 'residual-deformation');
});
