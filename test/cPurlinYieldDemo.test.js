import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KGF_PER_KN,
  centerPointFormulaSnapshot,
  dramaticProgress,
  firstYieldTarget
} from '../src/solver/cPurlinYieldDemo.js';

test('firstYieldTarget selects the lowest finite positive solver threshold', () => {
  const target = firstYieldTarget([
    { comparisonId: 'a', comparisonLabel: 'Member A', physicalThresholdLoadKN: 3.5 },
    { comparisonId: 'b', comparisonLabel: 'Member B', physicalThresholdLoadKN: 1.25 }
  ]);
  assert.equal(target.governingMemberId, 'b');
  assert.equal(target.targetLoadKN, 1.25);
  assert.ok(Math.abs(target.targetLoadKgf - 1.25 * KGF_PER_KN) < 1e-9);
});

test('dramaticProgress is bounded, monotonic at representative points and reaches yield exactly', () => {
  const values = [0, .1, .25, .5, .75, .9, 1].map(dramaticProgress);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 1);
  for (let index = 1; index < values.length; index += 1) {
    assert.ok(values[index] >= values[index - 1]);
  }
  assert.ok(dramaticProgress(.1) < .1, 'visual ramp should start gently');
  assert.ok(dramaticProgress(.9) > .9, 'visual ramp should approach yield deliberately');
});

test('centerPointFormulaSnapshot preserves solver values and familiar kgf conversion', () => {
  const snapshot = centerPointFormulaSnapshot({
    loadKN: 2,
    lengthM: 2,
    record: {
      roofSlopeDeg: 0,
      result: { maxMomentKNm: 1, maxBendingStressMPa: 80, maxDeflectionMm: 3.2 },
      strengthRatio: .32,
      deflectionRatio: .4,
      physicalThresholdLoadKN: 6.25
    }
  });
  assert.equal(snapshot.maxMomentKNm, 1);
  assert.equal(snapshot.stressMPa, 80);
  assert.equal(snapshot.deflectionMm, 3.2);
  assert.equal(snapshot.strengthUse, .32);
  assert.ok(Math.abs(snapshot.loadKgf - 2 * KGF_PER_KN) < 1e-9);
});
