import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NSCP2015_BUILDING_DIRECTIONALITY_KD,
  NSCP2015_EXPOSURE_CONSTANTS,
  NSCP2015_MIN_KZ_HEIGHT_M,
  basicWindSpeedKphToMps,
  nscp2015BuildingVelocityPressure,
  nscp2015VelocityPressureExposureCoefficient
} from '../src/solver/windVelocityPressure.js';

test('NSCP 2015 exposure constants preserve B C D alpha and zg values used by the velocity-pressure expression', () => {
  assert.deepEqual(NSCP2015_EXPOSURE_CONSTANTS.B, { alpha: 7, zgM: 365.76 });
  assert.deepEqual(NSCP2015_EXPOSURE_CONSTANTS.C, { alpha: 9.5, zgM: 274.32 });
  assert.deepEqual(NSCP2015_EXPOSURE_CONSTANTS.D, { alpha: 11.5, zgM: 213.36 });
  assert.equal(NSCP2015_BUILDING_DIRECTIONALITY_KD, 0.85);
});

test('240 kph converts exactly to the familiar 66.6667 m/s benchmark basis', () => {
  assert.ok(Math.abs(basicWindSpeedKphToMps(240) - 66.66666666666667) < 1e-12);
});

test('Exposure C benchmark reproduces the published hand-calculation Kz and qh values without rounding Kz early', () => {
  const result = nscp2015BuildingVelocityPressure({
    heightM: 8.82,
    exposureCategory: 'C',
    basicWindSpeedKph: 240,
    topographicFactorKzt: 1
  });
  assert.ok(Math.abs(result.exposure.kz - 0.9748206328451855) < 1e-12);
  assert.ok(Math.abs(result.result.qPa - 2257.467958862151) < 1e-9);
  assert.ok(Math.abs(result.result.qKPa - 2.257467958862151) < 1e-12);
  assert.match(result.substitutions.q, /0\.613/);
  assert.match(result.substitutions.q, /0\.85/);
});

test('Kz uses the 4.57 m minimum evaluation height below the code expression floor', () => {
  const result = nscp2015VelocityPressureExposureCoefficient({ heightM: 3, exposureCategory: 'B' });
  assert.equal(result.heightM, 3);
  assert.equal(result.effectiveHeightM, NSCP2015_MIN_KZ_HEIGHT_M);
  assert.equal(result.minimumHeightApplied, true);
  assert.ok(Math.abs(result.kz - 0.5746478276028131) < 1e-12);
});

test('velocity-pressure solver rejects unsupported exposure, nonpositive inputs and extrapolation above zg', () => {
  assert.throws(() => nscp2015BuildingVelocityPressure({ heightM:8, exposureCategory:'A', basicWindSpeedKph:240, topographicFactorKzt:1 }), /B', 'C' or 'D/);
  assert.throws(() => nscp2015BuildingVelocityPressure({ heightM:8, exposureCategory:'C', basicWindSpeedKph:0, topographicFactorKzt:1 }), /greater than zero/);
  assert.throws(() => nscp2015BuildingVelocityPressure({ heightM:8, exposureCategory:'C', basicWindSpeedKph:240, topographicFactorKzt:0 }), /greater than zero/);
  assert.throws(() => nscp2015VelocityPressureExposureCoefficient({ heightM:300, exposureCategory:'C' }), /does not extrapolate/);
});
