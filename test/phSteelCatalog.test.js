import test from 'node:test';
import assert from 'node:assert/strict';
import { PH_PIPE_SECTIONS } from '../src/data/phSteelCatalog.js';
import { calculateSectionProperties } from '../src/solver/sections.js';

const STEEL_DENSITY_KG_M3 = 7850;
const CATALOG_MASS_TOLERANCE = 0.10;

test('Philippine pipe catalog has unique ids and valid CHS geometry', () => {
  assert.equal(new Set(PH_PIPE_SECTIONS.map((item) => item.id)).size, PH_PIPE_SECTIONS.length);
  assert.ok(PH_PIPE_SECTIONS.length >= 36);
  for (const item of PH_PIPE_SECTIONS) {
    assert.equal(item.type, 'chs');
    assert.ok(item.diameterMm > 0);
    assert.ok(item.thicknessMm > 0);
    assert.ok(item.thicknessMm * 2 < item.diameterMm);
    assert.deepEqual(item.finishOptions, ['GI']);
    assert.match(item.label, /^GI pipe/);
    assert.doesNotMatch(item.label, /BI/i);
  }
});

test('nominal-geometry mass agrees with official published mass within declared catalog tolerance', () => {
  for (const item of PH_PIPE_SECTIONS) {
    const properties = calculateSectionProperties(item);
    const calculatedMassKgM = properties.areaMm2 * 1e-6 * STEEL_DENSITY_KG_M3;
    const relativeDifference = Math.abs(calculatedMassKgM - item.publishedMassKgM) / item.publishedMassKgM;
    assert.ok(relativeDifference <= CATALOG_MASS_TOLERANCE, `${item.label}: ${calculatedMassKgM} vs ${item.publishedMassKgM}`);
  }
});
