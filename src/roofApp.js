import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';
import { convertAreaLoadToKNM2, evaluateRoofRafter, KGF_M2_TO_KN_M2 } from './solver/roofLoadPath.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const ids = [
  'roofRafterLengthInput', 'roofJoistSpanInput', 'roofJoistSpacingInput', 'roofSupportedSidesSelect',
  'roofAreaLoadInput', 'roofAreaLoadUnitSelect', 'roofJoistSelfWeightInput', 'roofDeflectionSelect',
  'roofExtraSupportSelect', 'roofSupportLocationLabel', 'roofSupportLocationInput', 'roofSystemLabel',
  'roofSystemSelect', 'roofMaterialSelect', 'roofSectionSelect', 'roofOrientationSelect',
  'roofSectionPreview', 'roofInputSummary', 'roofErrorBanner', 'roofStatusBanner', 'roofLoadDiagram',
  'roofResultCards', 'roofSupportTableBody', 'roofLoadTableBody', 'roofResetButton'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function numeric(element) { return Number(element.value); }
function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
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

function populateMaterialSelect() {
  elements.roofMaterialSelect.innerHTML = ['wood', 'bamboo', 'steel'].map((family) => {
    const label = family === 'wood' ? 'Wood datasets' : family === 'bamboo' ? 'Bamboo datasets' : 'Steel datasets';
    const options = ACTIVE_MATERIALS.filter((material) => material.family === family)
      .map((material) => `<option value="${esc(material.id)}">${esc(material.name)}</option>`).join('');
    return `<optgroup label="${label}">${options}</optgroup>`;
  }).join('');
}

function syncSectionOptions(reset = false) {
  const material = materialById(elements.roofMaterialSelect.value);
  const previous = reset ? null : elements.roofSectionSelect.value;
  const presets = availablePresets(material);
  elements.roofSectionSelect.innerHTML = presets
    .map((preset) => `<option value="${esc(preset.id)}">${esc(preset.label)}</option>`).join('');
  if (previous && presets.some((preset) => preset.id === previous)) elements.roofSectionSelect.value = previous;
  const preset = presetById(material, elements.roofSectionSelect.value);
  elements.roofOrientationSelect.disabled = !canRotate(preset);
  if (!canRotate(preset)) elements.roofOrientationSelect.value = 'listed';
  elements.roofSectionPreview.innerHTML = sectionSketchSvg(preset, material.family);
}

function syncSupportUi() {
  const hasSupport = elements.roofExtraSupportSelect.value === 'one';
  elements.roofSupportLocationLabel.classList.toggle('is-hidden', !hasSupport);
  elements.roofSystemLabel.classList.toggle('is-hidden', !hasSupport);
  const lengthM = numeric(elements.roofRafterLengthInput);
  elements.roofSupportLocationInput.max = String(Math.max(0.1, lengthM - 0.1));
  if (!hasSupport) elements.roofSystemSelect.value = 'continuous';
}

function svgElement(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}
function addSvgText(svg, x, y, text, attrs = {}) {
  const node = svgElement('text', { x, y, fill: '#b9d5e5', 'font-size': 14, ...attrs });
  node.textContent = text;
  svg.appendChild(node);
}
function supportSymbol(svg, x, y, internal = false) {
  svg.appendChild(svgElement('path', {
    d: `M ${x} ${y} L ${x - 18} ${y + 27} L ${x + 18} ${y + 27} Z`,
    fill: 'none', stroke: internal ? '#f0bc5d' : '#dcecf5', 'stroke-width': 3
  }));
  svg.appendChild(svgElement('line', {
    x1: x - 25, y1: y + 30, x2: x + 25, y2: y + 30,
    stroke: internal ? '#f0bc5d' : '#dcecf5', 'stroke-width': 3
  }));
}

function renderDiagram(record) {
  const svg = elements.roofLoadDiagram;
  svg.replaceChildren();
  const x0 = 70;
  const x1 = 930;
  const y0 = 292;
  const lengthM = numeric(elements.roofRafterLengthInput);
  const mapX = (xM) => x0 + (xM / lengthM) * (x1 - x0);
  const maxDeflection = Math.max(record.result.maxDeflectionMm, 1e-9);
  const scale = Math.min(72 / maxDeflection, 20);
  const pathData = record.result.deflectionSeries.map((point, index) => {
    const y = y0 - point.displacementMm * scale;
    return `${index === 0 ? 'M' : 'L'} ${mapX(point.xM).toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');

  svg.appendChild(svgElement('line', { x1: x0, y1: y0, x2: x1, y2: y0, stroke: '#567080', 'stroke-width': 3, 'stroke-dasharray': '9 8' }));
  svg.appendChild(svgElement('path', { d: pathData, fill: 'none', stroke: record.pass ? '#58dcb7' : '#ff7c80', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

  const supportXs = record.result.supportReactionsKN.map((support) => support.xM);
  supportXs.forEach((xM, index) => supportSymbol(svg, mapX(xM), y0 + 5, index > 0 && index < supportXs.length - 1));

  const maxReaction = Math.max(...record.loadPath.reactions.map((load) => load.reactionKN), 1e-9);
  const arrowEvery = Math.max(1, Math.ceil(record.loadPath.reactions.length / 12));
  record.loadPath.reactions.forEach((load, index) => {
    const x = mapX(load.xM);
    const arrowHeight = 40 + 50 * load.reactionKN / maxReaction;
    const yTop = y0 - 78 - arrowHeight;
    svg.appendChild(svgElement('line', { x1: x, y1: yTop, x2: x, y2: y0 - 20, stroke: '#f3c45f', 'stroke-width': 2.2 }));
    svg.appendChild(svgElement('path', { d: `M ${x - 6} ${y0 - 31} L ${x} ${y0 - 19} L ${x + 6} ${y0 - 31} Z`, fill: '#f3c45f' }));
    if (index % arrowEvery === 0 || index === record.loadPath.reactions.length - 1) {
      addSvgText(svg, x, yTop - 8, `${format(load.reactionKN / KGF_M2_TO_KN_M2, 0)} kgf`, { 'text-anchor': 'middle', fill: '#f3c45f', 'font-size': 11 });
    }
  });

  if (record.spliceOnExtraSupport) {
    const x = mapX(record.extraSupportM);
    svg.appendChild(svgElement('circle', { cx: x, cy: y0, r: 10, fill: '#08151f', stroke: '#f0bc5d', 'stroke-width': 4 }));
    addSvgText(svg, x, y0 + 67, 'splice directly over support', { 'text-anchor': 'middle', fill: '#f0bc5d', 'font-size': 12 });
  }
  addSvgText(svg, x0, 388, '0.00 m', { 'text-anchor': 'start' });
  addSvgText(svg, x1, 388, `${lengthM.toFixed(2)} m`, { 'text-anchor': 'end' });
  addSvgText(svg, 500, 414, `Dashed = undeformed · solid = calculated shape · ${record.loadPath.reactions.length} joist reactions`, { 'text-anchor': 'middle', fill: '#8eb3c7' });
}

function renderRecord(record) {
  elements.roofStatusBanner.className = `roof-status ${record.status === 'FAIL' ? 'is-fail' : record.status === 'SCREENING' ? 'is-screening' : ''}`;
  elements.roofStatusBanner.innerHTML = `<p class="eyebrow">Current rafter state</p><h3>${esc(record.status)}</h3><p>${esc(record.reasons.join(' · '))}</p>`;
  elements.roofResultCards.innerHTML = [
    ['Total load on selected rafter', formatLoadEquivalents(record.loadPath.totalAppliedToRafterKN), `${record.loadPath.reactions.length} joist reactions`],
    ['Maximum deflection', `${format(record.result.maxDeflectionMm, 2)} mm`, `limit ${format(record.deflectionLimitMm, 2)} mm · ${format(record.deflectionRatio * 100, 1)}%`],
    ['Maximum moment', `${format(record.result.maxMomentKNm, 3)} kN·m`, record.result.structuralSystem.replaceAll('-', ' ')],
    ['Maximum bending stress', `${format(record.result.maxBendingStressMPa, 2)} MPa`, `${format(record.strengthRatio * 100, 1)}% of ${record.strengthReferenceLabel}`],
    ['Governing clear span', `${format(record.result.governingClearSpanM, 2)} m`, record.spliceOnExtraSupport ? 'separate simple spans' : 'continuous member model'],
    ['Selected rafter tributary area', `${format(record.loadPath.selectedRafterTributaryAreaM2, 2)} m²`, `${elements.roofSupportedSidesSelect.value} supported side(s)`]
  ].map(([label, value, note]) => `<article class="result-card"><p>${esc(label)}</p><strong>${value}</strong><small>${esc(note)}</small></article>`).join('');

  elements.roofSupportTableBody.innerHTML = record.result.supportReactionsKN
    .map((support) => `<tr><td>${format(support.xM, 2)} m</td><td>${formatLoadEquivalents(support.reactionKN)}</td></tr>`).join('');
  elements.roofLoadTableBody.innerHTML = record.loadPath.reactions
    .map((load) => `<tr><td>${load.index}</td><td>${format(load.xM, 3)} m</td><td>${format(load.tributaryWidthM, 3)} m</td><td>${format(load.joistLineLoadKNM, 3)} kN/m</td><td>${formatLoadEquivalents(load.reactionKN)}</td></tr>`).join('');
  renderDiagram(record);
}

function render() {
  try {
    elements.roofErrorBanner.classList.add('is-hidden');
    syncSupportUi();
    const material = materialById(elements.roofMaterialSelect.value);
    const preset = presetById(material, elements.roofSectionSelect.value);
    elements.roofOrientationSelect.disabled = !canRotate(preset);
    if (!canRotate(preset)) elements.roofOrientationSelect.value = 'listed';
    elements.roofSectionPreview.innerHTML = sectionSketchSvg(preset, material.family);

    const areaLoadKNM2 = convertAreaLoadToKNM2(numeric(elements.roofAreaLoadInput), elements.roofAreaLoadUnitSelect.value);
    const hasExtraSupport = elements.roofExtraSupportSelect.value === 'one';
    const extraSupportM = hasExtraSupport ? numeric(elements.roofSupportLocationInput) : null;
    const joistSelfWeightKNM = numeric(elements.roofJoistSelfWeightInput) * KGF_M2_TO_KN_M2;
    const record = evaluateRoofRafter({
      material,
      preset,
      orientation: elements.roofOrientationSelect.value,
      rafterLengthM: numeric(elements.roofRafterLengthInput),
      joistSpanM: numeric(elements.roofJoistSpanInput),
      joistSpacingM: numeric(elements.roofJoistSpacingInput) / 1000,
      areaLoadKNM2,
      supportedSides: Number(elements.roofSupportedSidesSelect.value),
      joistSelfWeightKNM,
      extraSupportM,
      spliceOnExtraSupport: hasExtraSupport && elements.roofSystemSelect.value === 'splice',
      deflectionDivisor: numeric(elements.roofDeflectionSelect)
    });

    const areaLoadKgfM2 = areaLoadKNM2 / KGF_M2_TO_KN_M2;
    elements.roofInputSummary.innerHTML = `<p class="eyebrow">Generated load path</p><strong>${record.loadPath.reactions.length} joists intersect the selected rafter</strong><p>${format(areaLoadKNM2, 3)} kN/m² ≈ ${format(areaLoadKgfM2, 1)} kgf/m². Each joist receives a distributed line load based on its tributary strip, then transfers an end reaction to the selected rafter.</p>`;
    renderRecord(record);
  } catch (error) {
    elements.roofErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.roofErrorBanner.classList.remove('is-hidden');
    elements.roofStatusBanner.innerHTML = '';
    elements.roofResultCards.innerHTML = '';
    elements.roofSupportTableBody.innerHTML = '';
    elements.roofLoadTableBody.innerHTML = '';
    elements.roofLoadDiagram.replaceChildren();
  }
}

function reset() {
  elements.roofRafterLengthInput.value = '5';
  elements.roofJoistSpanInput.value = '5';
  elements.roofJoistSpacingInput.value = '300';
  elements.roofSupportedSidesSelect.value = '1';
  elements.roofAreaLoadInput.value = '100';
  elements.roofAreaLoadUnitSelect.value = 'kgf-m2';
  elements.roofJoistSelfWeightInput.value = '0';
  elements.roofDeflectionSelect.value = '240';
  elements.roofExtraSupportSelect.value = 'none';
  elements.roofSupportLocationInput.value = '2.5';
  elements.roofSystemSelect.value = 'continuous';
  elements.roofMaterialSelect.value = 'coco-uh-2007-average';
  syncSectionOptions(true);
  const material = materialById(elements.roofMaterialSelect.value);
  const preferred = availablePresets(material).find((preset) => preset.id === 'wood-2x4');
  if (preferred) elements.roofSectionSelect.value = preferred.id;
  elements.roofOrientationSelect.value = 'listed';
  syncSupportUi();
  render();
}

populateMaterialSelect();
elements.roofMaterialSelect.value = 'coco-uh-2007-average';
syncSectionOptions(true);

elements.roofMaterialSelect.addEventListener('change', () => { syncSectionOptions(true); render(); });
elements.roofSectionSelect.addEventListener('change', () => { syncSectionOptions(false); render(); });
elements.roofOrientationSelect.addEventListener('change', render);
elements.roofExtraSupportSelect.addEventListener('change', () => { syncSupportUi(); render(); });
elements.roofResetButton.addEventListener('click', reset);
for (const id of [
  'roofRafterLengthInput', 'roofJoistSpanInput', 'roofJoistSpacingInput', 'roofSupportedSidesSelect',
  'roofAreaLoadInput', 'roofAreaLoadUnitSelect', 'roofJoistSelfWeightInput', 'roofDeflectionSelect',
  'roofSupportLocationInput', 'roofSystemSelect'
]) {
  elements[id].addEventListener('input', render);
  elements[id].addEventListener('change', render);
}

reset();
