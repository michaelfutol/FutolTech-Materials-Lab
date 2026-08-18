const N_PER_KN = 1000;
const NMM_PER_KNM = 1_000_000;
const MM_PER_M = 1000;

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function requirePositive(value, label) {
  requireFinite(value, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

function zeroMatrix(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function matVec(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function addOuterAssembly(global, local, maps) {
  for (let a = 0; a < local.length; a += 1) {
    for (let b = 0; b < local[a].length; b += 1) {
      const coefficient = local[a][b];
      if (coefficient === 0) continue;
      for (const ma of maps[a]) {
        for (const mb of maps[b]) global[ma.index][mb.index] += coefficient * ma.coef * mb.coef;
      }
    }
  }
}

function localFrameStiffness({ E, A, I, L }) {
  const axial = E * A / L;
  const a = 12 * E * I / L ** 3;
  const b = 6 * E * I / L ** 2;
  const c = 4 * E * I / L;
  const d = 2 * E * I / L;
  return [
    [ axial, 0, 0, -axial, 0, 0 ],
    [ 0, a, b, 0, -a, b ],
    [ 0, b, c, 0, -b, d ],
    [ -axial, 0, 0, axial, 0, 0 ],
    [ 0, -a, -b, 0, a, -b ],
    [ 0, b, d, 0, -b, c ]
  ];
}

// Classical beam-column geometric stiffness for a constant signed axial force.
// axialForceN is positive in tension and negative in compression, so compression
// reduces the lateral tangent stiffness while tension increases it.
function localGeometricStiffness({ axialForceN, L }) {
  if (!Number.isFinite(axialForceN) || Math.abs(axialForceN) < 1e-12) return Array.from({ length: 6 }, () => Array(6).fill(0));
  const scale = axialForceN / (30 * L);
  const L2 = L * L;
  const g = [
    [36, 3 * L, -36, 3 * L],
    [3 * L, 4 * L2, -3 * L, -L2],
    [-36, -3 * L, 36, -3 * L],
    [3 * L, -L2, -3 * L, 4 * L2]
  ];
  const output = Array.from({ length: 6 }, () => Array(6).fill(0));
  const indices = [1, 2, 4, 5];
  for (let i = 0; i < 4; i += 1) for (let j = 0; j < 4; j += 1) output[indices[i]][indices[j]] = scale * g[i][j];
  return output;
}

function normalizeEnd(end = {}) {
  const type = end.type ?? 'rigid';
  if (!['rigid', 'pin', 'spring'].includes(type)) throw new Error(`Unsupported frame end type: ${type}`);
  if (type !== 'spring') return { ...end, type };
  const kThetaKNmPerRad = requirePositive(Number(end.kThetaKNmPerRad), 'Rotational spring stiffness');
  const normalized = { ...end, type, kThetaKNmPerRad };
  if (end.momentLimitKNm != null && end.momentLimitKNm !== '') normalized.momentLimitKNm = requirePositive(Number(end.momentLimitKNm), 'Spring moment limit');
  if (end.postLimitStiffnessRatio != null && end.postLimitStiffnessRatio !== '') {
    const ratio = Number(end.postLimitStiffnessRatio);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio >= 1) throw new Error('Post-limit spring stiffness ratio must be from 0 (pin release) to less than 1.');
    normalized.postLimitStiffnessRatio = ratio;
  }
  return normalized;
}

function validateModel(model) {
  if (!model?.nodes?.length) throw new Error('Frame model requires nodes.');
  if (!model?.elements?.length) throw new Error('Frame model requires elements.');
  const nodeIds = new Set();
  for (const node of model.nodes) {
    if (!node.id || nodeIds.has(node.id)) throw new Error('Frame node ids must be unique and non-empty.');
    nodeIds.add(node.id);
    requireFinite(Number(node.xM), `Node ${node.id} x`);
    requireFinite(Number(node.yM), `Node ${node.id} y`);
  }
  const elementIds = new Set();
  for (const element of model.elements) {
    if (!element.id || elementIds.has(element.id)) throw new Error('Frame element ids must be unique and non-empty.');
    elementIds.add(element.id);
    if (!nodeIds.has(element.nodeI) || !nodeIds.has(element.nodeJ) || element.nodeI === element.nodeJ) throw new Error(`Element ${element.id} has invalid end nodes.`);
    requirePositive(Number(element.elasticModulusMPa), `Element ${element.id} E`);
    requirePositive(Number(element.areaMm2), `Element ${element.id} area`);
    requirePositive(Number(element.inertiaMm4), `Element ${element.id} inertia`);
    normalizeEnd(element.endI);
    normalizeEnd(element.endJ);
  }
}

function systemDefinition(model) {
  validateModel(model);
  const nodes = new Map();
  model.nodes.forEach((node, index) => {
    nodes.set(node.id, {
      ...node,
      xMm: Number(node.xM) * MM_PER_M,
      yMm: Number(node.yM) * MM_PER_M,
      dofs: { ux: index * 3, uy: index * 3 + 1, rz: index * 3 + 2 }
    });
  });
  let nextDof = model.nodes.length * 3;
  const elements = model.elements.map((element) => {
    const ni = nodes.get(element.nodeI);
    const nj = nodes.get(element.nodeJ);
    const dx = nj.xMm - ni.xMm;
    const dy = nj.yMm - ni.yMm;
    const L = Math.hypot(dx, dy);
    requirePositive(L, `Element ${element.id} length`);
    const endI = normalizeEnd(element.endI);
    const endJ = normalizeEnd(element.endJ);
    const internalI = endI.type === 'rigid' ? null : nextDof++;
    const internalJ = endJ.type === 'rigid' ? null : nextDof++;
    const c = dx / L;
    const s = dy / L;
    const rotationMapI = endI.type === 'rigid' ? [{ index: ni.dofs.rz, coef: 1 }] : [{ index: internalI, coef: 1 }];
    const rotationMapJ = endJ.type === 'rigid' ? [{ index: nj.dofs.rz, coef: 1 }] : [{ index: internalJ, coef: 1 }];
    const maps = [
      [{ index: ni.dofs.ux, coef: c }, { index: ni.dofs.uy, coef: s }],
      [{ index: ni.dofs.ux, coef: -s }, { index: ni.dofs.uy, coef: c }],
      rotationMapI,
      [{ index: nj.dofs.ux, coef: c }, { index: nj.dofs.uy, coef: s }],
      [{ index: nj.dofs.ux, coef: -s }, { index: nj.dofs.uy, coef: c }],
      rotationMapJ
    ];
    return {
      ...element,
      elasticModulusMPa: Number(element.elasticModulusMPa),
      areaMm2: Number(element.areaMm2),
      inertiaMm4: Number(element.inertiaMm4),
      ni, nj, L, c, s, endI, endJ, internalI, internalJ, maps
    };
  });
  return { nodes, elements, dofCount: nextDof, coreDofCount: model.nodes.length * 3 };
}

function addSpring(global, internalIndex, jointRotationIndex, kThetaKNmPerRad) {
  const k = kThetaKNmPerRad * NMM_PER_KNM;
  global[internalIndex][internalIndex] += k;
  global[jointRotationIndex][jointRotationIndex] += k;
  global[internalIndex][jointRotationIndex] -= k;
  global[jointRotationIndex][internalIndex] -= k;
}

function buildStiffness(system, axialForces = null) {
  const K = zeroMatrix(system.dofCount);
  for (const element of system.elements) {
    const elastic = localFrameStiffness({ E: element.elasticModulusMPa, A: element.areaMm2, I: element.inertiaMm4, L: element.L });
    addOuterAssembly(K, elastic, element.maps);
    if (axialForces?.has(element.id)) {
      const geometric = localGeometricStiffness({ axialForceN: axialForces.get(element.id), L: element.L });
      addOuterAssembly(K, geometric, element.maps);
    }
    if (element.endI.type === 'spring') addSpring(K, element.internalI, element.ni.dofs.rz, element.endI.kThetaKNmPerRad);
    if (element.endJ.type === 'spring') addSpring(K, element.internalJ, element.nj.dofs.rz, element.endJ.kThetaKNmPerRad);
  }
  return K;
}

function buildLoadVector(model, system) {
  const F = Array(system.dofCount).fill(0);
  for (const original of model.nodes) {
    const node = system.nodes.get(original.id);
    const loads = original.loads ?? {};
    F[node.dofs.ux] += Number(loads.fxKN ?? 0) * N_PER_KN;
    F[node.dofs.uy] += Number(loads.fyKN ?? 0) * N_PER_KN;
    F[node.dofs.rz] += Number(loads.mzKNm ?? 0) * NMM_PER_KNM;
  }
  return F;
}

function restrainedDofs(model, system) {
  const set = new Set();
  for (const original of model.nodes) {
    const node = system.nodes.get(original.id);
    const restraint = original.restraints ?? {};
    if (restraint.ux) set.add(node.dofs.ux);
    if (restraint.uy) set.add(node.dofs.uy);
    if (restraint.rz) set.add(node.dofs.rz);
  }
  return set;
}

function solveDense(Ainput, binput) {
  const n = binput.length;
  if (!n) return [];
  const A = Ainput.map((row) => row.slice());
  const b = binput.slice();
  const maxEntry = Math.max(1, ...A.flat().map(Math.abs));
  const pivotTolerance = maxEntry * 1e-12;
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let pivotValue = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row += 1) {
      const value = Math.abs(A[row][col]);
      if (value > pivotValue) { pivotValue = value; pivotRow = row; }
    }
    if (pivotValue <= pivotTolerance) throw new Error('Frame stiffness matrix is singular or near-singular: check restraints, pin releases, connection springs, or geometric instability.');
    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }
    const pivot = A[col][col];
    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row][col] / pivot;
      if (Math.abs(factor) < 1e-30) continue;
      A[row][col] = 0;
      for (let j = col + 1; j < n; j += 1) A[row][j] -= factor * A[col][j];
      b[row] -= factor * b[col];
    }
  }
  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let rhs = b[row];
    for (let j = row + 1; j < n; j += 1) rhs -= A[row][j] * x[j];
    x[row] = rhs / A[row][row];
  }
  return x;
}

function solveSystem(K, F, restrained) {
  const free = [];
  for (let i = 0; i < F.length; i += 1) if (!restrained.has(i)) free.push(i);
  if (!free.length) throw new Error('Frame has no free degrees of freedom.');
  const Kr = free.map((i) => free.map((j) => K[i][j]));
  const Fr = free.map((i) => F[i]);
  const ur = solveDense(Kr, Fr);
  const U = Array(F.length).fill(0);
  free.forEach((dof, index) => { U[dof] = ur[index]; });
  return { U, free };
}

function localDisplacements(element, U) {
  return element.maps.map((map) => map.reduce((sum, item) => sum + item.coef * U[item.index], 0));
}

function elementResults(system, U) {
  return system.elements.map((element) => {
    const q = localDisplacements(element, U);
    const k = localFrameStiffness({ E: element.elasticModulusMPa, A: element.areaMm2, I: element.inertiaMm4, L: element.L });
    const f = matVec(k, q);
    return {
      id: element.id,
      nodeI: element.nodeI,
      nodeJ: element.nodeJ,
      lengthM: element.L / MM_PER_M,
      localDisplacements: q,
      localEndForces: {
        axialIN: f[0], shearIN: f[1], momentINmm: f[2],
        axialJN: f[3], shearJN: f[4], momentJNmm: f[5]
      },
      axialForceN: f[3],
      axialForceKN: f[3] / N_PER_KN,
      endMomentIKNm: f[2] / NMM_PER_KNM,
      endMomentJKNm: f[5] / NMM_PER_KNM,
      endShearIKN: f[1] / N_PER_KN,
      endShearJKN: f[4] / N_PER_KN
    };
  });
}

function connectionResults(system, U) {
  const output = [];
  for (const element of system.elements) {
    for (const [side, end, internal, node] of [
      ['I', element.endI, element.internalI, element.ni],
      ['J', element.endJ, element.internalJ, element.nj]
    ]) {
      if (end.type !== 'spring') continue;
      const memberRotation = U[internal];
      const jointRotation = U[node.dofs.rz];
      const relativeRotationRad = memberRotation - jointRotation;
      const momentKNm = end.kThetaKNmPerRad * relativeRotationRad;
      output.push({
        id: `${element.id}:${side}`,
        elementId: element.id,
        side,
        nodeId: node.id,
        kThetaKNmPerRad: end.kThetaKNmPerRad,
        memberRotationRad,
        jointRotationRad: jointRotation,
        relativeRotationRad,
        momentKNm,
        momentMagnitudeKNm: Math.abs(momentKNm),
        momentLimitKNm: Number.isFinite(end.momentLimitKNm) ? end.momentLimitKNm : null,
        utilization: Number.isFinite(end.momentLimitKNm) ? Math.abs(momentKNm) / end.momentLimitKNm : null,
        postLimitStiffnessRatio: Number.isFinite(end.postLimitStiffnessRatio) ? end.postLimitStiffnessRatio : null
      });
    }
  }
  return output;
}

function nodeResults(model, system, U) {
  return model.nodes.map((original) => {
    const node = system.nodes.get(original.id);
    return {
      id: original.id,
      xM: Number(original.xM), yM: Number(original.yM),
      uxMm: U[node.dofs.ux], uyMm: U[node.dofs.uy], rzRad: U[node.dofs.rz],
      translationMm: Math.hypot(U[node.dofs.ux], U[node.dofs.uy])
    };
  });
}

function reactionResults(model, system, K, U, F, restrained) {
  const KU = matVec(K, U);
  const reactions = KU.map((value, index) => restrained.has(index) ? value - F[index] : 0);
  return model.nodes.map((original) => {
    const node = system.nodes.get(original.id);
    return {
      id: original.id,
      fxKN: reactions[node.dofs.ux] / N_PER_KN,
      fyKN: reactions[node.dofs.uy] / N_PER_KN,
      mzKNm: reactions[node.dofs.rz] / NMM_PER_KNM
    };
  });
}

function resultFromSolution(model, system, K, F, restrained, U, meta = {}) {
  const nodes = nodeResults(model, system, U);
  const elements = elementResults(system, U);
  const connections = connectionResults(system, U);
  const reactions = reactionResults(model, system, K, U, F, restrained);
  const maxTranslationNode = nodes.reduce((peak, node) => node.translationMm > peak.translationMm ? node : peak, nodes[0]);
  const maxAbsRotationNode = nodes.reduce((peak, node) => Math.abs(node.rzRad) > Math.abs(peak.rzRad) ? node : peak, nodes[0]);
  return {
    ...meta,
    nodes,
    elements,
    connections,
    reactions,
    maxTranslationMm: maxTranslationNode.translationMm,
    maxTranslationNodeId: maxTranslationNode.id,
    maxAbsRotationRad: Math.abs(maxAbsRotationNode.rzRad),
    maxAbsRotationNodeId: maxAbsRotationNode.id,
    displacementVector: U
  };
}

export function solveFrame2D(model) {
  const system = systemDefinition(model);
  const K = buildStiffness(system);
  const F = buildLoadVector(model, system);
  const restrained = restrainedDofs(model, system);
  const { U } = solveSystem(K, F, restrained);
  return resultFromSolution(model, system, K, F, restrained, U, { analysis: 'FIRST ORDER ELASTIC' });
}

export function solveFrame2DPDelta(model, { maxIterations = 40, tolerance = 1e-6 } = {}) {
  if (!Number.isInteger(maxIterations) || maxIterations < 1) throw new Error('P-Delta maxIterations must be a positive integer.');
  requirePositive(Number(tolerance), 'P-Delta convergence tolerance');
  const system = systemDefinition(model);
  const F = buildLoadVector(model, system);
  const restrained = restrainedDofs(model, system);
  const elasticK = buildStiffness(system);
  let { U } = solveSystem(elasticK, F, restrained);
  const firstOrderU = U.slice();
  let converged = false;
  let finalK = elasticK;
  let previous = U.slice();
  let iterations = 0;

  for (iterations = 1; iterations <= maxIterations; iterations += 1) {
    const elementState = elementResults(system, previous);
    const axial = new Map(elementState.map((element) => [element.id, element.axialForceN]));
    finalK = buildStiffness(system, axial);
    const solved = solveSystem(finalK, F, restrained);
    U = solved.U;
    let maxChange = 0;
    let maxValue = 1e-9;
    for (let i = 0; i < U.length; i += 1) {
      maxChange = Math.max(maxChange, Math.abs(U[i] - previous[i]));
      maxValue = Math.max(maxValue, Math.abs(U[i]));
    }
    if (maxChange / maxValue <= tolerance) { converged = true; break; }
    previous = U.slice();
  }
  if (!converged) throw new Error(`P-Delta iteration did not converge within ${maxIterations} iterations.`);
  const result = resultFromSolution(model, system, finalK, F, restrained, U, {
    analysis: 'SECOND ORDER ELASTIC P-DELTA',
    iterations,
    converged: true
  });
  const firstNodes = nodeResults(model, system, firstOrderU);
  const firstMax = Math.max(...firstNodes.map((node) => node.translationMm));
  result.firstOrderMaxTranslationMm = firstMax;
  result.translationAmplification = firstMax > 0 ? result.maxTranslationMm / firstMax : 1;
  result.boundary = 'Elastic geometric-stiffness iteration using member axial force. This is not a corotational large-displacement, plastic-hinge, or post-buckling solution.';
  return result;
}

function scaledModelLoads(model, factor) {
  return {
    ...model,
    nodes: model.nodes.map((node) => ({
      ...node,
      loads: {
        fxKN: Number(node.loads?.fxKN ?? 0) * factor,
        fyKN: Number(node.loads?.fyKN ?? 0) * factor,
        mzKNm: Number(node.loads?.mzKNm ?? 0) * factor
      }
    })),
    elements: model.elements.map((element) => ({ ...element, endI: { ...(element.endI ?? {}) }, endJ: { ...(element.endJ ?? {}) } }))
  };
}

function cloneWorkingModel(model) {
  return {
    ...model,
    nodes: model.nodes.map((node) => ({ ...node, restraints: { ...(node.restraints ?? {}) }, loads: { ...(node.loads ?? {}) } })),
    elements: model.elements.map((element) => ({
      ...element,
      endI: { ...(element.endI ?? {}), _degraded: false },
      endJ: { ...(element.endJ ?? {}), _degraded: false }
    }))
  };
}

function endForConnectionId(working, connectionId) {
  const [elementId, side] = connectionId.split(':');
  const element = working.elements.find((candidate) => candidate.id === elementId);
  if (!element) throw new Error(`Unknown connection event element: ${elementId}`);
  return side === 'I' ? element.endI : element.endJ;
}

export function solveFrameWithConnectionRedistribution(model, { targetLoadFactor = 1, maxEvents = 20 } = {}) {
  requirePositive(Number(targetLoadFactor), 'Target load factor');
  if (!Number.isInteger(maxEvents) || maxEvents < 1) throw new Error('maxEvents must be a positive integer.');
  const working = cloneWorkingModel(model);
  const events = [];
  let currentFactor = 0;
  let mechanism = false;
  let mechanismMessage = null;

  for (let eventIndex = 0; eventIndex < maxEvents; eventIndex += 1) {
    let unitResult;
    try {
      unitResult = solveFrame2D(scaledModelLoads(working, 1));
    } catch (error) {
      mechanism = true;
      mechanismMessage = error instanceof Error ? error.message : String(error);
      break;
    }
    const candidates = unitResult.connections
      .filter((connection) => {
        const end = endForConnectionId(working, connection.id);
        return !end._degraded && Number.isFinite(connection.momentLimitKNm) && Number.isFinite(connection.postLimitStiffnessRatio) && connection.momentMagnitudeKNm > 1e-12;
      })
      .map((connection) => ({
        connection,
        eventFactor: Math.max(currentFactor, connection.momentLimitKNm / connection.momentMagnitudeKNm)
      }))
      .filter((candidate) => candidate.eventFactor <= targetLoadFactor + 1e-10)
      .sort((a, b) => a.eventFactor - b.eventFactor || a.connection.id.localeCompare(b.connection.id));

    if (!candidates.length) break;
    const selected = candidates[0];
    currentFactor = selected.eventFactor;
    const before = solveFrame2D(scaledModelLoads(working, currentFactor));
    const beforeConnection = before.connections.find((item) => item.id === selected.connection.id);
    const end = endForConnectionId(working, selected.connection.id);
    const oldK = end.kThetaKNmPerRad;
    const ratio = end.postLimitStiffnessRatio;
    end._degraded = true;
    if (ratio === 0) {
      end.type = 'pin';
      delete end.kThetaKNmPerRad;
    } else end.kThetaKNmPerRad = oldK * ratio;

    let after = null;
    try {
      after = solveFrame2D(scaledModelLoads(working, currentFactor));
    } catch (error) {
      mechanism = true;
      mechanismMessage = error instanceof Error ? error.message : String(error);
    }
    events.push({
      sequence: events.length + 1,
      loadFactor: currentFactor,
      connectionId: selected.connection.id,
      momentLimitKNm: beforeConnection?.momentLimitKNm ?? selected.connection.momentLimitKNm,
      momentBeforeKNm: beforeConnection?.momentKNm ?? null,
      oldKThetaKNmPerRad: oldK,
      residualStiffnessRatio: ratio,
      newKThetaKNmPerRad: ratio === 0 ? 0 : oldK * ratio,
      stateAfter: ratio === 0 ? 'PIN RELEASE' : 'DEGRADED SPRING',
      maxTranslationBeforeMm: before.maxTranslationMm,
      maxTranslationAfterMm: after?.maxTranslationMm ?? null,
      mechanismAfter: mechanism
    });
    if (mechanism) break;
  }

  let finalResult = null;
  if (!mechanism) {
    try { finalResult = solveFrame2D(scaledModelLoads(working, targetLoadFactor)); }
    catch (error) { mechanism = true; mechanismMessage = error instanceof Error ? error.message : String(error); }
  }
  return {
    analysis: 'PIECEWISE ELASTIC CONNECTION REDISTRIBUTION',
    targetLoadFactor,
    events,
    finalResult,
    mechanism,
    mechanismMessage,
    finalModel: working,
    boundary: 'Connection event thresholds and residual stiffness ratios are explicit user/research/calibration inputs. The solver does not infer them from fastener count. This v1 path is first-order, piecewise elastic and does not preserve plastic rotation or hysteretic energy.'
  };
}

export function rectangularSectionProperties(widthMm, depthMm) {
  requirePositive(Number(widthMm), 'Rectangle width');
  requirePositive(Number(depthMm), 'Rectangle depth');
  return {
    areaMm2: Number(widthMm) * Number(depthMm),
    inertiaMm4: Number(widthMm) * Number(depthMm) ** 3 / 12
  };
}

export function createNF001Model({
  widthM = 3,
  heightM = 3,
  elasticModulusMPa = 13_100,
  memberWidthMm = 50,
  memberDepthMm = 100,
  lateralLoadKN = 1,
  gravityLoadKN = 0,
  topJointType = 'rigid',
  topJointKThetaKNmPerRad = null,
  topJointMomentLimitKNm = null,
  postLimitStiffnessRatio = null
} = {}) {
  requirePositive(Number(widthM), 'NF-001 width');
  requirePositive(Number(heightM), 'NF-001 height');
  requirePositive(Number(elasticModulusMPa), 'NF-001 elastic modulus');
  requireFinite(Number(lateralLoadKN), 'NF-001 lateral load');
  requireFinite(Number(gravityLoadKN), 'NF-001 gravity load');
  const section = rectangularSectionProperties(memberWidthMm, memberDepthMm);
  const jointEnd = () => {
    if (topJointType === 'rigid') return { type: 'rigid' };
    if (topJointType === 'pin') return { type: 'pin' };
    if (topJointType !== 'spring') throw new Error('NF-001 topJointType must be rigid, pin, or spring.');
    const end = { type: 'spring', kThetaKNmPerRad: requirePositive(Number(topJointKThetaKNmPerRad), 'NF-001 explicit joint spring stiffness') };
    if (topJointMomentLimitKNm != null && topJointMomentLimitKNm !== '') end.momentLimitKNm = requirePositive(Number(topJointMomentLimitKNm), 'NF-001 explicit joint moment limit');
    if (postLimitStiffnessRatio != null && postLimitStiffnessRatio !== '') end.postLimitStiffnessRatio = Number(postLimitStiffnessRatio);
    return normalizeEnd(end);
  };
  const material = { elasticModulusMPa: Number(elasticModulusMPa), ...section };
  return {
    id: 'NF-001',
    description: '3 m × 3 m nominal coconut-lumber portal/wall-frame benchmark with explicit joint idealization.',
    evidenceBoundary: 'Geometry is a software benchmark. Coco E uses the selected project dataset. Semi-rigid kθ and any moment threshold must be supplied explicitly; they are never inferred from nails or bolts.',
    nodes: [
      { id: 'N1', xM: 0, yM: 0, restraints: { ux: true, uy: true, rz: true } },
      { id: 'N2', xM: Number(widthM), yM: 0, restraints: { ux: true, uy: true, rz: true } },
      { id: 'N3', xM: 0, yM: Number(heightM), loads: { fxKN: Number(lateralLoadKN), fyKN: -Number(gravityLoadKN) / 2 } },
      { id: 'N4', xM: Number(widthM), yM: Number(heightM), loads: { fyKN: -Number(gravityLoadKN) / 2 } }
    ],
    elements: [
      { id: 'C1', nodeI: 'N1', nodeJ: 'N3', ...material, endI: { type: 'rigid' }, endJ: jointEnd() },
      { id: 'B1', nodeI: 'N3', nodeJ: 'N4', ...material, endI: jointEnd(), endJ: jointEnd() },
      { id: 'C2', nodeI: 'N2', nodeJ: 'N4', ...material, endI: { type: 'rigid' }, endJ: jointEnd() }
    ]
  };
}
