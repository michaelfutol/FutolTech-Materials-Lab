import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import { resolveRoofFastenerCodePressureDemandRouting } from '../src/solver/roofFastenerCodePressureDemandRouting.js';
import { createRoofFastenerCapacityEvidenceAcceptance } from '../src/interchange/roofFastenerCapacityEvidenceAcceptance.js';
import {
  resolveRoofFastenerCapacityUtilization,
  validateRoofFastenerCapacityUtilization,
  serializeRoofFastenerCapacityUtilization,
  parseRoofFastenerCapacityUtilization
} from '../src/solver/roofFastenerCapacityUtilization.js';
import {
  createRoofBayActivationBenchmark,
  ROOF_BAY_ACTIVATION_BENCHMARK
} from '../scripts/fixtures/roofBayCodeDerivedActivationBenchmark.mjs';

const SECTION_ID = ROOF_BAY_ACTIVATION_BENCHMARK.sectionId;
const FASTENER_ID = 'TEK-ROOF-UTIL-BENCHMARK';
const EPS = 1e-9;

function close(actual, expected, tolerance = EPS) {
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `expected ${actual} ≈ ${expected}`);
}

function makeProject(overrides = {}) {
  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  return createRoofBayProject({
    projectId:'M4-FASTENER-UTIL-001',
    projectName:'M4 basis-compatible fastener utilization benchmark',
    sectionId:SECTION_ID,
    rafterSpacingM:b.spanM,
    roofSlopeLengthM:b.slopeLengthM,
    maxPurlinSpacingM:b.maxSpacingM,
    slopeDeg:b.slopeDeg,
    orientationDeg:0,
    yieldStrengthMPa:250,
    mode:'combined',
    deadLoadKPa:b.deadLoadKPa,
    roofLiveLoadKPa:b.roofLiveLoadKPa,
    windPressureKPa:b.manualWindPressureKPa,
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
    fastenerDescription:'Synthetic single-fastener utilization test fixture',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'TEST FIXTURE — synthetic fastener specification',
    layoutSourceReference:'TEST FIXTURE — dimensioned fastener layout',
    areaShareRoutingAssumptionSourceReference:'TEST FIXTURE — midpoint tributary-strip routing assumption',
    fastenerRows:stations.map((_, index) => ({
      purlinLabel:`P${index + 1}`,
      fastenerStationsAlongSpanM:[0.15,0.75,1.35,1.95,2.55],
      rowSourceReference:`TEST FIXTURE — row P${index + 1}`
    }))
  });
}

function sourceRoutes() {
  const benchmark = createRoofBayActivationBenchmark({ rainResolved:true });
  return benchmark.windRoofStrengthCombinationAssembly
    .upstreamWindRoofCompanionActions
    .upstreamWindRoofLoadCaseCombination
    .upstreamWindRoofBayCodePressureRoutingRecords;
}

function demandRoute(layout = makeLayout()) {
  return resolveRoofFastenerCodePressureDemandRouting({
    roofSheetFastenerLayoutAcceptance:layout,
    windRoofBayCodePressureRoutingRecords:sourceRoutes(),
    pressureToFastenerRoutingSourceReference:'TEST FIXTURE — verified M3 pressure pieces intersect accepted screw tributary rectangles'
  });
}

function attachmentDetail(overrides = {}) {
  const base = {
    roofSheet:{
      productId:'SYNTHETIC-ROOF-SHEET-UTIL-01',
      description:'Synthetic profiled steel roof sheet; deterministic test only',
      profileId:'SYNTHETIC-RIB-UTIL-01',
      baseMetalThicknessMm:0.50,
      geometrySourceReference:'TEST FIXTURE — synthetic roof-sheet geometry',
      materialGrade:'SYNTHETIC-SHEET-GRADE',
      yieldStrengthMPa:300,
      ultimateStrengthMPa:400,
      materialSourceReference:'TEST FIXTURE — synthetic sheet material'
    },
    purlinSubstrate:{
      sectionId:SECTION_ID,
      baseMetalThicknessMm:0.80,
      geometrySourceReference:'TEST FIXTURE — synthetic purlin BMT',
      materialGrade:'SYNTHETIC-PURLIN-GRADE',
      yieldStrengthMPa:250,
      ultimateStrengthMPa:330,
      materialSourceReference:'TEST FIXTURE — synthetic purlin material'
    },
    fastener:{
      systemId:FASTENER_ID,
      description:'Synthetic #12-style self-drilling roofing screw',
      diameterMm:5.50,
      threadPitchDescription:'Synthetic 14 TPI',
      headStyle:'hex washer head',
      bearingComponent:'washer',
      bearingDiameterMm:15.0,
      drillPoint:'Synthetic #3 point',
      materialDescription:'Synthetic carbon steel',
      attachmentPosition:'crest',
      installedThreadPenetrationMm:6.0,
      requiredMinimumThreadPenetrationMm:4.8,
      specificationSourceReference:'TEST FIXTURE — synthetic screw specification',
      installationSourceReference:'TEST FIXTURE — synthetic installation requirement'
    },
    detailSourceReference:'TEST FIXTURE — coordinated sheet/screw/purlin detail'
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
    evidenceId:'SYNTHETIC-LRFD-PULLOUT-01',
    mechanism:'pull-out',
    sourceType:'manufacturer-published',
    sourceReference:'TEST FIXTURE — synthetic LRFD single-fastener pull-out source; not production data',
    sourceDocumentId:'TEST-SYNTHETIC-LRFD-PO-01',
    sourceCheckedDate:'2026-08-24',
    capacity:{
      valueKN:24.0,
      capacityType:'design',
      designBasis:'lrfd',
      basisSourceReference:'TEST FIXTURE — synthetic LRFD design-capacity basis'
    },
    sourceApplicability:{
      fastenerSystemIds:[FASTENER_ID],
      fastenerDiameterMmRange:{min:5.4,max:5.6},
      substrateBaseMetalThicknessMmRange:{min:0.79,max:0.81},
      substrateUltimateStrengthMPaRange:{min:329,max:331},
      minimumThreadPenetrationMm:4.8
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic pull-out applicability'
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
    evidenceId:'SYNTHETIC-LRFD-PULLOVER-01',
    mechanism:'pull-over',
    sourceType:'laboratory-test',
    sourceReference:'TEST FIXTURE — synthetic LRFD single-fastener pull-over source; not production data',
    sourceDocumentId:'TEST-SYNTHETIC-LRFD-PV-01',
    sourceCheckedDate:'2026-08-24',
    capacity:{
      valueKN:16.0,
      capacityType:'design',
      designBasis:'lrfd',
      basisSourceReference:'TEST FIXTURE — synthetic LRFD design-capacity basis'
    },
    sourceApplicability:{
      fastenerSystemIds:[FASTENER_ID],
      roofSheetProductIds:['SYNTHETIC-ROOF-SHEET-UTIL-01'],
      roofSheetProfileIds:['SYNTHETIC-RIB-UTIL-01'],
      attachmentPositions:['crest'],
      bearingDiameterMmRange:{min:14.9,max:15.1},
      roofSheetBaseMetalThicknessMmRange:{min:0.49,max:0.51},
      roofSheetUltimateStrengthMPaRange:{min:399,max:401}
    },
    applicabilitySourceReference:'TEST FIXTURE — synthetic pull-over applicability'
  };
  return {
    ...base,
    ...overrides,
    capacity:{...base.capacity,...overrides.capacity},
    sourceApplicability:{...base.sourceApplicability,...overrides.sourceApplicability}
  };
}

function evidenceAcceptance(layout = makeLayout(), capacityEvidence = [pullOutEvidence(),pullOverEvidence()]) {
  return createRoofFastenerCapacityEvidenceAcceptance({
    roofSheetFastenerLayoutAcceptance:layout,
    attachmentDetail:attachmentDetail(),
    capacityEvidence,
    note:'TEST FIXTURE — synthetic capacities only'
  });
}

function scopeAcceptances(evidence = [pullOutEvidence(),pullOverEvidence()]) {
  return evidence.map((item) => ({
    evidenceId:item.evidenceId,
    scope:'single-fastener',
    sourceReference:`TEST FIXTURE — ${item.evidenceId} explicitly applies to one fastener`
  }));
}

function resolve({ layout = makeLayout(), evidenceRecords = [pullOutEvidence(),pullOverEvidence()], scopes = null, demandBasis = null } = {}) {
  const demand = demandRoute(layout);
  const evidence = evidenceAcceptance(layout, evidenceRecords);
  return resolveRoofFastenerCapacityUtilization({
    roofFastenerCodePressureDemandRouting:demand,
    roofFastenerCapacityEvidenceAcceptance:evidence,
    demandBasisAcceptance:demandBasis ?? {
      designDirection:'away-from-surface',
      designBasis:'lrfd',
      demandSourceReference:'TEST FIXTURE — M3/M4 code-derived Components & Cladding uplift demand',
      basisCompatibilitySourceReference:'TEST FIXTURE — explicit LRFD demand/capacity compatibility decision'
    },
    capacityScopeAcceptances:scopes ?? scopeAcceptances(evidenceRecords)
  });
}

test('computes individual screw pull-out/pull-over LRFD utilization only after complete applicability and single-fastener scope acceptance', () => {
  const record = resolve();
  assert.equal(record.schemaVersion, 'futoltech.roof-fastener-capacity-utilization/1');
  assert.equal(record.status, 'ROOF_FASTENER_UPLIFT_UTILIZATION_EVALUATED_ROOF_SYSTEM_UNRESOLVED');
  assert.equal(record.uplift.bothMechanismsEligible, true);
  const first = record.uplift.rows[0].fasteners[0];
  const sourceAway = record.upstreamRoofFastenerCodePressureDemandRouting.directions.find((item) => item.designDirection === 'away-from-surface');
  const sourceFastener = sourceAway.rows[0].fasteners[0];
  const demand = Math.abs(sourceFastener.demand.normalForceKN);
  close(first.upliftDemandKN, demand);
  close(first.mechanisms.find((item) => item.mechanism === 'pull-out').utilization, demand / 24.0);
  close(first.mechanisms.find((item) => item.mechanism === 'pull-over').utilization, demand / 16.0);
  assert.equal(first.governingMechanism, 'pull-over');
  assert.equal(first.connectionLocalStatus, 'PASS');
  assert.equal(record.uplift.summary.localUpliftConnectionState, 'PASS');
  assert.equal(record.uplift.summary.roofSystemPass, null);
  assert.equal(record.towardSurfaceBoundary.status, 'UNRESOLVED_COMPRESSION_BEARING_PATH');
  assert.equal(record.towardSurfaceBoundary.utilization, null);
});

test('missing single-fastener scope blocks that mechanism even when numeric LRFD design capacity exists', () => {
  const out = pullOutEvidence();
  const over = pullOverEvidence();
  const record = resolve({ evidenceRecords:[out,over], scopes:[{ evidenceId:out.evidenceId, scope:'single-fastener', sourceReference:'TEST FIXTURE — one screw' }] });
  const first = record.uplift.rows[0].fasteners[0];
  const pullOut = first.mechanisms.find((item) => item.mechanism === 'pull-out');
  const pullOver = first.mechanisms.find((item) => item.mechanism === 'pull-over');
  assert.ok(pullOut.utilization != null);
  assert.equal(pullOver.utilization, null);
  assert.deepEqual(pullOver.blockedReasons, ['SINGLE_FASTENER_CAPACITY_SCOPE_NOT_SOURCE_ACCEPTED']);
  assert.equal(first.connectionLocalStatus, 'INCOMPLETE');
  assert.equal(record.uplift.summary.localUpliftConnectionState, 'INCOMPLETE');
  assert.equal(record.uplift.summary.roofSystemPass, null);
});

test('blocks ASD allowable and test-reference capacities instead of inventing a conversion to LRFD', () => {
  const out = pullOutEvidence({ capacity:{ capacityType:'allowable', designBasis:'asd' } });
  const over = pullOverEvidence({ capacity:{ capacityType:'test-ultimate-reference', designBasis:'test-reference' } });
  const record = resolve({ evidenceRecords:[out,over] });
  for (const eligibility of record.uplift.mechanismEligibility) {
    assert.equal(eligibility.status, 'BLOCKED');
    assert.ok(eligibility.blockedReasons.includes('DEMAND_CAPACITY_BASIS_INCOMPATIBLE'));
    assert.equal(eligibility.capacityValueKN, null);
  }
  const first = record.uplift.rows[0].fasteners[0];
  assert.equal(first.governingUtilization, null);
  assert.equal(first.connectionLocalStatus, 'INCOMPLETE');
  assert.equal(record.uplift.summary.roofSystemPass, null);
});

test('incomplete #138 applicability remains blocked even with single-fastener scope and LRFD design basis', () => {
  const incomplete = pullOutEvidence({ sourceApplicability:{ substrateUltimateStrengthMPaRange:null } });
  const over = pullOverEvidence();
  const record = resolve({ evidenceRecords:[incomplete,over] });
  const pullOutEligibility = record.uplift.mechanismEligibility.find((item) => item.mechanism === 'pull-out');
  assert.equal(pullOutEligibility.status, 'BLOCKED');
  assert.ok(pullOutEligibility.blockedReasons.includes('EVIDENCE_APPLICABILITY_INCOMPLETE'));
  assert.equal(record.uplift.bothMechanismsEligible, false);
  assert.equal(record.uplift.summary.localUpliftConnectionState, 'INCOMPLETE');
});

test('eligible low pull-over design capacity produces a real local connection FAIL but never promotes whole-roof status', () => {
  const record = resolve({ evidenceRecords:[pullOutEvidence(),pullOverEvidence({ capacity:{ valueKN:0.01 } })] });
  assert.equal(record.uplift.bothMechanismsEligible, true);
  const failed = record.uplift.rows.flatMap((row) => row.fasteners).filter((fastener) => fastener.connectionLocalStatus === 'FAIL');
  assert.ok(failed.length > 0, 'expected at least one synthetic fastener to fail the deliberately tiny pull-over design capacity');
  assert.equal(record.uplift.summary.localUpliftConnectionState, 'FAIL');
  assert.equal(record.uplift.summary.roofSystemPass, null);
  assert.equal(record.implementation.fastenerGroupActionImplemented, false);
  assert.equal(record.implementation.roofSheetStructuralCapacityImplemented, false);
  assert.equal(record.implementation.purlinToRafterConnectionCapacityImplemented, false);
});

test('rejects incompatible demand/evidence layouts, unknown scope evidence, and unsupported demand-basis shortcuts', () => {
  const layout = makeLayout();
  const demand = demandRoute(layout);
  const otherProject = makeProject({ layoutMode:'custom-stations', purlinStationsM:[0.2,1.0,2.4,3.8] });
  const otherLayout = makeLayout(otherProject);
  const evidence = evidenceAcceptance(otherLayout);
  assert.throws(() => resolveRoofFastenerCapacityUtilization({
    roofFastenerCodePressureDemandRouting:demand,
    roofFastenerCapacityEvidenceAcceptance:evidence,
    demandBasisAcceptance:{ designDirection:'away-from-surface', designBasis:'lrfd', demandSourceReference:'x', basisCompatibilitySourceReference:'y' },
    capacityScopeAcceptances:[]
  }), /exact same accepted roof-sheet fastener layout/);

  const matchingEvidence = evidenceAcceptance(layout);
  assert.throws(() => resolveRoofFastenerCapacityUtilization({
    roofFastenerCodePressureDemandRouting:demand,
    roofFastenerCapacityEvidenceAcceptance:matchingEvidence,
    demandBasisAcceptance:{ designDirection:'away-from-surface', designBasis:'lrfd', demandSourceReference:'x', basisCompatibilitySourceReference:'y' },
    capacityScopeAcceptances:[{ evidenceId:'UNKNOWN', scope:'single-fastener', sourceReference:'z' }]
  }), /unknown evidenceId/);

  assert.throws(() => resolveRoofFastenerCapacityUtilization({
    roofFastenerCodePressureDemandRouting:demand,
    roofFastenerCapacityEvidenceAcceptance:matchingEvidence,
    demandBasisAcceptance:{ designDirection:'away-from-surface', designBasis:'asd', demandSourceReference:'x', basisCompatibilitySourceReference:'y' },
    capacityScopeAcceptances:[]
  }), /only an explicitly source-backed 'lrfd' demand basis/);
});

test('round-trips deterministically and rejects utilization or roof-system promotion mutations', () => {
  const record = resolve();
  const first = serializeRoofFastenerCapacityUtilization(record);
  const parsed = parseRoofFastenerCapacityUtilization(first);
  const second = serializeRoofFastenerCapacityUtilization(parsed);
  assert.equal(second, first);
  assert.equal(validateRoofFastenerCapacityUtilization(record), true);

  const changed = structuredClone(record);
  changed.uplift.rows[0].fasteners[0].mechanisms[0].utilization += 0.01;
  assert.throws(() => validateRoofFastenerCapacityUtilization(changed), /deterministic accepted demand\/evidence\/scope\/basis inputs/);

  const promoted = structuredClone(record);
  promoted.uplift.summary.roofSystemPass = true;
  assert.throws(() => validateRoofFastenerCapacityUtilization(promoted), /must not promote a roof-system PASS/);

  const implementationPromotion = structuredClone(record);
  implementationPromotion.implementation.fastenerGroupActionImplemented = true;
  assert.throws(() => validateRoofFastenerCapacityUtilization(implementationPromotion), /improperly promoted/);
});