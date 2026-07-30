import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBeamLimitState, evaluateColumnLimitState } from '../limitStates.js';

test('coco beam reports allowable exceedance before published rupture threshold', () => {
  const state = evaluateBeamLimitState({
    family: 'wood',
    loadKN: 2,
    maxDeflectionMm: 5,
    deflectionLimitMm: 10,
    maxBendingStressMPa: 20,
    allowableBendingMPa: 15.4,
    ultimateBendingMPa: 72.9
  });

  assert.equal(state.severity, 'warning');
  assert.equal(state.code, 'allowable-reference-exceeded');
});

test('coco beam reports snap or rupture warning after published average strength is exceeded', () => {
  const state = evaluateBeamLimitState({
    family: 'wood',
    loadKN: 8,
    maxDeflectionMm: 30,
    deflectionLimitMm: 10,
    maxBendingStressMPa: 80,
    allowableBendingMPa: 15.4,
    ultimateBendingMPa: 72.9
  });

  assert.equal(state.severity, 'danger');
  assert.equal(state.code, 'wood-rupture-threshold-exceeded');
  assert.match(state.title, /SNAP/);
});

test('steel beam reports yield warning at the selected Fy', () => {
  const state = evaluateBeamLimitState({
    family: 'steel',
    loadKN: 2,
    maxDeflectionMm: 2,
    deflectionLimitMm: 10,
    maxBendingStressMPa: 250,
    yieldStrengthMPa: 250
  });

  assert.equal(state.severity, 'danger');
  assert.equal(state.code, 'steel-yield-threshold-exceeded');
});

test('linear threshold estimate scales the current load by utilisation', () => {
  const state = evaluateBeamLimitState({
    family: 'wood',
    loadKN: 2,
    maxDeflectionMm: 4,
    deflectionLimitMm: 8,
    maxBendingStressMPa: 20,
    allowableBendingMPa: 10,
    ultimateBendingMPa: 100
  });

  const allowable = state.thresholds.find((item) => item.label === 'allowable bending reference');
  assert.ok(allowable);
  assert.equal(allowable.estimatedLoadKN, 1);
});

test('column reports danger when idealised governing capacity is exceeded', () => {
  const state = evaluateColumnLimitState({
    family: 'wood',
    loadKN: 12,
    predictedCapacityKN: 10,
    maxCompressionStressMPa: 20,
    compressionStrengthMPa: 46.2
  });

  assert.equal(state.severity, 'danger');
  assert.equal(state.code, 'column-capacity-exceeded');
});
