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
  if (cards.length < 2 || cards.length > 3) {
    throw new Error('C-Purlin Physics Test Bench requires Member A and B, with Member C optional.');
  }

  return cards.map((card) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    const slotIndex = Number(presetSelect?.dataset.slotPreset);
    const material = materialById(materialSelect?.value);
    const preset = material ? presetById(material, presetSelect?.value) : null;
    if (!material || !preset || preset.productCategory !== 'c-purlin') {
      throw new Error('Every active Physics Bench specimen must be a C-purlin. Disable Member C or select a C-purlin for it.');
    }
    const orientation = orientationSelect?.value === 'rotated' ? 'rotated' : 'listed';
    return {
      id: `member-${String.fromCharCode(97 + slotIndex)}`,
      label: `Member ${String.fromCharCode(65 + slotIndex)}`,
      material,
      preset,
      orientation,
      orientationDeg: orientationDegrees(card, orientation)
    };
  });
}

function spanNow(panel) {
  const value = Number(panel.querySelector('[data-cpy-span-number]')?.value);
  return Number.isFinite(value) ? Math.max(.8, Math.min(4, value)) : DEFAULT_SPAN_M;
}

function slopeNow(panel) {
  const value = Number(panel.querySelector('[data-cpy-slope-number]')?.value);
  return Number.isFinite(value) ? Math.max(0, Math.min(60, value)) : 0;
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
  const safe = Math.max(.8, Math.min(4, Number(span) || DEFAULT_SPAN_M));
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
  panel.querySelector('[data-cpy-slope-number]').value = String(safe);
  panel.querySelector('[data-cpy-slope-range]').value = String(safe);
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

async function setDisplayOrientation(index, degrees) {
  const display = document.querySelector(`.compare-shell [data-c-purlin-orientation-display="${index}"]`);
  if (!display) throw new Error(`C-purlin orientation control ${index + 1} is unavailable.`);
  display.value = String(degrees);
  display.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
}

async function ensureThirdCPurlin(panel) {
  const toggle = document.querySelector('.compare-shell [data-slot-enable="2"]');
  if (!toggle?.checked) return;
  const preset = document.querySelector('.compare-shell [data-slot-preset="2"]');
  if (!String(preset?.value ?? '').startsWith('ph-cp-')) {
    await changeSelect('[data-slot-material="2"]', 'steel-generic-250');
    await changeSelect('[data-slot-preset="2"]', C100_08_ID);
    await setDisplayOrientation(2, 180);
  }
  panel.querySelector('[data-cpy-third]').checked = true;
}

async function setThirdIncluded(panel, included) {
  const toggle = document.querySelector('.compare-shell [data-slot-enable="2"]');
  if (!toggle) throw new Error('Member C include control is unavailable.');
  if (toggle.checked !== included) {
    toggle.checked = included;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await settle();
  }
  if (included) await ensureThirdCPurlin(panel);
  panel.querySelector('[data-cpy-third]').checked = !!document.querySelector('.compare-shell [data-slot-enable="2"]')?.checked;
}

async function configureDefaultBenchmark(panel) {
  document.getElementById('compareBeamModeButton')?.click();
  await settle();
  await setThirdIncluded(panel, false);
  for (const index of [0, 1]) {
    await changeSelect(`[data-slot-material="${index}"]`, 'steel-generic-250');
    await changeSelect(`[data-slot-preset="${index}"]`, C100_08_ID);
    await setDisplayOrientation(index, index === 0 ? 0 : 90);
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
  if (document.getElementById('ft-c-purlin-physics-bench-style-v2')) return;
  const style = document.createElement('style');
  style.id = 'ft-c-purlin-physics-bench-style-v2';
  style.textContent = `
    .c-purlin-physics-bench { scroll-margin-top:1rem; margin:1rem 0; padding:1rem; border:1px solid rgba(255,207,92,.45); border-radius:16px; background:linear-gradient(180deg,rgba(19,29,37,.96),rgba(5,17,24,.96)); }
    .c-purlin-physics-bench__head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
    .c-purlin-physics-bench__head h3 { margin:.15rem 0; font-size:1.35rem; }
    .c-purlin-physics-bench__shared-rule { margin:.65rem 0 .2rem; padding:.65rem .8rem; border:1px solid rgba(99,224,198,.35); border-radius:10px; background:rgba(16,74,71,.16); font-weight:750; }
    .c-purlin-physics-bench__controls { display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:.65rem; margin:.8rem 0; }
    .c-purlin-physics-bench__controls label { display:grid; gap:.28rem; }
    .c-purlin-physics-bench__pair { display:grid; grid-template-columns:minmax(80px,1fr) 74px; gap:.45rem; align-items:center; }
    .c-purlin-physics-bench__third { display:flex !important; grid-template-columns:auto 1fr; align-items:center; gap:.5rem !important; }
    .c-purlin-physics-bench__third input { width:auto; }
    .c-purlin-physics-bench__buttons { display:flex; gap:.5rem; flex-wrap:wrap; margin:.7rem 0; }
    .c-purlin-physics-bench__buttons .is-record { border-color:rgba(255,207,92,.75); }
    .c-purlin-physics-bench__readout { display:grid; grid-template-columns:1.2fr repeat(4,1fr); gap:.5rem; margin:.7rem 0; }
    .c-purlin-physics-bench__readout > div { padding:.65rem .75rem; border:1px solid rgba(132,164,177,.25); border-radius:10px; background:rgba(2,13,20,.45); }
    .c-purlin-physics-bench__readout small { display:block; opacity:.72; }
    .c-purlin-physics-bench__readout strong { display:block; margin-top:.15rem; font-size:1.03rem; }
    .c-purlin-physics-bench__load strong { font-size:1.55rem; color:#ffe08a; }
    .c-purlin-physics-bench canvas { display:block; width:100%; aspect-ratio:16/9; margin-top:.7rem; border:1px solid rgba(132,164,177,.28); border-radius:12px; background:#07141c; }
    .c-purlin-physics-bench__note { margin:.7rem 0 0; opacity:.84; font-size:.9em; }
    .c-purlin-physics-bench__error { margin:.6rem 0 0; padding:.55rem .7rem; border:1px solid rgba(255,110,110,.5); border-radius:9px; color:#ffd1d1; background:rgba(130,20,20,.18); }
    @media (max-width:1000px) { .c-purlin-physics-bench__readout { grid-template-columns:1fr 1fr; } }
    @media (max-width:620px) { .c-purlin-physics-bench__readout { grid-template-columns:1fr; } }
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
  ctx.lineTo(x - 10, y + 16);
  ctx.lineTo(x + 10, y + 16);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 20);
  ctx.lineTo(x + 15, y + 20);
  ctx.stroke();
  ctx.restore();
}

function drawLoadArrow(ctx, x, topY, bottomY, progress, label, compactLayout) {
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
  ctx.lineTo(x - 10, bottomY - 17);
  ctx.lineTo(x + 10, bottomY - 17);
  ctx.closePath();
  ctx.fill();
  ctx.font = `700 ${compactLayout ? 13 : 17}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x, topY - 8);
  ctx.restore();
}

function drawCSection(ctx, x, y, size, degrees, accent) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(5, size * .13);
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
  const { x, y, width } = lane;
  const compactLayout = width < 450;
  const accent = isGoverning && frame.loadKN >= targetLoadKN * .999 ? '#ff7272' : '#63e0c6';
  drawRoundRect(ctx, x, y, width, 410, 16, '#0b1c25', '#27414d');

  ctx.fillStyle = '#f1f7f8';
  ctx.font = `700 ${compactLayout ? 17 : 21}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`${selection.label} · ${selection.orientationDeg}°`, x + 18, y + 30);
  ctx.fillStyle = '#9eb1ba';
  ctx.font = `${compactLayout ? 11 : 14}px system-ui, sans-serif`;
  const sectionLabel = selection.preset.label.replace(/ —.*/, '');
  ctx.fillText(compactLayout && sectionLabel.length > 42 ? `${sectionLabel.slice(0, 39)}…` : sectionLabel, x + 18, y + 52);
  drawCSection(ctx, x + width - (compactLayout ? 45 : 60), y + 43, compactLayout ? 39 : 50, selection.orientationDeg, accent);

  const margin = compactLayout ? 28 : 45;
  const beamX0 = x + margin;
  const beamX1 = x + width - margin;
  const baselineY = y + 132;
  drawSupport(ctx, beamX0, baselineY + 2);
  drawSupport(ctx, beamX1, baselineY + 2);
  ctx.fillStyle = '#849aa5';
  ctx.font = `${compactLayout ? 10 : 12}px system-ui, sans-serif`;
  ctx.fillText('rafter', beamX0 - 13, baselineY + 43);
  ctx.textAlign = 'right';
  ctx.fillText('rafter', beamX1 + 13, baselineY + 43);

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
  ctx.lineWidth = compactLayout ? 4 : 5;
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
  drawLoadArrow(ctx, (beamX0 + beamX1) / 2, y + 72, Math.min(centerY - 4, baselineY - 6), frame.progress, `${compact(frame.loadKgf, 1)} kgf`, compactLayout);

  const formula = centerPointFormulaSnapshot({ loadKN: frame.loadKN, lengthM: frame.spanM, record });
  const fy = Number(record.strengthReferenceMPa) || 0;
  const use = Math.max(0, formula.strengthUse);
  const barX = x + 18;
  const barY = y + 190;
  const barW = width - 36;
  ctx.fillStyle = '#223843';
  ctx.fillRect(barX, barY, barW, 12);
  ctx.fillStyle = use >= 1 ? '#ff7272' : use >= .8 ? '#ffd65c' : '#63e0c6';
  ctx.fillRect(barX, barY, Math.min(1, use) * barW, 12);
  ctx.fillStyle = '#dfeaec';
  ctx.font = `700 ${compactLayout ? 12 : 14}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = 'left';
  const status = use >= .999 ? 'YIELD REACHED' : use >= .8 ? 'NEAR YIELD' : 'ELASTIC';
  ctx.fillText(`${status} · σ/Fy=${compact(use * 100, 1)}%`, barX, barY + 32);

  ctx.fillStyle = '#b8c9d0';
  ctx.font = `${compactLayout ? 11 : 14}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  const formulaY = y + 246;
  if (formula.roofSlopeDeg > .001) {
    if (compactLayout) {
      ctx.fillText(`P⊥=${compact(formula.roofNormalKN, 3)} · P∥=${compact(formula.roofParallelKN, 3)} kN`, barX, formulaY);
      ctx.fillText(`σgross=${compact(formula.stressMPa, 1)} MPa`, barX, formulaY + 23);
      ctx.fillText(`δ=${compact(formula.deflectionMm, 2)} mm`, barX, formulaY + 46);
    } else {
      ctx.fillText(`P⊥ = P cosθ = ${compact(formula.roofNormalKN, 3)} kN`, barX, formulaY);
      ctx.fillText(`P∥ = P sinθ = ${compact(formula.roofParallelKN, 3)} kN`, barX, formulaY + 23);
      ctx.fillText(`σgross ≈ |M⊥/Z⊥| + |M∥/Z∥| = ${compact(formula.stressMPa, 1)} MPa`, barX, formulaY + 46);
    }
  } else {
    ctx.fillText(`Mmax = PL/4 = ${compact(formula.maxMomentKNm, 3)} kN·m`, barX, formulaY);
    ctx.fillText(`σ = M/Z = ${compact(formula.stressMPa, 1)} MPa${compactLayout ? '' : `   (Fy=${compact(fy, 0)} MPa)`}`, barX, formulaY + 23);
    ctx.fillText(`δ = PL³/(48EI) = ${compact(formula.deflectionMm, 2)} mm`, barX, formulaY + 46);
  }
  ctx.fillText(`Deflection-limit use = ${compact(formula.deflectionUse * 100, 1)}%`, barX, formulaY + 69);
}

function drawFrame(panel, solved, progress, target, targetRecords) {
  const canvas = panel.querySelector('[data-cpy-canvas]');
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#07141c';
  ctx.fillRect(0, 0, width, height);

  const memberCount = solved.selections.length;
  ctx.fillStyle = '#ffe08a';
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUTOLTECH ENGINEERING AND PROJECT SYSTEMS', 40, 38);
  ctx.fillStyle = '#f4f8f9';
  ctx.font = '800 27px system-ui, sans-serif';
  ctx.fillText(`C-PURLIN PHYSICS TEST BENCH · ${memberCount}-MEMBER LOAD TO FIRST YIELD`, 40, 75);
  ctx.fillStyle = '#9eb1ba';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('ONE TEST ENVIRONMENT → all active members share span, slope, center load and playback history', 40, 101);
  ctx.fillText('Actual assembly: roof sheet tek-screwed to C-purlin; C-purlin welded to rafters. Connection restraint is not credited yet.', 40, 123);

  const frame = { loadKN: solved.loadKN, loadKgf: solved.loadKN * KGF_PER_KN, spanM: solved.lengthM, slope: solved.slope, progress };
  ctx.textAlign = 'right';
  ctx.fillStyle = progress >= .999 ? '#ff7272' : '#ffe08a';
  ctx.font = '900 31px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(frame.loadKgf, 1)} kgf`, width - 40, 67);
  ctx.fillStyle = '#91a7b1';
  ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(frame.loadKN, 3)} kN`, width - 40, 92);

  const maxTargetDeflection = Math.max(.01, ...targetRecords.map((record) => Math.abs(record.result?.maxDeflectionMm || 0)));
  const pxPerMm = Math.min(48 / maxTargetDeflection, 18);
  const truePxPerMm = 510 / (frame.spanM * 1000);
  const magnification = pxPerMm / Math.max(truePxPerMm, .0001);
  const gap = memberCount === 3 ? 24 : 60;
  const totalWidth = width - 80;
  const laneWidth = (totalWidth - gap * (memberCount - 1)) / memberCount;
  const lanes = Array.from({ length: memberCount }, (_, index) => ({ x: 40 + index * (laneWidth + gap), y: 155, width: laneWidth }));

  solved.result.records.forEach((record, index) => {
    drawMemberLane(ctx, lanes[index], solved.selections[index], record, frame, pxPerMm, target.targetLoadKN, record.comparisonId === target.governingMemberId);
  });

  ctx.fillStyle = '#c7d4d9';
  ctx.font = '15px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Shared rafter spacing / span = ${compact(frame.spanM, 2)} m   ·   shared roof slope = ${compact(frame.slope, 1)}°   ·   one center load at L/2`, 40, 608);
  ctx.fillText(`First gross-section yield target = ${compact(target.targetLoadKgf, 1)} kgf · governing: ${target.governingMemberLabel}`, 40, 635);
  ctx.fillText(`Deformation magnified ≈ ×${compact(magnification, 0)} for visibility. Animation time is presentation only — not dynamic/impact time.`, 40, 662);
  ctx.fillStyle = '#8299a4';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('SCREENING: effective width, local/distortional/LTB, weld stiffness, tek-screw restraint and roof-diaphragm action are not yet modeled.', 40, 692);

  panel.dataset.activeMembers = String(memberCount);
  window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__ = {
    loadKN: frame.loadKN,
    loadKgf: frame.loadKgf,
    spanM: frame.spanM,
    roofSlopeDeg: frame.slope,
    memberIds: solved.selections.map((selection) => selection.id),
    memberLoadsKN: solved.selections.map(() => frame.loadKN)
  };
}

function updateReadouts(panel, solved, target, progress) {
  const count = solved.selections.length;
  panel.querySelector('[data-cpy-load]').textContent = `${compact(solved.loadKN * KGF_PER_KN, 1)} kgf`;
  panel.querySelector('[data-cpy-kn]').textContent = `${compact(solved.loadKN, 3)} kN`;
  panel.querySelector('[data-cpy-target]').textContent = `${compact(target.targetLoadKgf, 1)} kgf`;
  panel.querySelector('[data-cpy-governing]').textContent = target.governingMemberLabel;
  panel.querySelector('[data-cpy-progress]').textContent = `${compact(progress * 100, 0)}%`;
  panel.querySelector('[data-cpy-active]').textContent = `${count} members`;
  panel.querySelector('[data-cpy-active-labels]').textContent = solved.selections.map((selection) => `${selection.label} ${selection.orientationDeg}°`).join(' · ');
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
  if (session.recorder?.state === 'recording' || session.recorder?.state === 'paused') session.recorder.stop();
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

function shouldFocusDemo() {
  const params = new URLSearchParams(location.search);
  return params.get('demo') === 'c-purlin' || location.hash === '#c-purlin-physics-bench';
}

function mountPhysicsBench() {
  if (document.querySelector('[data-c-purlin-physics-bench]')) return;
  injectStyles();

  const panel = document.createElement('section');
  panel.id = 'c-purlin-physics-bench';
  panel.className = 'c-purlin-physics-bench';
  panel.dataset.cPurlinPhysicsBench = 'true';
  panel.innerHTML = `
    <div class="c-purlin-physics-bench__head">
      <div><p class="eyebrow">RPE / SIM-VIZ-003 · C-purlin public physics demo</p><h3>Live C-Purlin Load-to-First-Yield Test</h3><p>Canonical lesson: same C-purlin at 0° versus 90°. Member C is optional and joins the exact same test environment.</p></div>
      <button type="button" class="button" data-cpy-default>LOAD DEFAULT 2 m · 0° VS 90° TEST</button>
    </div>
    <div class="c-purlin-physics-bench__shared-rule">ONE TEST ENVIRONMENT → every active member receives the same rafter spacing/span, roof slope, center point-load history, support idealization and animation timing.</div>
    <div class="c-purlin-physics-bench__controls">
      <label><span>Shared rafter spacing / C-purlin span</span><div class="c-purlin-physics-bench__pair"><input type="range" min="0.8" max="4" step="0.1" value="2" data-cpy-span-range><input type="number" min="0.8" max="4" step="0.1" value="2" data-cpy-span-number></div></label>
      <label><span>Shared roof slope, °</span><div class="c-purlin-physics-bench__pair"><input type="range" min="0" max="60" step="1" value="0" data-cpy-slope-range><input type="number" min="0" max="60" step="1" value="0" data-cpy-slope-number></div></label>
      <label><span>Shared animation duration</span><select data-cpy-duration><option value="16">Slow · 16 s</option><option value="12" selected>Dramatic · 12 s</option><option value="8">Normal · 8 s</option><option value="5">Quick · 5 s</option></select></label>
      <label class="c-purlin-physics-bench__third"><input type="checkbox" data-cpy-third><span>Include Member C in the same test</span></label>
      <label><span>Support / assembly basis</span><output>Simple-support benchmark · real weld + tek screws noted</output></label>
    </div>
    <div class="c-purlin-physics-bench__buttons">
      <button type="button" class="button" data-cpy-start>START TEST · 0 → FIRST YIELD</button>
      <button type="button" class="button button--ghost" data-cpy-pause>PAUSE</button>
      <button type="button" class="button button--ghost" data-cpy-reset>RESET</button>
      <button type="button" class="button button--ghost is-record" data-cpy-record>RECORD + DOWNLOAD VIDEO</button>
    </div>
    <div class="c-purlin-physics-bench__readout">
      <div class="c-purlin-physics-bench__load"><small>Live shared point load</small><strong data-cpy-load>0 kgf</strong><span data-cpy-kn>0 kN</span></div>
      <div><small>Active specimens</small><strong data-cpy-active>2 members</strong><span data-cpy-active-labels>A 0° · B 90°</span></div>
      <div><small>First-yield target</small><strong data-cpy-target>—</strong><span data-cpy-governing>—</span></div>
      <div><small>Playback</small><strong data-cpy-progress>0%</strong><span>visual time only</span></div>
      <div><small>State</small><strong data-cpy-status>READY</strong><span>gross-section screening</span></div>
    </div>
    <canvas width="1280" height="720" data-cpy-canvas aria-label="Animated two-or-three-member C-purlin load-to-yield engineering visualization"></canvas>
    <p class="c-purlin-physics-bench__note"><strong>Engineering boundary:</strong> the test increases one quasi-static center point load from zero to the first gross-section yield reference among all active specimens, then stops. The actual roof sheet is tek-screwed to the C-purlin and the C-purlin is welded to rafters; their restraint is assembly context only until connection/system behavior is calibrated. 0°/180° share the current major-axis gross screening state and 90°/270° share the minor-axis gross state; opening-direction/torsional differences require later cold-formed physics.</p>
    <div class="c-purlin-physics-bench__error" data-cpy-error hidden></div>`;

  resultsPanel.insertAdjacentElement('beforebegin', panel);

  const session = { playing:false, paused:false, raf:null, startStamp:null, pauseStamp:null, pausedDurationMs:0, lastRenderStamp:0, lastSharedUpdate:0, recorder:null, recordingChunks:[], target:null, targetRecords:null };

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
    if (session.paused) { session.raf = requestAnimationFrame(tick); return; }
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
      if (linear >= 1) { finish(solved); return; }
    }
    session.raf = requestAnimationFrame(tick);
  }

  panel.querySelector('[data-cpy-default]').addEventListener('click', async () => {
    try { stop(false); await configureDefaultBenchmark(panel); }
    catch (error) { showError(panel, error); }
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
  const slopeRange = panel.querySelector('[data-cpy-slope-range]');
  const slopeNumber = panel.querySelector('[data-cpy-slope-number]');
  spanRange.addEventListener('input', () => { if (!session.playing) { syncSpanToMain(panel, spanRange.value); refreshIdle(panel); } });
  spanNumber.addEventListener('change', () => { if (!session.playing) { syncSpanToMain(panel, spanNumber.value); refreshIdle(panel); } });
  slopeRange.addEventListener('input', () => { if (!session.playing) { syncSlopeToMain(panel, slopeRange.value); refreshIdle(panel); } });
  slopeNumber.addEventListener('change', () => { if (!session.playing) { syncSlopeToMain(panel, slopeNumber.value); refreshIdle(panel); } });
  panel.querySelector('[data-cpy-third]').addEventListener('change', async (event) => {
    if (session.playing) { event.target.checked = !event.target.checked; return; }
    try { await setThirdIncluded(panel, event.target.checked); refreshIdle(panel); }
    catch (error) { showError(panel, error); }
  });

  document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change', (event) => {
    if (!event.target?.matches?.('[data-slot-enable="2"]')) return;
    queueMicrotask(async () => {
      await settle();
      panel.querySelector('[data-cpy-third]').checked = !!document.querySelector('.compare-shell [data-slot-enable="2"]')?.checked;
      if (panel.querySelector('[data-cpy-third]').checked) {
        try { await ensureThirdCPurlin(panel); }
        catch (error) { showError(panel, error); return; }
      }
      if (!session.playing) refreshIdle(panel);
    });
  });

  const observer = new MutationObserver(() => {
    panel.querySelector('[data-cpy-third]').checked = !!document.querySelector('.compare-shell [data-slot-enable="2"]')?.checked;
    if (!session.playing) refreshIdle(panel);
  });
  const selectors = document.querySelector('.compare-shell #compareSelectors');
  if (selectors) observer.observe(selectors, { childList:true, subtree:true });

  window.__FT_C_PURLIN_PHYSICS_BENCH__ = {
    refresh: () => refreshIdle(panel),
    getSharedState: () => ({
      spanM: spanNow(panel),
      roofSlopeDeg: slopeNow(panel),
      activeMembers: Number(panel.dataset.activeMembers || 0),
      targetLoadKN: Number(panel.dataset.yieldTargetKn || 0)
    })
  };

  configureDefaultBenchmark(panel)
    .then(() => {
      if (shouldFocusDemo()) requestAnimationFrame(() => {
        panel.scrollIntoView({ behavior:'smooth', block:'start' });
        panel.querySelector('[data-cpy-start]')?.focus({ preventScroll:true });
      });
    })
    .catch((error) => showError(panel, error));
}
