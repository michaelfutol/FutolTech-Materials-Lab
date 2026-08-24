import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import {
  createRoofFastenerCapacityEvidenceAcceptance,
  validateRoofFastenerCapacityEvidenceAcceptance,
  serializeRoofFastenerCapacityEvidenceAcceptance,
  parseRoofFastenerCapacityEvidenceAcceptance
} from '../src/interchange/roofFastenerCapacityEvidenceAcceptance.js';

const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FASTENER_ID = 'TEK-ROOF-BENCHMARK';

function makeProject(overrides = {}) {
  return createRoofBayProject({
    projectId:'M4-CAP-EVIDENCE-001',
    projectName:'M4 capacity evidence benchmark',
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
    loadFactor:1,
    ...overrides
  });
}

function makeLayout(project = makeProject()) {
  const stations = project.geometry.layoutMode === 'custom-stations'
    ? project.geometry.purlinStationsM
    : roofBayPurlinStations(project.geometry.roofSlopeLengthM, project.geometry.maxPurlinSpacingM).stationsM;
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

function attachmentDetail(overrides = {}) {
  const base = {
    roofSheet:{
      productId:'SYNTHETIC-ROOF-SHEET-01',
      description:'Synthetic profiled steel roof-sheet test fixture; not a real product capacity',
      profileId:'SYNTHETIC-RIB-01',
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
  };
  return {
    ...base,
    ...overrides,
    roofSheet:{...base.roofSheet,...overrides.roofSheet},
    purlinSubstrate:{...base.purlinSubstrate,...overrides.purlinSubstrate},
    fastener:{...base.fastener,...overrides.fastener}
  };
}

function pullOutEvidence(overrides = {}) {
  const base = {
    evidenceId:'SYNTHETIC-PULLOUT-01',
    mechanism:'pull-out',
    sourceType:'manufacturer-published',
    sourceReference:'TEST FIXTURE — synthetic manufacturer pull-out table; not project data',
    sourceDocumentId:'TEST-SYNTHETIC-PO-01',
    sourceCheckedDate:'2026-08-24',
    capacity:{
      valueKN:2.40,
      capacityType:'allowable',
      designBasis:'asd',
      basisSourceReference:'TEST FIXTURE — synthetic allowable-value basis'
    },
    sourceApplicability:{
      fastenerSystemIds:[FASTENER_ID],
      fastenerDiameterMmRange:{min:5.4,max:5.6},
      substrateBaseMetalThicknessMmRange:{min:0.79,max:0.81},
      substrateUltimateStrengthMPaRange:{min:329,max:331},
      minimumThreadPenetrationMm:4.8
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic pull-out applicability row'
  };
  return {
    ...base,
    ...overrides,
    capacity:{...base.capacity,...overrides.capacity},
    sourceApplicability:{...base.sourceApplicability,...overrides.sourceApplicability}
  };
}

function pullOverEvidence(overrides = {}) {
  const base = {
    evidenceId:'SYNTHETIC-PULLOVER-01',
    mechanism:'pull-over',
    sourceType:'laboratory-test',
    sourceReference:'TEST FIXTURE — synthetic pull-over test record; not project data',
    sourceDocumentId:'TEST-SYNTHETIC-PV-01',
    sourceCheckedDate:'2026-08-24',
    capacity:{
      valueKN:1.60,
      capacityType:'test-ultimate-reference',
      designBasis:'test-reference',
      basisSourceReference:'TEST FIXTURE — synthetic ultimate-test reference basis'
    },
    sourceApplicability:{
      fastenerSystemIds:[FASTENER_ID],
      roofSheetProductIds:['SYNTHETIC-ROOF-SHEET-01'],
      roofSheetProfileIds:['SYNTHETIC-RIB-01'],
      attachmentPositions:['crest'],
      bearingDiameterMmRange:{min:14.9,max:15.1},
      roofSheetBaseMetalThicknessMmRange:{min:0.49,max:0.51},
      roofSheetUltimateStrengthMPaRange:{min:399,max:401}
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic pull-over applicability row'
  };
  return {
    ...base,
    ...overrides,
    capacity:{...base.capacity,...overrides.capacity},
    sourceApplicability:{...base.sourceApplicability,...overrides.sourceApplicability}
  };
}

function input(overrides = {}) {
  const layout = overrides.roofSheetFastenerLayoutAcceptance ?? makeLayout();
  return {
    roofSheetFastenerLayoutAcceptance:layout,
    attachmentDetail:attachmentDetail(overrides.attachmentDetail),
    capacityEvidence:overrides.capacityEvidence ?? [pullOutEvidence(),pullOverEvidence()],
    note:overrides.note ?? null
  };
}

test('accepts exact attachment detail and complete pull-out/pull-over evidence without creating utilization', () => {
  const record = createRoofFastenerCapacityEvidenceAcceptance(input());
  assert.equal(record.status, 'ROOF_FASTENER_ATTACHMENT_DETAIL_AND_CAPACITY_EVIDENCE_ACCEPTED_UTILIZATION_UNRESOLVED');
  assert.equal(record.attachmentDetail.purlinSubstrate.sectionId, SECTION_ID);
  assert.equal(record.attachmentDetail.fastener.systemId, FASTENER_ID);
  assert.equal(record.capacityEvidence.length, 2);
  assert.equal(record.capacityEvidence[0].coverage.status, 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL');
  assert.equal(record.capacityEvidence[1].coverage.status, 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL');
  assert.equal(record.summary.pullOutEvidenceApplicabilityComplete, true);
  assert.equal(record.summary.pullOverEvidenceApplicabilityComplete, true);
  assert.equal(record.summary.upliftPullOutAndPullOverEvidenceCoverageComplete, true);
  assert.equal(record.capacityEvidence[0].capacity.capacityType, 'allowable');
  assert.equal(record.capacityEvidence[1].capacity.capacityType, 'test-ultimate-reference');
  assert.equal(record.implementation.demandCapacityBasisAlignmentImplemented, false);
  assert.equal(record.implementation.pullOutUtilizationImplemented, false);
  assert.equal(record.implementation.pullOverUtilizationImplemented, false);
  assert.equal(record.implementation.governingConnectionCapacityImplemented, false);
  assert.equal(record.implementation.roofSystemPassPromotionImplemented, false);
});

test('accepts incomplete applicability only as reference evidence and never upgrades it silently', () => {
  const incomplete = pullOutEvidence({
    sourceApplicability:{ substrateUltimateStrengthMPaRange:null }
  });
  const record = createRoofFastenerCapacityEvidenceAcceptance(input({ capacityEvidence:[incomplete] }));
  assert.equal(record.capacityEvidence[0].coverage.status, 'REFERENCE_ONLY_INCOMPLETE_APPLICABILITY');
  assert.deepEqual(record.capacityEvidence[0].coverage.missingRequiredFields, ['substrateUltimateStrengthMPaRange']);
  assert.equal(record.summary.pullOutEvidenceApplicabilityComplete, false);
  assert.deepEqual(record.summary.referenceOnlyMechanisms, ['pull-out']);
});

test('rejects evidence whose stated applicability does not cover the accepted detail', () => {
  const wrongThickness = pullOutEvidence({
    sourceApplicability:{ substrateBaseMetalThicknessMmRange:{min:1.0,max:1.2} }
  });
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({ capacityEvidence:[wrongThickness] })), /does not cover.*substrateBaseMetalThicknessMmRange/);

  const wrongProfile = pullOverEvidence({
    sourceApplicability:{ roofSheetProfileIds:['OTHER-PROFILE'] }
  });
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({ capacityEvidence:[wrongProfile] })), /does not cover.*roofSheetProfileIds/);
});

test('rejects attachment details inconsistent with the accepted layout or installation minimum', () => {
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    attachmentDetail:{ purlinSubstrate:{ sectionId:'OTHER-SECTION' } }
  })), /sectionId must match/);
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    attachmentDetail:{ fastener:{ systemId:'OTHER-FASTENER' } }
  })), /systemId must match/);
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    attachmentDetail:{ fastener:{ attachmentPosition:'pan' } }
  })), /attachmentPosition must match/);
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    attachmentDetail:{ fastener:{ installedThreadPenetrationMm:4.0, requiredMinimumThreadPenetrationMm:4.8 } }
  })), /less than.*minimum thread penetration/);
});

test('rejects duplicate selected mechanism records and malformed capacity evidence', () => {
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    capacityEvidence:[pullOutEvidence(),pullOutEvidence({evidenceId:'SYNTHETIC-PULLOUT-02'})]
  })), /only one selected evidence record/);
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    capacityEvidence:[pullOutEvidence({capacity:{valueKN:0}})]
  })), /must be greater than zero/);
  assert.throws(() => createRoofFastenerCapacityEvidenceAcceptance(input({
    capacityEvidence:[pullOutEvidence({sourceCheckedDate:'24-08-2026'})]
  })), /YYYY-MM-DD/);
});

test('round-trips deterministically and rejects stored evidence/capacity-boundary mutation', () => {
  const record = createRoofFastenerCapacityEvidenceAcceptance(input());
  const first = serializeRoofFastenerCapacityEvidenceAcceptance(record);
  const second = serializeRoofFastenerCapacityEvidenceAcceptance(parseRoofFastenerCapacityEvidenceAcceptance(first));
  assert.equal(second, first);
  assert.equal(validateRoofFastenerCapacityEvidenceAcceptance(record), true);

  const changedCapacity = structuredClone(record);
  changedCapacity.capacityEvidence[0].capacity.valueKN += 0.1;
  assert.throws(() => validateRoofFastenerCapacityEvidenceAcceptance(changedCapacity), /changed from its deterministic/);

  const promoted = structuredClone(record);
  promoted.implementation.pullOutUtilizationImplemented = true;
  assert.throws(() => validateRoofFastenerCapacityEvidenceAcceptance(promoted), /improperly promoted/);

  const changedDetail = structuredClone(record);
  changedDetail.attachmentDetail.fastener.bearingDiameterMm += 1;
  assert.throws(() => validateRoofFastenerCapacityEvidenceAcceptance(changedDetail), /changed from its deterministic/);
});
