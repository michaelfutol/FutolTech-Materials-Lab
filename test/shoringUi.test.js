import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, app, timber] = await Promise.all([
  readFile(new URL('../shoring.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/shoring.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/shoringApp.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/phCommonTimberMaterials.js', import.meta.url), 'utf8')
]);

test('shoring page exposes a one-click A4 print or PDF action', () => {
  assert.match(html, /Print \/ Save PDF/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /Build 2026-08-06\.SH3/);
  assert.match(css, /@page\s*\{\s*size:\s*A4 portrait/);
  assert.match(css, /Microsoft Sans Serif/);
  assert.match(css, /@media print/);
});

test('member cards use responsive contained controls rather than fixed overflowing columns', () => {
  assert.match(css, /repeat\(auto-fit, minmax\(235px, 1fr\)\)/);
  assert.match(css, /\.member-selector select, \.member-selector input[^}]*max-width:\s*100%/s);
  assert.match(css, /text-overflow:\s*ellipsis/);
  assert.match(app, /elements\[role\.material\]\.title/);
});

test('common timber labels remain plain local names in active selectors', () => {
  for (const name of ['Apitong', 'Yakal', 'Narra', 'Red Lauan', 'White Lauan']) {
    assert.match(timber, new RegExp(`name: '${name}'`));
  }
  assert.doesNotMatch(timber, /name:\s*`\$\{name\}\s+—\s+provisional/);
});
