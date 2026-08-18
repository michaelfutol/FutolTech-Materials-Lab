import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import { SECTION_LIBRARY } from '../src/data/libraryCatalog.js';
import { calculateSectionProperties } from '../src/solver/sections.js';

test('user-observed PH SHS 100x100x2 is an active gross-geometry preset', () => {
  const preset = SECTION_PRESETS.steel.find((record) => record.id === 'shs-100-20-user-observed');
  assert.ok(preset);
  assert.equal(preset.type, 'rhs');
  assert.equal(preset.productCategory, 'shs');
  assert.equal(preset.widthMm, 100);
  assert.equal(preset.depthMm, 100);
  assert.equal(preset.thicknessMm, 2);
  assert.equal(preset.evidenceStatus, 'user-observed');
  assert.match(preset.marketStatus, /user-observed/i);
  assert.match(preset.analysisStatus, /verify delivered dimensions.*steel grade/i);

  const properties = calculateSectionProperties(preset);
  assert.equal(properties.areaMm2, 784);
  assert.ok(properties.ixMm4 > 1_000_000);
  assert.equal(properties.ixMm4, properties.iyMm4);
  assert.equal(properties.zxMm3, properties.zyMm3);
});

test('SHS 100x100x2 appears in the visual Section Library without claiming a published mass', () => {
  const record = SECTION_LIBRARY.find((item) => item.id === 'shs-100-20-user-observed');
  assert.ok(record);
  assert.equal(record.category, 'shs');
  assert.equal(record.dimensions, '100 × 100 × 2 mm');
  assert.equal(record.publishedMassKgM, null);
  assert.ok(record.properties?.areaMm2 > 0);
  assert.match(record.marketStatus, /user-observed/i);
});
