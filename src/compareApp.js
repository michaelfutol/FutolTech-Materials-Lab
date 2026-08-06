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
  'compareDeflectionSelect', 'compareEccentricityInput', 'compareBracePointsSelect',
  'compareResetButton', 'compareBeamModeButton', 'compareColumnModeButton',
  'compareConditionsTitle', 'compareLoadLabel', 'compareFairRule', 'compareResultsTitle',
  'compareBoundaryNote', 'compareLoadEquivalent', 'compareSelectors', 'compareErrorBanner',
  'compareSummary', 'compareResultCards', 'compareTableBody', 'compareHeadA',
  'compareHeadB', 'compareHeadC'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
let mode = 'beam';

const HELP = {
  material: 'The material dataset supplies stiffness and strength references. Verify the actual steel grade or exact timber species, grade, moisture and source before design use.',
  section: 'The section or product supplies actual geometry and section properties. Nominal trade names are not proof of delivered dimensions.',
  orientation: 'Rotating a non-square section swaps its strong and weak axes. Compression normally buckles about the weaker axis.',
  status: 'PRELIM PASS means the steel global-buckling screening passed using an AISC-style ASD curve. SCREENING means a natural-material research ceiling was not exceeded, but no code-rated column capacity is claimed.',
  deflection: 'Maximum elastic displacement under the selected beam load. The ratio below it compares the result with the chosen L/360, L/240 or L/180 limit.',
  bendingStress: 'Maximum elastic bending stress from the selected point load and support condition.',
  strengthUse: 'Calculated bending stress divided by the selected material reference. Values above 100% exceed that reference.',
  physicalThreshold: 'Estimated load corresponding to first steel yield or the selected natural-material physical bending threshold. It is not automatically an allowable design load.',
  mass: 'Calculated or catalog mass of the full member length. Missing density means mass cannot be ranked honestly.',
  inertia: 'Second moment of area. Larger inertia generally reduces bending deflection and raises Euler buckling resistance.',
  modulus: 'Elastic section modulus used to convert bending moment into extreme-fibre stress.',
  stock: 'Longest listed or verified single-piece length. A longer member needs a designed splice and connection check.',
  comparisonCapacity: 'For steel, this is a preliminary ASD available global-buckling strength from an AISC-style column curve. For wood or bamboo, this is only an Euler/material research screening ceiling.',
  euler: 'Theoretical elastic buckling load for a perfectly straight, perfectly centered member with the selected effective unbraced length. Real capacity is usually lower.',
  materialCompression: 'Axial load obtained from the selected compression reference times gross area. For coco, the source is a short-specimen research average, not a sawn-shore allowable value.',
  capacityUse: 'Applied axial load divided by the capacity used for this comparison. Above 100% fails the current capacity basis.',
  amplifiedStress: 'Axial stress plus eccentric bending stress amplified as the load approaches the theoretical Euler load.',
  unbracedLength: 'Distance between effective lateral restraint points. One ideal midheight brace divides a 3 m member into two 1.5 m unbraced segments.',
  slenderness: 'Effective unbraced length divided by radius of gyration. Larger slenderness means greater sensitivity to buckling and imperfections.',
  shortening: 'Immediate elastic axial shortening from PL/AE. It excludes joint slip, crushing, moisture effects and settlement.',
  brace: 'A brace counts only when it restrains lateral translation in the governing buckling direction and has adequate strength, stiffness, anchorage and load path.'
};

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
function helpLabel(label, key) {
  const text = HELP[key] ?? '';
  return `<span class="help-term" tabindex="0" data-help="${esc(text)}">${esc(label)} <span class="help-icon" aria-hidden="true">i</span></span>`;
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
      <label><span>${helpLabel('Material / grade dataset', 'material')}</span><select data-slot-material="${index}" ${slot.enabled ? '' : 'disabled'}>${materialOptions(slot.materialId)}</select></label>
      <label><span>${helpLabel('Section / product', 'section')}</span><select data-slot-preset="${index}" ${slot.enabled ? '' : 'disabled'}>${presetOptions(material, slot.presetId)}</select></label>
      <label><span>${helpLabel('Orientation', 'orientation')}</span><select data-slot-orientation="${index}" ${slot.enabled && canRotate(preset) ? '' : 'disabled'}><option value="listed" ${slot.orientation === 'listed' ? 'selected' : ''}>As listed</option><option value="rotated" ${slot.orientation === 'rotated' ? 'selected' : ''}>Rotate 90°</option></select></label>
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

function compressionBadge(record) {
  if (!record.pass) return { label: 'FAIL', className: 'recommend-badge--fail' };
  if (record.screeningOnly) return { label: 'SCREENING', className: 'recommend-badge--screening' };
  return { label: 'PRELIM PASS', className: 'recommend-badge--pass' };
}

function resultCard(record) {
  const badge = mode === 'beam'
    ? { label: record.pass ? 'PASS' : 'FAIL', className: record.pass ? 'recommend-badge--pass' : 'recommend-badge--fail' }
    : compressionBadge(record);
  const cardState = !record.pass ? 'is-fail' : mode === 'compression' && record.screeningOnly ? 'is-screening' : 'is-pass';
  const metrics = mode === 'beam'
    ? `<div><dt>${helpLabel('Deflection', 'deflection')}</dt><dd>${format(record.result.maxDeflectionMm, 2)} mm</dd></div>
       <div><dt>${helpLabel('Bending stress', 'bendingStress')}</dt><dd>${format(record.result.maxBendingStressMPa, 1)} MPa</dd></div>
       <div><dt>${helpLabel('Strength use', 'strengthUse')}</dt><dd>${record.strengthRatio == null ? 'unrated' : `${format(record.strengthRatio * 100, 1)}%`}</dd></div>
       <div><dt>${helpLabel('Member mass', 'mass')}</dt><dd>${format(record.totalMassKg, 2)} kg</dd></div>`
    : `<div><dt>${helpLabel(record.capacityLabel, 'comparisonCapacity')}</dt><dd>${formatLoadEquivalents(record.result.comparisonCapacityKN)}</dd></div>
       <div><dt>${helpLabel('Governing use', 'capacityUse')}</dt><dd>${format(record.governingRatio * 100, 1)}%</dd></div>
       <div><dt>${helpLabel('Unbraced segment', 'unbracedLength')}</dt><dd>${format(record.result.unbracedLengthM, 2)} m</dd></div>
       <div><dt>${helpLabel('Shortening', 'shortening')}</dt><dd>${format(record.result.shorteningMm, 3)} mm</dd></div>`;
  return `<article class="compare-result-card ${cardState} ${record.winnerFlags.lightestPassing ? 'is-primary-winner' : ''}">
    <div class="compare-result-card__visual">${sectionSketchSvg(record.section, record.family)}</div>
    <div class="compare-result-card__body">
      <div class="compare-result-card__status"><span class="recommend-badge ${badge.className}">${badge.label}</span>${winnerChips(record)}</div>
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
    [helpLabel('Status', 'status'), (r) => metricCell(r, r.pass ? 'PASS' : 'FAIL')],
    [helpLabel('Product / section', 'section'), (r) => metricCell(r, esc(r.sectionLabel.replace(/ —.*/, '')), null, esc(r.orientation))],
    [helpLabel('Maximum deflection', 'deflection'), (r) => metricCell(r, `${format(r.result.maxDeflectionMm, 2)} mm`, 'leastDeflection', `${format(r.deflectionRatio * 100, 1)}% of L/${numeric(elements.compareDeflectionSelect)}`)],
    [helpLabel('Maximum bending stress', 'bendingStress'), (r) => metricCell(r, `${format(r.result.maxBendingStressMPa, 1)} MPa`)],
    [helpLabel('Strength-reference use', 'strengthUse'), (r) => metricCell(r, r.strengthRatio == null ? 'unrated' : `${format(r.strengthRatio * 100, 1)}%`, 'lowestStrengthUse', r.strengthReferenceLabel)],
    [helpLabel('Physical threshold load', 'physicalThreshold'), (r) => metricCell(r, r.physicalThresholdLoadKN == null ? '—' : formatLoadEquivalents(r.physicalThresholdLoadKN), 'highestPhysicalThreshold', thresholdLabel(r))],
    [helpLabel('Total member mass', 'mass'), (r) => metricCell(r, `${format(r.totalMassKg, 2)} kg`, 'lightestPassing', Number.isFinite(r.massPerM) ? `${format(r.massPerM, 2)} kg/m` : 'density pending')],
    [helpLabel('Strong-axis inertia Iₓ', 'inertia'), (r) => metricCell(r, `${format(r.properties.ixMm4, 0)} mm⁴`)],
    [helpLabel('Strong-axis modulus Zₓ', 'modulus'), (r) => metricCell(r, `${format(r.properties.zxMm3, 0)} mm³`)],
    [helpLabel('Stock / usable length', 'stock'), (r) => metricCell(r, r.stockBoundaryM == null ? 'verify' : `${format(r.stockBoundaryM, 2)} m`, null, r.stockPass ? 'length check passes' : 'splice required')]
  ];
  const compressionRows = [
    [helpLabel('Status', 'status'), (r) => metricCell(r, r.statusLabel)],
    [helpLabel('Product / section', 'section'), (r) => metricCell(r, esc(r.sectionLabel.replace(/ —.*/, '')), null, esc(r.orientation))],
    [helpLabel('Capacity used for comparison', 'comparisonCapacity'), (r) => metricCell(r, formatLoadEquivalents(r.result.comparisonCapacityKN), 'highestCompressionCapacity', r.result.capacityBasis)],
    [helpLabel('Euler theoretical upper bound', 'euler'), (r) => metricCell(r, formatLoadEquivalents(r.result.eulerCriticalKN), null, `K=${format(r.result.k, 3)} · λ=${format(r.result.slenderness, 1)}`)],
    [helpLabel('Material compression reference load', 'materialCompression'), (r) => metricCell(r, formatLoadEquivalents(r.result.squashCapacityKN), null, `${format(r.compressionStrengthMPa, 1)} MPa reference`)],
    [helpLabel('Capacity use', 'capacityUse'), (r) => metricCell(r, `${format(r.capacityRatio * 100, 1)}%`, 'lowestCompressionUse', 'applied load / comparison capacity')],
    [helpLabel('Amplified compression stress', 'amplifiedStress'), (r) => metricCell(r, `${format(r.result.maxCompressionStressMPa, 1)} MPa`, null, `${format(r.stressRatio * 100, 1)}% of compression reference`)],
    [helpLabel('Unbraced segment length', 'unbracedLength'), (r) => metricCell(r, `${format(r.result.unbracedLengthM, 3)} m`, null, `${r.result.segmentCount} segment${r.result.segmentCount === 1 ? '' : 's'} · ${r.result.braceAssumption}`)],
    [helpLabel('Effective slenderness KL/r', 'slenderness'), (r) => metricCell(r, format(r.result.slenderness, 1), null, r.result.slenderness > 200 ? 'very slender; verify applicability' : 'screening value')],
    [helpLabel('Elastic shortening', 'shortening'), (r) => metricCell(r, `${format(r.result.shorteningMm, 3)} mm`, 'leastShortening')],
    [helpLabel('Weak-axis inertia', 'inertia'), (r) => metricCell(r, `${format(r.result.governingI, 0)} mm⁴`, null, `${r.result.governingAxis}-axis governs`)],
    [helpLabel('Total member mass', 'mass'), (r) => metricCell(r, Number.isFinite(r.totalMassKg) ? `${format(r.totalMassKg, 2)} kg` : 'unrated', 'lightestPassing', Number.isFinite(r.massPerM) ? `${format(r.massPerM, 2)} kg/m` : 'density pending')],
    [helpLabel('Stock / usable length', 'stock'), (r) => metricCell(r, r.stockBoundaryM == null ? 'verify' : `${format(r.stockBoundaryM, 2)} m`, null, r.stockPass ? 'length check passes' : 'splice required')]
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
  const bracePoints = numeric(elements.compareBracePointsSelect);
  const braceText = bracePoints > 0
    ? `${bracePoints} ideal intermediate brace point${bracePoints === 1 ? '' : 's'} assumed. Brace strength, stiffness, connection and anchorage are not yet designed.`
    : 'No intermediate lateral brace is assumed.';
  elements.compareSummary.innerHTML = `<strong>${result.passingCount} of ${result.records.length} members remain below the current compression comparison thresholds.</strong><p>${result.screeningCount ? `${result.screeningCount} natural-material result${result.screeningCount === 1 ? ' is' : 's are'} SCREENING only—not design-rated passes. ` : ''}${lightest ? `Lightest below-threshold option: <b>${esc(lightest.comparisonLabel)} — ${esc(lightest.sectionLabel.replace(/ —.*/, ''))}</b>. ` : ''}${leastUse ? `Lowest governing use: <b>${esc(leastUse.comparisonLabel)}</b>. ` : ''}${highestCapacity ? `Highest comparison capacity: <b>${esc(highestCapacity.comparisonLabel)}</b>. ` : ''}${esc(braceText)}</p>`;
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
      const bracePoints = numeric(elements.compareBracePointsSelect);
      const segmentLength = lengthM / (bracePoints + 1);
      elements.compareLoadEquivalent.innerHTML = `<p class="eyebrow">Applied to every column</p><strong>${formatLoadEquivalents(loadKN)}</strong><p>Full clear height ${format(lengthM, 2)} m · ideal unbraced segment ${format(segmentLength, 2)} m · ${bracePoints} intermediate brace point${bracePoints === 1 ? '' : 's'}.</p>`;
      result = compareCompressionCandidates({
        selections,
        lengthM,
        axialLoadKN: loadKN,
        eccentricityMm: numeric(elements.compareEccentricityInput),
        boundary: elements.compareColumnBoundarySelect.value,
        intermediateBracePoints: bracePoints
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
  elements.compareConditionsTitle.textContent = beam ? 'Shared load and span' : 'Shared axial load, clear height and bracing';
  elements.compareLoadLabel.childNodes[0].nodeValue = beam ? 'Point load ' : 'Axial compression load ';
  elements.compareLoadLabel.dataset.help = beam
    ? 'The same point load is applied to every beam. Load position and support condition control moment and deflection.'
    : 'The same axial load is applied to every column. A perfectly centered load is idealized; eccentricity and crookedness increase compression plus bending.';
  elements.compareResultsTitle.textContent = beam ? 'Direct bending results' : 'Direct compression results';
  elements.compareFairRule.textContent = beam
    ? 'All selected members receive the same idealised point load, span, support case, and deflection criterion. Material source assumptions, actual section geometry, stock limits, and pass/fail references remain specific to each member.'
    : 'All selected members receive the same axial load, full clear height, end restraint, eccentricity and number of ideal lateral brace points. Steel uses a preliminary AISC-style ASD global-buckling curve. Natural materials remain research screening only.';
  elements.compareBoundaryNote.textContent = beam
    ? 'This is an elastic beam-member comparison. It does not yet compare connection capacity, support bearing, local/lateral-torsional buckling, corrosion, treatment, fabrication, installed cost, or nonlinear fracture. A lighter passing member is not automatically the cheapest or most buildable solution.'
    : 'Compression results are preliminary. Steel uses a global flexural-buckling column curve and ASD divisor but still omits local buckling, exact certified grade, connection eccentricity, corrosion and system sway. Wood and bamboo capacities are screening ceilings until a graded/code-rated column basis is attached. An entered brace is assumed perfectly effective; its required strength, stiffness, connection and anchorage are not yet checked.';
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
  elements.compareEccentricityInput.value = '10';
  elements.compareBracePointsSelect.value = '0';
  renderSelectors();
  syncModeUi();
  renderResults();
}

for (const id of ['compareLoadInput', 'compareLoadUnitSelect', 'compareLoadPositionInput', 'compareDeflectionSelect', 'compareEccentricityInput', 'compareBracePointsSelect', 'compareColumnBoundarySelect']) {
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
