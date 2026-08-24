import { validateRoofFastenerCodePressureDemandRouting } from './roofFastenerCodePressureDemandRouting.js';

export const ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING_SCHEMA = 'futoltech.roof-sheet-purlin-support-contact-demand-routing/1';

const STATUS = 'TOWARD_SURFACE_SUPPORT_CONTACT_DEMAND_ROUTED_CAPACITY_UNRESOLVED';
const TOWARD = 'toward-surface';
const EPS = 1e-9;
const ROUTING_RULE = 'Toward-surface roof pressure is handed off as a roof-sheet-to-purlin support-line resultant, not as axial compression in each roofing screw. For each verified M3 pressure piece on a purlin tributary band, line demand is w = p_design × tributary width and piece force is F = w × spanwise segment length.';
const FASTENER_RULE = 'The #137 toward-surface fastener tributary partition is retained only as a conservation audit. Screw spacing or count does not define the inward support-line resultant, and no screw compression capacity or utilization is inferred from the positive-pressure partition.';
const CONTACT_RULE = 'This record resolves only the resultant line demand delivered by the roof sheet to each purlin support line. Exact local contact footprint depends on the panel profile/support detail and remains unresolved together with panel positive-pressure capacity and purlin local bearing/web-crippling capacity.';
const BOUNDARY = 'No toward-surface connection PASS is created. Roof-sheet positive-pressure bending/local capacity, exact sheet-to-purlin contact stress, screw bearing/shear, purlin local bearing/web crippling, purlin member capacity, purlin-to-rafter connection capacity, group action and roof-system PASS remain unresolved.';

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
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nullableText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function sameNumber(left, right, label) {
  if (!nearlyEqual(left, right)) throw new Error(`${label} does not conserve the accepted toward-surface demand.`);
}

function segmentFromPiece(purlin, piece) {
  const x0M = finite(piece?.localSpanRangeM?.x0M, `${purlin.label}.piece.x0M`);
  const x1M = finite(piece?.localSpanRangeM?.x1M, `${purlin.label}.piece.x1M`);
  const y0M = finite(piece?.globalRectangle?.y0M, `${purlin.label}.piece.y0M`);
  const y1M = finite(piece?.globalRectangle?.y1M, `${purlin.label}.piece.y1M`);
  const segmentLengthM = x1M - x0M;
  const pressureTributaryWidthM = y1M - y0M;
  if (!(segmentLengthM > EPS)) throw new Error(`${purlin.label} support-contact segment length must be positive.`);
  if (!(pressureTributaryWidthM > EPS)) throw new Error(`${purlin.label} support-contact pressure tributary width must be positive.`);
  const designPressureKPa = finite(piece.designPressureKPa, `${purlin.label}.${piece.zoneCellId}.designPressureKPa`);
  if (!(designPressureKPa > 0)) throw new Error('Toward-surface support-contact pressure must be positive.');
  const sourcePressureAreaM2 = segmentLengthM * pressureTributaryWidthM;
  const supportLineLoadKNPerM = designPressureKPa * pressureTributaryWidthM;
  const normalForceKN = supportLineLoadKNPerM * segmentLengthM;
  sameNumber(sourcePressureAreaM2, piece.actualAreaM2, `${purlin.label}.${piece.zoneCellId}.area`);
  sameNumber(supportLineLoadKNPerM, piece.piecewiseLineLoadKNM, `${purlin.label}.${piece.zoneCellId}.lineLoad`);
  sameNumber(normalForceKN, piece.normalForceKN, `${purlin.label}.${piece.zoneCellId}.force`);
  return {
    segmentId:`${purlin.label}:${piece.zoneCellId}:${piece.pieceIndex}`,
    purlinLabel:purlin.label,
    purlinStationM:purlin.stationM,
    sourcePieceIndex:piece.pieceIndex,
    zoneCellId:piece.zoneCellId,
    zoneNumber:piece.zoneNumber,
    type:piece.type,
    spanRangeM:{ x0M, x1M },
    segmentLengthM,
    pressureTributaryWidthM,
    sourcePressureAreaM2,
    designPressureKPa,
    minimumPressureApplied:Boolean(piece.minimumPressureApplied),
    governingRawCase:clone(piece.governingRawCase),
    supportLineLoadKNPerM,
    normalForceKN,
    localContactFootprintStatus:'UNRESOLVED',
    capacityStatus:'UNRESOLVED',
    utilization:null
  };
}

function rowResult(sourcePurlin, fastenerRow) {
  const contactSegments = sourcePurlin.pieceLoads.map((piece) => segmentFromPiece(sourcePurlin, piece));
  const sourcePressureAreaM2 = contactSegments.reduce((sum, item) => sum + item.sourcePressureAreaM2, 0);
  const normalForceKN = contactSegments.reduce((sum, item) => sum + item.normalForceKN, 0);
  const fastenerPartitionForceKN = fastenerRow.fasteners.reduce((sum, item) => sum + finite(item.demand.normalForceKN, `${item.fastenerId}.normalForceKN`), 0);
  const fastenerPartitionAreaM2 = fastenerRow.fasteners.reduce((sum, item) => sum + finite(item.demand.routedAreaM2, `${item.fastenerId}.routedAreaM2`), 0);
  sameNumber(sourcePressureAreaM2, sourcePurlin.routed.areaM2, `${sourcePurlin.label}.sourcePressureArea`);
  sameNumber(normalForceKN, sourcePurlin.routed.normalForceKN, `${sourcePurlin.label}.sourceForce`);
  sameNumber(sourcePressureAreaM2, fastenerRow.routed.routedAreaM2, `${sourcePurlin.label}.fastenerPartitionArea`);
  sameNumber(normalForceKN, fastenerRow.routed.normalForceKN, `${sourcePurlin.label}.fastenerPartitionForce`);
  sameNumber(sourcePressureAreaM2, fastenerPartitionAreaM2, `${sourcePurlin.label}.fastenerCellAreaSum`);
  sameNumber(normalForceKN, fastenerPartitionForceKN, `${sourcePurlin.label}.fastenerCellForceSum`);
  return {
    purlinLabel:sourcePurlin.label,
    purlinStationM:sourcePurlin.stationM,
    purlinTributaryBand:{
      startM:sourcePurlin.tributaryStartM,
      endM:sourcePurlin.tributaryEndM,
      widthM:sourcePurlin.tributaryWidthM
    },
    contactSegments,
    routed:{ sourcePressureAreaM2, normalForceKN },
    fastenerPartitionAudit:{
      fastenerCount:fastenerRow.fasteners.length,
      partitionAreaM2:fastenerPartitionAreaM2,
      partitionNormalForceKN:fastenerPartitionForceKN,
      interpretation:'CONSERVATION_AUDIT_ONLY_NOT_SCREW_AXIAL_COMPRESSION'
    },
    conservation:{
      areaResidualM2:sourcePressureAreaM2 - sourcePurlin.routed.areaM2,
      forceResidualKN:normalForceKN - sourcePurlin.routed.normalForceKN,
      fastenerPartitionForceResidualKN:fastenerPartitionForceKN - normalForceKN,
      tolerance:EPS,
      pass:true
    }
  };
}

function buildRecord({ roofFastenerCodePressureDemandRouting, supportContactInterpretationSourceReference, note = null } = {}) {
  const demand = clone(roofFastenerCodePressureDemandRouting);
  validateRoofFastenerCodePressureDemandRouting(demand);
  const towardDemand = demand.directions.find((item) => item.designDirection === TOWARD);
  const sourceM3 = demand.upstreamWindRoofBayCodePressureRoutingRecords.find((item) => item.designDirection === TOWARD);
  if (!towardDemand || !sourceM3) throw new Error('The accepted M4 demand route must preserve the verified toward-surface M3 pressure route.');
  if (towardDemand.rows.length !== sourceM3.purlins.length) throw new Error('Toward-surface fastener rows and M3 purlin support lines differ.');
  const fastenerRowsByLabel = new Map(towardDemand.rows.map((row) => [row.purlinLabel, row]));
  const rows = sourceM3.purlins.map((purlin) => {
    const fastenerRow = fastenerRowsByLabel.get(purlin.label);
    if (!fastenerRow) throw new Error(`Missing toward-surface fastener partition audit for '${purlin.label}'.`);
    return rowResult(purlin, fastenerRow);
  });
  const sourcePressureAreaM2 = rows.reduce((sum, row) => sum + row.routed.sourcePressureAreaM2, 0);
  const normalForceKN = rows.reduce((sum, row) => sum + row.routed.normalForceKN, 0);
  sameNumber(sourcePressureAreaM2, sourceM3.appliedWind.areaM2, 'Roof Bay toward-surface area');
  sameNumber(normalForceKN, sourceM3.appliedWind.normalKN, 'Roof Bay toward-surface force');
  sameNumber(sourcePressureAreaM2, towardDemand.routed.areaM2, 'Roof Bay #137 toward-surface area');
  sameNumber(normalForceKN, towardDemand.routed.normalForceKN, 'Roof Bay #137 toward-surface force');

  const zoneTotals = sourceM3.zoneTotals.map((zone) => {
    const segments = rows.flatMap((row) => row.contactSegments.filter((segment) => segment.type === zone.type));
    const areaM2 = segments.reduce((sum, item) => sum + item.sourcePressureAreaM2, 0);
    const zoneForceKN = segments.reduce((sum, item) => sum + item.normalForceKN, 0);
    sameNumber(areaM2, zone.areaM2, `${zone.type}.area`);
    sameNumber(zoneForceKN, zone.normalForceKN, `${zone.type}.force`);
    return {
      type:zone.type,
      zoneNumber:zone.zoneNumber,
      sourcePressureAreaM2:areaM2,
      normalForceKN:zoneForceKN,
      segmentCount:segments.length,
      pass:true
    };
  });

  return {
    schemaVersion:ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING_SCHEMA,
    status:STATUS,
    upstreamRoofFastenerCodePressureDemandRouting:demand,
    supportContact:{
      designDirection:TOWARD,
      rows,
      zoneTotals,
      summary:{
        purlinCount:rows.length,
        supportSegmentCount:rows.reduce((sum, row) => sum + row.contactSegments.length, 0),
        sourcePressureAreaM2,
        normalForceKN,
        capacityStatus:'UNRESOLVED',
        utilization:null,
        roofSystemPass:null
      }
    },
    fastenerCompressionBoundary:{
      status:'NOT_MODELED_AS_AXIAL_SCREW_COMPRESSION',
      utilization:null,
      rule:FASTENER_RULE
    },
    implementation:{
      towardSurfaceSupportLineDemandImplemented:true,
      fastenerPartitionUsedOnlyForConservationAudit:true,
      screwAxialCompressionCapacityImplemented:false,
      localSheetContactFootprintImplemented:false,
      roofSheetPositivePressureCapacityImplemented:false,
      purlinLocalBearingWebCripplingCapacityImplemented:false,
      purlinMemberCapacityImplemented:false,
      purlinToRafterConnectionCapacityImplemented:false,
      utilizationImplemented:false,
      roofSystemPassPromotionImplemented:false
    },
    sourceBasis:{
      supportContactInterpretationSourceReference:nonEmpty(supportContactInterpretationSourceReference, 'supportContactInterpretationSourceReference'),
      routingRule:ROUTING_RULE,
      fastenerRule:FASTENER_RULE,
      contactRule:CONTACT_RULE
    },
    note:nullableText(note),
    boundary:BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    roofFastenerCodePressureDemandRouting:record.upstreamRoofFastenerCodePressureDemandRouting,
    supportContactInterpretationSourceReference:record.sourceBasis?.supportContactInterpretationSourceReference,
    note:record.note
  };
}

export function resolveRoofSheetPurlinSupportContactDemandRouting(input = {}) {
  const record = buildRecord(input);
  validateRoofSheetPurlinSupportContactDemandRouting(record);
  return clone(record);
}

export function validateRoofSheetPurlinSupportContactDemandRouting(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof-sheet purlin support-contact demand record must be an object.');
  if (record.schemaVersion !== ROOF_SHEET_PURLIN_SUPPORT_CONTACT_DEMAND_ROUTING_SCHEMA) throw new Error(`Unsupported roof-sheet purlin support-contact schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof-sheet purlin support-contact status changed.');
  if (record.sourceBasis?.routingRule !== ROUTING_RULE || record.sourceBasis?.fastenerRule !== FASTENER_RULE || record.sourceBasis?.contactRule !== CONTACT_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof-sheet purlin support-contact engineering boundary changed.');
  }
  const expectedImplementation = {
    towardSurfaceSupportLineDemandImplemented:true,
    fastenerPartitionUsedOnlyForConservationAudit:true,
    screwAxialCompressionCapacityImplemented:false,
    localSheetContactFootprintImplemented:false,
    roofSheetPositivePressureCapacityImplemented:false,
    purlinLocalBearingWebCripplingCapacityImplemented:false,
    purlinMemberCapacityImplemented:false,
    purlinToRafterConnectionCapacityImplemented:false,
    utilizationImplemented:false,
    roofSystemPassPromotionImplemented:false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof-sheet purlin support-contact record was improperly promoted beyond its implemented scope.');
  if (record.fastenerCompressionBoundary?.status !== 'NOT_MODELED_AS_AXIAL_SCREW_COMPRESSION' || record.fastenerCompressionBoundary?.utilization !== null) {
    throw new Error('Toward-surface fastener partition must not be promoted to screw axial-compression utilization.');
  }
  if (record.supportContact?.summary?.capacityStatus !== 'UNRESOLVED' || record.supportContact?.summary?.utilization !== null || record.supportContact?.summary?.roofSystemPass !== null) {
    throw new Error('Support-contact demand routing must not promote capacity, utilization or roof-system PASS.');
  }
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof-sheet purlin support-contact record no longer matches deterministic upstream toward-surface demand inputs.');
  return true;
}

export function serializeRoofSheetPurlinSupportContactDemandRouting(record) {
  validateRoofSheetPurlinSupportContactDemandRouting(record);
  return JSON.stringify(stable(record), null, 2);
}

export function parseRoofSheetPurlinSupportContactDemandRouting(json) {
  const parsed = JSON.parse(json);
  validateRoofSheetPurlinSupportContactDemandRouting(parsed);
  return clone(parsed);
}
