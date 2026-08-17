import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PH_C_PURLIN_SECTIONS } from '../src/data/phCPurlinCatalog.js';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const purlinUi = await readFile(new URL('../src/mainLabCPurlinUi.js', import.meta.url), 'utf8');
const orientationUi = await readFile(new URL('../src/mainLabOrientationUi.js', import.meta.url), 'utf8');

test('main Materials Lab exposes Philippine C-purlins as an explicit section geometry', () => {
  assert.match(indexHtml, /data-section-kind="c-purlin"/);
  assert.match(indexHtml, /C-purlin \/ lipped channel \(PH catalog\)/);
  assert.match(indexHtml, /id="lipInput"/);
  assert.match(indexHtml, /id="cPurlinBoundaryNote"/);
  assert.match(indexHtml, /mainLabCPurlinUi\.js\?v=20260817-cp3/);
});

test('main-lab C-purlin UI uses the source-backed catalog and gross lipped-C property model', () => {
  assert.ok(PH_C_PURLIN_SECTIONS.length >= 61);
  assert.match(purlinUi, /idealizedLippedCProperties/);
  assert.match(purlinUi, /productCategory === 'c-purlin'/);
  assert.match(purlinUi, /Custom measured C-purlin H\/B\/A\/t/);
  assert.match(purlinUi, /Selected market source/);
});

test('C-purlin orientation uses formal 0/90/180/270 degree states without colloquial labels', () => {
  for (const angle of [0, 90, 180, 270]) assert.match(purlinUi, new RegExp(`Orientation ${angle}°`));
  assert.doesNotMatch(purlinUi, /PATAOB|PATAYO/i);
  assert.match(purlinUi, /opening right/);
  assert.match(purlinUi, /opening down/);
  assert.match(purlinUi, /opening left/);
  assert.match(purlinUi, /opening up/);
  assert.match(purlinUi, /effective width/i);
  assert.match(purlinUi, /distortional buckling/i);
  assert.match(purlinUi, /wind uplift/i);
  assert.match(purlinUi, /columnModeButton\.disabled = true/);
  assert.match(orientationUi, /\[0, 90, 180, 270\]/);
});
