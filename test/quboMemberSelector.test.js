import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMemberSelectionQubo,
  evaluateQuboEnergy,
  solveMemberSelectionQubo
} from '../src/solver/quboMemberSelector.js';
import { MATERIALS } from '../src/data/materials.js';
import { PH_TRADITIONAL_TIMBER_LIBRARY } from '../src/data/phTraditionalTimberLibrary.js';

function candidate({ id, pass, mass, utilisation }) {
  return {
    materialId: `material-${id}`,
    presetId: `section-${id}`,
    orientation: 'as listed',
    pass,
    totalMassKg: mass,
    governingRatio: utilisation
  };
}

const candidates = [
  candidate({ id: 'light-pass', pass: true, mass: 10, utilisation: 0.8 }),
  candidate({ id: 'heavy-low-use', pass: true, mass: 12, utilisation: 0.5 }),
  candidate({ id: 'light-fail', pass: false, mass: 1, utilisation: 1.5 })
];

test('local QUBO mass objective selects the lightest passing candidate', () => {
  const result = solveMemberSelectionQubo({ candidates, objective: 'mass', maxVariables: 3 });
  assert.equal(result.selectedCandidate.presetId, 'section-light-pass');
  assert.equal(result.verificationPass, true);
  assert.equal(result.statesEvaluated, 8);
  assert.equal(result.agreesWithClassical, true);
});

test('local QUBO utilisation objective selects the lowest-use passing candidate', () => {
  const sortedForUtilisation = [candidates[1], candidates[0], candidates[2]];
  const result = solveMemberSelectionQubo({
    candidates: sortedForUtilisation,
    objective: 'utilisation',
    maxVariables: 3
  });
  assert.equal(result.selectedCandidate.presetId, 'section-heavy-low-use');
  assert.equal(result.verificationPass, true);
});

test('exactly-one penalty makes a feasible selected state better than empty or multiple states', () => {
  const model = buildMemberSelectionQubo({ candidates, objective: 'mass', maxVariables: 3 });
  const empty = evaluateQuboEnergy([0, 0, 0], model);
  const selected = evaluateQuboEnergy([1, 0, 0], model);
  const multiple = evaluateQuboEnergy([1, 1, 0], model);
  assert.ok(selected < empty);
  assert.ok(selected < multiple);
});

test('priority local timbers are active comparison records while unresolved names stay library-only', () => {
  const requiredActiveIds = [
    'timber-apitong-ph-80-provisional',
    'timber-yakal-ph-80-provisional',
    'timber-red-lauan-ph-80-provisional',
    'timber-white-lauan-ph-80-provisional',
    'timber-tanguile-ph-80-provisional',
    'timber-narra-ph-80-provisional'
  ];
  for (const id of requiredActiveIds) {
    const record = MATERIALS.find((item) => item.id === id);
    assert.ok(record, `${id} should exist`);
    assert.equal(record.priorityLocal, true);
    assert.ok(record.elasticModulusMPa > 0);
    assert.ok(record.bendingReferenceMPa > 0);
    assert.equal(record.densityKgM3, null);
  }

  const unresolved = new Set(PH_TRADITIONAL_TIMBER_LIBRARY.map((record) => record.id));
  assert.deepEqual(unresolved, new Set(['timber-ipil-pending', 'timber-philippine-mahogany-pending']));
});
