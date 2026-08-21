import test from 'node:test';
import assert from 'node:assert/strict';

import { PH_C_PURLIN_SECTIONS } from '../src/data/phCPurlinCatalog.js';
import {
  governingCommonWindSense,
  orientationAxes,
  resolveRoofLineLoads,
  solveCPurlinLoadCase,
  yieldSequence
} from '../src/solver/cPurlinLoadCases.js';

const preset = PH_C_PURLIN_SECTIONS.find((item) => item.id === 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8');

function near(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test('vertical gravity resolves into roof-normal and down-slope components', () => {
  const loads = resolveRoofLineLoads({ mode:'gravity', slopeDeg:30, tributaryWidthM:1, deadLoadKPa:1, roofLiveLoadKPa:0 });
  near(loads.gravityVerticalKNM, 1);
  near(loads.normalKNM, Math.cos(Math.PI / 6));
  near(loads.parallelKNM, .5);
  assert.equal(loads.normalDirection, 'downward');
});

test('uplift wind can reverse the roof-normal resultant while gravity remains vertical', () => {
  const loads = resolveRoofLineLoads({ mode:'combined', slopeDeg:0, tributaryWidthM:1, deadLoadKPa:.2, roofLiveLoadKPa:.3, windPressureKPa:1.5, windSense:'uplift' });
  near(loads.gravityVerticalKNM, .5);
  near(loads.windNormalKNM, -1.5);
  near(loads.normalKNM, -1.0);
  near(loads.parallelKNM, 0);
  assert.equal(loads.normalDirection, 'uplift');
});

test('standing and flat orientations map roof-normal load to different gross axes', () => {
  assert.ok(preset);
  const standingAxes = orientationAxes(preset, 0);
  const flatAxes = orientationAxes(preset, 90);
  assert.equal(standingAxes.normalAxis, 'major');
  assert.equal(flatAxes.normalAxis, 'minor');
  assert.ok(standingAxes.iNormalMm4 > flatAxes.iNormalMm4);
  assert.ok(standingAxes.zNormalMm3 > flatAxes.zNormalMm3);

  const common = { preset, spanM:2, mode:'gravity', slopeDeg:0, tributaryWidthM:.8, deadLoadKPa:.2, roofLiveLoadKPa:.75, yieldStrengthMPa:250 };
  const standing = solveCPurlinLoadCase({ ...common, orientationDeg:0 });
  const flat = solveCPurlinLoadCase({ ...common, orientationDeg:90 });
  assert.ok(standing.grossEnvelopeStressMPa < flat.grossEnvelopeStressMPa);
  assert.ok(Math.abs(standing.deltaNormalMm) < Math.abs(flat.deltaNormalMm));
  assert.ok(standing.yieldFactor > flat.yieldFactor);
});

test('180/270 degree reversals preserve gross stiffness of their 0/90 degree counterparts', () => {
  const common = { preset, spanM:2.4, mode:'combined', slopeDeg:25, tributaryWidthM:.9, deadLoadKPa:.25, roofLiveLoadKPa:.6, windPressureKPa:1.2, windSense:'uplift', yieldStrengthMPa:250 };
  const a = solveCPurlinLoadCase({ ...common, orientationDeg:0 });
  const c = solveCPurlinLoadCase({ ...common, orientationDeg:180 });
  const b = solveCPurlinLoadCase({ ...common, orientationDeg:90 });
  const d = solveCPurlinLoadCase({ ...common, orientationDeg:270 });
  near(a.grossEnvelopeStressMPa, c.grossEnvelopeStressMPa, 1e-9);
  near(a.resultantDeflectionMm, c.resultantDeflectionMm, 1e-9);
  near(b.grossEnvelopeStressMPa, d.grossEnvelopeStressMPa, 1e-9);
  near(b.resultantDeflectionMm, d.resultantDeflectionMm, 1e-9);
});

test('governing envelope can select a larger uplift pressure instead of assuming symmetric wind', () => {
  const members = [
    { label:'Member A', preset, orientationDeg:0, yieldStrengthMPa:250 },
    { label:'Member B', preset, orientationDeg:90, yieldStrengthMPa:250 }
  ];
  const envelope = governingCommonWindSense({
    members,
    spanM:2,
    slopeDeg:20,
    tributaryWidthM:.8,
    deadLoadKPa:.2,
    roofLiveLoadKPa:.2,
    windUpliftKPa:2.5,
    windDownwardKPa:.5
  });
  assert.equal(envelope.windSense, 'uplift');
  assert.equal(envelope.windPressureKPa, 2.5);
  assert.ok(envelope.maxUtilization > 0);
});

test('yield sequence identifies the weaker orientation first under one proportional load history', () => {
  const members = [
    { label:'Member A', preset, orientationDeg:0, yieldStrengthMPa:250 },
    { label:'Member B', preset, orientationDeg:90, yieldStrengthMPa:250 }
  ];
  const sequence = yieldSequence({
    members,
    maxFactor:20,
    spanM:2,
    mode:'combined',
    slopeDeg:30,
    tributaryWidthM:.8,
    deadLoadKPa:.2,
    roofLiveLoadKPa:.75,
    windPressureKPa:1.5,
    windSense:'uplift'
  });
  assert.equal(sequence.sequence.length, 2);
  assert.equal(sequence.sequence[0].label, 'Member B');
  assert.ok(sequence.sequence[0].yieldFactor < sequence.sequence[1].yieldFactor);
});
