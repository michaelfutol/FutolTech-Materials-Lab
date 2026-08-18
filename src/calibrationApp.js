import {
  buildCalibrationPackage,
  calibrationStatistics,
  parseCalibrationCsv
} from './solver/testCalibration.js';

const EXAMPLE_CSV = `specimen_id,displacement_mm,measured_load_kN,predicted_load_kN,event
C1,0,0,0,
C1,2,2.1,2.0,
C1,4,4.0,4.0,
C1,6,5.8,6.0,failure
C2,0,0,0,
C2,2,2.2,2.0,
C2,4,4.3,4.0,
C2,6,6.2,6.0,failure
C3,0,0,0,
C3,2,2.0,2.0,
C3,4,4.1,4.0,
C3,6,6.0,6.0,failure`;

const ids = [
  'calibrationTargetType','calibrationTargetId','calibrationStandard','calibrationLaboratory','calibrationApparatus',
  'calibrationInstrument','calibrationOperator','calibrationVersion','calibrationNotes','calibrationFileInput',
  'calibrationCsvInput','calibrationExampleButton','calibrationAnalyzeButton','calibrationExportButton','calibrationErrorBanner',
  'calibrationSummary','calibrationChart','calibrationPairedStats','calibrationFailureStats','calibrationSpecimenBody',
  'calibrationRawBody','calibrationRowCount','calibrationSourceCard','calibrationEvidenceBadge'
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
if (Object.values(el).some((node) => !node)) throw new Error('Calibration Lab cannot find required page controls.');

let currentPackage = null;

function format(value, decimals = 3) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function metadata() {
  return {
    targetType: el.calibrationTargetType.value,
    targetId: el.calibrationTargetId.value.trim(),
    testStandard: el.calibrationStandard.value.trim(),
    laboratory: el.calibrationLaboratory.value.trim(),
    apparatus: el.calibrationApparatus.value.trim(),
    instrumentCalibration: el.calibrationInstrument.value.trim(),
    operator: el.calibrationOperator.value.trim(),
    notes: el.calibrationNotes.value.trim()
  };
}

function statRow(label, value, note = '') {
  return `<dt>${escapeHtml(label)}</dt><dd><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ''}</dd>`;
}

function ciCopy(stats) {
  if (!stats?.ci95) return stats?.n === 1 ? 'n=1 · scatter/CI unavailable' : 'insufficient sample count';
  return `${stats.ci95.method}: ${format(stats.ci95.low)} to ${format(stats.ci95.high)} kN`;
}

function renderSummary(stats) {
  const paired = stats.paired;
  const failures = stats.markedFailureLoadStats;
  el.calibrationSummary.innerHTML = [
    ['Rows preserved', format(stats.rowCount, 0), 'raw parsed evidence rows'],
    ['Specimens', format(stats.specimenCount, 0), 'unique specimen_id values'],
    ['Paired points', format(paired.n, 0), paired.n ? 'measured + predicted values available' : 'predicted_load_kN not supplied'],
    ['Bias, kN', format(paired.biasKN), paired.n ? 'mean(measured − predicted)' : 'unavailable'],
    ['RMSE, kN', format(paired.rmseKN), paired.n ? 'root-mean-square paired residual' : 'unavailable'],
    ['Marked failures', format(failures.n, 0), failures.n ? 'event=failure rows only' : 'no explicit failure markers supplied']
  ].map(([label, value, note]) => `<article class="result-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
}

function renderStats(stats) {
  const paired = stats.paired;
  const residual = paired.residualStats;
  el.calibrationPairedStats.innerHTML = [
    statRow('Paired points n', format(paired.n, 0)),
    statRow('Mean measured load', paired.n ? `${format(paired.meanMeasuredKN)} kN` : '—'),
    statRow('Mean predicted load', paired.n ? `${format(paired.meanPredictedKN)} kN` : '—'),
    statRow('Bias measured − predicted', paired.n ? `${format(paired.biasKN)} kN` : '—', 'positive = measured response above prediction'),
    statRow('MAE', paired.n ? `${format(paired.maeKN)} kN` : '—'),
    statRow('RMSE', paired.n ? `${format(paired.rmseKN)} kN` : '—'),
    statRow('Mean measured/predicted ratio', paired.meanMeasuredToPredictedRatio == null ? '—' : format(paired.meanMeasuredToPredictedRatio, 4)),
    statRow('Residual sample SD', residual.sampleSd == null ? '—' : `${format(residual.sampleSd)} kN`, ciCopy(residual))
  ].join('');

  const peaks = stats.measuredPeakLoadStats;
  const failures = stats.markedFailureLoadStats;
  el.calibrationFailureStats.innerHTML = [
    statRow('Measured peak n', format(peaks.n, 0)),
    statRow('Mean measured peak', peaks.mean == null ? '—' : `${format(peaks.mean)} kN`),
    statRow('Peak sample SD', peaks.sampleSd == null ? '—' : `${format(peaks.sampleSd)} kN`),
    statRow('Peak COV', peaks.cov == null ? '—' : `${format(peaks.cov * 100, 2)}%`, ciCopy(peaks)),
    statRow('Explicit failure n', format(failures.n, 0), 'only rows marked event=failure'),
    statRow('Mean marked failure', failures.mean == null ? '—' : `${format(failures.mean)} kN`),
    statRow('Failure sample SD', failures.sampleSd == null ? '—' : `${format(failures.sampleSd)} kN`),
    statRow('Failure COV', failures.cov == null ? '—' : `${format(failures.cov * 100, 2)}%`, ciCopy(failures))
  ].join('');
}

function renderSpecimens(stats) {
  el.calibrationSpecimenBody.innerHTML = stats.specimens.map((item) => `<tr>
    <td><strong>${escapeHtml(item.specimenId)}</strong></td>
    <td>${format(item.rowCount, 0)}</td>
    <td>${format(item.measuredPeakLoadKN)} kN<small>@ ${format(item.measuredPeakDisplacementMm)} mm</small></td>
    <td>${item.predictedPeakLoadKN == null ? '—' : `${format(item.predictedPeakLoadKN)} kN<small>@ ${format(item.predictedPeakDisplacementMm)} mm</small>`}</td>
    <td>${item.failureMarked ? `${format(item.markedFailureLoadKN)} kN<small>@ ${format(item.markedFailureDisplacementMm)} mm · source-marked</small>` : 'not marked'}</td>
  </tr>`).join('');
}

function renderRaw(parsed) {
  el.calibrationRowCount.textContent = `${parsed.rows.length} rows preserved`;
  el.calibrationRawBody.innerHTML = parsed.rows.slice(0, 100).map((row) => `<tr>
    <td>${row.rowNumber}</td><td>${escapeHtml(row.specimenId)}</td><td>${format(row.displacementMm)}</td><td>${format(row.measuredLoadKN)}</td><td>${row.predictedLoadKN == null ? '—' : format(row.predictedLoadKN)}</td><td>${escapeHtml(row.event ?? '')}</td>
  </tr>`).join('');
  if (parsed.rows.length > 100) el.calibrationRowCount.textContent += ' · first 100 shown';
}

function groupRows(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.specimenId)) map.set(row.specimenId, []);
    map.get(row.specimenId).push(row);
  }
  for (const list of map.values()) list.sort((a, b) => a.displacementMm - b.displacementMm);
  return map;
}

function renderChart(parsed) {
  const rows = parsed.rows;
  const width = 900;
  const height = 420;
  const margin = { left: 74, right: 30, top: 38, bottom: 62 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const maxX = Math.max(...rows.map((row) => row.displacementMm), 1);
  const loadValues = rows.flatMap((row) => [row.measuredLoadKN, row.predictedLoadKN].filter(Number.isFinite));
  const maxY = Math.max(...loadValues, 1);
  const x = (value) => margin.left + value / maxX * plotW;
  const y = (value) => margin.top + plotH - value / maxY * plotH;
  const grid = [];
  for (let i = 0; i <= 5; i += 1) {
    const xv = maxX * i / 5;
    const yv = maxY * i / 5;
    grid.push(`<line x1="${x(xv)}" y1="${margin.top}" x2="${x(xv)}" y2="${margin.top + plotH}" class="cal-grid"/><text x="${x(xv)}" y="${height - 28}" text-anchor="middle" class="cal-label">${format(xv, 2)}</text>`);
    grid.push(`<line x1="${margin.left}" y1="${y(yv)}" x2="${margin.left + plotW}" y2="${y(yv)}" class="cal-grid"/><text x="${margin.left - 12}" y="${y(yv) + 4}" text-anchor="end" class="cal-label">${format(yv, 2)}</text>`);
  }
  const traces = [];
  for (const [specimenId, specimenRows] of groupRows(rows)) {
    const measuredPoints = specimenRows.map((row) => `${x(row.displacementMm).toFixed(2)},${y(row.measuredLoadKN).toFixed(2)}`).join(' ');
    traces.push(`<polyline points="${measuredPoints}" class="cal-measured"><title>${escapeHtml(specimenId)} measured</title></polyline>`);
    for (const row of specimenRows) {
      traces.push(`<circle cx="${x(row.displacementMm)}" cy="${y(row.measuredLoadKN)}" r="${row.event === 'failure' ? 5 : 3.2}" class="${row.event === 'failure' ? 'cal-failure-point' : 'cal-point'}"><title>${escapeHtml(specimenId)} · ${format(row.displacementMm)} mm · ${format(row.measuredLoadKN)} kN${row.event ? ` · ${escapeHtml(row.event)}` : ''}</title></circle>`);
    }
    const predictedRows = specimenRows.filter((row) => Number.isFinite(row.predictedLoadKN));
    if (predictedRows.length > 1) {
      const predictedPoints = predictedRows.map((row) => `${x(row.displacementMm).toFixed(2)},${y(row.predictedLoadKN).toFixed(2)}`).join(' ');
      traces.push(`<polyline points="${predictedPoints}" class="cal-predicted"><title>${escapeHtml(specimenId)} predicted</title></polyline>`);
    }
  }
  el.calibrationChart.innerHTML = `${grid.join('')}<line x1="${margin.left}" y1="${margin.top + plotH}" x2="${margin.left + plotW}" y2="${margin.top + plotH}" class="cal-axis"/><line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" class="cal-axis"/>${traces.join('')}<text x="${margin.left + plotW / 2}" y="${height - 6}" text-anchor="middle" class="cal-label">Displacement, mm</text><text x="18" y="${margin.top + plotH / 2}" transform="rotate(-90 18 ${margin.top + plotH / 2})" text-anchor="middle" class="cal-label">Load, kN</text>`;
}

function renderSource(parsed, pkg) {
  const unknown = parsed.unknownHeaders.length
    ? `<p class="calibration-source-warning"><strong>Unmapped CSV columns preserved:</strong> ${escapeHtml(parsed.unknownHeaders.join(', '))}. They remain in each raw row but CAL-001 does not interpret them.</p>`
    : '<p>No unknown CSV columns were supplied.</p>';
  el.calibrationSourceCard.innerHTML = `<p class="eyebrow">Calibration provenance</p><strong>${escapeHtml(pkg.calibrationVersion)} · ${escapeHtml(pkg.evidenceStatus)}</strong><p>Target: ${escapeHtml(pkg.targetType)} · ${escapeHtml(pkg.targetId || 'unspecified')}. Parsed statistics are derived from ${pkg.statistics.rowCount} preserved evidence rows. Export includes the original CSV string and each parsed raw field.</p>${unknown}<p><b>Mutation policy:</b> ${escapeHtml(pkg.mutationPolicy)}</p>`;
}

function clearError() {
  el.calibrationErrorBanner.textContent = '';
  el.calibrationErrorBanner.classList.add('is-hidden');
}

function showError(error) {
  el.calibrationErrorBanner.textContent = error instanceof Error ? error.message : String(error);
  el.calibrationErrorBanner.classList.remove('is-hidden');
}

function analyze() {
  try {
    clearError();
    const parsed = parseCalibrationCsv(el.calibrationCsvInput.value);
    const stats = calibrationStatistics(parsed);
    currentPackage = buildCalibrationPackage({
      parsed,
      metadata: metadata(),
      calibrationVersion: el.calibrationVersion.value.trim() || 'CAL-001.v1'
    });
    renderSummary(stats);
    renderStats(stats);
    renderSpecimens(stats);
    renderRaw(parsed);
    renderChart(parsed);
    renderSource(parsed, currentPackage);
    el.calibrationExportButton.disabled = false;
    el.calibrationEvidenceBadge.textContent = currentPackage.evidenceStatus;
    document.documentElement.dataset.calibrationState = 'analyzed';
  } catch (error) {
    currentPackage = null;
    el.calibrationExportButton.disabled = true;
    delete document.documentElement.dataset.calibrationState;
    showError(error);
  }
}

function loadExample() {
  el.calibrationCsvInput.value = EXAMPLE_CSV;
  el.calibrationTargetType.value = 'material';
  el.calibrationTargetId.value = 'coco-uh-2007-average';
  el.calibrationStandard.value = 'CAL-001 synthetic QA example — replace with actual test procedure';
  el.calibrationLaboratory.value = 'Example only';
  el.calibrationApparatus.value = 'Synthetic dataset';
  el.calibrationInstrument.value = 'Not applicable — QA example';
  el.calibrationOperator.value = 'Structural Lab QA';
  el.calibrationVersion.value = 'CAL-001.v1';
  el.calibrationNotes.value = 'Synthetic example for software verification. Not physical-test evidence.';
  analyze();
}

async function loadFile(file) {
  const text = await file.text();
  el.calibrationCsvInput.value = text;
  analyze();
}

function exportPackage() {
  if (!currentPackage) return;
  // Refresh metadata while preserving the same immutable source rows/statistics from the analyzed package.
  const exported = {
    ...currentPackage,
    calibrationVersion: el.calibrationVersion.value.trim() || currentPackage.calibrationVersion,
    ...metadata()
  };
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${(exported.calibrationVersion || 'CAL-001').replace(/[^a-z0-9._-]+/gi, '_')}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

el.calibrationExampleButton.addEventListener('click', loadExample);
el.calibrationAnalyzeButton.addEventListener('click', analyze);
el.calibrationExportButton.addEventListener('click', exportPackage);
el.calibrationFileInput.addEventListener('change', () => {
  const [file] = el.calibrationFileInput.files;
  if (file) loadFile(file).catch(showError);
});

loadExample();
