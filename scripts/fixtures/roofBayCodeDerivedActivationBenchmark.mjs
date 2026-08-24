import { createWindProjectInputAcceptance } from '../../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../../src/solver/windInternalPressureCoefficient.js';
import { resolveRoofPurlinEffectiveWindArea } from '../../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm } from '../../src/solver/windRoofExternalPressureTerm.js';
import { resolveWindRoofNetPressure } from '../../src/solver/windRoofNetPressure.js';
import { resolveWindRoofBayCodePressureRouting } from '../../src/solver/windRoofBayCodePressureRouting.js';
import { resolveWindRoofLoadCaseCombination } from '../../src/solver/windRoofLoadCaseCombination.js';
import { resolveWindRoofCompanionActions } from '../../src/solver/windRoofCompanionActions.js';
import { resolveWindRoofStrengthCombinationAssembly } from '../../src/solver/windRoofStrengthCombinationAssembly.js';
import { roofBayPurlinStations, tributaryBandsFromStations } from '../../src/solver/roofBay.js';

export const ROOF_BAY_ACTIVATION_BENCHMARK = Object.freeze({
  slopeDeg:25,
  spanM:3,
  slopeLengthM:4,
  maxSpacingM:0.8,
  deadLoadKPa:0.2,
  roofLiveLoadKPa:0.75,
  manualWindPressureKPa:1.5,
  sectionId:'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8'
});

export function createRoofBayActivationBenchmark({ rainResolved = true } = {}) {
  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  const heightM = 8.82;
  const windProjectInputAcceptance = createWindProjectInputAcceptance({
    siteLocation:'Sta. Magdalena, Sorsogon, Philippines',
    siteSourceReference:'Project site record / survey reference',
    occupancyCategory:'III',
    occupancySourceReference:'Project occupancy classification record',
    basicWindSpeedKph:240,
    windSpeedSourceType:'authorized-code-map',
    windSpeedSourceReference:'Engineer transcription from authorized NSCP 2015 wind map',
    windSpeedSelectionMethod:'direct-contour-read',
    windSpeedFigureId:'207A.5-1A',
    exposureCategory:'C',
    exposureSourceReference:'Engineer terrain/exposure classification record',
    topographicFactorKzt:1,
    topographySourceReference:'Engineer topographic-factor project record',
    heightM,
    heightSourceReference:'Project mean-roof-height record'
  });
  const planWidthM = 2 * b.slopeLengthM * Math.cos(b.slopeDeg * Math.PI / 180);
  const windPressureContextAcceptance = createWindPressureContextAcceptance({
    windProjectInputAcceptance,
    enclosureClassification:'enclosed',
    enclosureClassificationSourceReference:'Engineer enclosure classification record',
    openingsAssessmentSourceReference:'Project openings assessment',
    roofForm:'gable',
    roofFormSourceReference:'Architectural roof plan',
    planLengthM:12,
    planWidthM,
    planDimensionSourceReference:'Dimensioned architectural plan',
    meanRoofHeightM:heightM,
    meanRoofHeightSourceReference:'Project mean-roof-height record',
    roofSlopeDeg:b.slopeDeg,
    roofSlopeSourceReference:'Architectural roof section'
  });
  const layout = roofBayPurlinStations(b.slopeLengthM, b.maxSpacingM);
  const bands = tributaryBandsFromStations(layout.stationsM, b.slopeLengthM).map((band, index) => ({
    label:`P${index + 1}`,
    stationM:layout.stationsM[index],
    startM:band.startM,
    endM:band.endM
  }));
  const windRoofZoneGeometry = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance,
    ridgeParallelPlanDimension:'plan-length',
    ridgeDirectionSourceReference:'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed:true,
    symmetricGableSourceReference:'Roof section confirms symmetric gable',
    roofPlane:'slope-a',
    roofBayStartAlongRidgeM:0.4,
    roofBaySpanM:b.spanM,
    roofBayGeometrySourceReference:'Accepted Roof Bay geometry',
    purlinTributaryBands:bands,
    edgeDimensionHeightType:'mean-roof-height',
    edgeDimensionHeightM:heightM,
    edgeDimensionHeightSourceReference:'Accepted mean-roof-height record'
  });
  const baseInternalPressureCoefficient = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance });
  const windRoofNetPressureRecords = bands.map((band) => {
    const roofPurlinEffectiveWindArea = resolveRoofPurlinEffectiveWindArea({
      windPressureContextAcceptance,
      purlinSpanM:b.spanM,
      actualTributaryWidthM:band.endM - band.startM,
      purlinGeometrySourceReference:`${band.label} physical Roof Bay geometry`,
      effectiveWidthSelection:'actual-tributary-width',
      effectiveWidthSelectionSourceReference:'Engineer-selected NSCP C&C effective-area rule path'
    });
    const windRoofExternalGcp = resolveWindRoofExternalGcp({
      windRoofZoneGeometry,
      roofPurlinEffectiveWindArea,
      targetPurlinBandLabel:band.label,
      codeFigureSourceReference:'Authorized NSCP 2015 Figure 207E.4-2B project check',
      curveEquationSourceReference:'ASCE 7-10 Wind Loads Guide equation cross-check'
    });
    const windRoofExternalPressureTerm = resolveWindRoofExternalPressureTerm({
      windRoofExternalGcp,
      equationSourceReference:'NSCP 2015 Part 1 C&C external pressure equation',
      signConventionSourceReference:'NSCP roof C&C figure sign convention'
    });
    return resolveWindRoofNetPressure({
      windRoofExternalPressureTerm,
      baseInternalPressureCoefficient,
      netPressureEquationSourceReference:'NSCP 2015 Part 1 roof C&C equation qh[(GCp)-(GCpi)]',
      minimumPressureSourceReference:'NSCP 2015 Components & Cladding minimum 0.77 kPa in either direction',
      signConventionSourceReference:'NSCP roof C&C figure sign convention'
    });
  });
  const routingMethodSourceReference = 'Classical simply-supported beam statics using exact physical zone-piece rectangles and resultants';
  const routes = [
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords, designDirection:'toward-surface', routingMethodSourceReference }),
    resolveWindRoofBayCodePressureRouting({ windRoofNetPressureRecords, designDirection:'away-from-surface', routingMethodSourceReference })
  ];
  const windRoofLoadCaseCombination = resolveWindRoofLoadCaseCombination({
    windRoofBayCodePressureRoutingRecords:routes,
    windActionDefinitionSourceReference:'NSCP 2015 Section 203.2 W definition; authorized-copy review required',
    strengthCombinationSourceReference:'NSCP 2015 Section 203.3.1 strength combinations; authorized-copy review required',
    publicCrossCheckReference:'Public Philippine government structural calculations cross-check the wind-bearing strength combinations'
  });
  const windRoofCompanionActions = resolveWindRoofCompanionActions({
    windRoofLoadCaseCombination,
    codeLoadDefinitionsSourceReference:'NSCP 2015 Section 203.2 load/action definitions; authorized-copy review required',
    roofDeadLoadKPa:b.deadLoadKPa,
    roofDeadLoadSourceReference:'Project roof permanent-material dead-load schedule',
    purlinSelfWeightLineLoads:bands.map((band) => ({ label:band.label, lineLoadKNM:0.05, sourceReference:`${band.label} section self-weight calculation` })),
    roofLiveLoadKPa:b.roofLiveLoadKPa,
    roofLiveLoadSourceReference:'Project roof live-load basis',
    ordinaryLiveLoadZeroDecisionSourceReference:'Roof-purlin target carries Lr, not ordinary floor live L',
    hydrostaticSoilZeroDecisionSourceReference:'Roof-purlin target has no lateral soil/water pressure H',
    rainActionDecisionSourceReference:'Rain R remains unresolved pending explicit project assessment'
  });
  const windRoofStrengthCombinationAssembly = resolveWindRoofStrengthCombinationAssembly({
    windRoofCompanionActions,
    lrOrRResolution:rainResolved ? {
      mode:'lr-selected-r-not-applicable',
      engineerConfirmedRainNotApplicable:true,
      decisionSourceReference:'Engineer rain/drainage applicability record',
      rationale:'Benchmark project explicitly records R as not applicable so accepted Lr path may be assembled.'
    } : { mode:'unresolved' },
    strengthCombinationAssemblySourceReference:'NSCP 2015 Section 203.3.1; verify against authorized code copy',
    publicCrossCheckReference:'Multiple DPWH structural plan sets cross-check the supported wind-bearing strength combinations'
  });
  const selectedCase = windRoofStrengthCombinationAssembly.cases.find((item) => item.templateId === 'NSCP-203-4' && item.windDirection === 'away-from-surface' && item.fullCombinationResult != null) ?? null;
  return {
    windProjectInputAcceptance,
    windPressureContextAcceptance,
    windRoofStrengthCombinationAssembly,
    selectedCombinationCaseId:selectedCase?.combinationCaseId ?? null,
    stationsM:layout.stationsM
  };
}