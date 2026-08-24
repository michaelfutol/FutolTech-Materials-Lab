import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import {
  createRoofSheetFastenerLayoutAcceptance,
  validateRoofSheetFastenerLayoutAcceptance,
  serializeRoofSheetFastenerLayoutAcceptance,
  parseRoofSheetFastenerLayoutAcceptance
} from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';

const SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';

function makeProject(overrides = {}) {
  return createRoofBayProject({
    projectId:'M4-FASTENER-LAYOUT-001',
    projectName:'M4 fastener layout benchmark',
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

function equalRows(project, positions = [0.15, 0.75, 1.35, 1.95, 2.55]) {
  const stations = roofBayPurlinStations(project.geometry.roofSlopeLengthM, project.geometry.maxPurlinSpacingM).stationsM;
  return stations.map((_, index) => ({
    purlinLabel:`P${index + 1}`,
    fastenerStationsAlongSpanM:[...positions],
    rowSourceReference:`Roof fastening detail row P${index + 1}`
  }));
}

function input(project = makeProject(), rows = equalRows(project)) {
  return {
    roofBayProject:project,
    fastenerSystemId:'TEK-ROOF-BENCHMARK',
    fastenerDescription:'Project-specified self-drilling roofing screw; geometry identity only',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'Project roofing fastener schedule / product submittal placeholder',
    layoutSourceReference:'Dimensioned roof fastening plan',
    areaShareRoutingAssumptionSourceReference:'Engineer-approved midpoint tributary-strip demand-routing assumption',
    fastenerRows:rows
  };
}

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `expected ${actual} ≈ ${expected}`);
}

test('accepts one explicit fastener row per purlin and exactly partitions the physical Roof Bay area', () => {
  const project = makeProject();
  const record = createRoofSheetFastenerLayoutAcceptance(input(project));
  assert.equal(record.status, 'FASTENER_LAYOUT_ACCEPTED_DEMAND_AND_CAPACITY_UNRESOLVED');
  assert.equal(record.summary.purlinRowCount, 6);
  assert.equal(record.summary.totalFastenerCount, 30);
  close(record.summary.roofBayAreaM2, 12);
  close(record.summary.totalFastenerTributaryAreaM2, 12);
  close(record.summary.areaResidualM2, 0);
  assert.equal(record.summary.areaConservationPass, true);
  assert.equal(record.fastenerSystem.capacityStatus, 'UNRESOLVED');
  assert.equal(record.implementation.codePressureToFastenerDemandRoutingImplemented, false);
  assert.equal(record.implementation.screwPullOutCapacityImplemented, false);
  assert.equal(record.implementation.screwPullOverCapacityImplemented, false);

  const first = record.rows[0];
  close(first.purlinTributaryBand.widthM, 0.4);
  close(first.fasteners[0].tributaryRectangle.x0M, 0);
  close(first.fasteners[0].tributaryRectangle.x1M, 0.45);
  close(first.fasteners[0].tributaryRectangle.areaM2, 0.18);
  close(first.fasteners.at(-1).tributaryRectangle.x0M, 2.25);
  close(first.fasteners.at(-1).tributaryRectangle.x1M, 3);
  close(first.conservation.fastenerTributaryAreaM2, 1.2);
});

test('supports irregular fastener spacing without losing area or silently regularizing stations', () => {
  const project = makeProject();
  const positions = [0.05, 0.42, 1.1, 2.2, 2.92];
  const rows = equalRows(project, positions);
  const record = createRoofSheetFastenerLayoutAcceptance(input(project, rows));
  assert.deepEqual(record.rows[2].fasteners.map((item) => item.xM), positions);
  close(record.rows[2].fasteners[1].tributaryRectangle.x0M, (0.05 + 0.42) / 2);
  close(record.rows[2].fasteners[1].tributaryRectangle.x1M, (0.42 + 1.1) / 2);
  close(record.summary.areaResidualM2, 0);
});

test('supports custom/nonuniform purlin stations and derives exact physical upslope tributary bands', () => {
  const project = makeProject({
    layoutMode:'custom-stations',
    purlinStationsM:[0.2, 1.0, 2.4, 3.8]
  });
  const rows = [1,2,3,4].map((number) => ({
    purlinLabel:`P${number}`,
    fastenerStationsAlongSpanM:[0.2, 1.0, 1.8, 2.8],
    rowSourceReference:`Custom row P${number}`
  }));
  const record = createRoofSheetFastenerLayoutAcceptance(input(project, rows));
  const bands = record.projectBasis.geometry.purlinTributaryBands;
  assert.deepEqual(bands.map((band) => [band.startM, band.endM]), [[0,0.6],[0.6,1.7],[1.7,3.1],[3.1,4]]);
  close(record.summary.roofBayAreaM2, 12);
  close(record.summary.totalFastenerTributaryAreaM2, 12);
});

test('rejects missing, extra, duplicate, unsorted and out-of-span fastener geometry', () => {
  const project = makeProject();
  const rows = equalRows(project);
  assert.throws(() => createRoofSheetFastenerLayoutAcceptance(input(project, rows.slice(0,-1))), /exactly one row for every physical purlin/);
  assert.throws(() => createRoofSheetFastenerLayoutAcceptance(input(project, [...rows, { purlinLabel:'PX', fastenerStationsAlongSpanM:[1] }])), /extra: PX/);
  assert.throws(() => createRoofSheetFastenerLayoutAcceptance(input(project, [...rows.slice(0,-1), { ...rows[0] }])), /Duplicate fastener row/);

  const duplicateStationRows = equalRows(project);
  duplicateStationRows[0] = { ...duplicateStationRows[0], fastenerStationsAlongSpanM:[0.2,0.8,0.8,1.6] };
  assert.throws(() => createRoofSheetFastenerLayoutAcceptance(input(project, duplicateStationRows)), /strictly increasing/);

  const outsideRows = equalRows(project);
  outsideRows[0] = { ...outsideRows[0], fastenerStationsAlongSpanM:[0.2,1.0,3.1] };
  assert.throws(() => createRoofSheetFastenerLayoutAcceptance(input(project, outsideRows)), /within the Roof Bay span/);
});

test('round-trips deterministically, rejects capacity promotion and detects later Roof Bay geometry edits', () => {
  const project = makeProject();
  const record = createRoofSheetFastenerLayoutAcceptance(input(project));
  const first = serializeRoofSheetFastenerLayoutAcceptance(record);
  const second = serializeRoofSheetFastenerLayoutAcceptance(parseRoofSheetFastenerLayoutAcceptance(first));
  assert.equal(second, first);
  assert.equal(validateRoofSheetFastenerLayoutAcceptance(record, project), true);

  const promoted = structuredClone(record);
  promoted.fastenerSystem.capacityStatus = 'AVAILABLE';
  assert.throws(() => validateRoofSheetFastenerLayoutAcceptance(promoted), /must remain UNRESOLVED/);

  const edited = makeProject({ rafterSpacingM:3.1 });
  assert.throws(() => validateRoofSheetFastenerLayoutAcceptance(record, edited), /project geometry changed/);
});
