import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';
import { compareCompressionCandidates, compareMemberCandidates } from './solver/memberComparison.js';
import { convertLoadToKN } from './solver/sectionRecommender.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const slotState = [
  { id: 'member-a', label: 'Member A', enabled: true, materialId: 'steel-generic-250', presetId: 'ph-pipe-PNS26 light-40', orientation: 'listed' },
  { id: 'member-b', label: 'Member B', enabled: true, materialId: 'steel-generic-250', presetId: 'shs-50-15', orientation: 'listed' },
  { id: 'member-c', label: 'Member C', enabled: true, materialId: 'coco-uh-2007-average', presetId: 'wood-2x4', orientation: 'listed' }
];

const ids = [
  'compareLengthInput', 'compareBoundarySelect', 'compareColumnBoundarySelect',
  'compareLoadInput', 'compareLoadUnitSelect', 'compareLoadPositionInput',
  'compareDeflectionSelect', 'compareEccentricityInput', 'compareResetButton',
  'compareBeamModeButton', 'compareColumnModeButton', 'compareConditionsTitle',
  'compareLoadLabel', 'compareFairRule', 'compareResultsTitle', 'compareBoundaryNote',
  'compareLoadEquivalent', 'compareSelectors', 'compareErrorBanner', 'compareSummary',
  'compareResultCards', 'compareTableBody', 'compareHeadA', 'compareHeadB', 'compareHeadC'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
let mode = 'beam';

function numeric(element) { return Number(element.value); }
function format(value, decimals = 2) {
  if (value === Number.POSITIVE_INFINITY) return '∞';
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}
function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? ACTIVE_MATERIALS[0];
}

function availablePresets(material) {
  return presetsForFamily(material.family).filter((preset) => preset.id !== 'custom');
}

function presetById(material, id) {
  return availablePresets(material).find((preset) => preset.id === id) ?? availablePresets(material)[0];
}

function canRotate(preset) {
  if (!preset) return false;
  if (preset.type === 'rectangle' || preset.type === 'rhs') return preset.widthMm !== preset.depthMm;
  if (preset.type === 'custom') return preset.widthMm !== preset.depthMm || preset.ixMm4 !== preset.iyMm4;
  return false;
}

function materialOptions(selectedId) {
  return ['wood', 'bamboo', 'steel'].map((family) => {
    const label = family === 'wood' ? 'Wood datasets' : family === 'bamboo' ? 'Bamboo datasets' : 'Steel datasets';
    const options = ACTIVE_MATERIALS.filter((material) => material.family === family)
      .map((material) => `<option value="${esc(material.id)}" ${material.id === selectedId ? 'selected' : ''}>${esc(material.name)}</option>`).join('');
    return `<optgroup label="${label}">${options}</optgroup>`;
  }).join('');
}

function presetOptions(material, selectedId) {
  return availablePresets(material).map((preset) => (
    `<option value="${esc(preset.id)}" ${preset.id === selectedId ? 'selected' : ''}>${esc(preset.label)}</option>`
  )).join('');
}

function renderSelectors() {
  elements.compareSelectors.innerHTML = slotState.map((slot, index) => {
    const material = materialById(slot.materialId);
    const preset = presetById(material, slot.presetId);
    if (preset.id !== slot.presetId) slot.presetId = preset.id;
    const thirdToggle = index === 2
      ? `<label class="compare-enable"><input type="checkbox" data-slot-enable="${index}" ${slot.enabled ? 'checked' : ''} /> Include third member</label>`
      : '<span class="compare-required">Required comparison member</span>';
    return `<article class="compare-selector-card ${slot.enabled ? '' : 'is-disabled'}">
      <div class="compare-selector-card__heading"><div><p class="eyebrow">${esc(slot.label)}</p><h3>${esc(preset.label.replace(/ —.*/, ''))}</h3></div>${thirdToggle}</div>
      <div class="compare-selector-visual">${sectionSketchSvg(preset, material.family)}</div>
      <label><span>Material / grade dataset</span><select data-slot-material="${index}" ${slot.enabled ? '' : 'disabled'}>${materialOptions(slot.materialId)}</select></label>
      <label><span>Section / product</span><select data-slot-preset="${index}" ${slot.enabled ? '' : 'disabled'}>${presetOptions(material, slot.presetId)}</select></label>
      <label><span>Orientation</span><select data-slot-orientation="${index}" ${slot.enabled && canRotate(preset) ? '' : 'disabled'}><option value="listed" ${slot.orientation === 'listed' ? 'selected' : ''}>As listed</option><option value="rotated" ${slot.orientation === 'rotated' ? 'selected' : ''}>Rotate 90°</option></select></label>
      <p class="candidate-source">${esc(material.source?.label ?? 'Source pending')}</p>
    </article>`;
  }).join('');

  for (const select of elements.compareSelectors.querySelectorAll('[data-slot-material]')) {
    select.addEventListener('change', () => {
      const index = Number(select.dataset.slotMaterial);
      slotState[index].materialId = select.value;
      const material = materialById(select.value);
      slotState[index].presetId = availablePresets(material)[0].id;
      slotState[index].orientation = 'listed';
      renderSelectors();
      renderResults();
    });
  }
  for (const select of elements.compareSelectors.querySelectorAll('[data-slot-preset]')) {
    select.addEventListener('change', () => {
      const index = Number(select.dataset.slotPreset);
      slotState[index].presetId = select.value;
      slotState[index].orientation = 'listed';
      renderSelectors();
      renderResults();
    });
  }
  for (const select of elements.compareSelectors.querySelectorAll('[data-slot-orientation]')) {
    select.addEventListener('change', () => {
      slotState[Number(select.dataset.slotOrientation)].orientation = select.value;
      renderResults();
    });
  }
  const thirdToggle = elements.compareSelectors.querySelector('[data-slot-enable="2"]');
  if (thirdToggle) thirdToggle.addEventListener('change', () => {
    slotState[2].enabled = thirdToggle.checked;
    renderSelectors();
    renderResults();
  });
}

function selectionFromSlot(slot) {
  const material = materialById(slot.materialId);
  const preset = presetById(material, slot.presetId);
  return { id: slot.id, label: slot.label, material, preset, orientation: slot.orientation };
}

function thresholdLabel(record) {
  if (record.family === 'steel') return 'First-yield estimate';
  if (record.family === 'bamboo') return 'Characteristic bending estimate';
  return 'Published rupture estimate';
}

function winnerChips(record) {
  const chips = [];
  if (record.winnerFlags.lightestPassing) chips.push('Lightest passing');
  if (mode === 'beam') {
    if (record.winnerFlags.leastDeflection) chips.push('Least deflection');
    if (record.winnerFlags.lowestStrengthUse) chips.push('Lowest strength use');
    if (record.winnerFlags.highestPhysicalThreshold) chips.push('Highest threshold');
  } else {
    if (record.winnerFlags.leastShortening) chips.push('Least shortening');
    if (record.winnerFlags.lowestCompressionUse) chips.push('Lowest compression use');
    if (record.winnerFlags.highestCompressionCapacity) chips.push('Highest capacity');
  }
  return chips.map((chip) => `<span class="compare-winner-chip">${chip}</span>`).join('');
}

function resultCard(record) {
  const metrics = mode === 'beam'
    ? `<div><dt>Deflection</dt><dd>${format(record.result.maxDeflectionMm, 2)} mm</dd></div>
       <div><dt>Bending stress</dt><dd>${format(record.result.maxBendingStressMPa, 1)} MPa</dd></div>
       <div><dt>Strength use</dt><dd>${record.strengthRatio == null ? 'unrated' : `${format(record.strengthRatio * 100, 1)}%`}</dd></div>
       <div><dt>Member mass</dt><dd>${format(record.totalMassKg, 2)} kg</dd></div>`
    : `<div><dt>Predicted capacity</dt><dd>${formatLoadEquivalents(record.result.predictedCapacityKN)}</dd></div>
       <div><dt>Governing use</dt><dd>${format(record.governingRatio * 100, 1)}%</dd></div>
       <div><dt>Shortening</dt><dd>${format(record.result.shorteningMm, 3)} mm</dd></div>
       <div><dt>Member mass</dt><dd>${format(record.totalMassKg, 2)} kg</dd></div>`;
  return `<article class="compare-result-card ${record.pass ? 'is-pass' : 'is-fail'} ${record.winnerFlags.lightestPassing ? 'is-primary-winner' : ''}">
    <div class="compare-result-card__visual">${sectionSketchSvg(record.section, record.family)}</div>
    <div class="compare-result-card__body">
      <div class="compare-result-card__status"><span class="recommend-badge ${record.pass ? 'recommend-badge--pass' : 'recommend-badge--fail'}">${record.pass ? 'PASS' : 'FAIL'}</span>${winnerChips(record)}</div>
      <p class="eyebrow">${esc(record.comparisonLabel)}</p>
      <h3>${esc(record.displayMaterialName)}</h3>
      <p><strong>${esc(record.sectionLabel.replace(/ —.*/, ''))}</strong> · ${esc(record.orientation)}</p>
      <dl class="compare-mini-metrics">${metrics}</dl>
      <p class="candidate-source">${esc(record.reasons.join('; '))}</p>
    </div>
  </article>`;
}

function metricCell(record, value, winnerFlag = null, extra = '') {
  const winner = winnerFlag && record.winnerFlags[winnerFlag];
  return `<td class="${winner ? 'is-metric-winner' : ''}">${winner ? '★ ' : ''}${value}${extra ? `<small>${extra}</small>` : ''}</td>`;
}

function renderTable(records) {
  const padded = [...records];
  while (padded.length < 3) padded.push(null);
  [elements.compareHeadA, elements.compareHeadB, elements.compareHeadC].forEach((head, index) => {
    head.textContent = padded[index]?.comparisonLabel ?? 'Not included';
    head.classList.toggle('is-hidden-column', !padded[index]);
  });

  const beamRows = [
    ['Status', (r) => metricCell(r, r.pass ? 'PASS' : 'FAIL')],
    ['Product / section', (r) => metricCell(r, esc(r.sectionLabel.replace(/ —.*/, '')), null, esc(r.orientation))],
    ['Maximum deflection', (r) => metricCell(r, `${format(r.result.maxDeflectionMm, 2)} mm`, 'leastDeflection', `${format(r.deflectionRatio * 100, 1)}% of L/${numeric(elements.compareDeflectionSelect)}`)],
    ['Maximum bending stress', (r) => metricCell(r, `${format(r.result.maxBendingStressMPa, 1)} MPa`)],
    ['Strength-reference use', (r) => metricCell(r, r.strengthRatio == null ? 'unrated' : `${format(r.strengthRatio * 100, 1)}%`, 'lowestStrengthUse', r.strengthReferenceLabel)],
    ['Physical threshold load', (r) => metricCell(r, r.physicalThresholdLoadKN == null ? '—' : formatLoadEquivalents(r.physicalThresholdLoadKN), 'highestPhysicalThreshold', thresholdLabel(r))],
    ['Total member mass', (r) => metricCell(r, `${format(r.totalMassKg, 2)} kg`, 'lightestPassing', `${format(r.massPerM, 2)} kg/m`)],
    ['Strong-axis inertia Iₓ', (r) => metricCell(r, `${format(r.properties.ixMm4, 0)} mm⁴`)],
    ['Strong-axis modulus Zₓ', (r) => metricCell(r, `${format(r.properties.zxMm3, 0)} mm³`)],
    ['Stock / usable length', (r) => metricCell(r, r.stockBoundaryM == null ? 'verify' : `${format(r.stockBoundaryM, 2)} m`, null, r.stockPass ? 'length check passes' : 'splice required')]
  ];
  const compressionRows = [
    ['Status', (r) => metricCell(r, r.pass ? 'PASS' : 'FAIL')],
    ['Product / section', (r) => metricCell(r, esc(r.sectionLabel.replace(/ —.*/, '')), null, esc(r.orientation))],
    ['Predicted axial capacity', (r) => metricCell(r, formatLoadEquivalents(r.result.predictedCapacityKN), 'highestCompressionCapacity', r.result.governingMode)],
    ['Euler critical load', (r) => metricCell(r, formatLoadEquivalents(r.result.eulerCriticalKN), null, `K=${format(r.result.k, 3)} · λ=${format(r.result.slenderness, 1)}`)],
    ['Material squash load', (r) => metricCell(r, formatLoadEquivalents(r.result.squashCapacityKN), null, `${format(r.compressionStrengthMPa, 1)} MPa reference`)],
    ['Capacity use', (r) => metricCell(r, `${format(r.capacityRatio * 100, 1)}%`, 'lowestCompressionUse', 'applied load / predicted capacity')],
    ['Amplified compression stress', (r) => metricCell(r, `${format(r.result.maxCompressionStressMPa, 1)} MPa`, null, `${format(r.stressRatio * 100, 1)}% of compression reference`)],
    ['Elastic shortening', (r) => metricCell(r, `${format(r.result.shorteningMm, 3)} mm`, 'leastShortening')],
    ['Weak-axis inertia', (r) => metricCell(r, `${format(r.result.governingI, 0)} mm⁴`, null, `${r.result.governingAxis}-axis governs`)],
    ['Total member mass', (r) => metricCell(r, `${format(r.totalMassKg, 2)} kg`, 'lightestPassing', `${format(r.massPerM, 2)} kg/m`)],
    ['Stock / usable length', (r) => metricCell(r, r.stockBoundaryM == null ? 'verify' : `${format(r.stockBoundaryM, 2)} m`, null, r.stockPass ? 'length check passes' : 'splice required')]
  ];
  const rows = mode === 'beam' ? beamRows : compressionRows;

  elements.compareTableBody.innerHTML = rows.map(([label, cell]) => (
    `<tr><th>${label}</th>${padded.map((record) => record ? cell(record) : '<td class="is-hidden-column">—</td>').join('')}</tr>`
  )).join('');
}

function renderSummary(result) {
  const byId = new Map(result.records.map((record) => [record.comparisonId, record]));
  const lightest = byId.get(result.winners.lightestPassing);
  if (mode === 'beam') {
    const stiffest = byId.get(result.winners.leastDeflection);
    const strongest = byId.get(result.winners.highestPhysicalThreshold);
    elements.compareSummary.innerHTML = `<strong>${result.passingCount} of ${result.records.length} members pass the selected elastic bending checks.</strong><p>${lightest ? `Lightest passing: <b>${esc(lightest.comparisonLabel)} — ${esc(lightest.sectionLabel.replace(/ —.*/, ''))}</b>.` : 'No selected member passes all current checks.'} ${stiffest ? `Least deflection: <b>${esc(stiffest.comparisonLabel)}</b>.` : ''} ${strongest ? `Highest physical threshold: <b>${esc(strongest.comparisonLabel)}</b>.` : ''}</p>`;
    return;
  }
  const leastUse = byId.get(result.winners.lowestCompressionUse);
  const highestCapacity = byId.get(result.winners.highestCompressionCapacity);
  elements.compareSummary.innerHTML = `<strong>${result.passingCount} of ${result.records.length} members pass the current idealised compression checks.</strong><p>${lightest ? `Lightest passing: <b>${esc(lightest.comparisonLabel)} — ${esc(lightest.sectionLabel.replace(/ —.*/, ''))}</b>.` : 'No selected member passes all current compression checks.'} ${leastUse ? `Lowest governing use: <b>${esc(leastUse.comparisonLabel)}</b>.` : ''} ${highestCapacity ? `Highest predicted capacity: <b>${esc(highestCapacity.comparisonLabel)}</b>.` : ''}</p>`;
}

function renderResults() {
  try {
    elements.compareErrorBanner.classList.add('is-hidden');
    const lengthM = numeric(elements.compareLengthInput);
    const loadKN = convertLoadToKN(numeric(elements.compareLoadInput), elements.compareLoadUnitSelect.value);
    const selections = slotState.filter((slot) => slot.enabled).map(selectionFromSlot);
    let result;

    if (mode === 'beam') {
      const loadPositionM = numeric(elements.compareLoadPositionInput);
      elements.compareLoadPositionInput.max = String(lengthM);
      elements.compareLoadEquivalent.innerHTML = `<p class="eyebrow">Applied to every beam</p><strong>${formatLoadEquivalents(loadKN)}</strong><p>Same point load, span, support case, and serviceability criterion for all selected alternatives.</p>`;
      result = compareMemberCandidates({
        selections,
        lengthM,
        loadKN,
        loadPositionM,
        boundary: elements.compareBoundarySelect.value,
        deflectionDivisor: numeric(elements.compareDeflectionSelect)
      });
    } else {
      elements.compareLoadEquivalent.innerHTML = `<p class="eyebrow">Applied to every column</p><strong>${formatLoadEquivalents(loadKN)}</strong><p>Same axial load, clear length, end-restraint idealisation, and eccentricity for all selected alternatives.</p>`;
      result = compareCompressionCandidates({
        selections,
        lengthM,
        axialLoadKN: loadKN,
        eccentricityMm: numeric(elements.compareEccentricityInput),
        boundary: elements.compareColumnBoundarySelect.value
      });
    }

    renderSummary(result);
    elements.compareResultCards.innerHTML = result.records.map(resultCard).join('');
    renderTable(result.records);
  } catch (error) {
    elements.compareErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.compareErrorBanner.classList.remove('is-hidden');
    elements.compareSummary.innerHTML = '';
    elements.compareResultCards.innerHTML = '';
    elements.compareTableBody.innerHTML = '';
  }
}

function syncLoadPosition() {
  const lengthM = numeric(elements.compareLengthInput);
  const boundary = elements.compareBoundarySelect.value;
  elements.compareLoadPositionInput.value = boundary === 'cantilever-left' ? String(lengthM)
    : boundary === 'cantilever-right' ? '0' : String(lengthM / 2);
}

function syncModeUi() {
  const beam = mode === 'beam';
  document.querySelectorAll('.compare-beam-only').forEach((node) => node.classList.toggle('is-hidden', !beam));
  document.querySelectorAll('.compare-column-only').forEach((node) => node.classList.toggle('is-hidden', beam));
  elements.compareBeamModeButton.classList.toggle('is-active', beam);
  elements.compareColumnModeButton.classList.toggle('is-active', !beam);
  elements.compareConditionsTitle.textContent = beam ? 'Shared load and span' : 'Shared axial load and clear height';
  elements.compareLoadLabel.textContent = beam ? 'Point load' : 'Axial compression load';
  elements.compareResultsTitle.textContent = beam ? 'Direct bending results' : 'Direct compression results';
  elements.compareFairRule.textContent = beam
    ? 'All selected members receive the same idealised point load, span, support case, and deflection criterion. Material source assumptions, actual section geometry, stock limits, and pass/fail references remain specific to each member.'
    : 'All selected members receive the same idealised axial load, clear height, end-restraint K-factor, and load eccentricity. The comparison checks weak-axis Euler buckling, material compression, amplified stress, shortening, mass, and stock length.';
  elements.compareBoundaryNote.textContent = beam
    ? 'This is an elastic beam-member comparison. It does not yet compare connection capacity, support bearing, local/lateral-torsional buckling, corrosion, treatment, fabrication, installed cost, or nonlinear fracture. A lighter passing member is not automatically the cheapest or most buildable solution.'
    : 'This is an idealised individual-column comparison using Euler buckling and material compression references. It does not yet include frame sway, brace stiffness, connection slip, pipe local buckling, initial crookedness, residual stress, timber defects, end bearing, corrosion, or system-level shoring stability.';
}

function resetBenchmark() {
  Object.assign(slotState[0], { enabled: true, materialId: 'steel-generic-250', presetId: 'ph-pipe-PNS26 light-40', orientation: 'listed' });
  Object.assign(slotState[1], { enabled: true, materialId: 'steel-generic-250', presetId: 'shs-50-15', orientation: 'listed' });
  Object.assign(slotState[2], { enabled: true, materialId: 'coco-uh-2007-average', presetId: 'wood-2x4', orientation: 'listed' });
  elements.compareLengthInput.value = '3';
  elements.compareBoundarySelect.value = 'simply-supported';
  elements.compareColumnBoundarySelect.value = 'pinned-pinned';
  elements.compareLoadInput.value = '100';
  elements.compareLoadUnitSelect.value = 'kgf';
  elements.compareLoadPositionInput.value = '1.5';
  elements.compareDeflectionSelect.value = '360';
  elements.compareEccentricityInput.value = '0';
  renderSelectors();
  syncModeUi();
  renderResults();
}

for (const id of ['compareLoadInput', 'compareLoadUnitSelect', 'compareLoadPositionInput', 'compareDeflectionSelect', 'compareEccentricityInput', 'compareColumnBoundarySelect']) {
  elements[id].addEventListener('input', renderResults);
  elements[id].addEventListener('change', renderResults);
}
elements.compareBoundarySelect.addEventListener('change', () => { syncLoadPosition(); renderResults(); });
elements.compareLengthInput.addEventListener('change', () => { if (mode === 'beam') syncLoadPosition(); renderResults(); });
elements.compareLengthInput.addEventListener('input', renderResults);
elements.compareBeamModeButton.addEventListener('click', () => { mode = 'beam'; syncModeUi(); renderResults(); });
elements.compareColumnModeButton.addEventListener('click', () => { mode = 'compression'; syncModeUi(); renderResults(); });
elements.compareResetButton.addEventListener('click', resetBenchmark);

resetBenchmark();
