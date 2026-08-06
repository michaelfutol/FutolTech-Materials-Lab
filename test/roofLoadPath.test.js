import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS } from '../src/data/materials.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import {
  buildJoistPositions,
  evaluateRoofRafter,
  generateRoofJoistReactions,
  KGF_M2_TO_KN_M2
} from '../src/solver/roofLoadPath.js';

function material(id) {
  return MATERIALS.find((record) => record.id === id);
}
function preset(family, id) {
  return SECTION_PRESETS[family].find((record) => record.id === id);
}

const baseInput = () => ({
  material: material('coco-uh-2007-average'),
  preset: preset('wood', 'wood-2x4'),
  orientation: 'listed',
  rafterLengthM: 5,
  joistSpanM: 5,
  joistSpacingM: 0.3,
  areaLoadKNM2: 100 * KGF_M2_TO_KN_M2,
  supportedSides: 1,
  joistSelfWeightKNM: 0,
  deflectionDivisor: 240
});

test('5 m rafter at 300 mm spacing creates the actual joist intersection sequence', () => {
  const positions = buildJoistPositions(5, 0.3);
  assert.equal(positions.length, 18);
  assert.equal(positions[0], 0);
  assert.equal(positions.at(-1), 5);
  assert.equal(positions.at(-2), 4.8);
});

test('joist reactions conserve the selected rafter tributary area load', () => {
  const q = 100 * KGF_M2_TO_KN_M2;
  const result = generateRoofJoistReactions({
    rafterLengthM: 5,
    joistSpanM: 5,
    joistSpacingM: 0.3,
    areaLoadKNM2: q,
    supportedSides: 1,
    joistSelfWeightKNM: 0
  });
  const expectedKN = q * 5 * 5 / 2;
  assert.ok(Math.abs(result.totalAppliedToRafterKN - expectedKN) < 1e-9);
  assert.equal(result.selectedRafterTributaryAreaM2, 12.5);
  assert.ok(Math.abs(result.reactions[0].tributaryWidthM - 0.15) < 1e-9);
  assert.ok(Math.abs(result.reactions.at(-1).tributaryWidthM - 0.1) < 1e-9);
});

test('continuous intermediate support balances all generated joist loads', () => {
  const record = evaluateRoofRafter({ ...baseInput(), extraSupportM: 2.5, spliceOnExtraSupport: false });
  const reactionSum = record.result.supportReactionsKN.reduce((sum, support) => sum + support.reactionKN, 0);
  assert.ok(Math.abs(reactionSum - record.loadPath.totalAppliedToRafterKN) < 1e-7);
  assert.equal(record.result.structuralSystem, 'continuous-over-support');
  assert.equal(record.result.supportReactionsKN.length, 3);
});

test('splice directly over a real support analyses separate simple spans', () => {
  const record = evaluateRoofRafter({ ...baseInput(), extraSupportM: 2.5, spliceOnExtraSupport: true });
  assert.equal(record.result.structuralSystem, 'splice-on-support');
  assert.equal(record.result.governingClearSpanM, 2.5);
  assert.deepEqual(record.segmentLengthsM, [2.5, 2.5]);
  const reactionSum = record.result.supportReactionsKN.reduce((sum, support) => sum + support.reactionKN, 0);
  assert.ok(Math.abs(reactionSum - record.loadPath.totalAppliedToRafterKN) < 1e-7);
  assert.match(record.reasons.join(' '), /splice capacity is not checked/i);
});

test('a splice cannot be credited without a real extra support', () => {
  assert.throws(() => evaluateRoofRafter({ ...baseInput(), spliceOnExtraSupport: true }), /requires a real extra support/i);
});

test('one identical roof bay on each side doubles selected rafter load', () => {
  const oneSide = generateRoofJoistReactions({
    rafterLengthM: 5,
    joistSpanM: 5,
    joistSpacingM: 0.3,
    areaLoadKNM2: KGF_M2_TO_KN_M2 * 100,
    supportedSides: 1
  });
  const twoSides = generateRoofJoistReactions({
    rafterLengthM: 5,
    joistSpanM: 5,
    joistSpacingM: 0.3,
    areaLoadKNM2: KGF_M2_TO_KN_M2 * 100,
    supportedSides: 2
  });
  assert.ok(Math.abs(twoSides.totalAppliedToRafterKN - 2 * oneSide.totalAppliedToRafterKN) < 1e-9);
});
