import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { compareMemberCandidates } from './solver/memberComparison.js';
import { setCPurlinRoofSlopeDeg } from './solver/sectionRecommender.js';
import {
  KGF_PER_KN,
  centerPointFormulaSnapshot,
  dramaticProgress,
  firstYieldTarget
} from './solver/cPurlinYieldDemo.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const C100_08_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const FRAME_INTERVAL_MS = 1000 / 30;
const DEFAULT_SPAN_M = 2;
const DEFAULT_DURATION_S = 12;

const liveRoot = document.querySelector('.compare-shell');
const loadInput = document.getElementById('compareLoadInput');
const loadUnit = document.getElementById('compareLoadUnitSelect');
const lengthInput = document.getElementById('compareLengthInput');
const loadPositionInput = document.getElementById('compareLoadPositionInput');
const boundarySelect = document.getElementById('compareBoundarySelect');
const deflectionSelect = document.getElementById('compareDeflectionSelect');
const resultsPanel = document.querySelector('.compare-results');

if (liveRoot && loadInput && loadUnit && lengthInput && loadPositionInput && boundarySelect && resultsPanel) {
  mountPhysicsBench();
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function compact(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? null;
}

function presetById(material, id) {
  return presetsForFamily(material.family).find((preset) => preset.id === id) ?? null;
}

function activeCards() {
  return [...document.querySelectorAll('.compare-shell #compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
}

function orientationDegrees(card, fallback) {
  const display = card.querySelector('[data-c-purlin-orientation-display]');
  if (display && Number.isFinite(Number(display.value))) return Number(display.value);
  return fallback === 'rotated' ? 90 : 0;
}

function currentSelections() {
  const cards = activeCards();
  if (cards.length !== 2) throw new Error('C-Purlin Physics Test Bench uses exactly two active comparison members. Disable Member C or load the default benchmark.');
  return cards.map((card, index) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    const material = materialById(materialSelect?.value);
    const preset = material ? presetById(material, presetSelect?.value) : null;
    if (!material || !preset || preset.productCategory !== 'c-purlin') {
      throw new Error('Both active members must be C-purlins for this dedicated physics test.');
    }
    const orientation = orientationSelect?.value === 'rotated' ? 'rotated' : 'listed';
    return {
      id: `member-${String.fromCharCode(97 + index)}`,
      label: `Member ${String.fromCharCode(65 + index)}`,
      material,
      preset,
      orientation,
      orientationDeg: orientationDegrees(card, orientation)
    };
  });
}

function spanNow(panel) {
  const value = Number(panel.querySelector('[data-cpy-span-number]')?.value);
  if (!Number.isFinite(value)) return DEFAULT_SPAN_M;
  return Math.max(0.8, Math.min(4, value));
}

function slopeNow(panel) {
  const local = Number(panel.querySelector('[data-cpy-slope]')?.value);
  if (Number.isFinite(local)) return Math.max(0, Math.min(60, local));
  return 0;
}

function durationNow(panel) {
  const value = Number(panel.querySelector('[data-cpy-duration]')?.value);
  return Number.isFinite(value) && value >= 4 ? value : DEFAULT_DURATION_S;
}

function solveAtLoad(panel, loadKN) {
  const selections = currentSelections();
  const lengthM = spanNow(panel);
  const slope = slopeNow(panel);
  setCPurlinRoofSlopeDeg(slope);
  const result = compareMemberCandidates({
    selections,
    lengthM,
    loadKN,
    loadPositionM: lengthM / 2,
    boundary: 'simply-supported',
    deflectionDivisor: Number(deflectionSelect?.value) || 180
  });
  return { selections, lengthM, slope, result };
}

function determineTarget(panel) {
  // A 1 kN probe is safely within the linear elastic model for deriving the
  // proportional first-yield load. No second capacity equation is introduced.
  const solved = solveAtLoad(panel, 1);
  const yieldTarget = firstYieldTarget(solved.result.records);
  const targetResult = solveAtLoad(panel, yieldTarget.targetLoadKN);
  return { ...solved, ...yieldTarget, targetResult: targetResult.result };
}

function setSharedLoadKN(loadKN, dispatch = true) {
  const kgf = Math.max(0, loadKN) * KGF_PER_KN;
  if (loadUnit.value !== 'kgf') {
    loadUnit.value = 'kgf';
    if (dispatch) loadUnit.dispatchEvent(new Event('change', { bubbles: true }));
  }
  loadInput.value = String(Number(kgf.toFixed(4)));
  if (dispatch) loadInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncSpanToMain(panel, span) {
  const safe = Math.max(0.8, Math.min(4, Number(span) || DEFAULT_SPAN_M));
  panel.querySelector('[data-cpy-span-number]').value = String(safe);
  panel.querySelector('[data-cpy-span-range]').value = String(safe);
  lengthInput.value = String(safe);
  lengthInput.dispatchEvent(new Event('input', { bubbles: true }));
  lengthInput.dispatchEvent(new Event('change', { bubbles: true }));
  boundarySelect.value = 'simply-supported';
  boundarySelect.dispatchEvent(new Event('change', { bubbles: true }));
  loadPositionInput.value = String(safe / 2);
  loadPositionInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function syncSlopeToMain(panel, slope) {
  const safe = Math.max(0, Math.min(60, Number(slope) || 0));
  panel.querySelector('[data-cpy-slope]').value = String(safe);
  setCPurlinRoofSlopeDeg(safe);
  const mainSlope = document.getElementById('compareRoofSlopeInput');
  if (mainSlope) {
    mainSlope.value = String(safe);
    mainSlope.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    loadInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

async function settle() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function changeSelect(selector, value) {
  const select = document.querySelector(`.compare-shell ${selector}`);
  if (!select) throw new Error(`Missing comparison control ${selector}.`);
  if (![...select.options].some((option) => option.value === value)) throw new Error(`Option ${value} is unavailable in ${selector}.`);
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
}

async function configureDefaultBenchmark(panel) {
  document.getElementById('compareBeamModeButton')?.click();
  await settle();
  const third = document.querySelector('.compare-shell [data-slot-enable="2"]');
  if (third?.checked) {
    third.checked = false;
    third.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }
  for (const index of [0, 1]) {
    await changeSelect(`[data-slot-material="${index}"]`, 'steel-generic-250');
    await changeSelect(`[data-slot-preset="${index}"]`, C100_08_ID);
    const display = document.querySelector(`.compare-shell [data-c-purlin-orientation-display="${index}"]`);
    if (!display) throw new Error(`C-purlin orientation control ${index + 1} is unavailable.`);
    display.value = index === 0 ? '0' : '90';
    display.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }
  syncSpanToMain(panel, DEFAULT_SPAN_M);
  syncSlopeToMain(panel, 0);
  if (deflectionSelect) {
    deflectionSelect.value = '180';
    deflectionSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  setSharedLoadKN(0);
  refreshIdle(panel);
}

function injectStyles() {
  if (document.getElementById('ft-c-purlin-physics-bench-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-c-purlin-physics-bench-style';
  style.textContent = `
    .c-purlin-physics-bench { margin:1rem 0; padding:1rem; border:1px solid rgba(255,207,92,.45); border-radius:16px; background:linear-gradient(180deg,rgba(19,29,37,.96),rgba(5,17,24,.96)); }
    .c-purlin-physics-bench__head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
    .c-purlin-physics-bench__head h3 { margin:.15rem 0; font-size:1.3rem; }
    .c-purlin-physics-bench__controls { display:grid; grid-template-columns:repeat(4,minmax(140px,1fr)); gap:.65rem; margin:.9rem 0; }
    .c-purlin-physics-bench__controls label { display:grid; gap:.28rem; }
    .c-purlin-physics-bench__span-pair { display:grid; grid-template-columns:1fr 80px; gap:.45rem; align-items:center; }
    .c-purlin-physics-bench__buttons { display:flex; gap:.5rem; flex-wrap:wrap; margin:.7rem 0; }
    .c-purlin-physics-bench__buttons .is-record { border-color:rgba(255,207,92,.75); }
    .c-purlin-physics-bench__readout { display:grid; grid-template-columns:1.2fr 1fr 1fr 1fr; gap:.5rem; margin:.7rem 0; }
    .c-purlin-physics-bench__readout > div { padding:.65rem .75rem; border:1px solid rgba(132,164,177,.25); border-radius:10px; background:rgba(2,13,20,.45); }
    .c-purlin-physics-bench__readout small { display:block; opacity:.72; }
    .c-purlin-physics-bench__readout strong { display:block; margin-top:.15rem; font-size:1.05rem; }
    .c-purlin-physics-bench__load strong { font-size:1.55rem; color:#ffe08a; }
    .c-purlin-physics-bench canvas { display:block; width:100%; aspect-ratio:16/9; margin-top:.7rem; border:1px solid rgba(132,164,177,.28); border-radius:12px; background:#07141c; }
    .c-purlin-physics-bench__note { margin:.7rem 0 0; opacity:.82; font-size:.9em; }
    .c-purlin-physics-bench__error { margin:.6rem 0 0; padding:.55rem .7rem; border:1px solid rgba(255,110,110,.5); border-radius:9px; color:#ffd1d1; background:rgba(130,20,20,.18); }
    @media (max-width:1000px) { .c-purlin-physics-bench__controls,.c-purlin-physics-bench__readout { grid-template-columns:1fr 1fr; } }
    @media (max-width:620px) { .c-purlin-physics-bench__controls,.c-purlin-physics-bench__readout { grid-template-columns:1fr; } }
    @media print { .c-purlin-physics-bench { display:none !important; } }
  `;
  document.head.appendChild(style);
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawSupport(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = '#a9bdc7';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 12, y + 18);
  ctx.lineTo(x + 12, y + 18);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 22);
  ctx.lineTo(x + 18, y + 22);
  ctx.stroke();
  ctx.restore();
}

function drawLoadArrow(ctx, x, topY, bottomY, progress, label) {
  const width = 3 + 7 * progress;
  ctx.save();
  ctx.strokeStyle = progress >= .995 ? '#ff6b6b' : '#ffd65c';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, bottomY - 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, bottomY);
  ctx.lineTo(x - 11, bottomY - 18);
  ctx.lineTo(x + 11, bottomY - 18);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 17px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, topY - 9);
  ctx.restore();
}

function drawCSection(ctx, x, y, size, degrees, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const h = size;
  const b = size * .48;
  const lip = size * .18;
  ctx.beginPath();
  ctx.moveTo(b, -h / 2 + lip);
  ctx.lineTo(b, -h / 2);
  ctx.lineTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.lineTo(b, h / 2);
  ctx.lineTo(b, h / 2 - lip);
  ctx.stroke();
  ctx.restore();
}

function drawMemberLane(ctx, lane, selection, record, frame, displayScalePxPerMm, targetLoadKN, isGoverning) {
  const { x, y, width, height } = lane;
  const accent = isGoverning && frame.loadKN >= targetLoadKN * .999 ? '#ff7272' : '#63e0c6';
  drawRoundRect(ctx, x, y, width, height, 16, '#0b1c25', '#27414d');

  ctx.fillStyle = '#f1f7f8';
  ctx.font = '700 21px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${selection.label} · ${selection.orientationDeg}°`, x + 22, y + 32);
  ctx.fillStyle = '#9eb1ba';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(selection.preset.label.replace(/ —.*/, ''), x + 22, y + 55);
  drawCSection(ctx, x + width - 60, y + 45, 50, selection.orientationDeg, accent);

  const beamX0 = x + 45;
  const beamX1 = x + width - 45;
  const baselineY = y + 132;
  drawSupport(ctx, beamX0, baselineY + 2);
  drawSupport(ctx, beamX1, baselineY + 2);
  ctx.fillStyle = '#849aa5';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('rafter', beamX0 - 18, baselineY + 48);
  ctx.textAlign = 'right';
  ctx.fillText('rafter', beamX1 + 18, baselineY + 48);

  const series = record.result?.deflectionSeries ?? [];
  ctx.strokeStyle = '#617985';
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(beamX0, baselineY);
  ctx.lineTo(beamX1, baselineY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  if (series.length) {
    series.forEach((point, index) => {
      const px = beamX0 + point.xM / frame.spanM * (beamX1 - beamX0);
      const py = baselineY + Math.abs(point.displacementMm || 0) * displayScalePxPerMm;
      if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
  } else {
    ctx.moveTo(beamX0, baselineY);
    ctx.lineTo(beamX1, baselineY);
  }
  ctx.stroke();

  const centerY = baselineY + (record.result?.maxDeflectionMm || 0) * displayScalePxPerMm;
  drawLoadArrow(ctx, (beamX0 + beamX1) / 2, y + 72, Math.min(centerY - 4, baselineY - 6), frame.progress, `${compact(frame.loadKgf, 1)} kgf`);

  const formula = centerPointFormulaSnapshot({ loadKN: frame.loadKN, lengthM: frame.spanM, record });
  const fy = Number(record.strengthReferenceMPa) || 0;
  const use = Math.max(0, formula.strengthUse);
  const barX = x + 22;
  const barY = y + 194;
  const barW = width - 44;
  ctx.fillStyle = '#223843';
  ctx.fillRect(barX, barY, barW, 12);
  ctx.fillStyle = use >= 1 ? '#ff7272' : use >= .8 ? '#ffd65c' : '#63e0c6';
  ctx.fillRect(barX, barY, Math.min(1, use) * barW, 12);
  ctx.fillStyle = '#dfeaec';
  ctx.font = '700 14px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textAlign = 'left';
  const status = use >= .999 ? 'YIELD REACHED' : use >= .8 ? 'NEAR YIELD' : 'ELASTIC';
  ctx.fillText(`${status} · σ/Fy = ${compact(use * 100, 1)}%`, barX, barY + 34);

  ctx.fillStyle = '#b8c9d0';
  ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
  const formulaY = y + 250;
  if (formula.roofSlopeDeg > 0.001) {
    ctx.fillText(`P⊥ = P cosθ = ${compact(formula.roofNormalKN, 3)} kN`, barX, formulaY);
    ctx.fillText(`P∥ = P sinθ = ${compact(formula.roofParallelKN, 3)} kN`, barX, formulaY + 23);
    ctx.fillText(`σgross ≈ |M⊥/Z⊥| + |M∥/Z∥| = ${compact(formula.stressMPa, 1)} MPa`, barX, formulaY + 46);
  } else {
    ctx.fillText(`Mmax = P·L/4 = ${compact(formula.maxMomentKNm, 3)} kN·m`, barX, formulaY);
    ctx.fillText(`σ = M/Z = ${compact(formula.stressMPa, 1)} MPa   (Fy=${compact(fy, 0)} MPa)`, barX, formulaY + 23);
    ctx.fillText(`δmax = P·L³/(48EI) → ${compact(formula.deflectionMm, 2)} mm`, barX, formulaY + 46);
  }
  ctx.fillText(`Deflection = ${compact(formula.deflectionMm, 2)} mm · limit use ${compact(formula.deflectionUse * 100, 1)}%`, barX, formulaY + 69);
}

function drawFrame(panel, solved, progress, target, targetRecords) {
  const canvas = panel.querySelector('[data-cpy-canvas]');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#07141c';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#ffe08a';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUTOLTECH ENGINEERING AND PROJECT SYSTEMS', 40, 38);
  ctx.fillStyle = '#f4f8f9';
  ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText('C-PURLIN PHYSICS TEST BENCH · LOAD TO FIRST YIELD', 40, 76);
  ctx.fillStyle = '#9eb1ba';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Gross-section elastic screening · simply-supported benchmark · center point load', 40, 101);
  ctx.fillText('Actual assembly context: roof sheet tek-screwed to C-purlin; C-purlin welded to rafters. Connection restraint is not yet credited in this benchmark.', 40, 123);

  const frame = {
    loadKN: solved.loadKN,
    loadKgf: solved.loadKN * KGF_PER_KN,
    spanM: solved.lengthM,
    slope: solved.slope,
    progress
  };
  ctx.textAlign = 'right';
  ctx.fillStyle = progress >= .999 ? '#ff7272' : '#ffe08a';
  ctx.font = '900 32px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(frame.loadKgf, 1)} kgf`, width - 40, 68);
  ctx.fillStyle = '#91a7b1';
  ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(frame.loadKN, 3)} kN`, width - 40, 93);

  const maxTargetDeflection = Math.max(.01, ...targetRecords.map((record) => Math.abs(record.result?.maxDeflectionMm || 0)));
  const pxPerMm = Math.min(48 / maxTargetDeflection, 18);
  const truePxPerMm = 510 / (frame.spanM * 1000);
  const magnification = pxPerMm / Math.max(truePxPerMm, .0001);

  const lanes = [
    { x: 40, y: 155, width: 570, height: 410 },
    { x: 670, y: 155, width: 570, height: 410 }
  ];
  solved.result.records.slice(0, 2).forEach((record, index) => {
    drawMemberLane(ctx, lanes[index], solved.selections[index], record, frame, pxPerMm, target.targetLoadKN, record.comparisonId === target.governingMemberId);
  });

  ctx.fillStyle = '#c7d4d9';
  ctx.font = '15px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Rafter spacing / span = ${compact(frame.spanM, 2)} m   ·   roof slope = ${compact(frame.slope, 1)}°   ·   center load at L/2`, 40, 608);
  ctx.fillText(`First gross-section yield target = ${compact(target.targetLoadKgf, 1)} kgf · governing: ${target.governingMemberLabel}`, 40, 635);
  ctx.fillText(`Deformation shown magnified ≈ ×${compact(magnification, 0)} for visibility. Animation time is visual playback only — not dynamic/impact time.`, 40, 662);
  ctx.fillStyle = '#8299a4';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('SCREENING boundary: effective width, local/distortional/LTB, weld stiffness, tek-screw restraint and roof diaphragm action are not yet modeled.', 40, 692);
}

function updateReadouts(panel, solved, target, progress) {
  panel.querySelector('[data-cpy-load]').textContent = `${compact(solved.loadKN * KGF_PER_KN, 1)} kgf`;
  panel.querySelector('[data-cpy-kn]').textContent = `${compact(solved.loadKN, 3)} kN`;
  panel.querySelector('[data-cpy-target]').textContent = `${compact(target.targetLoadKgf, 1)} kgf`;
  panel.querySelector('[data-cpy-governing]').textContent = target.governingMemberLabel;
  panel.querySelector('[data-cpy-progress]').textContent = `${compact(progress * 100, 0)}%`;
  const status = progress >= .999 ? 'FIRST YIELD REACHED' : progress > .8 ? 'APPROACHING YIELD' : progress > 0 ? 'ELASTIC LOADING' : 'READY';
  panel.querySelector('[data-cpy-status]').textContent = status;
}

function preferredVideoMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((type) => MediaRecorder.isTypeSupported?.(type)) ?? 'video/webm';
}

function startCanvasRecording(panel, session) {
  const canvas = panel.querySelector('[data-cpy-canvas]');
  if (!canvas.captureStream || typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support canvas video recording. Use a current Chromium/Chrome browser.');
  }
  const stream = canvas.captureStream(30);
  const mimeType = preferredVideoMime();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
  session.recordingChunks = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data?.size) session.recordingChunks.push(event.data);
  });
  recorder.addEventListener('stop', () => {
    const blob = new Blob(session.recordingChunks, { type: recorder.mimeType || 'video/webm' });
    if (!blob.size) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `futoltech-c-purlin-load-to-yield-${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    panel.querySelector('[data-cpy-record]').textContent = 'RECORD + DOWNLOAD VIDEO';
  });
  recorder.start(250);
  session.recorder = recorder;
  panel.querySelector('[data-cpy-record]').textContent = 'RECORDING…';
}

function stopCanvasRecording(session) {
  if (session.recorder?.state === 'recording' || session.recorder?.state === 'paused') {
    session.recorder.stop();
  }
  session.recorder = null;
}

function showError(panel, error) {
  const banner = panel.querySelector('[data-cpy-error]');
  banner.textContent = error instanceof Error ? error.message : String(error);
  banner.hidden = false;
}

function clearError(panel) {
  const banner = panel.querySelector('[data-cpy-error]');
  banner.hidden = true;
  banner.textContent = '';
}

function prepare(panel) {
  clearError(panel);
  const target = determineTarget(panel);
  const targetRecords = target.targetResult.records;
  panel.dataset.yieldTargetKn = String(target.targetLoadKN);
  panel.dataset.yieldTargetKgf = String(target.targetLoadKgf);
  panel.dataset.governingMember = target.governingMemberId;
  return { target, targetRecords };
}

function refreshIdle(panel) {
  try {
    const { target, targetRecords } = prepare(panel);
    const solvedBase = solveAtLoad(panel, 0);
    const solved = { ...solvedBase, loadKN: 0 };
    updateReadouts(panel, solved, target, 0);
    drawFrame(panel, solved, 0, target, targetRecords);
  } catch (error) {
    showError(panel, error);
  }
}

function mountPhysicsBench() {
  if (document.querySelector('[data-c-purlin-physics-bench]')) return;
  injectStyles();

  const panel = document.createElement('section');
  panel.className = 'c-purlin-physics-bench';
  panel.dataset.cPurlinPhysicsBench = 'true';
  panel.innerHTML = `
    <div class="c-purlin-physics-bench__head">
      <div><p class="eyebrow">RPE / SIM-VIZ-003 · C-purlin public physics demo</p><h3>Live Load-to-First-Yield Test</h3><p>Same C-purlin, same span, same center point load — watch orientation change the response.</p></div>
      <button type="button" class="button" data-cpy-default>LOAD DEFAULT 2 m · 0° VS 90° TEST</button>
    </div>
    <div class="c-purlin-physics-bench__controls">
      <label><span>Rafter spacing / C-purlin span</span><div class="c-purlin-physics-bench__span-pair"><input type="range" min="0.8" max="4" step="0.1" value="2" data-cpy-span-range><input type="number" min="0.8" max="4" step="0.1" value="2" data-cpy-span-number></div></label>
      <label><span>Roof slope, °</span><input type="number" min="0" max="60" step="1" value="0" data-cpy-slope></label>
      <label><span>Animation duration</span><select data-cpy-duration><option value="16">Slow · 16 s</option><option value="12" selected>Dramatic · 12 s</option><option value="8">Normal · 8 s</option><option value="5">Quick · 5 s</option></select></label>
      <label><span>Support / assembly basis</span><output>Simple supports · actual weld + tek screws noted</output></label>
    </div>
    <div class="c-purlin-physics-bench__buttons">
      <button type="button" class="button" data-cpy-start>START TEST · 0 → FIRST YIELD</button>
      <button type="button" class="button button--ghost" data-cpy-pause>PAUSE</button>
      <button type="button" class="button button--ghost" data-cpy-reset>RESET</button>
      <button type="button" class="button button--ghost is-record" data-cpy-record>RECORD + DOWNLOAD VIDEO</button>
    </div>
    <div class="c-purlin-physics-bench__readout">
      <div class="c-purlin-physics-bench__load"><small>Live point load · familiar force equivalent</small><strong data-cpy-load>0 kgf</strong><span data-cpy-kn>0 kN</span></div>
      <div><small>First-yield target</small><strong data-cpy-target>—</strong><span data-cpy-governing>—</span></div>
      <div><small>Playback</small><strong data-cpy-progress>0%</strong><span>visual time only</span></div>
      <div><small>State</small><strong data-cpy-status>READY</strong><span>gross-section screening</span></div>
    </div>
    <canvas width="1280" height="720" data-cpy-canvas aria-label="Animated C-purlin load-to-yield engineering visualization"></canvas>
    <p class="c-purlin-physics-bench__note"><strong>Engineering boundary:</strong> this demo increases a quasi-static center point load from zero to the first gross-section yield reference. It deliberately stops there. It does not animate post-yield fracture or claim cold-formed design capacity. Actual roof sheet is tek-screwed to the C-purlin and the C-purlin is welded to rafters; their restraint is shown as assembly context but is not credited until the connection/system model is calibrated.</p>
    <div class="c-purlin-physics-bench__error" data-cpy-error hidden></div>`;

  resultsPanel.insertAdjacentElement('beforebegin', panel);

  const session = {
    playing: false,
    paused: false,
    raf: null,
    startStamp: null,
    pauseStamp: null,
    pausedDurationMs: 0,
    lastRenderStamp: 0,
    lastSharedUpdate: 0,
    recorder: null,
    recordingChunks: [],
    target: null,
    targetRecords: null
  };

  async function run({ recordVideo = false } = {}) {
    try {
      clearError(panel);
      if (session.playing) stop(false);
      const prepared = prepare(panel);
      session.target = prepared.target;
      session.targetRecords = prepared.targetRecords;
      session.playing = true;
      session.paused = false;
      session.startStamp = null;
      session.pausedDurationMs = 0;
      session.lastRenderStamp = 0;
      session.lastSharedUpdate = 0;
      setSharedLoadKN(0);
      const solvedBase = solveAtLoad(panel, 0);
      const solved = { ...solvedBase, loadKN: 0 };
      drawFrame(panel, solved, 0, session.target, session.targetRecords);
      updateReadouts(panel, solved, session.target, 0);
      if (recordVideo) startCanvasRecording(panel, session);
      panel.querySelector('[data-cpy-start]').textContent = 'TEST RUNNING…';
      session.raf = requestAnimationFrame(tick);
    } catch (error) {
      showError(panel, error);
      stopCanvasRecording(session);
    }
  }

  function stop(resetButton = true) {
    session.playing = false;
    session.paused = false;
    if (session.raf) cancelAnimationFrame(session.raf);
    session.raf = null;
    if (resetButton) panel.querySelector('[data-cpy-start]').textContent = 'START TEST · 0 → FIRST YIELD';
  }

  function finish(solved) {
    stop(true);
    setSharedLoadKN(session.target.targetLoadKN, true);
    updateReadouts(panel, solved, session.target, 1);
    drawFrame(panel, solved, 1, session.target, session.targetRecords);
    if (session.recorder) setTimeout(() => stopCanvasRecording(session), 450);
  }

  function tick(stamp) {
    if (!session.playing) return;
    if (session.paused) {
      session.raf = requestAnimationFrame(tick);
      return;
    }
    if (session.startStamp == null) session.startStamp = stamp;
    const elapsedMs = Math.max(0, stamp - session.startStamp - session.pausedDurationMs);
    const durationMs = durationNow(panel) * 1000;
    const linear = Math.min(1, elapsedMs / durationMs);
    const progress = dramaticProgress(linear);
    const loadKN = session.target.targetLoadKN * progress;

    if (stamp - session.lastRenderStamp >= FRAME_INTERVAL_MS || linear >= 1) {
      session.lastRenderStamp = stamp;
      const solvedBase = solveAtLoad(panel, loadKN);
      const solved = { ...solvedBase, loadKN };
      drawFrame(panel, solved, progress, session.target, session.targetRecords);
      updateReadouts(panel, solved, session.target, progress);
      if (stamp - session.lastSharedUpdate >= 100 || linear >= 1) {
        session.lastSharedUpdate = stamp;
        setSharedLoadKN(loadKN, true);
      }
      if (linear >= 1) {
        finish(solved);
        return;
      }
    }
    session.raf = requestAnimationFrame(tick);
  }

  panel.querySelector('[data-cpy-default]').addEventListener('click', async () => {
    try {
      stop(false);
      await configureDefaultBenchmark(panel);
    } catch (error) {
      showError(panel, error);
    }
  });
  panel.querySelector('[data-cpy-start]').addEventListener('click', () => run());
  panel.querySelector('[data-cpy-record]').addEventListener('click', () => run({ recordVideo: true }));
  panel.querySelector('[data-cpy-pause]').addEventListener('click', () => {
    if (!session.playing) return;
    session.paused = !session.paused;
    const button = panel.querySelector('[data-cpy-pause]');
    if (session.paused) {
      session.pauseStamp = performance.now();
      if (session.recorder?.state === 'recording') session.recorder.pause();
      button.textContent = 'RESUME';
    } else {
      if (session.pauseStamp != null) session.pausedDurationMs += performance.now() - session.pauseStamp;
      session.pauseStamp = null;
      if (session.recorder?.state === 'paused') session.recorder.resume();
      button.textContent = 'PAUSE';
    }
  });
  panel.querySelector('[data-cpy-reset]').addEventListener('click', () => {
    stop(true);
    stopCanvasRecording(session);
    setSharedLoadKN(0);
    panel.querySelector('[data-cpy-pause]').textContent = 'PAUSE';
    refreshIdle(panel);
  });

  const spanRange = panel.querySelector('[data-cpy-span-range]');
  const spanNumber = panel.querySelector('[data-cpy-span-number]');
  spanRange.addEventListener('input', () => {
    if (session.playing) return;
    syncSpanToMain(panel, spanRange.value);
    refreshIdle(panel);
  });
  spanNumber.addEventListener('change', () => {
    if (session.playing) return;
    syncSpanToMain(panel, spanNumber.value);
    refreshIdle(panel);
  });
  panel.querySelector('[data-cpy-slope]').addEventListener('change', (event) => {
    if (session.playing) return;
    syncSlopeToMain(panel, event.target.value);
    refreshIdle(panel);
  });

  const observer = new MutationObserver(() => {
    if (!session.playing) refreshIdle(panel);
  });
  const selectors = document.querySelector('.compare-shell #compareSelectors');
  if (selectors) observer.observe(selectors, { childList: true, subtree: true });

  // Make the public demonstration immediately meaningful on first load.
  configureDefaultBenchmark(panel).catch((error) => showError(panel, error));
}
