import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  smoothNailWithdrawalReference,
  nailLateralProportionalLimit,
  recommendedNailPenetrationMm,
  boltDowelBearingReference,
  boltSpacingScreen,
  hankinson,
  arithmeticFastenerGroupUpperBound
} from '../src/solver/connectionResearch.js';

test('smooth nail withdrawal follows FPL metric equation and handbook reduction references', () => {
  const r = smoothNailWithdrawalReference({ specificGravity: 0.55, diameterMm: 3.33, penetrationMm: 50, duration: 'long-term' });
  const expectedN = 54.12 * (0.55 ** 2.5) * 3.33 * 50;
  assert.ok(Math.abs(r.maximumKN - expectedN / 1000) < 1e-12);
  assert.ok(Math.abs(r.longTermReferenceKN - r.maximumKN / 6) < 1e-12);
  assert.ok(Math.abs(r.normalDurationReferenceKN - r.longTermReferenceKN * 1.1) < 1e-12);
});

test('nail lateral reference uses an exact FPL K-table row and checks penetration recommendation', () => {
  const r = nailLateralProportionalLimit({ woodClass: 'hardwood', specificGravity: 0.55, diameterMm: 3.33, penetrationMm: 50 });
  assert.equal(r.k, 69.50);
  assert.equal(r.available, true);
  assert.ok(r.proportionalLimitKN > 0);
  assert.equal(r.penetrationPass, true);
});

test('unclassified coconut-palm material is not silently mapped to hardwood or softwood lateral K values', () => {
  const r = nailLateralProportionalLimit({ woodClass: 'unclassified', specificGravity: 0.55, diameterMm: 3.33, penetrationMm: 50 });
  assert.equal(r.available, false);
  assert.match(r.reason, /coconut palm.*without evidence/i);
});

test('recommended nail penetration transitions from 14D for low density to 10D for dense wood', () => {
  assert.equal(recommendedNailPenetrationMm(0.42, 4).minimumPenetrationMm, 56);
  assert.equal(recommendedNailPenetrationMm(0.61, 4).minimumPenetrationMm, 40);
  const mid = recommendedNailPenetrationMm(0.515, 4);
  assert.ok(mid.minimumPenetrationMm > 40 && mid.minimumPenetrationMm < 56);
});

test('Hankinson interpolation returns the parallel and perpendicular endpoints exactly', () => {
  assert.ok(Math.abs(hankinson({ parallel: 40, perpendicular: 20, angleDeg: 0 }) - 40) < 1e-12);
  assert.ok(Math.abs(hankinson({ parallel: 40, perpendicular: 20, angleDeg: 90 }) - 20) < 1e-12);
});

test('bolt dowel-bearing component follows FPL parallel and perpendicular equations', () => {
  const r0 = boltDowelBearingReference({ specificGravity: 0.55, diameterMm: 12.7, loadToGrainDeg: 0, memberThicknessMm: 50 });
  const r90 = boltDowelBearingReference({ specificGravity: 0.55, diameterMm: 12.7, loadToGrainDeg: 90, memberThicknessMm: 50 });
  assert.ok(Math.abs(r0.parallelMPa - 77.2 * 0.55) < 1e-12);
  assert.ok(Math.abs(r0.bearingMPa - r0.parallelMPa) < 1e-12);
  assert.ok(Math.abs(r90.bearingMPa - r90.perpendicularMPa) < 1e-12);
  assert.equal(r0.projectedAreaMm2, 635);
  assert.ok(r0.bearingCeilingKN > 0);
});

test('bolt spacing screen preserves the public FPL 4D / 5D / 7D / 1.5D rules', () => {
  const hardTension = boltSpacingScreen({ woodClass: 'hardwood', diameterMm: 12, spacingAlongGrainMm: 48, loadedEndDistanceMm: 60, edgeDistanceMm: 18, loadCase: 'tension', loadToGrainDeg: 0 });
  assert.equal(hardTension.minimumSpacingMm, 48);
  assert.equal(hardTension.minimumEndDistanceMm, 60);
  assert.equal(hardTension.minimumEdgeDistanceMm, 18);
  assert.equal(hardTension.spacingPass, true);
  assert.equal(hardTension.endDistancePass, true);
  assert.equal(hardTension.edgeDistancePass, true);

  const softTension = boltSpacingScreen({ woodClass: 'softwood', diameterMm: 12, spacingAlongGrainMm: 48, loadedEndDistanceMm: 84, edgeDistanceMm: 18, loadCase: 'tension', loadToGrainDeg: 0 });
  assert.equal(softTension.minimumEndDistanceMm, 84);
});

test('multiple fastener arithmetic sum is explicitly not promoted to group capacity', () => {
  const r = arithmeticFastenerGroupUpperBound(1.2, 4);
  assert.equal(r.arithmeticSumKN, 4.8);
  assert.match(r.boundary, /not a design group capacity/i);
});

test('Connection Lab page exposes nail, bolt, steel-plate modes and research boundary', async () => {
  const [html, app] = await Promise.all([
    readFile(new URL('../connections.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/connectionApp.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /Connection Lab/);
  assert.match(html, /Nail/);
  assert.match(html, /Bolt \/ steel plate/);
  assert.match(html, /SCREENING/);
  assert.match(html, /Build 2026-08-18\.CON1/);
  assert.match(app, /Wood dowel-bearing Feθ/);
  assert.match(app, /arithmetic.*only/i);
});
