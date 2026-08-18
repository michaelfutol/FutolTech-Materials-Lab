import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const compareHtml = await readFile(new URL('../compare.html', import.meta.url), 'utf8');
const compareCss = await readFile(new URL('../src/compare.css', import.meta.url), 'utf8');
const compareApp = await readFile(new URL('../src/compareApp.js', import.meta.url), 'utf8');
const cPurlinOrientationUi = await readFile(new URL('../src/cPurlinOrientationUi.js', import.meta.url), 'utf8');
const tooltipApp = await readFile(new URL('../src/components/tooltips.js', import.meta.url), 'utf8');

test('direct comparison page exposes bending, compression and intermediate bracing controls', () => {
  assert.match(compareHtml, /id="compareBeamModeButton"/);
  assert.match(compareHtml, /id="compareColumnModeButton"/);
  assert.match(compareHtml, /id="compareColumnBoundarySelect"/);
  assert.match(compareHtml, /id="compareEccentricityInput"/);
  assert.match(compareHtml, /id="compareBracePointsSelect"/);
  assert.match(compareApp, /intermediateBracePoints/);
});

test('direct comparison defines explicit SVG solid and void fills', () => {
  assert.match(compareCss, /\.section-sketch__solid\s*\{/);
  assert.match(compareCss, /\.section-sketch__void\s*\{/);
  assert.match(compareCss, /section-sketch__solid[\s\S]*fill:/);
  assert.match(compareCss, /section-sketch__void[\s\S]*fill:/);
});

test('hover and keyboard-focus explanations are wired to controls and generated metrics', () => {
  assert.match(compareHtml, /data-help=/);
  assert.match(compareApp, /helpLabel/);
  assert.match(compareCss, /\.app-tooltip/);
  assert.match(tooltipApp, /focusin/);
  assert.match(tooltipApp, /pointerover/);
});

test('direct comparison exposes the engineering print build', () => {
  assert.match(compareHtml, /compare\.css\?v=20260806-1/);
  assert.match(compareHtml, /compareApp\.js\?v=20260806-1/);
  assert.match(compareHtml, /tooltips\.js\?v=20260806-1/);
  assert.match(compareHtml, /printReport\.css\?v=20260807-oldschool1/);
  assert.match(compareHtml, /printReport\.js\?v=20260807-oldschool1/);
  assert.match(compareHtml, /printLetterhead\.css\?v=20260807-letterhead1/);
  assert.match(compareHtml, /printCompanyIdentity\.js\?v=20260818-manual1/);
  assert.match(compareHtml, /Build 2026-08-18\.2/);
  assert.match(compareHtml, /Structural Member Comparison/);
});

test('direct comparison uses a separate four-way C-purlin UI bridged to the binary solver axis', () => {
  assert.match(compareHtml, /cPurlinOrientationUi\.js\?v=20260818-orient2/);
  assert.match(compareHtml, /Orientation 0° \/ 90° \/ 180° \/ 270°/);
  assert.match(compareHtml, /0° and 180° use the same gross major-axis screening properties/);
  assert.match(compareHtml, /90° and 270° use the same gross minor-axis screening properties/);
  assert.doesNotMatch(compareHtml, /PATAOB|PATAYO/i);

  for (const degrees of [0, 90, 180, 270]) {
    assert.match(cPurlinOrientationUi, new RegExp(`Orientation ${degrees}°`));
  }
  assert.match(cPurlinOrientationUi, /data-c-purlin-orientation-display/);
  assert.match(cPurlinOrientationUi, /\.map\(\(degrees\) => `<option value="\$\{degrees\}">/);
  assert.match(cPurlinOrientationUi, /function solverOrientation/);
  assert.match(cPurlinOrientationUi, /degrees\) % 180 === 90 \? 'rotated' : 'listed'/);
  assert.match(cPurlinOrientationUi, /coreSelect\.hidden = true/);
  assert.match(cPurlinOrientationUi, /setCoreOrientation\(coreSelect, degrees, \{ dispatch: true \}\)/);
  assert.match(cPurlinOrientationUi, /selected\.dataset\.orientationDeg = String\(normalizedDegrees\)/);
  assert.match(cPurlinOrientationUi, /displayRotationDeg: normalizedDegrees/);
  assert.match(cPurlinOrientationUi, /container\.innerHTML = sectionSketchSvg/);
  assert.doesNotMatch(cPurlinOrientationUi, /option180\.value = 'listed'/);
  assert.doesNotMatch(cPurlinOrientationUi, /option270\.value = 'rotated'/);
  assert.match(cPurlinOrientationUi, /SCREENING/);
});

test('C-purlin enhancement observer is idempotent and batched to prevent a DOM feedback loop', () => {
  assert.match(cPurlinOrientationUi, /function setTextIfChanged/);
  assert.match(cPurlinOrientationUi, /node\.textContent !== nextText/);
  assert.match(cPurlinOrientationUi, /let enhancementQueued = false/);
  assert.match(cPurlinOrientationUi, /new MutationObserver\(scheduleEnhancements\)/);
  assert.match(cPurlinOrientationUi, /queueMicrotask/);
  assert.doesNotMatch(cPurlinOrientationUi, /new MutationObserver\(applyEnhancements\)/);
});
