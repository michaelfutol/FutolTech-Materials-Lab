import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const css = await readFile(new URL('../src/comparePrintDocument.css', import.meta.url), 'utf8');
const script = await readFile(new URL('../src/comparePrintDocument.js', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 comparison print uses explicit A4 landscape pages instead of fixed overlays', () => {
  assert.match(css, /@page wide-report[\s\S]*margin:\s*0/);
  assert.match(css, /\.ft-print-page[\s\S]*width:\s*296mm/);
  assert.match(css, /height:\s*209mm/);
  assert.doesNotMatch(css, /position:\s*fixed/);
  assert.match(css, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
  assert.match(css, /font-size:\s*10\.5pt/);
});

test('FT-CS-01 renders four in-flow pages with formal FutolTech identity', () => {
  assert.match(script, /FUTOLTECH ENGINEERING AND PROJECT SYSTEMS/);
  assert.match(script, /MICHAEL D FUTOL, RCE, RMP/);
  assert.match(script, /const PAGE_COUNT = 4/);
  assert.match(script, /createPage\(1, false\)/);
  assert.match(script, /createPage\(2, true\)/);
  assert.match(script, /createPage\(3, true\)/);
  assert.match(script, /createPage\(4, true\)/);
  assert.match(script, /Preliminary engineering output — verification required/);
});

test('comparison print loader cache-busts and mounts the explicit print document', () => {
  assert.match(loader, /comparePrintDocument\.css\?v=20260807-ftcs01/);
  assert.match(loader, /comparePrintDocument\.js\?v=20260807-ftcs01/);
  assert.match(loader, /mountExplicitComparisonPrint/);
});
