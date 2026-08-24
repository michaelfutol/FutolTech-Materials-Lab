import { validateRoofSheetFastenerLayoutAcceptance } from '../interchange/roofSheetFastenerLayoutAcceptance.js';
import { validateWindRoofBayCodePressureRouting } from './windRoofBayCodePressureRouting.js';

export const ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING_SCHEMA = 'futoltech.roof-fastener-code-pressure-demand-routing/1';

const STATUS = 'FASTENER_CODE_PRESSURE_DEMAND_ROUTED_CAPACITY_UNRESOLVED';
const DIRECTIONS = Object.freeze(['toward-surface', 'away-from-surface']);
const EPS = 1e-9;
const ROUTING_RULE = 'Each accepted roof-sheet fastener midpoint tributary rectangle is intersected with the exact verified M3 physical code-pressure pieces on the same purlin band. Each overlap contributes signed normal force F = pA to that fastener. A fastener may therefore carry multiple field/edge/corner contributions when its tributary rectangle crosses zone boundaries.';
const CONSERVATION_RULE = 'For each fastener, row, wind direction and complete Roof Bay, the sum of routed overlap areas must reproduce the accepted fastener tributary area and the sum of signed fastener forces must reproduce the source M3 code-pressure route within numerical tolerance. Zone totals must also reproduce the source M3 zone totals.';
const SIGN_RULE = 'Positive fastener normal demand acts toward the roof surface. Negative fastener normal demand acts away from the roof surface (suction). This slice preserves the source M3 directional design pressure and does not create a connection capacity or utilization ratio.';
const BOUNDARY = 'This record routes already-verified M3 directional Components & Cladding pressure demand into explicit roof-sheet fastener tributary rectangles. It does not calculate roof-sheet structural redistribution, screw pull-out, pull-over, bearing, washer action, group action, purlin local failure, factored connection capacity, utilization, or purlin-to-rafter connection capacity. The midpoint tributary assignment remains the explicit accepted routing assumption from the upstream fastener-layout record.';

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
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function sameNumber(left, right, label) {
  if (!nearlyEqual(left, right)) throw new Error(`${label} does not match the accepted physical demand geometry.`);
}

function intersection(left, right) {
  const x0M = Math.max(Number(left.x0M), Number(right.x0M));
  const x1M = Math.min(Number(left.x1M), Number(right.x1M));
  const y0M = Math.max(Number(left.y0M), Number(right.y0M));
  const y1M = Math.min(Number(left.y1M), Number(right.y1M));
  const widthAlongSpanM = Math.max(0, x1M - x0M);
  const widthUpslopeM = Math.max(0, y1M - y0M);
  return {
    x0M,
    x1M,
    y0M,
    y1M,
    widthAlongSpanM,
    widthUpslopeM,
    areaM2: widthAlongSpanM * widthUpslopeM
  };
}

function localPieceRectangle(piece) {
  return {
    x0M: finite(piece?.localSpanRangeM?.x0M, 'piece.localSpanRangeM.x0M'),
    x1M: finite(piece?.localSpanRangeM?.x1M, 'piece.localSpanRangeM.x1M'),
    y0M: finite(piece?.globalRectangle?.y0M, 'piece.globalRectangle.y0M'),
    y1M: finite(piece?.globalRectangle?.y1M, 'piece.globalRectangle.y1M')
  };
}

function validateRouteSet(records) {
  if (!Array.isArray(records) || records.length !== DIRECTIONS.length) {
    throw new Error('windRoofBayCodePressureRoutingRecords must contain exactly the toward-surface and away-from-surface M3 routes.');
  }
  records.forEach(validateWindRoofBayCodePressureRouting);
  const byDirection = new Map();
  for (const record of records) {
    if (byDirection.has(record.designDirection)) throw new Error(`Duplicate M3 code-pressure route for '${record.designDirection}'.`);
    byDirection.set(record.designDirection, record);
  }
  for (const direction of DIRECTIONS) {
    if (!byDirection.has(direction)) throw new Error(`Missing M3 code-pressure route for '${direction}'.`);
  }
  const first = byDirection.get(DIRECTIONS[0]);
  const second = byDirection.get(DIRECTIONS[1]);
  if (!sameRecord(first.geometry, second.geometry)) throw new Error('Toward/away M3 routes must reference the exact same Roof Bay geometry.');
  if (first.purlins.length !== second.purlins.length) throw new Error('Toward/away M3 routes must contain the same physical purlin rows.');
  for (let index = 0; index < first.purlins.length; index += 1) {
    const left = first.purlins[index];
    const right = second.purlins[index];
    if (left.label !== right.label) throw new Error('Toward/away M3 purlin identities differ.');
    for (const key of ['stationM', 'tributaryStartM', 'tributaryEndM', 'tributaryWidthM', 'actualLoadApplicationAreaM2']) {
      sameNumber(left[key], right[key], `${left.label}.${key}`);
    }
  }
  return { byDirection, reference:first };
}

function validateLayoutAgainstRoute(layout, route) {
  const geometry = layout.projectBasis.geometry;
  sameNumber(geometry.rafterSpacingM, route.geometry.spanM, 'Roof Bay span');
  sameNumber(geometry.roofSlopeLengthM, route.geometry.roofSlopeLengthM, 'Roof Bay slope length');
  sameNumber(layout.summary.roofBayAreaM2, route.geometry.roofBayAreaM2, 'Roof Bay area');
  if (layout.rows.length !== route.purlins.length) throw new Error('Fastener layout and M3 route do not contain the same purlin-row count.');
  const routeByLabel = new Map(route.purlins.map((item) => [item.label, item]));
  for (const row of layout.rows) {
    const source = routeByLabel.get(row.purlinLabel);
    if (!source) throw new Error(`Fastener row '${row.purlinLabel}' has no matching M3 pressure route.`);
    sameNumber(row.purlinStationM, source.stationM, `${row.purlinLabel}.stationM`);
    sameNumber(row.purlinTributaryBand.startM, source.tributaryStartM, `${row.purlinLabel}.tributaryStartM`);
    sameNumber(row.purlinTributaryBand.endM, source.tributaryEndM, `${row.purlinLabel}.tributaryEndM`);
    sameNumber(row.purlinTributaryBand.widthM, source.tributaryWidthM, `${row.purlinLabel}.tributaryWidthM`);
    sameNumber(row.conservation.expectedRowAreaM2, source.actualLoadApplicationAreaM2, `${row.purlinLabel}.rowAreaM2`);
  }
}

function routeOneDirection(layout, route) {
  const routeByLabel = new Map(route.purlins.map((item) => [item.label, item]));
  const rows = layout.rows.map((row) => {
    const sourcePurlin = routeByLabel.get(row.purlinLabel);
    const fasteners = row.fasteners.map((fastener) => {
      const contributions = [];
      for (const piece of sourcePurlin.pieceLoads) {
        const overlap = intersection(fastener.tributaryRectangle, localPieceRectangle(piece));
        if (!(overlap.areaM2 > EPS)) continue;
        const pressureKPa = finite(piece.designPressureKPa, `${piece.zoneCellId}.designPressureKPa`);
        contributions.push({
          contributionId:`${fastener.fastenerId}:${piece.zoneCellId}`,
          zoneCellId:piece.zoneCellId,
          zoneNumber:piece.zoneNumber,
          type:piece.type,
          sourcePieceIndex:piece.pieceIndex,
          overlapRectangle:overlap,
          overlapAreaM2:overlap.areaM2,
          designPressureKPa:pressureKPa,
          minimumPressureApplied:Boolean(piece.minimumPressureApplied),
          governingRawCase:clone(piece.governingRawCase),
          normalForceKN:pressureKPa * overlap.areaM2
        });
      }
      const routedAreaM2 = contributions.reduce((sum, item) => sum + item.overlapAreaM2, 0);
      const normalForceKN = contributions.reduce((sum, item) => sum + item.normalForceKN, 0);
      const areaResidualM2 = routedAreaM2 - fastener.tributaryRectangle.areaM2;
      if (!nearlyEqual(areaResidualM2, 0)) throw new Error(`Fastener '${fastener.fastenerId}' pressure-piece intersections do not cover its accepted tributary rectangle.`);
      return {
        fastenerId:fastener.fastenerId,
        purlinLabel:row.purlinLabel,
        xM:fastener.xM,
        yM:fastener.yM,
        tributaryRectangle:clone(fastener.tributaryRectangle),
        contributions,
        demand:{
          routedAreaM2,
          normalForceKN,
          capacityStatus:'UNRESOLVED',
          utilization:null
        },
        conservation:{
          areaResidualM2,
          tolerance:EPS,
          areaPass:nearlyEqual(areaResidualM2, 0)
        }
      };
    });
    const routedAreaM2 = fasteners.reduce((sum, item) => sum + item.demand.routedAreaM2, 0);
    const normalForceKN = fasteners.reduce((sum, item) => sum + item.demand.normalForceKN, 0);
    const areaResidualM2 = routedAreaM2 - sourcePurlin.routed.areaM2;
    const forceResidualKN = normalForceKN - sourcePurlin.routed.normalForceKN;
    if (!nearlyEqual(areaResidualM2, 0) || !nearlyEqual(forceResidualKN, 0)) {
      throw new Error(`Fastener demand routing for '${row.purlinLabel}' does not conserve the source M3 purlin area/force.`);
    }
    return {
      purlinLabel:row.purlinLabel,
      purlinStationM:row.purlinStationM,
      fasteners,
      sourceM3:{
        areaM2:sourcePurlin.routed.areaM2,
        normalForceKN:sourcePurlin.routed.normalForceKN
      },
      routed:{ routedAreaM2, normalForceKN },
      conservation:{
        areaResidualM2,
        forceResidualKN,
        tolerance:EPS,
        areaPass:nearlyEqual(areaResidualM2, 0),
        forcePass:nearlyEqual(forceResidualKN, 0),
        pass:nearlyEqual(areaResidualM2, 0) && nearlyEqual(forceResidualKN, 0)
      }
    };
  });

  const routedAreaM2 = rows.reduce((sum, row) => sum + row.routed.routedAreaM2, 0);
  const normalForceKN = rows.reduce((sum, row) => sum + row.routed.normalForceKN, 0);
  const areaResidualM2 = routedAreaM2 - route.appliedWind.areaM2;
  const forceResidualKN = normalForceKN - route.appliedWind.normalKN;

  const zoneTotals = route.zoneTotals.map((sourceZone) => {
    const contributions = rows.flatMap((row) => row.fasteners.flatMap((fastener) => fastener.contributions.filter((item) => item.type === sourceZone.type)));
    const areaM2 = contributions.reduce((sum, item) => sum + item.overlapAreaM2, 0);
    const normalForceKN = contributions.reduce((sum, item) => sum + item.normalForceKN, 0);
    const zoneAreaResidualM2 = areaM2 - sourceZone.areaM2;
    const zoneForceResidualKN = normalForceKN - sourceZone.normalForceKN;
    if (!nearlyEqual(zoneAreaResidualM2, 0) || !nearlyEqual(zoneForceResidualKN, 0)) {
      throw new Error(`Fastener demand routing does not conserve source M3 ${sourceZone.type} zone area/force.`);
    }
    return {
      type:sourceZone.type,
      zoneNumber:sourceZone.zoneNumber,
      sourceAreaM2:sourceZone.areaM2,
      sourceNormalForceKN:sourceZone.normalForceKN,
      routedAreaM2:areaM2,
      routedNormalForceKN:normalForceKN,
      areaResidualM2:zoneAreaResidualM2,
      forceResidualKN:zoneForceResidualKN,
      pass:true
    };
  });

  if (!rows.every((row) => row.conservation.pass) || !zoneTotals.every((zone) => zone.pass) || !nearlyEqual(areaResidualM2, 0) || !nearlyEqual(forceResidualKN, 0)) {
    throw new Error(`Fastener demand routing failed ${route.designDirection} Roof Bay conservation.`);
  }

  return {
    designDirection:route.designDirection,
    sourceM3RouteSchemaVersion:route.schemaVersion,
    rows,
    zoneTotals,
    routed:{ areaM2:routedAreaM2, normalForceKN },
    sourceM3:{ areaM2:route.appliedWind.areaM2, normalForceKN:route.appliedWind.normalKN },
    conservation:{
      areaResidualM2,
      forceResidualKN,
      tolerance:EPS,
      allRowsPass:rows.every((row) => row.conservation.pass),
      allZonesPass:zoneTotals.every((zone) => zone.pass),
      pass:rows.every((row) => row.conservation.pass) && zoneTotals.every((zone) => zone.pass) && nearlyEqual(areaResidualM2, 0) && nearlyEqual(forceResidualKN, 0)
    }
  };
}

function buildRecord({ roofSheetFastenerLayoutAcceptance, windRoofBayCodePressureRoutingRecords, pressureToFastenerRoutingSourceReference, note = null } = {}) {
  const layout = clone(roofSheetFastenerLayoutAcceptance);
  validateRoofSheetFastenerLayoutAcceptance(layout);
  const routes = clone(windRoofBayCodePressureRoutingRecords);
  const { byDirection, reference } = validateRouteSet(routes);
  validateLayoutAgainstRoute(layout, reference);

  const directionResults = DIRECTIONS.map((direction) => routeOneDirection(layout, byDirection.get(direction)));
  return {
    schemaVersion:ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING_SCHEMA,
    status:STATUS,
    projectBasis:clone(layout.projectBasis),
    fastenerSystem:clone(layout.fastenerSystem),
    upstreamRoofSheetFastenerLayoutAcceptance:layout,
    upstreamWindRoofBayCodePressureRoutingRecords:routes,
    directions:directionResults,
    sourceBasis:{
      pressureToFastenerRoutingSourceReference:nonEmpty(pressureToFastenerRoutingSourceReference, 'pressureToFastenerRoutingSourceReference'),
      upstreamAreaShareRoutingAssumptionSourceReference:layout.sourceBasis.areaShareRoutingAssumptionSourceReference,
      routingRule:ROUTING_RULE,
      conservationRule:CONSERVATION_RULE,
      signRule:SIGN_RULE
    },
    implementation:{
      explicitFastenerGeometryAccepted:true,
      codePressureToFastenerDemandRoutingImplemented:true,
      bothWindDirectionsPreserved:true,
      fastenerAreaConservationImplemented:true,
      fastenerForceConservationImplemented:true,
      zoneDemandIdentityPreserved:true,
      roofSheetStructuralRedistributionImplemented:false,
      screwPullOutCapacityImplemented:false,
      screwPullOverCapacityImplemented:false,
      screwBearingCapacityImplemented:false,
      fastenerGroupCapacityImplemented:false,
      purlinLocalFastenerCapacityImplemented:false,
      purlinToRafterConnectionCapacityImplemented:false,
      utilizationImplemented:false
    },
    loadPath:['verified M3 directional zone pressure pieces', 'accepted roof-sheet fastener tributary rectangles', 'individual signed fastener normal demand', 'capacity unresolved'],
    note:note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary:BOUNDARY
  };
}

export function resolveRoofFastenerCodePressureDemandRouting(input = {}) {
  const record = buildRecord(input);
  validateRoofFastenerCodePressureDemandRouting(record);
  return clone(record);
}

export function validateRoofFastenerCodePressureDemandRouting(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof fastener code-pressure demand-routing record must be an object.');
  if (record.schemaVersion !== ROOF_FASTENER_CODE_PRESSURE_DEMAND_ROUTING_SCHEMA) throw new Error(`Unsupported roof fastener demand-routing schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof fastener demand-routing status changed.');
  validateRoofSheetFastenerLayoutAcceptance(record.upstreamRoofSheetFastenerLayoutAcceptance);
  if (record.fastenerSystem?.capacityStatus !== 'UNRESOLVED') throw new Error('Roof fastener capacity must remain UNRESOLVED in the demand-routing slice.');
  nonEmpty(record.sourceBasis?.pressureToFastenerRoutingSourceReference, 'sourceBasis.pressureToFastenerRoutingSourceReference');
  nonEmpty(record.sourceBasis?.upstreamAreaShareRoutingAssumptionSourceReference, 'sourceBasis.upstreamAreaShareRoutingAssumptionSourceReference');
  if (record.sourceBasis?.routingRule !== ROUTING_RULE || record.sourceBasis?.conservationRule !== CONSERVATION_RULE || record.sourceBasis?.signRule !== SIGN_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof fastener demand-routing engineering boundary changed.');
  }
  const expectedImplementation = {
    explicitFastenerGeometryAccepted:true,
    codePressureToFastenerDemandRoutingImplemented:true,
    bothWindDirectionsPreserved:true,
    fastenerAreaConservationImplemented:true,
    fastenerForceConservationImplemented:true,
    zoneDemandIdentityPreserved:true,
    roofSheetStructuralRedistributionImplemented:false,
    screwPullOutCapacityImplemented:false,
    screwPullOverCapacityImplemented:false,
    screwBearingCapacityImplemented:false,
    fastenerGroupCapacityImplemented:false,
    purlinLocalFastenerCapacityImplemented:false,
    purlinToRafterConnectionCapacityImplemented:false,
    utilizationImplemented:false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof fastener demand-routing record was improperly promoted beyond demand routing.');
  const rebuilt = buildRecord({
    roofSheetFastenerLayoutAcceptance:record.upstreamRoofSheetFastenerLayoutAcceptance,
    windRoofBayCodePressureRoutingRecords:record.upstreamWindRoofBayCodePressureRoutingRecords,
    pressureToFastenerRoutingSourceReference:record.sourceBasis.pressureToFastenerRoutingSourceReference,
    note:record.note
  });
  if (!sameRecord(record, rebuilt)) throw new Error('Roof fastener demand-routing record changed from its deterministic upstream geometry/pressure inputs.');
  return true;
}

export function serializeRoofFastenerCodePressureDemandRouting(record) {
  validateRoofFastenerCodePressureDemandRouting(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofFastenerCodePressureDemandRouting(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofFastenerCodePressureDemandRouting(parsed);
  return clone(parsed);
}
