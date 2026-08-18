import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createNF001Model,
  rectangularSectionProperties,
  solveFrame2D,
  solveFrame2DPDelta,
  solveFrameWithConnectionRedistribution
} from '../src/solver/frame2d.js';

function cantileverModel({ lateralKN = 10, axialCompressionKN = 0 } = {}) {
  return {
    nodes: [
      { id: 'A', xM: 0, yM: 0, restraints: { ux: true, uy: true, rz: true } },
      { id: 'B', xM: 0, yM: 3, loads: { fxKN: lateralKN, fyKN: -axialCompressionKN } }
    ],
    elements: [
      { id: 'C', nodeI: 'A', nodeJ: 'B', elasticModulusMPa: 200_000, areaMm2: 1000, inertiaMm4: 8_000_000, endI: { type: 'rigid' }, endJ: { type: 'rigid' } }
    ]
  };
}

test('single 2D frame cantilever matches closed-form lateral deflection rotation and base moment', () => {
  const P = 10_000;
  const L = 3000;
  const E = 200_000;
  const I = 8_000_000;
  const expectedDeflectionMm = P * L ** 3 / (3 * E * I);
  const expectedRotationRad = P * L ** 2 / (2 * E * I);
  const result = solveFrame2D(cantileverModel());
  const top = result.nodes.find((node) => node.id === 'B');
  const baseReaction = result.reactions.find((node) => node.id === 'A');
  assert.ok(Math.abs(top.uxMm - expectedDeflectionMm) < 1e-8);
  assert.ok(Math.abs(Math.abs(top.rzRad) - expectedRotationRad) < 1e-10);
  assert.ok(Math.abs(Math.abs(baseReaction.fxKN) - 10) < 1e-10);
  assert.ok(Math.abs(Math.abs(baseReaction.mzKNm) - 30) < 1e-9);
});

test('NF-001 rectangle properties use exact gross section geometry', () => {
  const section = rectangularSectionProperties(50, 100);
  assert.equal(section.areaMm2, 5000);
  assert.ok(Math.abs(section.inertiaMm4 - 4_166_666.666666667) < 1e-8);
});

test('NF-001 rigid, semi-rigid and pin top joints form a stiffness ordering without inferring a spring from fastener count', () => {
  const rigid = solveFrame2D(createNF001Model({ topJointType: 'rigid', lateralLoadKN: 1 }));
  const semi = solveFrame2D(createNF001Model({ topJointType: 'spring', topJointKThetaKNmPerRad: 10, lateralLoadKN: 1 }));
  const pinned = solveFrame2D(createNF001Model({ topJointType: 'pin', lateralLoadKN: 1 }));
  assert.ok(rigid.maxTranslationMm < semi.maxTranslationMm);
  assert.ok(semi.maxTranslationMm < pinned.maxTranslationMm);
  assert.throws(() => createNF001Model({ topJointType: 'spring', topJointKThetaKNmPerRad: null }), /explicit joint spring stiffness/i);
  assert.match(createNF001Model().evidenceBoundary, /never inferred from nails or bolts/i);
});

test('elastic P-Delta iteration amplifies a laterally loaded compressed cantilever and reports its boundary', () => {
  const model = cantileverModel({ lateralKN: 10, axialCompressionKN: 100 });
  const first = solveFrame2D(model);
  const second = solveFrame2DPDelta(model, { tolerance: 1e-8 });
  assert.equal(second.converged, true);
  assert.ok(second.maxTranslationMm > first.maxTranslationMm);
  assert.ok(second.translationAmplification > 1);
  assert.match(second.boundary, /not a corotational large-displacement, plastic-hinge, or post-buckling solution/i);
});

test('explicit spring moment limits can trigger a piecewise-elastic redistribution event without inventing capacity', () => {
  const model = createNF001Model({
    topJointType: 'spring',
    topJointKThetaKNmPerRad: 10,
    topJointMomentLimitKNm: 0.001,
    postLimitStiffnessRatio: 0.2,
    lateralLoadKN: 1
  });
  const result = solveFrameWithConnectionRedistribution(model, { targetLoadFactor: 1 });
  assert.ok(result.events.length >= 1);
  assert.ok(result.events.every((event) => event.loadFactor <= 1 + 1e-10));
  assert.ok(result.events.every((event) => event.residualStiffnessRatio === 0.2));
  assert.match(result.boundary, /explicit user\/research\/calibration inputs/i);
  assert.match(result.boundary, /does not infer them from fastener count/i);
});

test('full spring release can report a mechanism instead of fabricating a converged redistributed frame', () => {
  const model = createNF001Model({
    topJointType: 'spring',
    topJointKThetaKNmPerRad: 10,
    topJointMomentLimitKNm: 0.000001,
    postLimitStiffnessRatio: 0,
    lateralLoadKN: 1
  });
  const result = solveFrameWithConnectionRedistribution(model, { targetLoadFactor: 1 });
  assert.ok(result.events.length >= 1);
  if (result.mechanism) assert.match(result.mechanismMessage, /singular|mechanism|instability/i);
  else assert.ok(result.finalResult?.maxTranslationMm > 0);
});
