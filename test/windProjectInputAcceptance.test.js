import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWindProjectInputAcceptance,
  requiredWindSpeedFigureForOccupancy,
  validateWindProjectInputAcceptance
} from '../src/interchange/windProjectInputAcceptance.js';
import { calculateAcceptedWindProjectVelocityPressure } from '../src/interchange/windProjectInputBridge.js';
import {
  parseWindProjectInputAcceptance,
  serializeWindProjectInputAcceptance
} from '../src/interchange/windProjectInputSerialization.js';

const BASE = Object.freeze({
  siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
  siteSourceReference: 'Project site record / survey reference',
  occupancyCategory: 'III',
  occupancySourceReference: 'Project occupancy classification record; verify against NSCP 2015 Table 103-1',
  basicWindSpeedKph: 240,
  windSpeedSourceType: 'authorized-code-map',
  windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map for the stated site',
  windSpeedSelectionMethod: 'direct-contour-read',
  windSpeedFigureId: '207A.5-1A',
  exposureCategory: 'C',
  exposureSourceReference: 'Engineer terrain/exposure classification record',
  topographicFactorKzt: 1,
  topographySourceReference: 'Engineer topographic-factor project record',
  heightM: 8.82,
  heightSourceReference: 'Project geometry / mean-roof-height record'
});

test('occupancy category selects the required NSCP 2015 wind-speed figure family without storing map values', () => {
  assert.equal(requiredWindSpeedFigureForOccupancy('I').figureId, '207A.5-1C');
  assert.equal(requiredWindSpeedFigureForOccupancy('II').figureId, '207A.5-1B');
  for (const occupancy of ['III', 'IV', 'V']) {
    assert.equal(requiredWindSpeedFigureForOccupancy(occupancy).figureId, '207A.5-1A');
  }
});

test('authorized code-map project input requires the occupancy-matched figure and explicit provenance', () => {
  const record = createWindProjectInputAcceptance(BASE);
  assert.equal(record.schemaVersion, 'futoltech.wind-project-input-acceptance/1');
  assert.equal(record.status, 'ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY');
  assert.equal(record.occupancy.requiredWindSpeedFigure.figureId, '207A.5-1A');
  assert.equal(record.basicWindSpeed.codeMapStatus, 'MATCHED_REQUIRED_OCCUPANCY_FIGURE');
  assert.equal(record.basicWindSpeed.valueKph, 240);
  assert.equal(record.acceptance.automaticWindMapLookupImplemented, false);
  assert.equal(record.acceptance.pressureCoefficientsImplemented, false);
  assert.equal(record.acceptance.roofZoningImplemented, false);
  assert.doesNotThrow(() => validateWindProjectInputAcceptance(record));
});

test('wrong wind-map figure is rejected instead of accepting a speed detached from occupancy category', () => {
  assert.throws(
    () => createWindProjectInputAcceptance({ ...BASE, windSpeedFigureId: '207A.5-1B' }),
    /must be 207A\.5-1A/
  );
});

test('occupancy category V remains linked to Figure 207A.5-1A in the acceptance layer', () => {
  const record = createWindProjectInputAcceptance({ ...BASE, occupancyCategory: 'V' });
  assert.equal(record.occupancy.category, 'V');
  assert.equal(record.occupancy.requiredWindSpeedFigure.figureId, '207A.5-1A');
});

test('project design criteria can be preserved as a traceable non-map source without claiming map verification', () => {
  const record = createWindProjectInputAcceptance({
    ...BASE,
    windSpeedSourceType: 'project-design-criteria',
    windSpeedSelectionMethod: 'project-specified',
    windSpeedFigureId: null,
    windSpeedSourceReference: 'Government/project structural design criteria stating the adopted basic wind speed'
  });
  assert.equal(record.basicWindSpeed.codeMapStatus, 'NOT_A_CODE_MAP_SOURCE');
  assert.equal(record.basicWindSpeed.declaredFigureId, null);
  assert.equal(record.acceptance.velocityPressureInputsTraceable, true);
});

test('accepted project inputs feed the benchmarked velocity-pressure solver but do not become final roof pressure', () => {
  const record = createWindProjectInputAcceptance(BASE);
  const result = calculateAcceptedWindProjectVelocityPressure(record);
  assert.equal(result.status, 'VELOCITY_PRESSURE_AVAILABLE_FROM_ACCEPTED_PROJECT_INPUTS');
  assert.equal(result.occupancyCategory, 'III');
  assert.equal(result.requiredWindSpeedFigure.figureId, '207A.5-1A');
  assert.ok(Math.abs(result.calculation.exposure.kz - 0.9748206328451855) < 1e-12);
  assert.ok(Math.abs(result.calculation.result.qKPa - 2.257467958862151) < 1e-12);
  assert.match(result.boundary, /not a final roof pressure/i);
});

test('accepted wind project input record serializes deterministically and round-trips exactly', () => {
  const record = createWindProjectInputAcceptance(BASE);
  const first = serializeWindProjectInputAcceptance(record);
  const second = serializeWindProjectInputAcceptance(parseWindProjectInputAcceptance(first));
  assert.equal(second, first);
});

test('mutated acceptance records cannot silently claim wind-map verification or automated physics', () => {
  const mapClaim = createWindProjectInputAcceptance(BASE);
  mapClaim.basicWindSpeed.codeMapStatus = 'NOT_A_CODE_MAP_SOURCE';
  assert.throws(() => validateWindProjectInputAcceptance(mapClaim), /matched figure status/);

  const automated = createWindProjectInputAcceptance(BASE);
  automated.acceptance.automaticWindMapLookupImplemented = true;
  assert.throws(() => validateWindProjectInputAcceptance(automated), /must remain false/);
});
