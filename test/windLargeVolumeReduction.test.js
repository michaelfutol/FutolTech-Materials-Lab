import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import {
  computeLargeVolumeReductionFactor,
  resolveLargeVolumeInternalPressureReduction,
  serializeLargeVolumeInternalPressureReduction,
  parseLargeVolumeInternalPressureReduction
} from '../src/solver/windLargeVolumeReduction.js';

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

function pressureContext(classification = 'partially-enclosed') {
  return createWindPressureContextAcceptance({
    windProjectInputAcceptance: WIND_INPUT,
    enclosureClassification: classification,
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

function partialBase() {
  return resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: pressureContext() });
}

test('Ri hand benchmark Vi = 6950 m3 and Aog = 1 m2 gives ratio 1 and Ri = 0.8535533905932737', () => {
  const result = computeLargeVolumeReductionFactor({
    unpartitionedInternalVolumeM3: 6950,
    totalEnvelopeOpeningAreaM2: 1
  });
  assert.equal(result.dimensionlessRatioViOver6950Aog, 1);
  assert.ok(Math.abs(result.equationRi - 0.8535533905932737) < 1e-15);
});

test('qualifying partially enclosed building may explicitly keep conservative Ri = 1.0', () => {
  const record = resolveLargeVolumeInternalPressureReduction({
    baseInternalPressureCoefficient: partialBase(),
    containsSingleUnpartitionedLargeVolume: true,
    applicabilitySourceReference: 'Engineer large-volume applicability assessment',
    totalEnvelopeOpeningAreaM2: 1,
    openingAreaSourceReference: 'Envelope opening takeoff',
    unpartitionedInternalVolumeM3: 6950,
    internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
    applicationChoice: 'conservative-ri-1'
  });
  assert.equal(record.status, 'RI_1_CONSERVATIVE_SELECTED');
  assert.equal(record.codeEquation.equationRi, 0.8535533905932737);
  assert.equal(record.selection.selectedRi, 1);
  assert.equal(record.selection.applied, false);
  assert.deepEqual(record.adjustedGcpiCases, [0.55, -0.55]);
});

test('qualifying partially enclosed building may explicitly select the equation reduction', () => {
  const record = resolveLargeVolumeInternalPressureReduction({
    baseInternalPressureCoefficient: partialBase(),
    containsSingleUnpartitionedLargeVolume: true,
    applicabilitySourceReference: 'Engineer large-volume applicability assessment',
    totalEnvelopeOpeningAreaM2: 1,
    openingAreaSourceReference: 'Envelope opening takeoff',
    unpartitionedInternalVolumeM3: 6950,
    internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
    applicationChoice: 'equation-reduction'
  });
  assert.equal(record.status, 'RI_EQUATION_REDUCTION_SELECTED');
  assert.equal(record.selection.selectedRi, 0.8535533905932737);
  assert.equal(record.selection.applied, true);
  assert.ok(Math.abs(record.adjustedGcpiCases[0] - 0.4694543648263006) < 1e-15);
  assert.ok(Math.abs(record.adjustedGcpiCases[1] + 0.4694543648263006) < 1e-15);
  assert.equal(record.implementation.finalRoofPressureImplemented, false);
});

test('engineer-declared non-qualifying partially enclosed building keeps Ri = 1 without unused quantitative inputs', () => {
  const record = resolveLargeVolumeInternalPressureReduction({
    baseInternalPressureCoefficient: partialBase(),
    containsSingleUnpartitionedLargeVolume: false,
    applicabilitySourceReference: 'Engineer assessment: not a single unpartitioned large volume'
  });
  assert.equal(record.status, 'RI_NOT_APPLICABLE_ENGINEER_DECLARED');
  assert.equal(record.selection.applicationChoice, 'not-applicable');
  assert.equal(record.selection.selectedRi, 1);
  assert.equal(record.selection.applied, false);
  assert.equal(record.codeEquation.equationRi, null);
  assert.deepEqual(record.adjustedGcpiCases, [0.55, -0.55]);
});

test('Ri resolver rejects enclosed/open upstream classifications', () => {
  for (const classification of ['enclosed', 'open']) {
    const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: pressureContext(classification) });
    assert.throws(() => resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: base,
      containsSingleUnpartitionedLargeVolume: false,
      applicabilitySourceReference: 'Engineer assessment'
    }), /applies only to a partially enclosed building/);
  }
});

test('qualifying Ri calculation requires positive Aog and Vi plus project source references', () => {
  const common = {
    baseInternalPressureCoefficient: partialBase(),
    containsSingleUnpartitionedLargeVolume: true,
    applicabilitySourceReference: 'Engineer large-volume applicability assessment',
    openingAreaSourceReference: 'Envelope opening takeoff',
    internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
    applicationChoice: 'equation-reduction'
  };
  assert.throws(() => resolveLargeVolumeInternalPressureReduction({ ...common, totalEnvelopeOpeningAreaM2: 0, unpartitionedInternalVolumeM3: 6950 }), /greater than zero/);
  assert.throws(() => resolveLargeVolumeInternalPressureReduction({ ...common, totalEnvelopeOpeningAreaM2: 1, unpartitionedInternalVolumeM3: 0 }), /greater than zero/);
  assert.throws(() => resolveLargeVolumeInternalPressureReduction({ ...common, totalEnvelopeOpeningAreaM2: 1, unpartitionedInternalVolumeM3: 6950, openingAreaSourceReference: '' }), /openingAreaSourceReference/);
});

test('Ri record round-trips deterministically for conservative, reduced and not-applicable paths', () => {
  const cases = [
    resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: partialBase(),
      containsSingleUnpartitionedLargeVolume: true,
      applicabilitySourceReference: 'Engineer large-volume applicability assessment',
      totalEnvelopeOpeningAreaM2: 1,
      openingAreaSourceReference: 'Envelope opening takeoff',
      unpartitionedInternalVolumeM3: 6950,
      internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
      applicationChoice: 'conservative-ri-1'
    }),
    resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: partialBase(),
      containsSingleUnpartitionedLargeVolume: true,
      applicabilitySourceReference: 'Engineer large-volume applicability assessment',
      totalEnvelopeOpeningAreaM2: 1,
      openingAreaSourceReference: 'Envelope opening takeoff',
      unpartitionedInternalVolumeM3: 6950,
      internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
      applicationChoice: 'equation-reduction'
    }),
    resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: partialBase(),
      containsSingleUnpartitionedLargeVolume: false,
      applicabilitySourceReference: 'Engineer assessment: not a single unpartitioned large volume'
    })
  ];
  for (const record of cases) {
    const first = serializeLargeVolumeInternalPressureReduction(record);
    const second = serializeLargeVolumeInternalPressureReduction(parseLargeVolumeInternalPressureReduction(first));
    assert.equal(second, first);
  }
});

test('Ri record cannot mutate selected factor, adjusted GCpi or downstream implementation flags', () => {
  const record = resolveLargeVolumeInternalPressureReduction({
    baseInternalPressureCoefficient: partialBase(),
    containsSingleUnpartitionedLargeVolume: true,
    applicabilitySourceReference: 'Engineer large-volume applicability assessment',
    totalEnvelopeOpeningAreaM2: 1,
    openingAreaSourceReference: 'Envelope opening takeoff',
    unpartitionedInternalVolumeM3: 6950,
    internalVolumeSourceReference: 'Dimensioned building-volume takeoff',
    applicationChoice: 'equation-reduction'
  });

  const factor = structuredClone(record);
  factor.selection.selectedRi = 0.7;
  assert.throws(() => serializeLargeVolumeInternalPressureReduction(factor), /selectedRi is not deterministic/);

  const adjusted = structuredClone(record);
  adjusted.adjustedGcpiCases[0] = 0.5;
  assert.throws(() => serializeLargeVolumeInternalPressureReduction(adjusted), /adjustedGcpiCases must equal/);

  const promoted = structuredClone(record);
  promoted.implementation.finalRoofPressureImplemented = true;
  assert.throws(() => serializeLargeVolumeInternalPressureReduction(promoted), /finalRoofPressureImplemented must remain false/);
});