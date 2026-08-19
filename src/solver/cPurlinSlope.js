import { solveBeam } from './beamFem.js';

export function normalizeRoofSlopeDeg(value) {
  const slope = Number(value);
  if (!Number.isFinite(slope)) throw new Error('Roof slope must be a finite angle in degrees.');
  if (slope < 0 || slope >= 90) throw new Error('Roof slope must be from 0° up to, but not including, 90°.');
  return slope;
}

export function resolveVerticalRoofLoad(loadKN, roofSlopeDeg) {
  const load = Number(loadKN);
  if (!Number.isFinite(load) || load < 0) throw new Error('Vertical point load must be a finite non-negative force.');
  const slope = normalizeRoofSlopeDeg(roofSlopeDeg);
  const radians = slope * Math.PI / 180;
  const roofNormalKN = load * Math.cos(radians);
  const roofParallelKN = load * Math.sin(radians);
  return {
    globalVerticalKN: load,
    roofSlopeDeg: slope,
    roofNormalKN,
    roofParallelKN
  };
}

function combineDeflectionSeries(normalSeries, parallelSeries, radians) {
  if (!Array.isArray(normalSeries) || !Array.isArray(parallelSeries) || normalSeries.length !== parallelSeries.length) {
    return [];
  }
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return normalSeries.map((normalPoint, index) => {
    const parallelPoint = parallelSeries[index];
    const normalMm = Number(normalPoint.displacementMm) || 0;
    const parallelMm = Number(parallelPoint.displacementMm) || 0;
    return {
      xM: normalPoint.xM,
      displacementMm: normalMm * c + parallelMm * s,
      roofNormalDisplacementMm: normalMm,
      roofParallelDisplacementMm: parallelMm,
      resultantDisplacementMm: Math.hypot(normalMm, parallelMm)
    };
  });
}

export function solveSlopedCPurlinBeam({
  lengthM,
  elasticModulusMPa,
  properties,
  leftSupport,
  rightSupport,
  loadKN,
  loadPositionM,
  roofSlopeDeg
}) {
  if (!properties || !Number.isFinite(properties.ixMm4) || !Number.isFinite(properties.iyMm4)
    || !Number.isFinite(properties.zxMm3) || !Number.isFinite(properties.zyMm3)
    || properties.ixMm4 <= 0 || properties.iyMm4 <= 0 || properties.zxMm3 <= 0 || properties.zyMm3 <= 0) {
    throw new Error('C-purlin roof-slope screening requires positive gross Ix, Iy, Zx and Zy properties.');
  }

  const components = resolveVerticalRoofLoad(loadKN, roofSlopeDeg);
  const radians = components.roofSlopeDeg * Math.PI / 180;

  const normal = solveBeam({
    lengthM,
    elasticModulusMPa,
    inertiaMm4: properties.ixMm4,
    sectionModulusMm3: properties.zxMm3,
    leftSupport,
    rightSupport,
    pointLoads: [{ xM: loadPositionM, forceKN: components.roofNormalKN }]
  });

  const parallel = solveBeam({
    lengthM,
    elasticModulusMPa,
    inertiaMm4: properties.iyMm4,
    sectionModulusMm3: properties.zyMm3,
    leftSupport,
    rightSupport,
    pointLoads: [{ xM: loadPositionM, forceKN: components.roofParallelKN }]
  });

  const deflectionSeries = combineDeflectionSeries(normal.deflectionSeries, parallel.deflectionSeries, radians);
  const maxDeflectionMm = deflectionSeries.length
    ? Math.max(...deflectionSeries.map((point) => Math.abs(point.displacementMm)))
    : Math.hypot(normal.maxDeflectionMm || 0, parallel.maxDeflectionMm || 0);
  const maxResultantDeflectionMm = deflectionSeries.length
    ? Math.max(...deflectionSeries.map((point) => Math.abs(point.resultantDisplacementMm)))
    : Math.hypot(normal.maxDeflectionMm || 0, parallel.maxDeflectionMm || 0);

  // Gross-section elastic biaxial screening envelope. The two one-axis extreme-fibre
  // stresses are conservatively superposed. This intentionally does not claim the
  // effective-section/local/distortional/LTB/torsional capacity of a cold-formed C.
  const maxBendingStressMPa = Math.abs(normal.maxBendingStressMPa || 0)
    + Math.abs(parallel.maxBendingStressMPa || 0);

  return {
    ...normal,
    analysisMode: 'c-purlin-sloped-biaxial-gross-screening',
    roofSlopeDeg: components.roofSlopeDeg,
    loadComponents: components,
    maxMomentKNm: Math.hypot(normal.maxMomentKNm || 0, parallel.maxMomentKNm || 0),
    maxBendingStressMPa,
    maxDeflectionMm,
    maxResultantDeflectionMm,
    deflectionSeries,
    roofNormalResponse: {
      loadKN: components.roofNormalKN,
      maxMomentKNm: normal.maxMomentKNm,
      maxBendingStressMPa: normal.maxBendingStressMPa,
      maxDeflectionMm: normal.maxDeflectionMm
    },
    roofParallelResponse: {
      loadKN: components.roofParallelKN,
      maxMomentKNm: parallel.maxMomentKNm,
      maxBendingStressMPa: parallel.maxBendingStressMPa,
      maxDeflectionMm: parallel.maxDeflectionMm
    }
  };
}
