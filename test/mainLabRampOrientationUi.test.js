import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const rampUi = await readFile(new URL('../src/mainLabFailureRamp.js', import.meta.url), 'utf8');
const failurePhysicsUi = await readFile(new URL('../src/failurePhysicsUi.js', import.meta.url), 'utf8');
const simulationUi = await readFile(new URL('../src/simulationPlaybackUi.js', import.meta.url), 'utf8');
const timelineSolver = await readFile(new URL('../src/solver/governingLimitTimeline.js', import.meta.url), 'utf8');
const orientationUi = await readFile(new URL('../src/mainLabOrientationUi.js', import.meta.url), 'utf8');
const angleUi = await readFile(new URL('../src/mainLabAngleUi.js', import.meta.url), 'utf8');

test('main Materials Lab loads governing-limit, failure interpretation, specimen simulation, angle geometry, and four-way orientation modules', () => {
  assert.match(indexHtml, /Build 2026-08-19\.SIM1/);
  assert.match(indexHtml, /Failure Physics v1 · active/);
  assert.match(indexHtml, /Specimen Simulation · Phase 2/);
  assert.match(indexHtml, /option value="angle">Angle bar \/ L-section/);
  assert.match(indexHtml, /app\.js\?v=20260818-angle2/);
  assert.match(indexHtml, /mainLabOrientationUi\.js\?v=20260818-angle1/);
  assert.match(indexHtml, /mainLabFailureRamp\.js\?v=20260817-ramp1/);
  assert.match(indexHtml, /failurePhysicsUi\.js\?v=20260818-fp1/);
  assert.match(indexHtml, /simulationPlaybackUi\.js\?v=20260819-sim1/);
  assert.match(indexHtml, /Rotate \+90°/);
  assert.match(orientationUi, /import '\.\/mainLabAngleUi\.js'/);
  assert.match(angleUi, /Angle-bar engineering boundary/);
  assert.match(angleUi, /Column compression is intentionally disabled for angle bars/);
  assert.match(failurePhysicsUi, /What physical threshold has actually been reached/);
  assert.match(failurePhysicsUi, /local buckling · pending/);
  assert.match(simulationUi, /Specimen Simulation Console/);
  assert.match(simulationUi, /Virtual loading rate, kN\/s/);
  assert.match(simulationUi, /quasi-static ramp from zero/);
});

test('Run to Governing Limit exposes an event timeline with pause, step and stop controls', () => {
  assert.match(rampUi, /RUN TO GOVERNING LIMIT/);
  assert.match(rampUi, /failure-ramp-events/);
  assert.match(rampUi, /failure-ramp-marker/);
  assert.match(rampUi, /PAUSE/);
  assert.match(rampUi, /STEP/);
  assert.match(rampUi, /STOP/);
  assert.match(rampUi, /beamGoverningLimitTimeline/);
  assert.match(rampUi, /columnGoverningLimitTimeline/);
  assert.match(timelineSolver, /SERVICEABILITY LIMIT/);
  assert.match(timelineSolver, /FIRST YIELD/);
  assert.match(timelineSolver, /RUPTURE REFERENCE/);
  assert.match(timelineSolver, /SCREENING/);
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
