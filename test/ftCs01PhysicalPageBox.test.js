import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pageBox = await readFile(new URL('../src/comparePrintPageBox.css', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('FT-CS-01 owns a unique zero-margin physical page box', () => {
  assert.match(pageBox, /@page\s+ft-cs-01[\s\S]*size:\s*A4 landscape[\s\S]*margin:\s*0/);
  assert.match(pageBox, /\.ft-print-page[\s\S]*page:\s*ft-cs-01\s*!important/);
  assert.match(pageBox, /height:\s*208mm\s*!important/);
});

test('FT-CS-01 relies on page height instead of forced inter-page breaks', () => {
  assert.match(pageBox, /\.ft-print-page \{[\s\S]*break-before:\s*auto\s*!important/);
  assert.match(pageBox, /break-after:\s*auto\s*!important/);
  assert.match(pageBox, /page-break-before:\s*auto\s*!important/);
  assert.match(pageBox, /page-break-after:\s*auto\s*!important/);
  assert.doesNotMatch(pageBox, /\.ft-print-page \+ \.ft-print-page[\s\S]*break-before:\s*page/);
  assert.doesNotMatch(pageBox, /page-break-before:\s*always/);
});

test('page-box override loads after prior FT-CS-01 styles', () => {
  const base = loader.indexOf('comparePrintDocument.css?v=20260807-ftcs01');
  const fix = loader.indexOf('comparePrintDocumentFix.css?v=20260807-ftcs01b');
  const box = loader.indexOf('comparePrintPageBox.css?v=20260807-ftcs01d');
  assert.ok(base >= 0);
  assert.ok(fix > base);
  assert.ok(box > fix);
});
