import { getMaterial } from '../data/materials.js';
import { evaluateBeamLimitState, evaluateColumnLimitState } from '../solver/limitStates.js';
import { formatLoadEquivalents } from '../utils/loadUnits.js';

const errorBanner = document.getElementById('errorBanner');
const resultCards = document.getElementById('resultCards');
const materialSelect = document.getElementById('materialSelect');
const lengthInput = document.getElementById('lengthInput');
const loadInput = document.getElementById('loadInput');
const beamModeButton = document.getElementById('beamModeButton');

const capacityBanner = document.createElement('section');
capacityBanner.id = 'capacityBanner';
capacityBanner.className = 'capacity-banner is-hidden';
capacityBanner.setAttribute('role', 'status');
capacityBanner.setAttribute('aria-live', 'assertive');
errorBanner.insertAdjacentElement('afterend', capacityBanner);

function parseFirstNumber(text) {
  const match = String(text ?? '').replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function resultValue(label) {
  const card = [...resultCards.querySelectorAll('.result-card')]
    .find((candidate) => candidate.querySelector('span')?.textContent.trim() === label);
  return card ? parseFirstNumber(card.querySelector('strong')?.textContent) : null;
}

function renderThresholds(thresholds) {
  const unique = thresholds
    .filter((item) => Number.isFinite(item.estimatedLoadKN))
    .sort((a, b) => a.estimatedLoadKN - b.estimatedLoadKN)
    .filter((item, index, list) => index === 0 || Math.abs(item.estimatedLoadKN - list[index - 1].estimatedLoadKN) > 1e-6);

  if (unique.length === 0) return '';
  return `
    <div class="capacity-banner__thresholds">
      ${unique.map((item) => `
        <span><b>${item.label}:</b> ${formatLoadEquivalents(item.estimatedLoadKN)} <small>(${item.basis})</small></span>
      `).join('')}
    </div>
  `;
}

function renderState(state) {
  capacityBanner.className = `capacity-banner capacity-banner--${state.severity}`;
  capacityBanner.dataset.state = state.code;
  document.documentElement.dataset.analysisState = state.code;
  capacityBanner.innerHTML = `
    <div class="capacity-banner__heading">
      <span>LIVE LIMIT-STATE CHECK</span>
      <strong>${state.title}</strong>
    </div>
    <p>${state.message}</p>
    ${renderThresholds(state.thresholds)}
  `;
}

function updateCapacityWarning() {
  if (!errorBanner.classList.contains('is-hidden') || resultCards.children.length === 0) {
    capacityBanner.classList.add('is-hidden');
    return;
  }

  const material = getMaterial(materialSelect.value);
  const loadKN = Number(loadInput.value);
  const isBeam = beamModeButton.classList.contains('is-active');

  if (isBeam) {
    const maxDeflectionMm = resultValue('Maximum deflection');
    const maxBendingStressMPa = resultValue('Maximum bending stress');
    const lengthM = Number(lengthInput.value);
    if (![maxDeflectionMm, maxBendingStressMPa, lengthM, loadKN].every(Number.isFinite)) return;

    renderState(evaluateBeamLimitState({
      family: material.family,
      loadKN,
      maxDeflectionMm,
      deflectionLimitMm: lengthM * 1000 / 360,
      maxBendingStressMPa,
      allowableBendingMPa: material.allowableBendingMPa,
      yieldStrengthMPa: material.yieldStrengthMPa,
      ultimateBendingMPa: material.ultimateBendingMPa
    }));
    return;
  }

  const predictedCapacityKN = resultValue('Predicted governing capacity');
  const maxCompressionStressMPa = resultValue('Maximum compression stress');
  const compressionStrengthMPa = material.compressionParallelMPa ?? material.yieldStrengthMPa;
  if (![predictedCapacityKN, compressionStrengthMPa, loadKN].every(Number.isFinite)) return;

  renderState(evaluateColumnLimitState({
    family: material.family,
    loadKN,
    predictedCapacityKN,
    maxCompressionStressMPa,
    compressionStrengthMPa
  }));
}

let updateQueued = false;
function scheduleUpdate() {
  if (updateQueued) return;
  updateQueued = true;
  requestAnimationFrame(() => {
    updateQueued = false;
    updateCapacityWarning();
  });
}

new MutationObserver(scheduleUpdate).observe(resultCards, { childList: true, subtree: true, characterData: true });
document.addEventListener('input', scheduleUpdate);
document.addEventListener('change', scheduleUpdate);
document.addEventListener('click', scheduleUpdate);
scheduleUpdate();
