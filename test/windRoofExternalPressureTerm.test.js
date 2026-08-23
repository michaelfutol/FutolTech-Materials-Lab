import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm, serializeWindRoofExternalPressureTerm, parseWindRoofExternalPressureTerm } from '../src/solver/windRoofExternalPressureTerm.js';

function makeExternalGcp({ slopeDeg = 25, firstBandWidthM = 1, basicWindSpeedKph = 240, enclosureClassification = 'enclosed' } = {}) {
  const heightM = 8.82;
  const wind = createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines', siteSourceReference: 'Project site record / survey reference',
    occupancyCategory: 'III', occupancySourceReference: 'Project occupancy classification record',
    basicWindSpeedKph, windSpeedSourceType: 'authorized-code-map', windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map', windSpeedSelectionMethod: 'direct-contour-read', windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C', exposureSourceReference: 'Engineer terrain/exposure classification record', topographicFactorKzt: 1, topographySourceReference: 'Engineer topographic-factor project record',
    heightM, heightSourceReference: 'Project mean-roof-height record'
  });
  const context = createWindPressureContextAcceptance({
    windProjectInputAcceptance: wind,
    enclosureClassification, enclosureClassificationSourceReference: 'Engineer enclosure classification record', openingsAssessmentSourceReference: 'Project openings assessment',
    roofForm: 'gable', roofFormSourceReference: 'Architectural roof plan', planLengthM: 12, planWidthM: 8, planDimensionSourceReference: 'Dimensioned architectural plan',
    meanRoofHeightM: heightM, meanRoofHeightSourceReference: 'Project mean-roof-height record', roofSlopeDeg: slopeDeg, roofSlopeSourceReference: 'Architectural roof section'
  });
  const baySpanM = 4;
  const slopeLengthM = 4 / Math.cos(slopeDeg * Math.PI / 180);
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context, ridgeParallelPlanDimension: 'plan-length', ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true, symmetricGableSourceReference: 'Roof section confirms symmetric gable', roofPlane: 'slope-a', roofBayStartAlongRidgeM: 0.4, roofBaySpanM: baySpanM,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry', purlinTributaryBands: [{ label: 'P1', startM: 0, endM: firstBandWidthM }, { label: 'P2', startM: firstBandWidthM, endM: slopeLengthM }],
    edgeDimensionHeightType: 'mean-roof-height', edgeDimensionHeightM: heightM, edgeDimensionHeightSourceReference: 'Accepted mean-roof-height record'
  });
  const area = resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: context, purlinSpanM: baySpanM, actualTributaryWidthM: firstBandWidthM,
    purlinGeometrySourceReference: 'Selected P1 physical Roof Bay geometry', effectiveWidthSelection: 'actual-tributary-width', effectiveWidthSelectionSourceReference: 'Engineer-selected NSCP C&C effective-area rule path'
  });
  return resolveWindRoofExternalGcp({
    windRoofZoneGeometry: zones, roofPurlinEffectiveWindArea: area, targetPurlinBandLabel: 'P1',
    codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B/2C project check', curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide Table G2-3/G2-4 equation cross-check'
  });
}

function makeExternalTerm(options = {}) {
  return resolveWindRoofExternalPressureTerm({
    windRoofExternalGcp: makeExternalGcp(options),
    equationSourceReference: 'NSCP 2015 Section 207E.4.2 Part 1 C&C pressure equation; authorized-copy verification required',
    signConventionSourceReference: 'NSCP 2015 Figure 207E.4-2B/2C notes; positive toward surface, negative away from surface'
  });
}

function byType(record, type) { return record.pressureCases.find((item) => item.type === type); }

test('25-degree benchmark resolves exact qh and separate toward/away external pressure terms', () => {
  const record = makeExternalTerm();
  assert.equal(record.qh.basis, 'mean-roof-height-qh');
  assert.ok(Math.abs(record.qh.qhKPa - 2.257467958862151) < 1e-12);
  const field = byType(record, 'field');
  const edge = byType(record, 'edge');
  const corner = byType(record, 'corner');
  assert.ok(field && edge && corner);
  assert.ok(Math.abs(field.towardSurfaceExternalPressureKPa - 0.8424734676442587) < 1e-12);
  assert.ok(Math.abs(field.awayFromSurfaceExternalPressureKPa - (-1.8885909070825277)) < 1e-12);
  assert.ok(Math.abs(edge.awayFromSurfaceExternalPressureKPa - (-3.1220442505986155)) < 1e-12);
  assert.ok(Math.abs(corner.awayFromSurfaceExternalPressureKPa - (-5.0106351576811425)) < 1e-12);
  assert.equal(record.implementation.externalPressureTermImplemented, true);
  assert.equal(record.implementation.externalInternalPressureCombinationImplemented, false);
  assert.equal(record.implementation.minimumNetPressureApplied, false);
});

test('30-degree 2C benchmark preserves positive and negative external-only terms', () => {
  const record = makeExternalTerm({ slopeDeg: 30, firstBandWidthM: 1.2 });
  const field = byType(record, 'field');
  const edge = byType(record, 'edge');
  const corner = byType(record, 'corner');
  assert.ok(Math.abs(field.towardSurfaceExternalPressureKPa - 1.8707159944929983) < 1e-12);
  assert.ok(Math.abs(field.awayFromSurfaceExternalPressureKPa - (-1.9354576218962756)) < 1e-12);
  assert.ok(Math.abs(edge.awayFromSurfaceExternalPressureKPa - (-2.3869512136687057)) < 1e-12);
  assert.ok(Math.abs(corner.awayFromSurfaceExternalPressureKPa - (-2.3869512136687057)) < 1e-12);
});

test('external-only term keeps the exact physical zone areas and coefficient-selection area', () => {
  const record = makeExternalTerm();
  const upstreamCases = record.upstreamWindRoofExternalGcp.coefficientCases;
  for (const pressureCase of record.pressureCases) {
    const source = upstreamCases.find((item) => item.type === pressureCase.type);
    assert.equal(pressureCase.actualZoneIntersectionAreaM2, source.actualZoneIntersectionAreaM2);
    assert.equal(pressureCase.componentCoefficientSelectionEffectiveAreaM2, source.componentCoefficientSelectionEffectiveAreaM2);
  }
});

test('0.77 kPa minimum net pressure is not applied to the external-only stage', () => {
  const record = makeExternalTerm({ basicWindSpeedKph: 60 });
  const field = byType(record, 'field');
  assert.ok(Math.abs(field.towardSurfaceExternalPressureKPa) < 0.77);
  assert.ok(Math.abs(field.awayFromSurfaceExternalPressureKPa) < 0.77);
  assert.equal(record.implementation.minimumNetPressureApplied, false);
  assert.match(record.sourceBasis.minimumNetPressureRule, /later net-design-pressure requirement/);
});

test('partially enclosed Part 1 GCp remains valid for the external-only term', () => {
  const record = makeExternalTerm({ enclosureClassification: 'partially-enclosed' });
  assert.equal(record.upstreamWindRoofExternalGcp.applicability.enclosureClassification, 'partially-enclosed');
  assert.ok(record.pressureCases.length > 0);
});

test('external pressure-term record round-trips deterministically and rejects pressure mutation', () => {
  const record = makeExternalTerm();
  const first = serializeWindRoofExternalPressureTerm(record);
  const second = serializeWindRoofExternalPressureTerm(parseWindRoofExternalPressureTerm(first));
  assert.equal(second, first);
  const mutated = structuredClone(record);
  mutated.pressureCases[0].towardSurfaceExternalPressureKPa += 0.05;
  assert.throws(() => serializeWindRoofExternalPressureTerm(mutated), /changed from its deterministic upstream/);
});

test('external pressure-term record cannot silently promote net pressure, minimum pressure, combinations or Roof Bay routing', () => {
  for (const flag of ['externalInternalPressureCombinationImplemented','minimumNetPressureApplied','loadCombinationsImplemented','codeDerivedRoofPressureImplemented','roofBayCodePressureRoutingImplemented','roofSheetEffectiveWindAreaImplemented','fastenerEffectiveWindAreaImplemented','purlinCapacityPromotionImplemented']) {
    const record = makeExternalTerm();
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofExternalPressureTerm(record), /changed from its deterministic upstream/);
  }
});
