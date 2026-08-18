import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const figureStyle = await readFile(new URL('../src/figureStyle.js', import.meta.url), 'utf8');
const brand = await readFile(new URL('../src/publicBrand.js', import.meta.url), 'utf8');

test('pencil figure style is optional and standard engineering linework remains the default', () => {
  assert.match(figureStyle, /const ENGINEERING = 'engineering'/);
  assert.match(figureStyle, /const PENCIL = 'pencil'/);
  assert.match(figureStyle, /defaultStyle: ENGINEERING/);
  assert.match(figureStyle, /Figure style · Pencil/);
  assert.match(figureStyle, /Figure style · Engineering/);
  assert.match(brand, /import '\.\/figureStyle\.js'/);
});

test('pencil rendering uses a visual SVG filter without rewriting engineering geometry', () => {
  assert.match(figureStyle, /feTurbulence/);
  assert.match(figureStyle, /feDisplacementMap/);
  assert.match(figureStyle, /scale', '0\.65'/);
  assert.match(figureStyle, /geometryRule: 'visual-filter-only; solver coordinates remain unchanged'/);
  assert.doesNotMatch(figureStyle, /setAttribute\(['"]d['"]/);
  assert.doesNotMatch(figureStyle, /setAttribute\(['"]points['"]/);
});

test('handwritten styling is limited to SVG figure text and does not replace report equations or tables', () => {
  assert.match(figureStyle, /svg\[data-ft-figure-style="pencil"\] text/);
  assert.match(figureStyle, /Segoe Print/);
  assert.match(figureStyle, /Bradley Hand ITC/);
  assert.doesNotMatch(figureStyle, /\.ft-print-document\s*\{[^}]*font-family:[^}]*Segoe Print/s);
});
