import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm } from '../src/solver/windRoofExternalPressureTerm.js';
import { resolveWindRoofNetPressure } from '../src/solver/windRoofNetPressure.js';
import { resolveWindRoofBayCodePressureRouting } from '../src/solver/windRoofBayCodePressureRouting.js';
import { resolveWindRoofLoadCaseCombination } from '../src/solver/windRoofLoadCaseCombination.js';
import {
  resolveWindRoofCompanionActions,
  serializeWindRoofCompanionActions,
  parseWindRoofCompanionActions
} from '../src/solver/windRoofCompanionActions.js';

function makeWindCaseRecord({ slopeDeg = 25 } = {}) {
  const heightM = 8.82;
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
  const context = createWindPressureContextAcceptance({
    windProjectInputAcceptance: wind,
    enclosureClassification: 'enclosed',
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
  const spanM = 4;
  const slopeLengthM = 4 / Math.cos(slopeDeg * Math.PI / 180);
  const bands = [
    { label: 'P1', stationM: 0.5, startM: 0, endM: 1 },
    { label: 'P2', stationM: 2.7, startM: 1, endM: slopeLengthM }
  ];
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Roof section confirms symmetric gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: 0.4,
    roofBaySpanM: spanM,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: bands,
    edgeDimensionHeightType: 'mean-roof-height',
    edgeDimensionHeightM: heightM,
    edgeDimensionHeightSourceReference: 'Accepted mean-roof-height record'
  });
  const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context });
  const netRecords = bands.map((band) => {
    const area = resolveRoofPurlinEffectiveWindArea({
      windPressureContextAcceptance: context,
      purlinSpanM: spanM,
      actualTributaryWidthM: band.endM - band.startM,
      purlinGeometrySourceReference: `${band.label} physical Roof Bay geometry`,
      effectiveWidthSelection: 'actual-tributary-width',
      effectiveWidthSelectionSourceReference: 'Engineer-selected NSCP C&C effective-area rule path'
    });
    const gcp = resolveWindRoofExternalGcp({
      windRoofZoneGeometry: zones,
      roofPurlinEffectiveWindArea: area,
      targetPurlinBandLabel: band.label,
      codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B project check',
      curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide equation cross-check'
    });
    const external = resolveWindRoofExternalPressureTerm({
      windRoofExternalGcp: gcp,
      equationSourceReference: 'NSCP 2015 Part 1 C&C external pressure equation',
      signConventionSourceReference: 'NSCP roof C&C figure sign convention'
    });
    return resolveWindRoofNetPressure({
      windRoofExternalPressureTerm: external,
      baseInternalPressureCoefficient: base,
      netPressureEquationSourceReference: 'NSCP 2015 Part 1 roof C&C equation qh[(GCp)-(GCpi)]',
      minimumPressureSourceReference: 'NSCP 2015 Components & Cladding minimum 0.77 kPa in either direction',
      signConventionSourceReference: 'NSCP roof C&C figure sign convention'
    });
  });
  const routingMethodSourceReference = 'Classical simply-supported beam statics using exact physical zone-piece rectangles and resultants';
  const routes = [
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection: 'toward-surface', routingMethodSourceReference }),
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection: 'away-from-surface', routingMethodSourceReference })
  ];
  return resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: routes,
    windActionDefinitionSourceReference: 'NSCP 2015 Section 203.2 W definition; authorized-copy review required',
    strengthCombinationSourceReference: 'NSCP 2015 Section 203.3.1 Equations 203-3, 203-4 and 203-6; authorized-copy review required',
    publicCrossCheckReference: 'Public Philippine structural calculations cross-check the wind-bearing strength combinations'
  });
}

function makeRecord(overrides = {}) {
  return resolveWindRoofCompanionActions({
    windRoofLoadCaseCombination: makeWindCaseRecord(),
    codeLoadDefinitionsSourceReference: 'NSCP 2015 Section 203.2 load/action definitions; authorized-copy review required',
    roofDeadLoadKPa: 0.2,
    roofDeadLoadSourceReference: 'Project roof permanent-material dead-load schedule',
    purlinSelfWeightLineLoads: [
      { label: 'P1', lineLoadKNM: 0.05, sourceReference: 'P1 section self-weight calculation' },
      { label: 'P2', lineLoadKNM: 0.05, sourceReference: 'P2 section self-weight calculation' }
    ],
    roofLiveLoadKPa: 0.75,
    roofLiveLoadSourceReference: 'Project roof live-load basis',
    ordinaryLiveLoadZeroDecisionSourceReference: 'Roof-purlin target carries roof live Lr, not ordinary floor live L',
    hydrostaticSoilZeroDecisionSourceReference: 'Roof-purlin target has no lateral soil/water pressure H',
    rainActionDecisionSourceReference: 'Rain action R remains unresolved pending explicit project rain/drainage assessment',
    ...overrides
  });
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} ≈ ${expected}`);
}

test('accepts D and Lr as distinct vertical roof actions and keeps L/H/R honest', () => {
  const record = makeRecord();
  assert.equal(record.actions.D.status, 'ACCEPTED_AND_ROUTED');
  assert.equal(record.actions.Lr.status, 'ACCEPTED_AND_ROUTED');
  assert.equal(record.actions.L.status, 'TARGET_SPECIFIC_NOT_APPLICABLE_ZERO');
  assert.equal(record.actions.H.status, 'TARGET_SPECIFIC_NOT_APPLICABLE_ZERO');
  assert.equal(record.actions.R.status, 'UNRESOLVED');
  assert.equal(record.actions.R.total, null);
  assert.equal(record.f1.status, 'NOT_REQUIRED_WHILE_L_TARGET_ACTION_IS_ZERO');
  assert.equal(record.f1.value, null);
  assert.equal(record.actions.L.total.normalForceKN, 0);
  assert.equal(record.actions.H.total.parallelForceKN, 0);
});

test('25-degree benchmark routes dead area load plus separate purlin self-weight without double counting', () => {
  const record = makeRecord();
  close(record.geometry.roofBayAreaM2, 17.654046703399867);
  close(record.actions.D.total.verticalForceKN, 3.9308093406799736);
  close(record.actions.D.total.normalForceKN, 3.5625231148146597);
  close(record.actions.D.total.parallelForceKN, 1.6612318107922752);
  close(record.actions.D.purlinSelfWeightTotal.verticalForceKN, 0.4);
  close(record.actions.D.purlinSelfWeightTotal.normalForceKN, 0.36252311481465996);
  close(record.actions.D.purlinSelfWeightTotal.parallelForceKN, 0.1690473046962798);
  close(record.actions.D.total.rafterANormalKN + record.actions.D.total.rafterBNormalKN, record.actions.D.total.normalForceKN);
  close(record.actions.D.total.rafterAParallelKN + record.actions.D.total.rafterBParallelKN, record.actions.D.total.parallelForceKN);
  for (const purlin of record.actions.D.purlins) {
    close(purlin.purlinSelfWeight.verticalForceKN, 0.2);
    close(purlin.purlinSelfWeight.rafterANormalKN, purlin.purlinSelfWeight.rafterBNormalKN);
  }
});

test('roof live Lr benchmark preserves exact physical piece geometry and gravity decomposition', () => {
  const record = makeRecord();
  close(record.actions.Lr.total.verticalForceKN, 13.2405350275499);
  close(record.actions.Lr.total.normalForceKN, 12.0);
  close(record.actions.Lr.total.parallelForceKN, 5.595691897859982);
  close(record.actions.Lr.total.rafterANormalKN + record.actions.Lr.total.rafterBNormalKN, 12.0);
  close(record.actions.Lr.total.rafterAParallelKN + record.actions.Lr.total.rafterBParallelKN, 5.595691897859982);

  const upstreamPieces = record.upstreamWindRoofLoadCaseCombination.windCases[0].pieces;
  assert.equal(record.actions.Lr.pieces.length, upstreamPieces.length);
  for (const piece of record.actions.Lr.pieces) {
    const upstream = upstreamPieces.find((item) => item.purlinBandLabel === piece.purlinBandLabel && item.zoneCellId === piece.zoneCellId);
    assert.ok(upstream);
    close(piece.actualAreaM2, upstream.actualAreaM2);
    close(piece.spanwiseCentroidM, upstream.upstreamWindRoofBayCodePressureRouting?.spanwiseCentroidM ?? piece.spanwiseCentroidM);
    close(piece.verticalForceKN, 0.75 * piece.actualAreaM2);
  }
  close(record.actions.Lr.total.areaM2, record.geometry.roofBayAreaM2);
});

test('combination readiness does not silently choose Lr over unresolved rain R', () => {
  const record = makeRecord();
  assert.equal(record.combinationReadiness['NSCP-203-3-W'].lrBranch, 'READY_FOR_ASSEMBLY');
  assert.equal(record.combinationReadiness['NSCP-203-3-W'].rainAlternative, 'UNRESOLVED_R');
  assert.match(record.combinationReadiness['NSCP-203-3-W'].governingLrOrRSelection, /BLOCKED/);
  assert.equal(record.combinationReadiness['NSCP-203-4'].f1LContribution, 'RESOLVED_ZERO_BECAUSE_L_TARGET_ACTION_IS_ZERO');
  assert.equal(record.combinationReadiness['NSCP-203-6'].status, 'READY_FOR_ASSEMBLY');
});

test('requires exact one-per-purlin self-weight mapping and source references', () => {
  assert.throws(() => makeRecord({ purlinSelfWeightLineLoads: [
    { label: 'P1', lineLoadKNM: 0.05, sourceReference: 'P1' }
  ] }), /exactly one entry/);
  assert.throws(() => makeRecord({ purlinSelfWeightLineLoads: [
    { label: 'P1', lineLoadKNM: 0.05, sourceReference: 'P1' },
    { label: 'P1', lineLoadKNM: 0.05, sourceReference: 'P1 duplicate' }
  ] }), /Duplicate purlin self-weight|Unknown/);
  assert.throws(() => makeRecord({ roofDeadLoadSourceReference: '' }), /roofDeadLoadSourceReference/);
  assert.throws(() => makeRecord({ ordinaryLiveLoadZeroDecisionSourceReference: '' }), /L\.decisionSourceReference/);
  assert.throws(() => makeRecord({ rainActionDecisionSourceReference: '' }), /rainActionDecisionSourceReference/);
});

test('round-trips from public record state and rejects mutation without hidden input capsules', () => {
  const record = makeRecord();
  assert.equal(Object.prototype.hasOwnProperty.call(record, '_inputs'), false);
  const first = serializeWindRoofCompanionActions(record);
  const second = serializeWindRoofCompanionActions(parseWindRoofCompanionActions(first));
  assert.equal(second, first);

  const mutatedD = structuredClone(record);
  mutatedD.actions.D.total.normalForceKN += 1;
  assert.throws(() => serializeWindRoofCompanionActions(mutatedD), /changed from its deterministic public upstream\/action\/source state/);

  const mutatedRain = structuredClone(record);
  mutatedRain.actions.R.status = 'ACCEPTED_AND_ROUTED';
  assert.throws(() => serializeWindRoofCompanionActions(mutatedRain), /Rain action must remain unresolved|changed from its deterministic/);
});

test('does not silently promote rain, full combinations, UI activation, member response or capacity', () => {
  for (const flag of [
    'rainActionImplemented',
    'f1AutomaticallyResolved',
    'completeStrengthCombinationEvaluationImplemented',
    'codeDerivedRoofBayUiActivated',
    'piecewisePurlinMemberResponseImplemented',
    'purlinCapacityPromotionImplemented',
    'connectionCapacityImplemented'
  ]) {
    const record = makeRecord();
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofCompanionActions(record), /changed from its deterministic public upstream\/action\/source state/);
  }
});
