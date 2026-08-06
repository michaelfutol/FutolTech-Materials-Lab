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

test('every public HTML page loads the shared print report controls', async () => {
  assert.ok(htmlFiles.length >= 8, 'Expected the complete Materials Lab page set.');
  for (const fileName of htmlFiles) {
    const html = await readFile(new URL(`../${fileName}`, import.meta.url), 'utf8');
    assert.match(html, /printReport\.css/, `${fileName} is missing the shared print stylesheet.`);
    assert.match(html, /printReport\.js/, `${fileName} is missing the shared print button script.`);
  }
});

test('shared print report uses a clean A4 browser-print workflow', () => {
  assert.match(printCss, /@page\s*\{[\s\S]*size:\s*A4 portrait/);
  assert.match(printCss, /Microsoft Sans Serif/);
  assert.match(printCss, /thead\s*\{[\s\S]*table-header-group/);
  assert.match(printCss, /overflow:\s*visible\s*!important/);
  assert.match(printScript, /Print \/ Save PDF/);
  assert.match(printScript, /window\.print\(\)/);
});
