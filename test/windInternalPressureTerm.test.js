import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import { resolveLargeVolumeInternalPressureReduction } from '../src/solver/windLargeVolumeReduction.js';
import {
  resolveInternalPressureTerm,
  serializeInternalPressureTerm,
  parseInternalPressureTerm,
  validateInternalPressureTerm
} from '../src/solver/windInternalPressureTerm.js';

function windProject() {
  return createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
    siteSourceReference: 'Project survey/site record',
    occupancyCategory: 'III',
    occupancySourceReference: 'Engineer occupancy classification record',
    basicWindSpeedKph: 240,
    windSpeedSourceType: 'authorized-code-map',
    windSpeedSourceReference: 'Engineer transcription from authorized NSCP wind map',
    windSpeedSelectionMethod: 'direct-contour-read',
    windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C',
    exposureSourceReference: 'Engineer exposure classification record',
    topographicFactorKzt: 1,
    topographySourceReference: 'Engineer topographic-factor record',
    heightM: 8.82,
    heightSourceReference: 'Project mean roof height record'
  });
}

function baseGcpi(classification) {
  const pressureContext = createWindPressureContextAcceptance({
    windProjectInputAcceptance: windProject(),
    enclosureClassification: classification,
    enclosureClassificationSourceReference: 'Engineer enclosure classification record',
    openingsAssessmentSourceReference: 'Project opening assessment record',
    roofForm: 'gable',
    roofFormSourceReference: 'Project roof plan',
    planLengthM: 12,
    planWidthM: 8,
    planDimensionSourceReference: 'Project roof plan dimensions',
    meanRoofHeightM: 8.82,
    meanRoofHeightSourceReference: 'Project mean roof height record',
    roofSlopeDeg: 25,
    roofSlopeSourceReference: 'Project roof geometry record'
  });
  return resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: pressureContext });
}

function partialRi(base, choice = 'conservative-ri-1') {
  return resolveLargeVolumeInternalPressureReduction({
    baseInternalPressureCoefficient: base,
    containsSingleUnpartitionedLargeVolume: true,
    applicabilitySourceReference: 'Engineer large-volume applicability assessment',
    totalEnvelopeOpeningAreaM2: 1,
    openingAreaSourceReference: 'Project opening schedule',
    unpartitionedInternalVolumeM3: 6950,
    internalVolumeSourceReference: 'Project internal volume calculation',
    applicationChoice: choice
  });
}

test('enclosed building uses qh for both positive and negative internal pressure terms', () => {
  const base = baseGcpi('enclosed');
  const result = resolveInternalPressureTerm({ baseInternalPressureCoefficient: base });
  assert.equal(result.enclosureClassification, 'enclosed');
  assert.equal(result.selection.positivePartiallyEnclosedVelocitySelection, 'not-applicable');
  assert.equal(result.cases.length, 2);
  assert.equal(result.cases[0].velocityPressureBasis, 'qh-at-mean-roof-height');
  assert.equal(result.cases[1].velocityPressureBasis, 'qh-at-mean-roof-height');
  assert.ok(Math.abs(result.cases[0].internalPressureTermKPa - result.qh.qKPa * 0.18) < 1e-12);
  assert.ok(Math.abs(result.cases[1].internalPressureTermKPa + result.qh.qKPa * 0.18) < 1e-12);
});

test('partially enclosed conservative positive evaluation uses qh while negative also uses qh', () => {
  const base = baseGcpi('partially-enclosed');
  const ri = partialRi(base, 'conservative-ri-1');
  const result = resolveInternalPressureTerm({
    baseInternalPressureCoefficient: base,
    largeVolumeReduction: ri,
    positivePartiallyEnclosedVelocitySelection: 'conservative-qh'
  });
  assert.equal(result.cases[0].velocityPressureBasis, 'qh-at-mean-roof-height');
  assert.equal(result.cases[1].velocityPressureBasis, 'qh-at-mean-roof-height');
  assert.equal(result.positivePartiallyEnclosedQz, null);
  assert.ok(Math.abs(result.cases[0].qiKPa - result.qh.qKPa) < 1e-12);
  assert.ok(Math.abs(result.cases[1].qiKPa - result.qh.qKPa) < 1e-12);
});

test('partially enclosed positive internal pressure may use qz at highest opening while negative stays qh', () => {
  const base = baseGcpi('partially-enclosed');
  const ri = partialRi(base, 'equation-reduction');
  const result = resolveInternalPressureTerm({
    baseInternalPressureCoefficient: base,
    largeVolumeReduction: ri,
    positivePartiallyEnclosedVelocitySelection: 'highest-opening-qz',
    highestOpeningHeightM: 5,
    highestOpeningHeightSourceReference: 'Project opening schedule: highest relevant opening elevation'
  });
  assert.equal(result.cases[0].velocityPressureBasis, 'qz-at-highest-opening');
  assert.equal(result.cases[1].velocityPressureBasis, 'qh-at-mean-roof-height');
  assert.ok(result.positivePartiallyEnclosedQz.qKPa < result.qh.qKPa);
  assert.ok(Math.abs(result.cases[0].qiKPa - result.positivePartiallyEnclosedQz.qKPa) < 1e-12);
  assert.ok(Math.abs(result.cases[1].qiKPa - result.qh.qKPa) < 1e-12);
  assert.ok(Math.abs(result.gcpiCases[0] - 0.4694543648263006) < 1e-12);
});

test('partially enclosed term refuses to bypass the explicit Ri decision record', () => {
  const base = baseGcpi('partially-enclosed');
  assert.throws(
    () => resolveInternalPressureTerm({ baseInternalPressureCoefficient: base }),
    /requires a resolved largeVolumeReduction record/
  );
});

test('open building preserves zero internal pressure term without inventing external pressure', () => {
  const base = baseGcpi('open');
  const result = resolveInternalPressureTerm({ baseInternalPressureCoefficient: base });
  assert.deepEqual(result.gcpiCases, [0]);
  assert.equal(result.cases[0].internalPressureTermKPa, 0);
  assert.equal(result.implementation.externalPressureCoefficientImplemented, false);
  assert.equal(result.implementation.finalRoofPressureImplemented, false);
});

test('internal pressure term round-trips deterministically', () => {
  const base = baseGcpi('partially-enclosed');
  const ri = partialRi(base, 'equation-reduction');
  const record = resolveInternalPressureTerm({
    baseInternalPressureCoefficient: base,
    largeVolumeReduction: ri,
    positivePartiallyEnclosedVelocitySelection: 'highest-opening-qz',
    highestOpeningHeightM: 5,
    highestOpeningHeightSourceReference: 'Project highest opening elevation'
  });
  const text = serializeInternalPressureTerm(record);
  assert.deepEqual(parseInternalPressureTerm(text), record);
  assert.equal(serializeInternalPressureTerm(parseInternalPressureTerm(text)), text);
});

test('mutated qi or internal term cannot be silently accepted', () => {
  const base = baseGcpi('enclosed');
  const record = resolveInternalPressureTerm({ baseInternalPressureCoefficient: base });
  record.cases[0].qiKPa += 0.1;
  assert.throws(() => validateInternalPressureTerm(record), /Internal pressure qi changed/);

  const record2 = resolveInternalPressureTerm({ baseInternalPressureCoefficient: base });
  record2.cases[0].internalPressureTermKPa += 0.1;
  assert.throws(() => validateInternalPressureTerm(record2), /must equal qi multiplied by GCpi/);
});
