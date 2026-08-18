import { solveFrame2D } from './frame2d.js';

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be greater than zero.`);
  return number;
}

function cloneModel(model) {
  return {
    ...model,
    nodes: model.nodes.map((node) => ({
      ...node,
      restraints: { ...(node.restraints ?? {}) },
      loads: { ...(node.loads ?? {}) }
    })),
    elements: model.elements.map((element) => ({
      ...element,
      endI: { ...(element.endI ?? {}) },
      endJ: { ...(element.endJ ?? {}) }
    }))
  };
}

function braceNodes(direction) {
  if (direction === 'N1-N4') return ['N1', 'N4'];
  if (direction === 'N2-N3') return ['N2', 'N3'];
  throw new Error('NF-001 brace direction must be N1-N4 or N2-N3.');
}

function roofMeanUxMm(model, result) {
  const maxY = Math.max(...model.nodes.map((node) => Number(node.yM)));
  const roofIds = model.nodes
    .filter((node) => Math.abs(Number(node.yM) - maxY) <= 1e-9)
    .map((node) => node.id);
  const roof = result.nodes.filter((node) => roofIds.includes(node.id));
  if (!roof.length) throw new Error('Brace adviser could not find NF-001 roof nodes.');
  return roof.reduce((sum, node) => sum + node.uxMm, 0) / roof.length;
}

export function addNF001DiagonalBrace(model, {
  direction = 'N1-N4',
  elasticModulusMPa,
  areaMm2,
  id = 'BR1'
} = {}) {
  const E = positive(elasticModulusMPa, 'Brace elastic modulus');
  const A = positive(areaMm2, 'Brace area');
  const [nodeI, nodeJ] = braceNodes(direction);
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  if (!nodeIds.has(nodeI) || !nodeIds.has(nodeJ)) throw new Error('Brace direction requires the canonical NF-001 corner nodes.');
  if (model.elements.some((element) => element.id === id)) throw new Error(`Frame already contains element ${id}.`);

  const braced = cloneModel(model);
  braced.elements.push({
    id,
    nodeI,
    nodeJ,
    elasticModulusMPa: E,
    areaMm2: A,
    // Both ends are true moment releases. The bending inertia remains a small
    // positive numerical property required by the frame-element schema; after
    // end rotational release the diagonal participates as an axial brace in
    // the linear system rather than receiving a fabricated brace capacity.
    inertiaMm4: 1,
    endI: { type: 'pin' },
    endJ: { type: 'pin' },
    role: 'brace-sensitivity'
  });
  return braced;
}

export function evaluateNF001BraceSensitivity(model, {
  direction = 'N1-N4',
  elasticModulusMPa,
  areaMm2
} = {}) {
  const baseline = solveFrame2D(model);
  const bracedModel = addNF001DiagonalBrace(model, { direction, elasticModulusMPa, areaMm2 });
  const braced = solveFrame2D(bracedModel);
  const baselineDriftMm = roofMeanUxMm(model, baseline);
  const bracedDriftMm = roofMeanUxMm(bracedModel, braced);
  const baseAbs = Math.abs(baselineDriftMm);
  const reductionPercent = baseAbs > 1e-12
    ? (baseAbs - Math.abs(bracedDriftMm)) / baseAbs * 100
    : null;
  const brace = braced.elements.find((element) => element.id === 'BR1');
  if (!brace) throw new Error('Brace adviser could not recover BR1 result.');

  return {
    status: 'STIFFNESS SENSITIVITY ONLY',
    capacityStatus: 'UNRATED',
    direction,
    baselineDriftMm,
    bracedDriftMm,
    driftReductionPercent: reductionPercent,
    braceAxialForceKN: brace.axialForceKN,
    braceAxialSense: brace.axialForceKN < 0 ? 'compression' : brace.axialForceKN > 0 ? 'tension' : 'zero',
    bracedModel,
    baselineResult: baseline,
    bracedResult: braced,
    boundary: 'Brace Adviser v1 evaluates elastic system-stiffness sensitivity and axial demand only. It does not check brace tension/compression capacity, Euler/local buckling, connection/gusset capacity, eccentricity, out-of-plane restraint, cyclic behavior, or governing-code requirements.'
  };
}
