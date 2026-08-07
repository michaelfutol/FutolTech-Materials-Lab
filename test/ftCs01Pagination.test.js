import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const legacy = await readFile(new URL('../src/printReport.css', import.meta.url), 'utf8');
const fix = await readFile(new URL('../src/comparePrintDocumentFix.css', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 neutralizes the legacy forced page break that can create a blank sheet', () => {
  assert.match(legacy, /body\[data-print-orientation="landscape"\] \.compare-card-grid[\s\S]*break-before:\s*page/);
  assert.match(fix, /\.ft-print-document \.compare-card-grid[\s\S]*break-before:\s*auto\s*!important/);
  assert.match(fix, /page-break-before:\s*auto\s*!important/);
  assert.match(fix, /\.ft-print-page:not\(:last-child\)[\s\S]*break-after:\s*page\s*!important/);
  assert.match(fix, /\.ft-print-page:last-child[\s\S]*break-after:\s*auto\s*!important/);
});

test('comparison print loader applies the pagination fix after the FT-CS-01 stylesheet', () => {
  const baseIndex = loader.indexOf('comparePrintDocument.css?v=20260807-ftcs01');
  const fixIndex = loader.indexOf('comparePrintDocumentFix.css?v=20260807-ftcs01b');
  assert.ok(baseIndex >= 0);
  assert.ok(fixIndex > baseIndex);
});
