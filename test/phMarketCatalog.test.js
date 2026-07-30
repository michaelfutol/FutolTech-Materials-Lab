import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import { PH_WOOD_RESEARCH_MATERIALS } from '../src/data/phWoodMaterials.js';
import { PH_JIS_H_SECTIONS } from '../src/data/phRolledSteelCatalog.js';
import { evaluateMemberCandidate, recommendMemberSections } from '../src/solver/sectionRecommender.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';

test('Philippine wood research records keep proportional limit below rupture', () => {
  assert.equal(PH_WOOD_RESEARCH_MATERIALS.length, 5);
  for (const material of PH_WOOD_RESEARCH_MATERIALS) {
    assert.ok(material.elasticModulusMPa > 0);
    assert.ok(material.densityKgM3 > 0);
    assert.ok(material.bendingReferenceMPa > 0);
    assert.ok(material.ultimateBendingMPa > material.bendingReferenceMPa);
    assert.match(material.strengthReferenceLabel, /not allowable/i);
  }
});

test('JIS H starter catalog exposes exact gross properties and 12 m stock boundary', () => {
  assert.equal(PH_JIS_H_SECTIONS.length, 9);
  for (const section of PH_JIS_H_SECTIONS) {
    assert.equal(section.type, 'custom');
    assert.ok(section.areaMm2 > 0);
    assert.ok(section.ixMm4 > section.iyMm4);
    assert.ok(section.zxMm3 > section.zyMm3);
    assert.ok(section.publishedMassKgM > 0);
    assert.equal(section.maxLengthM, 12);
  }
});

test('section-specific stock length overrides generic steel material length', () => {
  const material = MATERIALS.find((item) => item.id === 'steel-generic-250');
  const preset = PH_JIS_H_SECTIONS[0];
  const result = evaluateMemberCandidate({
    material,
    preset,
    lengthM: 8,
    loadKN: 0.1,
    loadPositionM: 4,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });
  assert.equal(result.stockBoundaryM, 12);
  assert.equal(result.stockPass, true);
});

test('best is the first passing candidate under the selected objective', () => {
  const result = recommendMemberSections({
    materials: MATERIALS,
    presetsByFamily: SECTION_PRESETS,
    familyFilter: 'all',
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360,
    objective: 'mass'
  });
  assert.ok(result.best);
  assert.equal(result.best, result.candidates.find((candidate) => candidate.pass));
});
