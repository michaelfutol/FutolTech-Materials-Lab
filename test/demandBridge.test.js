import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFutolStructureDemandPackage,
  consumeFutolStructureDemandPackage,
  summarizeDemandEnvelope,
  summarizeDemandMember
} from '../src/interchange/demandBridge.js';
import { createInterchangePackage, createCriticalSpecimenRequest, createDemandEnvelopeObject } from '../src/interchange/structuralInterchange.js';

const members = [
  {
    memberId: 'C1',
    cases: [
      { caseId: 'DL+LL', axialKN: -40, shearKN: 2, momentKNm: 3 },
      { caseId: 'EQ+X', axialKN: -25, shearKN: 9, momentKNm: 14 },
      { caseId: 'EQ-X', axialKN: -22, shearKN: -11, momentKNm: -13 }
    ]
  },
  {
    memberId: 'B1',
    cases: [
      { caseId: 'DL+LL', axialKN: 0, shearKN: 5, momentKNm: 8 },
      { caseId: 'WIND+X', axialKN: 1.5, shearKN: -3, momentKNm: -10 }
    ]
  }
];

const provenance = [{ kind: 'FutolStructure-analysis', ref: 'QA-PROJECT/envelope-01' }];

test('member demand summary preserves governing signed values and source case ids', () => {
  const summary = summarizeDemandMember(members[0]);
  assert.equal(summary.memberId, 'C1');
  assert.deepEqual(summary.axial, { value: -40, absoluteValue: 40, caseId: 'DL+LL' });
  assert.deepEqual(summary.shear, { value: -11, absoluteValue: 11, caseId: 'EQ-X' });
  assert.deepEqual(summary.moment, { value: 14, absoluteValue: 14, caseId: 'EQ+X' });
});

test('demand envelope summary explicitly stops at imported-action interpretation', () => {
  const envelope = createDemandEnvelopeObject({ id: 'demand:QA', projectId: 'QA', members, provenance });
  const summary = summarizeDemandEnvelope(envelope);
  assert.equal(summary.memberCount, 2);
  assert.equal(summary.members[1].moment.caseId, 'WIND+X');
  assert.match(summary.interpretationBoundary, /not capacity checks|failure predictions|automatic design conclusions/i);
});

test('FutolStructure demand package round-trips with explicit critical specimen requests', () => {
  const pkg = buildFutolStructureDemandPackage({
    packageId: 'pkg-demand-qa',
    projectId: 'QA-PROJECT',
    members,
    provenance,
    createdAt: '2026-08-18T13:00:00.000Z',
    criticalSelections: [
      { memberId: 'C1', reason: 'Highest imported axial demand; request deeper column test.' },
      { id: 'critical:QA:B1', memberId: 'B1', reason: 'Highest imported beam moment; request deeper bending test.' }
    ]
  });
  assert.equal(pkg.sourceSystem, 'FutolStructure');
  assert.equal(pkg.targetSystem, 'FutolTech Structural Lab');
  assert.equal(pkg.objects.filter((o) => o.objectType === 'critical-specimen-request').length, 2);
  const consumed = consumeFutolStructureDemandPackage(pkg);
  assert.equal(consumed.envelopes.length, 1);
  assert.equal(consumed.criticalRequests.length, 2);
  assert.equal(consumed.envelopes[0].summary.members[0].axial.value, -40);
  assert.match(consumed.interpretationBoundary, /does not silently change load cases|source demand/i);
});

test('critical specimen selection must reference a member that actually exists in the source envelope', () => {
  assert.throws(() => buildFutolStructureDemandPackage({
    packageId: 'pkg-bad-selection', projectId: 'QA', members, provenance,
    criticalSelections: [{ memberId: 'NOPE', reason: 'Invalid QA selection.' }]
  }), /absent from demand envelope/i);
});

test('consumer rejects malformed cross-package critical request references', () => {
  const envelope = createDemandEnvelopeObject({ id: 'demand:QA', projectId: 'QA', members, provenance });
  const badRequest = createCriticalSpecimenRequest({
    id: 'critical:bad', projectId: 'QA', memberId: 'MISSING', reason: 'Bad QA reference',
    demandEnvelopeId: envelope.id,
    provenance: [{ kind: 'qa', ref: 'bad-reference' }]
  });
  const pkg = createInterchangePackage({
    packageId: 'pkg-bad-ref', sourceSystem: 'FutolStructure', targetSystem: 'FutolTech Structural Lab',
    createdAt: '2026-08-18T13:01:00.000Z', objects: [envelope, badRequest]
  });
  assert.throws(() => consumeFutolStructureDemandPackage(pkg), /absent from demand/i);
});

test('consumer rejects wrong interchange direction instead of silently accepting source ownership changes', () => {
  const envelope = createDemandEnvelopeObject({ id: 'demand:QA', projectId: 'QA', members, provenance });
  const pkg = createInterchangePackage({
    packageId: 'wrong-direction', sourceSystem: 'FutolStructure', targetSystem: 'RPE',
    createdAt: '2026-08-18T13:02:00.000Z', objects: [envelope]
  });
  assert.throws(() => consumeFutolStructureDemandPackage(pkg), /requires FutolStructure .* FutolTech Structural Lab package direction/i);
});
