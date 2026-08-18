import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('../compare.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/printLetterhead.css', import.meta.url), 'utf8');
const identity = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('comparison print reserves safe bands for a repeated company letterhead and footer', () => {
  assert.match(html, /printLetterhead\.css\?v=20260807-letterhead1/);
  assert.match(html, /printCompanyIdentity\.js\?v=20260818-manual1/);
  assert.match(css, /@page wide-report[\s\S]*margin:\s*25mm 16mm 20mm/);
  assert.match(css, /\.print-letterhead[\s\S]*position:\s*fixed\s*!important/);
  assert.match(css, /top:\s*-20mm/);
  assert.match(css, /\.print-document-footer[\s\S]*position:\s*fixed\s*!important/);
  assert.match(css, /bottom:\s*-15\.5mm/);
  assert.match(css, /font-size:\s*11pt\s*!important/);
});

test('comparison print uses the formal company and engineer identity', () => {
  assert.match(identity, /FUTOLTECH ENGINEERING AND PROJECT SYSTEMS/);
  assert.match(identity, /MICHAEL D FUTOL, RCE, RMP/);
  assert.match(identity, /Materials Lab/);
  assert.doesNotMatch(identity, /Native Structures/);
});
