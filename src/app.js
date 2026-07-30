import { MATERIALS, getMaterial } from './data/materials.js';
import { findPreset, presetsForFamily } from './data/sectionPresets.js';
import { calculateSectionProperties } from './solver/sections.js';
import { solveBeam } from './solver/beamFem.js';
import { solveColumn } from './solver/column.js';
import { drawBeamDiagram, drawColumnDiagram } from './components/specimenDiagram.js';

const elements = Object.fromEntries([
  'materialSelect', 'sectionTypeSelect', 'sectionPresetSelect', 'lengthInput', 'loadInput',
  'loadPositionInput', 'eccentricityInput', 'leftSupportSelect', 'rightSupportSelect',
  'widthInput', 'depthInput', 'thicknessInput', 'widthLabel', 'depthLabel', 'thicknessLabel',
  'widthLabelText', 'depthLabelText', 'thicknessLabelText', 'customPropertyFields',
  'areaInput', 'ixInput', 'iyInput', 'zxInput', 'zyInput', 'rotateSectionButton',
  'sectionSummary', 'sourceCard', 'workspaceTitle', 'magnificationSelect', 'errorBanner',
  'specimenDiagram', 'resultCards', 'sectionResults', 'interpretation', 'beamModeButton',
  'columnModeButton', 'resetButton', 'lengthHelp', 'supportHelp'
].map((id) => [id, document.getElementById(id)]));

let mode = 'beam';
let activeLoadPointerId = null;
let applyingPreset = false;
let lastSectionType = 'rectangle';

function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function numeric(element) {
  return Number(element.value);
}

function sectionFromInputs(type = elements.sectionTypeSelect.value) {
  const widthMm = numeric(elements.widthInput);
  const depthMm = type === 'chs' || type === 'round' ? widthMm : numeric(elements.depthInput);
  const base = {
    type,
    widthMm,
    depthMm,
    thicknessMm: numeric(elements.thicknessInput)
  };

  if (type === 'chs' || type === 'round') base.diameterMm = widthMm;
  if (type === 'custom') {
    Object.assign(base, {
      areaMm2: numeric(elements.areaInput),
      ixMm4: numeric(elements.ixInput),
      iyMm4: numeric(elements.iyInput),
      zxMm3: numeric(elements.zxInput),
      zyMm3: numeric(elements.zyInput)
    });
  }
  return base;
}

function currentSection() {
  return sectionFromInputs();
}

function populateMaterials() {
  elements.materialSelect.innerHTML = MATERIALS
    .map((material) => `<option value="${material.id}">${material.name}</option>`)
    .join('');
}

function defaultPresetId(material) {
  return material.family === 'wood' ? 'wood-2x4' : 'shs-50-15';
}

function populateSectionPresets(material, preferredId = null) {
  const presets = presetsForFamily(material.family);
  elements.sectionPresetSelect.innerHTML = presets
    .map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
    .join('');
  const target = preferredId && presets.some((preset) => preset.id === preferredId)
    ? preferredId
    : defaultPresetId(material);
  elements.sectionPresetSelect.value = presets.some((preset) => preset.id === target) ? target : 'custom';
}

function applySelectedPreset({ analyseAfter = true } = {}) {
  const material = getMaterial(elements.materialSelect.value);
  const preset = findPreset(material.family, elements.sectionPresetSelect.value);
  if (!preset || preset.id === 'custom') {
    updateSectionSummary();
    if (analyseAfter) analyse();
    return;
  }

  applyingPreset = true;
  elements.sectionTypeSelect.value = preset.type;
  lastSectionType = preset.type;
  if (preset.widthMm != null) elements.widthInput.value = String(preset.widthMm);
  if (preset.depthMm != null) elements.depthInput.value = String(preset.depthMm);
  if (preset.thicknessMm != null) elements.thicknessInput.value = String(preset.thicknessMm);
  syncSectionUi();
  applyingPreset = false;
  if (analyseAfter) analyse();
}

function markPresetCustom() {
  if (applyingPreset) return;
  const customOption = [...elements.sectionPresetSelect.options].find((option) => option.value === 'custom');
  if (customOption) elements.sectionPresetSelect.value = 'custom';
}

function setBenchmark() {
  mode = 'beam';
  elements.materialSelect.value = 'coco-uh-2007-average';
  elements.lengthInput.value = '3';
  elements.loadInput.value = '1';
  elements.loadPositionInput.value = '1.5';
  elements.eccentricityInput.value = '0';
  elements.leftSupportSelect.value = 'pin';
  elements.rightSupportSelect.value = 'roller';
  elements.magnificationSelect.value = '50';
  syncMaterialDefaults({ resetSection: true, analyseAfter: false });
  syncModeUi();
  analyse();
}

function syncMaterialDefaults({ resetSection = false, analyseAfter = true } = {}) {
  const material = getMaterial(elements.materialSelect.value);
  elements.lengthInput.max = String(material.maxLengthM);
  elements.lengthHelp.textContent = `${material.family === 'wood' ? 'Wood' : 'Steel'} range: 0.60–${material.maxLengthM.toFixed(2)} m`;
  if (numeric(elements.lengthInput) > material.maxLengthM) elements.lengthInput.value = String(material.maxLengthM);

  if (resetSection || elements.sectionPresetSelect.options.length === 0) {
    populateSectionPresets(material);
    applySelectedPreset({ analyseAfter: false });
  } else {
    populateSectionPresets(material, 'custom');
  }
  syncSectionUi();
  if (analyseAfter) analyse();
}

function seedCustomProperties(previousType) {
  if (previousType === 'custom') return;
  try {
    const properties = calculateSectionProperties(sectionFromInputs(previousType));
    elements.areaInput.value = properties.areaMm2.toFixed(3);
    elements.ixInput.value = properties.ixMm4.toFixed(3);
    elements.iyInput.value = properties.iyMm4.toFixed(3);
    elements.zxInput.value = properties.zxMm3.toFixed(3);
    elements.zyInput.value = properties.zyMm3.toFixed(3);
  } catch {
    // Keep the existing catalog-property values if the previous geometry is incomplete.
  }
}

function handleSectionTypeChange() {
  const nextType = elements.sectionTypeSelect.value;
  if (nextType === 'custom') seedCustomProperties(lastSectionType);
  if ((nextType === 'chs' || nextType === 'round') && numeric(elements.widthInput) <= 0) {
    elements.widthInput.value = '50';
  }
  if ((nextType === 'rhs' || nextType === 'chs') && numeric(elements.thicknessInput) <= 0) {
    elements.thicknessInput.value = '1.5';
  }
  lastSectionType = nextType;
  markPresetCustom();
  syncSectionUi();
  analyse();
}

function syncSectionUi() {
  const type = elements.sectionTypeSelect.value;
  const circular = type === 'chs' || type === 'round';
  const hollow = type === 'rhs' || type === 'chs';
  const custom = type === 'custom';

  elements.widthLabel.classList.remove('is-hidden');
  elements.depthLabel.classList.toggle('is-hidden', circular);
  elements.thicknessLabel.classList.toggle('is-hidden', !hollow);
  elements.customPropertyFields.classList.toggle('is-hidden', !custom);
  elements.rotateSectionButton.disabled = circular;

  if (type === 'rectangle') {
    elements.widthLabelText.textContent = 'Actual width b, mm';
    elements.depthLabelText.textContent = 'Actual vertical depth h, mm';
  } else if (type === 'rhs') {
    elements.widthLabelText.textContent = 'Actual outside width B, mm';
    elements.depthLabelText.textContent = 'Actual vertical outside depth H, mm';
    elements.thicknessLabelText.textContent = 'Actual wall thickness t, mm';
  } else if (type === 'chs') {
    elements.widthLabelText.textContent = 'Actual outside diameter D, mm';
    elements.thicknessLabelText.textContent = 'Actual wall thickness t, mm';
  } else if (type === 'round') {
    elements.widthLabelText.textContent = 'Actual diameter D, mm';
  } else {
    elements.widthLabelText.textContent = 'Overall width, mm';
    elements.depthLabelText.textContent = 'Overall vertical depth, mm';
  }
  updateSectionSummary();
}

function sectionDescription(section = currentSection()) {
  if (section.type === 'rectangle') {
    return `${formatNumber(section.widthMm, 1)} × ${formatNumber(section.depthMm, 1)} mm solid rectangle; ${formatNumber(section.depthMm, 1)} mm vertical`;
  }
  if (section.type === 'rhs') {
    return `${formatNumber(section.depthMm, 1)} × ${formatNumber(section.widthMm, 1)} × ${formatNumber(section.thicknessMm, 2)} mm RHS/SHS; ${formatNumber(section.depthMm, 1)} mm vertical`;
  }
  if (section.type === 'chs') {
    return `CHS/pipe OD ${formatNumber(section.diameterMm, 1)} × ${formatNumber(section.thicknessMm, 2)} mm`;
  }
  if (section.type === 'round') {
    return `Solid round Ø${formatNumber(section.diameterMm, 1)} mm`;
  }
  return `Catalog/user-defined section, ${formatNumber(section.widthMm, 1)} mm overall width × ${formatNumber(section.depthMm, 1)} mm vertical depth`;
}

function updateSectionSummary() {
  elements.sectionSummary.innerHTML = `<strong>Solver uses:</strong> ${sectionDescription()}`;
}

function rotateSection() {
  const type = elements.sectionTypeSelect.value;
  if (type === 'chs' || type === 'round') return;
  const width = elements.widthInput.value;
  elements.widthInput.value = elements.depthInput.value;
  elements.depthInput.value = width;

  if (type === 'custom') {
    const ix = elements.ixInput.value;
    const zx = elements.zxInput.value;
    elements.ixInput.value = elements.iyInput.value;
    elements.iyInput.value = ix;
    elements.zxInput.value = elements.zyInput.value;
    elements.zyInput.value = zx;
  }
  markPresetCustom();
  syncSectionUi();
  analyse();
}

function syncModeUi() {
  const beam = mode === 'beam';
  elements.beamModeButton.classList.toggle('is-active', beam);
  elements.columnModeButton.classList.toggle('is-active', !beam);
  document.querySelectorAll('.beam-control').forEach((node) => node.classList.toggle('is-hidden', !beam));
  document.querySelectorAll('.column-control').forEach((node) => node.classList.toggle('is-hidden', beam));
  elements.workspaceTitle.textContent = beam ? 'Beam bending test' : 'Column compression test';
  if (!beam && elements.leftSupportSelect.value === 'pin' && elements.rightSupportSelect.value === 'roller') {
    elements.leftSupportSelect.value = 'fixed';
    elements.rightSupportSelect.value = 'free';
  }
  renderSupportHelp();
}

function renderSupportHelp() {
  const left = elements.leftSupportSelect.value;
  const right = elements.rightSupportSelect.value;
  let contextual = '';
  let warning = false;

  if (mode === 'beam') {
    if (left === 'roller' && right === 'roller') {
      warning = true;
      contextual = '<strong>Roller–roller warning:</strong> it can carry the shown vertical load in this bending-only solver, but it has no horizontal restraint in a full 2D model. Use <strong>pin + roller</strong> for the textbook simply supported beam.';
    } else if ((left === 'pin' && right === 'roller') || (left === 'roller' && right === 'pin')) {
      contextual = '<strong>Standard simply supported beam:</strong> the pin provides horizontal stability; the roller allows horizontal expansion.';
    } else if (left === 'pin' && right === 'pin') {
      contextual = '<strong>Pin–pin note:</strong> the bending curve is valid here, but a full axial model would restrain horizontal movement at both ends.';
    } else {
      contextual = 'The selected restraints are idealised. Connection flexibility is not included yet.';
    }

    elements.supportHelp.innerHTML = `
      <strong>Support guide</strong>
      <p><b>Pin / hinge:</b> vertical movement blocked, rotation free. <b>Roller:</b> vertical movement blocked, rotation and horizontal sliding free. <b>Fixed:</b> movement and rotation blocked. <b>Free:</b> no restraint.</p>
      <p><b>Current model:</b> vertical bending uses only deflection and rotation DOFs, so pin and roller give the same flexural response. ${contextual}</p>
    `;
  } else {
    elements.supportHelp.innerHTML = `
      <strong>Column end-condition guide</strong>
      <p><b>Fixed:</b> rotation restrained. <b>Pin / hinge:</b> rotation free but lateral position restrained. <b>Free:</b> no lateral or rotational restraint.</p>
      <p>For the present Euler buckling check, a roller is treated as pin-like. The displayed K factor is an ideal end-condition value, not a connection-stiffness analysis.</p>
    `;
  }
  elements.supportHelp.classList.toggle('support-help--warning', warning);
}

function renderSource(material) {
  elements.sourceCard.innerHTML = `
    <div>
      <p class="eyebrow">Property source</p>
      <strong>${material.source.label}</strong>
    </div>
    <div class="source-meta">
      <span>${material.source.status}</span>
      <span>${material.source.confidence} confidence</span>
      ${material.source.year ? `<span>${material.source.year}</span>` : ''}
    </div>
    <p>${material.source.note}</p>
  `;
}

function renderSectionProperties(properties, section, material) {
  const massPerM = properties.areaMm2 * 1e-6 * material.densityKgM3;
  elements.sectionResults.innerHTML = [
    ['Analyzed section', sectionDescription(section)],
    ['Area', `${formatNumber(properties.areaMm2)} mm²`],
    ['Iₓ', `${formatNumber(properties.ixMm4, 0)} mm⁴`],
    ['Iᵧ', `${formatNumber(properties.iyMm4, 0)} mm⁴`],
    ['Zₓ / Zᵧ', `${formatNumber(properties.zxMm3, 0)} / ${formatNumber(properties.zyMm3, 0)} mm³`],
    ['rₓ / rᵧ', `${formatNumber(properties.radiusXmm)} / ${formatNumber(properties.radiusYmm)} mm`],
    ['Calculated mass', `${formatNumber(massPerM)} kg/m`],
    ['Input basis', section.type === 'custom' ? 'User-entered catalog properties' : 'Actual geometry entered above']
  ].map(([term, detail]) => `<div><dt>${term}</dt><dd>${detail}</dd></div>`).join('');
}

function resultCard(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function peakDeflectionPoint(result) {
  return result.deflectionSeries.reduce((peak, point) => (
    Math.abs(point.displacementMm) > Math.abs(peak.displacementMm) ? point : peak
  ), result.deflectionSeries[0]);
}

function deflectionDirection(displacementMm) {
  if (displacementMm < -1e-9) return 'downward';
  if (displacementMm > 1e-9) return 'upward';
  return 'zero';
}

function renderBeam(result, material, section, lengthM, loadKN, loadPositionM) {
  const limitL360 = lengthM * 1000 / 360;
  const stressReference = material.allowableBendingMPa ?? material.yieldStrengthMPa ?? material.ultimateBendingMPa;
  const utilisation = stressReference ? result.maxBendingStressMPa / stressReference : null;
  const peak = peakDeflectionPoint(result);
  const direction = deflectionDirection(peak.displacementMm);

  elements.resultCards.innerHTML = [
    resultCard('Maximum deflection', `${formatNumber(result.maxDeflectionMm, 3)} mm ${direction}`, `at x = ${formatNumber(peak.xM, 2)} m · L/360 = ${formatNumber(limitL360, 2)} mm`),
    resultCard('Maximum moment', `${formatNumber(result.maxMomentKNm, 3)} kN·m`),
    resultCard('Maximum bending stress', `${formatNumber(result.maxBendingStressMPa, 2)} MPa`, stressReference ? `${formatNumber((utilisation ?? 0) * 100, 1)}% of selected reference` : ''),
    resultCard('Support reactions', `${formatNumber(result.leftReactionKN, 3)} / ${formatNumber(result.rightReactionKN, 3)} kN`, 'left / right, upward positive')
  ].join('');

  const deflectionStatus = result.maxDeflectionMm <= limitL360 ? 'within' : 'exceeds';
  const stressStatus = utilisation == null ? 'cannot yet be checked' : utilisation <= 1 ? 'is within' : 'exceeds';
  const sectionLimit = material.family === 'steel'
    ? '<p>Global elastic bending is shown. Local plate buckling, lateral-torsional buckling, corner radii, weld-seam effects and residual stresses are not yet included.</p>'
    : '<p>Timber variability, defects, moisture adjustment, duration of load and brittle fracture are not yet represented by the deterministic line-element result.</p>';
  elements.interpretation.innerHTML = `
    <p>The calculated elastic deflection is <strong>${direction}</strong> and <strong>${deflectionStatus} L/360</strong>. The peak bending stress <strong>${stressStatus} the selected material reference</strong>.</p>
    <p>The dashed line is the undeformed member. For the downward load shown, the turquoise member should lie <strong>below</strong> that dashed line.</p>
    <p>The analysis uses <strong>${sectionDescription(section)}</strong>. Preset names do not override the actual boxes.</p>
    <p>This release uses an Euler–Bernoulli beam finite-element model. Point loads are inserted at their exact position as analysis nodes; the deformation is not scripted.</p>
    ${sectionLimit}
  `;

  drawBeamDiagram(elements.specimenDiagram, {
    result,
    lengthM,
    loadPositionM,
    loadKN,
    leftSupport: elements.leftSupportSelect.value,
    rightSupport: elements.rightSupportSelect.value,
    magnification: numeric(elements.magnificationSelect)
  });
}

function renderColumn(result, material, section, loadKN, lengthM, eccentricityMm) {
  const capacityRatio = loadKN / result.predictedCapacityKN;
  const strengthReference = material.compressionParallelMPa ?? material.yieldStrengthMPa;
  const stressRatio = strengthReference ? result.maxCompressionStressMPa / strengthReference : null;
  elements.resultCards.innerHTML = [
    resultCard('Predicted governing capacity', `${formatNumber(result.predictedCapacityKN, 2)} kN`, result.governingMode),
    resultCard('Euler critical load', `${formatNumber(result.eulerCriticalKN, 2)} kN`, `K = ${result.k.toFixed(3)}`),
    resultCard('Slenderness KL/r', formatNumber(result.slenderness, 1), `${result.governingAxis}-axis governs`),
    resultCard('Maximum compression stress', `${formatNumber(result.maxCompressionStressMPa, 2)} MPa`, Number.isFinite(result.amplification) ? `moment amplification ${formatNumber(result.amplification, 2)}×` : 'near or beyond elastic buckling')
  ].join('');

  elements.interpretation.innerHTML = `
    <p>The applied load is <strong>${formatNumber(capacityRatio * 100, 1)}% of the predicted idealised capacity</strong>. The current governing mode is <strong>${result.governingMode.toLowerCase()}</strong>.</p>
    <p>The analysis uses <strong>${sectionDescription(section)}</strong>. Axial shortening is ${formatNumber(result.shorteningMm, 3)} mm.</p>
    <p>${eccentricityMm !== 0 ? `The entered eccentricity produces first-order bending and a secant-style P–Δ amplification using the ${result.governingAxis}-axis section modulus.` : 'The model is concentrically loaded; real members still require an initial-imperfection allowance.'}</p>
    ${stressRatio == null ? '' : `<p>The amplified compressive stress is ${formatNumber(stressRatio * 100, 1)}% of the selected material compression reference.</p>`}
    <p>The K-factor model is an idealised elastic column check, not a connection model. Local tube buckling and timber crushing/splitting require later nonlinear material modules.</p>
  `;

  drawColumnDiagram(elements.specimenDiagram, {
    result,
    lengthM,
    loadKN,
    eccentricityMm,
    bottomSupport: elements.leftSupportSelect.value,
    topSupport: elements.rightSupportSelect.value,
    magnification: numeric(elements.magnificationSelect)
  });
}

function analyse() {
  try {
    elements.errorBanner.classList.add('is-hidden');
    renderSupportHelp();
    updateSectionSummary();
    const material = getMaterial(elements.materialSelect.value);
    const lengthM = numeric(elements.lengthInput);
    if (lengthM < 0.6 || lengthM > material.maxLengthM) {
      throw new Error(`Length must be between 0.60 m and ${material.maxLengthM.toFixed(2)} m for the selected material dataset.`);
    }
    const loadKN = numeric(elements.loadInput);
    if (loadKN < 0) throw new Error('Load cannot be negative in this release.');
    const section = currentSection();
    const properties = calculateSectionProperties(section);
    renderSource(material);
    renderSectionProperties(properties, section, material);

    if (mode === 'beam') {
      const loadPositionM = numeric(elements.loadPositionInput);
      elements.loadPositionInput.max = String(lengthM);
      if (loadPositionM < 0 || loadPositionM > lengthM) throw new Error('Point-load position must lie on the member.');
      const result = solveBeam({
        lengthM,
        elasticModulusMPa: material.elasticModulusMPa,
        inertiaMm4: properties.ixMm4,
        sectionModulusMm3: properties.zxMm3,
        leftSupport: elements.leftSupportSelect.value,
        rightSupport: elements.rightSupportSelect.value,
        pointLoads: [{ xM: loadPositionM, forceKN: loadKN }]
      });
      renderBeam(result, material, section, lengthM, loadKN, loadPositionM);
    } else {
      const compressionStrengthMPa = material.compressionParallelMPa ?? material.yieldStrengthMPa;
      if (!compressionStrengthMPa) throw new Error('The selected material dataset has no compression reference.');
      const result = solveColumn({
        lengthM,
        elasticModulusMPa: material.elasticModulusMPa,
        areaMm2: properties.areaMm2,
        ixMm4: properties.ixMm4,
        iyMm4: properties.iyMm4,
        zxMm3: properties.zxMm3,
        zyMm3: properties.zyMm3,
        widthMm: section.widthMm,
        depthMm: section.depthMm,
        bottomSupport: elements.leftSupportSelect.value,
        topSupport: elements.rightSupportSelect.value,
        axialLoadKN: loadKN,
        eccentricityMm: numeric(elements.eccentricityInput),
        compressionStrengthMPa
      });
      renderColumn(result, material, section, loadKN, lengthM, numeric(elements.eccentricityInput));
    }
  } catch (error) {
    elements.errorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.errorBanner.classList.remove('is-hidden');
    elements.resultCards.innerHTML = '';
    elements.interpretation.innerHTML = '<p>Correct the test setup before analysis can continue.</p>';
  }
}

function svgCoordinateFromClientX(clientX) {
  const rect = elements.specimenDiagram.getBoundingClientRect();
  const viewBox = elements.specimenDiagram.viewBox.baseVal;
  return viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width;
}

function movePointLoadFromPointer(clientX) {
  if (mode !== 'beam') return;
  const handle = elements.specimenDiagram.querySelector('.load-handle');
  if (!handle) return;
  const x0 = Number(handle.dataset.x0);
  const x1 = Number(handle.dataset.x1);
  const lengthM = Number(handle.dataset.lengthM);
  const x = Math.max(x0, Math.min(x1, svgCoordinateFromClientX(clientX)));
  const positionM = ((x - x0) / (x1 - x0)) * lengthM;
  elements.loadPositionInput.value = positionM.toFixed(2);
  analyse();
}

function finishPointLoadDrag(event) {
  if (activeLoadPointerId !== event.pointerId) return;
  if (elements.specimenDiagram.hasPointerCapture(event.pointerId)) {
    elements.specimenDiagram.releasePointerCapture(event.pointerId);
  }
  activeLoadPointerId = null;
}

populateMaterials();
setBenchmark();

elements.materialSelect.addEventListener('change', () => syncMaterialDefaults({ resetSection: false }));
elements.sectionPresetSelect.addEventListener('change', () => applySelectedPreset());
elements.sectionTypeSelect.addEventListener('change', handleSectionTypeChange);
elements.rotateSectionButton.addEventListener('click', rotateSection);

for (const id of [
  'widthInput', 'depthInput', 'thicknessInput', 'areaInput', 'ixInput', 'iyInput', 'zxInput', 'zyInput'
]) {
  elements[id].addEventListener('input', () => {
    markPresetCustom();
    updateSectionSummary();
    analyse();
  });
}

for (const id of [
  'lengthInput', 'loadInput', 'loadPositionInput', 'eccentricityInput', 'leftSupportSelect',
  'rightSupportSelect', 'magnificationSelect'
]) {
  elements[id].addEventListener('input', analyse);
}

elements.beamModeButton.addEventListener('click', () => { mode = 'beam'; syncModeUi(); analyse(); });
elements.columnModeButton.addEventListener('click', () => { mode = 'column'; syncModeUi(); analyse(); });
elements.resetButton.addEventListener('click', setBenchmark);

elements.specimenDiagram.addEventListener('pointerdown', (event) => {
  const target = event.target;
  if (mode !== 'beam' || !(target instanceof Element) || !target.closest('.load-handle')) return;
  activeLoadPointerId = event.pointerId;
  elements.specimenDiagram.setPointerCapture(event.pointerId);
  movePointLoadFromPointer(event.clientX);
});

elements.specimenDiagram.addEventListener('pointermove', (event) => {
  if (activeLoadPointerId !== event.pointerId) return;
  movePointLoadFromPointer(event.clientX);
});

elements.specimenDiagram.addEventListener('pointerup', finishPointLoadDrag);
elements.specimenDiagram.addEventListener('pointercancel', finishPointLoadDrag);
