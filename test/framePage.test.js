import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../frame.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/frameApp.js', import.meta.url), 'utf8');
const solver = await readFile(new URL('../src/solver/frame2d.js', import.meta.url), 'utf8');
const brace = await readFile(new URL('../src/solver/braceSensitivity.js', import.meta.url), 'utf8');

test('NF-001 page exposes rigid pin explicit semi-rigid and brace-sensitivity states without a fastener shortcut', () => {
  assert.match(html, /Frame Analyzer/);
  assert.match(html, /Rigid idealization/);
  assert.match(html, /Semi-rigid · explicit kθ/);
  assert.match(html, /Pin \/ moment release/);
  assert.match(html, /No value is inferred from nail\/bolt count/);
  assert.match(html, /P–Δ/);
  assert.match(html, /Explicit connection-threshold redistribution/);
  assert.match(html, /Diagonal brace sensitivity adviser/);
  assert.match(html, /STIFFNESS SENSITIVITY ONLY/);
  assert.match(html, /does not claim brace or brace-connection capacity/);
  assert.match(html, /printReport\.js\?v=20260806-brand1/);
});

test('frame implementation keeps spring stiffness capacity degradation and brace evidence explicit', () => {
  assert.match(solver, /explicit joint spring stiffness/i);
  assert.match(solver, /does not infer them from fastener count/i);
  assert.match(solver, /PIECEWISE ELASTIC CONNECTION REDISTRIBUTION/);
  assert.match(solver, /SECOND ORDER ELASTIC P-DELTA/);
  assert.match(app, /UNVERIFIED SENSITIVITY/);
  assert.match(app, /Connection Lab fastener count is deliberately not converted to stiffness or capacity here/);
  assert.match(app, /UNRATED brace capacity/);
  assert.match(brace, /STIFFNESS SENSITIVITY ONLY/);
  assert.match(brace, /capacityStatus: 'UNRATED'/);
  assert.match(brace, /does not check brace tension\/compression capacity/i);
  assert.doesNotMatch(app, /nailCount|boltCount/);
});
