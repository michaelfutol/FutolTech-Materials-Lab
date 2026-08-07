import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const legacy = await readFile(new URL('../src/printReport.css', import.meta.url), 'utf8');
const browser = await readFile(new URL('../src/comparePrintBrowser.css', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 browser stylesheet neutralizes legacy content breaks', () => {
  assert.match(legacy, /body\[data-print-orientation="landscape"\] \.compare-card-grid[\s\S]*break-before:\s*page/);
  assert.match(browser, /\.ft-print-document \.compare-card-grid[\s\S]*break-before:\s*auto\s*!important/);
  assert.match(browser, /page-break-before:\s*auto\s*!important/);
});

test('comparison print loader uses one browser pagination layer after the base print stylesheet', () => {
  const baseIndex = loader.indexOf('comparePrintDocument.css?v=20260807-ftcs01');
  const browserIndex = loader.indexOf('comparePrintBrowser.css?v=20260808-ftcs01g');
  assert.ok(baseIndex >= 0);
  assert.ok(browserIndex > baseIndex);
  assert.doesNotMatch(loader, /comparePrintDocumentFix\.css/);
  assert.doesNotMatch(loader, /comparePrintPageBox\.css/);
});
