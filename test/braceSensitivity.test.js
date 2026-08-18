import test from 'node:test';
import assert from 'node:assert/strict';
import { createNF001Model } from '../src/solver/frame2d.js';
import { addNF001DiagonalBrace, evaluateNF001BraceSensitivity } from '../src/solver/braceSensitivity.js';

test('explicit diagonal brace reduces NF-001 elastic roof drift and reports axial demand only', () => {
  const model = createNF001Model({ lateralLoadKN: 1, topJointType: 'rigid' });
  const result = evaluateNF001BraceSensitivity(model, {
    direction: 'N1-N4',
    elasticModulusMPa: 13_100,
    areaMm2: 2500
  });
  assert.equal(result.status, 'STIFFNESS SENSITIVITY ONLY');
  assert.equal(result.capacityStatus, 'UNRATED');
  assert.ok(Math.abs(result.bracedDriftMm) < Math.abs(result.baselineDriftMm));
  assert.ok(result.driftReductionPercent > 0);
  assert.ok(Math.abs(result.braceAxialForceKN) > 1e-8);
  assert.match(result.boundary, /does not check brace tension\/compression capacity/i);
  assert.match(result.boundary, /connection\/gusset capacity/i);
});

test('brace properties and direction remain explicit inputs', () => {
  const model = createNF001Model();
  assert.throws(() => addNF001DiagonalBrace(model, { direction: 'N1-N4', elasticModulusMPa: 13_100, areaMm2: 0 }), /Brace area/);
  assert.throws(() => addNF001DiagonalBrace(model, { direction: 'unknown', elasticModulusMPa: 13_100, areaMm2: 2500 }), /brace direction/i);
  const braced = addNF001DiagonalBrace(model, { direction: 'N2-N3', elasticModulusMPa: 200_000, areaMm2: 500 });
  const brace = braced.elements.find((element) => element.id === 'BR1');
  assert.equal(brace.nodeI, 'N2');
  assert.equal(brace.nodeJ, 'N3');
  assert.equal(brace.elasticModulusMPa, 200_000);
  assert.equal(brace.areaMm2, 500);
  assert.equal(brace.endI.type, 'pin');
  assert.equal(brace.endJ.type, 'pin');
});
