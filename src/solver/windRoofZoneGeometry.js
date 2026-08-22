import { validateWindPressureContextAcceptance } from '../interchange/windPressureContextAcceptance.js';

export const WIND_ROOF_ZONE_GEOMETRY_SCHEMA = 'futoltech.wind-roof-zone-geometry/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const DESIGN_PROCEDURE = 'components-and-cladding';
const SUPPORTED_RIDGE_AXES = Object.freeze(['plan-length', 'plan-width']);
const SUPPORTED_ROOF_PLANES = Object.freeze(['slope-a', 'slope-b']);
const SUPPORTED_HEIGHT_TYPES = Object.freeze(['mean-roof-height', 'eave-height']);
const EPS = 1e-9;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0)) throw new Error(`${label} must be a positive finite number.`);
  return number;
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
  return number;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function oneOf(value, label, allowed) {
  const normalized = nonEmpty(value, label).toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of ${allowed.join(', ')}.`);
  return normalized;
}

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uniqueSorted(values) {
  return [...values]
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > EPS);
}

function selectFigureId(slopeDeg) {
  if (!(slopeDeg > 7 && slopeDeg <= 45)) {
    throw new Error('This M3 gable-roof zoning slice supports only 7° < roofSlopeDeg <= 45°.');
  }
  return slopeDeg <= 27 ? '207E.4-2B' : '207E.4-2C';
}

function roofAxes(roofGeometry, ridgeParallelPlanDimension) {
  if (ridgeParallelPlanDimension === 'plan-length') {
    return {
      ridgeLengthM: roofGeometry.planLengthM,
      transverseWidthM: roofGeometry.planWidthM,
      ridgeAxisSourceField: 'planLengthM',
      transverseSourceField: 'planWidthM'
    };
  }
  return {
    ridgeLengthM: roofGeometry.planWidthM,
    transverseWidthM: roofGeometry.planLengthM,
    ridgeAxisSourceField: 'planWidthM',
    transverseSourceField: 'planLengthM'
  };
}

function resolveHeightForA({ slopeDeg, meanRoofHeightM, edgeDimensionHeightType, edgeDimensionHeightM }) {
  const heightType = oneOf(edgeDimensionHeightType, 'edgeDimensionHeightType', SUPPORTED_HEIGHT_TYPES);
  const heightM = positive(edgeDimensionHeightM, 'edgeDimensionHeightM');
  if (slopeDeg <= 10) {
    if (heightType !== 'eave-height') {
      throw new Error('For roofSlopeDeg <= 10°, edge dimension a requires a source-referenced eave height in this zoning slice.');
    }
  } else {
    if (heightType !== 'mean-roof-height') {
      throw new Error('For roofSlopeDeg > 10°, edge dimension a must use the accepted mean roof height in this zoning slice.');
    }
    if (!nearlyEqual(heightM, meanRoofHeightM)) {
      throw new Error('edgeDimensionHeightM must match the accepted mean roof height for roofSlopeDeg > 10°.');
    }
  }
  return { heightType, heightM };
}

function resolveEdgeDimensionA(leastHorizontalDimensionM, referenceHeightM) {
  const tenPercentLeastM = 0.10 * leastHorizontalDimensionM;
  const fortyPercentHeightM = 0.40 * referenceHeightM;
  const fourPercentLeastM = 0.04 * leastHorizontalDimensionM;
  const absoluteMinimumM = 0.9;
  const upperSelectionM = Math.min(tenPercentLeastM, fortyPercentHeightM);
  const lowerBoundM = Math.max(fourPercentLeastM, absoluteMinimumM);
  const aM = Math.max(upperSelectionM, lowerBoundM);
  return {
    tenPercentLeastM,
    fortyPercentHeightM,
    fourPercentLeastM,
    absoluteMinimumM,
    upperSelectionM,
    lowerBoundM,
    aM
  };
}

function normalizeBands(purlinTributaryBands, roofSlopeLengthM) {
  if (!Array.isArray(purlinTributaryBands) || purlinTributaryBands.length < 1) {
    throw new Error('purlinTributaryBands must contain at least one Roof Bay tributary band.');
  }
  const bands = purlinTributaryBands.map((band, index) => {
    const startM = finite(band?.startM, `purlinTributaryBands[${index}].startM`);
    const endM = finite(band?.endM, `purlinTributaryBands[${index}].endM`);
    if (!(endM > startM + EPS)) throw new Error(`purlinTributaryBands[${index}] must have endM > startM.`);
    if (startM < -EPS || endM > roofSlopeLengthM + EPS) throw new Error(`purlinTributaryBands[${index}] lies outside the accepted roof slope.`);
    return {
      index,
      label: nonEmpty(band?.label ?? `P${index + 1}`, `purlinTributaryBands[${index}].label`),
      stationM: band?.stationM == null ? null : finite(band.stationM, `purlinTributaryBands[${index}].stationM`),
      startM: clamp(startM, 0, roofSlopeLengthM),
      endM: clamp(endM, 0, roofSlopeLengthM),
      widthM: endM - startM
    };
  });
  const labels = new Set(bands.map((band) => band.label));
  if (labels.size !== bands.length) throw new Error('purlinTributaryBands labels must be unique.');
  if (!nearlyEqual(bands[0].startM, 0)) throw new Error('purlinTributaryBands must start at the eave boundary y=0.');
  if (!nearlyEqual(bands[bands.length - 1].endM, roofSlopeLengthM)) throw new Error('purlinTributaryBands must end at the ridge boundary.');
  for (let index = 1; index < bands.length; index += 1) {
    if (!nearlyEqual(bands[index].startM, bands[index - 1].endM)) {
      throw new Error('purlinTributaryBands must form a contiguous, non-overlapping partition of the Roof Bay slope.');
    }
  }
  return bands;
}

function classifyCell(xMidM, yMidM, ridgeLengthM, aM, aSurfaceUpslopeM) {
  const nearGableEnd = xMidM < aM - EPS || xMidM > ridgeLengthM - aM + EPS;
  const nearEave = yMidM < aSurfaceUpslopeM - EPS;
  if (nearGableEnd && nearEave) return 'corner';
  if (nearGableEnd || nearEave) return 'edge';
  return 'field';
}

function createZoneCells(ridgeLengthM, roofSlopeLengthM, aM, aSurfaceUpslopeM) {
  const xCuts = uniqueSorted([0, clamp(aM, 0, ridgeLengthM), clamp(ridgeLengthM - aM, 0, ridgeLengthM), ridgeLengthM]);
  const yCuts = uniqueSorted([0, clamp(aSurfaceUpslopeM, 0, roofSlopeLengthM), roofSlopeLengthM]);
  const cells = [];
  let sequence = 0;
  for (let xi = 0; xi < xCuts.length - 1; xi += 1) {
    for (let yi = 0; yi < yCuts.length - 1; yi += 1) {
      const x0M = xCuts[xi];
      const x1M = xCuts[xi + 1];
      const y0M = yCuts[yi];
      const y1M = yCuts[yi + 1];
      if (!(x1M > x0M + EPS) || !(y1M > y0M + EPS)) continue;
      const type = classifyCell((x0M + x1M) / 2, (y0M + y1M) / 2, ridgeLengthM, aM, aSurfaceUpslopeM);
      sequence += 1;
      cells.push({
        id: `Z${type === 'field' ? '1' : type === 'edge' ? '2' : '3'}-${sequence}`,
        zoneNumber: type === 'field' ? 1 : type === 'edge' ? 2 : 3,
        type,
        x0M,
        x1M,
        y0M,
        y1M,
        areaM2: (x1M - x0M) * (y1M - y0M)
      });
    }
  }
  return cells;
}

function rectangleIntersectionArea(left, right) {
  const width = Math.max(0, Math.min(left.x1M, right.x1M) - Math.max(left.x0M, right.x0M));
  const height = Math.max(0, Math.min(left.y1M, right.y1M) - Math.max(left.y0M, right.y0M));
  return width * height;
}

function bandIntersections(bands, cells, bayStartM, bayEndM) {
  return bands.map((band) => {
    const rectangle = { x0M: bayStartM, x1M: bayEndM, y0M: band.startM, y1M: band.endM };
    const byZone = { field: 0, edge: 0, corner: 0 };
    const pieces = [];
    for (const cell of cells) {
      const areaM2 = rectangleIntersectionArea(rectangle, cell);
      if (areaM2 <= EPS) continue;
      byZone[cell.type] += areaM2;
      pieces.push({ zoneCellId: cell.id, zoneNumber: cell.zoneNumber, type: cell.type, areaM2 });
    }
    const totalAreaM2 = (bayEndM - bayStartM) * (band.endM - band.startM);
    const intersectedAreaM2 = byZone.field + byZone.edge + byZone.corner;
    return {
      ...band,
      globalRoofSurfaceRectangle: rectangle,
      actualLoadApplicationAreaM2: totalAreaM2,
      zoneAreasM2: byZone,
      pieces,
      conservation: {
        intersectedAreaM2,
        residualM2: intersectedAreaM2 - totalAreaM2,
        pass: nearlyEqual(intersectedAreaM2, totalAreaM2)
      }
    };
  });
}

export function resolveWindRoofZoneGeometry({
  windPressureContextAcceptance,
  ridgeParallelPlanDimension,
  ridgeDirectionSourceReference,
  symmetricGableConfirmed,
  symmetricGableSourceReference,
  roofPlane,
  roofBayStartAlongRidgeM,
  roofBaySpanM,
  roofBayGeometrySourceReference,
  purlinTributaryBands,
  edgeDimensionHeightType,
  edgeDimensionHeightM,
  edgeDimensionHeightSourceReference,
  note = null
} = {}) {
  validateWindPressureContextAcceptance(windPressureContextAcceptance);
  const upstream = clone(windPressureContextAcceptance);
  if (upstream.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) throw new Error(`Roof zone geometry supports only '${SUPPORTED_CODE_PROFILE}'.`);
  if (upstream.roofGeometry?.roofForm !== 'gable') throw new Error('This M3 roof-zone geometry slice supports only gable roofs.');
  if (symmetricGableConfirmed !== true) throw new Error('symmetricGableConfirmed must be true for this M3 zoning slice.');

  const ridgeAxis = oneOf(ridgeParallelPlanDimension, 'ridgeParallelPlanDimension', SUPPORTED_RIDGE_AXES);
  const plane = oneOf(roofPlane, 'roofPlane', SUPPORTED_ROOF_PLANES);
  const ridgeRef = nonEmpty(ridgeDirectionSourceReference, 'ridgeDirectionSourceReference');
  const symmetryRef = nonEmpty(symmetricGableSourceReference, 'symmetricGableSourceReference');
  const bayGeometryRef = nonEmpty(roofBayGeometrySourceReference, 'roofBayGeometrySourceReference');
  const heightRef = nonEmpty(edgeDimensionHeightSourceReference, 'edgeDimensionHeightSourceReference');

  const slopeDeg = positive(upstream.roofGeometry.roofSlopeDeg, 'roofGeometry.roofSlopeDeg');
  const figureId = selectFigureId(slopeDeg);
  const theta = slopeDeg * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  if (!(cosTheta > EPS)) throw new Error('Roof slope is too steep for this gable-roof surface mapping.');

  const axes = roofAxes(upstream.roofGeometry, ridgeAxis);
  const ridgeLengthM = positive(axes.ridgeLengthM, 'ridgeLengthM');
  const transverseWidthM = positive(axes.transverseWidthM, 'transverseWidthM');
  const horizontalRunEaveToRidgeM = transverseWidthM / 2;
  const roofSlopeLengthM = horizontalRunEaveToRidgeM / cosTheta;

  const bayStartM = finite(roofBayStartAlongRidgeM, 'roofBayStartAlongRidgeM');
  const baySpanM = positive(roofBaySpanM, 'roofBaySpanM');
  const bayEndM = bayStartM + baySpanM;
  if (bayStartM < -EPS || bayEndM > ridgeLengthM + EPS) throw new Error('Registered Roof Bay must lie within the ridge-parallel roof extent.');

  const height = resolveHeightForA({
    slopeDeg,
    meanRoofHeightM: upstream.roofGeometry.meanRoofHeightM,
    edgeDimensionHeightType,
    edgeDimensionHeightM
  });
  const leastHorizontalDimensionM = Math.min(upstream.roofGeometry.planLengthM, upstream.roofGeometry.planWidthM);
  const edge = resolveEdgeDimensionA(leastHorizontalDimensionM, height.heightM);
  const aSurfaceUpslopeM = edge.aM / cosTheta;
  const cells = createZoneCells(ridgeLengthM, roofSlopeLengthM, edge.aM, aSurfaceUpslopeM);
  const bands = normalizeBands(purlinTributaryBands, roofSlopeLengthM);
  const intersections = bandIntersections(bands, cells, clamp(bayStartM, 0, ridgeLengthM), clamp(bayEndM, 0, ridgeLengthM));

  const wholeRoofPlaneAreaM2 = ridgeLengthM * roofSlopeLengthM;
  const zoneAreaTotalsM2 = cells.reduce((sum, cell) => {
    sum[cell.type] += cell.areaM2;
    return sum;
  }, { field: 0, edge: 0, corner: 0 });
  const partitionedRoofPlaneAreaM2 = zoneAreaTotalsM2.field + zoneAreaTotalsM2.edge + zoneAreaTotalsM2.corner;
  const roofBayAreaM2 = baySpanM * roofSlopeLengthM;
  const intersectedRoofBayAreaM2 = intersections.reduce((sum, band) => sum + band.conservation.intersectedAreaM2, 0);

  const record = {
    schemaVersion: WIND_ROOF_ZONE_GEOMETRY_SCHEMA,
    status: 'GABLE_ROOF_CNC_ZONE_GEOMETRY_RESOLVED_EXTERNAL_GCP_BLOCKED',
    adoptedCodeProfileId: upstream.adoptedCodeProfileId,
    upstreamWindPressureContextAcceptance: upstream,
    designProcedure: DESIGN_PROCEDURE,
    applicability: {
      roofForm: 'gable',
      symmetricGableConfirmed: true,
      symmetricGableSourceReference: symmetryRef,
      roofSlopeDeg: slopeDeg,
      figureId,
      figureSelectionRule: 'NSCP 2015 Figure 207E.4-2B for 7° < theta <= 27°; Figure 207E.4-2C for 27° < theta <= 45°.',
      overhangGeometryImplemented: false
    },
    wholeRoofGeometry: {
      ridgeParallelPlanDimension: ridgeAxis,
      ridgeDirectionSourceReference: ridgeRef,
      ridgeAxisSourceField: axes.ridgeAxisSourceField,
      transverseSourceField: axes.transverseSourceField,
      ridgeLengthM,
      transverseWidthM,
      horizontalRunEaveToRidgeM,
      roofSlopeLengthM,
      coordinateFrame: {
        system: 'single-gable-slope-surface-xy-m',
        origin: 'selected-slope-eave-at-first-gable-end',
        xAxis: 'ridge-parallel toward opposite gable end',
        yAxis: 'upslope from eave toward ridge',
        xExtentM: ridgeLengthM,
        yExtentM: roofSlopeLengthM
      }
    },
    edgeDimension: {
      leastHorizontalDimensionM,
      referenceHeightType: height.heightType,
      referenceHeightM: height.heightM,
      referenceHeightSourceReference: heightRef,
      tenPercentLeastM: edge.tenPercentLeastM,
      fortyPercentHeightM: edge.fortyPercentHeightM,
      fourPercentLeastM: edge.fourPercentLeastM,
      absoluteMinimumM: edge.absoluteMinimumM,
      upperSelectionM: edge.upperSelectionM,
      lowerBoundM: edge.lowerBoundM,
      aHorizontalM: edge.aM,
      aRoofSurfaceUpslopeM: aSurfaceUpslopeM,
      ruleReference: 'NSCP 2015 Figures 207E.4-2B/2C notation for edge dimension a; verify against an authorized code copy before project use.'
    },
    roofPlaneRegistration: {
      roofPlane: plane,
      bayStartAlongRidgeM: clamp(bayStartM, 0, ridgeLengthM),
      bayEndAlongRidgeM: clamp(bayEndM, 0, ridgeLengthM),
      baySpanM,
      roofSlopeLengthM,
      roofBayGeometrySourceReference: bayGeometryRef
    },
    zones: {
      types: ['field', 'edge', 'corner'],
      cells,
      zoneAreaTotalsM2,
      wholeRoofPlaneAreaM2,
      partitionedRoofPlaneAreaM2,
      conservation: {
        residualM2: partitionedRoofPlaneAreaM2 - wholeRoofPlaneAreaM2,
        pass: nearlyEqual(partitionedRoofPlaneAreaM2, wholeRoofPlaneAreaM2)
      },
      geometryRule: 'Zone 3 is the overlap of the eave strip and a gable-end strip. Zone 2 is the remaining eave/gable-end strip. The ridge is not treated as an exterior roof edge in this symmetric gable-roof zoning slice.'
    },
    purlinTributaryBandIntersections: intersections,
    roofBayConservation: {
      roofBayAreaM2,
      intersectedRoofBayAreaM2,
      residualM2: intersectedRoofBayAreaM2 - roofBayAreaM2,
      allBandsPass: intersections.every((band) => band.conservation.pass),
      pass: nearlyEqual(intersectedRoofBayAreaM2, roofBayAreaM2) && intersections.every((band) => band.conservation.pass)
    },
    implementation: {
      roofBayPlacementRegistrationImplemented: true,
      edgeDimensionAImplemented: true,
      fieldEdgeCornerGeometryImplemented: true,
      purlinTributaryBandZoneIntersectionsImplemented: true,
      externalPressureCoefficientImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      externalInternalPressureCombinationImplemented: false,
      codeDerivedRoofPressureImplemented: false,
      roofBayCodePressureRoutingImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'This record resolves only symmetric gable-roof C&C field/edge/corner geometry and exact Roof Bay purlin-tributary-band intersections. It does not select GCp, resolve roof-sheet or fastener effective wind area, combine external and internal pressure, calculate final code-derived roof pressure, model overhangs, or replace the active manual-uniform Roof Bay wind pressure.'
  };

  validateWindRoofZoneGeometry(record);
  return clone(record);
}

export function validateWindRoofZoneGeometry(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind roof zone geometry record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_ZONE_GEOMETRY_SCHEMA) throw new Error(`Unsupported wind roof zone geometry schema '${record.schemaVersion}'.`);
  if (record.status !== 'GABLE_ROOF_CNC_ZONE_GEOMETRY_RESOLVED_EXTERNAL_GCP_BLOCKED') throw new Error('Wind roof zone geometry status changed.');
  validateWindPressureContextAcceptance(record.upstreamWindPressureContextAcceptance);
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE || record.adoptedCodeProfileId !== record.upstreamWindPressureContextAcceptance.adoptedCodeProfileId) {
    throw new Error('Wind roof zone geometry code profile is unsupported or mismatched.');
  }
  if (record.designProcedure !== DESIGN_PROCEDURE) throw new Error('Wind roof zone geometry must remain a Components & Cladding procedure record.');
  if (record.applicability?.roofForm !== 'gable' || record.applicability?.symmetricGableConfirmed !== true) throw new Error('Wind roof zone geometry must remain an explicitly confirmed symmetric gable roof.');
  nonEmpty(record.applicability?.symmetricGableSourceReference, 'applicability.symmetricGableSourceReference');
  const slopeDeg = positive(record.applicability?.roofSlopeDeg, 'applicability.roofSlopeDeg');
  const expectedFigureId = selectFigureId(slopeDeg);
  if (record.applicability?.figureId !== expectedFigureId) throw new Error('Gable roof zoning figure selection changed from the slope boundary rule.');
  if (record.applicability?.overhangGeometryImplemented !== false) throw new Error('overhangGeometryImplemented must remain false in this zoning slice.');

  const ridgeAxis = oneOf(record.wholeRoofGeometry?.ridgeParallelPlanDimension, 'wholeRoofGeometry.ridgeParallelPlanDimension', SUPPORTED_RIDGE_AXES);
  nonEmpty(record.wholeRoofGeometry?.ridgeDirectionSourceReference, 'wholeRoofGeometry.ridgeDirectionSourceReference');
  const axes = roofAxes(record.upstreamWindPressureContextAcceptance.roofGeometry, ridgeAxis);
  const theta = slopeDeg * Math.PI / 180;
  const expectedSlopeLengthM = (axes.transverseWidthM / 2) / Math.cos(theta);
  if (!nearlyEqual(record.wholeRoofGeometry?.ridgeLengthM, axes.ridgeLengthM)) throw new Error('ridgeLengthM changed from the accepted plan geometry.');
  if (!nearlyEqual(record.wholeRoofGeometry?.transverseWidthM, axes.transverseWidthM)) throw new Error('transverseWidthM changed from the accepted plan geometry.');
  if (!nearlyEqual(record.wholeRoofGeometry?.horizontalRunEaveToRidgeM, axes.transverseWidthM / 2)) throw new Error('horizontalRunEaveToRidgeM changed from the symmetric gable geometry.');
  if (!nearlyEqual(record.wholeRoofGeometry?.roofSlopeLengthM, expectedSlopeLengthM)) throw new Error('roofSlopeLengthM changed from the accepted symmetric gable geometry.');

  const height = resolveHeightForA({
    slopeDeg,
    meanRoofHeightM: record.upstreamWindPressureContextAcceptance.roofGeometry.meanRoofHeightM,
    edgeDimensionHeightType: record.edgeDimension?.referenceHeightType,
    edgeDimensionHeightM: record.edgeDimension?.referenceHeightM
  });
  nonEmpty(record.edgeDimension?.referenceHeightSourceReference, 'edgeDimension.referenceHeightSourceReference');
  const least = Math.min(record.upstreamWindPressureContextAcceptance.roofGeometry.planLengthM, record.upstreamWindPressureContextAcceptance.roofGeometry.planWidthM);
  const edge = resolveEdgeDimensionA(least, height.heightM);
  if (!nearlyEqual(record.edgeDimension?.leastHorizontalDimensionM, least)) throw new Error('leastHorizontalDimensionM changed from the accepted plan geometry.');
  for (const [key, expected] of Object.entries({
    tenPercentLeastM: edge.tenPercentLeastM,
    fortyPercentHeightM: edge.fortyPercentHeightM,
    fourPercentLeastM: edge.fourPercentLeastM,
    absoluteMinimumM: edge.absoluteMinimumM,
    upperSelectionM: edge.upperSelectionM,
    lowerBoundM: edge.lowerBoundM,
    aHorizontalM: edge.aM,
    aRoofSurfaceUpslopeM: edge.aM / Math.cos(theta)
  })) {
    if (!nearlyEqual(record.edgeDimension?.[key], expected)) throw new Error(`${key} changed from the deterministic edge-dimension result.`);
  }

  const plane = oneOf(record.roofPlaneRegistration?.roofPlane, 'roofPlaneRegistration.roofPlane', SUPPORTED_ROOF_PLANES);
  if (!plane) throw new Error('roofPlaneRegistration.roofPlane is required.');
  const bayStartM = finite(record.roofPlaneRegistration?.bayStartAlongRidgeM, 'roofPlaneRegistration.bayStartAlongRidgeM');
  const bayEndM = finite(record.roofPlaneRegistration?.bayEndAlongRidgeM, 'roofPlaneRegistration.bayEndAlongRidgeM');
  const baySpanM = positive(record.roofPlaneRegistration?.baySpanM, 'roofPlaneRegistration.baySpanM');
  nonEmpty(record.roofPlaneRegistration?.roofBayGeometrySourceReference, 'roofPlaneRegistration.roofBayGeometrySourceReference');
  if (!nearlyEqual(bayEndM - bayStartM, baySpanM)) throw new Error('Registered Roof Bay span changed from bay end minus bay start.');
  if (bayStartM < -EPS || bayEndM > axes.ridgeLengthM + EPS) throw new Error('Registered Roof Bay lies outside the ridge-parallel roof extent.');
  if (!nearlyEqual(record.roofPlaneRegistration?.roofSlopeLengthM, expectedSlopeLengthM)) throw new Error('Registered Roof Bay slope length must match the whole-roof gable geometry.');

  const expectedCells = createZoneCells(axes.ridgeLengthM, expectedSlopeLengthM, edge.aM, edge.aM / Math.cos(theta));
  if (JSON.stringify(stable(record.zones?.cells)) !== JSON.stringify(stable(expectedCells))) throw new Error('Roof zone cells changed from the deterministic field/edge/corner partition.');
  const expectedZoneTotals = expectedCells.reduce((sum, cell) => {
    sum[cell.type] += cell.areaM2;
    return sum;
  }, { field: 0, edge: 0, corner: 0 });
  for (const type of ['field', 'edge', 'corner']) {
    if (!nearlyEqual(record.zones?.zoneAreaTotalsM2?.[type], expectedZoneTotals[type])) throw new Error(`${type} roof zone area changed from the deterministic partition.`);
  }
  const planeAreaM2 = axes.ridgeLengthM * expectedSlopeLengthM;
  const partitionedAreaM2 = expectedZoneTotals.field + expectedZoneTotals.edge + expectedZoneTotals.corner;
  if (!nearlyEqual(record.zones?.wholeRoofPlaneAreaM2, planeAreaM2) || !nearlyEqual(record.zones?.partitionedRoofPlaneAreaM2, partitionedAreaM2)) {
    throw new Error('Whole-roof zone partition areas changed from deterministic geometry.');
  }
  if (record.zones?.conservation?.pass !== true || !nearlyEqual(record.zones?.conservation?.residualM2, 0)) throw new Error('Whole-roof zone partition must conserve roof-plane area.');

  const bandInputs = record.purlinTributaryBandIntersections?.map((band) => ({
    label: band.label,
    stationM: band.stationM,
    startM: band.startM,
    endM: band.endM
  }));
  const bands = normalizeBands(bandInputs, expectedSlopeLengthM);
  const expectedIntersections = bandIntersections(bands, expectedCells, bayStartM, bayEndM);
  if (JSON.stringify(stable(record.purlinTributaryBandIntersections)) !== JSON.stringify(stable(expectedIntersections))) {
    throw new Error('Purlin tributary-band zone intersections changed from deterministic geometry.');
  }
  const bayAreaM2 = baySpanM * expectedSlopeLengthM;
  const intersectedBayAreaM2 = expectedIntersections.reduce((sum, band) => sum + band.conservation.intersectedAreaM2, 0);
  if (!nearlyEqual(record.roofBayConservation?.roofBayAreaM2, bayAreaM2) || !nearlyEqual(record.roofBayConservation?.intersectedRoofBayAreaM2, intersectedBayAreaM2)) {
    throw new Error('Roof Bay zone-intersection area changed from deterministic geometry.');
  }
  if (record.roofBayConservation?.allBandsPass !== true || record.roofBayConservation?.pass !== true || !nearlyEqual(record.roofBayConservation?.residualM2, 0)) {
    throw new Error('Roof Bay purlin-zone intersections must conserve every tributary band and the whole bay area.');
  }

  const impl = record.implementation;
  for (const key of ['roofBayPlacementRegistrationImplemented', 'edgeDimensionAImplemented', 'fieldEdgeCornerGeometryImplemented', 'purlinTributaryBandZoneIntersectionsImplemented']) {
    if (impl?.[key] !== true) throw new Error(`${key} must remain true in the roof-zone geometry slice.`);
  }
  for (const key of ['externalPressureCoefficientImplemented', 'roofSheetEffectiveWindAreaImplemented', 'fastenerEffectiveWindAreaImplemented', 'externalInternalPressureCombinationImplemented', 'codeDerivedRoofPressureImplemented', 'roofBayCodePressureRoutingImplemented']) {
    if (impl?.[key] !== false) throw new Error(`${key} must remain false in the roof-zone geometry slice.`);
  }
  nonEmpty(record.boundary, 'boundary');
  return true;
}

export function serializeWindRoofZoneGeometry(record) {
  validateWindRoofZoneGeometry(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofZoneGeometry(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofZoneGeometry(parsed);
  return clone(parsed);
}
