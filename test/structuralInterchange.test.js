import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERCHANGE_SCHEMA_VERSION,
  createDemandEnvelopeObject,
  createFailureLawObject,
  createInterchangeObject,
  createInterchangePackage,
  createRpeComponentLaw,
  parseInterchange,
  roundTripInterchange,
  serializeInterchange,
  validateInterchangeObject,
  validateInterchangePackage
} from '../src/interchange/structuralInterchange.js';

const provenance = [{ kind: 'qa-benchmark', ref: 'FT-INT-QA-001', note: 'Deterministic interchange regression fixture.' }];

function materialObject() {
  return createInterchangeObject({
    objectType: 'material',
    id: 'mat-coco-qa',
    sourceSystem: 'FutolTech Structural Lab',
    evidenceStatus: 'peer-reviewed',
    provenance,
    units: { elasticModulusMPa: 'MPa' },
    analysisBoundary: 'QA material object only.',
    data: { name: 'Coconut lumber QA material', family: 'timber', elasticModulusMPa: 13100 }
  });
}

function sectionObject() {
  return createInterchangeObject({
    objectType: 'section',
    id: 'sec-50x100-qa',
    sourceSystem: 'FutolTech Structural Lab',
    evidenceStatus: 'user-supplied',
    provenance,
    units: { areaMm2: 'mm²' },
    analysisBoundary: 'Exact rectangular geometry supplied for QA.',
    data: { shape: 'rectangle', widthMm: 50, depthMm: 100, areaMm2: 5000 }
  });
}

test('interchange v1 creates explicit evidence-bounded material and section objects', () => {
  const material = materialObject();
  const section = sectionObject();
  assert.equal(material.schemaVersion, INTERCHANGE_SCHEMA_VERSION);
  assert.equal(material.objectType, 'material');
  assert.equal(material.data.elasticModulusMPa, 13100);
  assert.equal(section.objectType, 'section');
  assert.equal(section.data.areaMm2, 5000);
  assert.equal(section.provenance[0].ref, 'FT-INT-QA-001');
});

test('package serialization is deterministic and survives an exact canonical round trip', () => {
  const pkg = createInterchangePackage({
    packageId: 'pkg-qa-001',
    sourceSystem: 'FutolTech Structural Lab',
    targetSystem: 'FutolStructure',
    createdAt: '2026-08-18T12:00:00.000Z',
    note: 'Round-trip QA fixture.',
    objects: [sectionObject(), materialObject()]
  });
  const first = serializeInterchange(pkg);
  const second = serializeInterchange(parseInterchange(first));
  const roundTrip = roundTripInterchange(pkg);
  assert.equal(first, second);
  assert.equal(roundTrip.stable, true);
  assert.equal(roundTrip.serialized, roundTrip.reserialized);
  assert.deepEqual(roundTrip.parsed, parseInterchange(first));
});

test('strict validation rejects unsupported versions, object types and duplicate ids', () => {
  const material = materialObject();
  assert.throws(
    () => validateInterchangeObject({ ...material, schemaVersion: 'futoltech.structural-interchange/999' }),
    /unsupported interchange schemaversion/i
  );
  assert.throws(
    () => createInterchangeObject({
      objectType: 'mystery-law', id: 'bad', sourceSystem: 'RPE', evidenceStatus: 'unknown',
      provenance, units: { load: 'kN' }, analysisBoundary: 'invalid QA object', data: {}
    }),
    /object type.*unsupported/i
  );
  assert.throws(
    () => createInterchangePackage({
      packageId: 'dup', sourceSystem: 'FutolTech Structural Lab', targetSystem: 'FutolStructure',
      createdAt: '2026-08-18T12:00:00.000Z', objects: [material, material]
    }),
    /duplicate interchange object id/i
  );
});

test('objects require explicit provenance, units and analysis boundary', () => {
  assert.throws(() => createInterchangeObject({
    objectType: 'material', id: 'missing-prov', sourceSystem: 'FutolTech Structural Lab', evidenceStatus: 'unknown',
    provenance: [], units: { elasticModulusMPa: 'MPa' }, analysisBoundary: 'QA', data: { name: 'x', family: 'wood' }
  }), /provenance/i);
  assert.throws(() => createInterchangeObject({
    objectType: 'section', id: 'missing-units', sourceSystem: 'FutolTech Structural Lab', evidenceStatus: 'unknown',
    provenance, units: {}, analysisBoundary: 'QA', data: { shape: 'rectangle' }
  }), /units/i);
  assert.throws(() => createInterchangeObject({
    objectType: 'section', id: 'missing-boundary', sourceSystem: 'FutolTech Structural Lab', evidenceStatus: 'unknown',
    provenance, units: { length: 'mm' }, analysisBoundary: '', data: { shape: 'rectangle' }
  }), /analysis boundary/i);
});

test('FutolStructure demand envelope keeps signed actions finite and source-owned', () => {
  const demand = createDemandEnvelopeObject({
    id: 'dem-qa-001',
    projectId: 'NF-001',
    provenance: [{ kind: 'FutolStructure-analysis', ref: 'NF-001/load-envelope/QA' }],
    members: [{
      memberId: 'C1',
      cases: [
        { caseId: 'WIND+X', axialKN: -12.5, shearKN: 3.25, momentKNm: 4.75 },
        { caseId: 'WIND-X', axialKN: -10.0, shearKN: -3.1, momentKNm: -4.6 }
      ]
    }]
  });
  assert.equal(demand.sourceSystem, 'FutolStructure');
  assert.equal(demand.objectType, 'demand-envelope');
  assert.equal(demand.data.members[0].cases[1].momentKNm, -4.6);
  assert.throws(() => validateInterchangeObject({
    ...demand,
    data: { ...demand.data, members: [{ memberId: 'C1', cases: [{ caseId: 'BAD', momentKNm: Number.NaN }] }] }
  }), /must be finite/i);
});

test('RPE export preserves threshold events and never invents unavailable degradation behavior', () => {
  const failure = createFailureLawObject({
    id: 'fail-steel-yield-qa',
    evidenceStatus: 'standard',
    provenance: [{ kind: 'solver-event', ref: 'QA/steel-first-yield' }],
    analysisBoundary: 'Elastic threshold law stopping at first yield; no fracture or residual law is claimed.',
    events: [
      { id: 'serviceability', label: 'Serviceability reference', loadKN: 4, type: 'serviceability', terminal: false },
      { id: 'first-yield', label: 'First yield', loadKN: 8, type: 'yield', terminal: true }
    ]
  });
  const rpe = createRpeComponentLaw({ id: 'rpe-law-qa', componentId: 'beam-B1', failureLaw: failure });
  assert.equal(rpe.objectType, 'rpe-component-law');
  assert.equal(rpe.data.thresholdEvents.length, 2);
  assert.equal(rpe.data.thresholdEvents[1].label, 'First yield');
  assert.equal(rpe.data.degradationLaw.status, 'UNAVAILABLE');
  assert.match(rpe.data.degradationLaw.reason, /no validated residual|no validated.*degradation/i);

  assert.throws(() => validateInterchangeObject({
    ...rpe,
    data: {
      ...rpe.data,
      degradationLaw: { status: 'UNAVAILABLE', residualStiffnessRatio: 0.2, reason: 'invented QA value' }
    }
  }), /cannot contain invented degradation parameters/i);
});

test('failure-law validation requires exactly one explicit terminal event', () => {
  assert.throws(() => createFailureLawObject({
    id: 'bad-no-terminal', evidenceStatus: 'unknown', provenance,
    analysisBoundary: 'Invalid QA law.',
    events: [{ id: 'a', label: 'A', loadKN: 1, type: 'reference', terminal: false }]
  }), /exactly one terminal event/i);

  assert.throws(() => createFailureLawObject({
    id: 'bad-two-terminals', evidenceStatus: 'unknown', provenance,
    analysisBoundary: 'Invalid QA law.',
    events: [
      { id: 'a', label: 'A', loadKN: 1, type: 'reference', terminal: true },
      { id: 'b', label: 'B', loadKN: 2, type: 'reference', terminal: true }
    ]
  }), /exactly one terminal event/i);
});

test('package validation rejects a malformed object even after external JSON mutation', () => {
  const pkg = createInterchangePackage({
    packageId: 'pkg-mutation-qa', sourceSystem: 'FutolTech Structural Lab', targetSystem: 'FutolStructure',
    createdAt: '2026-08-18T12:00:00.000Z', objects: [materialObject()]
  });
  const malformed = structuredClone(pkg);
  malformed.objects[0].data.elasticModulusMPa = -1;
  assert.throws(() => validateInterchangePackage(malformed), /greater than zero/i);
});
