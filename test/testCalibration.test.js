import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCalibrationPackage,
  calibrationStatistics,
  descriptiveStats,
  pairedCurveStats,
  parseCalibrationCsv,
  specimenSummaries
} from '../src/solver/testCalibration.js';

const CSV = `specimen_id,displacement_mm,measured_load_kN,predicted_load_kN,event
S1,0,0,0,
S1,1,1,1,
S1,2,3,2,failure
S2,0,0,0,
S2,1,2,2,
S2,2,4,4,failure`;

test('CSV importer requires the canonical evidence columns and preserves the raw source', () => {
  const parsed = parseCalibrationCsv(CSV);
  assert.equal(parsed.rows.length, 6);
  assert.equal(parsed.rawCsv, CSV);
  assert.deepEqual(parsed.headers, ['specimen_id','displacement_mm','measured_load_kN','predicted_load_kN','event']);
  assert.equal(parsed.rows[2].raw.measured_load_kN, '3');
  assert.equal(parsed.rows[2].event, 'failure');
  assert.throws(() => parseCalibrationCsv('specimen_id,measured_load_kN\nS1,2'), /displacement_mm/);
});

test('CSV parser handles quoted identifiers without changing their evidence text', () => {
  const parsed = parseCalibrationCsv('specimen_id,displacement_mm,measured_load_kN\n"A, specimen",0,1');
  assert.equal(parsed.rows[0].specimenId, 'A, specimen');
  assert.equal(parsed.rows[0].raw.specimen_id, 'A, specimen');
});

test('paired response statistics calculate bias MAE and RMSE transparently', () => {
  const stats = pairedCurveStats([
    { measuredLoadKN: 1, predictedLoadKN: 1 },
    { measuredLoadKN: 3, predictedLoadKN: 2 }
  ]);
  assert.equal(stats.n, 2);
  assert.equal(stats.biasKN, 0.5);
  assert.equal(stats.maeKN, 0.5);
  assert.ok(Math.abs(stats.rmseKN - Math.sqrt(0.5)) < 1e-12);
  assert.equal(stats.meanMeasuredKN, 2);
  assert.equal(stats.meanPredictedKN, 1.5);
});

test('sample scatter uses sample SD COV and Student-t 95 percent interval for n=3', () => {
  const stats = descriptiveStats([5.8, 6.2, 6.0]);
  assert.equal(stats.n, 3);
  assert.ok(Math.abs(stats.mean - 6) < 1e-12);
  assert.ok(Math.abs(stats.sampleSd - 0.2) < 1e-12);
  assert.ok(Math.abs(stats.cov - (0.2 / 6)) < 1e-12);
  const expectedMargin = 4.303 * 0.2 / Math.sqrt(3);
  assert.ok(Math.abs(stats.ci95.margin - expectedMargin) < 1e-12);
  assert.equal(stats.ci95.method, 'Student t 95%');
});

test('failure statistics use only explicitly marked source rows while peak load remains separate', () => {
  const parsed = parseCalibrationCsv(CSV);
  const specimens = specimenSummaries(parsed.rows);
  assert.equal(specimens.length, 2);
  assert.equal(specimens[0].measuredPeakLoadKN, 3);
  assert.equal(specimens[0].markedFailureLoadKN, 3);
  const stats = calibrationStatistics(parsed);
  assert.equal(stats.markedFailureLoadStats.n, 2);
  assert.equal(stats.measuredPeakLoadStats.n, 2);
});

test('versioned calibration package preserves raw evidence and never claims source-property mutation', () => {
  const parsed = parseCalibrationCsv(CSV);
  const pkg = buildCalibrationPackage({
    parsed,
    metadata: { targetType: 'material', targetId: 'test-material', testStandard: 'QA-001' },
    createdAt: '2026-08-18T10:00:00.000Z',
    calibrationVersion: 'CAL-QA.v1'
  });
  assert.equal(pkg.schemaVersion, 'futoltech.structural-lab.calibration/1');
  assert.equal(pkg.calibrationVersion, 'CAL-QA.v1');
  assert.equal(pkg.evidenceStatus, 'USER DATA / UNVERIFIED');
  assert.equal(pkg.immutableSource.rawCsv, CSV);
  assert.equal(pkg.immutableSource.parsedRows.length, 6);
  assert.match(pkg.mutationPolicy, /never silently overwrite/i);
  assert.equal(pkg.statistics.specimenCount, 2);
});
