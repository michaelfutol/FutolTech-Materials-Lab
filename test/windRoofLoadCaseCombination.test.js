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
import {
  resolveWindRoofLoadCaseCombination,
  serializeWindRoofLoadCaseCombination,
  parseWindRoofLoadCaseCombination
} from '../src/solver/windRoofLoadCaseCombination.js';

function makeRoutingRecords({ slopeDeg = 25, bayStartAlongRidgeM = 0.4 } = {}) {
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
    roofBayStartAlongRidgeM: bayStartAlongRidgeM,
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
  return [
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection: 'toward-surface', routingMethodSourceReference }),
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection: 'away-from-surface', routingMethodSourceReference })
  ];
}

function makeRecord(options = {}) {
  return resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: makeRoutingRecords(options),
    windActionDefinitionSourceReference: 'NSCP 2015 Section 203.2: W is load due to wind pressure; authorized-copy review required',
    strengthCombinationSourceReference: 'NSCP 2015 Section 203.3.1 Equations 203-3, 203-4 and 203-6; authorized-copy review required',
    publicCrossCheckReference: 'Philippine government structural design calculations and public NSCP 2015 references cross-check the same wind-bearing strength combinations'
  });
}

function combo(record, templateId, windCaseId) {
  return record.strengthCombinationCases.find((item) => item.templateId === templateId && item.windCaseId === windCaseId);
}

test('creates two distinct signed W load cases from the same verified Roof Bay geometry', () => {
  const record = makeRecord();
  assert.deepEqual(record.windCases.map((item) => item.caseId), ['W-CNC-ROOF-TOWARD', 'W-CNC-ROOF-AWAY']);
  const toward = record.windCases[0];
  const away = record.windCases[1];
  assert.ok(Math.abs(toward.total.normalForceKN - 19.79058581298942) < 1e-12);
  assert.ok(Math.abs(away.total.normalForceKN - (-46.769510965040396)) < 1e-12);
  assert.ok(toward.total.normalForceKN > 0);
  assert.ok(away.total.normalForceKN < 0);
  assert.equal(toward.pieces.length, away.pieces.length);
  assert.equal(record.implementation.towardAwayCasesPreserved, true);
});

test('NSCP strength wind templates preserve 0.5W for 203-3 wind branch and 1.0W for 203-4/203-6', () => {
  const record = makeRecord();
  assert.deepEqual(record.strengthCombinationTemplates.map((item) => [item.templateId, item.windFactor]), [
    ['NSCP-203-3-W', 0.5],
    ['NSCP-203-4', 1],
    ['NSCP-203-6', 1]
  ]);
  const halfAway = combo(record, 'NSCP-203-3-W', 'W-CNC-ROOF-AWAY');
  const fullAway4 = combo(record, 'NSCP-203-4', 'W-CNC-ROOF-AWAY');
  const fullAway6 = combo(record, 'NSCP-203-6', 'W-CNC-ROOF-AWAY');
  assert.ok(Math.abs(halfAway.windContribution.normalForceKN - (-23.384755482520198)) < 1e-12);
  assert.ok(Math.abs(halfAway.windContribution.rafterAReactionKN - (-12.2355764864072)) < 1e-12);
  assert.ok(Math.abs(halfAway.windContribution.rafterBReactionKN - (-11.149178996112997)) < 1e-12);
  assert.ok(Math.abs(halfAway.windContribution.appliedMomentAboutRafterAKNm - (-44.59671598445199)) < 1e-12);
  assert.ok(Math.abs(fullAway4.windContribution.normalForceKN - (-46.769510965040396)) < 1e-12);
  assert.ok(Math.abs(fullAway6.windContribution.normalForceKN - (-46.769510965040396)) < 1e-12);
});

test('combination wind contribution retains piece identity and scales signed pressure/force without changing source design pressure', () => {
  const record = makeRecord();
  const halfToward = combo(record, 'NSCP-203-3-W', 'W-CNC-ROOF-TOWARD');
  for (const piece of halfToward.windContribution.pieces) {
    const source = record.windCases[0].pieces.find((item) => item.purlinBandLabel === piece.purlinBandLabel && item.zoneCellId === piece.zoneCellId);
    assert.ok(source);
    assert.equal(piece.sourceDesignPressureKPa, source.designPressureKPa);
    assert.ok(Math.abs(piece.combinationWindPressureContributionKPa - 0.5 * source.designPressureKPa) < 1e-12);
    assert.ok(Math.abs(piece.normalForceKN - 0.5 * source.normalForceKN) < 1e-12);
    assert.equal(piece.governingRawCase.caseId, source.governingRawCase.caseId);
  }
});

test('full strength combination result remains blocked with explicit unresolved companion actions', () => {
  const record = makeRecord();
  for (const item of record.strengthCombinationCases) {
    assert.equal(item.fullCombinationResult, null);
    assert.equal(item.status, 'WIND_CONTRIBUTION_ONLY_COMPANION_ACTIONS_UNRESOLVED');
    assert.ok(item.unresolvedCompanionActions.length > 0);
  }
  assert.deepEqual(combo(record, 'NSCP-203-3-W', 'W-CNC-ROOF-TOWARD').unresolvedCompanionActions, ['D', 'Lr-or-R']);
  assert.deepEqual(combo(record, 'NSCP-203-4', 'W-CNC-ROOF-TOWARD').unresolvedCompanionActions, ['D', 'L', 'Lr-or-R']);
  assert.deepEqual(combo(record, 'NSCP-203-6', 'W-CNC-ROOF-TOWARD').unresolvedCompanionActions, ['D', 'H']);
  assert.equal(record.implementation.completeStrengthCombinationEvaluationImplemented, false);
  assert.equal(record.implementation.f1AutomaticallyResolved, false);
});

test('rejects missing/duplicate directions and mismatched Roof Bay geometry', () => {
  const routes = makeRoutingRecords();
  assert.throws(() => resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: [routes[0]],
    windActionDefinitionSourceReference: 'NSCP 203.2',
    strengthCombinationSourceReference: 'NSCP 203.3.1'
  }), /Exactly two Roof Bay routing records/);
  assert.throws(() => resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: [routes[0], routes[0]],
    windActionDefinitionSourceReference: 'NSCP 203.2',
    strengthCombinationSourceReference: 'NSCP 203.3.1'
  }), /Duplicate routing direction/);

  const other = makeRoutingRecords({ bayStartAlongRidgeM: 5.0 });
  assert.throws(() => resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: [routes[0], other[1]],
    windActionDefinitionSourceReference: 'NSCP 203.2',
    strengthCombinationSourceReference: 'NSCP 203.3.1'
  }), /exact same Roof Bay zone geometry|exact same upstream net-pressure record set|exact same registered Roof Bay geometry/);
});

test('source references are mandatory and authorized-copy review boundary remains explicit', () => {
  const routes = makeRoutingRecords();
  assert.throws(() => resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: routes,
    windActionDefinitionSourceReference: '',
    strengthCombinationSourceReference: 'NSCP 203.3.1'
  }), /windActionDefinitionSourceReference/);
  const record = makeRecord();
  assert.equal(record.sourceBasis.codeSection, 'NSCP 2015 Section 203.3.1');
  assert.equal(record.sourceBasis.authorizedCopyReviewRequired, true);
});

test('load-case/combination record round-trips deterministically and rejects mutation', () => {
  const record = makeRecord();
  const first = serializeWindRoofLoadCaseCombination(record);
  const second = serializeWindRoofLoadCaseCombination(parseWindRoofLoadCaseCombination(first));
  assert.equal(second, first);

  const factorMutation = structuredClone(record);
  factorMutation.strengthCombinationCases[0].windFactor = 0.6;
  assert.throws(() => serializeWindRoofLoadCaseCombination(factorMutation), /changed from its deterministic routing\/source inputs/);

  const resultMutation = structuredClone(record);
  resultMutation.strengthCombinationCases[0].fullCombinationResult = { fake: true };
  assert.throws(() => serializeWindRoofLoadCaseCombination(resultMutation), /changed from its deterministic routing\/source inputs|Full combination result must remain unresolved/);
});

test('does not silently promote ASD, full combinations, UI activation, member response or capacity', () => {
  for (const flag of [
    'completeStrengthCombinationEvaluationImplemented',
    'allowableStressCombinationTemplatesImplemented',
    'gravityDeadLiveRoofLiveRainHydroActionsIntegrated',
    'f1AutomaticallyResolved',
    'roofBayManualUniformUiReplaced',
    'codeDerivedRoofBayUiActivated',
    'piecewisePurlinMemberResponseImplemented',
    'purlinCapacityPromotionImplemented',
    'connectionCapacityImplemented'
  ]) {
    const record = makeRecord();
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofLoadCaseCombination(record), /changed from its deterministic routing\/source inputs/);
  }
});
