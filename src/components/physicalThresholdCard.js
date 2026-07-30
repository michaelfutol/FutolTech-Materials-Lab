import { getMaterial } from '../data/materials.js';

const resultCards = document.getElementById('resultCards');
const materialSelect = document.getElementById('materialSelect');
const loadInput = document.getElementById('loadInput');
const beamModeButton = document.getElementById('beamModeButton');
const errorBanner = document.getElementById('errorBanner');

if (!resultCards || !materialSelect || !loadInput || !beamModeButton || !errorBanner) {
  throw new Error('Physical-threshold card cannot find the Materials Lab controls.');
}

function parseFirstNumber(text) {
  const match = String(text ?? '').replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function resultValue(label) {
  const card = [...resultCards.querySelectorAll('.result-card')]
    .find((candidate) => candidate.querySelector('span')?.textContent.trim() === label);
  return card ? parseFirstNumber(card.querySelector('strong')?.textContent) : null;
}

function formatLoad(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return `${value.toFixed(1)} kN`;
  if (value >= 10) return `${value.toFixed(2)} kN`;
  return `${value.toFixed(3)} kN`;
}

function addThresholdCard() {
  if (document.getElementById('physicalThresholdCard')) return;
  if (!beamModeButton.classList.contains('is-active')) return;
  if (!errorBanner.classList.contains('is-hidden')) return;

  const loadKN = Number(loadInput.value);
  const stressMPa = resultValue('Maximum bending stress');
  if (!Number.isFinite(loadKN) || loadKN <= 0 || !Number.isFinite(stressMPa) || stressMPa <= 0) return;

  const material = getMaterial(materialSelect.value);
  const physicalStrengthMPa = material.family === 'wood'
    ? material.ultimateBendingMPa
    : material.yieldStrengthMPa;
  if (!Number.isFinite(physicalStrengthMPa) || physicalStrengthMPa <= 0) return;

  const physicalLoadKN = loadKN * physicalStrengthMPa / stressMPa;
  const allowableLoadKN = material.allowableBendingMPa
    ? loadKN * material.allowableBendingMPa / stressMPa
    : null;

  const card = document.createElement('article');
  card.id = 'physicalThresholdCard';
  card.className = 'result-card';
  const title = material.family === 'wood'
    ? 'Published-average rupture load estimate'
    : 'Elastic first-yield load estimate';
  const warning = material.family === 'wood'
    ? 'Calculated by elastic scaling to the selected published average rupture stress. Actual coco pieces can break earlier; timber snap animation is not implemented yet.'
    : 'Calculated by elastic scaling to Fy. The Steel Yield Lab provides the separate path-dependent animation.';
  const allowable = allowableLoadKN == null
    ? ''
    : `<small>Allowable-reference load ≈ ${formatLoad(allowableLoadKN)}</small>`;

  card.innerHTML = `<span>${title}</span><strong>${formatLoad(physicalLoadKN)}</strong>${allowable}<small>${warning}</small>`;
  resultCards.appendChild(card);
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    addThresholdCard();
  });
}

new MutationObserver(schedule).observe(resultCards, { childList: true, subtree: true });
document.addEventListener('input', schedule);
document.addEventListener('change', schedule);
document.addEventListener('click', schedule);
schedule();
