import test from 'node:test';
import assert from 'node:assert/strict';
import { beamDeformationDisplayScale, formatMagnificationLabel } from '../specimenDiagram.js';

test('beam deformation ×1 uses the same geometric pixel scale as member length', () => {
  const result = beamDeformationDisplayScale({
    x0: 90,
    x1: 810,
    lengthM: 3,
    magnification: 1,
    maxDeflectionMm: 5.436
  });

  const expectedPxPerMm = 720 / 3000;
  assert.ok(Math.abs(result.pxPerMm - expectedPxPerMm) < 1e-12);
  assert.ok(Math.abs(result.effectiveMagnification - 1) < 1e-12);
  assert.equal(result.capped, false);
});

test('large requested deformation scale is capped and reports effective magnification', () => {
  const result = beamDeformationDisplayScale({
    x0: 90,
    x1: 810,
    lengthM: 3,
    magnification: 100,
    maxDeflectionMm: 5.436,
    maxVisiblePx: 85
  });

  assert.equal(result.capped, true);
  assert.ok(result.effectiveMagnification < 100);
  assert.ok(Math.abs(result.pxPerMm * 5.436 - 85) < 1e-9);
});

test('small effective magnifications retain significant digits', () => {
  assert.equal(formatMagnificationLabel(0.034), '0.034');
  assert.equal(formatMagnificationLabel(0.004), '0.0040');
  assert.notEqual(formatMagnificationLabel(0.034), '0.0');
});
