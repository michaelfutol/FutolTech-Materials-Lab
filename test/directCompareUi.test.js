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

test('direct comparison exposes the old-school engineering print build', () => {
  assert.match(compareHtml, /compare\.css\?v=20260806-1/);
  assert.match(compareHtml, /compareApp\.js\?v=20260806-1/);
  assert.match(compareHtml, /tooltips\.js\?v=20260806-1/);
  assert.match(compareHtml, /printReport\.css\?v=20260807-oldschool1/);
  assert.match(compareHtml, /printReport\.js\?v=20260807-oldschool1/);
  assert.match(compareHtml, /printLetterhead\.css\?v=20260807-letterhead1/);
  assert.match(compareHtml, /printCompanyIdentity\.js\?v=20260807-letterhead1/);
  assert.match(compareHtml, /Build 2026-08-17\.1/);
  assert.match(compareHtml, /Structural Member Comparison/);
});

test('direct comparison labels C-purlin PATAYO and PATAOB as explicit orientation screening', () => {
  assert.match(compareHtml, /cPurlinOrientationUi\.js\?v=20260817-1/);
  assert.match(compareHtml, /PATAYO/);
  assert.match(compareHtml, /PATAOB/);
  assert.match(compareHtml, /weak-axis screening/);
  assert.match(cPurlinOrientationUi, /PATAYO · web vertical · strong-axis screening/);
  assert.match(cPurlinOrientationUi, /PATAOB 90° · web horizontal · weak-axis screening/);
  assert.match(cPurlinOrientationUi, /SCREENING/);
  assert.match(cPurlinOrientationUi, /ph-cp-/);
});
