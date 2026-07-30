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

test('CHS section properties use outside diameter and actual wall thickness', () => {
  const result = calculateSectionProperties({ type: 'chs', diameterMm: 50, thicknessMm: 2 });
  const expectedArea = Math.PI / 4 * (50 ** 2 - 46 ** 2);
  const expectedI = Math.PI / 64 * (50 ** 4 - 46 ** 4);
  assert.ok(Math.abs(result.areaMm2 - expectedArea) < 1e-9);
  assert.ok(Math.abs(result.ixMm4 - expectedI) < 1e-9);
  assert.equal(result.ixMm4, result.iyMm4);
});

test('user-defined catalog properties are preserved and radii are calculated', () => {
  const result = calculateSectionProperties({
    type: 'custom',
    widthMm: 100,
    depthMm: 200,
    areaMm2: 3500,
    ixMm4: 20_000_000,
    iyMm4: 5_000_000,
    zxMm3: 200_000,
    zyMm3: 100_000
  });
  assert.equal(result.areaMm2, 3500);
  assert.equal(result.ixMm4, 20_000_000);
  assert.ok(Math.abs(result.radiusXmm - Math.sqrt(20_000_000 / 3500)) < 1e-12);
});
