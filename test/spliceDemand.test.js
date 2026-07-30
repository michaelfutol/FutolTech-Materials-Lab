import test from 'node:test';
import assert from 'node:assert/strict';
import { solveBeam } from '../src/solver/beamFem.js';
import {
  evaluateSpliceDemand,
  feasibleSingleSpliceInterval,
  internalActionsAtSplice,
  minimumStockPieces,
  suggestSpliceLocation
} from '../src/solver/spliceDemand.js';

test('stock planner counts pieces, splices, and waste without overlap', () => {
  const plan = minimumStockPieces({ requiredLengthM: 5.4, stockLengthM: 3.6 });
  assert.equal(plan.pieces, 2);
  assert.equal(plan.spliceCount, 1);
  assert.ok(Math.abs(plan.wasteLengthM - 1.8) < 1e-9);
});

test('stock planner includes main-member overlap in used length', () => {
  const plan = minimumStockPieces({ requiredLengthM: 5.4, stockLengthM: 3.6, overlapM: 0.6 });
  assert.equal(plan.pieces, 2);
  assert.ok(Math.abs(plan.totalUsedPieceLengthM - 6.0) < 1e-9);
  assert.ok(Math.abs(plan.wasteLengthM - 1.2) < 1e-9);
});

test('single-splice feasible zone respects both stock pieces', () => {
  const interval = feasibleSingleSpliceInterval({ requiredLengthM: 5.4, stockLengthM: 3.6 });
  assert.equal(interval.feasible, true);
  assert.ok(Math.abs(interval.minimumM - 1.8) < 1e-9);
  assert.ok(Math.abs(interval.maximumM - 3.6) < 1e-9);
});

test('splice actions recover simply-supported centre-load shear and moment', () => {
  const result = solveBeam({
    lengthM: 3,
    elasticModulusMPa: 13_100,
    inertiaMm4: 4_166_666.6667,
    sectionModulusMm3: 83_333.3333,
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 1.5, forceKN: 1 }]
  });
  const actions = internalActionsAtSplice(result, 1.5);
  assert.ok(Math.abs(actions.momentMagnitudeKNm - 0.75) < 1e-6);
  assert.ok(Math.abs(actions.shearMagnitudeKN - 0.5) < 1e-6);
});

test('splice demand identifies governing exceeded capacity and joint deformation', () => {
  const demand = evaluateSpliceDemand({
    momentKNm: 0.75,
    shearKN: 0.5,
    momentCapacityKNm: 0.6,
    shearCapacityKN: 2,
    rotationalStiffnessKNmPerRad: 150,
    shearStiffnessKNPerMm: 5
  });
  assert.equal(demand.state, 'exceeded');
  assert.equal(demand.governingMode, 'moment');
  assert.ok(Math.abs(demand.governingRatio - 1.25) < 1e-9);
  assert.ok(Math.abs(demand.estimatedRotationRad - 0.005) < 1e-9);
  assert.ok(Math.abs(demand.estimatedShearSlipMm - 0.1) < 1e-9);
});

test('splice-location search stays inside stock-feasible interval', () => {
  const result = solveBeam({
    lengthM: 5.4,
    elasticModulusMPa: 13_100,
    inertiaMm4: 4_166_666.6667,
    sectionModulusMm3: 83_333.3333,
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 2.7, forceKN: 1 }]
  });
  const suggestion = suggestSpliceLocation({
    beamResult: result,
    requiredLengthM: 5.4,
    stockLengthM: 3.6,
    momentCapacityKNm: 2,
    shearCapacityKN: 2
  });
  assert.equal(suggestion.feasible, true);
  assert.ok(suggestion.recommended.xM >= 1.8 - 1e-9);
  assert.ok(suggestion.recommended.xM <= 3.6 + 1e-9);
});
