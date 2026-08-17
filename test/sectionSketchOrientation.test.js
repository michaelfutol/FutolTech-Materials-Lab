import test from 'node:test';
import assert from 'node:assert/strict';
import { presetsForFamily } from '../src/data/sectionPresets.js';
import { sectionSketchSvg } from '../src/components/sectionSketch.js';

const cPurlin = presetsForFamily('steel').find((preset) => String(preset.id).startsWith('ph-cp-'));
assert.ok(cPurlin, 'Expected at least one Philippine C-purlin preset');

test('C-purlin section sketch preserves all four installation angles', () => {
  for (const degrees of [0, 90, 180, 270]) {
    const svg = sectionSketchSvg({ ...cPurlin, displayRotationDeg: degrees }, 'steel');
    assert.match(svg, new RegExp(`rotate\\(${degrees} 60 58\\)`));
  }
});

test('180 and 270 degree C-purlin views do not collapse to 0 and 90 degrees', () => {
  const svg180 = sectionSketchSvg({ ...cPurlin, displayRotationDeg: 180 }, 'steel');
  const svg270 = sectionSketchSvg({ ...cPurlin, displayRotationDeg: 270 }, 'steel');
  assert.doesNotMatch(svg180, /rotate\(0 60 58\)/);
  assert.doesNotMatch(svg270, /rotate\(90 60 58\)/);
});
