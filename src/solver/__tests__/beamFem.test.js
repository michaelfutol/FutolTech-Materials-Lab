import test from 'node:test';
import assert from 'node:assert/strict';
import { solveBeam } from '../beamFem.js';

const E = 200_000;
const I = 8_000_000;
const Z = 160_000;

test('simply supported centre point load matches closed-form deflection', () => {
  const lengthM = 3;
  const forceKN = 10;
  const result = solveBeam({
    lengthM,
    elasticModulusMPa: E,
    inertiaMm4: I,
    sectionModulusMm3: Z,
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 1.5, forceKN }],
    targetElementLengthM: 0.25
  });
  const expectedMm = forceKN * 1000 * (lengthM * 1000) ** 3 / (48 * E * I);
  assert.ok(Math.abs(result.maxDeflectionMm - expectedMm) / expectedMm < 1e-8);
  assert.ok(Math.abs(result.maxMomentKNm - forceKN * lengthM / 4) < 1e-8);
});

test('cantilever end point load matches closed-form deflection', () => {
  const lengthM = 2;
  const forceKN = 3;
  const result = solveBeam({
    lengthM,
    elasticModulusMPa: E,
    inertiaMm4: I,
    sectionModulusMm3: Z,
    leftSupport: 'fixed',
    rightSupport: 'free',
    pointLoads: [{ xM: lengthM, forceKN }],
    targetElementLengthM: 0.2
  });
  const expectedMm = forceKN * 1000 * (lengthM * 1000) ** 3 / (3 * E * I);
  assert.ok(Math.abs(result.maxDeflectionMm - expectedMm) / expectedMm < 1e-8);
});
