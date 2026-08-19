import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoofSlopeDeg, resolveVerticalRoofLoad } from '../src/solver/cPurlinSlope.js';

test('vertical point load resolves into roof-normal and roof-parallel components', () => {
  const result = resolveVerticalRoofLoad(10, 30);
  assert.ok(Math.abs(result.roofNormalKN - 8.660254037844386) < 1e-10);
  assert.ok(Math.abs(result.roofParallelKN - 5) < 1e-10);
  assert.ok(Math.abs(Math.hypot(result.roofNormalKN, result.roofParallelKN) - 10) < 1e-10);
});

test('zero roof slope preserves the legacy one-axis gravity case', () => {
  const result = resolveVerticalRoofLoad(7.5, 0);
  assert.equal(result.roofNormalKN, 7.5);
  assert.equal(result.roofParallelKN, 0);
});

test('roof slope input is bounded below 90 degrees', () => {
  assert.equal(normalizeRoofSlopeDeg(45), 45);
  assert.throws(() => normalizeRoofSlopeDeg(-1), /Roof slope/);
  assert.throws(() => normalizeRoofSlopeDeg(90), /Roof slope/);
});
