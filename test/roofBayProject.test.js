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

test('Roof Bay project rejects unsupported orientation and slope range', () => {
  assert.throws(() => createRoofBayProject({ ...INPUT, orientationDeg: 45 }), /0, 90, 180 or 270/);
  assert.throws(() => createRoofBayProject({ ...INPUT, slopeDeg: 75 }), /0 to 60/);
});
