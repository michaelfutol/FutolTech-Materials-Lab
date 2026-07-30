import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSectionProperties } from '../sections.js';

test('50 x 100 mm rectangle section properties are correct', () => {
  const result = calculateSectionProperties({ type: 'rectangle', widthMm: 50, depthMm: 100, thicknessMm: 0 });
  assert.ok(Math.abs(result.areaMm2 - 5000) < 1e-9);
  assert.ok(Math.abs(result.ixMm4 - 4_166_666.666666667) < 1e-6);
  assert.ok(Math.abs(result.zxMm3 - 83_333.33333333334) < 1e-6);
});

test('RHS rejects impossible wall thickness', () => {
  assert.throws(() => calculateSectionProperties({ type: 'rhs', widthMm: 50, depthMm: 50, thicknessMm: 25 }));
});
