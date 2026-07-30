import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KGF_TO_KN,
  TONNE_FORCE_TO_KN,
  convertLoadToKN,
  loadEquivalentsFromKN,
  formatLoadEquivalents
} from '../src/utils/loadUnits.js';

test('converts kilogram-force to kN using standard gravity', () => {
  assert.ok(Math.abs(convertLoadToKN(1000, 'kgf') - TONNE_FORCE_TO_KN) < 1e-12);
  assert.ok(Math.abs(convertLoadToKN(1, 'kgf') - KGF_TO_KN) < 1e-12);
});

test('one tonne-force equals one thousand kilogram-force', () => {
  const equivalents = loadEquivalentsFromKN(TONNE_FORCE_TO_KN);
  assert.ok(Math.abs(equivalents.kgf - 1000) < 1e-9);
  assert.ok(Math.abs(equivalents.tf - 1) < 1e-12);
});

test('formatted loads expose engineering and familiar units', () => {
  const label = formatLoadEquivalents(1);
  assert.match(label, /kN/);
  assert.match(label, /kgf/);
  assert.match(label, /tf/);
});

test('rejects unsupported force units', () => {
  assert.throws(() => convertLoadToKN(1, 'kg'), /Unsupported load unit/);
});
