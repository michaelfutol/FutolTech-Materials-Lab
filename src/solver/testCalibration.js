const REQUIRED_COLUMNS = ['specimen_id', 'displacement_mm', 'measured_load_kN'];
const OPTIONAL_COLUMNS = ['predicted_load_kN', 'event'];

const T95 = new Map([
  [1, 12.706], [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571], [6, 2.447],
  [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228], [11, 2.201], [12, 2.179],
  [13, 2.160], [14, 2.145], [15, 2.131], [16, 2.120], [17, 2.110], [18, 2.101],
  [19, 2.093], [20, 2.086], [21, 2.080], [22, 2.074], [23, 2.069], [24, 2.064],
  [25, 2.060], [26, 2.056], [27, 2.052], [28, 2.048], [29, 2.045], [30, 2.042]
]);

function parseCsvLine(line) {
  const fields = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      fields.push(value.trim());
      value = '';
    } else value += char;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  fields.push(value.trim());
  return fields;
}

function finiteNumber(value, label, rowNumber) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be numeric at CSV row ${rowNumber}.`);
  return number;
}

export function parseCalibrationCsv(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Paste or load a non-empty CSV dataset.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) throw new Error('CSV must include a header and at least one data row.');
  const headers = parseCsvLine(lines[0]);
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) throw new Error(`CSV is missing required column: ${required}`);
  }
  const allowed = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const unknownHeaders = headers.filter((header) => !allowed.has(header));

  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    if (values.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${values.length} fields; expected ${headers.length}.`);
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
    const specimenId = String(raw.specimen_id ?? '').trim();
    if (!specimenId) throw new Error(`specimen_id is required at CSV row ${index + 2}.`);
    const displacementMm = finiteNumber(raw.displacement_mm, 'displacement_mm', index + 2);
    const measuredLoadKN = finiteNumber(raw.measured_load_kN, 'measured_load_kN', index + 2);
    if (displacementMm == null || measuredLoadKN == null) throw new Error(`Displacement and measured load are required at CSV row ${index + 2}.`);
    const predictedLoadKN = headers.includes('predicted_load_kN')
      ? finiteNumber(raw.predicted_load_kN, 'predicted_load_kN', index + 2)
      : null;
    return {
      rowNumber: index + 2,
      specimenId,
      displacementMm,
      measuredLoadKN,
      predictedLoadKN,
      event: String(raw.event ?? '').trim().toLowerCase() || null,
      raw
    };
  });

  return {
    schema: { required: [...REQUIRED_COLUMNS], optional: [...OPTIONAL_COLUMNS] },
    headers,
    unknownHeaders,
    rows,
    rawCsv: text
  };
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function descriptiveStats(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return { n: 0, mean: null, sampleSd: null, cov: null, ci95: null, min: null, max: null };
  const avg = mean(clean);
  const sampleSd = clean.length >= 2
    ? Math.sqrt(clean.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (clean.length - 1))
    : null;
  const cov = sampleSd != null && Math.abs(avg) > 1e-12 ? sampleSd / Math.abs(avg) : null;
  let ci95 = null;
  if (sampleSd != null) {
    const df = clean.length - 1;
    const critical = df <= 30 ? T95.get(df) : 1.96;
    const margin = critical * sampleSd / Math.sqrt(clean.length);
    ci95 = { low: avg - margin, high: avg + margin, margin, method: df <= 30 ? 'Student t 95%' : 'normal approx 95%' };
  }
  return { n: clean.length, mean: avg, sampleSd, cov, ci95, min: Math.min(...clean), max: Math.max(...clean) };
}

export function pairedCurveStats(rows) {
  const paired = rows.filter((row) => Number.isFinite(row.measuredLoadKN) && Number.isFinite(row.predictedLoadKN));
  if (!paired.length) {
    return { n: 0, biasKN: null, maeKN: null, rmseKN: null, meanMeasuredKN: null, meanPredictedKN: null, meanMeasuredToPredictedRatio: null, residualStats: descriptiveStats([]) };
  }
  const residuals = paired.map((row) => row.measuredLoadKN - row.predictedLoadKN);
  const absoluteResiduals = residuals.map(Math.abs);
  const squaredResiduals = residuals.map((value) => value ** 2);
  const ratios = paired.filter((row) => Math.abs(row.predictedLoadKN) > 1e-12).map((row) => row.measuredLoadKN / row.predictedLoadKN);
  return {
    n: paired.length,
    biasKN: mean(residuals),
    maeKN: mean(absoluteResiduals),
    rmseKN: Math.sqrt(mean(squaredResiduals)),
    meanMeasuredKN: mean(paired.map((row) => row.measuredLoadKN)),
    meanPredictedKN: mean(paired.map((row) => row.predictedLoadKN)),
    meanMeasuredToPredictedRatio: ratios.length ? mean(ratios) : null,
    residualStats: descriptiveStats(residuals)
  };
}

function groupBySpecimen(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.specimenId)) groups.set(row.specimenId, []);
    groups.get(row.specimenId).push(row);
  }
  return groups;
}

export function specimenSummaries(rows) {
  return [...groupBySpecimen(rows)].map(([specimenId, specimenRows]) => {
    const measuredPeak = specimenRows.reduce((peak, row) => row.measuredLoadKN > peak.measuredLoadKN ? row : peak, specimenRows[0]);
    const predictedRows = specimenRows.filter((row) => Number.isFinite(row.predictedLoadKN));
    const predictedPeak = predictedRows.length
      ? predictedRows.reduce((peak, row) => row.predictedLoadKN > peak.predictedLoadKN ? row : peak, predictedRows[0])
      : null;
    const failureRows = specimenRows.filter((row) => row.event === 'failure');
    const failure = failureRows.length ? failureRows[failureRows.length - 1] : null;
    return {
      specimenId,
      rowCount: specimenRows.length,
      measuredPeakLoadKN: measuredPeak.measuredLoadKN,
      measuredPeakDisplacementMm: measuredPeak.displacementMm,
      predictedPeakLoadKN: predictedPeak?.predictedLoadKN ?? null,
      predictedPeakDisplacementMm: predictedPeak?.displacementMm ?? null,
      failureMarked: Boolean(failure),
      markedFailureLoadKN: failure?.measuredLoadKN ?? null,
      markedFailureDisplacementMm: failure?.displacementMm ?? null
    };
  });
}

export function calibrationStatistics(parsed) {
  if (!parsed?.rows?.length) throw new Error('Parsed calibration rows are required.');
  const specimens = specimenSummaries(parsed.rows);
  const failureLoads = specimens.filter((item) => item.failureMarked).map((item) => item.markedFailureLoadKN);
  const peakLoads = specimens.map((item) => item.measuredPeakLoadKN);
  const paired = pairedCurveStats(parsed.rows);
  return {
    rowCount: parsed.rows.length,
    specimenCount: specimens.length,
    paired,
    measuredPeakLoadStats: descriptiveStats(peakLoads),
    markedFailureLoadStats: descriptiveStats(failureLoads),
    specimens
  };
}

export function buildCalibrationPackage({
  parsed,
  metadata = {},
  createdAt = new Date().toISOString(),
  calibrationVersion = 'CAL-001.v1'
}) {
  const statistics = calibrationStatistics(parsed);
  return {
    schemaVersion: 'futoltech.structural-lab.calibration/1',
    calibrationVersion,
    createdAt,
    evidenceStatus: 'USER DATA / UNVERIFIED',
    targetType: metadata.targetType ?? 'material',
    targetId: metadata.targetId ?? '',
    testStandard: metadata.testStandard ?? '',
    laboratory: metadata.laboratory ?? '',
    apparatus: metadata.apparatus ?? '',
    instrumentCalibration: metadata.instrumentCalibration ?? '',
    operator: metadata.operator ?? '',
    notes: metadata.notes ?? '',
    immutableSource: {
      rawCsv: parsed.rawCsv,
      headers: [...parsed.headers],
      parsedRows: parsed.rows.map((row) => ({ ...row, raw: { ...row.raw } }))
    },
    statistics,
    mutationPolicy: 'Calibration output is additive. It must never silently overwrite published or measured source properties.'
  };
}
