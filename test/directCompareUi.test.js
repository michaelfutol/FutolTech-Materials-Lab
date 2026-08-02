import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const compareHtml = await readFile(new URL('../compare.html', import.meta.url), 'utf8');
const compareCss = await readFile(new URL('../src/compare.css', import.meta.url), 'utf8');

test('direct comparison page exposes beam and column modes', () => {
  assert.match(compareHtml, /id="compareBeamModeButton"/);
  assert.match(compareHtml, /id="compareColumnModeButton"/);
  assert.match(compareHtml, /id="compareColumnBoundarySelect"/);
  assert.match(compareHtml, /id="compareEccentricityInput"/);
});

test('direct comparison defines explicit SVG solid and void fills', () => {
  assert.match(compareCss, /\.section-sketch__solid\s*\{/);
  assert.match(compareCss, /\.section-sketch__void\s*\{/);
  assert.match(compareCss, /section-sketch__solid[\s\S]*fill:/);
  assert.match(compareCss, /section-sketch__void[\s\S]*fill:/);
});

test('direct comparison assets are cache-busted for curated hardwood acceptance', () => {
  assert.match(compareHtml, /compare\.css\?v=20260802-1/);
  assert.match(compareHtml, /compareApp\.js\?v=20260802-1/);
  assert.match(compareHtml, /Build 2026-08-02\.1/);
  assert.match(compareHtml, /common Philippine hardwoods/i);
});
