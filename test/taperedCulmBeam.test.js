import test from 'node:test';
import assert from 'node:assert/strict';
import { solveBeam } from '../src/solver/beamFem.js';
import { culmProperties, solveTaperedCulmBeam } from '../src/solver/taperedCulmBeam.js';

const E = 13_100;
const density = 570;

function uniformStations(lengthM, diameterMm = 91.2, thicknessMm = 10) {
  return [
    { xM: 0, diameterMm, thicknessMm },
    { xM: lengthM / 2, diameterMm, thicknessMm },
    { xM: lengthM, diameterMm, thicknessMm }
  ];
}

test('uniform culm solver agrees with constant-section beam FEM', () => {
  const lengthM = 3;
  const properties = culmProperties(91.2, 10);
  const tapered = solveTaperedCulmBeam({
    lengthM,
    elasticModulusMPa: E,
    densityKgM3: density,
    stations: uniformStations(lengthM),
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 1.5, forceKN: 1 }]
  });
  const constant = solveBeam({
    lengthM,
    elasticModulusMPa: E,
    inertiaMm4: properties.inertiaMm4,
    sectionModulusMm3: properties.sectionModulusMm3,
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 1.5, forceKN: 1 }],
    targetElementLengthM: 0.075
  });
  assert.ok(Math.abs(tapered.maxDeflectionMm - constant.maxDeflectionMm) / constant.maxDeflectionMm < 1e-8);
  assert.ok(Math.abs(tapered.maxBendingStressMPa - constant.maxBendingStressMPa) / constant.maxBendingStressMPa < 1e-8);
});

test('simply supported tapered culm reactions balance the point load', () => {
  const result = solveTaperedCulmBeam({
    lengthM: 3,
    elasticModulusMPa: E,
    densityKgM3: density,
    stations: [
      { xM: 0, diameterMm: 94, thicknessMm: 24 },
      { xM: 1.5, diameterMm: 91.2, thicknessMm: 10 },
      { xM: 3, diameterMm: 80.9, thicknessMm: 7 }
    ],
    leftSupport: 'pin',
    rightSupport: 'roller',
    pointLoads: [{ xM: 1.5, forceKN: 1 }]
  });
  assert.ok(Math.abs(result.leftReactionKN + result.rightReactionKN - 1) < 1e-8);
  assert.ok(result.maxDeflectionMm > 0);
  assert.ok(result.maxBendingStressMPa > 0);
  assert.ok(result.totalMassKg > 0);
});

test('reversing the culm changes the variable-stiffness response', () => {
  const base = {
    lengthM: 3,
    elasticModulusMPa: E,
    densityKgM3: density,
    leftSupport: 'fixed',
    rightSupport: 'free',
    pointLoads: [{ xM: 3, forceKN: 0.5 }]
  };
  const buttAtFixed = solveTaperedCulmBeam({
    ...base,
    stations: [
      { xM: 0, diameterMm: 94, thicknessMm: 24 },
      { xM: 1.5, diameterMm: 91.2, thicknessMm: 10 },
      { xM: 3, diameterMm: 80.9, thicknessMm: 7 }
    ]
  });
  const topAtFixed = solveTaperedCulmBeam({
    ...base,
    stations: [
      { xM: 0, diameterMm: 80.9, thicknessMm: 7 },
      { xM: 1.5, diameterMm: 91.2, thicknessMm: 10 },
      { xM: 3, diameterMm: 94, thicknessMm: 24 }
    ]
  });
  assert.ok(buttAtFixed.maxDeflectionMm < topAtFixed.maxDeflectionMm);
  assert.ok(buttAtFixed.maxBendingStressMPa < topAtFixed.maxBendingStressMPa);
});

test('invalid culm wall geometry is rejected', () => {
  assert.throws(() => culmProperties(80, 40), /less than half/);
});
