import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css, timber] = await Promise.all([
  readFile(new URL('../shoring.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/shoring.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/data/phCommonTimberMaterials.js', import.meta.url), 'utf8')
]);

test('shoring page exposes one-click A4 print and PDF output', () => {
  assert.match(html, /Print \/ Save PDF/);
  assert.match(html, /window\.print\(\)/);
  assert.match(html, /Build 2026-08-18\.SL1/);
  assert.match(css, /@page\s*\{\s*size:\s*A4 portrait/);
  assert.match(css, /Microsoft Sans Serif/);
  assert.match(css, /@media print/);
  assert.match(css, /thead\s*\{\s*display:\s*table-header-group/);
});

test('print layout removes web chrome and unclamps the shore schedule', () => {
  assert.match(css, /\.status-cluster, \.print-action, #shoringResetButton\s*\{\s*display:\s*none/);
  assert.match(css, /\.shore-table\s*\{\s*max-height:\s*none/);
  assert.match(css, /\.figure-grid > section[\s\S]*break-before:\s*page/);
});

test('active common timber labels stay plain and familiar', () => {
  for (const name of ['Apitong', 'Yakal', 'Narra', 'Red Lauan', 'White Lauan']) {
    assert.match(timber, new RegExp(`name: '${name}'`));
  }
});
