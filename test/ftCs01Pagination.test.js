import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const legacy = await readFile(new URL('../src/printReport.css', import.meta.url), 'utf8');
const fix = await readFile(new URL('../src/comparePrintDocumentFix.css', import.meta.url), 'utf8');
const pageBox = await readFile(new URL('../src/comparePrintPageBox.css', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 neutralizes legacy content-block page breaks without forcing page-container breaks', () => {
  assert.match(legacy, /body\[data-print-orientation="landscape"\] \.compare-card-grid[\s\S]*break-before:\s*page/);
  assert.match(fix, /\.ft-print-document \.compare-card-grid[\s\S]*break-before:\s*auto\s*!important/);
  assert.match(fix, /page-break-before:\s*auto\s*!important/);

  assert.doesNotMatch(fix, /\.ft-print-page:not\(:last-child\)/);
  assert.doesNotMatch(fix, /break-after:\s*page\s*!important/);
  assert.doesNotMatch(fix, /page-break-after:\s*always\s*!important/);
  assert.doesNotMatch(pageBox, /\.ft-print-page \+ \.ft-print-page[\s\S]*break-before:\s*page/);
  assert.doesNotMatch(pageBox, /page-break-before:\s*always/);
});

test('comparison print loader cache-busts the corrected compatibility stylesheet', () => {
  const baseIndex = loader.indexOf('comparePrintDocument.css?v=20260807-ftcs01');
  const fixIndex = loader.indexOf('comparePrintDocumentFix.css?v=20260808-ftcs01e');
  const pageBoxIndex = loader.indexOf('comparePrintPageBox.css?v=20260807-ftcs01d');
  assert.ok(baseIndex >= 0);
  assert.ok(fixIndex > baseIndex);
  assert.ok(pageBoxIndex > fixIndex);
});
