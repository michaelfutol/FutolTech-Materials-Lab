import { MATERIALS, getMaterial } from './data/materials.js';
import { calculateSectionProperties } from './solver/sections.js';
import { solveBeam } from './solver/beamFem.js';
import { solveColumn } from './solver/column.js';
import { drawBeamDiagram, drawColumnDiagram } from './components/specimenDiagram.js';

const elements = Object.fromEntries([
  'materialSelect', 'sectionTypeSelect', 'lengthInput', 'loadInput', 'loadPositionInput',
  'eccentricityInput', 'leftSupportSelect', 'rightSupportSelect', 'widthInput', 'depthInput',
  'thicknessInput', 'thicknessLabel', 'sourceCard', 'workspaceTitle', 'magnificationSelect',
  'errorBanner', 'specimenDiagram', 'resultCards', 'sectionResults', 'interpretation',
  'beamModeButton', 'columnModeButton', 'resetButton', 'lengthHelp'
].map((id) => [id, document.getElementById(id)]));

let mode = 'beam';

function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function currentSection() {
  return {
    type: elements.sectionTypeSelect.value,
    widthMm: Number(elements.widthInput.value),
    depthMm: Number(elements.depthInput.value),
    thicknessMm: Number(elements.thicknessInput.value)
  };
}

function populateMaterials() {
  elements.materialSelect.innerHTML = MATERIALS.map((material) => `<option value="${material.id}">${material.name}</option>`).join('');
}

function setBenchmark() {
  mode = 'beam';
  elements.materialSelect.value = 'coco-uh-2007-average';
  elements.sectionTypeSelect.value = 'rectangle';
  elements.lengthInput.value = '3';
  elements.loadInput.value = '1';
  elements.loadPositionInput.value = '1.5';
  elements.eccentricityInput.value = '0';
  elements.leftSupportSelect.value = 'pin';
  elements.rightSupportSelect.value = 'roller';
  elements.widthInput.value = '50';
  elements.depthInput.value = '100';
  elements.thicknessInput.value = '1.5';
  syncModeUi();
  analyse();
}

function syncMaterialDefaults() {
  const material = getMaterial(elements.materialSelect.value);
  elements.lengthInput.max = String(material.maxLengthM);
  elements.lengthHelp.textContent = `${material.family === 'wood' ? 'Wood' : 'Steel'} range: 0.60–${material.maxLengthM.toFixed(2)} m`;
  if (Number(elements.lengthInput.value) > material.maxLengthM) elements.lengthInput.value = String(material.maxLengthM);

  if (material.family === 'steel' && elements.sectionTypeSelect.value === 'rectangle') {
    elements.sectionTypeSelect.value = 'rhs';
    elements.widthInput.value = '50.8';
    elements.depthInput.value = '50.8';
    elements.thicknessInput.value = '1.5';
  }
  if (material.family === 'wood' && elements.sectionTypeSelect.value === 'rhs') {
    elements.sectionTypeSelect.value = 'rectangle';
    elements.widthInput.value = '50';
    elements.depthInput.value = '100';
  }
  syncSectionUi();
}

function syncSectionUi() {
  elements.thicknessLabel.classList.toggle('is-hidden', elements.sectionTypeSelect.value !== 'rhs');
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
    ['Area', `${formatNumber(properties.areaMm2)} mm²`],
    ['Iₓ', `${formatNumber(properties.ixMm4, 0)} mm⁴`],
    ['Iᵧ', `${formatNumber(properties.iyMm4, 0)} mm⁴`],
    ['Zₓ', `${formatNumber(properties.zxMm3, 0)} mm³`],
    ['rₓ / rᵧ', `${formatNumber(properties.radiusXmm)} / ${formatNumber(properties.radiusYmm)} mm`],
    ['Mass', `${formatNumber(massPerM)} kg/m`],
    ['Orientation', `${section.depthMm} mm depth`]
  ].map(([term, detail]) => `<div><dt>${term}</dt><dd>${detail}</dd></div>`).join('');
}

function resultCard(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function renderBeam(result, material, section, lengthM, loadKN, loadPositionM) {
  const limitL360 = lengthM * 1000 / 360;
  const stressReference = material.allowableBendingMPa ?? material.yieldStrengthMPa ?? material.ultimateBendingMPa;
  const utilisation = stressReference ? result.maxBendingStressMPa / stressReference : null;
  elements.resultCards.innerHTML = [
    resultCard('Maximum deflection', `${formatNumber(result.maxDeflectionMm, 3)} mm`, `L/360 = ${formatNumber(limitL360, 2)} mm`),
    resultCard('Maximum moment', `${formatNumber(result.maxMomentKNm, 3)} kN·m`),
    resultCard('Maximum bending stress', `${formatNumber(result.maxBendingStressMPa, 2)} MPa`, stressReference ? `${formatNumber((utilisation ?? 0) * 100, 1)}% of selected reference` : ''),
    resultCard('Support reactions', `${formatNumber(result.leftReactionKN, 3)} / ${formatNumber(result.rightReactionKN, 3)} kN`, 'left / right, upward positive')
  ].join('');

  const deflectionStatus = result.maxDeflectionMm <= limitL360 ? 'within' : 'exceeds';
  const stressStatus = utilisation == null ? 'cannot yet be checked' : utilisation <= 1 ? 'is within' : 'exceeds';
  elements.interpretation.innerHTML = `
    <p>The calculated elastic deflection <strong>${deflectionStatus} L/360</strong>. The peak bending stress <strong>${stressStatus} the selected material reference</strong>.</p>
    <p>This release uses an Euler–Bernoulli beam finite-element model. Point loads are inserted at their exact position as analysis nodes; the deformation is not scripted.</p>
    ${section.type === 'rhs' ? '<p>Thin-wall local buckling, corner radii, weld-seam effects and residual stresses are not yet included in this line-element result.</p>' : '<p>Timber variability, defects, moisture adjustment, duration of load and brittle fracture are not yet represented by the deterministic line-element result.</p>'}
  `;

  drawBeamDiagram(elements.specimenDiagram, {
    result,
    lengthM,
    loadPositionM,
    loadKN,
    leftSupport: elements.leftSupportSelect.value,
    rightSupport: elements.rightSupportSelect.value,
    magnification: Number(elements.magnificationSelect.value)
  });
}

function renderColumn(result, material, loadKN, lengthM, eccentricityMm) {
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
    <p>Axial shortening is ${formatNumber(result.shorteningMm, 3)} mm. ${eccentricityMm > 0 ? 'The entered eccentricity produces first-order bending and a secant-style P–Δ amplification.' : 'The model is concentrically loaded; real members still require an initial-imperfection allowance.'}</p>
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
    magnification: Number(elements.magnificationSelect.value)
  });
}

function analyse() {
  try {
    elements.errorBanner.classList.add('is-hidden');
    const material = getMaterial(elements.materialSelect.value);
    const lengthM = Number(elements.lengthInput.value);
    if (lengthM < 0.6 || lengthM > material.maxLengthM) {
      throw new Error(`Length must be between 0.60 m and ${material.maxLengthM.toFixed(2)} m for the selected material dataset.`);
    }
    const loadKN = Number(elements.loadInput.value);
    if (loadKN < 0) throw new Error('Load cannot be negative in this release.');
    const section = currentSection();
    const properties = calculateSectionProperties(section);
    renderSource(material);
    renderSectionProperties(properties, section, material);

    if (mode === 'beam') {
      const loadPositionM = Number(elements.loadPositionInput.value);
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
        widthMm: section.widthMm,
        depthMm: section.depthMm,
        bottomSupport: elements.leftSupportSelect.value,
        topSupport: elements.rightSupportSelect.value,
        axialLoadKN: loadKN,
        eccentricityMm: Number(elements.eccentricityInput.value),
        compressionStrengthMPa
      });
      renderColumn(result, material, loadKN, lengthM, Number(elements.eccentricityInput.value));
    }
  } catch (error) {
    elements.errorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.errorBanner.classList.remove('is-hidden');
    elements.resultCards.innerHTML = '';
    elements.interpretation.innerHTML = '<p>Correct the test setup before analysis can continue.</p>';
  }
}

populateMaterials();
setBenchmark();

for (const id of [
  'materialSelect', 'sectionTypeSelect', 'lengthInput', 'loadInput', 'loadPositionInput',
  'eccentricityInput', 'leftSupportSelect', 'rightSupportSelect', 'widthInput', 'depthInput',
  'thicknessInput', 'magnificationSelect'
]) {
  elements[id].addEventListener('input', () => {
    if (id === 'materialSelect') syncMaterialDefaults();
    if (id === 'sectionTypeSelect') syncSectionUi();
    analyse();
  });
}

elements.beamModeButton.addEventListener('click', () => { mode = 'beam'; syncModeUi(); analyse(); });
elements.columnModeButton.addEventListener('click', () => { mode = 'column'; syncModeUi(); analyse(); });
elements.resetButton.addEventListener('click', setBenchmark);
