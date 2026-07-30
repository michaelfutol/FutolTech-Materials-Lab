import { solveLinearSystem, zeros } from './linearAlgebra.js';

function positive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

function culmProperties(diameterMm, thicknessMm) {
  positive('Outside diameter', diameterMm);
  positive('Wall thickness', thicknessMm);
  if (2 * thicknessMm >= diameterMm) throw new Error('Bamboo wall thickness must be less than half the outside diameter.');
  const innerDiameterMm = diameterMm - 2 * thicknessMm;
  const areaMm2 = (Math.PI / 4) * (diameterMm ** 2 - innerDiameterMm ** 2);
  const inertiaMm4 = (Math.PI / 64) * (diameterMm ** 4 - innerDiameterMm ** 4);
  const sectionModulusMm3 = inertiaMm4 / (diameterMm / 2);
  return { diameterMm, thicknessMm, innerDiameterMm, areaMm2, inertiaMm4, sectionModulusMm3 };
}

function interpolateStation(stations, xM) {
  if (xM <= stations[0].xM) return { ...stations[0] };
  if (xM >= stations.at(-1).xM) return { ...stations.at(-1) };
  const upperIndex = stations.findIndex((station) => station.xM >= xM);
  const lower = stations[upperIndex - 1];
  const upper = stations[upperIndex];
  const ratio = (xM - lower.xM) / (upper.xM - lower.xM);
  return {
    xM,
    diameterMm: lower.diameterMm + ratio * (upper.diameterMm - lower.diameterMm),
    thicknessMm: lower.thicknessMm + ratio * (upper.thicknessMm - lower.thicknessMm)
  };
}

function elementStiffness(elasticModulusMPa, inertiaMm4, lengthMm) {
  const factor = elasticModulusMPa * inertiaMm4 / lengthMm ** 3;
  const l = lengthMm;
  return [
    [12 * factor, 6 * l * factor, -12 * factor, 6 * l * factor],
    [6 * l * factor, 4 * l ** 2 * factor, -6 * l * factor, 2 * l ** 2 * factor],
    [-12 * factor, -6 * l * factor, 12 * factor, -6 * l * factor],
    [6 * l * factor, 2 * l ** 2 * factor, -6 * l * factor, 4 * l ** 2 * factor]
  ];
}

function restrainedDofs(nodeIndex, support) {
  const vertical = 2 * nodeIndex;
  if (support === 'fixed') return [vertical, vertical + 1];
  if (support === 'pin' || support === 'roller') return [vertical];
  return [];
}

function uniqueSorted(values, tolerance = 1e-9) {
  return [...values].sort((a, b) => a - b).filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > tolerance);
}

export function solveTaperedCulmBeam({
  lengthM,
  elasticModulusMPa,
  densityKgM3,
  stations,
  leftSupport = 'pin',
  rightSupport = 'roller',
  pointLoads,
  targetElementLengthM = 0.075
}) {
  positive('Member length', lengthM);
  positive('Elastic modulus', elasticModulusMPa);
  positive('Density', densityKgM3);
  if (!Array.isArray(stations) || stations.length < 2) throw new Error('At least two bamboo geometry stations are required.');
  const sortedStations = stations.map((station) => ({ ...station })).sort((a, b) => a.xM - b.xM);
  if (Math.abs(sortedStations[0].xM) > 1e-9 || Math.abs(sortedStations.at(-1).xM - lengthM) > 1e-9) {
    throw new Error('Bamboo geometry stations must include x = 0 and the full member length.');
  }
  sortedStations.forEach((station) => culmProperties(station.diameterMm, station.thicknessMm));
  const validLoads = pointLoads.map((load) => {
    if (!Number.isFinite(load.forceKN) || load.forceKN < 0) throw new Error('Point loads must be non-negative.');
    if (load.xM < 0 || load.xM > lengthM) throw new Error('A point load lies outside the member.');
    return load;
  });

  const segmentCount = Math.max(12, Math.ceil(lengthM / targetElementLengthM));
  const regularNodes = Array.from({ length: segmentCount + 1 }, (_, index) => lengthM * index / segmentCount);
  const nodePositionsM = uniqueSorted([0, lengthM, ...regularNodes, ...sortedStations.map((station) => station.xM), ...validLoads.map((load) => load.xM)]);
  const dofCount = nodePositionsM.length * 2;
  const globalK = zeros(dofCount);
  const forceVectorN = Array(dofCount).fill(0);
  const elements = [];
  let totalMassKg = 0;

  for (let index = 0; index < nodePositionsM.length - 1; index += 1) {
    const startM = nodePositionsM[index];
    const endM = nodePositionsM[index + 1];
    const midpointM = (startM + endM) / 2;
    const lengthMm = (endM - startM) * 1000;
    const midpointGeometry = interpolateStation(sortedStations, midpointM);
    const properties = culmProperties(midpointGeometry.diameterMm, midpointGeometry.thicknessMm);
    const localK = elementStiffness(elasticModulusMPa, properties.inertiaMm4, lengthMm);
    const dofs = [2 * index, 2 * index + 1, 2 * (index + 1), 2 * (index + 1) + 1];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) globalK[dofs[row]][dofs[column]] += localK[row][column];
    }
    totalMassKg += properties.areaMm2 * 1e-6 * densityKgM3 * (endM - startM);
    elements.push({ index, startM, endM, midpointM, lengthMm, properties, localK, dofs });
  }

  for (const load of validLoads) {
    const nodeIndex = nodePositionsM.findIndex((position) => Math.abs(position - load.xM) < 1e-8);
    forceVectorN[2 * nodeIndex] -= load.forceKN * 1000;
  }

  const constrained = new Set([
    ...restrainedDofs(0, leftSupport),
    ...restrainedDofs(nodePositionsM.length - 1, rightSupport)
  ]);
  const freeDofs = Array.from({ length: dofCount }, (_, index) => index).filter((index) => !constrained.has(index));
  if (freeDofs.length === 0) throw new Error('All degrees of freedom are restrained.');
  const reducedK = freeDofs.map((row) => freeDofs.map((column) => globalK[row][column]));
  const reducedF = freeDofs.map((row) => forceVectorN[row]);
  const reducedU = solveLinearSystem(reducedK, reducedF);
  const displacements = Array(dofCount).fill(0);
  freeDofs.forEach((dof, index) => { displacements[dof] = reducedU[index]; });
  const reactions = globalK.map((row, rowIndex) => row.reduce((sum, value, columnIndex) => sum + value * displacements[columnIndex], 0) - forceVectorN[rowIndex]);

  let maxMomentNmm = 0;
  let maxStressMPa = 0;
  let maxStressXM = 0;
  const elementForces = elements.map((element) => {
    const localU = element.dofs.map((dof) => displacements[dof]);
    const localForces = element.localK.map((row) => row.reduce((sum, value, index) => sum + value * localU[index], 0));
    const startInterpolated = interpolateStation(sortedStations, element.startM);
    const endInterpolated = interpolateStation(sortedStations, element.endM);
    const startGeometry = culmProperties(startInterpolated.diameterMm, startInterpolated.thicknessMm);
    const endGeometry = culmProperties(endInterpolated.diameterMm, endInterpolated.thicknessMm);
    const endChecks = [
      { xM: element.startM, momentNmm: Math.abs(localForces[1]), z: startGeometry.sectionModulusMm3 },
      { xM: element.endM, momentNmm: Math.abs(localForces[3]), z: endGeometry.sectionModulusMm3 }
    ];
    for (const check of endChecks) {
      maxMomentNmm = Math.max(maxMomentNmm, check.momentNmm);
      const stressMPa = check.momentNmm / check.z;
      if (stressMPa > maxStressMPa) {
        maxStressMPa = stressMPa;
        maxStressXM = check.xM;
      }
    }
    return { ...element, localForces };
  });

  const deflectionSeries = nodePositionsM.map((xM, nodeIndex) => {
    const geometry = interpolateStation(sortedStations, xM);
    return {
      xM,
      displacementMm: displacements[2 * nodeIndex],
      rotationRad: displacements[2 * nodeIndex + 1],
      diameterMm: geometry.diameterMm,
      thicknessMm: geometry.thicknessMm
    };
  });
  const peak = deflectionSeries.reduce((current, point) => Math.abs(point.displacementMm) > Math.abs(current.displacementMm) ? point : current, deflectionSeries[0]);

  return {
    stations: sortedStations,
    nodePositionsM,
    deflectionSeries,
    elementForces,
    maxDeflectionMm: Math.abs(peak.displacementMm),
    peakDeflectionXM: peak.xM,
    maxMomentKNm: maxMomentNmm / 1e6,
    maxBendingStressMPa: maxStressMPa,
    maxStressXM,
    leftReactionKN: reactions[0] / 1000,
    rightReactionKN: reactions[2 * (nodePositionsM.length - 1)] / 1000,
    totalMassKg
  };
}

export { culmProperties, interpolateStation };
