import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/comparePrintDocument.css', import.meta.url), 'utf8');
const browserCss = await readFile(new URL('../src/comparePrintBrowser.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../src/comparePrintDocument.js', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 comparison print remains in-flow and browser-paginated', () => {
  assert.doesNotMatch(css, /position:\s*fixed/);
  assert.match(css, /font-size:\s*10\.5pt/);
  assert.match(browserCss, /@page\s*\{[\s\S]*size:\s*A4 landscape/);
  assert.match(browserCss, /height:\s*auto\s*!important/);
  assert.match(browserCss, /min-height:\s*180mm\s*!important/);
});

test('FT-CS-01 renders six content-safe report sections with formal FutolTech identity', () => {
  assert.match(script, /FUTOLTECH ENGINEERING AND PROJECT SYSTEMS/);
  assert.match(script, /MICHAEL D FUTOL, RCE, RMP/);
  assert.match(script, /const PAGE_COUNT = 6/);
  assert.match(script, /createPage\(1, false\)/);
  assert.match(script, /createPage\(2, true\)/);
  assert.match(script, /createPage\(3, true\)/);
  assert.match(script, /createPage\(4, true\)/);
  assert.match(script, /createPage\(5, true\)/);
  assert.match(script, /createPage\(6, true\)/);
  assert.match(script, /Preliminary engineering output — verification required/);
});

test('comparison print loader cache-busts and mounts the six-page browser build', () => {
  assert.match(loader, /comparePrintDocument\.css\?v=20260807-ftcs01/);
  assert.match(loader, /comparePrintBrowser\.css\?v=20260808-ftcs01g/);
  assert.match(loader, /comparePrintDocument\.js\?v=20260808-ftcs01g/);
  assert.match(loader, /mountExplicitComparisonPrint/);
});
