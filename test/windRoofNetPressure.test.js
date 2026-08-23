import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import { resolveLargeVolumeInternalPressureReduction } from '../src/solver/windLargeVolumeReduction.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm } from '../src/solver/windRoofExternalPressureTerm.js';
import { resolveWindRoofNetPressure, serializeWindRoofNetPressure, parseWindRoofNetPressure } from '../src/solver/windRoofNetPressure.js';

function makePressureContext({
  slopeDeg = 25,
  basicWindSpeedKph = 240,
  enclosureClassification = 'enclosed',
  heightM = 8.82,
  siteLocation = 'Sta. Magdalena, Sorsogon, Philippines'
} = {}) {
  const wind = createWindProjectInputAcceptance({
    siteLocation,
    siteSourceReference: 'Project site record / survey reference',
    occupancyCategory: 'III',
    occupancySourceReference: 'Project occupancy classification record',
    basicWindSpeedKph,
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
    enclosureClassification,
    enclosureClassificationSourceReference: 'Engineer enclosure classification record',
    openingsAssessmentSourceReference: 'Project openings assessment',
    roofForm: 'gable',
    roofFormSourceReference: 'Architectural roof plan',
    planLengthM: 12,
    planWidthM: 8,
    planDimensionSourceReference: 'Dimensioned architectural plan',
    meanRoofHeightM: heightM,
    meanRoofHeightSourceReference: 'Project mean-roof-height record',
    roofSlopeDeg: slopeDeg,
    roofSlopeSourceReference: 'Architectural roof section'
  });
}

function makeExternalTerm({
  slopeDeg = 25,
  firstBandWidthM = 1,
  basicWindSpeedKph = 240,
  enclosureClassification = 'enclosed',
  pressureContext = null
} = {}) {
  const context = pressureContext ?? makePressureContext({ slopeDeg, basicWindSpeedKph, enclosureClassification });
  const baySpanM = 4;
  const slopeLengthM = 4 / Math.cos(slopeDeg * Math.PI / 180);
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Roof section confirms symmetric gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: 0.4,
    roofBaySpanM: baySpanM,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: [
      { label: 'P1', startM: 0, endM: firstBandWidthM },
      { label: 'P2', startM: firstBandWidthM, endM: slopeLengthM }
    ],
    edgeDimensionHeightType: 'mean-roof-height',
    edgeDimensionHeightM: context.roofGeometry.meanRoofHeightM,
    edgeDimensionHeightSourceReference: 'Accepted mean-roof-height record'
  });
  const area = resolveRoofPurlinEffectiveWindArea({
    windPressureContextAcceptance: context,
    purlinSpanM: baySpanM,
    actualTributaryWidthM: firstBandWidthM,
    purlinGeometrySourceReference: 'Selected P1 physical Roof Bay geometry',
    effectiveWidthSelection: 'actual-tributary-width',
    effectiveWidthSelectionSourceReference: 'Engineer-selected NSCP C&C effective-area rule path'
  });
  const gcp = resolveWindRoofExternalGcp({
    windRoofZoneGeometry: zones,
    roofPurlinEffectiveWindArea: area,
    targetPurlinBandLabel: 'P1',
    codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B/2C project check',
    curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide Table G2-3/G2-4 equation cross-check'
  });
  return resolveWindRoofExternalPressureTerm({
    windRoofExternalGcp: gcp,
    equationSourceReference: 'NSCP 2015 Section 207E.4.2 Part 1 C&C pressure equation; authorized-copy verification required',
    signConventionSourceReference: 'NSCP 2015 Figure 207E.4-2B/2C notes; positive toward surface, negative away from surface'
  });
}

function makeNetPressure({
  slopeDeg = 25,
  basicWindSpeedKph = 240,
  enclosureClassification = 'enclosed',
  riMode = 'none',
  pressureContext = null
} = {}) {
  const context = pressureContext ?? makePressureContext({ slopeDeg, basicWindSpeedKph, enclosureClassification });
  const external = makeExternalTerm({ slopeDeg, basicWindSpeedKph, enclosureClassification, pressureContext: context });
  const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context });
  let ri = null;
  if (enclosureClassification === 'partially-enclosed') {
    ri = resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: base,
      containsSingleUnpartitionedLargeVolume: true,
      applicabilitySourceReference: 'Engineer large-volume applicability record',
      totalEnvelopeOpeningAreaM2: 1,
      openingAreaSourceReference: 'Project opening-area schedule',
      unpartitionedInternalVolumeM3: 6950,
      internalVolumeSourceReference: 'Project volume takeoff',
      applicationChoice: riMode === 'equation' ? 'equation-reduction' : 'conservative-ri-1'
    });
  }
  const record = resolveWindRoofNetPressure({
    windRoofExternalPressureTerm: external,
    baseInternalPressureCoefficient: base,
    largeVolumeInternalPressureReduction: ri,
    netPressureEquationSourceReference: 'NSCP 2015 Part 1 roof C&C equation qh[(GCp)-(GCpi)]; authorized-copy verification required',
    minimumPressureSourceReference: 'NSCP 2015 Components & Cladding minimum 0.77 kPa in either direction; authorized-copy verification required',
    signConventionSourceReference: 'NSCP 2015 roof C&C figure notes; positive toward surface, negative away from surface'
  });
  return { context, external, base, ri, record };
}

function zoneByType(record, type) {
  return record.zoneCases.find((item) => item.type === type);
}

function rawCase(zone, externalCaseId, gcpi) {
  return zone.rawCases.find((item) => item.externalCaseId === externalCaseId && Math.abs(item.GCpi - gcpi) < 1e-12);
}

test('enclosed 25-degree benchmark preserves all raw external/internal cases and governing directional envelopes', () => {
  const { record } = makeNetPressure();
  assert.equal(record.internalPressureBasis.velocityPressureBasis, 'qh');
  assert.equal(record.internalPressureBasis.part3OpeningHeightQiQzPermitted, false);
  assert.deepEqual(record.internalPressureBasis.GCpiCases, [0.18, -0.18]);
  assert.ok(Math.abs(record.internalPressureBasis.qhKPa - 2.257467958862151) < 1e-12);

  const field = zoneByType(record, 'field');
  assert.ok(field);
  assert.equal(field.rawCases.length, 4);
  assert.ok(Math.abs(rawCase(field, 'external-positive', 0.18).rawNetPressureKPa - 0.4361292350490715) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-positive', -0.18).rawNetPressureKPa - 1.2488177002394458) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-negative', 0.18).rawNetPressureKPa - (-2.294935139677715)) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-negative', -0.18).rawNetPressureKPa - (-1.4822466744873406)) < 1e-12);
  assert.ok(Math.abs(field.governingDesignEnvelope.towardSurface.rawGoverningPressureKPa - 1.2488177002394458) < 1e-12);
  assert.ok(Math.abs(field.governingDesignEnvelope.awayFromSurface.rawGoverningPressureKPa - (-2.294935139677715)) < 1e-12);
  assert.equal(field.governingDesignEnvelope.towardSurface.minimumApplied, false);
  assert.equal(field.governingDesignEnvelope.awayFromSurface.minimumApplied, false);
});

test('minimum 0.77 kPa is applied only to low-magnitude net directional design envelopes while raw cases remain unchanged', () => {
  const { record } = makeNetPressure({ basicWindSpeedKph: 60 });
  const field = zoneByType(record, 'field');
  assert.ok(Math.abs(field.governingDesignEnvelope.towardSurface.rawGoverningPressureKPa) < 0.77);
  assert.ok(Math.abs(field.governingDesignEnvelope.awayFromSurface.rawGoverningPressureKPa) < 0.77);
  assert.equal(field.governingDesignEnvelope.towardSurface.designPressureKPa, 0.77);
  assert.equal(field.governingDesignEnvelope.awayFromSurface.designPressureKPa, -0.77);
  assert.equal(field.governingDesignEnvelope.towardSurface.minimumApplied, true);
  assert.equal(field.governingDesignEnvelope.awayFromSurface.minimumApplied, true);
  assert.equal(record.minimumDesignPressureKPa, 0.77);
});

test('partially enclosed net pressure requires an explicit Ri decision and supports the equation-reduction benchmark', () => {
  const context = makePressureContext({ enclosureClassification: 'partially-enclosed' });
  const external = makeExternalTerm({ enclosureClassification: 'partially-enclosed', pressureContext: context });
  const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context });
  assert.throws(() => resolveWindRoofNetPressure({
    windRoofExternalPressureTerm: external,
    baseInternalPressureCoefficient: base,
    netPressureEquationSourceReference: 'NSCP Part 1 net equation',
    minimumPressureSourceReference: 'NSCP C&C minimum pressure',
    signConventionSourceReference: 'NSCP sign convention'
  }), /requires an explicit large-volume Ri decision record/);

  const { record } = makeNetPressure({ enclosureClassification: 'partially-enclosed', riMode: 'equation' });
  assert.ok(Math.abs(record.internalPressureBasis.selectedRi - 0.8535533905932737) < 1e-12);
  assert.equal(record.internalPressureBasis.riApplied, true);
  assert.ok(Math.abs(record.internalPressureBasis.GCpiCases[0] - 0.4694543648263006) < 1e-12);
  const field = zoneByType(record, 'field');
  assert.ok(Math.abs(rawCase(field, 'external-positive', 0.4694543648263006).rawNetPressureKPa - (-0.21730471909909777)) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-positive', -0.4694543648263006).rawNetPressureKPa - 1.9022516543876151) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-negative', 0.4694543648263006).rawNetPressureKPa - (-2.9483690938258844)) < 1e-12);
  assert.ok(Math.abs(rawCase(field, 'external-negative', -0.4694543648263006).rawNetPressureKPa - (-0.8288127203391713)) < 1e-12);
});

test('external and internal records must reference the exact same accepted pressure context', () => {
  const externalContext = makePressureContext({ siteLocation: 'External-context site' });
  const external = makeExternalTerm({ pressureContext: externalContext });
  const differentContext = makePressureContext({ siteLocation: 'Different internal-context site' });
  const wrongBase = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: differentContext });
  assert.throws(() => resolveWindRoofNetPressure({
    windRoofExternalPressureTerm: external,
    baseInternalPressureCoefficient: wrongBase,
    netPressureEquationSourceReference: 'NSCP Part 1 net equation',
    minimumPressureSourceReference: 'NSCP C&C minimum pressure',
    signConventionSourceReference: 'NSCP sign convention'
  }), /exact same accepted wind pressure context/);
});

test('net-pressure record round-trips deterministically and rejects raw or design pressure mutation', () => {
  const { record } = makeNetPressure();
  const first = serializeWindRoofNetPressure(record);
  const second = serializeWindRoofNetPressure(parseWindRoofNetPressure(first));
  assert.equal(second, first);

  const rawMutation = structuredClone(record);
  rawMutation.zoneCases[0].rawCases[0].rawNetPressureKPa += 0.01;
  assert.throws(() => serializeWindRoofNetPressure(rawMutation), /changed from its deterministic upstream/);

  const floorMutation = structuredClone(record);
  floorMutation.zoneCases[0].governingDesignEnvelope.towardSurface.designPressureKPa += 0.01;
  assert.throws(() => serializeWindRoofNetPressure(floorMutation), /changed from its deterministic upstream/);
});

test('Part 3 opening-height qi=qz and downstream Roof Bay/capacity promotions remain blocked', () => {
  const { record } = makeNetPressure();
  const qiMutation = structuredClone(record);
  qiMutation.internalPressureBasis.part3OpeningHeightQiQzPermitted = true;
  assert.throws(() => serializeWindRoofNetPressure(qiMutation), /Part 3 opening-height qi=qz must remain blocked/);

  for (const flag of ['loadCombinationsImplemented','codeDerivedRoofPressureImplemented','roofBayCodePressureRoutingImplemented','roofSheetEffectiveWindAreaImplemented','fastenerEffectiveWindAreaImplemented','purlinCapacityPromotionImplemented']) {
    const { record: candidate } = makeNetPressure();
    candidate.implementation[flag] = true;
    assert.throws(() => serializeWindRoofNetPressure(candidate), /changed from its deterministic upstream/);
  }
});
