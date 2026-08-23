import { validateWindRoofNetPressure } from './windRoofNetPressure.js';

export const WIND_ROOF_BAY_CODE_PRESSURE_ROUTING_SCHEMA = 'futoltech.wind-roof-bay-code-pressure-routing/1';

const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const TARGET_CLASS = 'roof-purlin';
const STATUS = 'ROOF_BAY_CODE_WIND_ROUTED_LOAD_COMBINATIONS_AND_CAPACITY_BLOCKED';
const DIRECTIONS = Object.freeze(['toward-surface', 'away-from-surface']);
const EPS = 1e-9;
const ROUTING_RULE = 'For each physical Roof Bay purlin tributary-band zone piece, apply the selected code-derived directional design pressure to the exact roof-surface intersection rectangle. Convert pressure to a piecewise purlin line load using the piece tributary width, then resolve simply-supported Rafter A/B reactions from the true spanwise resultant location.';
const CONSERVATION_RULE = 'For every purlin and for the complete Roof Bay: pressure × physical zone-piece area must equal routed wind force; Rafter A + Rafter B reactions must equal that force; and reaction moment about Rafter A must equal the applied piece-load moment within numerical tolerance.';
const SIGN_RULE = 'Positive normal force acts toward the roof surface. Negative normal force acts away from the roof surface (suction). Roof-downslope wind force is zero in this routing slice.';
const BOUNDARY = 'This record routes one selected directional code-wind envelope through the physical Roof Bay geometry and proves force/reaction/moment conservation. It does not create strength/service load combinations, replace the live manual-uniform Roof Bay UI path, solve purlin stress/deflection under piecewise code pressure, rate purlin/rafter/connection capacity, or resolve roof-sheet/fastener effective wind area.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function direction(value) {
  const normalized = nonEmpty(value, 'designDirection').toLowerCase();
  if (!DIRECTIONS.includes(normalized)) throw new Error(`designDirection must be one of: ${DIRECTIONS.join(', ')}.`);
  return normalized;
}

function zoneGeometryFromNetPressure(record) {
  return record.upstreamWindRoofExternalPressureTerm?.upstreamWindRoofExternalGcp?.upstreamWindRoofZoneGeometry;
}

function targetBandLabel(record) {
  return nonEmpty(record.target?.purlinBandLabel, 'windRoofNetPressure.target.purlinBandLabel');
}

function rectangleIntersection(left, right) {
  const x0M = Math.max(Number(left.x0M), Number(right.x0M));
  const x1M = Math.min(Number(left.x1M), Number(right.x1M));
  const y0M = Math.max(Number(left.y0M), Number(right.y0M));
  const y1M = Math.min(Number(left.y1M), Number(right.y1M));
  const widthM = Math.max(0, x1M - x0M);
  const tributaryWidthM = Math.max(0, y1M - y0M);
  return { x0M, x1M, y0M, y1M, widthM, tributaryWidthM, areaM2: widthM * tributaryWidthM };
}

function envelopeForDirection(zoneCase, selectedDirection) {
  if (selectedDirection === 'toward-surface') return zoneCase.governingDesignEnvelope?.towardSurface;
  return zoneCase.governingDesignEnvelope?.awayFromSurface;
}

function governingRawCase(zoneCase, selectedDirection) {
  const envelope = envelopeForDirection(zoneCase, selectedDirection);
  const target = finite(envelope?.rawGoverningPressureKPa, 'governingDesignEnvelope.rawGoverningPressureKPa');
  const candidates = zoneCase.rawCases.filter((item) => nearlyEqual(item.rawNetPressureKPa, target));
  if (!candidates.length) throw new Error(`No raw pressure case reproduces the governing ${selectedDirection} pressure for zone '${zoneCase.type}'.`);
  return [...candidates].sort((a, b) => String(a.caseId).localeCompare(String(b.caseId)))[0];
}

function validateRecordSet(records) {
  if (!Array.isArray(records) || records.length < 1) throw new Error('windRoofNetPressureRecords must contain at least one net-pressure record.');
  records.forEach(validateWindRoofNetPressure);
  const first = records[0];
  if (first.adoptedCodeProfileId !== CODE_PROFILE || first.designProcedure !== PROCEDURE || first.target?.class !== TARGET_CLASS) {
    throw new Error('Roof Bay code-pressure routing requires the supported roof-purlin Components & Cladding net-pressure records.');
  }
  const zones = zoneGeometryFromNetPressure(first);
  if (!zones) throw new Error('Net-pressure record does not carry the upstream Roof Bay zone geometry.');
  for (const record of records.slice(1)) {
    if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE || record.target?.class !== TARGET_CLASS) {
      throw new Error('All Roof Bay net-pressure records must use the same supported profile/procedure/target.');
    }
    if (!sameRecord(zoneGeometryFromNetPressure(record), zones)) {
      throw new Error('All Roof Bay net-pressure records must reference the exact same roof-zone geometry record.');
    }
  }

  const byLabel = new Map();
  for (const record of records) {
    const label = targetBandLabel(record);
    if (byLabel.has(label)) throw new Error(`Duplicate net-pressure record for purlin band '${label}'.`);
    byLabel.set(label, record);
  }
  const expectedLabels = zones.purlinTributaryBandIntersections.map((band) => band.label);
  const missing = expectedLabels.filter((label) => !byLabel.has(label));
  const extra = [...byLabel.keys()].filter((label) => !expectedLabels.includes(label));
  if (missing.length || extra.length || byLabel.size !== expectedLabels.length) {
    throw new Error(`Roof Bay routing requires exactly one net-pressure record for every physical purlin tributary band. Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}.`);
  }
  return { zones: clone(zones), byLabel };
}

function buildRecord({ windRoofNetPressureRecords, designDirection, routingMethodSourceReference, note = null } = {}) {
  const selectedDirection = direction(designDirection);
  const records = clone(windRoofNetPressureRecords);
  const { zones, byLabel } = validateRecordSet(records);
  const bayStartM = finite(zones.roofPlaneRegistration?.bayStartAlongRidgeM, 'roofPlaneRegistration.bayStartAlongRidgeM');
  const bayEndM = finite(zones.roofPlaneRegistration?.bayEndAlongRidgeM, 'roofPlaneRegistration.bayEndAlongRidgeM');
  const spanM = finite(zones.roofPlaneRegistration?.baySpanM, 'roofPlaneRegistration.baySpanM');
  if (!(spanM > 0) || !nearlyEqual(bayEndM - bayStartM, spanM)) throw new Error('Registered Roof Bay span is invalid for code-pressure routing.');

  const cellById = new Map(zones.zones.cells.map((cell) => [cell.id, cell]));
  const purlins = zones.purlinTributaryBandIntersections.map((band) => {
    const net = byLabel.get(band.label);
    const zoneCaseByType = new Map(net.zoneCases.map((zoneCase) => [zoneCase.type, zoneCase]));
    for (const type of ['field', 'edge', 'corner']) {
      const expectedArea = Number(band.zoneAreasM2?.[type] ?? 0);
      const zoneCase = zoneCaseByType.get(type);
      if (expectedArea > EPS && !zoneCase) throw new Error(`Net-pressure record for '${band.label}' is missing active ${type} pressure.`);
      if (zoneCase && !nearlyEqual(zoneCase.actualZoneIntersectionAreaM2, expectedArea)) {
        throw new Error(`Net-pressure ${type} area for '${band.label}' does not match physical Roof Bay geometry.`);
      }
    }

    const pieceLoads = band.pieces.map((piece, pieceIndex) => {
      const cell = cellById.get(piece.zoneCellId);
      if (!cell) throw new Error(`Zone cell '${piece.zoneCellId}' required by '${band.label}' was not found.`);
      if (cell.type !== piece.type || cell.zoneNumber !== piece.zoneNumber) throw new Error(`Zone identity changed for '${piece.zoneCellId}'.`);
      const rectangle = rectangleIntersection(band.globalRoofSurfaceRectangle, cell);
      if (!(rectangle.areaM2 > EPS) || !nearlyEqual(rectangle.areaM2, piece.areaM2)) {
        throw new Error(`Physical intersection rectangle changed for '${band.label}' piece '${piece.zoneCellId}'.`);
      }
      const zoneCase = zoneCaseByType.get(piece.type);
      if (!zoneCase) throw new Error(`Missing net pressure for active '${piece.type}' piece in '${band.label}'.`);
      const envelope = envelopeForDirection(zoneCase, selectedDirection);
      const designPressureKPa = finite(envelope?.designPressureKPa, 'governingDesignEnvelope.designPressureKPa');
      if (selectedDirection === 'toward-surface' && !(designPressureKPa > 0)) throw new Error('Toward-surface design pressure must be positive.');
      if (selectedDirection === 'away-from-surface' && !(designPressureKPa < 0)) throw new Error('Away-from-surface design pressure must be negative.');
      const rawCase = governingRawCase(zoneCase, selectedDirection);
      const localX0M = rectangle.x0M - bayStartM;
      const localX1M = rectangle.x1M - bayStartM;
      const centroidLocalXM = (localX0M + localX1M) / 2;
      if (localX0M < -EPS || localX1M > spanM + EPS || centroidLocalXM < -EPS || centroidLocalXM > spanM + EPS) {
        throw new Error(`Piece '${piece.zoneCellId}' lies outside the registered purlin span.`);
      }
      const normalForceKN = designPressureKPa * rectangle.areaM2;
      const leftRafterReactionKN = normalForceKN * (spanM - centroidLocalXM) / spanM;
      const rightRafterReactionKN = normalForceKN * centroidLocalXM / spanM;
      const appliedMomentAboutRafterAKNm = normalForceKN * centroidLocalXM;
      return {
        pieceIndex,
        zoneCellId: piece.zoneCellId,
        zoneNumber: piece.zoneNumber,
        type: piece.type,
        globalRectangle: rectangle,
        localSpanRangeM: { x0M: localX0M, x1M: localX1M },
        spanwiseCentroidM: centroidLocalXM,
        actualAreaM2: rectangle.areaM2,
        designPressureKPa,
        minimumPressureApplied: envelope.minimumApplied,
        governingRawCase: {
          caseId: rawCase.caseId,
          externalCaseId: rawCase.externalCaseId,
          internalCaseIndex: rawCase.internalCaseIndex,
          GCp: rawCase.GCp,
          GCpi: rawCase.GCpi,
          qhKPa: rawCase.qhKPa,
          rawNetPressureKPa: rawCase.rawNetPressureKPa
        },
        piecewiseLineLoadKNM: designPressureKPa * rectangle.tributaryWidthM,
        normalForceKN,
        leftRafterReactionKN,
        rightRafterReactionKN,
        appliedMomentAboutRafterAKNm
      };
    });

    const areaM2 = pieceLoads.reduce((sum, item) => sum + item.actualAreaM2, 0);
    const normalForceKN = pieceLoads.reduce((sum, item) => sum + item.normalForceKN, 0);
    const leftRafterReactionKN = pieceLoads.reduce((sum, item) => sum + item.leftRafterReactionKN, 0);
    const rightRafterReactionKN = pieceLoads.reduce((sum, item) => sum + item.rightRafterReactionKN, 0);
    const appliedMomentAboutRafterAKNm = pieceLoads.reduce((sum, item) => sum + item.appliedMomentAboutRafterAKNm, 0);
    const reactionMomentAboutRafterAKNm = rightRafterReactionKN * spanM;
    const forceResidualKN = leftRafterReactionKN + rightRafterReactionKN - normalForceKN;
    const momentResidualKNm = reactionMomentAboutRafterAKNm - appliedMomentAboutRafterAKNm;
    const areaResidualM2 = areaM2 - band.actualLoadApplicationAreaM2;
    return {
      label: band.label,
      stationM: band.stationM,
      tributaryStartM: band.startM,
      tributaryEndM: band.endM,
      tributaryWidthM: band.widthM,
      actualLoadApplicationAreaM2: band.actualLoadApplicationAreaM2,
      netPressureSchemaVersion: net.schemaVersion,
      pieceLoads,
      routed: {
        areaM2,
        normalForceKN,
        parallelForceKN: 0,
        leftRafterReactionKN,
        rightRafterReactionKN,
        appliedMomentAboutRafterAKNm,
        reactionMomentAboutRafterAKNm
      },
      conservation: {
        areaResidualM2,
        forceResidualKN,
        momentResidualKNm,
        tolerance: EPS,
        areaPass: nearlyEqual(areaResidualM2, 0),
        forcePass: nearlyEqual(forceResidualKN, 0),
        momentPass: nearlyEqual(momentResidualKNm, 0),
        pass: nearlyEqual(areaResidualM2, 0) && nearlyEqual(forceResidualKN, 0) && nearlyEqual(momentResidualKNm, 0)
      }
    };
  });

  const totalAreaM2 = purlins.reduce((sum, purlin) => sum + purlin.routed.areaM2, 0);
  const totalNormalForceKN = purlins.reduce((sum, purlin) => sum + purlin.routed.normalForceKN, 0);
  const totalLeftReactionKN = purlins.reduce((sum, purlin) => sum + purlin.routed.leftRafterReactionKN, 0);
  const totalRightReactionKN = purlins.reduce((sum, purlin) => sum + purlin.routed.rightRafterReactionKN, 0);
  const appliedMomentAboutRafterAKNm = purlins.reduce((sum, purlin) => sum + purlin.routed.appliedMomentAboutRafterAKNm, 0);
  const reactionMomentAboutRafterAKNm = totalRightReactionKN * spanM;
  const areaResidualM2 = totalAreaM2 - zones.roofBayConservation.roofBayAreaM2;
  const forceResidualKN = totalLeftReactionKN + totalRightReactionKN - totalNormalForceKN;
  const momentResidualKNm = reactionMomentAboutRafterAKNm - appliedMomentAboutRafterAKNm;
  const allPurlinsPass = purlins.every((purlin) => purlin.conservation.pass);

  const zoneTotals = ['field', 'edge', 'corner'].map((type) => {
    const pieces = purlins.flatMap((purlin) => purlin.pieceLoads.filter((piece) => piece.type === type));
    return {
      type,
      zoneNumber: type === 'field' ? 1 : type === 'edge' ? 2 : 3,
      areaM2: pieces.reduce((sum, item) => sum + item.actualAreaM2, 0),
      normalForceKN: pieces.reduce((sum, item) => sum + item.normalForceKN, 0),
      pieceCount: pieces.length
    };
  }).filter((item) => item.pieceCount > 0);

  return {
    schemaVersion: WIND_ROOF_BAY_CODE_PRESSURE_ROUTING_SCHEMA,
    status: STATUS,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: {
      class: 'roof-bay-purlin-system',
      sourceTargetClass: TARGET_CLASS,
      roofPlane: zones.roofPlaneRegistration.roofPlane
    },
    designDirection: selectedDirection,
    upstreamWindRoofNetPressureRecords: records,
    upstreamWindRoofZoneGeometry: zones,
    geometry: {
      bayStartAlongRidgeM: bayStartM,
      bayEndAlongRidgeM: bayEndM,
      spanM,
      roofSlopeLengthM: zones.roofPlaneRegistration.roofSlopeLengthM,
      roofBayAreaM2: zones.roofBayConservation.roofBayAreaM2,
      coordinateFrame: clone(zones.wholeRoofGeometry.coordinateFrame)
    },
    purlins,
    zoneTotals,
    rafters: {
      a: {
        label: 'Rafter A',
        localSpanStationM: 0,
        pointLoads: purlins.map((purlin) => ({ purlinBandLabel: purlin.label, purlinStationM: purlin.stationM, normalKN: purlin.routed.leftRafterReactionKN, parallelKN: 0 })),
        normalKN: totalLeftReactionKN,
        parallelKN: 0
      },
      b: {
        label: 'Rafter B',
        localSpanStationM: spanM,
        pointLoads: purlins.map((purlin) => ({ purlinBandLabel: purlin.label, purlinStationM: purlin.stationM, normalKN: purlin.routed.rightRafterReactionKN, parallelKN: 0 })),
        normalKN: totalRightReactionKN,
        parallelKN: 0
      }
    },
    appliedWind: {
      areaM2: totalAreaM2,
      normalKN: totalNormalForceKN,
      parallelKN: 0,
      appliedMomentAboutRafterAKNm
    },
    equilibrium: {
      reactionNormalKN: totalLeftReactionKN + totalRightReactionKN,
      reactionParallelKN: 0,
      reactionMomentAboutRafterAKNm,
      areaResidualM2,
      normalForceResidualKN: forceResidualKN,
      parallelForceResidualKN: 0,
      momentResidualKNm,
      tolerance: EPS,
      allPurlinsPass,
      pass: allPurlinsPass && nearlyEqual(areaResidualM2, 0) && nearlyEqual(forceResidualKN, 0) && nearlyEqual(momentResidualKNm, 0)
    },
    sourceBasis: {
      routingMethodSourceReference: nonEmpty(routingMethodSourceReference, 'routingMethodSourceReference'),
      routingRule: ROUTING_RULE,
      conservationRule: CONSERVATION_RULE,
      signRule: SIGN_RULE
    },
    implementation: {
      codeDerivedRoofPressureImplemented: true,
      physicalZonePieceRoutingImplemented: true,
      piecewisePurlinLineLoadImplemented: true,
      roofBayCodePressureRoutingImplemented: true,
      forceConservationImplemented: true,
      reactionConservationImplemented: true,
      momentConservationImplemented: true,
      governingCaseIdentityPreserved: true,
      loadCombinationsImplemented: false,
      roofBayManualUniformUiReplaced: false,
      piecewisePurlinMemberResponseImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      purlinCapacityPromotionImplemented: false,
      rafterCapacityImplemented: false,
      connectionCapacityImplemented: false
    },
    loadPath: ['code-derived directional zone pressure', 'physical zone-piece area', 'piecewise purlin line load', 'Rafter A/B reactions from true spanwise centroid', 'supporting system (not analyzed here)'],
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

export function resolveWindRoofBayCodePressureRouting(input = {}) {
  const record = buildRecord(input);
  validateWindRoofBayCodePressureRouting(record);
  return clone(record);
}

export function validateWindRoofBayCodePressureRouting(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof Bay code-pressure routing record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_BAY_CODE_PRESSURE_ROUTING_SCHEMA) throw new Error(`Unsupported Roof Bay code-pressure routing schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof Bay code-pressure routing status changed.');
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) throw new Error('Roof Bay code-pressure routing profile/procedure changed.');
  if (record.target?.class !== 'roof-bay-purlin-system' || record.target?.sourceTargetClass !== TARGET_CLASS) throw new Error('Roof Bay code-pressure routing target changed.');
  if (!DIRECTIONS.includes(record.designDirection)) throw new Error('Roof Bay code-pressure routing direction changed.');
  nonEmpty(record.sourceBasis?.routingMethodSourceReference, 'sourceBasis.routingMethodSourceReference');
  if (record.sourceBasis?.routingRule !== ROUTING_RULE || record.sourceBasis?.conservationRule !== CONSERVATION_RULE || record.sourceBasis?.signRule !== SIGN_RULE) throw new Error('Roof Bay routing/conservation source rules changed.');
  if (record.boundary !== BOUNDARY) throw new Error('Roof Bay code-pressure routing engineering boundary changed.');

  const rebuilt = buildRecord({
    windRoofNetPressureRecords: record.upstreamWindRoofNetPressureRecords,
    designDirection: record.designDirection,
    routingMethodSourceReference: record.sourceBasis.routingMethodSourceReference,
    note: record.note
  });
  if (!sameRecord(record, rebuilt)) throw new Error('Roof Bay code-pressure routing record changed from its deterministic upstream net-pressure/geometry/source inputs.');
  return true;
}

export function serializeWindRoofBayCodePressureRouting(record) {
  validateWindRoofBayCodePressureRouting(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofBayCodePressureRouting(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofBayCodePressureRouting(parsed);
  return clone(parsed);
}
