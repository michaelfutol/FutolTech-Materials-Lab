import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import {
  resolveWindRoofExternalGcp,
  serializeWindRoofExternalGcp,
  parseWindRoofExternalGcp
} from '../src/solver/windRoofExternalGcp.js';

function pressureContext({ slopeDeg = 25, planLengthM = 12, planWidthM = 8, heightM = 8.82 } = {}) {
  const wind = createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
    siteSourceReference: 'Project site record / survey reference',
    occupancyCategory: 'III',
    occupancySourceReference: 'Project occupancy classification record',
    basicWindSpeedKph: 240,
    windSpeedSourceType: 'authorized-code-map',
    windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map',
    windSpeedSelectionMethod: 'direct-contour-read',
    windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C',
    exposureSourceReference: 'Engineer terrain/exposure classification record',
    topographicFactorKzt: 1,
    topographySourceReference: 'Engineer topographic-factor project record',
    heightM,
    heightSourceReference: 'Project mean-roof-height record'
  });
  return createWindPressureContextAcceptance({
    windProjectInputAcceptance: wind,
    enclosureClassification: 'enclosed',
    enclosureClassificationSourceReference: 'Engineer enclosure classification record',
    openingsAssessmentSourceReference: 'Project openings assessment',
    roofForm: 'gable',
    roofFormSourceReference: 'Architectural roof plan',
    planLengthM,
    planWidthM,
    planDimensionSourceReference: 'Dimensioned architectural plan',
    meanRoofHeightM: heightM,
    meanRoofHeightSourceReference: 'Project mean-roof-height record',
    roofSlopeDeg: slopeDeg,
    roofSlopeSourceReference: 'Architectural roof section'
  });
}

function makeFixture({
  slopeDeg = 25,
  bayStartM = 0.4,
  baySpanM = 4,
  firstBandWidthM = 1,
  effectiveWidthSelection = 'actual-tributary-width',
  heightM = 8.82
} = {}) {
  const context = pressureContext({ slopeDeg, heightM });
  const theta = slopeDeg * Math.PI / 180;
  const slopeLengthM = 4 / Math.cos(theta);
  const bands = [
    { label: 'P1', startM: 0, endM: firstBandWidthM },
    { label: 'P2', startM: firstBandWidthM, endM: slopeLengthM }
  ];
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Roof section confirms symmetric gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: bayStartM,
    roofBaySpanM: baySpanM,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: bands,
    edgeDimensionHeightType: slopeDeg <= 10 ? 'eave-height' : 'mean-roof-height',
    edgeDimensionHeightM: slopeDeg <= 10 ? 8 : heightM,
    edgeDimensionHeightSourceReference: 'Accepted roof-height record'
  });
  const effectiveArea = resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: context,
    purlinSpanM: baySpanM,
    actualTributaryWidthM: firstBandWidthM,
    purlinGeometrySourceReference: 'Selected P1 physical Roof Bay geometry',
    effectiveWidthSelection,
    effectiveWidthSelectionSourceReference: 'Engineer-selected NSCP C&C effective-area rule path'
  });
  const record = resolveWindRoofExternalGcp({
    windRoofZoneGeometry: zones,
    roofPurlinEffectiveWindArea: effectiveArea,
    targetPurlinBandLabel: 'P1',
    codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B/2C project check',
    curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide Table G2-3/G2-4 equation cross-check'
  });
  return { context, zones, effectiveArea, record };
}

function caseByType(record, type) {
  return record.coefficientCases.find((item) => item.type === type);
}

test('2B benchmark evaluates 4.0 m2 purlin effective area on log10 curve and preserves separate zone coefficients', () => {
  const { record } = makeFixture();
  assert.equal(record.applicability.figureId, '207E.4-2B');
  assert.equal(record.coefficientArea.effectiveWindAreaM2, 4);
  assert.ok(Math.abs(record.coefficientArea.effectiveWindAreaFt2 - 43.05564166683889) < 1e-12);
  assert.equal(record.coefficientArea.regime, 'LOG10_INTERPOLATION');

  const field = caseByType(record, 'field');
  const edge = caseByType(record, 'edge');
  const corner = caseByType(record, 'corner');
  assert.ok(field && edge && corner, 'P1 benchmark should cross all three resolved zone types');
  assert.ok(Math.abs(field.positiveGCp - 0.3731939868014326) < 1e-12);
  assert.ok(Math.abs(edge.positiveGCp - 0.3731939868014326) < 1e-12);
  assert.ok(Math.abs(corner.positiveGCp - 0.3731939868014326) < 1e-12);
  assert.ok(Math.abs(field.negativeGCp - (-0.8365969934007164)) < 1e-12);
  assert.ok(Math.abs(edge.negativeGCp - (-1.3829849670035819)) < 1e-12);
  assert.ok(Math.abs(corner.negativeGCp - (-2.219581960404298)) < 1e-12);
  assert.equal(record.implementation.externalPressureTermImplemented, false);
  assert.equal(record.implementation.codeDerivedRoofPressureImplemented, false);
});

test('2C benchmark uses common Zone 2/3 negative curve and keeps positive/negative cases explicit', () => {
  const { record } = makeFixture({ slopeDeg: 30 });
  assert.equal(record.applicability.figureId, '207E.4-2C');
  const field = caseByType(record, 'field');
  const edge = caseByType(record, 'edge');
  const corner = caseByType(record, 'corner');
  assert.ok(Math.abs(field.positiveGCp - 0.8365969934007164) < 1e-12);
  assert.ok(Math.abs(field.negativeGCp - (-0.8731939868014327)) < 1e-12);
  assert.ok(Math.abs(edge.negativeGCp - (-1.0731939868014326)) < 1e-12);
  assert.ok(Math.abs(corner.negativeGCp - (-1.0731939868014326)) < 1e-12);
  assert.equal(edge.negativeCurveId, '2C-Z2-Z3-negative');
  assert.equal(corner.negativeCurveId, '2C-Z2-Z3-negative');
});

test('curve evaluation holds the <=10 ft2 and >=100 ft2 graph plateaus', () => {
  const low = makeFixture({ baySpanM: 1, firstBandWidthM: 0.5, bayStartM: 2 }).record;
  assert.equal(low.coefficientArea.regime, 'LOW_AREA_PLATEAU');
  assert.equal(caseByType(low, 'edge').positiveGCp, 0.5);
  assert.equal(caseByType(low, 'edge').negativeGCp, -1.7);

  const high = makeFixture({ baySpanM: 4, firstBandWidthM: 3, bayStartM: 2 }).record;
  assert.equal(high.coefficientArea.regime, 'HIGH_AREA_PLATEAU');
  assert.equal(caseByType(high, 'edge').positiveGCp, 0.3);
  assert.equal(caseByType(high, 'field').negativeGCp, -0.8);
});

test('one-third-span effective-area enlargement changes coefficient selection but never physical zone intersection area', () => {
  const actual = makeFixture({ baySpanM: 4, firstBandWidthM: 0.5, effectiveWidthSelection: 'actual-tributary-width' });
  const enlarged = makeFixture({ baySpanM: 4, firstBandWidthM: 0.5, effectiveWidthSelection: 'one-third-span-minimum' });
  assert.equal(actual.record.coefficientArea.effectiveWindAreaM2, 2);
  assert.ok(Math.abs(enlarged.record.coefficientArea.effectiveWindAreaM2 - 16 / 3) < 1e-12);
  assert.equal(caseByType(actual.record, 'corner').actualZoneIntersectionAreaM2, caseByType(enlarged.record, 'corner').actualZoneIntersectionAreaM2);
  assert.notEqual(caseByType(actual.record, 'corner').negativeGCp, caseByType(enlarged.record, 'corner').negativeGCp);
});

test('zone geometry and effective-area records must describe the same pressure context and physical purlin band', () => {
  const fixture = makeFixture();
  const wrongContext = pressureContext({ slopeDeg: 25, heightM: 9.5 });
  const mismatchedContextArea = resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: wrongContext,
    purlinSpanM: 4,
    actualTributaryWidthM: 1,
    purlinGeometrySourceReference: 'Mismatched context geometry',
    effectiveWidthSelection: 'actual-tributary-width',
    effectiveWidthSelectionSourceReference: 'Explicit test path'
  });
  assert.throws(() => resolveWindRoofExternalGcp({
    windRoofZoneGeometry: fixture.zones,
    roofPurlinEffectiveWindArea: mismatchedContextArea,
    targetPurlinBandLabel: 'P1',
    codeFigureSourceReference: 'Authorized NSCP figure',
    curveEquationSourceReference: 'ASCE guide equation'
  }), /exact same accepted wind pressure context/);

  const wrongWidthArea = resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: fixture.context,
    purlinSpanM: 4,
    actualTributaryWidthM: 0.8,
    purlinGeometrySourceReference: 'Wrong width geometry',
    effectiveWidthSelection: 'actual-tributary-width',
    effectiveWidthSelectionSourceReference: 'Explicit test path'
  });
  assert.throws(() => resolveWindRoofExternalGcp({
    windRoofZoneGeometry: fixture.zones,
    roofPurlinEffectiveWindArea: wrongWidthArea,
    targetPurlinBandLabel: 'P1',
    codeFigureSourceReference: 'Authorized NSCP figure',
    curveEquationSourceReference: 'ASCE guide equation'
  }), /actual tributary width must match/);
});

test('unsupported purlin label and mean roof height above 18 m fail visibly', () => {
  const fixture = makeFixture();
  assert.throws(() => resolveWindRoofExternalGcp({
    windRoofZoneGeometry: fixture.zones,
    roofPurlinEffectiveWindArea: fixture.effectiveArea,
    targetPurlinBandLabel: 'P99',
    codeFigureSourceReference: 'Authorized NSCP figure',
    curveEquationSourceReference: 'ASCE guide equation'
  }), /was not found/);

  assert.throws(() => makeFixture({ heightM: 18.1 }), /h <= 18 m/);
});

test('external GCp record round-trips deterministically and rejects coefficient mutation', () => {
  const { record } = makeFixture();
  const first = serializeWindRoofExternalGcp(record);
  const second = serializeWindRoofExternalGcp(parseWindRoofExternalGcp(first));
  assert.equal(second, first);

  const mutated = structuredClone(record);
  mutated.coefficientCases[0].negativeGCp -= 0.1;
  assert.throws(() => serializeWindRoofExternalGcp(mutated), /changed from its deterministic upstream/);
});

test('GCp resolution cannot silently promote pressure, sheet/fastener area, routing or purlin capacity', () => {
  for (const flag of [
    'externalPressureTermImplemented',
    'externalInternalPressureCombinationImplemented',
    'roofSheetEffectiveWindAreaImplemented',
    'fastenerEffectiveWindAreaImplemented',
    'codeDerivedRoofPressureImplemented',
    'roofBayCodePressureRoutingImplemented',
    'purlinCapacityPromotionImplemented'
  ]) {
    const { record } = makeFixture();
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofExternalGcp(record), /changed from its deterministic upstream/);
  }
});
