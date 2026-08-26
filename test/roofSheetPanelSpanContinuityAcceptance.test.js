import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import { createRoofFastenerCapacityEvidenceAcceptance } from '../src/interchange/roofFastenerCapacityEvidenceAcceptance.js';
import { createRoofSheetPositivePressureCapacityEvidenceAcceptance } from '../src/interchange/roofSheetPositivePressureCapacityEvidenceAcceptance.js';
import {
  createRoofSheetPanelSpanContinuityAcceptance,
  validateRoofSheetPanelSpanContinuityAcceptance,
  serializeRoofSheetPanelSpanContinuityAcceptance,
  parseRoofSheetPanelSpanContinuityAcceptance
} from '../src/interchange/roofSheetPanelSpanContinuityAcceptance.js';

const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FASTENER_ID = 'TEK-ROOF-BENCHMARK';
const SHEET_ID = 'SYNTHETIC-ROOF-SHEET-01';
const PROFILE_ID = 'SYNTHETIC-RIB-01';
const PURLIN_STATIONS = [0.2,1.2,2.2,3.2,3.8];
const TOL = 1e-9;

function assertApprox(actual, expected, label = 'value') {
  assert.ok(Math.abs(actual - expected) <= TOL, `${label}: expected ${expected}, got ${actual}`);
}
function assertApproxArray(actual, expected, label = 'values') {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => assertApprox(value, expected[index], `${label}[${index}]`));
}

function makeProject() {
  return createRoofBayProject({
    projectId:'M4-SHEET-SPAN-CONTINUITY-001',
    projectName:'M4 sheet span continuity benchmark',
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
        description:'Synthetic profiled steel roof-sheet test fixture; not a real product capacity',
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
        description:'Synthetic #12-style self-drilling roofing screw test fixture',
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
      capacity:{
        valueKN:2.4,
        capacityType:'allowable',
        designBasis:'asd',
        basisSourceReference:'TEST FIXTURE — synthetic upstream allowable basis'
      },
      sourceApplicability:{
        fastenerSystemIds:[FASTENER_ID],
        fastenerDiameterMmRange:{min:5.4,max:5.6},
        substrateBaseMetalThicknessMmRange:{min:0.79,max:0.81},
        substrateUltimateStrengthMPaRange:{min:329,max:331},
        minimumThreadPenetrationMm:4.8
      },
      applicabilitySourceReference:'TEST FIXTURE — synthetic upstream pull-out applicability'
    }]
  });
}

function makePositivePressureEvidenceAcceptance() {
  return createRoofSheetPositivePressureCapacityEvidenceAcceptance({
    roofFastenerCapacityEvidenceAcceptance:makeFastenerEvidenceAcceptance(),
    capacityEvidence:[{
      evidenceId:'SYNTHETIC-PANEL-POSITIVE-01',
      sourceType:'manufacturer-published',
      sourceReference:'TEST FIXTURE — synthetic positive-pressure panel table; not project data',
      sourceDocumentId:'TEST-SYNTHETIC-PANEL-PP-01',
      sourceCheckedDate:'2026-08-26',
      sourceCondition:{
        loadDirection:'toward-support',
        loadCategory:'positive-wind',
        sourceLoadCategoryLabel:'POSITIVE PRESSURE',
        spanType:'2-span',
        supportSpacingM:1.0,
        overhangCondition:'source-defined',
        sourceConditionReference:'TEST FIXTURE — synthetic 2-span 1.0 m source row'
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
        supportSpacingMRange:{min:0.99,max:1.01},
        overhangConditions:['source-defined'],
        loadDirections:['toward-support'],
        loadCategories:['positive-wind']
      },
      applicabilitySourceReference:'TEST FIXTURE — synthetic panel applicability'
    }]
  });
}

function panelRun(overrides = {}) {
  const base = {
    runId:'RUN-1',
    x0M:0,
    x1M:3,
    runSourceReference:'TEST FIXTURE — synthetic panel run layout',
    panelPieces:[
      {pieceId:'SHEET-A',y0M:0,y1M:2.4,pieceSourceReference:'TEST FIXTURE — lower physical sheet piece'},
      {pieceId:'SHEET-B',y0M:2.0,y1M:4,pieceSourceReference:'TEST FIXTURE — upper physical sheet piece'}
    ],
    endLaps:[{
      lowerPieceId:'SHEET-A',
      upperPieceId:'SHEET-B',
      lapLengthM:0.4,
      lapSupportLabel:'P3',
      lapDetailSourceReference:'TEST FIXTURE — end lap centered around P3'
    }]
  };
  return {...base,...overrides};
}

function input(overrides = {}) {
  return {
    roofSheetPositivePressureCapacityEvidenceAcceptance:overrides.roofSheetPositivePressureCapacityEvidenceAcceptance ?? makePositivePressureEvidenceAcceptance(),
    panelRuns:overrides.panelRuns ?? [panelRun()],
    configurationSourceReference:overrides.configurationSourceReference ?? 'TEST FIXTURE — coordinated roof-sheet panel span/continuity layout',
    note:overrides.note ?? null
  };
}

test('accepts explicit panel pieces, derives real purlin spans and records end lap as a continuity break without capacity promotion', () => {
  const record = createRoofSheetPanelSpanContinuityAcceptance(input());
  assert.equal(record.status, 'ROOF_SHEET_PANEL_SPAN_CONTINUITY_ACCEPTED_CAPACITY_APPLICABILITY_UNRESOLVED');
  assert.deepEqual(record.projectBasis.purlins.map((item) => item.stationM), PURLIN_STATIONS);
  assert.equal(record.panelRuns.length, 1);
  const run = record.panelRuns[0];
  assert.deepEqual(run.panelPieces[0].supportSequence.map((item) => item.purlinLabel), ['P1','P2','P3']);
  assert.deepEqual(run.panelPieces[1].supportSequence.map((item) => item.purlinLabel), ['P3','P4','P5']);
  assertApproxArray(run.panelPieces[0].spans.map((item) => item.spanLengthM), [1,1], 'SHEET-A spans');
  assertApproxArray(run.panelPieces[1].spans.map((item) => item.spanLengthM), [1,0.6], 'SHEET-B spans');
  assert.equal(run.panelPieces[0].spanType, '2-span');
  assert.equal(run.panelPieces[1].spanType, '2-span');
  assertApprox(run.endLaps[0].lapLengthM, 0.4, 'lap length');
  assert.equal(run.endLaps[0].lapSupportLabel, 'P3');
  assert.equal(run.endLaps[0].supportStatus, 'PURLIN_SUPPORT_IDENTIFIED_WITHIN_END_LAP');
  assert.equal(run.endLaps[0].structuralContinuityAcrossLap, 'NOT_INFERRED');
  assert.equal(run.continuityBreaks.length, 1);
  assertApprox(run.roofEdgeSupportGeometry.eaveOverhangM, 0.2, 'eave overhang');
  assertApprox(run.roofEdgeSupportGeometry.ridgeOverhangM, 0.2, 'ridge overhang');
  assert.equal(record.summary.projectPanelSpanConfigurationStatus, 'EXPLICIT_GEOMETRY_ACCEPTED');
  assert.equal(record.summary.capacityEvidenceProjectApplicabilityStatus, 'UNRESOLVED');
  assert.equal(record.summary.positivePressurePanelUtilizationStatus, 'UNRESOLVED');
  assert.equal(record.summary.roofSystemPass, null);
  assert.equal(record.implementation.projectCapacityEvidenceApplicabilityImplemented, false);
  assert.equal(record.implementation.endLapMonolithicContinuityAssumed, false);
});

test('accepts multiple x-runs only when they partition the full Roof Bay width exactly', () => {
  const first = panelRun({runId:'RUN-A',x0M:0,x1M:1.2});
  const second = panelRun({runId:'RUN-B',x0M:1.2,x1M:3});
  const record = createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[first,second]}));
  assert.equal(record.summary.panelRunCount, 2);
  assert.equal(record.summary.fullRoofBayWidthCoverage, true);

  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[
    panelRun({runId:'RUN-A',x0M:0,x1M:1.2}),
    panelRun({runId:'RUN-B',x0M:1.3,x1M:3})
  ]})), /partition.*no x-direction gaps or overlaps/);

  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[
    panelRun({runId:'RUN-A',x0M:0,x1M:1.5}),
    panelRun({runId:'RUN-B',x0M:1.4,x1M:3})
  ]})), /partition.*no x-direction gaps or overlaps/);
});

test('rejects gaps or zero-overlap butt joints between successive physical sheet pieces', () => {
  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    panelPieces:[
      {pieceId:'SHEET-A',y0M:0,y1M:2,pieceSourceReference:'TEST FIXTURE — lower'},
      {pieceId:'SHEET-B',y0M:2.1,y1M:4,pieceSourceReference:'TEST FIXTURE — upper'}
    ],
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.1,lapSupportLabel:null,lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /positive end-lap overlap/);

  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    panelPieces:[
      {pieceId:'SHEET-A',y0M:0,y1M:2,pieceSourceReference:'TEST FIXTURE — lower'},
      {pieceId:'SHEET-B',y0M:2,y1M:4,pieceSourceReference:'TEST FIXTURE — upper'}
    ],
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.1,lapSupportLabel:null,lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /positive end-lap overlap/);
});

test('rejects lap length mutation, unknown lap support and a support outside the physical lap interval', () => {
  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.3,lapSupportLabel:'P3',lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /lapLengthM changed/);

  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.4,lapSupportLabel:'PX',lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /unknown purlin/);

  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.4,lapSupportLabel:'P2',lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /outside the physical overlap interval/);
});

test('allows an explicitly recorded end lap with no identified purlin support but keeps that condition visible and unrated', () => {
  const record = createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.4,lapSupportLabel:null,lapDetailSourceReference:'TEST FIXTURE — unsupported/unknown lap support'}]
  })]}));
  assert.equal(record.panelRuns[0].endLaps[0].supportStatus, 'NO_PURLIN_SUPPORT_IDENTIFIED_IN_END_LAP');
  assert.equal(record.summary.unsupportedEndLapCount, 1);
  assert.equal(record.summary.endLapCapacityStatus, 'UNRESOLVED');
});

test('requires every physical sheet piece to cross at least two accepted purlin supports', () => {
  assert.throws(() => createRoofSheetPanelSpanContinuityAcceptance(input({panelRuns:[panelRun({
    panelPieces:[
      {pieceId:'SHEET-A',y0M:0,y1M:0.8,pieceSourceReference:'TEST FIXTURE — too short'},
      {pieceId:'SHEET-B',y0M:0.4,y1M:4,pieceSourceReference:'TEST FIXTURE — upper'}
    ],
    endLaps:[{lowerPieceId:'SHEET-A',upperPieceId:'SHEET-B',lapLengthM:0.4,lapSupportLabel:'P1',lapDetailSourceReference:'TEST FIXTURE'}]
  })]})), /must cross at least two physical purlin supports/);
});

test('round-trips deterministically and rejects geometry mutation or fake applicability/utilization/PASS promotion', () => {
  const record = createRoofSheetPanelSpanContinuityAcceptance(input());
  const first = serializeRoofSheetPanelSpanContinuityAcceptance(record);
  const second = serializeRoofSheetPanelSpanContinuityAcceptance(parseRoofSheetPanelSpanContinuityAcceptance(first));
  assert.equal(second, first);
  assert.equal(validateRoofSheetPanelSpanContinuityAcceptance(record), true);

  const changedSpan = structuredClone(record);
  changedSpan.panelRuns[0].panelPieces[0].spans[0].spanLengthM += 0.1;
  assert.throws(() => validateRoofSheetPanelSpanContinuityAcceptance(changedSpan), /changed from its deterministic accepted geometry/);

  const changedProject = structuredClone(record);
  changedProject.projectBasis.purlins[1].stationM += 0.1;
  assert.throws(() => validateRoofSheetPanelSpanContinuityAcceptance(changedProject), /changed from its deterministic accepted geometry/);

  const promoted = structuredClone(record);
  promoted.implementation.projectCapacityEvidenceApplicabilityImplemented = true;
  assert.throws(() => validateRoofSheetPanelSpanContinuityAcceptance(promoted), /improperly promoted/);

  const fakePass = structuredClone(record);
  fakePass.summary.roofSystemPass = true;
  assert.throws(() => validateRoofSheetPanelSpanContinuityAcceptance(fakePass), /must not promote/);
});
