import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const htmlFiles = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .sort();

const printCss = await readFile(new URL('../src/printReport.css', import.meta.url), 'utf8');
const printScript = await readFile(new URL('../src/printReport.js', import.meta.url), 'utf8');

test('every public HTML page loads print support and uses the simplified public identity', async () => {
  assert.ok(htmlFiles.length >= 8, 'Expected the complete Materials Lab page set.');
  for (const fileName of htmlFiles) {
    const html = await readFile(new URL(`../${fileName}`, import.meta.url), 'utf8');
    assert.match(html, /printReport\.css/, `${fileName} is missing the shared print stylesheet.`);
    assert.match(html, /printReport\.js/, `${fileName} is missing the shared print button script.`);
    assert.doesNotMatch(html, /FutolNative Structures/, `${fileName} still exposes the retired repetitive product name.`);
  }
});

test('shared print report uses restrained old-school engineering output without fixed overlays', () => {
  assert.match(printCss, /@page\s*\{[\s\S]*size:\s*A4 portrait/);
  assert.match(printCss, /@page wide-report[\s\S]*A4 landscape/);
  assert.match(printCss, /margin:\s*10mm 12mm 11mm/);
  assert.match(printCss, /Microsoft Sans Serif/);
  assert.match(printCss, /\.print-letterhead/);
  assert.match(printCss, /\.print-test-arrangement/);
  assert.match(printCss, /\.print-document-footer/);
  assert.doesNotMatch(printCss, /\.print-document-footer\s*\{[\s\S]{0,180}position:\s*fixed/);
  assert.match(printCss, /\.help-icon[\s\S]*display:\s*none\s*!important/);
  assert.match(printCss, /\.compare-limit-controls[\s\S]*display:\s*none\s*!important/);
  assert.match(printCss, /\.compare-table-wrap[\s\S]*break-before:\s*page/);
  assert.match(printCss, /thead\s*\{\s*display:\s*table-header-group/);
  assert.match(printCss, /overflow:\s*visible\s*!important/);
  assert.match(printScript, />Native Structures</);
  assert.match(printScript, /Engineering Calculation & Comparison Report/);
  assert.match(printScript, /FutolTech Engineering and Project Systems/);
  assert.doesNotMatch(printScript, /print-brand-mark/);
  assert.doesNotMatch(printScript, />TOOLS</);
  assert.doesNotMatch(printScript, /TOOLS \| Native Structures/);
  assert.doesNotMatch(printScript, /FutolTech Engineering Tools/);
  assert.doesNotMatch(printScript, /FutolNative Structures/);
  assert.match(printScript, /BEAM BENDING TEST ARRANGEMENT/);
  assert.match(printScript, /COLUMN COMPRESSION TEST ARRANGEMENT/);
  assert.match(printScript, /Michael D Futol, RCE, RMP/);
  assert.match(printScript, /removeLegacyFixedFurniture/);
  assert.match(printScript, /Print \/ Save PDF/);
  assert.match(printScript, /window\.print\(\)/);
  assert.match(printScript, /comparisonLimit\.js\?v=20260806-motion1/);
});
