import test from 'node:test';
import assert from 'node:assert/strict';
import { WIND_CODE_PROFILES, windCodeProfileById } from '../src/data/windCodeProfiles.js';
import { createWindDesignBasis, parseWindDesignBasis, serializeWindDesignBasis } from '../src/interchange/windDesignBasis.js';

const BENCHMARK_CASE = Object.freeze({
  siteLocation: 'Independent NSCP 2015 hand benchmark',
  siteSourceReference: 'docs/M3_VELOCITY_PRESSURE.md#independent-benchmark',
  occupancyCategory: 'III',
  occupancySourceReference: 'NSCP 2015 Table 103-1 benchmark classification record',
  basicWindSpeedKph: 240,
  basicWindSpeedSourceReference: 'Independent benchmark input; not a Roof Bay project wind-map lookup',
  exposureCategory: 'C',
  exposureSourceReference: 'NSCP 2015 Section 207A.7 benchmark classification',
  topographicFactorKzt: 1,
  topographySourceReference: 'Independent flat-terrain benchmark input',
  heightM: 8.82,
  heightSourceReference: 'Independent benchmark mean roof height'
});

test('Philippine NSCP profile identifies edition and public provenance without claiming the full wind code is implemented', () => {
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

test('M3 provenance-only wind basis remains blocked until a source-referenced velocity-pressure case is supplied', () => {
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

test('user-defined profile is valid only in user-defined/research mode and cannot borrow the NSCP solver', () => {
  assert.throws(() => createWindDesignBasis({ profileId:'user-defined-wind-basis', projectMode:'code-baseline' }), /cannot be labeled code-baseline/);
  const basis = createWindDesignBasis({ profileId:'user-defined-wind-basis', projectMode:'user-defined-research' });
  assert.equal(basis.adoptedCode.profileStatus, 'USER_DEFINED');
  assert.equal(basis.calculationStatus, 'BLOCKED');
  assert.throws(() => createWindDesignBasis({ profileId:'user-defined-wind-basis', projectMode:'user-defined-research', velocityPressureCase:BENCHMARK_CASE }), /limited to the NSCP 2015/);
});

test('source-referenced benchmark resolves only the six inputs required for velocity pressure and keeps zoning blocked', () => {
  const basis = createWindDesignBasis({ velocityPressureCase:BENCHMARK_CASE });
  assert.equal(basis.status, 'VELOCITY_PRESSURE_READY_REMAINING_INPUTS_UNRESOLVED');
  assert.equal(basis.calculationStatus, 'VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED');
  assert.equal(basis.formulaImplementation.velocityPressureChain, 'IMPLEMENTED_BENCHMARKED');
  assert.equal(basis.formulaImplementation.externalPressureCoefficients, 'UNIMPLEMENTED');
  assert.equal(basis.formulaImplementation.internalPressureCoefficients, 'UNIMPLEMENTED');
  assert.equal(basis.formulaImplementation.fieldEdgeCornerGeometry, 'UNIMPLEMENTED');
  assert.equal(basis.inputs.siteLocation.status, 'RESOLVED_FOR_VELOCITY_PRESSURE');
  assert.equal(basis.inputs.basicWindSpeed.value, 240);
  assert.equal(basis.inputs.riskImportance.value, 'III');
  assert.equal(basis.inputs.exposureTerrain.value, 'C');
  assert.equal(basis.inputs.topography.value, 1);
  assert.equal(basis.inputs.buildingHeight.value, 8.82);
  assert.equal(basis.inputs.enclosureInternalPressure.status, 'UNRESOLVED');
  assert.equal(basis.inputs.roofGeometry.status, 'UNRESOLVED');
  assert.ok(Math.abs(basis.velocityPressure.exposure.kz - 0.9748206328451855) < 1e-12);
  assert.ok(Math.abs(basis.velocityPressure.result.qKPa - 2.257467958862151) < 1e-12);
  assert.equal(basis.manualPressureFallback, true);
});

test('velocity-pressure basis rejects altered solver output or stripped source provenance', () => {
  const altered = createWindDesignBasis({ velocityPressureCase:BENCHMARK_CASE });
  altered.velocityPressure.result.qKPa += 0.01;
  assert.throws(() => serializeWindDesignBasis(altered), /qKPa must match/);

  const missingSource = createWindDesignBasis({ velocityPressureCase:BENCHMARK_CASE });
  missingSource.inputs.basicWindSpeed.sourceReference = '';
  assert.throws(() => serializeWindDesignBasis(missingSource), /sourceReference must be a non-empty string/);
});

test('wind design basis serialization is deterministic and round-trips in provenance-only and velocity-pressure states', () => {
  for (const basis of [createWindDesignBasis(), createWindDesignBasis({ velocityPressureCase:BENCHMARK_CASE })]) {
    const first = serializeWindDesignBasis(basis);
    const second = serializeWindDesignBasis(parseWindDesignBasis(first));
    assert.equal(second, first);
  }
});

test('wind code profile ids are unique', () => {
  const ids = WIND_CODE_PROFILES.map((profile) => profile.id);
  assert.equal(new Set(ids).size, ids.length);
});
