import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import { resolveRoofFastenerCodePressureDemandRouting } from '../src/solver/roofFastenerCodePressureDemandRouting.js';
import {
  resolveRoofSheetPurlinSupportContactDemandRouting,
  validateRoofSheetPurlinSupportContactDemandRouting,
  serializeRoofSheetPurlinSupportContactDemandRouting,
  parseRoofSheetPurlinSupportContactDemandRouting
} from '../src/solver/roofSheetPurlinSupportContactDemandRouting.js';
import {
  createRoofBayActivationBenchmark,
  ROOF_BAY_ACTIVATION_BENCHMARK
} from '../scripts/fixtures/roofBayCodeDerivedActivationBenchmark.mjs';

const EPS = 1e-9;
function close(actual, expected, tolerance = EPS) {
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `expected ${actual} ≈ ${expected}`);
}

function makeProject() {
  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  return createRoofBayProject({
    projectId:'M4-SUPPORT-CONTACT-001',
    projectName:'M4 toward-surface support-contact benchmark',
    sectionId:b.sectionId,
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
    loadFactor:1
  });
}

function stationsFor(project) {
  return project.geometry.layoutMode === 'custom-stations'
    ? project.geometry.purlinStationsM
    : roofBayPurlinStations(project.geometry.roofSlopeLengthM, project.geometry.maxPurlinSpacingM).stationsM;
}

function makeLayout(positions = [0.15,0.75,1.35,1.95,2.55]) {
  const project = makeProject();
  return createRoofSheetFastenerLayoutAcceptance({
    roofBayProject:project,
    fastenerSystemId:'TEK-SUPPORT-CONTACT-BENCHMARK',
    fastenerDescription:'Synthetic roofing screw; support-contact routing test only',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'TEST FIXTURE — synthetic screw specification',
    layoutSourceReference:'TEST FIXTURE — dimensioned screw layout',
    areaShareRoutingAssumptionSourceReference:'TEST FIXTURE — midpoint tributary-strip audit assumption',
    fastenerRows:stationsFor(project).map((_, index) => ({
      purlinLabel:`P${index + 1}`,
      fastenerStationsAlongSpanM:[...positions],
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
    pressureToFastenerRoutingSourceReference:'TEST FIXTURE — M3 pressure pieces to screw cells for conservation audit'
  });
}

function resolve(demand = demandRoute()) {
  return resolveRoofSheetPurlinSupportContactDemandRouting({
    roofFastenerCodePressureDemandRouting:demand,
    supportContactInterpretationSourceReference:'MBMA Roof Framing Design Guide for Metal Building Systems, 2024 Edition, Sections 2.2.1 gravity loading and 2.2.2 uplift loading; engineering interpretation recorded for this M4 demand handoff'
  });
}

test('routes toward-surface pressure into purlin support-line resultants with exact piece, row and bay conservation', () => {
  const record = resolve();
  assert.equal(record.schemaVersion, 'futoltech.roof-sheet-purlin-support-contact-demand-routing/1');
  assert.equal(record.status, 'TOWARD_SURFACE_SUPPORT_CONTACT_DEMAND_ROUTED_CAPACITY_UNRESOLVED');
  assert.equal(record.supportContact.designDirection, 'toward-surface');
  assert.equal(record.supportContact.rows.length, 6);
  close(record.supportContact.summary.sourcePressureAreaM2, 12);
  assert.ok(record.supportContact.summary.normalForceKN > 0);

  for (const row of record.supportContact.rows) {
    assert.equal(row.conservation.pass, true);
    assert.equal(row.fastenerPartitionAudit.interpretation, 'CONSERVATION_AUDIT_ONLY_NOT_SCREW_AXIAL_COMPRESSION');
    for (const segment of row.contactSegments) {
      assert.ok(segment.designPressureKPa > 0);
      assert.ok(segment.segmentLengthM > 0);
      assert.ok(segment.pressureTributaryWidthM > 0);
      close(segment.sourcePressureAreaM2, segment.segmentLengthM * segment.pressureTributaryWidthM);
      close(segment.supportLineLoadKNPerM, segment.designPressureKPa * segment.pressureTributaryWidthM);
      close(segment.normalForceKN, segment.supportLineLoadKNPerM * segment.segmentLengthM);
      assert.equal(segment.localContactFootprintStatus, 'UNRESOLVED');
      assert.equal(segment.capacityStatus, 'UNRESOLVED');
      assert.equal(segment.utilization, null);
    }
  }
});

test('moving screw stations does not change inward roof-sheet to purlin support-line demand', () => {
  const regular = resolve(demandRoute(makeLayout([0.15,0.75,1.35,1.95,2.55])));
  const irregular = resolve(demandRoute(makeLayout([0.05,0.42,1.10,2.20,2.92])));
  for (let index = 0; index < regular.supportContact.rows.length; index += 1) {
    const left = regular.supportContact.rows[index];
    const right = irregular.supportContact.rows[index];
    assert.deepEqual(right.contactSegments, left.contactSegments);
    assert.deepEqual(right.routed, left.routed);
    close(right.fastenerPartitionAudit.partitionNormalForceKN, left.fastenerPartitionAudit.partitionNormalForceKN);
  }
  assert.deepEqual(irregular.supportContact.zoneTotals, regular.supportContact.zoneTotals);
  close(irregular.supportContact.summary.normalForceKN, regular.supportContact.summary.normalForceKN);
});

test('support-contact segments preserve exact field edge corner and raw pressure-case identities', () => {
  const source = sourceRoutes().find((item) => item.designDirection === 'toward-surface');
  const record = resolve();
  for (const row of record.supportContact.rows) {
    const sourceRow = source.purlins.find((item) => item.label === row.purlinLabel);
    assert.ok(sourceRow);
    assert.equal(row.contactSegments.length, sourceRow.pieceLoads.length);
    for (const segment of row.contactSegments) {
      const piece = sourceRow.pieceLoads.find((item) => item.pieceIndex === segment.sourcePieceIndex && item.zoneCellId === segment.zoneCellId);
      assert.ok(piece);
      assert.equal(segment.type, piece.type);
      assert.equal(segment.zoneNumber, piece.zoneNumber);
      assert.deepEqual(segment.governingRawCase, piece.governingRawCase);
      close(segment.designPressureKPa, piece.designPressureKPa);
      close(segment.supportLineLoadKNPerM, piece.piecewiseLineLoadKNM);
      close(segment.normalForceKN, piece.normalForceKN);
    }
  }
});

test('zone totals reproduce the verified M3 toward-surface field edge corner totals', () => {
  const source = sourceRoutes().find((item) => item.designDirection === 'toward-surface');
  const record = resolve();
  for (const zone of record.supportContact.zoneTotals) {
    const expected = source.zoneTotals.find((item) => item.type === zone.type);
    assert.ok(expected);
    close(zone.sourcePressureAreaM2, expected.areaM2);
    close(zone.normalForceKN, expected.normalForceKN);
    assert.equal(zone.pass, true);
  }
});

test('does not promote positive fastener cells into screw compression capacity or a roof-system PASS', () => {
  const record = resolve();
  assert.equal(record.fastenerCompressionBoundary.status, 'NOT_MODELED_AS_AXIAL_SCREW_COMPRESSION');
  assert.equal(record.fastenerCompressionBoundary.utilization, null);
  assert.equal(record.supportContact.summary.capacityStatus, 'UNRESOLVED');
  assert.equal(record.supportContact.summary.utilization, null);
  assert.equal(record.supportContact.summary.roofSystemPass, null);
  assert.equal(record.implementation.screwAxialCompressionCapacityImplemented, false);
  assert.equal(record.implementation.localSheetContactFootprintImplemented, false);
  assert.equal(record.implementation.roofSheetPositivePressureCapacityImplemented, false);
  assert.equal(record.implementation.purlinLocalBearingWebCripplingCapacityImplemented, false);
  assert.equal(record.implementation.purlinToRafterConnectionCapacityImplemented, false);
  assert.equal(record.implementation.roofSystemPassPromotionImplemented, false);
});

test('round-trips deterministically and rejects support-line or capacity promotion mutation', () => {
  const record = resolve();
  const first = serializeRoofSheetPurlinSupportContactDemandRouting(record);
  const parsed = parseRoofSheetPurlinSupportContactDemandRouting(first);
  const second = serializeRoofSheetPurlinSupportContactDemandRouting(parsed);
  assert.equal(second, first);
  assert.equal(validateRoofSheetPurlinSupportContactDemandRouting(record), true);

  const changedLineLoad = structuredClone(record);
  changedLineLoad.supportContact.rows[0].contactSegments[0].supportLineLoadKNPerM += 0.01;
  assert.throws(() => validateRoofSheetPurlinSupportContactDemandRouting(changedLineLoad), /deterministic upstream toward-surface demand inputs/);

  const promotedCapacity = structuredClone(record);
  promotedCapacity.supportContact.summary.capacityStatus = 'AVAILABLE';
  assert.throws(() => validateRoofSheetPurlinSupportContactDemandRouting(promotedCapacity), /must not promote capacity/);

  const fakeScrewCompression = structuredClone(record);
  fakeScrewCompression.fastenerCompressionBoundary.status = 'PASS';
  assert.throws(() => validateRoofSheetPurlinSupportContactDemandRouting(fakeScrewCompression), /must not be promoted to screw axial-compression utilization/);

  const implementationPromotion = structuredClone(record);
  implementationPromotion.implementation.roofSheetPositivePressureCapacityImplemented = true;
  assert.throws(() => validateRoofSheetPurlinSupportContactDemandRouting(implementationPromotion), /improperly promoted/);
});

test('requires an explicit source reference for the inward support-contact interpretation', () => {
  assert.throws(() => resolveRoofSheetPurlinSupportContactDemandRouting({
    roofFastenerCodePressureDemandRouting:demandRoute(),
    supportContactInterpretationSourceReference:''
  }), /supportContactInterpretationSourceReference/);
});
