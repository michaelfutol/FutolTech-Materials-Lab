import { getMaterial } from './data/materials.js';
import { beamTerminalTarget, columnTerminalTarget, rampLoadSeries } from './solver/failureRamp.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const ids = ['materialSelect', 'sectionTypeSelect', 'loadInput', 'beamModeButton', 'resultCards', 'errorBanner', 'specimenDiagram'];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
if (Object.values(el).some((node) => !node)) throw new Error('Automatic load ramp cannot find the Materials Lab controls.');

let running = false;
let token = 0;
let internalLoadChange = false;
const MAX_AUTO_LOAD_KN = 100_000;

function parseFirstNumber(text) {
  const match = String(text ?? '').replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function resultValue(label) {
  const card = [...el.resultCards.querySelectorAll('.result-card')]
    .find((candidate) => candidate.querySelector('span')?.textContent.trim() === label);
  return card ? parseFirstNumber(card.querySelector('strong')?.textContent) : null;
}

function isBeam() {
  return el.beamModeButton.classList.contains('is-active');
}

function isCPurlin() {
  return el.sectionTypeSelect.selectedOptions?.[0]?.dataset.sectionKind === 'c-purlin';
}

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function setLoad(loadKN) {
  internalLoadChange = true;
  el.loadInput.value = String(Number(loadKN.toPrecision(7)));
  el.loadInput.dispatchEvent(new Event('input', { bubbles: true }));
  internalLoadChange = false;
}

function buttonLabel() {
  const material = getMaterial(el.materialSelect.value);
  if (!isBeam()) return 'AUTO LOAD → COLUMN CAPACITY';
  if (isCPurlin()) return 'AUTO LOAD → GROSS YIELD SCREEN';
  if (material.family === 'wood' && Number.isFinite(material.ultimateBendingMPa)) return 'AUTO LOAD → RUPTURE REFERENCE';
  if (material.family === 'steel') return 'AUTO LOAD → FIRST YIELD';
  return 'AUTO LOAD → LAST VERIFIED LIMIT';
}

function explanatoryNote() {
  const material = getMaterial(el.materialSelect.value);
  if (!isBeam()) return 'Raises the actual axial load to the current idealised governing column capacity, then stops. Post-buckling/crushing response is not simulated.';
  if (isCPurlin()) return 'Raises the actual beam load to gross-section first yield only. Local/distortional/LTB or connection/restraint failure may govern earlier.';
  if (material.family === 'wood' && Number.isFinite(material.ultimateBendingMPa)) return 'Raises the real solver load continuously through serviceability and allowable warnings to the selected published-average rupture reference.';
  if (material.family === 'steel') return 'Raises the real solver load to first yield. It does not treat Fy as fracture; post-yield behavior belongs in Steel Yield Lab.';
  return 'No source-backed rupture stress exists for this dataset, so the ramp stops at the last verified bending reference instead of inventing a snap load.';
}

function ensureStyle() {
  if (document.getElementById('failureRampStyle')) return;
  const style = document.createElement('style');
  style.id = 'failureRampStyle';
  style.textContent = `
    .failure-ramp-controls{grid-column:1/-1;display:grid;grid-template-columns:minmax(220px,.82fr) minmax(0,1.18fr);gap:12px;align-items:center;padding:12px 14px;border:1px solid rgba(255,208,106,.42);border-radius:14px;background:rgba(255,208,106,.055)}
    .failure-ramp-actions{display:flex;flex-wrap:wrap;gap:8px}.failure-ramp-actions .button{font-weight:800}.failure-ramp-status{display:grid;gap:6px;min-width:0}.failure-ramp-note{margin:0;color:var(--muted);font-size:.82rem;line-height:1.42}.failure-ramp-readout{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:.8rem}.failure-ramp-readout strong{color:var(--text);text-align:right}.failure-ramp-track{height:6px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.08)}.failure-ramp-track span{display:block;width:var(--ramp-progress,0%);height:100%;background:#ffd06a;transition:width 50ms linear}.failure-ramp-controls.is-running{border-color:rgba(255,208,106,.8);box-shadow:0 0 22px rgba(255,208,106,.08)}
    .failure-ramp-terminal{position:absolute;left:50%;bottom:14px;z-index:4;transform:translateX(-50%);width:min(92%,780px);padding:8px 12px;border:1px solid currentColor;border-radius:10px;background:rgba(5,20,29,.93);color:#ffd06a;font-weight:800;text-align:center;pointer-events:none}.failure-ramp-terminal[data-kind="rupture"],.failure-ramp-terminal[data-kind="column-capacity"]{color:#ff7b7f}.failure-ramp-terminal[data-kind="yield"],.failure-ramp-terminal[data-kind="gross-yield-screen"]{color:#ffbd63}.diagram-wrap{position:relative}
    html[data-ramp-terminal="rupture"] #specimenDiagram .member-path,html[data-ramp-terminal="column"] #specimenDiagram .member-path{stroke:#ff5f63!important;filter:drop-shadow(0 0 6px rgba(255,95,99,.7))}html[data-ramp-terminal="yield"] #specimenDiagram .member-path,html[data-ramp-terminal="screening"] #specimenDiagram .member-path{stroke:#ffb84d!important;filter:drop-shadow(0 0 5px rgba(255,184,77,.6))}
    @media(max-width:760px){.failure-ramp-controls{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.failure-ramp-track span{transition:none}}@media print{.failure-ramp-controls,.failure-ramp-terminal{display:none!important}}
  `;
  document.head.appendChild(style);
}

function mount() {
  if (document.getElementById('failureRampControls')) return;
  ensureStyle();
  const loadLabel = el.loadInput.closest('label');
  const controls = document.createElement('div');
  controls.id = 'failureRampControls';
  controls.className = 'failure-ramp-controls';
  controls.innerHTML = `
    <div class="failure-ramp-actions"><button id="failureRampButton" class="button" type="button"></button><button id="failureRampStop" class="button button--ghost is-hidden" type="button">STOP</button></div>
    <div class="failure-ramp-status"><p class="failure-ramp-note"></p><div class="failure-ramp-readout"><span data-phase>Ready</span><strong data-live-load></strong></div><div class="failure-ramp-track"><span></span></div></div>`;
  loadLabel.insertAdjacentElement('afterend', controls);

  const button = controls.querySelector('#failureRampButton');
  const stop = controls.querySelector('#failureRampStop');
  const note = controls.querySelector('.failure-ramp-note');
  const phase = controls.querySelector('[data-phase]');
  const live = controls.querySelector('[data-live-load]');

  function clearTerminal() {
    delete document.documentElement.dataset.rampTerminal;
    document.querySelector('.failure-ramp-terminal')?.remove();
  }

  function refresh() {
    if (running) return;
    button.textContent = buttonLabel();
    note.textContent = explanatoryNote();
    phase.textContent = 'Ready';
    live.textContent = `Current: ${formatLoadEquivalents(Number(el.loadInput.value) || 0)}`;
    controls.style.setProperty('--ramp-progress', '0%');
  }

  async function beamTarget() {
    let loadKN = Number(el.loadInput.value);
    let stressMPa = resultValue('Maximum bending stress');
    if (!(loadKN > 0 && stressMPa > 0)) {
      setLoad(0.1);
      await waitFrame();
      loadKN = Number(el.loadInput.value);
      stressMPa = resultValue('Maximum bending stress');
    }
    const material = getMaterial(el.materialSelect.value);
    return beamTerminalTarget({
      family: material.family,
      loadKN,
      maxBendingStressMPa: stressMPa,
      allowableBendingMPa: material.allowableBendingMPa,
      yieldStrengthMPa: material.yieldStrengthMPa,
      ultimateBendingMPa: material.ultimateBendingMPa,
      screeningOnly: isCPurlin()
    });
  }

  function columnTarget() {
    const material = getMaterial(el.materialSelect.value);
    return columnTerminalTarget({
      family: material.family,
      loadKN: Number(el.loadInput.value),
      predictedCapacityKN: resultValue('Predicted governing capacity'),
      maxCompressionStressMPa: resultValue('Maximum compression stress'),
      compressionStrengthMPa: material.compressionParallelMPa ?? material.yieldStrengthMPa
    });
  }

  function showTerminal(target) {
    clearTerminal();
    document.documentElement.dataset.rampTerminal = target.kind === 'rupture' ? 'rupture' : target.kind === 'yield' ? 'yield' : target.kind === 'gross-yield-screen' ? 'screening' : target.kind === 'column-capacity' ? 'column' : 'reference';
    const terminal = document.createElement('div');
    terminal.className = 'failure-ramp-terminal';
    terminal.dataset.kind = target.kind;
    const heading = target.kind === 'rupture' ? 'RUPTURE REFERENCE REACHED' : target.kind === 'yield' ? 'FIRST YIELD REFERENCE REACHED' : target.kind === 'gross-yield-screen' ? 'GROSS YIELD SCREEN REACHED' : target.kind === 'column-capacity' ? 'IDEALISED GOVERNING CAPACITY REACHED' : 'LAST VERIFIED REFERENCE REACHED';
    terminal.textContent = `${heading} · ${formatLoadEquivalents(target.targetLoadKN)} · ${target.note}`;
    el.specimenDiagram.closest('.diagram-wrap')?.appendChild(terminal);
  }

  function stopRun(message = 'Stopped by user') {
    if (!running) return;
    running = false;
    token += 1;
    controls.classList.remove('is-running');
    button.disabled = false;
    stop.classList.add('is-hidden');
    phase.textContent = message;
    button.textContent = buttonLabel();
    note.textContent = explanatoryNote();
  }

  button.addEventListener('click', async () => {
    if (running) return;
    clearTerminal();
    const myToken = ++token;
    running = true;
    controls.classList.add('is-running');
    button.disabled = true;
    button.textContent = 'AUTO LOADING…';
    stop.classList.remove('is-hidden');
    phase.textContent = 'Calculating terminal reference';
    try {
      const target = isBeam() ? await beamTarget() : columnTarget();
      if (!(target.targetLoadKN > 0) || target.targetLoadKN > MAX_AUTO_LOAD_KN) throw new Error('Calculated terminal load is outside the current automatic-test range.');
      const series = rampLoadSeries({ currentLoadKN: Number(el.loadInput.value), targetLoadKN: target.targetLoadKN, steps: 58 });
      if (Math.abs(series.startLoadKN - Number(el.loadInput.value)) > 1e-9) {
        setLoad(series.startLoadKN);
        await waitFrame();
      }
      note.textContent = target.note;
      for (let index = 0; index < series.values.length; index += 1) {
        if (!running || myToken !== token) return;
        const loadKN = series.values[index];
        setLoad(loadKN);
        controls.style.setProperty('--ramp-progress', `${(((index + 1) / series.values.length) * 100).toFixed(1)}%`);
        live.textContent = formatLoadEquivalents(loadKN);
        phase.textContent = target.kind === 'rupture' ? 'Increasing toward rupture reference ↑' : target.kind === 'yield' || target.kind === 'gross-yield-screen' ? 'Increasing toward first yield ↑' : target.kind === 'column-capacity' ? 'Increasing toward governing capacity ↑' : 'Increasing toward last verified reference ↑';
        await sleep(48);
      }
      running = false;
      controls.classList.remove('is-running');
      button.disabled = false;
      stop.classList.add('is-hidden');
      phase.textContent = target.title;
      button.textContent = 'RUN AGAIN FROM LOW LOAD';
      showTerminal(target);
    } catch (error) {
      running = false;
      controls.classList.remove('is-running');
      button.disabled = false;
      stop.classList.add('is-hidden');
      phase.textContent = 'Automatic ramp unavailable';
      note.textContent = error instanceof Error ? error.message : String(error);
      button.textContent = buttonLabel();
    }
  });

  stop.addEventListener('click', () => stopRun());
  el.loadInput.addEventListener('input', () => {
    if (running && !internalLoadChange) stopRun('Manual load change — stopped');
    if (!running) {
      clearTerminal();
      refresh();
    }
  });
  for (const event of ['change', 'click']) document.addEventListener(event, () => queueMicrotask(refresh));
  refresh();
}

mount();
