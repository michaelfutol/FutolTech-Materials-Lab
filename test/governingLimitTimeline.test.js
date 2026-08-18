import test from 'node:test';
import assert from 'node:assert/strict';
import { beamGoverningLimitTimeline, columnGoverningLimitTimeline, timelineProgress } from '../src/solver/governingLimitTimeline.js';

test('coco chronology orders serviceability, allowable reference and rupture terminal', () => {
  const t = beamGoverningLimitTimeline({
    family: 'wood', currentLoadKN: 1, currentDeflectionMm: 2, deflectionLimitMm: 8,
    currentStressMPa: 10, allowableBendingMPa: 15.4, ultimateBendingMPa: 72.9
  });
  assert.deepEqual(t.events.map((e) => e.id), ['working-reference', 'serviceability', 'rupture-reference']);
  assert.equal(t.terminalEvent.id, 'rupture-reference');
  assert.equal(t.terminalEvent.terminal, true);
  assert.ok(Math.abs(t.terminalEvent.loadKN - 7.29) < 1e-12);
});

test('ordinary steel stops at first yield and never labels Fy as fracture', () => {
  const t = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 1, currentDeflectionMm: 1, deflectionLimitMm: 6,
    currentStressMPa: 50, yieldStrengthMPa: 250
  });
  assert.equal(t.terminalEvent.id, 'first-yield');
  assert.equal(t.terminalEvent.loadKN, 5);
  assert.match(t.terminalEvent.note, /first yield, not fracture/i);
  assert.ok(!t.events.some((e) => e.type === 'rupture'));
});

test('C-purlin or angle style screening stops at gross first-yield screen', () => {
  const t = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 1, currentDeflectionMm: 1, deflectionLimitMm: 6,
    currentStressMPa: 100, yieldStrengthMPa: 250, screeningOnly: true, screeningLabel: 'gross angle leg-axis'
  });
  assert.equal(t.terminalEvent.id, 'gross-yield-screen');
  assert.equal(t.terminalEvent.status, 'SCREENING');
  assert.match(t.terminalEvent.label, /ANGLE LEG-AXIS FIRST-YIELD SCREEN/);
  assert.match(t.boundary, /instability\/local-failure/i);
});

test('provisional hardwood with no rupture stops at last working reference', () => {
  const t = beamGoverningLimitTimeline({
    family: 'wood', currentLoadKN: 2, currentDeflectionMm: 2, deflectionLimitMm: 8,
    currentStressMPa: 20, allowableBendingMPa: 30
  });
  assert.equal(t.terminalEvent.id, 'working-reference');
  assert.equal(t.terminalEvent.loadKN, 3);
  assert.ok(!t.events.some((e) => e.type === 'rupture'));
});

test('column chronology stops at earliest implemented adverse limit', () => {
  const t = columnGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 10, predictedCapacityKN: 85, eulerCriticalKN: 120,
    currentCompressionStressMPa: 40, compressionStrengthMPa: 250
  });
  assert.equal(t.terminalEvent.id, 'compression-reference');
  assert.equal(t.terminalEvent.loadKN, 62.5);
  assert.ok(t.events.every((e) => e.loadKN <= 62.5 + 1e-9));
});

test('timeline progress normalizes each visible event to the terminal load', () => {
  const events = [{ id: 'a', loadKN: 2 }, { id: 'b', loadKN: 8 }];
  const p = timelineProgress(events, 8);
  assert.equal(p[0].progress, 0.25);
  assert.equal(p[1].progress, 1);
});
