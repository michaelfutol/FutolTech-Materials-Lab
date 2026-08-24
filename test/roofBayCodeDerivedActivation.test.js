import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm } from '../src/solver/windRoofExternalPressureTerm.js';
import { resolveWindRoofNetPressure } from '../src/solver/windRoofNetPressure.js';
import { resolveWindRoofBayCodePressureRouting } from '../src/solver/windRoofBayCodePressureRouting.js';
import { resolveWindRoofLoadCaseCombination } from '../src/solver/windRoofLoadCaseCombination.js';
import { resolveWindRoofCompanionActions } from '../src/solver/windRoofCompanionActions.js';
import { resolveWindRoofStrengthCombinationAssembly } from '../src/solver/windRoofStrengthCombinationAssembly.js';
import { roofBayPurlinStations, tributaryBandsFromStations } from '../src/solver/roofBay.js';
import {
  resolveRoofBayCodeDerivedActivation,
  serializeRoofBayCodeDerivedActivation,
  parseRoofBayCodeDerivedActivation,
  validateRoofBayCodeDerivedActivation
} from '../src/interchange/roofBayCodeDerivedActivation.js';

const SLOPE_DEG = 25;
const SPAN_M = 3;
const SLOPE_LENGTH_M = 4;
const MAX_SPACING_M = 0.8;
const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';

function makeWindAndContext({ planLengthM = 12 } = {}) {
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
  const planWidthM = 2 * SLOPE_LENGTH_M * Math.cos(SLOPE_DEG * Math.PI / 180);
  const context = createWindPressureContextAcceptance({
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
    roofSlopeDeg: SLOPE_DEG,
    roofSlopeSourceReference: 'Architectural roof section'
  });
  return { wind, context };
}

function makeAssembly({ lrResolved = true } = {}) {
  const { context } = makeWindAndContext();
  const layout = roofBayPurlinStations(SLOPE_LENGTH_M, MAX_SPACING_M);
  const bands = tributaryBandsFromStations(layout.stationsM, SLOPE_LENGTH_M).map((band, index) => ({
    label:`P${index + 1}`,
    stationM:layout.stationsM[index],
    startM:band.startM,
    endM:band.endM
  }));
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Roof section confirms symmetric gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: 0.4,
    roofBaySpanM: SPAN_M,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: bands,
    edgeDimensionHeightType: 'mean-roof-height',
    edgeDimensionHeightM: 8.82,
    edgeDimensionHeightSourceReference: 'Accepted mean-roof-height record'
  });
  const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context });
  const netRecords = bands.map((band) => {
    const area = resolveRoofPurlinEffectiveWindArea({
      windPressureContextAcceptance: context,
      purlinSpanM: SPAN_M,
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
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection:'toward-surface', routingMethodSourceReference }),
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords: netRecords, designDirection:'away-from-surface', routingMethodSourceReference })
  ];
  const windCases = resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords: routes,
    windActionDefinitionSourceReference: 'NSCP 2015 Section 203.2 W definition; authorized-copy review required',
    strengthCombinationSourceReference: 'NSCP 2015 Section 203.3.1 strength combinations; authorized-copy review required',
    publicCrossCheckReference: 'Public Philippine government structural calculations cross-check the wind-bearing strength combinations'
  });
  const companion = resolveWindRoofCompanionActions({
    windRoofLoadCaseCombination: windCases,
    codeLoadDefinitionsSourceReference: 'NSCP 2015 Section 203.2 load/action definitions; authorized-copy review required',
    roofDeadLoadKPa: 0.2,
    roofDeadLoadSourceReference: 'Project roof permanent-material dead-load schedule',
    purlinSelfWeightLineLoads: bands.map((band) => ({ label:band.label, lineLoadKNM:0.05, sourceReference:`${band.label} section self-weight calculation` })),
    roofLiveLoadKPa: 0.75,
    roofLiveLoadSourceReference: 'Project roof live-load basis',
    ordinaryLiveLoadZeroDecisionSourceReference: 'Roof-purlin target carries Lr, not ordinary floor live L',
    hydrostaticSoilZeroDecisionSourceReference: 'Roof-purlin target has no lateral soil/water pressure H',
    rainActionDecisionSourceReference: 'Rain R remains unresolved pending explicit project assessment'
  });
  return resolveWindRoofStrengthCombinationAssembly({
    windRoofCompanionActions: companion,
    lrOrRResolution: lrResolved ? {
      mode:'lr-selected-r-not-applicable',
      engineerConfirmedRainNotApplicable:true,
      decisionSourceReference:'Engineer rain/drainage applicability record',
      rationale:'Benchmark project explicitly records R as not applicable so accepted Lr path may be assembled.'
    } : { mode:'unresolved' },
    strengthCombinationAssemblySourceReference: 'NSCP 2015 Section 203.3.1; verify against authorized code copy',
    publicCrossCheckReference: 'Multiple DPWH structural plan sets cross-check the supported wind-bearing strength combinations'
  });
}

function makeProject(overrides = {}) {
  const { wind, context } = makeWindAndContext();
  return createRoofBayProject({
    projectId:'RB-ACT-001',
    projectName:'Controlled code-derived activation benchmark',
    sectionId:SECTION_ID,
    rafterSpacingM:SPAN_M,
    roofSlopeLengthM:SLOPE_LENGTH_M,
    maxPurlinSpacingM:MAX_SPACING_M,
    slopeDeg:SLOPE_DEG,
    orientationDeg:0,
    elasticModulusMPa:200000,
    yieldStrengthMPa:250,
    densityKgM3:7850,
    mode:'combined',
    deadLoadKPa:0.2,
    roofLiveLoadKPa:0.75,
    windPressureKPa:1.5,
    windSense:'uplift',
    loadFactor:1,
    windProjectInputAcceptance:wind,
    windPressureContextAcceptance:context,
    ...overrides
  });
}

function completeCase(assembly, templateId = 'NSCP-203-4', direction = 'away-from-surface') {
  return assembly.cases.find((item) => item.templateId === templateId && item.windDirection === direction && item.fullCombinationResult != null);
}
function activationInput(overrides = {}) {
  const assembly = overrides.windRoofStrengthCombinationAssembly ?? makeAssembly();
  const item = overrides.selectedCase ?? completeCase(assembly);
  return {
    roofBayProject: overrides.roofBayProject ?? makeProject(),
    windRoofStrengthCombinationAssembly: assembly,
    selectedCombinationCaseId: item?.combinationCaseId ?? 'missing',
    engineerConfirmedPurlinSelfWeightMatchesProjectSection: true,
    purlinSelfWeightCompatibilitySourceReference: 'Engineer check: imported PR #132 purlin self-weight corresponds to active catalog section',
    activationSourceReference: 'Engineer-controlled M3 code-derived activation record',
    ...overrides
  };
}

test('activates one complete verified case while retaining manual-uniform fallback', () => {
  const input = activationInput();
  const record = resolveRoofBayCodeDerivedActivation(input);
  const selected = completeCase(input.windRoofStrengthCombinationAssembly);
  assert.equal(record.status, 'CODE_DERIVED_STRENGTH_CASE_ACTIVATED_MANUAL_UNIFORM_RETAINED');
  assert.equal(record.activeDemandModel, 'code-derived-strength-combination');
  assert.equal(record.manualFallbackPressureModel, 'manual-uniform');
  assert.equal(record.manualUniformFallbackRetained, true);
  assert.equal(record.selectedCombinationCaseId, selected.combinationCaseId);
  assert.deepEqual(record.displayResult.fullCombinationResult, selected.fullCombinationResult);
  assert.equal(record.displayResult.equilibrium.pass, true);
  assert.equal(record.compatibility.purlinStationsMatch, true);
  assert.equal(record.compatibility.projectPurlinSectionId, SECTION_ID);
});

test('rejects blocked 203-3/203-4 cases while R remains unresolved', () => {
  const assembly = makeAssembly({ lrResolved:false });
  const blocked = assembly.cases.find((item) => item.templateId === 'NSCP-203-4' && item.windDirection === 'away-from-surface');
  assert.equal(blocked.fullCombinationResult, null);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({
    windRoofStrengthCombinationAssembly:assembly,
    selectedCase:blocked,
    selectedCombinationCaseId:blocked.combinationCaseId
  })), /not complete and equilibrium-verified/);
});

test('rejects geometry, purlin-layout, D and Lr mismatches instead of activating stale results', () => {
  const assembly = makeAssembly();
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:makeProject({ rafterSpacingM:3.1 }), windRoofStrengthCombinationAssembly:assembly })), /span does not match/);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:makeProject({ maxPurlinSpacingM:0.7 }), windRoofStrengthCombinationAssembly:assembly })), /purlin stations do not match/);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:makeProject({ deadLoadKPa:0.25 }), windRoofStrengthCombinationAssembly:assembly })), /D roof-area pressure does not match/);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:makeProject({ roofLiveLoadKPa:0.8 }), windRoofStrengthCombinationAssembly:assembly })), /Lr pressure does not match/);
});

test('rejects a different accepted pressure-context chain even when visible Roof Bay dimensions match', () => {
  const assembly = makeAssembly();
  const { wind, context } = makeWindAndContext({ planLengthM:12.2 });
  const project = createRoofBayProject({
    projectId:'RB-ACT-CONTEXT-MISMATCH', projectName:'Context mismatch', sectionId:SECTION_ID,
    rafterSpacingM:SPAN_M, roofSlopeLengthM:SLOPE_LENGTH_M, maxPurlinSpacingM:MAX_SPACING_M, slopeDeg:SLOPE_DEG,
    orientationDeg:0, elasticModulusMPa:200000, yieldStrengthMPa:250, densityKgM3:7850,
    mode:'combined', deadLoadKPa:0.2, roofLiveLoadKPa:0.75, windPressureKPa:1.5, windSense:'uplift', loadFactor:1,
    windProjectInputAcceptance:wind, windPressureContextAcceptance:context
  });
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:project, windRoofStrengthCombinationAssembly:assembly })), /pressure context does not match/);
});

test('requires explicit self-weight-to-section confirmation and source evidence', () => {
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ engineerConfirmedPurlinSelfWeightMatchesProjectSection:false })), /requires engineer confirmation/);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ purlinSelfWeightCompatibilitySourceReference:'' })), /purlinSelfWeightCompatibilitySourceReference/);
  assert.throws(() => resolveRoofBayCodeDerivedActivation(activationInput({ activationSourceReference:'' })), /activationSourceReference/);
});

test('round-trips deterministically and detects later project edits as activation invalidation', () => {
  const project = makeProject();
  const record = resolveRoofBayCodeDerivedActivation(activationInput({ roofBayProject:project }));
  const first = serializeRoofBayCodeDerivedActivation(record);
  const second = serializeRoofBayCodeDerivedActivation(parseRoofBayCodeDerivedActivation(first));
  assert.equal(second, first);
  assert.equal(validateRoofBayCodeDerivedActivation(record, project), true);

  const edited = structuredClone(project);
  edited.loading.windPressureKPa = 1.7;
  assert.throws(() => validateRoofBayCodeDerivedActivation(record, edited), /project changed after/);

  const mutated = structuredClone(record);
  mutated.displayResult.fullCombinationResult.roofNormalForceKN += 1;
  assert.throws(() => serializeRoofBayCodeDerivedActivation(mutated), /changed from its deterministic public project\/assembly\/source state/);
});

test('activation never promotes member response or capacity and keeps duplicate UI physics disabled', () => {
  for (const flag of ['duplicatePressureCalculationInUiImplemented','piecewisePurlinMemberResponseImplemented','purlinCapacityPromotionImplemented','connectionCapacityImplemented']) {
    const record = resolveRoofBayCodeDerivedActivation(activationInput());
    record.implementation[flag] = true;
    assert.throws(() => serializeRoofBayCodeDerivedActivation(record), /changed from its deterministic public project\/assembly\/source state/);
  }
});
