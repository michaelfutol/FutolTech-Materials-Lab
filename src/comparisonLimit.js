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

function defaultWait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function findLastPassingThresholdAnimated({
  evaluatePassCount,
  initialLoadKN,
  minimumLoadKN = 1e-6,
  maximumLoadKN = 1e7,
  iterations = 26,
  bracketDelayMs = 85,
  refineDelayMs = 38,
  wait = defaultWait,
  onStep = () => {}
}) {
  if (typeof evaluatePassCount !== 'function') throw new Error('A pass-count evaluator is required.');
  if (!Number.isFinite(initialLoadKN) || initialLoadKN <= 0) throw new Error('Initial load must be greater than zero.');

  let low = minimumLoadKN;
  const minimumPassCount = evaluatePassCount(low);
  onStep({ phase: 'checking', loadKN: low, passCount: minimumPassCount, iteration: 0, lowKN: low, highKN: null });
  if (minimumPassCount < 1) {
    throw new Error('None of the selected members passes even at a near-zero load. Check stock length, geometry, source data, or other non-load failure conditions.');
  }

  let high = Math.max(initialLoadKN, minimumLoadKN * 2);
  let bracketIteration = 0;
  while (true) {
    const passCount = evaluatePassCount(high);
    onStep({
      phase: passCount > 0 ? 'rising' : 'overshoot',
      loadKN: high,
      passCount,
      iteration: bracketIteration,
      lowKN: low,
      highKN: high
    });
    await wait(passCount > 0 ? bracketDelayMs : Math.max(bracketDelayMs, 140));
    if (passCount < 1) break;
    low = high;
    high *= 2;
    bracketIteration += 1;
    if (high > maximumLoadKN) {
      throw new Error('The comparison limit is above the current search ceiling. Check the selected units and inputs.');
    }
  }

  for (let index = 0; index < iterations; index += 1) {
    const mid = (low + high) / 2;
    const passCount = evaluatePassCount(mid);
    if (passCount > 0) low = mid;
    else high = mid;
    onStep({
      phase: passCount > 0 ? 'refining-up' : 'refining-down',
      loadKN: mid,
      passCount,
      iteration: index,
      totalIterations: iterations,
      lowKN: low,
      highKN: high
    });
    await wait(refineDelayMs);
  }

  onStep({
    phase: 'found',
    loadKN: low,
    passCount: evaluatePassCount(low),
    iteration: iterations,
    totalIterations: iterations,
    lowKN: low,
    highKN: high
  });
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

function searchInputValue(value, unit) {
  const decimals = unit === 'kgf' ? 3 : unit === 'tf' ? 6 : 4;
  return Number(value.toFixed(decimals));
}

function passCountFromSummary() {
  const text = document.getElementById('compareSummary')?.textContent ?? '';
  const match = text.match(/(\d+)\s+of\s+(\d+)/i);
  if (!match) throw new Error('The current comparison results could not be read.');
  return Number(match[1]);
}

function dispatchLoad(loadKN, { tidy = false, search = false } = {}) {
  const input = document.getElementById('compareLoadInput');
  const unit = document.getElementById('compareLoadUnitSelect')?.value ?? 'kN';
  const raw = loadInputValue(loadKN, unit);
  const value = tidy ? floorForInput(raw, unit) : search ? searchInputValue(raw, unit) : raw;
  input.value = String(value);
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
      grid-template-columns: minmax(150px, 0.72fr) minmax(220px, 1.4fr);
      gap: 14px;
      align-items: center;
      margin: 12px 0 16px;
      padding: 14px;
      border: 1px solid rgba(100, 244, 207, 0.42);
      border-radius: 14px;
      background: rgba(50, 160, 135, 0.08);
    }
    .compare-limit-action {
      display: grid;
      gap: 8px;
      align-content: center;
    }
    .compare-limit-action .button { justify-self: start; }
    .compare-limit-note { margin: 0; color: var(--muted); line-height: 1.45; }
    .compare-limit-note strong { color: var(--text); }
    .compare-limit-machine {
      --scan-progress: 0%;
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid rgba(127, 231, 207, 0.22);
      border-radius: 12px;
      background: rgba(5, 20, 29, 0.72);
    }
    .compare-limit-rig {
      position: relative;
      height: 58px;
      overflow: hidden;
    }
    .compare-limit-beam {
      position: absolute;
      left: 6%;
      right: 6%;
      bottom: 12px;
      height: 5px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(82, 214, 181, 0.35), rgba(82, 214, 181, 0.95), rgba(82, 214, 181, 0.35));
      box-shadow: 0 0 14px rgba(82, 214, 181, 0.28);
      transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }
    .compare-limit-support {
      position: absolute;
      bottom: 2px;
      width: 0;
      height: 0;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-bottom: 10px solid rgba(218, 239, 234, 0.82);
    }
    .compare-limit-support--left { left: 6%; transform: translateX(-3px); }
    .compare-limit-support--right { right: 6%; transform: translateX(3px); }
    .compare-limit-arrow {
      position: absolute;
      left: 50%;
      top: 1px;
      display: grid;
      place-items: center;
      width: 25px;
      height: 36px;
      color: #ffd06a;
      font-size: 28px;
      font-weight: 900;
      line-height: 1;
      transform: translateX(-50%);
      filter: drop-shadow(0 0 8px rgba(255, 208, 106, 0.42));
    }
    .compare-limit-scan {
      position: absolute;
      left: 6%;
      bottom: 8px;
      width: calc(var(--scan-progress) * 0.88);
      height: 13px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(82, 214, 181, 0.08), rgba(82, 214, 181, 0.36));
      transition: width 90ms linear;
    }
    .compare-limit-readout {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 4px;
      color: var(--muted);
      font-size: 0.78rem;
    }
    .compare-limit-readout strong { color: var(--text); text-align: right; }
    .compare-limit-controls.is-searching .compare-limit-arrow {
      animation: compare-load-bob 430ms ease-in-out infinite alternate;
    }
    .compare-limit-controls[data-phase="overshoot"] .compare-limit-beam,
    .compare-limit-controls[data-phase="refining-down"] .compare-limit-beam {
      background: linear-gradient(90deg, rgba(255, 124, 128, 0.3), rgba(255, 124, 128, 0.95), rgba(255, 124, 128, 0.3));
      box-shadow: 0 0 16px rgba(255, 124, 128, 0.3);
      transform: translateY(2px);
    }
    .compare-limit-controls[data-phase="found"] .compare-limit-beam {
      box-shadow: 0 0 20px rgba(82, 214, 181, 0.58);
    }
    @keyframes compare-load-bob {
      from { transform: translate(-50%, -1px); }
      to { transform: translate(-50%, 6px); }
    }
    @media (max-width: 760px) {
      .compare-limit-controls { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      .compare-limit-controls.is-searching .compare-limit-arrow { animation: none; }
      .compare-limit-scan, .compare-limit-beam { transition: none; }
    }
    @media print {
      .compare-limit-controls {
        display: block !important;
        margin: 2mm 0 3mm !important;
        padding: 2mm !important;
        border: 0.25mm solid #888 !important;
        border-radius: 0 !important;
        background: #fff !important;
      }
      .compare-limit-machine,
      .compare-limit-action .button { display: none !important; }
      .compare-limit-note { color: #111 !important; }
    }
  `;
  document.head.appendChild(style);
}

function phaseText(step) {
  if (step.phase === 'checking') return 'Checking starting range';
  if (step.phase === 'rising') return `${step.passCount} passing - increasing load ↑`;
  if (step.phase === 'overshoot') return 'All failed - stepping back ↓';
  if (step.phase === 'refining-up') return `${step.passCount} passing - nudging upward ↑`;
  if (step.phase === 'refining-down') return 'Too high - refining downward ↓';
  if (step.phase === 'found') return 'Last passing range found';
  return 'Ready';
}

function scanProgress(step) {
  if (step.phase === 'checking') return 5;
  if (step.phase === 'rising') return Math.min(86, 18 + step.iteration * 12);
  if (step.phase === 'overshoot') return 100;
  if (step.phase.startsWith('refining')) {
    return 12 + ((step.iteration + 1) / Math.max(1, step.totalIterations)) * 84;
  }
  if (step.phase === 'found') return 100;
  return 0;
}

export function mountComparisonLimitFinder() {
  if (document.getElementById('compareLimitButton')) return;
  const loadCard = document.getElementById('compareLoadEquivalent');
  if (!loadCard) return;
  ensureStyles();

  const controls = document.createElement('div');
  controls.className = 'compare-limit-controls';
  controls.dataset.phase = 'ready';
  controls.innerHTML = `
    <div class="compare-limit-action">
      <button id="compareLimitButton" class="button" type="button" title="Automatically find the highest load at which at least one selected member still passes the current checks.">Find last passing load</button>
      <p id="compareLimitNote" class="compare-limit-note">One touch: raises the load, overshoots the all-fail point, then refines back to the final passing range. This is a comparison threshold, not an allowable design load or price decision.</p>
    </div>
    <div class="compare-limit-machine" aria-live="polite">
      <div class="compare-limit-rig" aria-hidden="true">
        <span class="compare-limit-scan"></span>
        <span class="compare-limit-arrow">↓</span>
        <span class="compare-limit-beam"></span>
        <span class="compare-limit-support compare-limit-support--left"></span>
        <span class="compare-limit-support compare-limit-support--right"></span>
      </div>
      <div class="compare-limit-readout">
        <span data-limit-phase>Ready</span>
        <strong data-limit-live-value>Current: ${formatLoadEquivalents(currentLoadKN())}</strong>
      </div>
    </div>`;
  loadCard.insertAdjacentElement('afterend', controls);

  const button = controls.querySelector('#compareLimitButton');
  const note = controls.querySelector('#compareLimitNote');
  const phase = controls.querySelector('[data-limit-phase]');
  const liveValue = controls.querySelector('[data-limit-live-value]');
  let searching = false;

  button.addEventListener('click', async () => {
    searching = true;
    button.disabled = true;
    button.textContent = 'Finding limit…';
    controls.classList.add('is-searching');
    note.textContent = 'Testing the current members under rising and falling load…';
    try {
      const result = await findLastPassingThresholdAnimated({
        initialLoadKN: Math.max(currentLoadKN(), 0.001),
        evaluatePassCount: (loadKN) => {
          dispatchLoad(loadKN, { search: true });
          return passCountFromSummary();
        },
        onStep: (step) => {
          controls.dataset.phase = step.phase;
          controls.style.setProperty('--scan-progress', `${scanProgress(step)}%`);
          phase.textContent = phaseText(step);
          liveValue.textContent = formatLoadEquivalents(step.loadKN);
        }
      });
      const displayedLoadKN = result.passingLoadKN * 0.999999;
      dispatchLoad(displayedLoadKN, { tidy: true });
      controls.dataset.phase = 'found';
      controls.style.setProperty('--scan-progress', '100%');
      phase.textContent = 'Last passing range found';
      liveValue.textContent = formatLoadEquivalents(displayedLoadKN);
      const survivors = survivorLabels();
      note.innerHTML = `<strong>Last passing comparison load: ${formatLoadEquivalents(displayedLoadKN)}</strong><br>${survivors.length ? `Still below the current checks: ${survivors.join('; ')}.` : 'No surviving member could be identified.'} A slightly higher load enters the all-fail range.`;
    } catch (error) {
      controls.dataset.phase = 'error';
      controls.style.setProperty('--scan-progress', '0%');
      phase.textContent = 'Search stopped';
      liveValue.textContent = 'Check the inputs';
      note.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      searching = false;
      controls.classList.remove('is-searching');
      button.disabled = false;
      button.textContent = 'Find last passing load';
    }
  });

  document.querySelector('.compare-shell')?.addEventListener('input', (event) => {
    if (searching || event.target?.id === 'compareLoadInput') return;
    controls.dataset.phase = 'ready';
    controls.style.setProperty('--scan-progress', '0%');
    phase.textContent = 'Ready to search again';
    liveValue.textContent = `Current: ${formatLoadEquivalents(currentLoadKN())}`;
    note.textContent = 'Inputs changed. Run “Find last passing load” again to update the threshold.';
  });
  document.querySelector('.compare-shell')?.addEventListener('change', (event) => {
    if (searching || event.target?.id === 'compareLoadInput') return;
    controls.dataset.phase = 'ready';
    controls.style.setProperty('--scan-progress', '0%');
    phase.textContent = 'Ready to search again';
    liveValue.textContent = `Current: ${formatLoadEquivalents(currentLoadKN())}`;
    note.textContent = 'Inputs changed. Run “Find last passing load” again to update the threshold.';
  });
}
