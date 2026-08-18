import test from 'node:test';
import assert from 'node:assert/strict';
import { beamGoverningLimitTimeline, columnGoverningLimitTimeline } from '../src/solver/governingLimitTimeline.js';
import { buildStructuralLabComponentPackage } from '../src/interchange/componentPackage.js';
import {
  buildFailureLawFromTimeline,
  buildRpeInterchangePackage,
  consumeRpeInterchangePackage
} from '../src/interchange/rpeBridge.js';
import { createFailureLawObject } from '../src/interchange/structuralInterchange.js';

const provenance = [{ kind: 'solver-regression', ref: 'RPE-QA-001' }];

test('steel first-yield timeline exports to RPE without inventing post-yield degradation', () => {
  const timeline = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 2, currentDeflectionMm: 1, deflectionLimitMm: 8,
    currentStressMPa: 50, yieldStrengthMPa: 250, screeningOnly: false
  });
  const failureLaw = buildFailureLawFromTimeline({ id: 'failure:B1', timeline, evidenceStatus: 'provisional', provenance });
  const terminal = failureLaw.data.events.find((event) => event.terminal);
  assert.equal(terminal.id, 'first-yield');
  assert.equal(terminal.type, 'yield');
  assert.equal(failureLaw.data.residualLaw.status, 'UNAVAILABLE');
  assert.match(failureLaw.data.residualLaw.reason, /does not define validated post-threshold degradation/i);
});

test('C-purlin gross first-yield screen remains screening after conversion to a failure-law object', () => {
  const timeline = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 1, currentDeflectionMm: 2, deflectionLimitMm: 10,
    currentStressMPa: 80, yieldStrengthMPa: 250, screeningOnly: true, screeningLabel: 'gross-section'
  });
  const failureLaw = buildFailureLawFromTimeline({ id: 'failure:P1', timeline, provenance });
  const terminal = failureLaw.data.events.find((event) => event.terminal);
  assert.equal(terminal.id, 'gross-yield-screen');
  assert.equal(terminal.type, 'screening');
  assert.match(terminal.note, /local|distortional|LTB|torsion/i);
  assert.match(failureLaw.analysisBoundary, /screening reference/i);
});

test('column export stops at the stored earliest implemented adverse limit and does not create post-buckling law', () => {
  const timeline = columnGoverningLimitTimeline({
    family: 'wood', currentLoadKN: 2, predictedCapacityKN: 12, eulerCriticalKN: 20,
    currentCompressionStressMPa: 5, compressionStrengthMPa: 40
  });
  const failureLaw = buildFailureLawFromTimeline({ id: 'failure:C1', timeline, provenance });
  assert.equal(failureLaw.data.events.filter((event) => event.terminal).length, 1);
  assert.equal(failureLaw.data.residualLaw.status, 'UNAVAILABLE');
  assert.match(failureLaw.analysisBoundary, /post-buckling|crushing|splitting/i);
});

test('RPE package carries component context, source failure law and RPE component law with stable cross references', () => {
  const componentPkg = buildStructuralLabComponentPackage({
    packageId: 'context-pkg', memberId: 'B1', materialId: 'steel-generic-250', sectionPresetId: 'shs-50-20',
    lengthM: 3, createdAt: '2026-08-18T13:30:00.000Z'
  });
  const member = componentPkg.objects.find((object) => object.objectType === 'member');
  const timeline = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 2, currentDeflectionMm: 1, deflectionLimitMm: 8,
    currentStressMPa: 50, yieldStrengthMPa: 250
  });
  const failureLaw = buildFailureLawFromTimeline({ id: 'failure:B1', timeline, provenance });
  const pkg = buildRpeInterchangePackage({
    packageId: 'rpe-pkg-qa',
    contextObjects: componentPkg.objects,
    components: [{ componentId: member.id, contextObjectId: member.id, failureLaw }],
    createdAt: '2026-08-18T13:31:00.000Z'
  });
  assert.equal(pkg.sourceSystem, 'FutolTech Structural Lab');
  assert.equal(pkg.targetSystem, 'RPE');
  const rpe = pkg.objects.find((object) => object.objectType === 'rpe-component-law');
  assert.equal(rpe.data.componentId, member.id);
  assert.equal(rpe.data.contextObjectId, member.id);
  assert.equal(rpe.data.sourceFailureLawId, failureLaw.id);
  assert.equal(rpe.data.degradationLaw.status, 'UNAVAILABLE');
  const consumed = consumeRpeInterchangePackage(pkg);
  assert.equal(consumed.componentLaws.length, 1);
  assert.equal(consumed.unavailableDegradationCount, 1);
  assert.match(consumed.interpretationBoundary, /may not synthesize post-threshold degradation/i);
});

test('an explicitly available source residual law may pass through, but only because it was supplied in the source law', () => {
  const failureLaw = createFailureLawObject({
    id: 'failure:calibrated-qa',
    evidenceStatus: 'calibrated',
    provenance: [{ kind: 'calibration-package', ref: 'CAL-QA-RESIDUAL-001' }],
    analysisBoundary: 'Synthetic QA law representing an explicitly supplied calibrated residual relation.',
    events: [{ id: 'threshold', label: 'Threshold', loadKN: 10, type: 'yield', terminal: true }],
    residualLaw: {
      status: 'AVAILABLE',
      model: 'piecewise-elastic-explicit-qa',
      residualStiffnessRatio: 0.2,
      sourceRef: 'CAL-QA-RESIDUAL-001'
    }
  });
  const pkg = buildRpeInterchangePackage({
    packageId: 'rpe-calibrated-qa', components: [{ componentId: 'member:QA', failureLaw }],
    createdAt: '2026-08-18T13:32:00.000Z'
  });
  const rpe = pkg.objects.find((object) => object.objectType === 'rpe-component-law');
  assert.equal(rpe.data.degradationLaw.status, 'AVAILABLE');
  assert.equal(rpe.data.degradationLaw.residualStiffnessRatio, 0.2);
  assert.equal(rpe.data.degradationLaw.sourceRef, 'CAL-QA-RESIDUAL-001');
});

test('RPE bridge rejects missing context ids and malformed timelines instead of filling gaps', () => {
  const timeline = beamGoverningLimitTimeline({
    family: 'steel', currentLoadKN: 1, currentDeflectionMm: 1, deflectionLimitMm: 5,
    currentStressMPa: 50, yieldStrengthMPa: 250
  });
  const failureLaw = buildFailureLawFromTimeline({ id: 'failure:X', timeline, provenance });
  assert.throws(() => buildRpeInterchangePackage({
    packageId: 'bad-context', contextObjects: [],
    components: [{ componentId: 'member:X', contextObjectId: 'member:X', failureLaw }]
  }), /absent from contextobjects/i);
  assert.throws(() => buildFailureLawFromTimeline({
    id: 'bad-timeline', provenance,
    timeline: { events: [{ id: 'a', label: 'A', loadKN: 1, type: 'x', terminal: false }], boundary: 'bad' }
  }), /exactly one terminal event/i);
});
