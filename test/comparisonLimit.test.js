import test from 'node:test';
import assert from 'node:assert/strict';
import { findLastPassingThreshold } from '../src/comparisonLimit.js';

test('finds the highest load range where at least one member still passes', () => {
  const result = findLastPassingThreshold({
    initialLoadKN: 5,
    evaluatePassCount: (loadKN) => loadKN <= 12.5 ? 1 : 0
  });
  assert.ok(Math.abs(result.passingLoadKN - 12.5) < 1e-8);
  assert.ok(result.failingLoadKN >= result.passingLoadKN);
});

test('uses the final surviving member rather than the first failure', () => {
  const capacities = [4, 8, 15];
  const result = findLastPassingThreshold({
    initialLoadKN: 1,
    evaluatePassCount: (loadKN) => capacities.filter((capacity) => loadKN <= capacity).length
  });
  assert.ok(Math.abs(result.passingLoadKN - 15) < 1e-8);
});

test('rejects a comparison with no passing member even near zero load', () => {
  assert.throws(() => findLastPassingThreshold({
    initialLoadKN: 1,
    evaluatePassCount: () => 0
  }), /None of the selected members passes/);
});
