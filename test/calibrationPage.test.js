import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../calibration.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/calibrationApp.js', import.meta.url), 'utf8');
const solver = await readFile(new URL('../src/solver/testCalibration.js', import.meta.url), 'utf8');

test('Calibration Lab exposes raw CSV schema metadata and additive calibration boundary', () => {
  assert.match(html, /Physical-Test Calibration/);
  assert.match(html, /specimen_id, displacement_mm, measured_load_kN/);
  assert.match(html, /predicted_load_kN, event/);
  assert.match(html, /Raw CSV — preserved verbatim/);
  assert.match(html, /does not silently replace published E, strength, connection capacity, or composite-action assumptions/);
  assert.match(html, /printReport\.js\?v=20260806-brand1/);
});

test('Calibration implementation preserves raw input and does not synthesize missing prediction', () => {
  assert.match(solver, /rawCsv: text/);
  assert.match(solver, /immutableSource/);
  assert.match(solver, /USER DATA \/ UNVERIFIED/);
  assert.match(solver, /never silently overwrite published or measured source properties/);
  assert.match(app, /predictedRows\.length > 1/);
  assert.match(app, /Synthetic example for software verification\. Not physical-test evidence\./);
});
