import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import {
  TONNE_FORCE_TO_KN,
  convertLoadToKN,
  evaluateMemberCandidate,
  recommendMemberSections
} from '../src/solver/sectionRecommender.js';

test('converts tonne-force to kN', () => {
  assert.ok(Math.abs(convertLoadToKN(1, 'tf') - TONNE_FORCE_TO_KN) < 1e-9);
});

test('wood candidate exposes allowable and rupture thresholds', () => {
  const material = MATERIALS.find((item) => item.family === 'wood');
  const preset = SECTION_PRESETS.wood.find((item) => item.id === 'wood-2x4');
  const result = evaluateMemberCandidate({
    material,
    preset,
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });
  assert.ok(result.allowableThresholdLoadKN > 0);
  assert.ok(result.physicalThresholdLoadKN > result.allowableThresholdLoadKN);
});

test('recommendations rank passing candidates before failing candidates', () => {
  const result = recommendMemberSections({
    materials: MATERIALS,
    presetsByFamily: SECTION_PRESETS,
    familyFilter: 'all',
    lengthM: 2,
    loadKN: 1,
    loadPositionM: 1,
    boundary: 'simply-supported',
    deflectionDivisor: 360,
    objective: 'mass'
  });
  assert.ok(result.candidates.length > 0);
  const firstFailIndex = result.candidates.findIndex((candidate) => !candidate.pass);
  if (firstFailIndex >= 0) {
    assert.ok(result.candidates.slice(0, firstFailIndex).every((candidate) => candidate.pass));
  }
});

test('member beyond material stock boundary is not a no-splice pass', () => {
  const material = MATERIALS.find((item) => item.family === 'wood');
  const preset = SECTION_PRESETS.wood.find((item) => item.id === 'wood-2x6');
  const result = evaluateMemberCandidate({
    material,
    preset,
    lengthM: 4,
    loadKN: 0.5,
    loadPositionM: 2,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });
  assert.equal(result.stockPass, false);
  assert.equal(result.pass, false);
});
