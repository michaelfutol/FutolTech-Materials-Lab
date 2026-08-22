import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject, parseRoofBayProject, serializeRoofBayProject } from '../src/interchange/roofBayProject.js';

const INPUT = {
  projectId: 'RB-001',
  projectName: 'M2 benchmark bay',
  sectionId: 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8',
  rafterSpacingM: 3,
  roofSlopeLengthM: 4,
  maxPurlinSpacingM: 0.8,
  slopeDeg: 25,
  orientationDeg: 0,
  yieldStrengthMPa: 250,
  mode: 'combined',
  deadLoadKPa: 0.2,
  roofLiveLoadKPa: 0.75,
  windPressureKPa: 1.5,
  windSense: 'uplift',
  loadFactor: 1
};

test('Roof Bay project keeps geometry, material reference and loading explicit', () => {
  const project = createRoofBayProject(INPUT);
  assert.equal(project.schemaVersion, 'futoltech.roof-bay-project/1');
  assert.equal(project.geometry.rafterSpacingM, 3);
  assert.equal(project.geometry.layoutMode, 'equal-max-spacing');
  assert.equal(project.purlin.sectionId, INPUT.sectionId);
  assert.equal(project.loading.windSense, 'uplift');
});

test('Roof Bay M2 project cannot silently promote unresolved design checks', () => {
  const project = createRoofBayProject(INPUT);
  project.analysisBoundary.fastenerCapacity = 'PASS';
  assert.throws(() => serializeRoofBayProject(project), /fastenerCapacity must remain UNRESOLVED/);
});

test('Roof Bay project serialization is deterministic and round-trips exactly', () => {
  const project = createRoofBayProject(INPUT);
  const first = serializeRoofBayProject(project);
  const second = serializeRoofBayProject(parseRoofBayProject(first));
  assert.equal(second, first);
});

test('custom station project preserves exact nonuniform station list in schema v1', () => {
  const stations = [0.15, 0.72, 1.48, 2.4, 3.18, 3.8];
  const project = createRoofBayProject({ ...INPUT, layoutMode:'custom-stations', purlinStationsM:stations });
  assert.equal(project.geometry.layoutMode, 'custom-stations');
  assert.deepEqual(project.geometry.purlinStationsM, stations);
  const roundTrip = parseRoofBayProject(serializeRoofBayProject(project));
  assert.deepEqual(roundTrip.geometry.purlinStationsM, stations);
});

test('schema v1 remains backward compatible when old equal-layout project omits layoutMode', () => {
  const project = createRoofBayProject(INPUT);
  delete project.geometry.layoutMode;
  assert.doesNotThrow(() => serializeRoofBayProject(project));
});

test('custom station project rejects duplicate and out-of-roof station values', () => {
  assert.throws(() => createRoofBayProject({ ...INPUT, layoutMode:'custom-stations', purlinStationsM:[0.2,1,1,3.8] }), /strictly increasing/);
  assert.throws(() => createRoofBayProject({ ...INPUT, layoutMode:'custom-stations', purlinStationsM:[0.2,1.4,4.2] }), /within the roof slope length/);
});

test('Roof Bay project rejects unsupported orientation and slope range', () => {
  assert.throws(() => createRoofBayProject({ ...INPUT, orientationDeg: 45 }), /0, 90, 180 or 270/);
  assert.throws(() => createRoofBayProject({ ...INPUT, slopeDeg: 75 }), /0 to 60/);
});
