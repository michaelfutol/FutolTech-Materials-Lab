import test from 'node:test';
import assert from 'node:assert/strict';
import { guardedSearchValue, minimumPositiveSearchValue } from '../src/comparisonLimitPositiveLoadGuard.js';

test('automatic comparison search never rounds a positive probe to literal zero', () => {
  assert.equal(minimumPositiveSearchValue('kgf'), 0.001);
  assert.equal(minimumPositiveSearchValue('kN'), 0.0001);
  assert.equal(minimumPositiveSearchValue('tf'), 0.000001);

  assert.equal(guardedSearchValue('0', 'kgf', true), 0.001);
  assert.equal(guardedSearchValue('0', 'kN', true), 0.0001);
  assert.equal(guardedSearchValue('0', 'tf', true), 0.000001);
});

test('manual zero input remains untouched when the automatic search is not running', () => {
  assert.equal(guardedSearchValue('0', 'kgf', false), '0');
  assert.equal(guardedSearchValue('0', 'kN', false), '0');
});

test('existing positive search loads are never changed', () => {
  assert.equal(guardedSearchValue('12.5', 'kgf', true), '12.5');
  assert.equal(guardedSearchValue('0.0002', 'kN', true), '0.0002');
});
