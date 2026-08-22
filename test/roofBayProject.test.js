import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject, parseRoofBayProject, serializeRoofBayProject } from '../src/interchange/roofBayProject.js';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';

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

const ACCEPTED_WIND_INPUT = createWindProjectInputAcceptance({
  siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
  siteSourceReference: 'Project site record / survey reference',
  occupancyCategory: 'III',
  occupancySourceReference: 'Project occupancy classification record; verify against NSCP 2015 Table 103-1',
  basicWindSpeedKph: 240,
  windSpeedSourceType: 'authorized-code-map',
  windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map for the stated site',
  windSpeedSelectionMethod: 'direct-contour-read',
  windSpeedFigureId: '207A.5-1A',
  exposureCategory: 'C',
  exposureSourceReference: 'Engineer terrain/exposure classification record',
  topographicFactorKzt: 1,
  topographySourceReference: 'Engineer topographic-factor project record',
  heightM: 8.82,
  heightSourceReference: 'Project geometry / mean-roof-height record'
});

const ACCEPTED_PRESSURE_CONTEXT = createWindPressureContextAcceptance({
  windProjectInputAcceptance: ACCEPTED_WIND_INPUT,
  enclosureClassification: 'enclosed',
  enclosureClassificationSourceReference: 'Engineer enclosure classification record; verify against authorized NSCP copy',
  openingsAssessmentSourceReference: 'Project opening schedule and façade assessment',
  roofForm: 'gable',
  roofFormSourceReference: 'Architectural roof plan A-201',
  planLengthM: 12.4,
  planWidthM: 8.6,
  planDimensionSourceReference: 'Dimensioned architectural plan A-101',
  meanRoofHeightM: 8.82,
  meanRoofHeightSourceReference: 'Project geometry / mean-roof-height record',
  roofSlopeDeg: 25,
  roofSlopeSourceReference: 'Roof section A-301'
});

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

test('accepted project wind inputs are embedded and deterministically produce q-ready basis without replacing manual Roof Bay pressure', () => {
  const project = createRoofBayProject({ ...INPUT, windProjectInputAcceptance: ACCEPTED_WIND_INPUT });
  assert.equal(project.windProjectInputAcceptance.schemaVersion, 'futoltech.wind-project-input-acceptance/1');
  assert.equal(project.windProjectInputAcceptance.status, 'ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY');
  assert.equal(project.windDesignBasis.calculationStatus, 'VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED');
  assert.ok(Math.abs(project.windDesignBasis.velocityPressure.result.qKPa - 2.257467958862151) < 1e-12);
  assert.equal(project.pressureZoning.activePressureModel, 'manual-uniform');
  assert.equal(project.pressureZoning.codeBasis, null);
  assert.deepEqual(project.pressureZoning.regions, []);
});

test('accepted pressure context is embedded with its exact upstream wind record while code pressure remains blocked', () => {
  const project = createRoofBayProject({
    ...INPUT,
    windProjectInputAcceptance: ACCEPTED_WIND_INPUT,
    windPressureContextAcceptance: ACCEPTED_PRESSURE_CONTEXT
  });
  assert.equal(project.windPressureContextAcceptance.schemaVersion, 'futoltech.wind-pressure-context-acceptance/1');
  assert.equal(project.windPressureContextAcceptance.status, 'ACCEPTED_FOR_PRESSURE_COEFFICIENT_INPUT_CONTEXT_ONLY');
  assert.equal(project.windPressureContextAcceptance.enclosure.classification, 'enclosed');
  assert.equal(project.windPressureContextAcceptance.roofGeometry.roofSlopeDeg, INPUT.slopeDeg);
  assert.deepEqual(project.windPressureContextAcceptance.upstreamWindProjectInputAcceptance, project.windProjectInputAcceptance);
  assert.equal(project.pressureZoning.activePressureModel, 'manual-uniform');
  assert.equal(project.pressureZoning.codeBasis, null);
  assert.deepEqual(project.pressureZoning.regions, []);
  assert.equal(project.analysisBoundary.codeWindZoning, 'UNRESOLVED');
});

test('pressure-context project cannot detach from the exact accepted wind input record', () => {
  const changedWind = structuredClone(ACCEPTED_WIND_INPUT);
  changedWind.note = 'Different accepted project note';
  assert.throws(() => createRoofBayProject({
    ...INPUT,
    windProjectInputAcceptance: changedWind,
    windPressureContextAcceptance: ACCEPTED_PRESSURE_CONTEXT
  }), /exact windProjectInputAcceptance record/);
});

test('pressure-context project rejects roof-slope drift from active Roof Bay geometry', () => {
  assert.throws(() => createRoofBayProject({
    ...INPUT,
    slopeDeg: 24,
    windProjectInputAcceptance: ACCEPTED_WIND_INPUT,
    windPressureContextAcceptance: ACCEPTED_PRESSURE_CONTEXT
  }), /roof slope must match geometry\.slopeDeg/);
});

test('accepted pressure-context Roof Bay project round-trips exactly', () => {
  const project = createRoofBayProject({
    ...INPUT,
    windProjectInputAcceptance: ACCEPTED_WIND_INPUT,
    windPressureContextAcceptance: ACCEPTED_PRESSURE_CONTEXT
  });
  const first = serializeRoofBayProject(project);
  const second = serializeRoofBayProject(parseRoofBayProject(first));
  assert.equal(second, first);
});

test('accepted wind-input project cannot detach or mutate its derived velocity-pressure basis', () => {
  const project = createRoofBayProject({ ...INPUT, windProjectInputAcceptance: ACCEPTED_WIND_INPUT });
  project.windDesignBasis.velocityPressure.result.qKPa += 0.1;
  assert.throws(() => serializeRoofBayProject(project), /deterministically derived from windProjectInputAcceptance/);
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
  assert.throws(() => serializeRoofBayProject(project), /calculationStatus (?:must remain BLOCKED|is unsupported)/);
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

test('accepted wind-input Roof Bay project also round-trips exactly', () => {
  const project = createRoofBayProject({ ...INPUT, windProjectInputAcceptance: ACCEPTED_WIND_INPUT });
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