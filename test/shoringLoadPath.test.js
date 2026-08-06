import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEvenPositions,
  calculateShoringAreaLoad,
  evaluateShoringSystem,
  normaliseBraceElevations,
  suggestBraceElevations
} from '../src/solver/shoringLoadPath.js';

const coco = {
  id: 'coco-test', name: 'Coco lumber', family: 'wood', elasticModulusMPa: 13_100,
  densityKgM3: 910, bendingReferenceMPa: 15.4, allowableBendingMPa: 15.4,
  compressionParallelMPa: 46.2, source: { status: 'published' }
};
const steel = {
  id: 'steel-test', name: 'Steel Fy 250 MPa', family: 'steel', elasticModulusMPa: 200_000,
  densityKgM3: 7_850, yieldStrengthMPa: 250, compressionParallelMPa: 250,
  source: { status: 'assumed' }
};
const wood2x3 = { id: 'wood-2x3', label: '2×3', type: 'rectangle', widthMm: 50, depthMm: 75 };
const wood2x4 = { id: 'wood-2x4', label: '2×4', type: 'rectangle', widthMm: 50, depthMm: 100 };
const shs50 = { id: 'shs50', label: 'SHS 50×50×1.5', type: 'rhs', widthMm: 50, depthMm: 50, thicknessMm: 1.5 };

function defaultRecord(overrides = {}) {
  return evaluateShoringSystem({
    slabWidthM: 5,
    slabLengthM: 5,
    slabThicknessMm: 125,
    concreteUnitWeightKNM3: 24,
    plywoodThicknessMm: 12.7,
    plywoodDensityKgM3: 600,
    rebarAllowanceKgfM2: 20,
    constructionLiveLoadKgfM2: 250,
    joistTargetSpacingM: 0.3,
    bearerTargetSpacingM: 0.8,
    shoreTargetSpacingM: 0.8,
    joistMaterial: coco,
    joistPreset: wood2x3,
    bearerMaterial: coco,
    bearerPreset: wood2x4,
    shoreMaterial: coco,
    shorePreset: wood2x3,
    shoreHeightM: 3,
    braceMode: 'auto',
    targetShoreUtilization: 0.8,
    maximumBraceLevels: 4,
    ...overrides
  });
}

test('even grid never exceeds the requested spacing', () => {
  const grid = buildEvenPositions(5, 0.8);
  assert.equal(grid.bayCount, 7);
  assert.equal(grid.positionsM.length, 8);
  assert.ok(grid.actualSpacingM <= 0.8);
  assert.equal(grid.positionsM.at(-1), 5);
});

test('area-load components include fresh concrete, plywood and pour allowances', () => {
  const load = calculateShoringAreaLoad({
    slabThicknessMm: 125,
    concreteUnitWeightKNM3: 24,
    plywoodThicknessMm: 12.7,
    plywoodDensityKgM3: 600,
    rebarAllowanceKgfM2: 20,
    constructionLiveLoadKgfM2: 250,
    miscellaneousLoadKgfM2: 0
  });
  assert.ok(Math.abs(load.freshConcreteKNM2 - 3) < 1e-12);
  assert.ok(load.plywoodKNM2 > 0.07 && load.plywoodKNM2 < 0.08);
  assert.ok(load.totalKNM2 > 5.7 && load.totalKNM2 < 5.8);
});

test('5 by 5 m benchmark creates an explicit 8 by 8 shore grid and conserves vertical load', () => {
  const record = defaultRecord();
  assert.equal(record.counts.joists, 18);
  assert.equal(record.counts.bearers, 8);
  assert.equal(record.counts.shores, 64);
  assert.ok(record.reactionErrorRatio < 1e-8);
  assert.equal(record.shores.filter((shore) => shore.locationType === 'corner').length, 4);
  assert.ok(record.maximumShoreLoadKN > 0);
  assert.equal(record.status, 'SCREENING');
});

test('bearer point loads come from the actual continuous-joist FEM reactions', () => {
  const record = defaultRecord();
  const joistIndex = Math.floor(record.joists.length / 2);
  const bearerIndex = 1;
  const joist = record.joists[joistIndex];
  const actual = record.bearers[bearerIndex].pointLoads[joistIndex].forceKN;
  const expected = joist.supportReactionsKN[bearerIndex].reactionKN;
  assert.ok(Math.abs(actual - expected) < 1e-10);
});

test('continuous joist reactions balance each joist line load', () => {
  const record = defaultRecord();
  record.joists.forEach((joist) => {
    const reactionSum = joist.supportReactionsKN.reduce((sum, reaction) => sum + reaction.reactionKN, 0);
    assert.ok(Math.abs(reactionSum - joist.lineLoadKNM * 5) < 1e-8);
  });
});

test('manual brace levels use the longest actual segment rather than a hard-coded height', () => {
  const levels = normaliseBraceElevations(3, [1.2]);
  assert.deepEqual(levels, [1.2]);
  assert.throws(() => normaliseBraceElevations(3, [0, 1.5]), /strictly between/);
});

test('auto-suggest returns equally spaced brace levels and checks both utilization ratios', () => {
  const suggestion = suggestBraceElevations({
    material: steel,
    preset: shs50,
    heightM: 3,
    axialLoadKN: 15,
    eccentricityMm: 10,
    targetUtilization: 0.8,
    maximumBraceLevels: 4
  });
  const selected = suggestion.recommended;
  selected.elevationsM.forEach((elevation, index) => {
    assert.ok(Math.abs(elevation - 3 * (index + 1) / (selected.count + 1)) < 1e-10);
  });
  assert.ok(Math.abs(selected.assessment.brace.longestUnbracedM - 3 / (selected.count + 1)) < 1e-10);
  if (suggestion.targetMet) {
    assert.ok(selected.assessment.utilization <= 0.8);
    assert.ok(selected.assessment.stressUtilization <= 0.8);
  }
});
