import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';
import { compareCompressionCandidates, compareMemberCandidates } from './solver/memberComparison.js';
import { convertLoadToKN, loadEquivalentsFromKN } from './utils/loadUnits.js';
import { comparisonSimulationFrame, comparisonSimulationPackage } from './solver/comparisonSimulation.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const C100_08_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FRAME_COUNT = 51;
const MIN_COMPRESSION_LOAD_KN = 1e-6;

const root = document.getElementById('compareLoadEquivalent');
const loadInput = document.getElementById('compareLoadInput');
const loadUnit = document.getElementById('compareLoadUnitSelect');
if (!root || !loadInput || !loadUnit) {
  // This module is intentionally harmless outside Direct Compare.
} else {
  mountComparisonPlayback();
}

function numberValue(selector) {
  return Number(document.querySelector(selector)?.value);
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? null;
}

function presetById(material, id) {
  return presetsForFamily(material.family).find((preset) => preset.id === id) ?? null;
}

function modeNow() {
  return document.getElementById('compareColumnModeButton')?.classList.contains('is-active') ? 'compression' : 'beam';
}

function currentSelections() {
  const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  return cards.map((card) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    if (!materialSelect || !presetSelect || !orientationSelect) throw new Error('A comparison member selector is incomplete.');
    const index = Number(presetSelect.dataset.slotPreset);
    const material = materialById(materialSelect.value);
    const preset = material ? presetById(material, presetSelect.value) : null;
    if (!material || !preset) throw new Error(`Member ${index + 1} material/section could not be resolved.`);
    const displayOrientation = card.querySelector('[data-c-purlin-orientation-display]');
    const orientationDeg = displayOrientation
      ? Number(displayOrientation.value)
      : orientationSelect.value === 'rotated' ? 90 : 0;
    return {
      id: `member-${String.fromCharCode(97 + index)}`,
      label: `Member ${String.fromCharCode(65 + index)}`,
      material,
      preset,
      orientation: orientationSelect.value,
      orientationDeg
    };
  });
}

function currentDefinition() {
  const mode = modeNow();
  const lengthM = numberValue('#compareLengthInput');
  const selections = currentSelections();
  if (mode === 'beam') {
    return {
      mode,
      selections,
      lengthM,
      conditions: {
        lengthM,
        boundary: document.getElementById('compareBoundarySelect').value,
        loadPositionM: numberValue('#compareLoadPositionInput'),
        deflectionDivisor: numberValue('#compareDeflectionSelect')
      }
    };
  }
  return {
    mode,
    selections,
    lengthM,
    conditions: {
      lengthM,
      boundary: document.getElementById('compareColumnBoundarySelect').value,
      eccentricityMm: numberValue('#compareEccentricityInput'),
      intermediateBracePoints: numberValue('#compareBracePointsSelect')
    }
  };
}

function solveDefinition(definition, loadKN) {
  if (definition.mode === 'beam') {
    return compareMemberCandidates({
      selections: definition.selections,
      lengthM: definition.conditions.lengthM,
      loadKN,
      loadPositionM: definition.conditions.loadPositionM,
      boundary: definition.conditions.boundary,
      deflectionDivisor: definition.conditions.deflectionDivisor
    });
  }
  return compareCompressionCandidates({
    selections: definition.selections,
    lengthM: definition.conditions.lengthM,
    axialLoadKN: Math.max(loadKN, MIN_COMPRESSION_LOAD_KN),
    eccentricityMm: definition.conditions.eccentricityMm,
    boundary: definition.conditions.boundary,
    intermediateBracePoints: definition.conditions.intermediateBracePoints
  });
}

function orientationMap(definition) {
  return Object.fromEntries(definition.selections.map((selection) => [selection.id, selection.orientationDeg]));
}

function inputValueFromKN(loadKN, unit) {
  const equivalents = loadEquivalentsFromKN(loadKN);
  if (unit === 'kgf') return equivalents.kgf;
  if (unit === 'tf') return equivalents.tf;
  return equivalents.kN;
}

function compact(value, decimals = 2) {
  return Number.isFinite(value) ? Number(value).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : '—';
}

function injectStyles() {
  if (document.getElementById('ft-comparison-playback-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-comparison-playback-style';
  style.textContent = `
    .comparison-playback { margin-top:1rem; padding:1rem; border:1px solid rgba(83,224,197,.35); border-radius:14px; background:rgba(6,21,30,.58); }
    .comparison-playback__head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
    .comparison-playback__head h3 { margin:.15rem 0; }
    .comparison-playback__controls { display:grid; grid-template-columns:repeat(3,minmax(120px,1fr)); gap:.65rem; margin:.8rem 0; }
    .comparison-playback__controls label { display:grid; gap:.25rem; }
    .comparison-playback__buttons { display:flex; gap:.45rem; flex-wrap:wrap; margin:.55rem 0; }
    .comparison-playback__timeline { display:grid; grid-template-columns:auto 1fr auto; gap:.65rem; align-items:center; }
    .comparison-playback__timeline input[type=range] { width:100%; }
    .comparison-playback__cards { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.65rem; margin-top:.75rem; }
    .comparison-playback-card { border:1px solid rgba(132,164,177,.32); border-radius:12px; padding:.65rem; background:rgba(2,13,20,.46); min-width:0; }
    .comparison-playback-card.is-fail { border-color:rgba(255,104,104,.65); }
    .comparison-playback-card.is-screening { border-color:rgba(242,190,79,.60); }
    .comparison-playback-card__top { display:grid; grid-template-columns:84px 1fr; gap:.55rem; align-items:center; }
    .comparison-playback-card__section svg { width:78px; height:72px; }
    .comparison-playback-card__event { font-weight:800; letter-spacing:.04em; }
    .comparison-playback-card__metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; margin:.5rem 0 0; }
    .comparison-playback-card__metrics div { border:1px solid rgba(132,164,177,.22); border-radius:8px; padding:.35rem .45rem; }
    .comparison-playback-card__metrics small { display:block; opacity:.7; }
    .comparison-response-svg { width:100%; height:78px; display:block; margin-top:.35rem; }
    .comparison-response-svg .baseline { stroke:#728694; stroke-width:1; stroke-dasharray:5 5; fill:none; }
    .comparison-response-svg .response { stroke:#5de0c5; stroke-width:3; fill:none; }
    .comparison-playback__boundary { margin:.7rem 0 0; opacity:.78; font-size:.9em; }
    @media (max-width:1000px) { .comparison-playback__cards { grid-template-columns:1fr; } .comparison-playback__controls { grid-template-columns:1fr; } }
    @media print { .comparison-playback { display:none !important; } }
  `;
  document.head.appendChild(style);
}

function normalizedBeamSvg(record, commonScalePxPerMm) {
  const series = record.result?.deflectionSeries;
  if (!Array.isArray(series) || series.length < 2) return '';
  const x0 = 10, x1 = 250, y0 = 30;
  const lengthM = series.at(-1).xM || 1;
  const path = series.map((point, index) => {
    const x = x0 + point.xM / lengthM * (x1 - x0);
    const y = y0 - point.displacementMm * commonScalePxPerMm;
    return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return `<svg class="comparison-response-svg" viewBox="0 0 260 78" aria-label="Solver-computed deflection shape"><path class="baseline" d="M 10 30 L 250 30"/><path class="response" d="${path}"/><text x="130" y="70" text-anchor="middle" class="svg-caption">same vertical display scale for all members</text></svg>`;
}

function renderCards(panel, definition, result, frame) {
  const cardRoot = panel.querySelector('[data-comparison-playback-cards]');
  const maxDeflection = definition.mode === 'beam'
    ? Math.max(0.001, ...result.records.map((record) => record.result.maxDeflectionMm || 0))
    : 0;
  const commonScale = definition.mode === 'beam' ? Math.min(34 / maxDeflection, 20) : 0;
  const orientationById = orientationMap(definition);

  cardRoot.innerHTML = result.records.map((record, index) => {
    const memberFrame = frame.members[index];
    const orientedSection = { ...record.section, displayRotationDeg: orientationById[record.comparisonId] ?? 0 };
    const statusClass = memberFrame.status === 'FAIL' ? 'is-fail' : memberFrame.status === 'SCREENING' ? 'is-screening' : '';
    const metrics = definition.mode === 'beam'
      ? `<div><small>P</small><strong>${compact(frame.loadKN,3)} kN</strong></div>
         <div><small>M max</small><strong>${compact(record.result.maxMomentKNm,3)} kN·m</strong></div>
         <div><small>Deflection</small><strong>${compact(record.result.maxDeflectionMm,2)} mm</strong></div>
         <div><small>Stress</small><strong>${compact(record.result.maxBendingStressMPa,1)} MPa</strong></div>
         <div><small>Strength use</small><strong>${record.strengthRatio == null ? '—' : `${compact(record.strengthRatio * 100,1)}%`}</strong></div>
         <div><small>Deflection use</small><strong>${compact(record.deflectionRatio * 100,1)}%</strong></div>`
      : `<div><small>P</small><strong>${compact(frame.loadKN,3)} kN</strong></div>
         <div><small>Capacity use</small><strong>${compact(record.capacityRatio * 100,1)}%</strong></div>
         <div><small>Stress</small><strong>${compact(record.result.maxCompressionStressMPa,1)} MPa</strong></div>
         <div><small>Stress use</small><strong>${compact(record.stressRatio * 100,1)}%</strong></div>
         <div><small>Shortening</small><strong>${compact(record.result.shorteningMm,3)} mm</strong></div>
         <div><small>Governing use</small><strong>${compact(record.governingRatio * 100,1)}%</strong></div>`;
    return `<article class="comparison-playback-card ${statusClass}" data-playback-member="${record.comparisonId}">
      <div class="comparison-playback-card__top"><div class="comparison-playback-card__section">${sectionSketchSvg(orientedSection, record.family)}</div><div><p class="eyebrow">${record.comparisonLabel} · Orientation ${orientationById[record.comparisonId] ?? 0}°</p><strong>${record.sectionLabel.replace(/ —.*/, '')}</strong><div class="comparison-playback-card__event">${memberFrame.event.label}</div></div></div>
      ${definition.mode === 'beam' ? normalizedBeamSvg(record, commonScale) : ''}
      <div class="comparison-playback-card__metrics">${metrics}</div>
    </article>`;
  }).join('');
}

function mountComparisonPlayback() {
  injectStyles();
  const panel = document.createElement('section');
  panel.className = 'comparison-playback';
  panel.dataset.comparisonPlayback = 'true';
  panel.innerHTML = `
    <div class="comparison-playback__head"><div><p class="eyebrow">SIM-VIZ-002 · synchronized virtual load test</p><h3>Side-by-side playback</h3><p>One load history, same instant, every selected member.</p></div><button type="button" class="button" data-cp-benchmark>Load C-purlin 0° vs 90° benchmark</button></div>
    <div class="comparison-playback__controls">
      <label><span>Quasi-static loading rate, kN/s</span><input type="number" min="0.001" step="0.05" value="0.25" data-cp-rate></label>
      <label><span>Playback speed</span><select data-cp-speed><option value="1">×1 real-time</option><option value="5">×5</option><option value="10" selected>×10</option><option value="25">×25</option></select></label>
      <label><span>Captured target load</span><output data-cp-target>—</output></label>
    </div>
    <div class="comparison-playback__buttons"><button type="button" class="button" data-cp-play>PLAY FROM ZERO</button><button type="button" class="button button--ghost" data-cp-step>STEP +2%</button><button type="button" class="button button--ghost" data-cp-reset>RESET TO ZERO</button><button type="button" class="button button--ghost" data-cp-export>EXPORT SIMULATION JSON</button></div>
    <div class="comparison-playback__timeline"><span data-cp-time>t = 0.00 s</span><input type="range" min="0" max="1000" step="1" value="0" data-cp-scrub aria-label="Comparison playback progress"><span data-cp-load>P = 0 kN</span></div>
    <div class="comparison-playback__cards" data-comparison-playback-cards></div>
    <p class="comparison-playback__boundary">Virtual time = load ÷ selected loading rate. This is synchronized quasi-static solver playback, not impact/dynamic time integration. C-purlins remain gross-section SCREENING until cold-formed local/distortional/LTB physics is implemented.</p>`;
  root.insertAdjacentElement('afterend', panel);

  const session = { targetLoadKN: currentInputLoadKN(), progress: 0, playing: false, raf: null, lastStamp: null, lastRenderStamp: 0, internalLoadUpdate: false };
  const rateInput = panel.querySelector('[data-cp-rate]');
  const speedSelect = panel.querySelector('[data-cp-speed]');
  const playButton = panel.querySelector('[data-cp-play]');
  const scrub = panel.querySelector('[data-cp-scrub]');

  function rate() {
    const value = Number(rateInput.value);
    return Number.isFinite(value) && value > 0 ? value : 0.25;
  }

  function currentInputLoadKN() {
    try { return convertLoadToKN(Number(loadInput.value), loadUnit.value); }
    catch { return 0; }
  }

  function updateTargetDisplay() {
    panel.querySelector('[data-cp-target]').textContent = `${compact(session.targetLoadKN,3)} kN · virtual duration ${compact(session.targetLoadKN / rate(),2)} s`;
  }

  function setSharedLoadKN(loadKN) {
    const solverLoad = modeNow() === 'compression' ? Math.max(loadKN, MIN_COMPRESSION_LOAD_KN) : Math.max(0, loadKN);
    const value = inputValueFromKN(solverLoad, loadUnit.value);
    session.internalLoadUpdate = true;
    loadInput.value = String(Number(value.toPrecision(10)));
    loadInput.dispatchEvent(new Event('input', { bubbles: true }));
    session.internalLoadUpdate = false;
    return solverLoad;
  }

  function frameAt(progress) {
    const definition = currentDefinition();
    const rawLoadKN = session.targetLoadKN * progress;
    const solverLoadKN = definition.mode === 'compression' ? Math.max(rawLoadKN, MIN_COMPRESSION_LOAD_KN) : rawLoadKN;
    const result = solveDefinition(definition, solverLoadKN);
    const frame = comparisonSimulationFrame({
      index: Math.round(progress * (FRAME_COUNT - 1)),
      progress,
      timeS: progress * session.targetLoadKN / rate(),
      loadKN: solverLoadKN,
      mode: definition.mode,
      result,
      orientationDegreesById: orientationMap(definition)
    });
    return { definition, result, frame };
  }

  function applyProgress(progress) {
    session.progress = Math.max(0, Math.min(1, progress));
    const requestedLoad = session.targetLoadKN * session.progress;
    setSharedLoadKN(requestedLoad);
    const { definition, result, frame } = frameAt(session.progress);
    scrub.value = String(Math.round(session.progress * 1000));
    panel.querySelector('[data-cp-time]').textContent = `t = ${compact(frame.timeS,2)} s`;
    panel.querySelector('[data-cp-load]').textContent = `P = ${compact(frame.loadKN,3)} kN`;
    renderCards(panel, definition, result, frame);
    return frame;
  }

  function stopPlaying() {
    session.playing = false;
    session.lastStamp = null;
    if (session.raf) cancelAnimationFrame(session.raf);
    session.raf = null;
    playButton.textContent = session.progress >= 0.999 ? 'PLAY AGAIN FROM ZERO' : 'PLAY';
  }

  function tick(stamp) {
    if (!session.playing) return;
    if (session.lastStamp == null) session.lastStamp = stamp;
    const deltaS = Math.max(0, (stamp - session.lastStamp) / 1000);
    session.lastStamp = stamp;
    const target = Math.max(session.targetLoadKN, 1e-9);
    session.progress = Math.min(1, session.progress + deltaS * Number(speedSelect.value) * rate() / target);
    if (stamp - session.lastRenderStamp >= 60 || session.progress >= 1) {
      session.lastRenderStamp = stamp;
      applyProgress(session.progress);
    }
    if (session.progress >= 1) { stopPlaying(); return; }
    session.raf = requestAnimationFrame(tick);
  }

  playButton.addEventListener('click', () => {
    if (session.playing) { stopPlaying(); return; }
    if (!(session.targetLoadKN > 0)) {
      session.targetLoadKN = currentInputLoadKN();
      if (!(session.targetLoadKN > 0)) return;
    }
    if (session.progress >= 0.999) applyProgress(0);
    session.playing = true;
    playButton.textContent = 'PAUSE';
    session.raf = requestAnimationFrame(tick);
  });

  panel.querySelector('[data-cp-step]').addEventListener('click', () => {
    stopPlaying();
    applyProgress(Math.min(1, session.progress + 0.02));
  });
  panel.querySelector('[data-cp-reset]').addEventListener('click', () => { stopPlaying(); applyProgress(0); });
  scrub.addEventListener('input', () => { stopPlaying(); applyProgress(Number(scrub.value) / 1000); });
  rateInput.addEventListener('change', () => { updateTargetDisplay(); applyProgress(session.progress); });

  for (const eventName of ['input', 'change']) {
    loadInput.addEventListener(eventName, () => {
      if (session.internalLoadUpdate || session.playing) return;
      const next = currentInputLoadKN();
      if (next > 0) { session.targetLoadKN = next; updateTargetDisplay(); }
    });
  }
  loadUnit.addEventListener('change', () => {
    if (session.internalLoadUpdate || session.playing) return;
    const next = currentInputLoadKN();
    if (next > 0) { session.targetLoadKN = next; updateTargetDisplay(); }
  });

  panel.querySelector('[data-cp-export]').addEventListener('click', () => exportFrames(panel, session, rate));
  panel.querySelector('[data-cp-benchmark]').addEventListener('click', async () => {
    stopPlaying();
    await configureCanonicalCPurlin();
    session.targetLoadKN = currentInputLoadKN();
    updateTargetDisplay();
    applyProgress(0);
  });

  updateTargetDisplay();
  if (session.targetLoadKN > 0) applyProgress(0);
}

async function settle() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function changeSelect(selector, value) {
  const select = document.querySelector(selector);
  if (!select) throw new Error(`Missing comparison control ${selector}.`);
  if (![...select.options].some((option) => option.value === value)) throw new Error(`Option ${value} is unavailable in ${selector}.`);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
}

async function configureCanonicalCPurlin() {
  document.getElementById('compareBeamModeButton')?.click();
  await settle();
  const third = document.querySelector('[data-slot-enable="2"]');
  if (third?.checked) { third.checked = false; third.dispatchEvent(new Event('change', { bubbles: true })); await settle(); }

  const length = document.getElementById('compareLengthInput');
  length.value = '3'; length.dispatchEvent(new Event('input', { bubbles: true }));
  await changeSelect('#compareBoundarySelect', 'simply-supported');
  await changeSelect('#compareLoadUnitSelect', 'kgf');
  const load = document.getElementById('compareLoadInput');
  load.value = '100'; load.dispatchEvent(new Event('input', { bubbles: true }));
  const position = document.getElementById('compareLoadPositionInput');
  position.value = '1.5'; position.dispatchEvent(new Event('input', { bubbles: true }));
  await changeSelect('#compareDeflectionSelect', '360');

  for (const index of [0, 1]) {
    await changeSelect(`[data-slot-material="${index}"]`, 'steel-generic-250');
    await changeSelect(`[data-slot-preset="${index}"]`, C100_08_ID);
    const display = document.querySelector(`[data-c-purlin-orientation-display="${index}"]`);
    if (!display) throw new Error(`Four-way C-purlin orientation control ${index} did not mount.`);
    display.value = index === 0 ? '0' : '90';
    display.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }
}

function buildExportPackage(session, rate) {
  const definition = currentDefinition();
  const frames = [];
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const progress = index / (FRAME_COUNT - 1);
    const rawLoad = session.targetLoadKN * progress;
    const solverLoad = definition.mode === 'compression' ? Math.max(rawLoad, MIN_COMPRESSION_LOAD_KN) : rawLoad;
    const result = solveDefinition(definition, solverLoad);
    frames.push(comparisonSimulationFrame({
      index,
      progress,
      timeS: progress * session.targetLoadKN / rate(),
      loadKN: solverLoad,
      mode: definition.mode,
      result,
      orientationDegreesById: orientationMap(definition)
    }));
  }
  return comparisonSimulationPackage({
    loadingRateKNPerS: rate(),
    targetLoadKN: session.targetLoadKN,
    mode: definition.mode,
    conditions: {
      ...definition.conditions,
      members: definition.selections.map((selection) => ({
        id: selection.id,
        label: selection.label,
        materialId: selection.material.id,
        sectionId: selection.preset.id,
        orientation: selection.orientation,
        orientationDeg: selection.orientationDeg
      }))
    },
    frames
  });
}

function exportFrames(panel, session, rate) {
  if (!(session.targetLoadKN > 0)) return;
  const pkg = buildExportPackage(session, rate);
  window.__FT_LAST_COMPARISON_SIMULATION_PACKAGE__ = pkg;
  const blob = new Blob([`${JSON.stringify(pkg, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `futoltech-comparison-simulation-${Date.now()}.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  panel.querySelector('[data-cp-export]').textContent = `EXPORTED ${pkg.frames.length} FRAMES`;
}
