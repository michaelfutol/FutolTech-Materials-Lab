import { solveLinearSystem, zeros } from './linearAlgebra.js';

function beamElementStiffness(elasticModulusMPa, inertiaMm4, lengthMm) {
  const factor = (elasticModulusMPa * inertiaMm4) / lengthMm ** 3;
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
  const rotation = vertical + 1;
  if (support === 'fixed') return [vertical, rotation];
  if (support === 'pin' || support === 'roller') return [vertical];
  return [];
}

function uniqueSorted(values, tolerance = 1e-8) {
  return [...values]
    .sort((a, b) => a - b)
    .filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > tolerance);
}

function matchingNodeIndex(nodePositionsM, xM) {
  return nodePositionsM.findIndex((position) => Math.abs(position - xM) < 1e-8);
}

export function solveBeam({
  lengthM,
  elasticModulusMPa,
  inertiaMm4,
  sectionModulusMm3,
  leftSupport,
  rightSupport,
  pointLoads = [],
  intermediateSupportsM = [],
  targetElementLengthM = 0.1
}) {
  if (lengthM <= 0) throw new Error('Member length must be greater than zero.');
  if (elasticModulusMPa <= 0 || inertiaMm4 <= 0 || sectionModulusMm3 <= 0) {
    throw new Error('Elastic modulus and section properties must be greater than zero.');
  }

  const validLoads = pointLoads.map((load) => {
    if (!Number.isFinite(load.xM) || load.xM < 0 || load.xM > lengthM) {
      throw new Error('A point load lies outside the member length.');
    }
    if (!Number.isFinite(load.forceKN) || load.forceKN < 0) {
      throw new Error('Point-load magnitudes must be non-negative.');
    }
    return load;
  });
  const validIntermediateSupports = uniqueSorted(intermediateSupportsM.map((xM) => {
    if (!Number.isFinite(xM) || xM <= 0 || xM >= lengthM) {
      throw new Error('Intermediate support positions must lie strictly inside the member.');
    }
    return xM;
  }));

  const segmentCount = Math.max(4, Math.ceil(lengthM / targetElementLengthM));
  const regularNodes = Array.from({ length: segmentCount + 1 }, (_, index) => (lengthM * index) / segmentCount);
  const nodePositionsM = uniqueSorted([
    0,
    lengthM,
    ...regularNodes,
    ...validLoads.map((load) => load.xM),
    ...validIntermediateSupports
  ]);
  const dofCount = nodePositionsM.length * 2;
  const globalK = zeros(dofCount);
  const forceVectorN = Array(dofCount).fill(0);
  const elementRecords = [];

  for (let elementIndex = 0; elementIndex < nodePositionsM.length - 1; elementIndex += 1) {
    const startM = nodePositionsM[elementIndex];
    const endM = nodePositionsM[elementIndex + 1];
    const lengthMm = (endM - startM) * 1000;
    const localK = beamElementStiffness(elasticModulusMPa, inertiaMm4, lengthMm);
    const dofs = [2 * elementIndex, 2 * elementIndex + 1, 2 * (elementIndex + 1), 2 * (elementIndex + 1) + 1];

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        globalK[dofs[row]][dofs[column]] += localK[row][column];
      }
    }
    elementRecords.push({ startM, endM, lengthMm, localK, dofs });
  }

  for (const load of validLoads) {
    const nodeIndex = matchingNodeIndex(nodePositionsM, load.xM);
    forceVectorN[2 * nodeIndex] -= load.forceKN * 1000;
  }

  const constrained = new Set([
    ...restrainedDofs(0, leftSupport),
    ...restrainedDofs(nodePositionsM.length - 1, rightSupport)
  ]);
  for (const supportXM of validIntermediateSupports) {
    const nodeIndex = matchingNodeIndex(nodePositionsM, supportXM);
    constrained.add(2 * nodeIndex);
  }

  const freeDofs = Array.from({ length: dofCount }, (_, index) => index).filter((index) => !constrained.has(index));
  if (freeDofs.length === 0) throw new Error('All degrees of freedom are restrained.');

  const reducedK = freeDofs.map((row) => freeDofs.map((column) => globalK[row][column]));
  const reducedF = freeDofs.map((row) => forceVectorN[row]);
  const reducedU = solveLinearSystem(reducedK, reducedF);
  const displacements = Array(dofCount).fill(0);
  freeDofs.forEach((dof, index) => { displacements[dof] = reducedU[index]; });

  const reactions = globalK.map((row, rowIndex) => row.reduce((sum, value, columnIndex) => sum + value * displacements[columnIndex], 0) - forceVectorN[rowIndex]);

  let maxMomentNmm = 0;
  const elementForces = elementRecords.map((element) => {
    const localU = element.dofs.map((dof) => displacements[dof]);
    const localForces = element.localK.map((row) => row.reduce((sum, value, index) => sum + value * localU[index], 0));
    maxMomentNmm = Math.max(maxMomentNmm, Math.abs(localForces[1]), Math.abs(localForces[3]));
    return { ...element, localForces };
  });

  const deflectionSeries = nodePositionsM.map((xM, nodeIndex) => ({
    xM,
    displacementMm: displacements[2 * nodeIndex],
    rotationRad: displacements[2 * nodeIndex + 1]
  }));
  const maxDeflectionMm = Math.max(...deflectionSeries.map((point) => Math.abs(point.displacementMm)));
  const maxBendingStressMPa = maxMomentNmm / sectionModulusMm3;
  const supportPositionsM = uniqueSorted([0, ...validIntermediateSupports, lengthM]);
  const supportReactionsKN = supportPositionsM.map((xM) => {
    const nodeIndex = matchingNodeIndex(nodePositionsM, xM);
    return { xM, reactionKN: reactions[2 * nodeIndex] / 1000 };
  });

  return {
    nodePositionsM,
    deflectionSeries,
    elementForces,
    maxDeflectionMm,
    maxMomentKNm: maxMomentNmm / 1_000_000,
    maxBendingStressMPa,
    leftReactionKN: reactions[0] / 1000,
    rightReactionKN: reactions[2 * (nodePositionsM.length - 1)] / 1000,
    supportReactionsKN
  };
}
