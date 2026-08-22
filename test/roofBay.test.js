import test from 'node:test';
import assert from 'node:assert/strict';
import { roofBayPurlinStations, tributaryWidthsFromStations, solveRoofBay } from '../src/solver/roofBay.js';

const PRESET = {
  id: 'test-c100',
  label: 'C100 test section',
  productCategory: 'c-purlin',
  areaMm2: 270,
  ixMm4: 410000,
  iyMm4: 52000,
  zxMm3: 8200,
  zyMm3: 2100
};

test('roof bay equalizes spacing without exceeding requested maximum', () => {
  const layout = roofBayPurlinStations(4, 0.9);
  assert.equal(layout.spaces, 5);
  assert.ok(layout.actualSpacingM <= 0.9 + 1e-12);
  assert.equal(layout.stationsM[0], 0);
  assert.equal(layout.stationsM.at(-1), 4);
});

test('tributary widths exactly cover the roof slope length', () => {
  const stations = [0, 0.8, 1.6, 2.4, 3.2, 4.0];
  const widths = tributaryWidthsFromStations(stations);
  assert.deepEqual(widths.map((value) => Number(value.toFixed(6))), [0.4, 0.8, 0.8, 0.8, 0.8, 0.4]);
  assert.ok(Math.abs(widths.reduce((sum, value) => sum + value, 0) - 4) < 1e-12);
});

test('roof bay reactions conserve applied gravity and uplift load', () => {
  const model = solveRoofBay({
    preset: PRESET,
    rafterSpacingM: 3,
    roofSlopeLengthM: 4,
    maxPurlinSpacingM: 0.8,
    slopeDeg: 25,
    mode: 'combined',
    deadLoadKPa: 0.2,
    roofLiveLoadKPa: 0.75,
    windPressureKPa: 1.5,
    windSense: 'uplift'
  });
  assert.equal(model.geometry.purlinCount, 6);
  assert.equal(model.equilibrium.pass, true);
  assert.ok(model.equilibrium.relativeResidual < 1e-12);
  assert.ok(model.applied.windNormalKN < 0);
  assert.ok(Math.abs(model.rafters.left.normalKN - model.rafters.right.normalKN) < 1e-12);
});

test('interior purlin has twice the tributary width of an end purlin in equal spacing layout', () => {
  const model = solveRoofBay({
    preset: PRESET,
    rafterSpacingM: 3,
    roofSlopeLengthM: 4,
    maxPurlinSpacingM: 0.8,
    mode: 'gravity',
    deadLoadKPa: 0.2,
    roofLiveLoadKPa: 0.75,
    windPressureKPa: 0
  });
  assert.ok(Math.abs(model.purlins[1].tributaryWidthM / model.purlins[0].tributaryWidthM - 2) < 1e-12);
  assert.ok(model.purlins[1].result.grossEnvelopeStressMPa > model.purlins[0].result.grossEnvelopeStressMPa);
});

test('wind-only uplift transfers a negative roof-normal reaction with zero downslope reaction', () => {
  const model = solveRoofBay({
    preset: PRESET,
    rafterSpacingM: 3,
    roofSlopeLengthM: 4,
    maxPurlinSpacingM: 1,
    slopeDeg: 30,
    mode: 'wind',
    windPressureKPa: 1.2,
    windSense: 'uplift'
  });
  assert.ok(model.applied.normalKN < 0);
  assert.ok(Math.abs(model.applied.parallelKN) < 1e-12);
  assert.ok(model.rafters.left.normalKN < 0);
  assert.equal(model.equilibrium.pass, true);
});
