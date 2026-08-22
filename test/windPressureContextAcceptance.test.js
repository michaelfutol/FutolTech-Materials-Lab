import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import {
  createWindPressureContextAcceptance,
  parseWindPressureContextAcceptance,
  serializeWindPressureContextAcceptance,
  validateWindPressureContextAcceptance
} from '../src/interchange/windPressureContextAcceptance.js';

const WIND_INPUT = createWindProjectInputAcceptance({
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

const CONTEXT = {
  windProjectInputAcceptance: WIND_INPUT,
  enclosureClassification: 'enclosed',
  enclosureClassificationSourceReference: 'Engineer enclosure classification record',
  openingsAssessmentSourceReference: 'Project envelope opening schedule / assessment',
  roofForm: 'gable',
  roofFormSourceReference: 'Architectural roof plan and elevations',
  planLengthM: 12,
  planWidthM: 8,
  planDimensionSourceReference: 'Architectural ground/roof plan dimensions',
  meanRoofHeightM: 8.82,
  meanRoofHeightSourceReference: 'Project roof elevation / mean-roof-height calculation',
  roofSlopeDeg: 25,
  roofSlopeSourceReference: 'Architectural roof section / slope annotation'
};

test('M3 pressure context accepts an engineer-declared enclosure classification and source-referenced roof geometry only', () => {
  const record = createWindPressureContextAcceptance(CONTEXT);
  assert.equal(record.schemaVersion, 'futoltech.wind-pressure-context-acceptance/1');
  assert.equal(record.status, 'ACCEPTED_FOR_PRESSURE_COEFFICIENT_INPUT_CONTEXT_ONLY');
  assert.equal(record.enclosure.classification, 'enclosed');
  assert.equal(record.enclosure.classificationStatus, 'ENGINEER_DECLARED_PROJECT_INPUT');
  assert.equal(record.roofGeometry.roofForm, 'gable');
  assert.equal(record.roofGeometry.planLengthM, 12);
  assert.equal(record.roofGeometry.planWidthM, 8);
  assert.equal(record.roofGeometry.meanRoofHeightM, 8.82);
  assert.equal(record.roofGeometry.roofSlopeDeg, 25);
  assert.equal(record.acceptance.automaticEnclosureClassificationImplemented, false);
  assert.equal(record.acceptance.internalPressureCoefficientImplemented, false);
  assert.equal(record.acceptance.externalPressureCoefficientImplemented, false);
  assert.equal(record.acceptance.fieldEdgeCornerGeometryImplemented, false);
  assert.equal(record.acceptance.finalRoofPressureImplemented, false);
  assert.match(record.boundary, /does not automatically classify enclosure/i);
  assert.doesNotThrow(() => validateWindPressureContextAcceptance(record));
});

test('the three NSCP enclosure classification labels remain explicit project inputs without automatic definition-threshold evaluation', () => {
  for (const classification of ['enclosed', 'partially-enclosed', 'open']) {
    const record = createWindPressureContextAcceptance({ ...CONTEXT, enclosureClassification: classification });
    assert.equal(record.enclosure.classification, classification);
    assert.equal(record.acceptance.codeDefinitionThresholdEvaluationImplemented, false);
  }
});

test('unsupported enclosure and roof-form labels are rejected rather than silently normalized into a code category', () => {
  assert.throws(() => createWindPressureContextAcceptance({ ...CONTEXT, enclosureClassification: 'semi-open' }), /must be one of enclosed, partially-enclosed, open/);
  assert.throws(() => createWindPressureContextAcceptance({ ...CONTEXT, roofForm: 'mystery-roof' }), /must be one of gable, hip, monoslope, flat, other/);
});

test('mean roof height cannot detach from the already accepted wind-project height in this slice', () => {
  assert.throws(
    () => createWindPressureContextAcceptance({ ...CONTEXT, meanRoofHeightM: 9.1 }),
    /must match the accepted wind-project evaluation\/mean-roof height/
  );
});

test('pressure context requires source references for the enclosure decision, opening assessment and physical roof geometry', () => {
  assert.throws(() => createWindPressureContextAcceptance({ ...CONTEXT, openingsAssessmentSourceReference: '' }), /openingsAssessmentSourceReference must be a non-empty string/);
  assert.throws(() => createWindPressureContextAcceptance({ ...CONTEXT, planDimensionSourceReference: '' }), /planDimensionSourceReference must be a non-empty string/);
  assert.throws(() => createWindPressureContextAcceptance({ ...CONTEXT, roofSlopeSourceReference: '' }), /roofSlopeSourceReference must be a non-empty string/);
});

test('pressure-context serialization is deterministic and round-trips exactly', () => {
  const record = createWindPressureContextAcceptance(CONTEXT);
  const first = serializeWindPressureContextAcceptance(record);
  const second = serializeWindPressureContextAcceptance(parseWindPressureContextAcceptance(first));
  assert.equal(second, first);
});

test('mutated records cannot silently claim automatic classification or implemented pressure coefficients', () => {
  const automatic = createWindPressureContextAcceptance(CONTEXT);
  automatic.acceptance.automaticEnclosureClassificationImplemented = true;
  assert.throws(() => validateWindPressureContextAcceptance(automatic), /must remain false/);

  const gcpi = createWindPressureContextAcceptance(CONTEXT);
  gcpi.acceptance.internalPressureCoefficientImplemented = true;
  assert.throws(() => validateWindPressureContextAcceptance(gcpi), /must remain false/);

  const detachedHeight = createWindPressureContextAcceptance(CONTEXT);
  detachedHeight.roofGeometry.meanRoofHeightM = 9;
  assert.throws(() => validateWindPressureContextAcceptance(detachedHeight), /must match the upstream accepted wind-project height/);
});
