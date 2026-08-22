import test from 'node:test';
import assert from 'node:assert/strict';
import { WIND_CODE_PROFILES, windCodeProfileById } from '../src/data/windCodeProfiles.js';
import { createWindDesignBasis, parseWindDesignBasis, serializeWindDesignBasis } from '../src/interchange/windDesignBasis.js';

test('Philippine NSCP profile identifies edition and public provenance without implementing wind rules', () => {
  const profile = windCodeProfileById('ph-nscp-2015-v1-7e-2p');
  assert.ok(profile);
  assert.equal(profile.jurisdiction, 'Philippines');
  assert.equal(profile.year, 2015);
  assert.equal(profile.edition, '7th Edition');
  assert.equal(profile.printing, '2nd Printing');
  assert.equal(profile.status, 'REFERENCE_IDENTIFIED_RULES_UNIMPLEMENTED');
  assert.ok(profile.evidence.some((item) => item.organization.includes('DPWH')));
  assert.ok(profile.evidence.some((item) => item.organization.includes('ASEP')));
  assert.match(profile.implementationBoundary, /not implemented/i);
});

test('M3 wind basis is blocked until inputs and formula chain are implemented', () => {
  const basis = createWindDesignBasis();
  assert.equal(basis.schemaVersion, 'futoltech.wind-design-basis/1');
  assert.equal(basis.status, 'BASIS_IDENTIFIED_INPUTS_UNRESOLVED');
  assert.equal(basis.calculationStatus, 'BLOCKED');
  assert.equal(basis.projectMode, 'code-baseline');
  assert.equal(basis.adoptedCode.profileId, 'ph-nscp-2015-v1-7e-2p');
  assert.equal(basis.manualPressureFallback, true);
  assert.ok(Object.values(basis.inputs).every((input) => input.status === 'UNRESOLVED' && input.value === null && input.sourceReference === null));
  assert.ok(Object.values(basis.formulaImplementation).every((status) => status === 'UNIMPLEMENTED'));
  assert.ok(basis.blockers.length >= 3);
});

test('provenance-only basis cannot silently populate wind inputs', () => {
  const basis = createWindDesignBasis();
  basis.inputs.basicWindSpeed.value = 250;
  basis.inputs.basicWindSpeed.sourceType = 'map';
  basis.inputs.basicWindSpeed.sourceReference = 'unverified';
  assert.throws(() => serializeWindDesignBasis(basis), /cannot be populated until/);
});

test('provenance-only basis cannot silently enable velocity pressure calculation', () => {
  const basis = createWindDesignBasis();
  basis.formulaImplementation.velocityPressureChain = 'IMPLEMENTED';
  assert.throws(() => serializeWindDesignBasis(basis), /must remain UNIMPLEMENTED/);
});

test('source-backed profile evidence cannot be mutated in exported basis', () => {
  const basis = createWindDesignBasis();
  basis.adoptedCode.evidence[0].claim = 'invented replacement claim';
  assert.throws(() => serializeWindDesignBasis(basis), /evidence must match/);
});

test('user-defined profile is valid only in user-defined/research mode', () => {
  assert.throws(() => createWindDesignBasis({ profileId:'user-defined-wind-basis', projectMode:'code-baseline' }), /cannot be labeled code-baseline/);
  const basis = createWindDesignBasis({ profileId:'user-defined-wind-basis', projectMode:'user-defined-research' });
  assert.equal(basis.adoptedCode.profileStatus, 'USER_DEFINED');
  assert.equal(basis.calculationStatus, 'BLOCKED');
});

test('wind design basis serialization is deterministic and round-trips', () => {
  const basis = createWindDesignBasis();
  const first = serializeWindDesignBasis(basis);
  const second = serializeWindDesignBasis(parseWindDesignBasis(first));
  assert.equal(second, first);
});

test('wind code profile ids are unique', () => {
  const ids = WIND_CODE_PROFILES.map((profile) => profile.id);
  assert.equal(new Set(ids).size, ids.length);
});
