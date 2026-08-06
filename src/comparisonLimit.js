import { KGF_TO_KN, TONNE_FORCE_TO_KN, formatLoadEquivalents } from './utils/loadUnits.js';

export function findLastPassingThreshold({
  evaluatePassCount,
  initialLoadKN,
  minimumLoadKN = 1e-6,
  maximumLoadKN = 1e7,
  iterations = 60
}) {
  if (typeof evaluatePassCount !== 'function') throw new Error('A pass-count evaluator is required.');
  if (!Number.isFinite(initialLoadKN) || initialLoadKN <= 0) throw new Error('Initial load must be greater than zero.');

  let low = minimumLoadKN;
  if (evaluatePassCount(low) < 1) {
    throw new Error('None of the selected members passes even at a near-zero load. Check stock length, geometry, source data, or other non-load failure conditions.');
  }

  let high = Math.max(initialLoadKN, minimumLoadKN * 2);
  while (evaluatePassCount(high) > 0) {
    low = high;
    high *= 2;
    if (high > maximumLoadKN) {
      throw new Error('The comparison limit is above the current search ceiling. Check the selected units and inputs.');
    }
  }

  for (let index = 0; index < iterations; index += 1) {
    const mid = (low + high) / 2;
    if (evaluatePassCount(mid) > 0) low = mid;
    else high = mid;
  }

  return { passingLoadKN: low, failingLoadKN: high };
}

function loadInputValue(loadKN, unit) {
  if (unit === 'kgf') return loadKN / KGF_TO_KN;
  if (unit === 'tf') return loadKN / TONNE_FORCE_TO_KN;
  return loadKN;
}

function floorForInput(value, unit) {
  const decimals = unit === 'kgf' ? 2 : unit === 'tf' ? 4 : 3;
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}

function passCountFromSummary() {
  const text = document.getElementById('compareSummary')?.textContent ?? '';
  const match = text.match(/(\d+)\s+of\s+(\d+)/i);
  if (!match) throw new Error('The current comparison results could not be read.');
  return Number(match[1]);
}

function dispatchLoad(loadKN, { tidy = false } = {}) {
  const input = document.getElementById('compareLoadInput');
  const unit = document.getElementById('compareLoadUnitSelect')?.value ?? 'kN';
  const raw = loadInputValue(loadKN, unit);
  input.value = String(tidy ? floorForInput(raw, unit) : raw);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function currentLoadKN() {
  const value = Number(document.getElementById('compareLoadInput')?.value);
  const unit = document.getElementById('compareLoadUnitSelect')?.value ?? 'kN';
  if (unit === 'kgf') return value * KGF_TO_KN;
  if (unit === 'tf') return value * TONNE_FORCE_TO_KN;
  return value;
}

function survivorLabels() {
  return [...document.querySelectorAll('.compare-result-card.is-pass, .compare-result-card.is-screening')]
    .map((card) => {
      const member = card.querySelector('.eyebrow')?.textContent?.trim();
      const material = card.querySelector('h3')?.textContent?.trim();
      const screening = card.classList.contains('is-screening');
      return `${member || 'Member'} — ${material || 'selected section'}${screening ? ' (SCREENING)' : ''}`;
    });
}

function ensureStyles() {
  if (document.getElementById('comparisonLimitStyles')) return;
  const style = document.createElement('style');
  style.id = 'comparisonLimitStyles';
  style.textContent = `
    .compare-limit-controls {
      display: grid;
      gap: 9px;
      margin: 12px 0 16px;
      padding: 14px;
      border: 1px solid rgba(100, 244, 207, 0.42);
      border-radius: 14px;
      background: rgba(50, 160, 135, 0.08);
    }
    .compare-limit-controls .button { justify-self: start; }
    .compare-limit-note { margin: 0; color: var(--muted); line-height: 1.45; }
    .compare-limit-note strong { color: var(--text); }
    @media print {
      .compare-limit-controls {
        margin: 2mm 0 3mm !important;
        padding: 2mm !important;
        border: 0.25mm solid #888 !important;
        border-radius: 0 !important;
        background: #fff !important;
      }
      .compare-limit-note { color: #111 !important; }
    }
  `;
  document.head.appendChild(style);
}

export function mountComparisonLimitFinder() {
  if (document.getElementById('compareLimitButton')) return;
  const loadCard = document.getElementById('compareLoadEquivalent');
  if (!loadCard) return;
  ensureStyles();

  const controls = document.createElement('div');
  controls.className = 'compare-limit-controls';
  controls.innerHTML = `
    <button id="compareLimitButton" class="button" type="button" title="Automatically find the highest load at which at least one selected member still passes the current checks.">Find last passing load</button>
    <p id="compareLimitNote" class="compare-limit-note">One touch: raises the load until the final passing range is found. This is a comparison threshold, not an allowable design load or price decision.</p>`;
  loadCard.insertAdjacentElement('afterend', controls);

  const button = controls.querySelector('#compareLimitButton');
  const note = controls.querySelector('#compareLimitNote');
  let searching = false;

  button.addEventListener('click', () => {
    searching = true;
    button.disabled = true;
    button.textContent = 'Finding limit…';
    try {
      const result = findLastPassingThreshold({
        initialLoadKN: Math.max(currentLoadKN(), 0.001),
        evaluatePassCount: (loadKN) => {
          dispatchLoad(loadKN);
          return passCountFromSummary();
        }
      });
      const displayedLoadKN = result.passingLoadKN * 0.999999;
      dispatchLoad(displayedLoadKN, { tidy: true });
      const survivors = survivorLabels();
      note.innerHTML = `<strong>Last passing comparison load: ${formatLoadEquivalents(displayedLoadKN)}</strong><br>${survivors.length ? `Still below the current checks: ${survivors.join('; ')}.` : 'No surviving member could be identified.'} A slightly higher load enters the all-fail range.`;
    } catch (error) {
      note.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      searching = false;
      button.disabled = false;
      button.textContent = 'Find last passing load';
    }
  });

  document.querySelector('.compare-shell')?.addEventListener('input', (event) => {
    if (searching || event.target?.id === 'compareLoadInput') return;
    note.textContent = 'Inputs changed. Run “Find last passing load” again to update the threshold.';
  });
  document.querySelector('.compare-shell')?.addEventListener('change', (event) => {
    if (searching || event.target?.id === 'compareLoadInput') return;
    note.textContent = 'Inputs changed. Run “Find last passing load” again to update the threshold.';
  });
}
