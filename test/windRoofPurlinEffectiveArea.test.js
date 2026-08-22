import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import {
  resolveRoofPurlinEffectiveWindArea,
  serializeRoofPurlinEffectiveWindArea,
  parseRoofPurlinEffectiveWindArea
} from '../src/solver/windRoofPurlinEffectiveArea.js';

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

const PRESSURE_CONTEXT = createWindPressureContextAcceptance({
  windProjectInputAcceptance: WIND_INPUT,
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

function areaRecord(overrides = {}) {
  return resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: PRESSURE_CONTEXT,
    purlinSpanM: 4,
    actualTributaryWidthM: 1,
    purlinGeometrySourceReference: 'Roof Bay accepted purlin span and tributary-band geometry',
    effectiveWidthSelection: 'actual-tributary-width',
    effectiveWidthSelectionSourceReference: 'Engineer conservative coefficient-selection area decision',
    ...overrides
  });
}

test('roof purlin C&C conservative actual-width path keeps coefficient area equal to actual load area', () => {
  const record = areaRecord();
  assert.equal(record.designProcedure, 'components-and-cladding');
  assert.equal(record.target.class, 'roof-purlin');
  assert.equal(record.geometry.actualLoadApplicationAreaM2, 4);
  assert.ok(Math.abs(record.coefficientSelection.oneThirdSpanWidthM - 4 / 3) < 1e-12);
  assert.equal(record.coefficientSelection.effectiveWidthM, 1);
  assert.equal(record.coefficientSelection.effectiveWindAreaM2, 4);
  assert.equal(record.coefficientSelection.enlargedBeyondActualTributaryArea, false);
  assert.equal(record.implementation.externalPressureCoefficientImplemented, false);
  assert.equal(record.implementation.finalRoofPressureImplemented, false);
});

test('one-third-span minimum path enlarges coefficient-selection area without changing actual load-application area', () => {
  const record = areaRecord({
    effectiveWidthSelection: 'one-third-span-minimum',
    effectiveWidthSelectionSourceReference: 'Engineer selection of the NSCP C&C one-third-span effective-width provision'
  });
  assert.equal(record.geometry.actualTributaryWidthM, 1);
  assert.equal(record.geometry.actualLoadApplicationAreaM2, 4);
  assert.ok(Math.abs(record.coefficientSelection.effectiveWidthM - 4 / 3) < 1e-12);
  assert.ok(Math.abs(record.coefficientSelection.effectiveWindAreaM2 - 16 / 3) < 1e-12);
  assert.equal(record.coefficientSelection.enlargedBeyondActualTributaryArea, true);
});

test('one-third-span selection never shrinks a wider actual tributary width', () => {
  const record = areaRecord({
    actualTributaryWidthM: 1.5,
    effectiveWidthSelection: 'one-third-span-minimum',
    effectiveWidthSelectionSourceReference: 'Engineer selection of the NSCP C&C one-third-span effective-width provision'
  });
  assert.equal(record.coefficientSelection.effectiveWidthM, 1.5);
  assert.equal(record.geometry.actualLoadApplicationAreaM2, 6);
  assert.equal(record.coefficientSelection.effectiveWindAreaM2, 6);
  assert.equal(record.coefficientSelection.enlargedBeyondActualTributaryArea, false);
});

test('effective-width selection is explicit and source-referenced', () => {
  assert.throws(() => areaRecord({ effectiveWidthSelection: undefined }), /effectiveWidthSelection must be a non-empty string/);
  assert.throws(() => areaRecord({ effectiveWidthSelection: 'automatic-best' }), /must be one of/);
  assert.throws(() => areaRecord({ effectiveWidthSelectionSourceReference: '' }), /effectiveWidthSelectionSourceReference must be a non-empty string/);
  assert.throws(() => areaRecord({ purlinGeometrySourceReference: '' }), /purlinGeometrySourceReference must be a non-empty string/);
});

test('roof purlin effective-area record round-trips deterministically', () => {
  for (const selection of ['actual-tributary-width', 'one-third-span-minimum']) {
    const record = areaRecord({
      effectiveWidthSelection: selection,
      effectiveWidthSelectionSourceReference: `Engineer recorded ${selection} selection`
    });
    const first = serializeRoofPurlinEffectiveWindArea(record);
    const second = serializeRoofPurlinEffectiveWindArea(parseRoofPurlinEffectiveWindArea(first));
    assert.equal(second, first);
  }
});

test('mutated effective area or load-application area is rejected', () => {
  const effective = areaRecord({
    effectiveWidthSelection: 'one-third-span-minimum',
    effectiveWidthSelectionSourceReference: 'Engineer selection of the NSCP C&C one-third-span effective-width provision'
  });
  effective.coefficientSelection.effectiveWindAreaM2 = 99;
  assert.throws(() => serializeRoofPurlinEffectiveWindArea(effective), /must equal span times selected effective width/);

  const loadArea = areaRecord();
  loadArea.geometry.actualLoadApplicationAreaM2 = 99;
  assert.throws(() => serializeRoofPurlinEffectiveWindArea(loadArea), /must equal purlin span times actual tributary width/);
});

test('effective-area slice cannot silently promote external GCp, sheet/fastener area, or final pressure', () => {
  for (const flag of [
    'roofSheetEffectiveWindAreaImplemented',
    'fastenerEffectiveWindAreaImplemented',
    'externalPressureCoefficientImplemented',
    'fieldEdgeCornerGeometryImplemented',
    'externalInternalPressureCombinationImplemented',
    'finalRoofPressureImplemented'
  ]) {
    const promoted = areaRecord();
    promoted.implementation[flag] = true;
    assert.throws(() => serializeRoofPurlinEffectiveWindArea(promoted), new RegExp(`${flag} must remain false`));
  }
});

test('effective-area resolution does not become a purlin capacity claim', () => {
  const record = areaRecord();
  record.target.capacityStatus = 'PASS';
  assert.throws(() => serializeRoofPurlinEffectiveWindArea(record), /must not promote purlin capacity status/);
});
