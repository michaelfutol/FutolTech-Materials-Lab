import { validateRoofBayProject } from './roofBayProject.js';
import { roofBayPurlinStations, tributaryBandsFromStations } from '../solver/roofBay.js';

export const ROOF_SHEET_FASTENER_LAYOUT_SCHEMA = 'futoltech.roof-sheet-fastener-layout/1';

const STATUS = 'FASTENER_LAYOUT_ACCEPTED_DEMAND_AND_CAPACITY_UNRESOLVED';
const EPS = 1e-9;
const ATTACHMENT_POSITIONS = Object.freeze(['crest', 'pan', 'other-explicit']);
const LAYOUT_RULE = 'Every physical Roof Bay purlin line must carry one explicit fastener row. Fastener x-stations are measured in the accepted roof-local frame from Rafter A toward Rafter B. Midpoint tributary strips partition the full purlin span for later demand routing; no pressure or capacity is calculated in this acceptance slice.';
const BOUNDARY = 'This record establishes physical roof-sheet fastener locations and conservative midpoint area-share geometry only. It does not calculate roof-sheet bending, diaphragm action, load redistribution between fasteners, screw pull-out, pull-over, bearing, washer action, group capacity, purlin local failure, or purlin-to-rafter connection capacity. Fastener product identity is recorded for traceability but never promoted to a design capacity without a later verified evidence layer.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function positive(value, label) {
  const number = finite(value, label);
  if (!(number > 0)) throw new Error(`${label} must be greater than zero.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function sameNumber(left, right, label) {
  if (!nearlyEqual(left, right)) throw new Error(`${label} changed from its deterministic fastener-layout geometry.`);
}

function projectStations(project) {
  const geometry = project.geometry;
  if (geometry.layoutMode === 'custom-stations') return geometry.purlinStationsM.map(Number);
  return roofBayPurlinStations(geometry.roofSlopeLengthM, geometry.maxPurlinSpacingM).stationsM;
}

function projectBasis(project) {
  validateRoofBayProject(project);
  const stationsM = projectStations(project);
  const bands = tributaryBandsFromStations(stationsM, project.geometry.roofSlopeLengthM);
  return {
    projectId: project.projectId,
    geometry: {
      coordinateFrame: clone(project.geometry.roofPlaneFrame),
      rafterSpacingM: Number(project.geometry.rafterSpacingM),
      roofSlopeLengthM: Number(project.geometry.roofSlopeLengthM),
      layoutMode: project.geometry.layoutMode ?? 'equal-max-spacing',
      purlinStationsM: stationsM,
      purlinTributaryBands: bands.map((band, index) => ({
        purlinLabel: `P${index + 1}`,
        stationM: band.stationM,
        startM: band.startM,
        endM: band.endM,
        widthM: band.widthM
      }))
    },
    purlinSectionId: project.purlin.sectionId
  };
}

function cleanPositions(values, spanM, label) {
  if (!Array.isArray(values) || values.length < 1) throw new Error(`${label} must contain at least one explicit fastener x-station.`);
  const clean = values.map((value, index) => finite(value, `${label}[${index}]`));
  for (let index = 0; index < clean.length; index += 1) {
    if (clean[index] < -EPS || clean[index] > spanM + EPS) throw new Error(`${label}[${index}] must lie within the Roof Bay span.`);
    if (index > 0 && !(clean[index] > clean[index - 1] + EPS)) throw new Error(`${label} must be strictly increasing with no duplicate fastener stations.`);
  }
  return clean.map((value) => Math.min(spanM, Math.max(0, value)));
}

function fastenerTributaryIntervals(positionsM, spanM) {
  return positionsM.map((xM, index) => {
    const startM = index === 0 ? 0 : (positionsM[index - 1] + xM) / 2;
    const endM = index === positionsM.length - 1 ? spanM : (xM + positionsM[index + 1]) / 2;
    return { xM, startM, endM, widthM: endM - startM };
  });
}

function buildRows(expectedBands, spanM, fastenerRows) {
  if (!Array.isArray(fastenerRows)) throw new Error('fastenerRows must be an array with exactly one row for every physical purlin.');
  const suppliedByLabel = new Map();
  for (const [index, row] of fastenerRows.entries()) {
    const label = nonEmpty(row?.purlinLabel, `fastenerRows[${index}].purlinLabel`);
    if (suppliedByLabel.has(label)) throw new Error(`Duplicate fastener row for purlin '${label}'.`);
    suppliedByLabel.set(label, row);
  }
  const expectedLabels = expectedBands.map((band) => band.purlinLabel);
  const missing = expectedLabels.filter((label) => !suppliedByLabel.has(label));
  const extra = [...suppliedByLabel.keys()].filter((label) => !expectedLabels.includes(label));
  if (missing.length || extra.length || suppliedByLabel.size !== expectedLabels.length) {
    throw new Error(`Fastener layout requires exactly one row for every physical purlin. Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}.`);
  }

  return expectedBands.map((band) => {
    const source = suppliedByLabel.get(band.purlinLabel);
    const positionsM = cleanPositions(source.fastenerStationsAlongSpanM, spanM, `${band.purlinLabel}.fastenerStationsAlongSpanM`);
    const intervals = fastenerTributaryIntervals(positionsM, spanM);
    const fasteners = intervals.map((interval, index) => ({
      fastenerId: `${band.purlinLabel}-F${index + 1}`,
      purlinLabel: band.purlinLabel,
      xM: interval.xM,
      yM: band.stationM,
      tributaryRectangle: {
        x0M: interval.startM,
        x1M: interval.endM,
        y0M: band.startM,
        y1M: band.endM,
        widthAlongSpanM: interval.widthM,
        widthUpslopeM: band.widthM,
        areaM2: interval.widthM * band.widthM
      }
    }));
    const rowAreaM2 = fasteners.reduce((sum, fastener) => sum + fastener.tributaryRectangle.areaM2, 0);
    const expectedRowAreaM2 = spanM * band.widthM;
    const residualM2 = rowAreaM2 - expectedRowAreaM2;
    return {
      purlinLabel: band.purlinLabel,
      purlinStationM: band.stationM,
      purlinTributaryBand: clone(band),
      rowSourceReference: source.rowSourceReference == null || String(source.rowSourceReference).trim() === ''
        ? null
        : String(source.rowSourceReference).trim(),
      fasteners,
      conservation: {
        expectedRowAreaM2,
        fastenerTributaryAreaM2: rowAreaM2,
        residualM2,
        tolerance: EPS,
        pass: nearlyEqual(residualM2, 0)
      }
    };
  });
}

function buildRecord({
  roofBayProject,
  fastenerSystemId,
  fastenerDescription,
  attachmentPosition,
  fastenerSpecificationSourceReference,
  layoutSourceReference,
  areaShareRoutingAssumptionSourceReference,
  fastenerRows,
  note = null
} = {}) {
  const project = clone(roofBayProject);
  const basis = projectBasis(project);
  const spanM = basis.geometry.rafterSpacingM;
  const slopeLengthM = basis.geometry.roofSlopeLengthM;
  const position = nonEmpty(attachmentPosition, 'attachmentPosition').toLowerCase();
  if (!ATTACHMENT_POSITIONS.includes(position)) throw new Error(`attachmentPosition must be one of: ${ATTACHMENT_POSITIONS.join(', ')}.`);
  const rows = buildRows(basis.geometry.purlinTributaryBands, spanM, fastenerRows);
  const totalFastenerCount = rows.reduce((sum, row) => sum + row.fasteners.length, 0);
  const totalFastenerTributaryAreaM2 = rows.reduce((sum, row) => sum + row.conservation.fastenerTributaryAreaM2, 0);
  const roofBayAreaM2 = spanM * slopeLengthM;
  const areaResidualM2 = totalFastenerTributaryAreaM2 - roofBayAreaM2;
  if (!rows.every((row) => row.conservation.pass) || !nearlyEqual(areaResidualM2, 0)) throw new Error('Fastener tributary geometry failed Roof Bay area conservation.');

  return {
    schemaVersion: ROOF_SHEET_FASTENER_LAYOUT_SCHEMA,
    status: STATUS,
    projectBasis: basis,
    fastenerSystem: {
      id: nonEmpty(fastenerSystemId, 'fastenerSystemId'),
      description: nonEmpty(fastenerDescription, 'fastenerDescription'),
      attachmentPosition: position,
      specificationSourceReference: nonEmpty(fastenerSpecificationSourceReference, 'fastenerSpecificationSourceReference'),
      capacityStatus: 'UNRESOLVED'
    },
    sourceBasis: {
      layoutSourceReference: nonEmpty(layoutSourceReference, 'layoutSourceReference'),
      areaShareRoutingAssumptionSourceReference: nonEmpty(areaShareRoutingAssumptionSourceReference, 'areaShareRoutingAssumptionSourceReference'),
      layoutRule: LAYOUT_RULE
    },
    rows,
    summary: {
      purlinRowCount: rows.length,
      totalFastenerCount,
      roofBayAreaM2,
      totalFastenerTributaryAreaM2,
      areaResidualM2,
      areaConservationPass: nearlyEqual(areaResidualM2, 0)
    },
    implementation: {
      explicitFastenerGeometryAccepted: true,
      midpointTributaryAreaGeometryImplemented: true,
      codePressureToFastenerDemandRoutingImplemented: false,
      roofSheetStructuralCapacityImplemented: false,
      screwPullOutCapacityImplemented: false,
      screwPullOverCapacityImplemented: false,
      fastenerGroupRedistributionImplemented: false,
      purlinToRafterConnectionCapacityImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

function validateDeterministicRows(record) {
  const spanM = positive(record.projectBasis?.geometry?.rafterSpacingM, 'projectBasis.geometry.rafterSpacingM');
  const slopeLengthM = positive(record.projectBasis?.geometry?.roofSlopeLengthM, 'projectBasis.geometry.roofSlopeLengthM');
  const bands = record.projectBasis?.geometry?.purlinTributaryBands;
  if (!Array.isArray(bands) || !Array.isArray(record.rows) || record.rows.length !== bands.length) throw new Error('Roof-sheet fastener row geometry no longer matches the accepted purlin bands.');

  let totalCount = 0;
  let totalArea = 0;
  for (let rowIndex = 0; rowIndex < bands.length; rowIndex += 1) {
    const band = bands[rowIndex];
    const row = record.rows[rowIndex];
    if (row.purlinLabel !== band.purlinLabel) throw new Error(`Fastener row order/identity changed at '${band.purlinLabel}'.`);
    sameNumber(row.purlinStationM, band.stationM, `${band.purlinLabel}.purlinStationM`);
    if (!sameRecord(row.purlinTributaryBand, band)) throw new Error(`Fastener row '${band.purlinLabel}' tributary band changed.`);
    const positions = cleanPositions(row.fasteners?.map((fastener) => fastener.xM), spanM, `${band.purlinLabel}.storedFastenerStations`);
    const intervals = fastenerTributaryIntervals(positions, spanM);
    if (row.fasteners.length !== intervals.length) throw new Error(`Fastener count changed for '${band.purlinLabel}'.`);

    let rowArea = 0;
    for (let index = 0; index < intervals.length; index += 1) {
      const expected = intervals[index];
      const fastener = row.fasteners[index];
      if (fastener.fastenerId !== `${band.purlinLabel}-F${index + 1}` || fastener.purlinLabel !== band.purlinLabel) throw new Error(`Fastener identity changed in '${band.purlinLabel}'.`);
      sameNumber(fastener.xM, expected.xM, `${fastener.fastenerId}.xM`);
      sameNumber(fastener.yM, band.stationM, `${fastener.fastenerId}.yM`);
      const rectangle = fastener.tributaryRectangle;
      sameNumber(rectangle?.x0M, expected.startM, `${fastener.fastenerId}.tributaryRectangle.x0M`);
      sameNumber(rectangle?.x1M, expected.endM, `${fastener.fastenerId}.tributaryRectangle.x1M`);
      sameNumber(rectangle?.y0M, band.startM, `${fastener.fastenerId}.tributaryRectangle.y0M`);
      sameNumber(rectangle?.y1M, band.endM, `${fastener.fastenerId}.tributaryRectangle.y1M`);
      sameNumber(rectangle?.widthAlongSpanM, expected.widthM, `${fastener.fastenerId}.tributaryRectangle.widthAlongSpanM`);
      sameNumber(rectangle?.widthUpslopeM, band.widthM, `${fastener.fastenerId}.tributaryRectangle.widthUpslopeM`);
      const expectedArea = expected.widthM * band.widthM;
      sameNumber(rectangle?.areaM2, expectedArea, `${fastener.fastenerId}.tributaryRectangle.areaM2`);
      positive(rectangle?.areaM2, `${fastener.fastenerId}.tributaryRectangle.areaM2`);
      rowArea += expectedArea;
    }
    const expectedRowArea = spanM * band.widthM;
    sameNumber(row.conservation?.expectedRowAreaM2, expectedRowArea, `${band.purlinLabel}.conservation.expectedRowAreaM2`);
    sameNumber(row.conservation?.fastenerTributaryAreaM2, rowArea, `${band.purlinLabel}.conservation.fastenerTributaryAreaM2`);
    sameNumber(row.conservation?.residualM2, 0, `${band.purlinLabel}.conservation.residualM2`);
    if (row.conservation?.pass !== true) throw new Error(`Fastener row '${band.purlinLabel}' conservation status changed.`);
    totalCount += intervals.length;
    totalArea += rowArea;
  }

  const roofBayArea = spanM * slopeLengthM;
  sameNumber(record.summary?.purlinRowCount, bands.length, 'summary.purlinRowCount');
  sameNumber(record.summary?.totalFastenerCount, totalCount, 'summary.totalFastenerCount');
  sameNumber(record.summary?.roofBayAreaM2, roofBayArea, 'summary.roofBayAreaM2');
  sameNumber(record.summary?.totalFastenerTributaryAreaM2, totalArea, 'summary.totalFastenerTributaryAreaM2');
  sameNumber(record.summary?.areaResidualM2, 0, 'summary.areaResidualM2');
  if (record.summary?.areaConservationPass !== true) throw new Error('Roof-sheet fastener total area-conservation status changed.');
}

export function createRoofSheetFastenerLayoutAcceptance(input = {}) {
  const record = buildRecord(input);
  validateRoofSheetFastenerLayoutAcceptance(record, input.roofBayProject);
  return clone(record);
}

export function validateRoofSheetFastenerLayoutAcceptance(record, roofBayProject = null) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof-sheet fastener layout record must be an object.');
  if (record.schemaVersion !== ROOF_SHEET_FASTENER_LAYOUT_SCHEMA) throw new Error(`Unsupported roof-sheet fastener layout schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof-sheet fastener layout status changed.');
  nonEmpty(record.projectBasis?.projectId, 'projectBasis.projectId');
  nonEmpty(record.projectBasis?.purlinSectionId, 'projectBasis.purlinSectionId');
  nonEmpty(record.fastenerSystem?.id, 'fastenerSystem.id');
  nonEmpty(record.fastenerSystem?.description, 'fastenerSystem.description');
  nonEmpty(record.fastenerSystem?.specificationSourceReference, 'fastenerSystem.specificationSourceReference');
  if (!ATTACHMENT_POSITIONS.includes(record.fastenerSystem?.attachmentPosition)) throw new Error('Fastener attachment position changed or is unsupported.');
  if (record.fastenerSystem?.capacityStatus !== 'UNRESOLVED') throw new Error('Fastener capacity must remain UNRESOLVED in the M4 layout-acceptance slice.');
  nonEmpty(record.sourceBasis?.layoutSourceReference, 'sourceBasis.layoutSourceReference');
  nonEmpty(record.sourceBasis?.areaShareRoutingAssumptionSourceReference, 'sourceBasis.areaShareRoutingAssumptionSourceReference');
  if (record.sourceBasis?.layoutRule !== LAYOUT_RULE || record.boundary !== BOUNDARY) throw new Error('Roof-sheet fastener layout engineering boundary changed.');
  const expectedImplementation = {
    explicitFastenerGeometryAccepted: true,
    midpointTributaryAreaGeometryImplemented: true,
    codePressureToFastenerDemandRoutingImplemented: false,
    roofSheetStructuralCapacityImplemented: false,
    screwPullOutCapacityImplemented: false,
    screwPullOverCapacityImplemented: false,
    fastenerGroupRedistributionImplemented: false,
    purlinToRafterConnectionCapacityImplemented: false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof-sheet fastener layout record was improperly promoted beyond geometry acceptance.');
  validateDeterministicRows(record);
  if (roofBayProject != null) {
    const currentBasis = projectBasis(roofBayProject);
    if (!sameRecord(currentBasis, record.projectBasis)) throw new Error('Roof Bay project geometry changed after fastener layout acceptance.');
  }
  return true;
}

export function serializeRoofSheetFastenerLayoutAcceptance(record) {
  validateRoofSheetFastenerLayoutAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofSheetFastenerLayoutAcceptance(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofSheetFastenerLayoutAcceptance(parsed);
  return clone(parsed);
}
