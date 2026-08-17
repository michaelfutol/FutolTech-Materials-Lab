import test from 'node:test';
import assert from 'node:assert/strict';
import { beamTerminalTarget, columnTerminalTarget, rampLoadSeries } from '../src/solver/failureRamp.js';

test('coco beam ramp targets the published rupture reference by elastic scaling', () => {
  const target = beamTerminalTarget({
    family: 'wood',
    loadKN: 2,
    maxBendingStressMPa: 18,
    allowableBendingMPa: 15.4,
    ultimateBendingMPa: 72.9
  });
  assert.equal(target.kind, 'rupture');
  assert.ok(Math.abs(target.targetLoadKN - 8.1) < 1e-9);
  assert.equal(target.physicalFailureReference, true);
});

test('provisional hardwood without rupture data stops at last verified bending reference', () => {
  const target = beamTerminalTarget({
    family: 'wood',
    loadKN: 1,
    maxBendingStressMPa: 10,
    allowableBendingMPa: 24.5,
    ultimateBendingMPa: null
  });
  assert.equal(target.kind, 'working-reference');
  assert.ok(Math.abs(target.targetLoadKN - 2.45) < 1e-9);
  assert.match(target.note, /instead of inventing a snap load/i);
});

test('steel beam ramp targets first yield while C-purlin remains screening-only', () => {
  const ordinary = beamTerminalTarget({ family: 'steel', loadKN: 1, maxBendingStressMPa: 50, yieldStrengthMPa: 250 });
  const purlin = beamTerminalTarget({ family: 'steel', loadKN: 1, maxBendingStressMPa: 50, yieldStrengthMPa: 250, screeningOnly: true });
  assert.equal(ordinary.kind, 'yield');
  assert.equal(purlin.kind, 'gross-yield-screen');
  assert.equal(ordinary.targetLoadKN, 5);
  assert.equal(purlin.targetLoadKN, 5);
  assert.match(purlin.note, /local\/distortional\/lateral-torsional/i);
});

test('column ramp chooses the lower idealised capacity reference', () => {
  const target = columnTerminalTarget({
    family: 'steel',
    loadKN: 10,
    predictedCapacityKN: 70,
    maxCompressionStressMPa: 40,
    compressionStrengthMPa: 250
  });
  assert.equal(target.kind, 'column-capacity');
  assert.equal(target.targetLoadKN, 62.5);
});

test('ramp series is monotonic and ends exactly at target', () => {
  const series = rampLoadSeries({ currentLoadKN: 1, targetLoadKN: 5, steps: 20 });
  assert.equal(series.values.length, 20);
  assert.equal(series.values.at(-1), 5);
  for (let i = 1; i < series.values.length; i += 1) assert.ok(series.values[i] > series.values[i - 1]);
});
