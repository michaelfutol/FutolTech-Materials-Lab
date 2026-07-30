import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveLengthFactor, solveColumn } from '../column.js';

test('standard idealised effective-length factors are returned', () => {
  assert.equal(effectiveLengthFactor('pin', 'roller'), 1);
  assert.equal(effectiveLengthFactor('fixed', 'fixed'), 0.5);
  assert.equal(effectiveLengthFactor('fixed', 'free'), 2);
});

test('Euler critical load uses governing weak axis', () => {
  const result = solveColumn({
    lengthM: 3,
    elasticModulusMPa: 200_000,
    areaMm2: 1000,
    ixMm4: 2_000_000,
    iyMm4: 1_000_000,
    widthMm: 50,
    depthMm: 100,
    bottomSupport: 'pin',
    topSupport: 'pin',
    axialLoadKN: 10,
    eccentricityMm: 0,
    compressionStrengthMPa: 250
  });
  const expectedKN = Math.PI ** 2 * 200_000 * 1_000_000 / 3000 ** 2 / 1000;
  assert.ok(Math.abs(result.eulerCriticalKN - expectedKN) < 1e-9);
  assert.equal(result.governingAxis, 'y');
});

test('eccentricity direction changes curvature direction, not stress magnitude', () => {
  const base = {
    lengthM: 2,
    elasticModulusMPa: 200_000,
    areaMm2: 1000,
    ixMm4: 1_000_000,
    iyMm4: 1_000_000,
    widthMm: 50,
    depthMm: 50,
    bottomSupport: 'fixed',
    topSupport: 'free',
    axialLoadKN: 5,
    compressionStrengthMPa: 250
  };
  const positive = solveColumn({ ...base, eccentricityMm: 10 });
  const negative = solveColumn({ ...base, eccentricityMm: -10 });
  assert.equal(positive.maxCompressionStressMPa, negative.maxCompressionStressMPa);
  assert.ok(positive.bendingStressMPa > 0);
});
