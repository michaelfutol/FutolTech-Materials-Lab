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

test('new Roof Bay project reserves M3 field edge corner zoning without claiming code zones', () => {
  const project = createRoofBayProject(INPUT);
  assert.equal(project.geometry.roofPlaneFrame.system, 'roof-local-xy-m');
  assert.equal(project.geometry.roofPlaneFrame.xExtentM, 3);
  assert.equal(project.geometry.roofPlaneFrame.yExtentM, 4);
  assert.equal(project.pressureZoning.schemaVersion, 'futoltech.roof-pressure-zones/1');
  assert.equal(project.pressureZoning.status, 'UNRESOLVED');
  assert.equal(project.pressureZoning.activePressureModel, 'manual-uniform');
  assert.deepEqual(project.pressureZoning.supportedRegionTypes, ['field', 'edge', 'corner']);
  assert.deepEqual(project.pressureZoning.regions, []);
  assert.equal(project.pressureZoning.codeBasis, null);
  assert.equal(project.pressureZoning.manualUniformWind.pressureKPa, INPUT.windPressureKPa);
  assert.equal(project.pressureZoning.manualUniformWind.sense, INPUT.windSense);
});

test('Roof Bay export carries source-backed M3 code identity while code pressure zoning stays inactive', () => {
  const project = createRoofBayProject(INPUT);
  assert.equal(project.windDesignBasis.schemaVersion, 'futoltech.wind-design-basis/1');
  assert.equal(project.windDesignBasis.adoptedCode.profileId, 'ph-nscp-2015-v1-7e-2p');
  assert.equal(project.windDesignBasis.adoptedCode.edition, '7th Edition');
  assert.equal(project.windDesignBasis.adoptedCode.printing, '2nd Printing');
  assert.equal(project.windDesignBasis.calculationStatus, 'BLOCKED');
  assert.ok(project.windDesignBasis.adoptedCode.evidence.length >= 2);
  assert.ok(Object.values(project.windDesignBasis.inputs).every((input) => input.status === 'UNRESOLVED'));
  assert.equal(project.pressureZoning.codeBasis, null);
  assert.equal(project.pressureZoning.activePressureModel, 'manual-uniform');
  assert.equal(project.analysisBoundary.codeWindZoning, 'UNRESOLVED');
});

test('Roof Bay M2 pressure zoning cannot silently invent a code-derived region or status', () => {
  const project = createRoofBayProject(INPUT);
  project.pressureZoning.regions.push({ id:'fake-corner', type:'corner', pressureKPa:9 });
  assert.throws(() => serializeRoofBayProject(project), /regions must remain empty until M3/);

  const promoted = createRoofBayProject(INPUT);
  promoted.pressureZoning.status = 'RESOLVED';
  assert.throws(() => serializeRoofBayProject(promoted), /status must remain UNRESOLVED/);

  const codeBasis = createRoofBayProject(INPUT);
  codeBasis.pressureZoning.codeBasis = { code:'NSCP' };
  assert.throws(() => serializeRoofBayProject(codeBasis), /codeBasis must remain null/);
});

test('Roof Bay project rejects silent promotion of the provenance-only wind basis', () => {
  const project = createRoofBayProject(INPUT);
  project.windDesignBasis.calculationStatus = 'READY';
  assert.throws(() => serializeRoofBayProject(project), /calculationStatus must remain BLOCKED/);
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

test('schema v1 remains backward compatible when older project omits additive M2/M3 bridge fields', () => {
  const project = createRoofBayProject(INPUT);
  delete project.geometry.layoutMode;
  delete project.geometry.roofPlaneFrame;
  delete project.pressureZoning;
  delete project.windDesignBasis;
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
