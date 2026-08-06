import { MATERIALS } from './data/materials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';
import { evaluateShoringSystem, KGF_TO_KN } from './solver/shoringLoadPath.js';

const ACTIVE_MATERIALS = MATERIALS.filter((material) => ['wood', 'steel'].includes(material.family) && material.showInPrimaryUi !== false);
const ids = [
  'slabWidthInput', 'slabLengthInput', 'slabThicknessInput', 'concreteUnitWeightInput',
  'plywoodThicknessInput', 'plywoodDensityInput', 'rebarAllowanceInput', 'constructionLoadInput',
  'miscLoadInput', 'deflectionSelect', 'joistSpacingInput', 'bearerSpacingInput', 'shoreSpacingInput',
  'joistSelfWeightInput', 'bearerSelfWeightInput', 'joistMaterialSelect', 'joistSectionSelect',
  'joistOrientationSelect', 'joistPreview', 'bearerMaterialSelect', 'bearerSectionSelect',
  'bearerOrientationSelect', 'bearerPreview', 'shoreMaterialSelect', 'shoreSectionSelect',
  'shoreOrientationSelect', 'shorePreview', 'shoreHeightInput', 'shoreEccentricityInput',
  'braceModeSelect', 'manualBraceLabel', 'manualBraceInput', 'targetUtilizationInput',
  'maximumBraceLevelsInput', 'shoringErrorBanner', 'shoringStatusBanner', 'shoringResultCards',
  'shoringPlanDiagram', 'shoringElevationDiagram', 'loadComponentBody', 'memberCheckBody',
  'shoreScheduleBody', 'shoringResetButton'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function numeric(id) { return Number(elements[id].value); }
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
function presets(material) { return presetsForFamily(material.family).filter((preset) => preset.id !== 'custom'); }
function presetById(material, id) { return presets(material).find((preset) => preset.id === id) ?? presets(material)[0]; }
function canRotate(preset) {
  if (!preset) return false;
  if (preset.type === 'rectangle' || preset.type === 'rhs') return preset.widthMm !== preset.depthMm;
  if (preset.type === 'custom') return preset.widthMm !== preset.depthMm || preset.ixMm4 !== preset.iyMm4;
  return false;
}

const roles = {
  joist: { material: 'joistMaterialSelect', section: 'joistSectionSelect', orientation: 'joistOrientationSelect', preview: 'joistPreview' },
  bearer: { material: 'bearerMaterialSelect', section: 'bearerSectionSelect', orientation: 'bearerOrientationSelect', preview: 'bearerPreview' },
  shore: { material: 'shoreMaterialSelect', section: 'shoreSectionSelect', orientation: 'shoreOrientationSelect', preview: 'shorePreview' }
};

function materialOptions() {
  return ['wood', 'steel'].map((family) => {
    const label = family === 'wood' ? 'Wood' : 'Steel';
    const options = ACTIVE_MATERIALS.filter((material) => material.family === family)
      .map((material) => `<option value="${esc(material.id)}">${esc(material.name)}</option>`).join('');
    return `<optgroup label="${label}">${options}</optgroup>`;
  }).join('');
}

function populateMaterials() {
  const html = materialOptions();
  Object.values(roles).forEach((role) => { elements[role.material].innerHTML = html; });
}

function syncRole(roleName, resetSection = false) {
  const role = roles[roleName];
  const material = materialById(elements[role.material].value);
  const previous = resetSection ? null : elements[role.section].value;
  const list = presets(material);
  elements[role.section].innerHTML = list.map((preset) => `<option value="${esc(preset.id)}">${esc(preset.label)}</option>`).join('');
  if (previous && list.some((preset) => preset.id === previous)) elements[role.section].value = previous;
  const preset = presetById(material, elements[role.section].value);
  elements[role.orientation].disabled = !canRotate(preset);
  if (!canRotate(preset)) elements[role.orientation].value = 'listed';
  elements[role.material].title = `${material.name}. ${material.source?.label ?? 'Source not assigned'}. ${material.source?.note ?? ''}`;
  elements[role.section].title = `${preset.label}. Measure or verify the actual delivered size.`;
  elements[role.preview].innerHTML = sectionSketchSvg(preset, material.family);
}

function selectedRole(roleName) {
  const role = roles[roleName];
  const material = materialById(elements[role.material].value);
  return {
    material,
    preset: presetById(material, elements[role.section].value),
    orientation: elements[role.orientation].value
  };
}

function parseBraceElevations() {
  return elements.manualBraceInput.value.split(',').map((value) => Number(value.trim())).filter(Number.isFinite);
}

function svgNode(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
function svgText(svg, x, y, text, attrs = {}) {
  const node = svgNode('text', { x, y, fill: '#cfe5ef', 'font-size': 13, ...attrs });
  node.textContent = text;
  svg.appendChild(node);
}
function addTitle(node, text) {
  const title = svgNode('title');
  title.textContent = text;
  node.appendChild(title);
}

function renderPlan(record) {
  const svg = elements.shoringPlanDiagram;
  svg.replaceChildren();
  const left = 72, top = 54, width = 620, height = 500;
  const slabWidth = numeric('slabWidthInput');
  const slabLength = numeric('slabLengthInput');
  const mapX = (x) => left + x / slabWidth * width;
  const mapY = (y) => top + y / slabLength * height;

  svg.appendChild(svgNode('rect', { x: left, y: top, width, height, rx: 4, fill: '#0c202d', stroke: '#dcecf5', 'stroke-width': 3 }));
  record.grids.joist.positionsM.forEach((yM) => {
    svg.appendChild(svgNode('line', { x1: left, y1: mapY(yM), x2: left + width, y2: mapY(yM), stroke: '#4f849e', 'stroke-width': 1.2, opacity: .82 }));
  });
  record.grids.bearer.positionsM.forEach((xM) => {
    svg.appendChild(svgNode('line', { x1: mapX(xM), y1: top, x2: mapX(xM), y2: top + height, stroke: '#f0bc5d', 'stroke-width': 4, opacity: .9 }));
  });

  const maxLoad = Math.max(record.maximumShoreLoadKN, 1e-9);
  record.shores.forEach((shore) => {
    const ratio = shore.loadKN / maxLoad;
    const circle = svgNode('circle', {
      cx: mapX(shore.xM), cy: mapY(shore.yM), r: 5 + ratio * 5,
      fill: ratio > .9 ? '#ff7c80' : ratio > .65 ? '#f0bc5d' : '#58dcb7',
      stroke: '#07131d', 'stroke-width': 2
    });
    addTitle(circle, `${shore.id} · ${shore.locationType} · geometric area ${shore.tributaryAreaM2.toFixed(3)} m² · ${formatLoadEquivalents(shore.loadKN)}`);
    svg.appendChild(circle);
  });

  svgText(svg, left, 28, `Slab ${slabWidth.toFixed(2)} m × ${slabLength.toFixed(2)} m`, { 'font-size': 16, 'font-weight': 700 });
  svgText(svg, left, 584, `Blue joists @ ${Math.round(record.grids.joist.actualSpacingM * 1000)} mm · Gold bearers @ ${Math.round(record.grids.bearer.actualSpacingM * 1000)} mm`, { 'font-size': 12 });
  svgText(svg, left, 604, `${record.counts.shores} shores · ${Math.round(record.grids.shore.actualSpacingM * 1000)} mm along bearers · hover a circle for its reaction`, { 'font-size': 12, fill: '#8eb3c7' });
}

function renderElevation(record) {
  const svg = elements.shoringElevationDiagram;
  svg.replaceChildren();
  const left = 92, right = 670, top = 82, baseY = 550;
  const heightM = numeric('shoreHeightInput');
  const mapY = (elevationM) => baseY - elevationM / heightM * 390;

  svg.appendChild(svgNode('rect', { x: left, y: top - 30, width: right - left, height: 34, fill: '#8a8f96', stroke: '#dcecf5', 'stroke-width': 2 }));
  svgText(svg, (left + right) / 2, top - 40, `Fresh slab ${numeric('slabThicknessInput').toFixed(0)} mm`, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700 });
  svg.appendChild(svgNode('rect', { x: left, y: top + 5, width: right - left, height: 8, fill: '#c99a61' }));
  svgText(svg, right - 5, top + 30, `Plywood ${numeric('plywoodThicknessInput').toFixed(1)} mm`, { 'text-anchor': 'end', 'font-size': 11 });
  for (let x = left + 30; x < right; x += 55) svg.appendChild(svgNode('rect', { x, y: top + 16, width: 10, height: 25, fill: '#4f849e' }));
  svg.appendChild(svgNode('rect', { x: left + 8, y: top + 44, width: right - left - 16, height: 18, fill: '#f0bc5d' }));
  svgText(svg, right - 5, top + 78, 'Joists over bearer', { 'text-anchor': 'end', 'font-size': 11 });

  const shoreXs = [left + 70, (left + right) / 2, right - 70];
  shoreXs.forEach((x) => {
    svg.appendChild(svgNode('line', { x1: x, y1: top + 62, x2: x, y2: baseY, stroke: '#58dcb7', 'stroke-width': 9 }));
    svg.appendChild(svgNode('rect', { x: x - 22, y: baseY, width: 44, height: 8, fill: '#dcecf5' }));
  });

  record.braceElevationsM.forEach((elevationM, index) => {
    const y = mapY(elevationM);
    svg.appendChild(svgNode('line', { x1: shoreXs[0], y1: y, x2: shoreXs[2], y2: y, stroke: '#f0bc5d', 'stroke-width': 5 }));
    const lowerY = index === 0 ? baseY : mapY(record.braceElevationsM[index - 1]);
    svg.appendChild(svgNode('line', { x1: shoreXs[0], y1: lowerY, x2: shoreXs[1], y2: y, stroke: '#ff9f68', 'stroke-width': 3 }));
    svg.appendChild(svgNode('line', { x1: shoreXs[1], y1: y, x2: shoreXs[2], y2: lowerY, stroke: '#ff9f68', 'stroke-width': 3 }));
    svgText(svg, right - 4, y - 7, `${elevationM.toFixed(2)} m`, { 'text-anchor': 'end', fill: '#f0bc5d', 'font-size': 11 });
  });
  if (record.braceElevationsM.length) {
    const lastBraceY = mapY(record.braceElevationsM.at(-1));
    svg.appendChild(svgNode('line', { x1: shoreXs[0], y1: lastBraceY, x2: shoreXs[1], y2: top + 62, stroke: '#ff9f68', 'stroke-width': 3 }));
    svg.appendChild(svgNode('line', { x1: shoreXs[1], y1: top + 62, x2: shoreXs[2], y2: lastBraceY, stroke: '#ff9f68', 'stroke-width': 3 }));
  }

  svgText(svg, left, 28, `Shore height ${heightM.toFixed(2)} m · ${record.braceElevationsM.length} intermediate level(s)`, { 'font-size': 16, 'font-weight': 700 });
  svgText(svg, left, 584, `Longest screened segment: ${record.shoreAssessment.brace.longestUnbracedM.toFixed(2)} m`, { 'font-size': 13, fill: '#f0bc5d' });
  svgText(svg, left, 605, record.braceElevationsM.length
    ? 'Shown ledgers/diagonals are assumptions only; their members and joints are not designed.'
    : 'No intermediate point needed by the column screen; full field bracing is still required.', { 'font-size': 11, fill: '#8eb3c7' });
}

function renderLoadComponents(record) {
  const components = [
    ['Fresh concrete', record.areaLoad.freshConcreteKNM2],
    ['Plywood self-weight', record.areaLoad.plywoodKNM2],
    ['Rebar allowance', record.areaLoad.rebarKNM2],
    ['Construction load', record.areaLoad.constructionKNM2],
    ['Other allowance', record.areaLoad.miscellaneousKNM2],
    ['TOTAL AREA LOAD', record.areaLoad.totalKNM2]
  ];
  elements.loadComponentBody.innerHTML = components.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${format(value, 3)}</td><td>${format(value / KGF_TO_KN, 1)}</td></tr>`).join('');
}

function flexuralRow(label, member) {
  return `<tr title="${esc(member.reference.label)}; continuous over all shown supports"><td>${esc(label)}</td><td>${esc(member.status)}</td><td>${format(member.strengthRatio * 100, 1)}%</td><td>${format(member.deflectionRatio * 100, 1)}%</td><td>${format(member.governingSpanM, 2)} m</td></tr>`;
}
function renderMemberChecks(record) {
  elements.memberCheckBody.innerHTML = [
    flexuralRow(`Joist ${record.joistGoverning.id}`, record.joist),
    flexuralRow(`Bearer ${record.bearerGoverning.id}`, record.bearerGoverning.member),
    `<tr title="${esc(record.shoreAssessment.result.capacityBasis)}; global column screening only"><td>Maximum-loaded shore</td><td>${esc(record.shoreAssessment.status)}</td><td>${format(record.shoreAssessment.utilization * 100, 1)}% capacity</td><td>${format(record.shoreAssessment.stressUtilization * 100, 1)}% stress</td><td>${format(record.shoreAssessment.brace.longestUnbracedM, 2)} m</td></tr>`
  ].join('');
}

function renderShoreSchedule(record) {
  const max = Math.max(record.maximumShoreLoadKN, 1e-9);
  elements.shoreScheduleBody.innerHTML = [...record.shores]
    .sort((a, b) => b.loadKN - a.loadKN)
    .map((shore) => `<tr><td>${esc(shore.id)}</td><td>${esc(shore.locationType)}</td><td>${format(shore.xM, 2)}, ${format(shore.yM, 2)} m</td><td>${format(shore.tributaryAreaM2, 3)} m²</td><td>${formatLoadEquivalents(shore.loadKN)}</td><td>${format(shore.loadKN / max * 100, 1)}%</td></tr>`).join('');
}

function braceText(record) {
  const levels = record.braceElevationsM.length
    ? `${record.braceElevationsM.map((value) => value.toFixed(2)).join(', ')} m`
    : 'none';
  if (record.braceMode === 'manual') return `Manual intermediate levels: ${levels}`;
  if (record.braceSuggestion.recommended.count === 0) {
    return 'No intermediate level needed by the individual-shore buckling screen';
  }
  return `Buckling screen: ${record.braceSuggestion.recommended.count} level(s) at ${levels}${record.braceSuggestion.targetMet ? '' : ' · target not reached'}`;
}

function renderRecord(record) {
  const statusClass = record.status === 'FAIL' ? 'is-fail' : 'is-screening';
  const suggestionText = braceText(record);
  elements.shoringStatusBanner.className = `shoring-status ${statusClass}`;
  elements.shoringStatusBanner.innerHTML = `<p class="eyebrow">Current result</p><h3>${esc(record.status)}</h3><p>${record.counts.joists} joists · ${record.counts.bearers} bearers · ${record.counts.shores} shores. ${esc(suggestionText)}. Full lateral bracing is still required and not designed here.</p>`;
  elements.shoringResultCards.innerHTML = [
    ['Total area load', `${format(record.areaLoad.totalKNM2, 3)} kN/m²`, `≈ ${format(record.areaLoad.totalKgfM2, 1)} kgf/m²`],
    ['Total vertical load', formatLoadEquivalents(record.totalVerticalLoadKN), `reaction balance error ${format(record.reactionErrorRatio * 100, 4)}%`],
    ['Maximum shore reaction', formatLoadEquivalents(record.maximumShoreLoadKN), `${format(record.shoreAssessment.utilization * 100, 1)}% of screening capacity`],
    ['Shore count', String(record.counts.shores), `${record.counts.bearers} bearer lines × ${record.grids.shore.positionsM.length} shores`],
    ['Actual grid', `${Math.round(record.grids.bearer.actualSpacingM * 1000)} × ${Math.round(record.grids.shore.actualSpacingM * 1000)} mm`, 'bearer spacing × shore spacing'],
    ['Intermediate buckling screen', suggestionText, `longest segment ${format(record.shoreAssessment.brace.longestUnbracedM, 2)} m`]
  ].map(([label, value, note]) => `<article class="result-card" title="${esc(note)}"><p>${esc(label)}</p><strong>${value}</strong><small>${esc(note)}</small></article>`).join('');
  renderPlan(record);
  renderElevation(record);
  renderLoadComponents(record);
  renderMemberChecks(record);
  renderShoreSchedule(record);
}

function render() {
  try {
    elements.shoringErrorBanner.classList.add('is-hidden');
    elements.manualBraceLabel.classList.toggle('is-hidden', elements.braceModeSelect.value !== 'manual');
    Object.keys(roles).forEach((roleName) => syncRole(roleName, false));
    const joist = selectedRole('joist');
    const bearer = selectedRole('bearer');
    const shore = selectedRole('shore');
    const record = evaluateShoringSystem({
      slabWidthM: numeric('slabWidthInput'),
      slabLengthM: numeric('slabLengthInput'),
      slabThicknessMm: numeric('slabThicknessInput'),
      concreteUnitWeightKNM3: numeric('concreteUnitWeightInput'),
      plywoodThicknessMm: numeric('plywoodThicknessInput'),
      plywoodDensityKgM3: numeric('plywoodDensityInput'),
      rebarAllowanceKgfM2: numeric('rebarAllowanceInput'),
      constructionLiveLoadKgfM2: numeric('constructionLoadInput'),
      miscellaneousLoadKgfM2: numeric('miscLoadInput'),
      joistTargetSpacingM: numeric('joistSpacingInput') / 1000,
      bearerTargetSpacingM: numeric('bearerSpacingInput') / 1000,
      shoreTargetSpacingM: numeric('shoreSpacingInput') / 1000,
      joistSelfWeightKNM: numeric('joistSelfWeightInput') * KGF_TO_KN,
      bearerSelfWeightKNM: numeric('bearerSelfWeightInput') * KGF_TO_KN,
      joistMaterial: joist.material,
      joistPreset: joist.preset,
      joistOrientation: joist.orientation,
      bearerMaterial: bearer.material,
      bearerPreset: bearer.preset,
      bearerOrientation: bearer.orientation,
      shoreMaterial: shore.material,
      shorePreset: shore.preset,
      shoreOrientation: shore.orientation,
      shoreHeightM: numeric('shoreHeightInput'),
      shoreEccentricityMm: numeric('shoreEccentricityInput'),
      braceMode: elements.braceModeSelect.value,
      manualBraceElevationsM: parseBraceElevations(),
      targetShoreUtilization: numeric('targetUtilizationInput') / 100,
      maximumBraceLevels: numeric('maximumBraceLevelsInput'),
      deflectionDivisor: numeric('deflectionSelect')
    });
    renderRecord(record);
  } catch (error) {
    elements.shoringErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.shoringErrorBanner.classList.remove('is-hidden');
    elements.shoringStatusBanner.innerHTML = '';
    elements.shoringResultCards.innerHTML = '';
    elements.shoringPlanDiagram.replaceChildren();
    elements.shoringElevationDiagram.replaceChildren();
    elements.loadComponentBody.innerHTML = '';
    elements.memberCheckBody.innerHTML = '';
    elements.shoreScheduleBody.innerHTML = '';
  }
}

function setRole(roleName, materialId, sectionId, orientation = 'listed') {
  const role = roles[roleName];
  elements[role.material].value = materialId;
  syncRole(roleName, true);
  if ([...elements[role.section].options].some((option) => option.value === sectionId)) elements[role.section].value = sectionId;
  elements[role.orientation].value = orientation;
  syncRole(roleName, false);
}

function reset() {
  const values = {
    slabWidthInput: '5', slabLengthInput: '5', slabThicknessInput: '125', concreteUnitWeightInput: '24',
    plywoodThicknessInput: '12.7', plywoodDensityInput: '600', rebarAllowanceInput: '20',
    constructionLoadInput: '250', miscLoadInput: '0', deflectionSelect: '360', joistSpacingInput: '300',
    bearerSpacingInput: '800', shoreSpacingInput: '800', joistSelfWeightInput: '0', bearerSelfWeightInput: '0',
    shoreHeightInput: '3', shoreEccentricityInput: '10', braceModeSelect: 'auto', manualBraceInput: '1.0, 2.0',
    targetUtilizationInput: '80', maximumBraceLevelsInput: '4'
  };
  Object.entries(values).forEach(([id, value]) => { elements[id].value = value; });
  setRole('joist', 'coco-uh-2007-average', 'wood-2x3', 'listed');
  setRole('bearer', 'coco-uh-2007-average', 'wood-2x4', 'listed');
  setRole('shore', 'coco-uh-2007-average', 'wood-2x3', 'listed');
  elements.manualBraceLabel.classList.add('is-hidden');
  render();
}

populateMaterials();
Object.entries(roles).forEach(([roleName, role]) => {
  elements[role.material].addEventListener('change', () => { syncRole(roleName, true); render(); });
  elements[role.section].addEventListener('change', () => { syncRole(roleName, false); render(); });
  elements[role.orientation].addEventListener('change', render);
});
Object.values(elements).forEach((element) => {
  if (!element) return;
  if (element.tagName === 'INPUT') element.addEventListener('input', render);
});
elements.braceModeSelect.addEventListener('change', render);
elements.deflectionSelect.addEventListener('change', render);
elements.shoringResetButton.addEventListener('click', reset);
reset();
