import {
  convertLoadToKN,
  resolveCPurlinRoofLoad,
  setCPurlinRoofSlopeDeg
} from './solver/sectionRecommender.js';

const selectorsRoot = document.getElementById('compareSelectors');
const loadInput = document.getElementById('compareLoadInput');
const loadUnit = document.getElementById('compareLoadUnitSelect');
const loadEquivalent = document.getElementById('compareLoadEquivalent');
const loadPosition = document.getElementById('compareLoadPositionInput');

function compact(value, decimals = 3) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(decimals).replace(/\.000$/, '').replace(/(\.\d*[1-9])0+$/, '$1').replace(/\.0+$/, '');
}

function activePresetSelects() {
  if (!selectorsRoot) return [];
  return [...selectorsRoot.querySelectorAll('.compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'))
    .map((card) => card.querySelector('[data-slot-preset]'))
    .filter(Boolean);
}

function allActiveMembersAreCPurlins() {
  const presets = activePresetSelects();
  return presets.length >= 2 && presets.every((select) => String(select.value).startsWith('ph-cp-'));
}

function currentLoadKN() {
  if (!loadInput || !loadUnit) return 0;
  try {
    return convertLoadToKN(Number(loadInput.value), loadUnit.value);
  } catch {
    return 0;
  }
}

function ensurePrintCompaction() {
  if (document.getElementById('ft-c-purlin-slope-print-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-c-purlin-slope-print-style';
  style.textContent = `
    @media print {
      .ft-print-document [data-page="4"] .compare-result-card__visual {
        min-height: 20mm !important;
        height: 20mm !important;
      }
      .ft-print-document [data-page="4"] .compare-result-card__visual svg {
        max-height: 18mm !important;
        height: 18mm !important;
      }
      .ft-print-document [data-page="4"] .compare-result-card__body {
        padding: 2mm !important;
      }
      .ft-print-document [data-page="4"] .compare-result-card__status {
        margin-bottom: 1mm !important;
        gap: 1mm !important;
      }
      .ft-print-document [data-page="4"] .compare-result-card h3 {
        margin: .5mm 0 1mm !important;
      }
      .ft-print-document [data-page="4"] .compare-mini-metrics {
        gap: 1mm !important;
        margin: 1.5mm 0 !important;
      }
      .ft-print-document [data-page="4"] .compare-mini-metrics div {
        padding: 1.2mm !important;
      }
      .ft-print-document [data-page="4"] .candidate-source {
        font-size: 7.5pt !important;
        line-height: 1.2 !important;
        margin: 1mm 0 0 !important;
      }
      .ft-print-document [data-page="4"] .compare-winner-chip {
        padding: .5mm 1mm !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function mount() {
  if (!selectorsRoot || !loadInput || !loadUnit || !loadEquivalent || !loadPosition) return;
  if (document.getElementById('compareRoofSlopeInput')) return;

  ensurePrintCompaction();

  const loadPositionLabel = loadPosition.closest('label');
  const slopeLabel = document.createElement('label');
  slopeLabel.className = 'compare-beam-only';
  slopeLabel.dataset.cpSlopeControl = 'true';
  slopeLabel.title = 'Special C-purlin roof-slope screening. The entered gravity point load remains globally vertical and is resolved into roof-normal and roof-parallel components.';
  slopeLabel.innerHTML = `
    <span class="help-term" tabindex="0" data-help="Special C-purlin test only. A global vertical gravity point load P is resolved relative to the roof plane as P⊥ = P cos θ and P∥ = P sin θ. These are two components of the same vertical load, not three separate loads.">Roof slope, ° · C-purlin special <span class="help-icon" aria-hidden="true">i</span></span>
    <input id="compareRoofSlopeInput" type="number" min="0" max="89" step="1" value="0" disabled />`;
  loadPositionLabel?.insertAdjacentElement('afterend', slopeLabel);

  const readout = document.createElement('div');
  readout.className = 'source-card is-hidden';
  readout.dataset.cpSlopeReadout = 'true';
  loadEquivalent.insertAdjacentElement('afterend', readout);

  const slopeInput = document.getElementById('compareRoofSlopeInput');

  function updateReadout() {
    const eligible = allActiveMembersAreCPurlins();
    slopeInput.disabled = !eligible;

    if (!eligible) {
      if (slopeInput.value !== '0') slopeInput.value = '0';
      setCPurlinRoofSlopeDeg(0);
      readout.classList.add('is-hidden');
      readout.innerHTML = '';
      return;
    }

    let slope = Number(slopeInput.value);
    if (!Number.isFinite(slope)) slope = 0;
    slope = Math.max(0, Math.min(89, slope));
    if (String(slope) !== slopeInput.value) slopeInput.value = String(slope);
    setCPurlinRoofSlopeDeg(slope);

    const loadKN = currentLoadKN();
    const components = resolveCPurlinRoofLoad(Math.max(0, loadKN), slope);
    readout.classList.remove('is-hidden');
    readout.innerHTML = `
      <p class="eyebrow">C-purlin roof-slope decomposition · gross-section SCREENING</p>
      <strong>Vertical P = ${compact(components.globalVerticalKN)} kN · P⊥ roof = ${compact(components.roofNormalKN)} kN · P∥ roof = ${compact(components.roofParallelKN)} kN</strong>
      <p>Roof slope θ = ${compact(slope, 1)}°. Vertical P is the original load vector; P⊥ and P∥ are its two resolved components. Both feed the gross biaxial elastic screening calculation.</p>`;
  }

  function rerender() {
    updateReadout();
    loadInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  slopeInput.addEventListener('input', rerender);
  slopeInput.addEventListener('change', rerender);
  loadInput.addEventListener('input', updateReadout);
  loadUnit.addEventListener('change', updateReadout);

  const observer = new MutationObserver(() => {
    const wasEnabled = !slopeInput.disabled;
    updateReadout();
    if (wasEnabled !== !slopeInput.disabled) {
      loadInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  observer.observe(selectorsRoot, { childList: true, subtree: true });

  updateReadout();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
