import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import {
  resolveBaseInternalPressureCoefficient,
  serializeBaseInternalPressureCoefficient,
  parseBaseInternalPressureCoefficient
} from '../src/solver/windInternalPressureCoefficient.js';

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

function context(enclosureClassification) {
  return createWindPressureContextAcceptance({
    windProjectInputAcceptance: WIND_INPUT,
    enclosureClassification,
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
}

test('NSCP 2015 open-building base GCpi resolves to zero only', () => {
  const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('open') });
  assert.equal(record.status, 'BASE_GCPI_RESOLVED');
  assert.deepEqual(record.baseGcpiCases, [0]);
  assert.equal(record.largeVolumeReduction.applicability, 'NOT_APPLICABLE_TO_THIS_ENCLOSURE_CLASSIFICATION');
  assert.equal(record.largeVolumeReduction.factorRi, 1);
  assert.equal(record.implementation.finalRoofPressureImplemented, false);
});

test('NSCP 2015 enclosed-building base GCpi resolves both positive and negative cases', () => {
  const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('enclosed') });
  assert.equal(record.status, 'BASE_GCPI_RESOLVED');
  assert.deepEqual(record.baseGcpiCases, [0.18, -0.18]);
  assert.equal(record.signConvention.positive, 'pressure acting toward the internal surfaces');
  assert.equal(record.signConvention.negative, 'pressure acting away from the internal surfaces');
});

test('NSCP 2015 partially enclosed base GCpi stays blocked behind unresolved large-volume Ri applicability', () => {
  const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('partially-enclosed') });
  assert.equal(record.status, 'BASE_GCPI_RESOLVED_RI_APPLICABILITY_BLOCKED');
  assert.deepEqual(record.baseGcpiCases, [0.55, -0.55]);
  assert.equal(record.largeVolumeReduction.applicability, 'UNRESOLVED');
  assert.equal(record.largeVolumeReduction.factorRi, null);
  assert.equal(record.largeVolumeReduction.applied, false);
  assert.equal(record.largeVolumeReduction.requiredProjectFacts.length, 3);
  assert.equal(record.implementation.largeVolumeReductionFactorImplemented, false);
  assert.equal(record.implementation.internalPressureVelocitySelectionImplemented, false);
  assert.equal(record.implementation.finalRoofPressureImplemented, false);
});

test('base GCpi record round-trips deterministically', () => {
  for (const classification of ['open', 'enclosed', 'partially-enclosed']) {
    const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context(classification) });
    const first = serializeBaseInternalPressureCoefficient(record);
    const second = serializeBaseInternalPressureCoefficient(parseBaseInternalPressureCoefficient(first));
    assert.equal(second, first);
  }
});

test('base GCpi record cannot be promoted into an Ri or final-pressure claim', () => {
  const reduced = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('partially-enclosed') });
  reduced.largeVolumeReduction.factorRi = 0.8;
  assert.throws(() => serializeBaseInternalPressureCoefficient(reduced), /Ri factor must remain null/);

  const promoted = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('enclosed') });
  promoted.implementation.finalRoofPressureImplemented = true;
  assert.throws(() => serializeBaseInternalPressureCoefficient(promoted), /finalRoofPressureImplemented must remain false/);
});

test('base GCpi record cannot detach from upstream accepted enclosure classification', () => {
  const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('enclosed') });
  record.enclosureClassification = 'open';
  assert.throws(() => serializeBaseInternalPressureCoefficient(record), /must match the upstream pressure-context record/);
});

test('base GCpi record cannot mutate the code table cases', () => {
  const record = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context('enclosed') });
  record.baseGcpiCases = [0.2, -0.2];
  assert.throws(() => serializeBaseInternalPressureCoefficient(record), /do not match the implemented NSCP 2015 Table 207A\.11-1/);
});