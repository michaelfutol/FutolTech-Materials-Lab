import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import { createRoofFastenerCapacityEvidenceAcceptance } from '../src/interchange/roofFastenerCapacityEvidenceAcceptance.js';
import {
  createRoofSheetPositivePressureCapacityEvidenceAcceptance,
  validateRoofSheetPositivePressureCapacityEvidenceAcceptance,
  serializeRoofSheetPositivePressureCapacityEvidenceAcceptance,
  parseRoofSheetPositivePressureCapacityEvidenceAcceptance
} from '../src/interchange/roofSheetPositivePressureCapacityEvidenceAcceptance.js';

const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FASTENER_ID = 'TEK-ROOF-BENCHMARK';
const SHEET_ID = 'SYNTHETIC-ROOF-SHEET-01';
const PROFILE_ID = 'SYNTHETIC-RIB-01';

function makeProject() {
  return createRoofBayProject({
    projectId:'M4-SHEET-POSITIVE-EVIDENCE-001',
    projectName:'M4 sheet positive-pressure evidence benchmark',
    sectionId:SECTION_ID,
    rafterSpacingM:3,
    roofSlopeLengthM:4,
    maxPurlinSpacingM:0.8,
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

function makeLayout(project = makeProject()) {
  const stations = roofBayPurlinStations(project.geometry.roofSlopeLengthM, project.geometry.maxPurlinSpacingM).stationsM;
  return createRoofSheetFastenerLayoutAcceptance({
    roofBayProject:project,
    fastenerSystemId:FASTENER_ID,
    fastenerDescription:'Synthetic test fixture self-drilling roofing screw identity',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'TEST FIXTURE — synthetic fastener specification reference',
    layoutSourceReference:'TEST FIXTURE — dimensioned fastening layout',
    areaShareRoutingAssumptionSourceReference:'TEST FIXTURE — midpoint tributary routing assumption',
    fastenerRows:stations.map((_, index) => ({
      purlinLabel:`P${index + 1}`,
      fastenerStationsAlongSpanM:[0.15,0.75,1.35,1.95,2.55],
      rowSourceReference:`TEST FIXTURE — row P${index + 1}`
    }))
  });
}

function makeFastenerEvidenceAcceptance() {
  const layout = makeLayout();
  return createRoofFastenerCapacityEvidenceAcceptance({
    roofSheetFastenerLayoutAcceptance:layout,
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

function positivePressureEvidence(overrides = {}) {
  const base = {
    evidenceId:'SYNTHETIC-PANEL-POSITIVE-01',
    sourceType:'manufacturer-published',
    sourceReference:'TEST FIXTURE — synthetic manufacturer positive-pressure load table; not project data',
    sourceDocumentId:'TEST-SYNTHETIC-PANEL-PP-01',
    sourceCheckedDate:'2026-08-26',
    sourceCondition:{
      loadDirection:'toward-support',
      loadCategory:'live-load-deflection',
      sourceLoadCategoryLabel:'LIVE LOAD/DEFLECTION',
      spanType:'2-span',
      supportSpacingM:1.20,
      overhangCondition:'no-overhang',
      sourceConditionReference:'TEST FIXTURE — synthetic table row 2-span at 1.20 m'
    },
    capacity:{
      valueKPa:2.50,
      capacityType:'allowable',
      designBasis:'manufacturer-rated',
      deflectionLimitRatio:180,
      basisSourceReference:'TEST FIXTURE — synthetic manufacturer allowable uniform-load basis'
    },
    applicableLimitStates:['flexure','shear','combined-shear-flexure','web-crippling','deflection'],
    limitStatesSourceReference:'TEST FIXTURE — synthetic source notes listing covered limit states',
    sourceApplicability:{
      roofSheetProductIds:[SHEET_ID],
      roofSheetProfileIds:[PROFILE_ID],
      roofSheetBaseMetalThicknessMmRange:{min:0.49,max:0.51},
      roofSheetYieldStrengthMPaRange:{min:299,max:301},
      roofSheetUltimateStrengthMPaRange:{min:399,max:401},
      spanTypes:['2-span'],
      supportSpacingMRange:{min:1.19,max:1.21},
      overhangConditions:['no-overhang'],
      loadDirections:['toward-support'],
      loadCategories:['live-load-deflection']
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic product/span/load applicability row'
  };
  return {
    ...base,
    ...overrides,
    sourceCondition:{...base.sourceCondition,...overrides.sourceCondition},
    capacity:{...base.capacity,...overrides.capacity},
    sourceApplicability:{...base.sourceApplicability,...overrides.sourceApplicability}
  };
}

function input(overrides = {}) {
  return {
    roofFastenerCapacityEvidenceAcceptance:overrides.roofFastenerCapacityEvidenceAcceptance ?? makeFastenerEvidenceAcceptance(),
    capacityEvidence:overrides.capacityEvidence ?? [positivePressureEvidence()],
    note:overrides.note ?? null
  };
}

test('accepts source-backed positive-pressure panel capacity evidence while project span applicability and utilization remain unresolved', () => {
  const record = createRoofSheetPositivePressureCapacityEvidenceAcceptance(input());
  assert.equal(record.status, 'ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_ACCEPTED_PROJECT_SPAN_APPLICABILITY_UNRESOLVED');
  assert.equal(record.acceptedRoofSheetDetail.productId, SHEET_ID);
  assert.equal(record.acceptedRoofSheetDetail.profileId, PROFILE_ID);
  assert.equal(record.capacityEvidence.length, 1);
  assert.equal(record.capacityEvidence[0].coverage.productApplicabilityStatus, 'PRODUCT_APPLICABILITY_COMPLETE');
  assert.equal(record.capacityEvidence[0].coverage.projectSpanApplicabilityStatus, 'UNRESOLVED_REQUIRES_EXPLICIT_PANEL_SPAN_CONFIGURATION');
  assert.equal(record.capacityEvidence[0].sourceCondition.loadDirection, 'toward-support');
  assert.equal(record.capacityEvidence[0].sourceCondition.spanType, '2-span');
  assert.equal(record.capacityEvidence[0].capacity.valueKPa, 2.5);
  assert.equal(record.capacityEvidence[0].capacity.deflectionLimitRatio, 180);
  assert.deepEqual(record.capacityEvidence[0].applicableLimitStates, ['flexure','shear','combined-shear-flexure','web-crippling','deflection']);
  assert.equal(record.summary.anyProductApplicableEvidence, true);
  assert.equal(record.summary.projectPanelSpanConfigurationStatus, 'UNRESOLVED');
  assert.equal(record.summary.projectDemandCapacityUtilizationStatus, 'UNRESOLVED');
  assert.equal(record.summary.localSupportContactCapacityStatus, 'UNRESOLVED');
  assert.equal(record.summary.roofSystemPass, null);
  assert.equal(record.implementation.projectSpanApplicabilityImplemented, false);
  assert.equal(record.implementation.positivePressurePanelUtilizationImplemented, false);
});

test('keeps incomplete product applicability as reference-only evidence', () => {
  const evidence = positivePressureEvidence({
    sourceApplicability:{ roofSheetUltimateStrengthMPaRange:null }
  });
  const record = createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({capacityEvidence:[evidence]}));
  assert.equal(record.capacityEvidence[0].coverage.productApplicabilityStatus, 'REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY');
  assert.deepEqual(record.capacityEvidence[0].coverage.missingRequiredProductFields, ['roofSheetUltimateStrengthMPaRange']);
  assert.deepEqual(record.summary.referenceOnlyEvidenceIds, ['SYNTHETIC-PANEL-POSITIVE-01']);
  assert.equal(record.summary.anyProductApplicableEvidence, false);
});

test('rejects source applicability that explicitly excludes the accepted roof-sheet detail', () => {
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceApplicability:{roofSheetProfileIds:['OTHER-PROFILE']}})]
  })), /does not cover.*roofSheetProfileIds/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceApplicability:{roofSheetBaseMetalThicknessMmRange:{min:0.60,max:0.70}}})]
  })), /does not cover.*roofSheetBaseMetalThicknessMmRange/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceApplicability:{roofSheetYieldStrengthMPaRange:{min:350,max:450}}})]
  })), /does not cover.*roofSheetYieldStrengthMPaRange/);
});

test('rejects uplift direction, malformed source span metadata and unsupported source categories', () => {
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceCondition:{loadDirection:'away-from-support'}})]
  })), /loadDirection must be one of: toward-support/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceCondition:{supportSpacingM:0}})]
  })), /supportSpacingM must be greater than zero/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceCondition:{spanType:'5-span'}})]
  })), /spanType must be one of/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceCondition:{loadCategory:'gravity-ish'}})]
  })), /loadCategory must be one of/);
});

test('rejects duplicate evidence IDs, nonpositive capacity and missing source-covered limit states', () => {
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence(),positivePressureEvidence()]
  })), /Duplicate capacity evidenceId/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({capacity:{valueKPa:0}})]
  })), /valueKPa must be greater than zero/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({applicableLimitStates:[]})]
  })), /applicableLimitStates must be a non-empty array/);
  assert.throws(() => createRoofSheetPositivePressureCapacityEvidenceAcceptance(input({
    capacityEvidence:[positivePressureEvidence({sourceCheckedDate:'26-08-2026'})]
  })), /YYYY-MM-DD/);
});

test('round-trips deterministically and rejects evidence/detail or scope promotion mutation', () => {
  const record = createRoofSheetPositivePressureCapacityEvidenceAcceptance(input());
  const first = serializeRoofSheetPositivePressureCapacityEvidenceAcceptance(record);
  const second = serializeRoofSheetPositivePressureCapacityEvidenceAcceptance(parseRoofSheetPositivePressureCapacityEvidenceAcceptance(first));
  assert.equal(second, first);
  assert.equal(validateRoofSheetPositivePressureCapacityEvidenceAcceptance(record), true);

  const changedCapacity = structuredClone(record);
  changedCapacity.capacityEvidence[0].capacity.valueKPa += 0.1;
  assert.throws(() => validateRoofSheetPositivePressureCapacityEvidenceAcceptance(changedCapacity), /changed from its deterministic accepted evidence/);

  const changedSheet = structuredClone(record);
  changedSheet.acceptedRoofSheetDetail.baseMetalThicknessMm += 0.1;
  assert.throws(() => validateRoofSheetPositivePressureCapacityEvidenceAcceptance(changedSheet), /changed from its deterministic accepted evidence/);

  const promoted = structuredClone(record);
  promoted.implementation.positivePressurePanelUtilizationImplemented = true;
  assert.throws(() => validateRoofSheetPositivePressureCapacityEvidenceAcceptance(promoted), /improperly promoted/);

  const fakePass = structuredClone(record);
  fakePass.summary.roofSystemPass = true;
  assert.throws(() => validateRoofSheetPositivePressureCapacityEvidenceAcceptance(fakePass), /must not promote/);
});
