import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const typography = await readFile(new URL('../src/printTypography.js', import.meta.url), 'utf8');
const brand = await readFile(new URL('../src/publicBrand.js', import.meta.url), 'utf8');

test('FutolTech typewriter is the default print theme with a modern fallback option', () => {
  assert.match(typography, /const TYPEWRITER = 'typewriter'/);
  assert.match(typography, /const MODERN = 'modern'/);
  assert.match(typography, /defaultTheme: TYPEWRITER/);
  assert.match(typography, /Print font · Typewriter/);
  assert.match(typography, /Print font · Modern/);
  assert.match(typography, /Courier Prime/);
  assert.match(typography, /Courier New/);
  assert.match(brand, /import '\.\/printTypography\.js'/);
});

test('formal typewriter print remains plain white engineering output rather than diary decoration', () => {
  assert.match(typography, /font-size: 11pt/);
  assert.match(typography, /font-size: 10\.8pt/);
  assert.match(typography, /font-size: 8\.8pt/);
  assert.doesNotMatch(typography, /paper texture|notebook|scribble|aged paper|parchment/i);
});
