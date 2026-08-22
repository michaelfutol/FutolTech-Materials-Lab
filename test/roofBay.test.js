import test from 'node:test';
import assert from 'node:assert/strict';
import { roofBayPurlinStations, customRoofBayPurlinLayout, tributaryBandsFromStations, tributaryWidthsFromStations, solveRoofBay } from '../src/solver/roofBay.js';

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
  assert.equal(layout.layoutMode, 'equal-max-spacing');
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

test('custom station layout may offset edge purlins while exact tributary bands still cover the physical roof', () => {
  const layout = customRoofBayPurlinLayout(4, [0.2, 0.85, 1.7, 2.65, 3.55]);
  const bands = tributaryBandsFromStations(layout.stationsM, 4);
  const widths = bands.map((band) => band.widthM);
  assert.equal(layout.layoutMode, 'custom-stations');
  assert.deepEqual(layout.stationsM, [0.2, 0.85, 1.7, 2.65, 3.55]);
  assert.equal(bands[0].startM, 0);
  assert.equal(bands.at(-1).endM, 4);
  assert.equal(bands[0].endM, (0.2 + 0.85) / 2);
  assert.equal(bands[1].startM, bands[0].endM);
  assert.ok(Math.abs(widths.reduce((sum, value) => sum + value, 0) - 4) < 1e-12);
  assert.ok(widths[0] > (layout.stationsM[1] - layout.stationsM[0]) / 2);
  assert.ok(widths.at(-1) > (layout.stationsM.at(-1) - layout.stationsM.at(-2)) / 2);
});

test('custom station layout rejects duplicate, descending and out-of-roof stations', () => {
  assert.throws(() => customRoofBayPurlinLayout(4, [0.2, 1, 1, 3.5]), /strictly increasing/);
  assert.throws(() => customRoofBayPurlinLayout(4, [0.2, 1.4, 1.2, 3.5]), /strictly increasing/);
  assert.throws(() => customRoofBayPurlinLayout(4, [0.2, 1.4, 4.2]), /within the roof slope length/);
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

test('M2 reserves a roof-local pressure-zone schema without inventing field edge or corner geometry', () => {
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
  assert.equal(model.pressureZoning.schemaVersion, 'futoltech.roof-pressure-zones/1');
  assert.equal(model.pressureZoning.status, 'UNRESOLVED');
  assert.equal(model.pressureZoning.activePressureModel, 'manual-uniform');
  assert.deepEqual(model.pressureZoning.supportedRegionTypes, ['field', 'edge', 'corner']);
  assert.deepEqual(model.pressureZoning.regions, []);
  assert.equal(model.pressureZoning.codeBasis, null);
  assert.deepEqual(model.pressureZoning.coordinateFrame, model.geometry.roofPlaneFrame);
  assert.equal(model.pressureZoning.coordinateFrame.xExtentM, 3);
  assert.equal(model.pressureZoning.coordinateFrame.yExtentM, 4);
  assert.equal(model.pressureZoning.manualUniformWind.pressureKPa, 1.5);
  assert.equal(model.pressureZoning.manualUniformWind.sense, 'uplift');
  assert.ok(model.purlins.every((item) => item.pressureZoneStatus === 'UNASSIGNED_M3' && item.pressureZoneIds.length === 0));
});

test('combined roof bay exposes auditable roof-normal and downslope conservation components', () => {
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
  const normal=model.conservation.normal, parallel=model.conservation.parallel;
  assert.equal(normal.applied.totalKN, model.applied.normalKN);
  assert.equal(parallel.applied.totalKN, model.applied.parallelKN);
  assert.equal(normal.reactions.totalKN, model.equilibrium.reactionNormalKN);
  assert.equal(parallel.reactions.totalKN, model.equilibrium.reactionParallelKN);
  assert.ok(Math.abs(normal.applied.roofAreaGravityKN + normal.applied.purlinSelfWeightKN + normal.applied.windKN - normal.applied.totalKN) < 1e-12);
  assert.ok(Math.abs(parallel.applied.roofAreaGravityKN + parallel.applied.purlinSelfWeightKN + parallel.applied.windKN - parallel.applied.totalKN) < 1e-12);
  assert.ok(Math.abs(normal.reactions.leftRafterKN + normal.reactions.rightRafterKN - normal.reactions.totalKN) < 1e-12);
  assert.ok(Math.abs(parallel.reactions.leftRafterKN + parallel.reactions.rightRafterKN - parallel.reactions.totalKN) < 1e-12);
  assert.equal(normal.pass, true);
  assert.equal(parallel.pass, true);
  assert.ok(Math.abs(normal.residualKN) < 1e-12);
  assert.ok(Math.abs(parallel.residualKN) < 1e-12);
});

test('gravity-only sloped roof has positive normal and downslope reaction components with no wind term', () => {
  const model=solveRoofBay({preset:PRESET,rafterSpacingM:3,roofSlopeLengthM:4,maxPurlinSpacingM:0.8,slopeDeg:30,mode:'gravity',deadLoadKPa:0.2,roofLiveLoadKPa:0.75,windPressureKPa:9,windSense:'uplift'});
  assert.equal(model.conservation.normal.applied.windKN,0);
  assert.equal(model.conservation.parallel.applied.windKN,0);
  assert.ok(model.conservation.normal.applied.totalKN>0);
  assert.ok(model.conservation.parallel.applied.totalKN>0);
  assert.ok(model.rafters.left.normalKN>0);
  assert.ok(model.rafters.left.parallelKN>0);
  assert.ok(Math.abs(model.rafters.left.normalKN-model.rafters.right.normalKN)<1e-12);
  assert.ok(Math.abs(model.rafters.left.parallelKN-model.rafters.right.parallelKN)<1e-12);
  assert.equal(model.conservation.normal.pass,true);
  assert.equal(model.conservation.parallel.pass,true);
});

test('custom nonuniform roof bay conserves load, preserves supplied stations and exposes exact bands', () => {
  const stations = [0.15, 0.72, 1.48, 2.4, 3.18, 3.8];
  const model = solveRoofBay({
    preset: PRESET,
    rafterSpacingM: 3,
    roofSlopeLengthM: 4,
    maxPurlinSpacingM: 0.8,
    customPurlinStationsM: stations,
    slopeDeg: 25,
    mode: 'combined',
    deadLoadKPa: 0.2,
    roofLiveLoadKPa: 0.75,
    windPressureKPa: 1.5,
    windSense: 'uplift'
  });
  assert.equal(model.geometry.layoutMode, 'custom-stations');
  assert.deepEqual(model.geometry.stationsM, stations);
  assert.equal(model.geometry.actualSpacingM, null);
  assert.equal(model.purlins[0].tributaryStartM, 0);
  assert.equal(model.purlins.at(-1).tributaryEndM, 4);
  assert.deepEqual(model.geometry.tributaryBands.map(({ startM, endM }) => [startM, endM]), model.purlins.map((item) => [item.tributaryStartM, item.tributaryEndM]));
  assert.ok(Math.abs(model.geometry.tributaryWidthsM.reduce((sum, value) => sum + value, 0) - 4) < 1e-12);
  assert.equal(model.equilibrium.pass, true);
  assert.ok(model.equilibrium.relativeResidual < 1e-12);
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
  assert.equal(model.conservation.normal.applied.windKN,model.applied.normalKN);
  assert.equal(model.conservation.normal.applied.roofAreaGravityKN,0);
  assert.equal(model.conservation.normal.applied.purlinSelfWeightKN,0);
  assert.equal(model.conservation.parallel.applied.totalKN,0);
  assert.equal(model.conservation.parallel.reactions.totalKN,0);
  assert.equal(model.conservation.normal.pass,true);
  assert.equal(model.conservation.parallel.pass,true);
  assert.equal(model.equilibrium.pass, true);
});
