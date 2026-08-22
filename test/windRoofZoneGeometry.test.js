import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import {
  resolveWindRoofZoneGeometry,
  serializeWindRoofZoneGeometry,
  parseWindRoofZoneGeometry
} from '../src/solver/windRoofZoneGeometry.js';

function makePressureContext({ slopeDeg = 25, planLengthM = 12, planWidthM = 8 } = {}) {
  const windInput = createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
    siteSourceReference: 'Project site record / survey reference',
    occupancyCategory: 'III',
    occupancySourceReference: 'Project occupancy classification record; verify against NSCP 2015 Table 103-1',
    basicWindSpeedKph: 240,
    windSpeedSourceType: 'authorized-code-map',
    windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map for the stated site',
    windSpeedSelectionMethod: 'direct-contour-read',
    windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C',
    exposureSourceReference: 'Engineer terrain/exposure classification record',
    topographicFactorKzt: 1,
    topographySourceReference: 'Engineer topographic-factor project record',
    heightM: 8.82,
    heightSourceReference: 'Project geometry / mean-roof-height record'
  });
  return createWindPressureContextAcceptance({
    windProjectInputAcceptance: windInput,
    enclosureClassification: 'enclosed',
    enclosureClassificationSourceReference: 'Engineer enclosure classification record; verify against authorized NSCP copy',
    openingsAssessmentSourceReference: 'Project opening schedule and façade assessment',
    roofForm: 'gable',
    roofFormSourceReference: 'Architectural roof plan A-201',
    planLengthM,
    planWidthM,
    planDimensionSourceReference: 'Dimensioned architectural plan A-101',
    meanRoofHeightM: 8.82,
    meanRoofHeightSourceReference: 'Project geometry / mean-roof-height record',
    roofSlopeDeg: slopeDeg,
    roofSlopeSourceReference: 'Roof section A-301'
  });
}

function zoneRecord({ slopeDeg = 25, bayStartM = 0.4, baySpanM = 3, planLengthM = 12, planWidthM = 8, heightType, heightM, bands } = {}) {
  const context = makePressureContext({ slopeDeg, planLengthM, planWidthM });
  const theta = slopeDeg * Math.PI / 180;
  const slopeLengthM = (planWidthM / 2) / Math.cos(theta);
  const least = Math.min(planLengthM, planWidthM);
  const referenceHeightM = heightM ?? (slopeDeg <= 10 ? 8 : 8.82);
  const aHorizontalM = Math.max(Math.min(0.10 * least, 0.40 * referenceHeightM), Math.max(0.04 * least, 0.9));
  const aSurfaceM = aHorizontalM / Math.cos(theta);
  const tributaryBands = bands ?? [
    { label: 'P1', startM: 0, endM: aSurfaceM },
    { label: 'P2', startM: aSurfaceM, endM: slopeLengthM }
  ];
  return resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Architectural roof plan: ridge runs parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Architectural roof section confirms symmetric two-slope gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: bayStartM,
    roofBaySpanM: baySpanM,
    roofBayGeometrySourceReference: 'Roof Bay accepted rafter-spacing and purlin tributary geometry',
    purlinTributaryBands: tributaryBands,
    edgeDimensionHeightType: heightType ?? (slopeDeg <= 10 ? 'eave-height' : 'mean-roof-height'),
    edgeDimensionHeightM: referenceHeightM,
    edgeDimensionHeightSourceReference: slopeDeg <= 10 ? 'Roof section eave-height dimension' : 'Accepted mean-roof-height record'
  });
}

test('M3 gable roof zone geometry resolves a in plan and maps the eave strip onto the roof surface', () => {
  const record = zoneRecord();
  const theta = 25 * Math.PI / 180;
  const expectedSlopeLengthM = 4 / Math.cos(theta);
  assert.equal(record.applicability.figureId, '207E.4-2B');
  assert.equal(record.edgeDimension.aHorizontalM, 0.9);
  assert.ok(Math.abs(record.edgeDimension.aRoofSurfaceUpslopeM - 0.9 / Math.cos(theta)) < 1e-12);
  assert.ok(Math.abs(record.wholeRoofGeometry.roofSlopeLengthM - expectedSlopeLengthM) < 1e-12);
  assert.equal(record.zones.conservation.pass, true);
  assert.ok(Math.abs(record.zones.partitionedRoofPlaneAreaM2 - record.zones.wholeRoofPlaneAreaM2) < 1e-9);
});

test('registered end bay produces exact corner/edge/field intersections without relabeling the whole purlin band', () => {
  const record = zoneRecord();
  const a = record.edgeDimension.aHorizontalM;
  const aSurface = record.edgeDimension.aRoofSurfaceUpslopeM;
  const slopeLength = record.wholeRoofGeometry.roofSlopeLengthM;
  const first = record.purlinTributaryBandIntersections[0];
  const second = record.purlinTributaryBandIntersections[1];

  assert.ok(Math.abs(first.zoneAreasM2.corner - (a - 0.4) * aSurface) < 1e-9);
  assert.ok(Math.abs(first.zoneAreasM2.edge - (3 - (a - 0.4)) * aSurface) < 1e-9);
  assert.equal(first.zoneAreasM2.field, 0);

  assert.equal(second.zoneAreasM2.corner, 0);
  assert.ok(Math.abs(second.zoneAreasM2.edge - (a - 0.4) * (slopeLength - aSurface)) < 1e-9);
  assert.ok(Math.abs(second.zoneAreasM2.field - (3 - (a - 0.4)) * (slopeLength - aSurface)) < 1e-9);
  assert.equal(first.conservation.pass, true);
  assert.equal(second.conservation.pass, true);
  assert.equal(record.roofBayConservation.pass, true);
});

test('an interior Roof Bay still sees the eave edge strip but no gable-end or corner zone', () => {
  const record = zoneRecord({ bayStartM: 3, baySpanM: 3 });
  const first = record.purlinTributaryBandIntersections[0];
  const second = record.purlinTributaryBandIntersections[1];
  assert.equal(first.zoneAreasM2.corner, 0);
  assert.equal(first.zoneAreasM2.field, 0);
  assert.ok(first.zoneAreasM2.edge > 0);
  assert.equal(second.zoneAreasM2.corner, 0);
  assert.equal(second.zoneAreasM2.edge, 0);
  assert.ok(second.zoneAreasM2.field > 0);
});

test('figure selection respects the 27 degree boundary', () => {
  assert.equal(zoneRecord({ slopeDeg: 27 }).applicability.figureId, '207E.4-2B');
  assert.equal(zoneRecord({ slopeDeg: 27.001 }).applicability.figureId, '207E.4-2C');
  assert.throws(() => zoneRecord({ slopeDeg: 7 }), /supports only 7° < roofSlopeDeg <= 45°/);
  assert.throws(() => zoneRecord({ slopeDeg: 45.001 }), /supports only 7° < roofSlopeDeg <= 45°/);
});

test('low-slope edge dimension requires source-backed eave height while steeper roofs use accepted mean roof height', () => {
  assert.equal(zoneRecord({ slopeDeg: 8, heightType: 'eave-height', heightM: 8 }).edgeDimension.referenceHeightType, 'eave-height');
  assert.throws(() => zoneRecord({ slopeDeg: 8, heightType: 'mean-roof-height', heightM: 8.82 }), /requires a source-referenced eave height/);
  assert.throws(() => zoneRecord({ slopeDeg: 25, heightType: 'mean-roof-height', heightM: 8.5 }), /must match the accepted mean roof height/);
  assert.throws(() => zoneRecord({ slopeDeg: 25, heightType: 'eave-height', heightM: 8 }), /must use the accepted mean roof height/);
});

test('purlin tributary bands must partition the full Roof Bay slope without gaps or overlaps', () => {
  const slopeLength = 4 / Math.cos(25 * Math.PI / 180);
  assert.throws(() => zoneRecord({ bands: [{ label: 'P1', startM: 0.1, endM: slopeLength }] }), /must start at the eave boundary/);
  assert.throws(() => zoneRecord({ bands: [{ label: 'P1', startM: 0, endM: 1 }, { label: 'P2', startM: 1.1, endM: slopeLength }] }), /contiguous, non-overlapping partition/);
  assert.throws(() => zoneRecord({ bands: [{ label: 'P1', startM: 0, endM: slopeLength - 0.1 }] }), /must end at the ridge boundary/);
});

test('roof zone geometry record round-trips deterministically', () => {
  const record = zoneRecord();
  const first = serializeWindRoofZoneGeometry(record);
  const second = serializeWindRoofZoneGeometry(parseWindRoofZoneGeometry(first));
  assert.equal(second, first);
});

test('mutated zone geometry, edge dimension, or band intersection is rejected', () => {
  const cellMutation = zoneRecord();
  cellMutation.zones.cells[0].areaM2 += 1;
  assert.throws(() => serializeWindRoofZoneGeometry(cellMutation), /Roof zone cells changed/);

  const edgeMutation = zoneRecord();
  edgeMutation.edgeDimension.aHorizontalM = 2;
  assert.throws(() => serializeWindRoofZoneGeometry(edgeMutation), /aHorizontalM changed/);

  const bandMutation = zoneRecord();
  bandMutation.purlinTributaryBandIntersections[0].zoneAreasM2.corner += 0.1;
  assert.throws(() => serializeWindRoofZoneGeometry(bandMutation), /zone intersections changed/);
});

test('zoning slice cannot silently promote GCp, final pressure, overhangs, sheet or fastener work', () => {
  for (const flag of [
    'externalPressureCoefficientImplemented',
    'roofSheetEffectiveWindAreaImplemented',
    'fastenerEffectiveWindAreaImplemented',
    'externalInternalPressureCombinationImplemented',
    'codeDerivedRoofPressureImplemented',
    'roofBayCodePressureRoutingImplemented'
  ]) {
    const promoted = zoneRecord();
    promoted.implementation[flag] = true;
    assert.throws(() => serializeWindRoofZoneGeometry(promoted), new RegExp(`${flag} must remain false`));
  }
  const overhang = zoneRecord();
  overhang.applicability.overhangGeometryImplemented = true;
  assert.throws(() => serializeWindRoofZoneGeometry(overhang), /overhangGeometryImplemented must remain false/);
});
