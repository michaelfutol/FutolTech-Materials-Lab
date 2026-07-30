import test from 'node:test';
import assert from 'node:assert/strict';
import { PH_BAMBOO_MATERIALS, PH_BAMBOO_CULM_PRESETS } from '../src/data/phBambooMaterials.js';
import { evaluateMemberCandidate } from '../src/solver/sectionRecommender.js';
import { calculateSectionProperties } from '../src/solver/sections.js';

test('Kawayan-tinik dataset preserves published permissible and characteristic bending values', () => {
  const material = PH_BAMBOO_MATERIALS[0];
  assert.equal(material.family, 'bamboo');
  assert.equal(material.bendingReferenceMPa, 7.7);
  assert.equal(material.ultimateBendingMPa, 34.6);
  assert.equal(material.elasticModulusMPa, 13_100);
  assert.equal(material.densityKgM3, 570);
});

test('mean middle culm uses hollow circular section properties', () => {
  const preset = PH_BAMBOO_CULM_PRESETS.find((item) => item.id === 'bamboo-blumeana-middle-mean');
  const properties = calculateSectionProperties(preset);
  assert.ok(properties.areaMm2 > 0);
  assert.ok(properties.ixMm4 > 0);
  assert.equal(properties.ixMm4, properties.iyMm4);
});

test('bamboo candidate can be evaluated with unverified usable culm length', () => {
  const material = PH_BAMBOO_MATERIALS[0];
  const preset = PH_BAMBOO_CULM_PRESETS.find((item) => item.id === 'bamboo-blumeana-butt-mean');
  const candidate = evaluateMemberCandidate({
    material,
    preset,
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });
  assert.equal(candidate.family, 'bamboo');
  assert.equal(candidate.stockVerified, false);
  assert.equal(candidate.stockPass, true);
  assert.ok(candidate.strengthRatio > 0);
  assert.ok(candidate.physicalThresholdLoadKN > candidate.referenceThresholdLoadKN);
});
