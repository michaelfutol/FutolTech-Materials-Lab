import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const browser = await readFile(new URL('../src/comparePrintBrowser.css', import.meta.url), 'utf8');

test('FT-CS-01 lets @page own the physical A4 landscape sheet', () => {
  assert.match(browser, /@page\s*\{[\s\S]*size:\s*A4 landscape[\s\S]*margin:\s*10mm 14mm 10mm 16mm/);
  assert.match(browser, /height:\s*auto\s*!important/);
  assert.match(browser, /min-height:\s*180mm\s*!important/);
  assert.doesNotMatch(browser, /height:\s*20[89]mm\s*!important/);
  assert.doesNotMatch(browser, /page:\s*ft-cs-01/);
});

test('FT-CS-01 deliberately advances after a content-sized report section, not a full-sheet box', () => {
  assert.match(browser, /break-after:\s*page\s*!important/);
  assert.match(browser, /page-break-after:\s*always\s*!important/);
  assert.match(browser, /\.ft-print-page:last-child[\s\S]*break-after:\s*auto\s*!important/);
  assert.match(browser, /overflow:\s*visible\s*!important/);
});
