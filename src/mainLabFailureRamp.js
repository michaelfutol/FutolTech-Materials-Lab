import { getMaterial } from './data/materials.js';
import { rampLoadSeries } from './solver/failureRamp.js';
import { beamGoverningLimitTimeline, columnGoverningLimitTimeline, timelineProgress } from './solver/governingLimitTimeline.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const ids = ['materialSelect', 'sectionTypeSelect', 'lengthInput', 'loadInput', 'beamModeButton', 'resultCards', 'errorBanner', 'specimenDiagram'];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
if (Object.values(el).some((node) => !node)) throw new Error('Run to Governing Limit cannot find the Materials Lab controls.');

let running = false;
let paused = false;
let stepBudget = 0;
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

function isAngle() {
  return el.sectionTypeSelect.value === 'angle';
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
  return 'RUN TO GOVERNING LIMIT';
}

function explanatoryNote() {
  if (!isBeam()) return 'Builds the implemented column-limit chronology, raises the real axial load, and stops at the earliest governing modeled limit. Post-buckling/crushing response is not simulated.';
  if (isCPurlin()) return 'Shows serviceability and gross first-yield screening events. Cold-formed local/distortional/LTB and connection/restraint failures are not invented.';
  if (isAngle()) return 'Shows serviceability and gross leg-axis first-yield screening only. Principal-axis/torsional and flexural-torsional failure modes are not yet modeled.';
  const material = getMaterial(el.materialSelect.value);
  if (material.family === 'wood' && Number.isFinite(material.ultimateBendingMPa)) return 'Runs through serviceability and allowable/reference events to the selected published rupture reference. Exact specimen fracture is not predicted.';
  if (material.family === 'steel') return 'Runs through serviceability to first yield. Fy is not fracture; post-yield response belongs in Steel Yield Lab.';
  return 'Runs through every source-backed event currently available and stops at the last verified bending reference instead of inventing a rupture load.';
}

function ensureStyle() {
  if (document.getElementById('failureRampStyle')) return;
  const style = document.createElement('style');
  style.id = 'failureRampStyle';
  style.textContent = `
    .failure-ramp-controls{grid-column:1/-1;display:grid;grid-template-columns:minmax(250px,.88fr) minmax(0,1.12fr);gap:12px;align-items:start;padding:12px 14px;border:1px solid rgba(255,208,106,.42);border-radius:14px;background:rgba(255,208,106,.055)}
    .failure-ramp-actions{display:flex;flex-wrap:wrap;gap:8px}.failure-ramp-actions .button{font-weight:800}.failure-ramp-status{display:grid;gap:7px;min-width:0}.failure-ramp-note{margin:0;color:var(--muted);font-size:.82rem;line-height:1.42}.failure-ramp-readout{display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:.8rem}.failure-ramp-readout strong{color:var(--text);text-align:right}.failure-ramp-track{position:relative;height:9px;margin:8px 6px 2px;overflow:visible;border-radius:999px;background:rgba(255,255,255,.08)}.failure-ramp-track>[data-progress]{display:block;width:var(--ramp-progress,0%);height:100%;border-radius:999px;background:#ffd06a;transition:width 45ms linear}.failure-ramp-marker{position:absolute;top:50%;width:12px;height:12px;border:2px solid #ffd06a;border-radius:50%;background:#071821;transform:translate(-50%,-50%);z-index:2}.failure-ramp-marker.is-crossed{background:#ffd06a;box-shadow:0 0 9px rgba(255,208,106,.55)}.failure-ramp-marker[data-terminal="true"]{width:15px;height:15px;border-width:3px}.failure-ramp-events{display:grid;gap:4px;margin-top:5px}.failure-ramp-event{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center;padding:5px 7px;border-radius:8px;color:var(--muted);font-size:.76rem;border:1px solid transparent}.failure-ramp-event::before{content:'○';color:#ffd06a;font-weight:900}.failure-ramp-event.is-crossed{color:var(--text);background:rgba(255,208,106,.07);border-color:rgba(255,208,106,.2)}.failure-ramp-event.is-crossed::before{content:'●'}.failure-ramp-event strong{font-size:.72rem}.failure-ramp-event[data-terminal="true"]{border-color:rgba(255,208,106,.35);font-weight:800}.failure-ramp-controls.is-running{border-color:rgba(255,208,106,.8);box-shadow:0 0 22px rgba(255,208,106,.08)}
    .failure-ramp-terminal{position:absolute;left:50%;bottom:14px;z-index:4;transform:translateX(-50%);width:min(92%,820px);padding:8px 12px;border:1px solid currentColor;border-radius:10px;background:rgba(5,20,29,.94);color:#ffd06a;font-weight:800;text-align:center;pointer-events:none}.failure-ramp-terminal[data-kind="rupture"]{color:#ff7b7f}.failure-ramp-terminal[data-kind="yield"],.failure-ramp-terminal[data-kind="screening"],.failure-ramp-terminal[data-kind="column-capacity"]{color:#ffbd63}.diagram-wrap{position:relative}
    html[data-ramp-terminal="rupture"] #specimenDiagram .member-path{stroke:#ff5f63!important;filter:drop-shadow(0 0 6px rgba(255,95,99,.7))}html[data-ramp-terminal="yield"] #specimenDiagram .member-path,html[data-ramp-terminal="screening"] #specimenDiagram .member-path,html[data-ramp-terminal="column"] #specimenDiagram .member-path{stroke:#ffb84d!important;filter:drop-shadow(0 0 5px rgba(255,184,77,.6))}
    @media(max-width:760px){.failure-ramp-controls{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.failure-ramp-track>[data-progress]{transition:none}}@media print{.failure-ramp-controls,.failure-ramp-terminal{display:none!important}}
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
    <div class="failure-ramp-actions">
      <button id="failureRampButton" class="button" type="button"></button>
      <button id="failureRampPause" class="button button--ghost is-hidden" type="button">PAUSE</button>
      <button id="failureRampStep" class="button button--ghost is-hidden" type="button">STEP</button>
      <button id="failureRampStop" class="button button--ghost is-hidden" type="button">STOP</button>
    </div>
    <div class="failure-ramp-status">
      <p class="failure-ramp-note"></p>
      <div class="failure-ramp-readout"><span data-phase>Ready</span><strong data-live-load></strong></div>
      <div class="failure-ramp-track"><span data-progress></span></div>
      <div class="failure-ramp-events" aria-live="polite"></div>
    </div>`;
  loadLabel.insertAdjacentElement('afterend', controls);

  const button = controls.querySelector('#failureRampButton');
  const pause = controls.querySelector('#failureRampPause');
  const step = controls.querySelector('#failureRampStep');
  const stop = controls.querySelector('#failureRampStop');
  const note = controls.querySelector('.failure-ramp-note');
  const phase = controls.querySelector('[data-phase]');
  const live = controls.querySelector('[data-live-load]');
  const track = controls.querySelector('.failure-ramp-track');
  const eventsBox = controls.querySelector('.failure-ramp-events');

  function clearTerminal() {
    delete document.documentElement.dataset.rampTerminal;
    document.querySelector('.failure-ramp-terminal')?.remove();
  }

  function screeningInfo() {
    if (isCPurlin()) return { screeningOnly: true, screeningLabel: 'gross C-purlin' };
    if (isAngle()) return { screeningOnly: true, screeningLabel: 'gross angle leg-axis' };
    return { screeningOnly: false, screeningLabel: '' };
  }

  async function buildTimeline() {
    let loadKN = Number(el.loadInput.value);
    if (isBeam()) {
      let stressMPa = resultValue('Maximum bending stress');
      let deflectionMm = resultValue('Maximum deflection');
      if (!(loadKN > 0 && stressMPa > 0 && deflectionMm > 0)) {
        setLoad(0.1);
        await waitFrame();
        loadKN = Number(el.loadInput.value);
        stressMPa = resultValue('Maximum bending stress');
        deflectionMm = resultValue('Maximum deflection');
      }
      const material = getMaterial(el.materialSelect.value);
      const screen = screeningInfo();
      return beamGoverningLimitTimeline({
        family: material.family,
        currentLoadKN: loadKN,
        currentDeflectionMm: deflectionMm,
        deflectionLimitMm: Number(el.lengthInput.value) * 1000 / 360,
        currentStressMPa: stressMPa,
        allowableBendingMPa: material.allowableBendingMPa ?? material.bendingReferenceMPa,
        yieldStrengthMPa: material.yieldStrengthMPa,
        ultimateBendingMPa: material.ultimateBendingMPa,
        ...screen
      });
    }

    const material = getMaterial(el.materialSelect.value);
    if (!(loadKN > 0)) {
      setLoad(0.1);
      await waitFrame();
      loadKN = Number(el.loadInput.value);
    }
    return columnGoverningLimitTimeline({
      family: material.family,
      currentLoadKN: loadKN,
      predictedCapacityKN: resultValue('Predicted governing capacity'),
      eulerCriticalKN: resultValue('Euler critical load'),
      currentCompressionStressMPa: resultValue('Maximum compression stress'),
      compressionStrengthMPa: material.compressionParallelMPa ?? material.yieldStrengthMPa
    });
  }

  function renderTimeline(timeline, currentLoadKN = Number(el.loadInput.value) || 0) {
    const terminalLoad = timeline?.terminalEvent?.loadKN;
    if (!(terminalLoad > 0)) {
      eventsBox.innerHTML = '';
      track.querySelectorAll('.failure-ramp-marker').forEach((node) => node.remove());
      return;
    }
    const progressEvents = timelineProgress(timeline.events, terminalLoad);
    track.querySelectorAll('.failure-ramp-marker').forEach((node) => node.remove());
    for (const item of progressEvents) {
      const marker = document.createElement('span');
      marker.className = `failure-ramp-marker${currentLoadKN + 1e-9 >= item.loadKN ? ' is-crossed' : ''}`;
      marker.style.left = `${(item.progress * 100).toFixed(3)}%`;
      marker.dataset.eventId = item.id;
      marker.dataset.terminal = String(Boolean(item.terminal));
      marker.title = `${item.label}: ${formatLoadEquivalents(item.loadKN)}`;
      track.appendChild(marker);
    }
    eventsBox.innerHTML = progressEvents.map((item) => `<div class="failure-ramp-event${currentLoadKN + 1e-9 >= item.loadKN ? ' is-crossed' : ''}" data-event-id="${item.id}" data-terminal="${Boolean(item.terminal)}"><span>${item.label}</span><strong>${item.status}</strong><span>${formatLoadEquivalents(item.loadKN)}</span></div>`).join('');
  }

  function markCrossed(timeline, currentLoadKN) {
    renderTimeline(timeline, currentLoadKN);
    const crossed = timeline.events.filter((item) => currentLoadKN + 1e-9 >= item.loadKN);
    return crossed.at(-1) ?? null;
  }

  async function refresh() {
    if (running) return;
    button.textContent = buttonLabel();
    note.textContent = explanatoryNote();
    phase.textContent = 'Ready';
    live.textContent = `Current: ${formatLoadEquivalents(Number(el.loadInput.value) || 0)}`;
    controls.style.setProperty('--ramp-progress', '0%');
    try {
      const timeline = await buildTimeline();
      renderTimeline(timeline);
      note.textContent = `${explanatoryNote()} ${timeline.boundary}`;
    } catch {
      eventsBox.innerHTML = '';
      track.querySelectorAll('.failure-ramp-marker').forEach((node) => node.remove());
    }
  }

  function showTerminal(timeline) {
    const target = timeline.terminalEvent;
    clearTerminal();
    const displayKind = target.type === 'rupture' ? 'rupture' : target.type === 'yield' ? 'yield' : target.type === 'screening' ? 'screening' : target.type === 'column-capacity' || target.type === 'compression-reference' ? 'column' : 'reference';
    document.documentElement.dataset.rampTerminal = displayKind;
    const terminal = document.createElement('div');
    terminal.className = 'failure-ramp-terminal';
    terminal.dataset.kind = target.type;
    terminal.textContent = `${target.label} REACHED · ${formatLoadEquivalents(target.loadKN)} · ${target.note}`;
    el.specimenDiagram.closest('.diagram-wrap')?.appendChild(terminal);
  }

  function finishRunUi(message) {
    running = false;
    paused = false;
    stepBudget = 0;
    controls.classList.remove('is-running');
    button.disabled = false;
    pause.classList.add('is-hidden');
    step.classList.add('is-hidden');
    stop.classList.add('is-hidden');
    pause.textContent = 'PAUSE';
    if (message) phase.textContent = message;
  }

  function stopRun(message = 'Stopped by user') {
    if (!running) return;
    token += 1;
    finishRunUi(message);
    button.textContent = buttonLabel();
    note.textContent = explanatoryNote();
  }

  async function waitWhilePaused(myToken) {
    while (running && myToken === token && paused && stepBudget <= 0) await sleep(40);
    if (stepBudget > 0) stepBudget -= 1;
  }

  button.addEventListener('click', async () => {
    if (running) return;
    clearTerminal();
    const myToken = ++token;
    running = true;
    paused = false;
    stepBudget = 0;
    controls.classList.add('is-running');
    button.disabled = true;
    button.textContent = 'RUNNING…';
    pause.classList.remove('is-hidden');
    step.classList.remove('is-hidden');
    stop.classList.remove('is-hidden');
    phase.textContent = 'Building governing-event chronology';
    try {
      const timeline = await buildTimeline();
      const targetLoadKN = timeline.terminalEvent?.loadKN;
      if (!(targetLoadKN > 0) || targetLoadKN > MAX_AUTO_LOAD_KN) throw new Error('Calculated governing load is outside the current automatic-test range.');
      const series = rampLoadSeries({ currentLoadKN: Number(el.loadInput.value), targetLoadKN, steps: 64 });
      if (Math.abs(series.startLoadKN - Number(el.loadInput.value)) > 1e-9) {
        setLoad(series.startLoadKN);
        await waitFrame();
      }
      note.textContent = timeline.boundary;
      renderTimeline(timeline, series.startLoadKN);
      let lastEventId = null;
      for (let index = 0; index < series.values.length; index += 1) {
        if (!running || myToken !== token) return;
        await waitWhilePaused(myToken);
        if (!running || myToken !== token) return;
        const loadKN = series.values[index];
        setLoad(loadKN);
        controls.style.setProperty('--ramp-progress', `${(((index + 1) / series.values.length) * 100).toFixed(1)}%`);
        live.textContent = formatLoadEquivalents(loadKN);
        const crossed = markCrossed(timeline, loadKN);
        if (crossed && crossed.id !== lastEventId) {
          lastEventId = crossed.id;
          phase.textContent = `Crossed: ${crossed.label}`;
        } else if (!crossed) {
          phase.textContent = paused ? 'Paused before first event' : 'Increasing load toward first event ↑';
        } else if (!paused) {
          phase.textContent = `Between ${crossed.label} and next event ↑`;
        }
        await sleep(48);
      }
      finishRunUi(timeline.terminalEvent.label);
      button.textContent = 'RUN AGAIN FROM LOW LOAD';
      showTerminal(timeline);
      markCrossed(timeline, targetLoadKN);
    } catch (error) {
      finishRunUi('Run to Governing Limit unavailable');
      note.textContent = error instanceof Error ? error.message : String(error);
      button.textContent = buttonLabel();
    }
  });

  pause.addEventListener('click', () => {
    if (!running) return;
    paused = !paused;
    pause.textContent = paused ? 'RESUME' : 'PAUSE';
    phase.textContent = paused ? 'Paused — use STEP or RESUME' : 'Resumed';
  });

  step.addEventListener('click', () => {
    if (!running) return;
    if (!paused) {
      paused = true;
      pause.textContent = 'RESUME';
    }
    stepBudget += 1;
    phase.textContent = 'Single solver step';
  });

  stop.addEventListener('click', () => stopRun());
  el.loadInput.addEventListener('input', () => {
    if (running && !internalLoadChange) stopRun('Manual load change — stopped');
    if (!running) {
      clearTerminal();
      queueMicrotask(refresh);
    }
  });
  document.addEventListener('change', () => queueMicrotask(refresh));
  document.addEventListener('click', (event) => {
    if (controls.contains(event.target)) return;
    queueMicrotask(refresh);
  });
  refresh();
}

mount();
