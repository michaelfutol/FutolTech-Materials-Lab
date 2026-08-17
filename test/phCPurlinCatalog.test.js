import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import {
  idealizedLippedCProperties,
  PH_COLORSTEEL_C_PURLINS,
  PH_C_PURLIN_MARKET_MATRIX,
  PH_C_PURLIN_SECTIONS,
  PH_NOMINAL_C_PURLINS
} from '../src/data/phCPurlinCatalog.js';
import { compareMemberCandidates } from '../src/solver/memberComparison.js';
import { recommendMemberSections } from '../src/solver/sectionRecommender.js';
import { sectionSketchSvg } from '../src/components/sectionSketch.js';

const steel250 = MATERIALS.find((record) => record.id === 'steel-generic-250');

function nominal(size, thicknessMm) {
  const sizeText = size.replace('x', '×');
  return PH_NOMINAL_C_PURLINS.find((section) => (
    section.label.includes(`C-purlin ${sizeText} nominal`)
    && Math.abs(section.thicknessMm - thicknessMm) < 1e-9
  ));
}

test('Philippine C-purlin catalog preserves current source-backed profile and market matrices', () => {
  const marketCombinationCount = Object.values(PH_C_PURLIN_MARKET_MATRIX)
    .reduce((sum, thicknesses) => sum + thicknesses.length, 0);

  assert.equal(PH_COLORSTEEL_C_PURLINS.length, 18);
  assert.equal(marketCombinationCount, 43);
  assert.equal(PH_NOMINAL_C_PURLINS.length, 43);
  assert.equal(PH_C_PURLIN_SECTIONS.length, 61);
  assert.equal(new Set(PH_C_PURLIN_SECTIONS.map((section) => section.id)).size, PH_C_PURLIN_SECTIONS.length);
  assert.deepEqual(Object.keys(PH_C_PURLIN_MARKET_MATRIX), ['2x3', '2x4', '2x6', '2x7', '2x8', '2x10']);
  assert.deepEqual(PH_C_PURLIN_MARKET_MATRIX['2x8'], [1.0, 1.2]);
  assert.deepEqual(PH_C_PURLIN_MARKET_MATRIX['2x10'], [1.2]);
});

test('flat-plate lipped-C gross-property model reproduces the familiar 75x50x15x2 geometry', () => {
  const p = idealizedLippedCProperties({ depthMm: 75, flangeMm: 50, lipMm: 15, thicknessMm: 2 });
  assert.equal(p.areaMm2, 410);
  assert.ok(Math.abs(p.ixMm4 - 406_754.1666666667) < 1e-6);
  assert.ok(Math.abs(p.iyMm4 - 160_639.1056910569) < 1e-6);
  assert.ok(Math.abs(p.zxMm3 - 10_846.77777777778) < 1e-6);
  assert.ok(p.ixMm4 > p.iyMm4);
  assert.ok(p.zxMm3 > p.zyMm3);
});

test('current nominal market presets include thin and heavy local combinations without inventing every supplier range value', () => {
  assert.ok(nominal('2x3', 0.5));
  assert.ok(nominal('2x3', 1.8));
  assert.ok(nominal('2x4', 2.0));
  assert.ok(nominal('2x6', 2.0));
  assert.ok(nominal('2x7', 0.6));
  assert.ok(nominal('2x8', 1.2));
  assert.ok(nominal('2x10', 1.2));
  assert.equal(nominal('2x10', 2.0), undefined);
});

test('rotating the same C-purlin 90 degrees exposes the weak-axis deflection penalty', () => {
  const section = nominal('2x4', 1.2);
  const result = compareMemberCandidates({
    selections: [
      { id: 'upright', material: steel250, preset: section, orientation: 'listed' },
      { id: 'flat', material: steel250, preset: section, orientation: 'rotated' }
    ],
    lengthM: 3,
    loadKN: 0.5,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });

  const upright = result.records.find((record) => record.comparisonId === 'upright');
  const flat = result.records.find((record) => record.comparisonId === 'flat');
  assert.ok(flat.result.maxDeflectionMm > upright.result.maxDeflectionMm * 2);
  assert.ok(flat.result.maxBendingStressMPa > upright.result.maxBendingStressMPa * 2);
  assert.equal(upright.screeningOnly, true);
  assert.equal(flat.screeningOnly, true);
  assert.match(upright.reasons.join(' '), /gross-section elastic screening/i);
  assert.match(sectionSketchSvg(flat.section, 'steel'), /rotate\(90 60 58\)/);
});

test('C-purlins stay out of automatic recommender until cold-formed limit states are implemented', () => {
  const section = nominal('2x4', 1.2);
  const result = recommendMemberSections({
    materials: [steel250],
    presetsByFamily: { steel: [section] },
    familyFilter: 'steel',
    lengthM: 3,
    loadKN: 0.5,
    loadPositionM: 1.5,
    boundary: 'simply-supported',
    deflectionDivisor: 360,
    objective: 'mass'
  });

  assert.equal(result.candidates.length, 0);
  assert.equal(result.best, null);
});
