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
import { resolveWindRoofCompanionActions } from '../src/solver/windRoofCompanionActions.js';
import {
  resolveWindRoofStrengthCombinationAssembly,
  serializeWindRoofStrengthCombinationAssembly,
  parseWindRoofStrengthCombinationAssembly
} from '../src/solver/windRoofStrengthCombinationAssembly.js';

function makeCompanionRecord() {
  const slopeDeg = 25;
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
  const windCases = resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: routes,
    windActionDefinitionSourceReference: 'NSCP 2015 Section 203.2 W definition; authorized-copy review required',
    strengthCombinationSourceReference: 'NSCP 2015 Section 203.3.1 Equations 203-3, 203-4 and 203-6; authorized-copy review required',
    publicCrossCheckReference: 'Public Philippine government structural calculations cross-check wind-bearing strength combinations'
  });
  return resolveWindRoofCompanionActions({
    windRoofLoadCaseCombination: windCases,
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
    rainActionDecisionSourceReference: 'Rain action R remains unresolved pending explicit project rain/drainage assessment'
  });
}

function makeAssembly({ resolvedLr = false } = {}) {
  return resolveWindRoofStrengthCombinationAssembly({
    windRoofCompanionActions: makeCompanionRecord(),
    lrOrRResolution: resolvedLr ? {
      mode: 'lr-selected-r-not-applicable',
      engineerConfirmedRainNotApplicable: true,
      decisionSourceReference: 'Benchmark engineer rain/drainage applicability record',
      rationale: 'For this deterministic benchmark only, R is explicitly declared not applicable so the accepted Lr alternative may be assembled.'
    } : { mode: 'unresolved' },
    strengthCombinationAssemblySourceReference: 'NSCP 2015 Section 203.3.1 strength combinations; verify against authorized code copy',
    publicCrossCheckReference: 'Multiple DPWH structural plan sets cross-check 203-3/203-4 Lr-or-R notation; one public BIR calculation has a conflicting 203-3 transcription'
  });
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} ≈ ${expected}`);
}
function combo(record, templateId, direction) {
  return record.cases.find((item) => item.templateId === templateId && item.windDirection === direction);
}

test('unresolved rain keeps 203-3/203-4 blocked while both 203-6 wind directions complete', () => {
  const record = makeAssembly();
  assert.equal(record.status, 'ROOF_STRENGTH_COMBINATION_2036_COMPLETE_2033_2034_BLOCKED_LR_OR_R');
  assert.equal(record.summary.totalCaseCount, 6);
  assert.equal(record.summary.completeCaseCount, 2);
  assert.equal(record.summary.blockedCaseCount, 4);
  for (const templateId of ['NSCP-203-3-W', 'NSCP-203-4']) {
    for (const direction of ['toward-surface', 'away-from-surface']) {
      const item = combo(record, templateId, direction);
      assert.equal(item.fullCombinationResult, null);
      assert.equal(item.status, 'BLOCKED_LR_OR_R_DECISION_UNRESOLVED');
    }
  }
  for (const direction of ['toward-surface', 'away-from-surface']) {
    const item = combo(record, 'NSCP-203-6', direction);
    assert.ok(item.fullCombinationResult);
    assert.equal(item.equilibrium.pass, true);
  }
});

test('203-6 independently assembles 0.9D + W with explicit zero H and preserves signed wind direction', () => {
  const record = makeAssembly();
  const toward = combo(record, 'NSCP-203-6', 'toward-surface');
  const away = combo(record, 'NSCP-203-6', 'away-from-surface');
  close(toward.fullCombinationResult.roofNormalForceKN, 22.996856616322614);
  close(toward.fullCombinationResult.roofDownslopeForceKN, 1.4951086297130478);
  close(away.fullCombinationResult.roofNormalForceKN, -43.5632401617072);
  close(away.fullCombinationResult.roofDownslopeForceKN, 1.4951086297130478);
  close(toward.fullCombinationResult.rafterANormalReactionKN, 11.498428308161307);
  close(toward.fullCombinationResult.rafterBNormalReactionKN, 11.498428308161307);
  close(away.fullCombinationResult.rafterANormalReactionKN, -22.868017571147803);
  close(away.fullCombinationResult.rafterBNormalReactionKN, -20.695222590559396);
  assert.equal(toward.factors.H, '1.6 x 0 = 0');
  assert.equal(away.equilibrium.pass, true);
});

test('explicit engineer R-not-applicable decision releases complete Lr alternatives for 203-3 and 203-4', () => {
  const record = makeAssembly({ resolvedLr: true });
  assert.equal(record.status, 'ROOF_STRENGTH_COMBINATIONS_COMPLETE_FOR_EXPLICIT_LR_PATH_R_NOT_APPLICABLE');
  assert.equal(record.summary.completeCaseCount, 6);
  assert.equal(record.summary.blockedCaseCount, 0);
  assert.equal(record.lrOrRResolution.engineerConfirmedRainNotApplicable, true);
  for (const item of record.cases) {
    assert.ok(item.fullCombinationResult);
    assert.equal(item.equilibrium.pass, true);
  }
  assert.equal(combo(record, 'NSCP-203-3-W', 'toward-surface').selectedLrOrRAction, 'Lr');
  assert.equal(combo(record, 'NSCP-203-4', 'away-from-surface').selectedLrOrRAction, 'Lr');
});

test('25-degree Lr benchmark reproduces independent 203-3 and 203-4 vector totals', () => {
  const record = makeAssembly({ resolvedLr: true });
  const c3Toward = combo(record, 'NSCP-203-3-W', 'toward-surface');
  const c3Away = combo(record, 'NSCP-203-3-W', 'away-from-surface');
  const c4Toward = combo(record, 'NSCP-203-4', 'toward-surface');
  const c4Away = combo(record, 'NSCP-203-4', 'away-from-surface');

  close(c3Toward.fullCombinationResult.roofNormalForceKN, 33.370320644272304);
  close(c3Toward.fullCombinationResult.roofDownslopeForceKN, 10.946585209526702);
  close(c3Away.fullCombinationResult.roofNormalForceKN, 0.09027225525739624);
  close(c3Away.fullCombinationResult.roofDownslopeForceKN, 10.946585209526702);
  close(c4Toward.fullCombinationResult.roofNormalForceKN, 30.06561355076701);
  close(c4Toward.fullCombinationResult.roofDownslopeForceKN, 4.791324121880722);
  close(c4Away.fullCombinationResult.roofNormalForceKN, -36.494483227262805);
  close(c4Away.fullCombinationResult.roofDownslopeForceKN, 4.791324121880722);

  close(c3Away.fullCombinationResult.rafterANormalReactionKN, -0.4980626175184035);
  close(c3Away.fullCombinationResult.rafterBNormalReactionKN, 0.5883348727757998);
  close(c4Away.fullCombinationResult.rafterANormalReactionKN, -19.333639103925606);
  close(c4Away.fullCombinationResult.rafterBNormalReactionKN, -17.1608441233372);
});

test('complete cases preserve physical piece identity and dead self-weight trace without double counting', () => {
  const record = makeAssembly({ resolvedLr: true });
  const item = combo(record, 'NSCP-203-4', 'away-from-surface');
  const companion = record.upstreamWindRoofCompanionActions;
  const upstreamWindPieces = companion.upstreamWindRoofLoadCaseCombination.windCases.find((wind) => wind.caseId === item.windCaseId).pieces;
  assert.equal(item.areaPieces.length, companion.actions.D.pieces.length);
  assert.equal(item.areaPieces.length, upstreamWindPieces.length);
  for (const piece of item.areaPieces) {
    const dead = companion.actions.D.pieces.find((source) => source.purlinBandLabel === piece.purlinBandLabel && source.zoneCellId === piece.zoneCellId);
    const wind = upstreamWindPieces.find((source) => source.purlinBandLabel === piece.purlinBandLabel && source.zoneCellId === piece.zoneCellId);
    assert.ok(dead && wind);
    close(piece.actualAreaM2, dead.actualAreaM2);
    close(piece.actualAreaM2, wind.actualAreaM2);
    assert.equal(piece.governingWindRawCase.caseId, wind.governingRawCase.caseId);
  }
  for (const purlin of item.purlins) {
    assert.equal(purlin.contributions.D.includesPurlinSelfWeight, true);
    close(purlin.purlinSelfWeightTrace.sourceLineLoadKNM, 0.05);
    close(purlin.purlinSelfWeightTrace.factoredNormalForceKN, 1.2 * 0.05 * 4 * Math.cos(25 * Math.PI / 180));
  }
});

test('every complete case conserves roof-normal/down-slope forces and moments through Rafter A/B', () => {
  const record = makeAssembly({ resolvedLr: true });
  for (const item of record.cases) {
    assert.equal(item.equilibrium.pass, true);
    close(item.equilibrium.normalForceResidualKN, 0, 1e-9);
    close(item.equilibrium.parallelForceResidualKN, 0, 1e-9);
    close(item.equilibrium.normalMomentResidualKNm, 0, 1e-9);
    close(item.equilibrium.parallelMomentResidualKNm, 0, 1e-9);
    close(item.equilibrium.purlinNormalResidualKN, 0, 1e-9);
    close(item.equilibrium.purlinParallelResidualKN, 0, 1e-9);
  }
});

test('Lr path cannot be released without explicit engineer confirmation, source and rationale', () => {
  const companion = makeCompanionRecord();
  const base = {
    windRoofCompanionActions: companion,
    strengthCombinationAssemblySourceReference: 'NSCP 2015 Section 203.3.1'
  };
  assert.throws(() => resolveWindRoofStrengthCombinationAssembly({
    ...base,
    lrOrRResolution: { mode: 'lr-selected-r-not-applicable', engineerConfirmedRainNotApplicable: false, decisionSourceReference: 'x', rationale: 'x' }
  }), /engineerConfirmedRainNotApplicable/);
  assert.throws(() => resolveWindRoofStrengthCombinationAssembly({
    ...base,
    lrOrRResolution: { mode: 'lr-selected-r-not-applicable', engineerConfirmedRainNotApplicable: true, decisionSourceReference: '', rationale: 'x' }
  }), /decisionSourceReference/);
  assert.throws(() => resolveWindRoofStrengthCombinationAssembly({
    ...base,
    lrOrRResolution: { mode: 'lr-selected-r-not-applicable', engineerConfirmedRainNotApplicable: true, decisionSourceReference: 'x', rationale: '' }
  }), /rationale/);
});

test('public-source transcription conflict remains explicit and authorized-copy review stays mandatory', () => {
  const record = makeAssembly({ resolvedLr: true });
  assert.equal(record.sourceBasis.authorizedCopyReviewRequired, true);
  assert.match(record.sourceBasis.publicCrossCheckConflictNote, /DPWH/);
  assert.match(record.sourceBasis.publicCrossCheckConflictNote, /BIR/);
  assert.match(record.sourceBasis.publicCrossCheckConflictNote, /authorized NSCP 2015 copy/);
});

test('record round-trips deterministically and rejects result/decision mutation', () => {
  const record = makeAssembly({ resolvedLr: true });
  const first = serializeWindRoofStrengthCombinationAssembly(record);
  const second = serializeWindRoofStrengthCombinationAssembly(parseWindRoofStrengthCombinationAssembly(first));
  assert.equal(second, first);

  const resultMutation = structuredClone(record);
  resultMutation.cases[0].fullCombinationResult.roofNormalForceKN += 1;
  assert.throws(() => serializeWindRoofStrengthCombinationAssembly(resultMutation), /changed from its deterministic public upstream\/decision\/source state/);

  const decisionMutation = structuredClone(record);
  decisionMutation.lrOrRResolution.engineerConfirmedRainNotApplicable = false;
  assert.throws(() => serializeWindRoofStrengthCombinationAssembly(decisionMutation), /engineerConfirmedRainNotApplicable|changed from its deterministic/);
});

test('does not silently promote rain, automatic governing selection, UI activation, member response or capacity', () => {
  for (const flag of [
    'rainActionImplemented',
    'automaticGoverningLrOrRSelectionImplemented',
    'codeDerivedRoofBayUiActivated',
    'piecewisePurlinMemberResponseImplemented',
    'purlinCapacityPromotionImplemented',
    'connectionCapacityImplemented'
  ]) {
    const record = makeAssembly({ resolvedLr: true });
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofStrengthCombinationAssembly(record), /changed from its deterministic public upstream\/decision\/source state/);
  }
});
