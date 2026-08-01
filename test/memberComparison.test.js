import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import { compareCompressionCandidates, compareMemberCandidates } from '../src/solver/memberComparison.js';

function material(id) {
  return MATERIALS.find((record) => record.id === id);
}
function preset(family, id) {
  return SECTION_PRESETS[family].find((record) => record.id === id);
}

const commonSelections = () => [
  { id: 'pipe', material: material('steel-generic-250'), preset: preset('steel', 'ph-pipe-PNS26 light-40'), orientation: 'listed' },
  { id: 'shs', material: material('steel-generic-250'), preset: preset('steel', 'shs-50-15'), orientation: 'listed' },
  { id: 'coco', material: material('coco-uh-2007-average'), preset: preset('wood', 'wood-2x4'), orientation: 'listed' }
];

test('common comparison evaluates 1.5-inch GI pipe, 2x2 SHS, and 2x4 coco under identical bending', () => {
  const result = compareMemberCandidates({
    selections: commonSelections(),
    lengthM: 3,
    loadKN: 0.980665,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });

  assert.equal(result.mode, 'beam');
  assert.equal(result.records.length, 3);
  assert.ok(result.records.every((record) => Number.isFinite(record.result.maxDeflectionMm)));
  assert.ok(result.records.every((record) => Number.isFinite(record.result.maxBendingStressMPa)));
  assert.match(result.records[0].displayMaterialName, /^GI pipe/);
  assert.doesNotMatch(result.records[0].sectionLabel, /BI/i);
  assert.ok(result.winners.leastDeflection);
  assert.ok(result.winners.lowestStrengthUse);
  assert.ok(result.winners.highestPhysicalThreshold);
});

test('direct compression comparison evaluates the same three members with weak-axis buckling', () => {
  const result = compareCompressionCandidates({
    selections: commonSelections(),
    lengthM: 3,
    axialLoadKN: 0.980665,
    eccentricityMm: 0,
    boundary: 'pinned-pinned'
  });

  assert.equal(result.mode, 'compression');
  assert.equal(result.records.length, 3);
  assert.ok(result.records.every((record) => Number.isFinite(record.result.predictedCapacityKN)));
  assert.ok(result.records.every((record) => Number.isFinite(record.result.slenderness)));
  assert.ok(result.records.every((record) => record.result.governingI === Math.min(record.properties.ixMm4, record.properties.iyMm4)));
  assert.ok(result.winners.highestCompressionCapacity);
  assert.ok(result.winners.lowestCompressionUse);
  assert.ok(result.winners.leastShortening);
});

test('fixed-fixed restraint raises idealised Euler capacity above pin-pin for the same member', () => {
  const selections = commonSelections().slice(0, 2);
  const pinned = compareCompressionCandidates({
    selections,
    lengthM: 3,
    axialLoadKN: 0.5,
    eccentricityMm: 0,
    boundary: 'pinned-pinned'
  });
  const fixed = compareCompressionCandidates({
    selections,
    lengthM: 3,
    axialLoadKN: 0.5,
    eccentricityMm: 0,
    boundary: 'fixed-fixed'
  });

  assert.ok(fixed.records[0].result.eulerCriticalKN > pinned.records[0].result.eulerCriticalKN);
  assert.equal(fixed.records[0].result.k, 0.5);
  assert.equal(pinned.records[0].result.k, 1);
});

test('compression eccentricity increases amplified stress use', () => {
  const selections = commonSelections().slice(0, 2);
  const concentric = compareCompressionCandidates({
    selections,
    lengthM: 3,
    axialLoadKN: 1,
    eccentricityMm: 0,
    boundary: 'pinned-pinned'
  });
  const eccentric = compareCompressionCandidates({
    selections,
    lengthM: 3,
    axialLoadKN: 1,
    eccentricityMm: 20,
    boundary: 'pinned-pinned'
  });

  assert.ok(eccentric.records[0].stressRatio > concentric.records[0].stressRatio);
  assert.ok(eccentric.records[0].result.maxCompressionStressMPa > concentric.records[0].result.maxCompressionStressMPa);
});

test('comparison rejects fewer than two active members', () => {
  assert.throws(() => compareMemberCandidates({
    selections: [{ id: 'only', material: material('steel-generic-250'), preset: preset('steel', 'shs-50-15') }],
    lengthM: 3,
    loadKN: 1,
    loadPositionM: 1.5
  }), /two or three/i);
});

test('PNS N40 GI pipe exposes the familiar 1.5-inch nominal designation', () => {
  const n40 = preset('steel', 'ph-pipe-PNS26 light-40');
  assert.equal(n40.nominalInchLabel, '1½');
  assert.match(n40.label, /^GI pipe/);
  assert.match(n40.label, /1½ in nominal/);
});
