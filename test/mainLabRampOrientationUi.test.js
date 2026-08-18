import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const rampUi = await readFile(new URL('../src/mainLabFailureRamp.js', import.meta.url), 'utf8');
const orientationUi = await readFile(new URL('../src/mainLabOrientationUi.js', import.meta.url), 'utf8');
const angleUi = await readFile(new URL('../src/mainLabAngleUi.js', import.meta.url), 'utf8');

test('main Materials Lab loads the one-touch automatic ramp, angle catalog geometry, and four-way orientation modules', () => {
  assert.match(indexHtml, /Build 2026-08-18\.SL2/);
  assert.match(indexHtml, /option value="angle">Angle bar \/ L-section/);
  assert.match(indexHtml, /app\.js\?v=20260818-angle2/);
  assert.match(indexHtml, /mainLabOrientationUi\.js\?v=20260818-angle1/);
  assert.match(indexHtml, /mainLabFailureRamp\.js\?v=20260817-ramp1/);
  assert.match(indexHtml, /Rotate \+90°/);
  assert.match(orientationUi, /import '\.\/mainLabAngleUi\.js'/);
  assert.match(angleUi, /Angle-bar engineering boundary/);
  assert.match(angleUi, /Column compression is intentionally disabled for angle bars/);
});

test('automatic ramp distinguishes rupture, yield, gross-yield screening and last verified limits', () => {
  assert.match(rampUi, /AUTO LOAD → RUPTURE REFERENCE/);
  assert.match(rampUi, /AUTO LOAD → FIRST YIELD/);
  assert.match(rampUi, /AUTO LOAD → GROSS YIELD SCREEN/);
  assert.match(rampUi, /AUTO LOAD → LAST VERIFIED LIMIT/);
  assert.match(rampUi, /RUPTURE REFERENCE REACHED/);
  assert.match(rampUi, /FIRST YIELD REFERENCE REACHED/);
  assert.match(rampUi, /STOP/);
});

test('orientation UI provides visual 0, 90, 180 and 270 degree choices for all section types', () => {
  assert.match(orientationUi, /\[0, 90, 180, 270\]/);
  assert.match(orientationUi, /sectionKind/);
  assert.match(orientationUi, /c-purlin/);
  assert.match(orientationUi, /angle/);
  assert.match(orientationUi, /rhs/);
  assert.match(orientationUi, /chs/);
  assert.match(orientationUi, /round/);
  assert.match(orientationUi, /0° ≡ 180°/);
  assert.match(orientationUi, /90° ≡ 270°/);
  assert.doesNotMatch(orientationUi, /PATAOB|PATAYO/i);
});
