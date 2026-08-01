import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import { PH_TRADITIONAL_TIMBER_LIBRARY } from '../src/data/phTraditionalTimberLibrary.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import { MATERIAL_LIBRARY, SECTION_LIBRARY, findSectionLibraryRecord } from '../src/data/libraryCatalog.js';
import { evaluateMemberCandidate } from '../src/solver/sectionRecommender.js';
import { sectionSketchSvg } from '../src/components/sectionSketch.js';

test('PNS 26 records are classified and labelled as GI pipes', () => {
  const pipe = SECTION_PRESETS.steel.find((section) => section.id.includes('ph-pipe-PNS26 light-125'));
  assert.ok(pipe);
  assert.equal(pipe.productCategory, 'steel-pipe');
  assert.match(pipe.label, /^GI pipe/);
  assert.doesNotMatch(pipe.label, /BI/i);

  const material = MATERIALS.find((item) => item.id === 'steel-generic-250');
  const candidate = evaluateMemberCandidate({
    material,
    preset: pipe,
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5
  });
  assert.equal(candidate.productCategoryLabel, 'GI pipe');
  assert.match(candidate.displayMaterialName, /^GI pipe/);
  assert.doesNotMatch(candidate.displayMaterialName, /tube|BI/i);
});

test('SHS remains a structural hollow section rather than a pipe', () => {
  const shs = SECTION_PRESETS.steel.find((section) => section.id === 'shs-50-15');
  const material = MATERIALS.find((item) => item.id === 'steel-generic-250');
  const candidate = evaluateMemberCandidate({
    material,
    preset: shs,
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5
  });
  assert.equal(candidate.productCategory, 'shs');
  assert.match(candidate.displayMaterialName, /hollow section/i);
});

test('visual library includes pipe, H, wood, and bamboo records with properties', () => {
  assert.ok(SECTION_LIBRARY.some((record) => record.category === 'steel-pipe'));
  assert.ok(SECTION_LIBRARY.some((record) => record.category === 'rolled-h'));
  assert.ok(SECTION_LIBRARY.some((record) => record.family === 'wood'));
  assert.ok(SECTION_LIBRARY.some((record) => record.family === 'bamboo'));
  assert.ok(SECTION_LIBRARY.every((record) => record.properties?.areaMm2 > 0));
});

test('section sketches distinguish pipe and H-section geometry', () => {
  const pipe = findSectionLibraryRecord('ph-pipe-PNS26 light-125');
  const hSection = SECTION_LIBRARY.find((record) => record.category === 'rolled-h');
  const pipeSvg = sectionSketchSvg(pipe.section, pipe.family);
  const hSvg = sectionSketchSvg(hSection.section, hSection.family);
  assert.match(pipeSvg, /<circle/);
  assert.match(hSvg, /<rect/);
  assert.notEqual(pipeSvg, hSvg);
});

test('traditional Philippine timber priorities are visible but inactive', () => {
  const pendingIds = new Set(PH_TRADITIONAL_TIMBER_LIBRARY.map((record) => record.id));
  assert.equal(pendingIds.size, 10);
  for (const record of PH_TRADITIONAL_TIMBER_LIBRARY) {
    assert.equal(record.activeInSolver, false);
    assert.equal(record.libraryOnly, true);
    assert.equal(record.elasticModulusMPa, null);
    assert.equal(record.densityKgM3, null);
    assert.equal(record.bendingReferenceMPa, null);
    assert.ok(record.activationRequirements.length > 40);
    assert.ok(MATERIAL_LIBRARY.some((entry) => entry.id === record.id));
    assert.ok(!MATERIALS.some((entry) => entry.id === record.id));
  }
});

test('pending trade-group names do not borrow the active mahogany dataset', () => {
  const bigLeafMahogany = MATERIALS.find((record) => record.id === 'wood-mahogany-ph-2025');
  const tradeGroup = MATERIAL_LIBRARY.find((record) => record.id === 'timber-philippine-mahogany-pending');
  assert.ok(bigLeafMahogany?.elasticModulusMPa > 0);
  assert.equal(tradeGroup.elasticModulusMPa, null);
  assert.match(tradeGroup.botanicalNote, /not the same as big-leaf mahogany/i);
});
