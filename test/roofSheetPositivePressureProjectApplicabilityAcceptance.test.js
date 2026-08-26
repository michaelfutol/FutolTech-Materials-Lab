import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import { createRoofFastenerCapacityEvidenceAcceptance } from '../src/interchange/roofFastenerCapacityEvidenceAcceptance.js';
import { createRoofSheetPositivePressureCapacityEvidenceAcceptance } from '../src/interchange/roofSheetPositivePressureCapacityEvidenceAcceptance.js';
import { createRoofSheetPanelSpanContinuityAcceptance } from '../src/interchange/roofSheetPanelSpanContinuityAcceptance.js';
import {
  createRoofSheetPositivePressureProjectApplicabilityAcceptance,
  validateRoofSheetPositivePressureProjectApplicabilityAcceptance,
  serializeRoofSheetPositivePressureProjectApplicabilityAcceptance,
  parseRoofSheetPositivePressureProjectApplicabilityAcceptance
} from '../src/interchange/roofSheetPositivePressureProjectApplicabilityAcceptance.js';

const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FASTENER_ID = 'TEK-ROOF-BENCHMARK';
const SHEET_ID = 'SYNTHETIC-ROOF-SHEET-01';
const PROFILE_ID = 'SYNTHETIC-RIB-01';
const PURLIN_STATIONS = [0.2,1.2,2.2,3.2,3.8];

function makeProject() {
  return createRoofBayProject({
    projectId:'M4-SHEET-PROJECT-APPLICABILITY-001',
    projectName:'M4 sheet project applicability benchmark',
    sectionId:SECTION_ID,
    rafterSpacingM:3,
    roofSlopeLengthM:4,
    maxPurlinSpacingM:1,
    layoutMode:'custom-stations',
    purlinStationsM:PURLIN_STATIONS,
    slopeDeg:25,
    orientationDeg:0,
    yieldStrengthMPa:250,
    mode:'combined',
    deadLoadKPa:0.2,
    roofLiveLoadKPa:0.75,
    windPressureKPa:1.5,
    windSense:'uplift',
    loadFactor:1
  });
}

function makeLayout() {
  const project = makeProject();
  return createRoofSheetFastenerLayoutAcceptance({
    roofBayProject:project,
    fastenerSystemId:FASTENER_ID,
    fastenerDescription:'Synthetic test fixture self-drilling roofing screw identity',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'TEST FIXTURE — synthetic fastener specification reference',
    layoutSourceReference:'TEST FIXTURE — dimensioned fastening layout',
    areaShareRoutingAssumptionSourceReference:'TEST FIXTURE — midpoint tributary routing assumption',
    fastenerRows:PURLIN_STATIONS.map((_, index) => ({
      purlinLabel:`P${index + 1}`,
      fastenerStationsAlongSpanM:[0.15,0.75,1.35,1.95,2.55],
      rowSourceReference:`TEST FIXTURE — row P${index + 1}`
    }))
  });
}

function makeFastenerEvidenceAcceptance() {
  return createRoofFastenerCapacityEvidenceAcceptance({
    roofSheetFastenerLayoutAcceptance:makeLayout(),
    attachmentDetail:{
      roofSheet:{
        productId:SHEET_ID,
        description:'Synthetic profiled steel roof-sheet test fixture; not real product capacity',
        profileId:PROFILE_ID,
        baseMetalThicknessMm:0.50,
        geometrySourceReference:'TEST FIXTURE — synthetic roof-sheet geometry',
        materialGrade:'SYNTHETIC-GRADE',
        yieldStrengthMPa:300,
        ultimateStrengthMPa:400,
        materialSourceReference:'TEST FIXTURE — synthetic roof-sheet material values'
      },
      purlinSubstrate:{
        sectionId:SECTION_ID,
        baseMetalThicknessMm:0.80,
        geometrySourceReference:'TEST FIXTURE — synthetic purlin BMT confirmation',
        materialGrade:'SYNTHETIC-PURLIN-GRADE',
        yieldStrengthMPa:250,
        ultimateStrengthMPa:330,
        materialSourceReference:'TEST FIXTURE — synthetic purlin material values'
      },
      fastener:{
        systemId:FASTENER_ID,
        description:'Synthetic self-drilling roofing screw test fixture',
        diameterMm:5.50,
        threadPitchDescription:'Synthetic 14 TPI test fixture',
        headStyle:'hex washer head',
        bearingComponent:'washer',
        bearingDiameterMm:15.0,
        drillPoint:'Synthetic #3 point',
        materialDescription:'Synthetic carbon steel test fixture',
        attachmentPosition:'crest',
        installedThreadPenetrationMm:6.0,
        requiredMinimumThreadPenetrationMm:4.8,
        specificationSourceReference:'TEST FIXTURE — synthetic screw specification',
        installationSourceReference:'TEST FIXTURE — synthetic installation requirement'
      },
      detailSourceReference:'TEST FIXTURE — coordinated roof-sheet/fastener/purlin detail'
    },
    capacityEvidence:[{
      evidenceId:'SYNTHETIC-PULLOUT-UPSTREAM-01',
      mechanism:'pull-out',
      sourceType:'manufacturer-published',
      sourceReference:'TEST FIXTURE — synthetic upstream pull-out evidence',
      sourceDocumentId:'TEST-UPSTREAM-PO-01',
      sourceCheckedDate:'2026-08-26',
      capacity:{valueKN:2.4,capacityType:'allowable',designBasis:'asd',basisSourceReference:'TEST FIXTURE — allowable basis'},
      sourceApplicability:{
        fastenerSystemIds:[FASTENER_ID],
        fastenerDiameterMmRange:{min:5.4,max:5.6},
        substrateBaseMetalThicknessMmRange:{min:0.79,max:0.81},
        substrateUltimateStrengthMPaRange:{min:329,max:331},
        minimumThreadPenetrationMm:4.8
      },
      applicabilitySourceReference:'TEST FIXTURE — upstream pull-out applicability'
    }]
  });
}

function positiveEvidence(overrides = {}) {
  const base = {
    evidenceId:'SYNTHETIC-PANEL-POSITIVE-01',
    sourceType:'manufacturer-published',
    sourceReference:'TEST FIXTURE — synthetic positive-pressure panel table; not project data',
    sourceDocumentId:'TEST-SYNTHETIC-PANEL-PP-01',
    sourceCheckedDate:'2026-08-26',
    sourceCondition:{
      loadDirection:'toward-support',
      loadCategory:'positive-wind',
      sourceLoadCategoryLabel:'POSITIVE WIND PRESSURE',
      spanType:'2-span',
      supportSpacingM:1.0,
      overhangCondition:'with-overhang',
      sourceConditionReference:'TEST FIXTURE — synthetic 2-span 1.0 m with-overhang row'
    },
    capacity:{
      valueKPa:2.5,
      capacityType:'allowable',
      designBasis:'manufacturer-rated',
      deflectionLimitRatio:180,
      basisSourceReference:'TEST FIXTURE — synthetic manufacturer-rated basis'
    },
    applicableLimitStates:['flexure','shear','combined-shear-flexure','web-crippling','deflection'],
    limitStatesSourceReference:'TEST FIXTURE — synthetic covered limit states',
    sourceApplicability:{
      roofSheetProductIds:[SHEET_ID],
      roofSheetProfileIds:[PROFILE_ID],
      roofSheetBaseMetalThicknessMmRange:{min:0.49,max:0.51},
      roofSheetYieldStrengthMPaRange:{min:299,max:301},
      roofSheetUltimateStrengthMPaRange:{min:399,max:401},
      spanTypes:['2-span'],
      supportSpacingMRange:{min:0.59,max:1.01},
      overhangConditions:['with-overhang'],
      loadDirections:['toward-support'],
      loadCategories:['positive-wind']
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic panel product/project applicability'
  };
  return {
    ...base,
    ...overrides,
    sourceCondition:{...base.sourceCondition,...(overrides.sourceCondition ?? {})},
    capacity:{...base.capacity,...(overrides.capacity ?? {})},
    sourceApplicability:{...base.sourceApplicability,...(overrides.sourceApplicability ?? {})}
  };
}

function makePositivePressureAcceptance(evidence = [positiveEvidence()]) {
  return createRoofSheetPositivePressureCapacityEvidenceAcceptance({
    roofFastenerCapacityEvidenceAcceptance:makeFastenerEvidenceAcceptance(),
    capacityEvidence:evidence
  });
}

function defaultRun(overrides = {}) {
  const base = {
    runId:'RUN-1',x0M:0,x1M:3,
    runSourceReference:'TEST FIXTURE — synthetic panel run layout',
    panelPieces:[
      {pieceId:'SHEET-A',y0M:0,y1M:2.4,pieceSourceReference:'TEST FIXTURE — lower physical sheet piece'},
      {pieceId:'SHEET-B',y0M:2.0,y1M:4,pieceSourceReference:'TEST FIXTURE — upper physical sheet piece'}
    ],
    endLaps:[{
      lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.4,lapSupportLabel:'P3',
      lapDetailSourceReference:'TEST FIXTURE — end lap centered around P3'
    }]
  };
  return {...base,...overrides};
}

function makePanelAcceptance({evidence = [positiveEvidence()], panelRuns = [defaultRun()]} = {}) {
  return createRoofSheetPanelSpanContinuityAcceptance({
    roofSheetPositivePressureCapacityEvidenceAcceptance:makePositivePressureAcceptance(evidence),
    panelRuns,
    configurationSourceReference:'TEST FIXTURE — coordinated project sheet layout'
  });
}

function input(overrides = {}) {
  return {
    roofSheetPanelSpanContinuityAcceptance:overrides.roofSheetPanelSpanContinuityAcceptance ?? makePanelAcceptance(),
    targetLoadCategory:overrides.targetLoadCategory ?? 'positive-wind',
    targetLoadCategorySourceReference:overrides.targetLoadCategorySourceReference ?? 'TEST FIXTURE — project positive-wind target',
    note:overrides.note ?? null
  };
}

test('accepts project applicability only when product, span type, every support spacing, piece overhang and target load category are explicitly covered', () => {
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input());
  assert.equal(record.status, 'ROOF_SHEET_PROJECT_APPLICABILITY_ACCEPTED_UTILIZATION_UNRESOLVED');
  assert.deepEqual(record.summary.projectApplicableEvidenceIds, ['SYNTHETIC-PANEL-POSITIVE-01']);
  assert.equal(record.summary.allPhysicalSheetPiecesCoveredByAtLeastOneApplicableEvidence, true);
  assert.equal(record.summary.projectCapacityEvidenceApplicabilityStatus, 'EXPLICIT_PROJECT_APPLICABILITY_AVAILABLE');
  assert.deepEqual(record.evidenceApplicability[0].pieceApplicability.map((item) => item.pieceSpanType), ['2-span','2-span']);
  assert.ok(Math.abs(record.evidenceApplicability[0].pieceApplicability[1].actualSupportSpacingsM[1] - 0.6) < 1e-9);
  assert.deepEqual(record.evidenceApplicability[0].pieceApplicability.map((item) => item.pieceOverhang.condition), ['with-overhang','with-overhang']);
  assert.equal(record.summary.capacityRowSelectionStatus, 'UNRESOLVED');
  assert.equal(record.summary.demandCapacityBasisAlignmentStatus, 'UNRESOLVED');
  assert.equal(record.summary.positivePressurePanelUtilizationStatus, 'UNRESOLVED');
  assert.equal(record.summary.roofSystemPass, null);
});

test('checks every actual support spacing and never substitutes an average spacing', () => {
  const evidence = positiveEvidence({
    sourceCondition:{supportSpacingM:0.8},
    sourceApplicability:{supportSpacingMRange:{min:0.75,max:0.85}}
  });
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({
    roofSheetPanelSpanContinuityAcceptance:makePanelAcceptance({evidence:[evidence]})
  }));
  assert.equal(record.evidenceApplicability[0].projectApplicabilityStatus, 'PROJECT_APPLICABILITY_EXCLUDED');
  assert.ok(record.evidenceApplicability[0].pieceApplicability.every((item) => item.mismatchReasons.includes('supportSpacingMRange')));
  assert.equal(record.summary.allPhysicalSheetPiecesCoveredByAtLeastOneApplicableEvidence, false);
});

test('treats overhang per physical piece instead of assigning the whole-run edge condition to interior pieces', () => {
  const pieces = [
    {pieceId:'EDGE-EAVE',y0M:0,y1M:1.4,pieceSourceReference:'TEST FIXTURE — eave piece'},
    {pieceId:'INTERIOR',y0M:1.0,y1M:3.4,pieceSourceReference:'TEST FIXTURE — interior piece'},
    {pieceId:'EDGE-RIDGE',y0M:3.0,y1M:4,pieceSourceReference:'TEST FIXTURE — ridge piece'}
  ];
  const laps = [
    {lowerPieceId:'EDGE-EAVE',upperPieceId:'INTERIOR',lapLengthM:0.4,lapSupportLabel:'P2',lapDetailSourceReference:'TEST FIXTURE — lower lap'},
    {lowerPieceId:'INTERIOR',upperPieceId:'EDGE-RIDGE',lapLengthM:0.4,lapSupportLabel:'P4',lapDetailSourceReference:'TEST FIXTURE — upper lap'}
  ];
  const evidence = positiveEvidence({
    sourceCondition:{spanType:'2-span',supportSpacingM:1.0,overhangCondition:'no-overhang'},
    sourceApplicability:{spanTypes:['1-span','2-span'],supportSpacingMRange:{min:0.59,max:1.01},overhangConditions:['no-overhang']}
  });
  const panel = makePanelAcceptance({evidence:[evidence],panelRuns:[defaultRun({panelPieces:pieces,endLaps:laps})]});
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({roofSheetPanelSpanContinuityAcceptance:panel}));
  const results = Object.fromEntries(record.evidenceApplicability[0].pieceApplicability.map((item) => [item.pieceId,item]));
  assert.equal(results['EDGE-EAVE'].pieceOverhang.condition, 'with-overhang');
  assert.equal(results.INTERIOR.pieceOverhang.condition, 'no-overhang');
  assert.equal(results['EDGE-RIDGE'].pieceOverhang.condition, 'with-overhang');
  assert.equal(results.INTERIOR.status, 'PROJECT_APPLICABILITY_COMPLETE');
  assert.equal(results['EDGE-EAVE'].status, 'PROJECT_APPLICABILITY_EXCLUDED');
  assert.equal(results['EDGE-RIDGE'].status, 'PROJECT_APPLICABILITY_EXCLUDED');
});

test('does not reuse a live-load/deflection source row for positive wind without explicit source coverage', () => {
  const liveEvidence = positiveEvidence({
    sourceCondition:{loadCategory:'live-load-deflection',sourceLoadCategoryLabel:'LIVE LOAD / DEFLECTION'},
    sourceApplicability:{loadCategories:['live-load-deflection']}
  });
  const panel = makePanelAcceptance({evidence:[liveEvidence]});
  const windRecord = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({roofSheetPanelSpanContinuityAcceptance:panel}));
  assert.equal(windRecord.evidenceApplicability[0].projectApplicabilityStatus, 'PROJECT_APPLICABILITY_EXCLUDED');
  assert.ok(windRecord.evidenceApplicability[0].pieceApplicability.every((item) => item.mismatchReasons.includes('loadCategory')));

  const liveRecord = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({
    roofSheetPanelSpanContinuityAcceptance:panel,
    targetLoadCategory:'live-load-deflection',
    targetLoadCategorySourceReference:'TEST FIXTURE — project live-load/deflection target'
  }));
  assert.equal(liveRecord.evidenceApplicability[0].projectApplicabilityStatus, 'PROJECT_APPLICABILITY_COMPLETE');
});

test('keeps missing project applicability fields reference-only instead of silently widening evidence', () => {
  const evidence = positiveEvidence({sourceApplicability:{supportSpacingMRange:null}});
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({
    roofSheetPanelSpanContinuityAcceptance:makePanelAcceptance({evidence:[evidence]})
  }));
  assert.equal(record.evidenceApplicability[0].projectApplicabilityStatus, 'REFERENCE_ONLY_INCOMPLETE_PROJECT_APPLICABILITY');
  assert.ok(record.evidenceApplicability[0].pieceApplicability.every((item) => item.missingRequiredProjectApplicabilityFields.includes('supportSpacingMRange')));
  assert.deepEqual(record.summary.referenceOnlyEvidenceIds, ['SYNTHETIC-PANEL-POSITIVE-01']);
});

test('does not treat source-defined span or overhang labels as wildcards', () => {
  const evidence = positiveEvidence({
    sourceCondition:{spanType:'source-defined',supportSpacingM:1.0,overhangCondition:'source-defined'},
    sourceApplicability:{spanTypes:['source-defined'],overhangConditions:['source-defined']}
  });
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({
    roofSheetPanelSpanContinuityAcceptance:makePanelAcceptance({evidence:[evidence]})
  }));
  assert.equal(record.evidenceApplicability[0].projectApplicabilityStatus, 'PROJECT_APPLICABILITY_EXCLUDED');
  assert.ok(record.evidenceApplicability[0].pieceApplicability.every((item) => item.mismatchReasons.includes('spanType') && item.mismatchReasons.includes('overhangCondition')));
  assert.equal(record.implementation.sourceDefinedWildcardAssumed, false);
});

test('rejects source applicability that contradicts its own accepted source row', () => {
  const evidence = positiveEvidence({sourceApplicability:{spanTypes:['3-span']}});
  const panel = makePanelAcceptance({evidence:[evidence]});
  assert.throws(() => createRoofSheetPositivePressureProjectApplicabilityAcceptance(input({roofSheetPanelSpanContinuityAcceptance:panel})), /contradicts its own source row.*spanTypes/);
});

test('round-trips deterministically and rejects applicability, utilization or roof-PASS mutation', () => {
  const record = createRoofSheetPositivePressureProjectApplicabilityAcceptance(input());
  const first = serializeRoofSheetPositivePressureProjectApplicabilityAcceptance(record);
  const second = serializeRoofSheetPositivePressureProjectApplicabilityAcceptance(parseRoofSheetPositivePressureProjectApplicabilityAcceptance(first));
  assert.equal(second, first);
  assert.equal(validateRoofSheetPositivePressureProjectApplicabilityAcceptance(record), true);

  const changed = structuredClone(record);
  changed.evidenceApplicability[0].pieceApplicability[0].status = 'PROJECT_APPLICABILITY_EXCLUDED';
  assert.throws(() => validateRoofSheetPositivePressureProjectApplicabilityAcceptance(changed), /changed from its deterministic accepted result/);

  const promoted = structuredClone(record);
  promoted.summary.positivePressurePanelUtilizationStatus = 'IMPLEMENTED';
  assert.throws(() => validateRoofSheetPositivePressureProjectApplicabilityAcceptance(promoted), /changed from its deterministic accepted result|improperly promoted/);

  const fakePass = structuredClone(record);
  fakePass.summary.roofSystemPass = true;
  assert.throws(() => validateRoofSheetPositivePressureProjectApplicabilityAcceptance(fakePass), /changed from its deterministic accepted result|must not promote/);
});
