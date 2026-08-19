import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { compareMemberCandidates } from './solver/memberComparison.js';
import { setCPurlinRoofSlopeDeg } from './solver/sectionRecommender.js';
import { KGF_PER_KN, dramaticProgress, centerPointFormulaSnapshot } from './solver/cPurlinYieldDemo.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const FRAME_INTERVAL_MS = 1000 / 30;
const panel = document.querySelector('[data-c-purlin-physics-bench]');
const loadInput = document.getElementById('compareLoadInput');
const loadUnit = document.getElementById('compareLoadUnitSelect');
const deflectionSelect = document.getElementById('compareDeflectionSelect');

function compact(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
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

function currentSelections() {
  const cards = activeCards();
  if (cards.length < 2 || cards.length > 3) throw new Error('Select two or three active C-purlins for the Physics Bench.');
  return cards.map((card) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    const slot = Number(presetSelect?.dataset.slotPreset);
    const material = materialById(materialSelect?.value);
    const preset = material ? presetById(material, presetSelect?.value) : null;
    if (!material || !preset || preset.productCategory !== 'c-purlin') throw new Error('Every active Physics Bench specimen must be a C-purlin.');
    const orientation = orientationSelect?.value === 'rotated' ? 'rotated' : 'listed';
    const display = card.querySelector('[data-c-purlin-orientation-display]');
    const orientationDeg = Number(display?.value ?? (orientation === 'rotated' ? 90 : 0));
    return {
      id: `member-${String.fromCharCode(97 + slot)}`,
      label: `Member ${String.fromCharCode(65 + slot)}`,
      material,
      preset,
      orientation,
      orientationDeg: Number.isFinite(orientationDeg) ? orientationDeg : 0
    };
  });
}

function spanNow() {
  const value = Number(panel?.querySelector('[data-cpy-span-number]')?.value);
  return Number.isFinite(value) ? Math.max(.8, Math.min(4, value)) : 2;
}

function slopeNow() {
  const value = Number(panel?.querySelector('[data-cpy-slope-number]')?.value);
  return Number.isFinite(value) ? Math.max(0, Math.min(60, value)) : 0;
}

function durationNow() {
  const value = Number(panel?.querySelector('[data-cpy-duration]')?.value);
  return Number.isFinite(value) && value >= 4 ? value : 12;
}

function solveAtLoad(loadKN) {
  const selections = currentSelections();
  const lengthM = spanNow();
  const slope = slopeNow();
  setCPurlinRoofSlopeDeg(slope);
  const result = compareMemberCandidates({
    selections,
    lengthM,
    loadKN,
    loadPositionM: lengthM / 2,
    boundary: 'simply-supported',
    deflectionDivisor: Number(deflectionSelect?.value) || 180
  });
  return { selections, lengthM, slope, loadKN, result };
}

function prepareSequence() {
  const unit = solveAtLoad(1);
  const sequence = unit.result.records
    .map((record) => ({
      id: record.comparisonId,
      label: record.comparisonLabel,
      thresholdKN: Number(record.physicalThresholdLoadKN)
    }))
    .filter((item) => Number.isFinite(item.thresholdKN) && item.thresholdKN > 0)
    .sort((a, b) => a.thresholdKN - b.thresholdKN);
  if (sequence.length !== unit.result.records.length) throw new Error('Every active C-purlin must have a finite first-yield threshold.');

  const snapshots = new Map();
  for (const item of sequence) {
    const solved = solveAtLoad(item.thresholdKN);
    const record = solved.result.records.find((entry) => entry.comparisonId === item.id);
    if (!record) throw new Error(`Could not resolve first-yield snapshot for ${item.label}.`);
    snapshots.set(item.id, record);
  }

  const first = sequence[0];
  const last = sequence[sequence.length - 1];
  // Keep the original first-yield dataset for backward compatibility and QA.
  panel.dataset.yieldTargetKn = String(first.thresholdKN);
  panel.dataset.yieldTargetKgf = String(first.thresholdKN * KGF_PER_KN);
  panel.dataset.governingMember = first.id;
  panel.dataset.allYieldTargetKn = String(last.thresholdKN);
  panel.dataset.allYieldTargetKgf = String(last.thresholdKN * KGF_PER_KN);
  panel.dataset.yieldSequence = sequence.map((item) => `${item.label}:${item.thresholdKN}`).join('|');
  return { sequence, snapshots, first, last };
}

function setSharedLoadKN(loadKN, dispatch = true) {
  const kgf = Math.max(0, Number(loadKN) || 0) * KGF_PER_KN;
  if (loadUnit.value !== 'kgf') {
    loadUnit.value = 'kgf';
    if (dispatch) loadUnit.dispatchEvent(new Event('change', { bubbles:true }));
  }
  loadInput.value = String(Number(kgf.toFixed(4)));
  if (dispatch) loadInput.dispatchEvent(new Event('input', { bubbles:true }));
}

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
    bg:'#f1ece1', lane:'#faf7ef', border:'#bcb3a4', text:'#26343a', muted:'#66747a',
    accent:'#2f796d', warning:'#9a6c20', danger:'#a94747', reference:'#a79d8c', bar:'#ddd5c7', formula:'#48565c'
  } : {
    bg:'#07141c', lane:'#0b1c25', border:'#27414d', text:'#f1f7f8', muted:'#9eb1ba',
    accent:'#63e0c6', warning:'#ffe08a', danger:'#ff7272', reference:'#617985', bar:'#223843', formula:'#b8c9d0'
  };
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawSupport(ctx, x, y, colors) {
  ctx.save();
  ctx.strokeStyle = colors.muted;
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

function drawCSection(ctx, x, y, size, degrees, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle = color;
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

function roofGeometry(lane, slopeDeg) {
  const theta = slopeDeg * Math.PI / 180;
  const maxWidth = Math.max(120, lane.width - 90);
  const maxRise = 118;
  const sin = Math.abs(Math.sin(theta));
  const length = sin > .001 ? Math.min(maxWidth, maxRise / sin) : maxWidth;
  const dx = Math.cos(theta) * length / 2;
  const dy = Math.sin(theta) * length / 2;
  const cx = lane.x + lane.width / 2;
  const cy = lane.y + 145;
  return {
    start:{ x:cx - dx, y:cy + dy },
    end:{ x:cx + dx, y:cy - dy },
    center:{ x:cx, y:cy },
    theta,
    length
  };
}

function pointOnRoof(geometry, t) {
  return {
    x: geometry.start.x + (geometry.end.x - geometry.start.x) * t,
    y: geometry.start.y + (geometry.end.y - geometry.start.y) * t
  };
}

function deflectionAtMid(record) {
  const series = record.result?.deflectionSeries ?? [];
  if (!series.length) return Math.abs(record.result?.maxDeflectionMm || 0);
  return Math.abs(series.reduce((best, point) => Math.abs(point.xM - (series.at(-1)?.xM || 0) / 2) < Math.abs(best.xM - (series.at(-1)?.xM || 0) / 2) ? point : best, series[0]).displacementMm || 0);
}

function drawVerticalContactArrow(ctx, x, topY, contactY, commonLoadKgf, progress, colors, compactLayout) {
  const safeContactY = Math.max(topY + 36, contactY);
  const arrowWidth = 3 + 6 * Math.min(1, progress);
  ctx.save();
  ctx.strokeStyle = colors.warning;
  ctx.fillStyle = colors.warning;
  ctx.lineWidth = arrowWidth;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, safeContactY - 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, safeContactY);
  ctx.lineTo(x - 10, safeContactY - 17);
  ctx.lineTo(x + 10, safeContactY - 17);
  ctx.closePath();
  ctx.fill();
  // Small contact pad: arrow tip and member share this same point.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 13, safeContactY + 1);
  ctx.lineTo(x + 13, safeContactY + 1);
  ctx.stroke();
  ctx.font = `800 ${compactLayout ? 12 : 15}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${compact(commonLoadKgf,1)} kgf`, x, topY - 8);
  ctx.restore();
  return safeContactY;
}

function numericFormulaLines(selection, record, loadKN, spanM, compactLayout) {
  const formula = centerPointFormulaSnapshot({ loadKN, lengthM:spanM, record });
  const props = record.properties ?? {};
  const E = Number(selection.material.elasticModulusMPa) || 0;
  const Pn = Number(formula.roofNormalKN) || 0;
  const Pp = Number(formula.roofParallelKN) || 0;
  if (formula.roofSlopeDeg > .001) {
    const n = record.result?.roofNormalResponse ?? {};
    const p = record.result?.roofParallelResponse ?? {};
    const zx = Number(props.zxMm3) || 0;
    const zy = Number(props.zyMm3) || 0;
    if (compactLayout) return [
      `P⊥=${compact(loadKN,3)}cos${compact(formula.roofSlopeDeg,1)}°=${compact(Pn,3)} kN; P∥=${compact(Pp,3)} kN`,
      `M⊥=${compact(n.maxMomentKNm,3)}; M∥=${compact(p.maxMomentKNm,3)} kN·m`,
      `σ=|M⊥|10⁶/${compact(zx,0)}+|M∥|10⁶/${compact(zy,0)}=${compact(formula.stressMPa,1)} MPa`,
      `δ⊥=${compact(n.maxDeflectionMm,2)}; δ∥=${compact(p.maxDeflectionMm,2)}; δglobal=${compact(formula.deflectionMm,2)} mm`
    ];
    return [
      `P⊥ = P cosθ = ${compact(loadKN,3)} cos ${compact(formula.roofSlopeDeg,1)}° = ${compact(Pn,3)} kN;  P∥ = ${compact(loadKN,3)} sin ${compact(formula.roofSlopeDeg,1)}° = ${compact(Pp,3)} kN`,
      `M⊥ = P⊥L/4 = ${compact(Pn,3)}×${compact(spanM,2)}/4 = ${compact(n.maxMomentKNm,3)} kN·m;  M∥ = ${compact(p.maxMomentKNm,3)} kN·m`,
      `σgross = |M⊥|10⁶/Zx + |M∥|10⁶/Zy = |${compact(n.maxMomentKNm,3)}|10⁶/${compact(zx,0)} + |${compact(p.maxMomentKNm,3)}|10⁶/${compact(zy,0)} = ${compact(formula.stressMPa,1)} MPa`,
      `δ⊥=${compact(n.maxDeflectionMm,2)} mm; δ∥=${compact(p.maxDeflectionMm,2)} mm; combined vertical δ=${compact(formula.deflectionMm,2)} mm · E=${compact(E,0)} MPa`
    ];
  }

  const Z = Number(props.zxMm3) || 0;
  const I = Number(props.ixMm4) || 0;
  const M = Number(formula.maxMomentKNm) || 0;
  if (compactLayout) return [
    `P=${compact(loadKN,3)} kN; L=${compact(spanM,2)} m; Z=${compact(Z,0)} mm³; I=${compact(I,0)} mm⁴`,
    `M=PL/4=${compact(loadKN,3)}×${compact(spanM,2)}/4=${compact(M,3)} kN·m`,
    `σ=M10⁶/Z=${compact(M,3)}×10⁶/${compact(Z,0)}=${compact(formula.stressMPa,1)} MPa`,
    `δ=P·1000(L·1000)³/(48EI)=${compact(formula.deflectionMm,2)} mm`
  ];
  return [
    `P=${compact(loadKN,3)} kN (${compact(loadKN*KGF_PER_KN,1)} kgf), L=${compact(spanM,2)} m, Z=${compact(Z,0)} mm³, I=${compact(I,0)} mm⁴, E=${compact(E,0)} MPa`,
    `Mmax = PL/4 = ${compact(loadKN,3)}×${compact(spanM,2)}/4 = ${compact(M,3)} kN·m`,
    `σ = M×10⁶/Z = ${compact(M,3)}×10⁶/${compact(Z,0)} = ${compact(formula.stressMPa,1)} MPa`,
    `δmax = P·1000·(L·1000)³/(48EI) = ${compact(formula.deflectionMm,2)} mm`
  ];
}

function drawMemberLane(ctx, lane, selection, liveRecord, displayRecord, commonLoadKN, displayLoadKN, thresholdKN, scalePxPerMm, colors) {
  const compactLayout = lane.width < 430;
  const yielded = commonLoadKN >= thresholdKN * .999999;
  const accent = yielded ? colors.danger : colors.accent;
  drawRoundRect(ctx, lane.x, lane.y, lane.width, 430, 16, colors.lane, colors.border);

  ctx.textAlign = 'left';
  ctx.fillStyle = colors.text;
  ctx.font = `800 ${compactLayout ? 17 : 20}px system-ui, sans-serif`;
  ctx.fillText(`${selection.label} · section orientation ${selection.orientationDeg}°`, lane.x + 18, lane.y + 29);
  ctx.fillStyle = colors.muted;
  ctx.font = `${compactLayout ? 11 : 13}px system-ui, sans-serif`;
  const label = selection.preset.label.replace(/ —.*/, '');
  ctx.fillText(label.length > (compactLayout ? 38 : 58) ? `${label.slice(0, compactLayout ? 35 : 55)}…` : label, lane.x + 18, lane.y + 50);
  drawCSection(ctx, lane.x + lane.width - (compactLayout ? 44 : 57), lane.y + 40, compactLayout ? 38 : 48, selection.orientationDeg, accent);

  const geometry = roofGeometry(lane, slopeNow());
  ctx.strokeStyle = colors.reference;
  ctx.setLineDash([5,5]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(geometry.start.x, geometry.start.y);
  ctx.lineTo(geometry.end.x, geometry.end.y);
  ctx.stroke();
  ctx.setLineDash([]);
  drawSupport(ctx, geometry.start.x, geometry.start.y + 2, colors);
  drawSupport(ctx, geometry.end.x, geometry.end.y + 2, colors);

  const series = displayRecord.result?.deflectionSeries ?? [];
  ctx.strokeStyle = accent;
  ctx.lineWidth = compactLayout ? 4 : 5;
  ctx.beginPath();
  if (series.length) {
    const total = Math.max(.000001, spanNow());
    series.forEach((point, index) => {
      const t = Math.max(0, Math.min(1, Number(point.xM) / total));
      const base = pointOnRoof(geometry, t);
      const py = base.y + Math.abs(Number(point.displacementMm) || 0) * scalePxPerMm;
      if (index === 0) ctx.moveTo(base.x, py); else ctx.lineTo(base.x, py);
    });
  } else {
    ctx.moveTo(geometry.start.x, geometry.start.y);
    ctx.lineTo(geometry.end.x, geometry.end.y);
  }
  ctx.stroke();

  const midBase = pointOnRoof(geometry, .5);
  const midY = midBase.y + deflectionAtMid(displayRecord) * scalePxPerMm;
  const arrowTipY = drawVerticalContactArrow(ctx, midBase.x, lane.y + 72, midY, commonLoadKN * KGF_PER_KN, Math.min(1, commonLoadKN / thresholdKN), colors, compactLayout);

  const use = Math.min(1, Math.max(0, displayLoadKN / thresholdKN));
  const barX = lane.x + 18;
  const barY = lane.y + 230;
  const barW = lane.width - 36;
  ctx.fillStyle = colors.bar;
  ctx.fillRect(barX, barY, barW, 12);
  ctx.fillStyle = yielded ? colors.danger : use >= .8 ? colors.warning : colors.accent;
  ctx.fillRect(barX, barY, Math.min(1,use) * barW, 12);
  ctx.fillStyle = yielded ? colors.danger : colors.text;
  ctx.font = `800 ${compactLayout ? 11 : 13}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  const status = yielded
    ? `YIELDED at ${compact(thresholdKN*KGF_PER_KN,1)} kgf · lane frozen at first yield`
    : use >= .8 ? `NEAR YIELD · ${compact(use*100,1)}% of Fy` : `ELASTIC · ${compact(use*100,1)}% of first-yield load`;
  ctx.fillText(status, barX, barY + 32);

  ctx.fillStyle = colors.formula;
  ctx.font = `${compactLayout ? 10 : 12}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  const lines = numericFormulaLines(selection, displayRecord, displayLoadKN, spanNow(), compactLayout);
  const lineY = lane.y + 292;
  lines.forEach((line, index) => ctx.fillText(line, barX, lineY + index * 24));

  return {
    id:selection.id,
    startY:geometry.start.y,
    endY:geometry.end.y,
    midY,
    arrowTipY,
    yielded,
    thresholdKN
  };
}

function drawFrame(sequenceState, commonLoadKN) {
  const canvas = sequenceState.canvas;
  const ctx = canvas.getContext('2d');
  const colors = palette();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const solved = solveAtLoad(commonLoadKN);
  const count = solved.selections.length;
  const yieldedCount = sequenceState.sequence.filter((item) => commonLoadKN >= item.thresholdKN * .999999).length;
  ctx.textAlign = 'left';
  ctx.fillStyle = colors.warning;
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.fillText('FUTOLTECH ENGINEERING AND PROJECT SYSTEMS',40,36);
  ctx.fillStyle = colors.text;
  ctx.font = '900 26px system-ui, sans-serif';
  ctx.fillText(`C-PURLIN PHYSICS TEST BENCH · ${count}-MEMBER LOAD-TO-YIELD COMPARISON`,40,70);
  ctx.fillStyle = colors.muted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('ONE TEST ENVIRONMENT → same span, roof slope, global vertical center load and animation timing',40,96);
  ctx.fillText('A yielded lane freezes at its first-yield elastic state; stronger lanes continue. No post-yield behavior is invented.',40,118);

  ctx.textAlign = 'right';
  ctx.fillStyle = yieldedCount ? colors.danger : colors.warning;
  ctx.font = '900 31px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(commonLoadKN*KGF_PER_KN,1)} kgf`,canvas.width-40,65);
  ctx.fillStyle = colors.muted;
  ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`${compact(commonLoadKN,3)} kN · ${yieldedCount}/${count} yielded`,canvas.width-40,91);

  const maxYieldDeflection = Math.max(.01, ...sequenceState.sequence.map((item) => Math.abs(sequenceState.snapshots.get(item.id)?.result?.maxDeflectionMm || 0)));
  const pxPerMm = Math.min(52/maxYieldDeflection,18);
  const gap = count === 3 ? 22 : 50;
  const laneAreaWidth = canvas.width - 80;
  const laneWidth = (laneAreaWidth - gap*(count-1))/count;
  const lanes = Array.from({length:count},(_,i)=>({x:40+i*(laneWidth+gap),y:145,width:laneWidth}));
  const thresholdById = new Map(sequenceState.sequence.map((item)=>[item.id,item.thresholdKN]));
  const geometries = [];

  solved.result.records.forEach((liveRecord,index)=>{
    const selection = solved.selections[index];
    const thresholdKN = thresholdById.get(liveRecord.comparisonId);
    const yielded = commonLoadKN >= thresholdKN * .999999;
    const displayRecord = yielded ? sequenceState.snapshots.get(liveRecord.comparisonId) : liveRecord;
    const displayLoadKN = yielded ? thresholdKN : commonLoadKN;
    geometries.push(drawMemberLane(ctx,lanes[index],selection,liveRecord,displayRecord,commonLoadKN,displayLoadKN,thresholdKN,pxPerMm,colors));
  });

  ctx.textAlign='left';
  ctx.fillStyle=colors.formula;
  ctx.font='14px ui-monospace, SFMono-Regular, Consolas, monospace';
  const sequenceText = sequenceState.sequence.map((item,i)=>`${i+1}. ${item.label} ${compact(item.thresholdKN*KGF_PER_KN,1)} kgf`).join('   →   ');
  ctx.fillText(`Yield sequence: ${sequenceText}`,40,605);
  ctx.fillText(`Shared span=${compact(spanNow(),2)} m · shared roof slope=${compact(slopeNow(),1)}° · vertical P at L/2 · final all-yield load=${compact(sequenceState.last.thresholdKN*KGF_PER_KN,1)} kgf`,40,632);
  ctx.fillText('Live equations use the solver record at the shown state. Yielded lanes are held at first yield while common load continues.',40,659);
  ctx.fillStyle=colors.muted;
  ctx.font='13px system-ui, sans-serif';
  ctx.fillText('SCREENING: effective width, local/distortional/LTB, weld/tek-screw stiffness, diaphragm action and post-yield failure remain outside this model.',40,689);

  panel.dataset.activeMembers=String(count);
  window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__={
    loadKN:commonLoadKN,
    loadKgf:commonLoadKN*KGF_PER_KN,
    spanM:spanNow(),
    roofSlopeDeg:slopeNow(),
    memberIds:solved.selections.map((selection)=>selection.id),
    memberLoadsKN:solved.selections.map(()=>commonLoadKN),
    yieldedCount,
    finalTargetKN:sequenceState.last.thresholdKN,
    memberGeometry:geometries
  };
  return { solved, yieldedCount };
}

function updateReadouts(state, loadKN, progress) {
  const yielded = state.sequence.filter((item)=>loadKN>=item.thresholdKN*.999999);
  panel.querySelector('[data-cpy-load]').textContent=`${compact(loadKN*KGF_PER_KN,1)} kgf`;
  panel.querySelector('[data-cpy-kn]').textContent=`${compact(loadKN,3)} kN`;
  const target = panel.querySelector('[data-cpy-target]');
  const targetBox = target?.parentElement;
  const small = targetBox?.querySelector('small');
  if (small) small.textContent='Yield sequence';
  if (target) target.textContent=state.sequence.map((item)=>`${item.label.replace('Member ','')}:${compact(item.thresholdKN*KGF_PER_KN,1)}`).join(' → ')+' kgf';
  const governing = panel.querySelector('[data-cpy-governing]');
  if (governing) governing.textContent=`final all-yield: ${compact(state.last.thresholdKN*KGF_PER_KN,1)} kgf`;
  panel.querySelector('[data-cpy-progress]').textContent=`${compact(progress*100,0)}%`;
  panel.querySelector('[data-cpy-active]').textContent=`${state.sequence.length} members`;
  const status = panel.querySelector('[data-cpy-status]');
  if (status) {
    if (yielded.length === state.sequence.length) status.textContent='ALL ACTIVE MEMBERS REACHED FIRST YIELD';
    else if (yielded.length) status.textContent=`${yielded.map((item)=>item.label).join(' + ')} YIELDED · CONTINUING`;
    else if (progress>.8) status.textContent='APPROACHING FIRST YIELD';
    else if (progress>0) status.textContent='ELASTIC LOADING';
    else status.textContent='READY';
  }
}

function preferredVideoMime() {
  if (typeof MediaRecorder==='undefined') return null;
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find((type)=>MediaRecorder.isTypeSupported?.(type)) ?? 'video/webm';
}

function startRecording(state) {
  const canvas=state.canvas;
  if (!canvas.captureStream || typeof MediaRecorder==='undefined') throw new Error('This browser does not support canvas video recording. Use a current Chromium/Chrome browser.');
  const mimeType=preferredVideoMime();
  const recorder=new MediaRecorder(canvas.captureStream(30),mimeType?{mimeType,videoBitsPerSecond:6_000_000}:undefined);
  state.chunks=[];
  recorder.addEventListener('dataavailable',(event)=>{if(event.data?.size)state.chunks.push(event.data);});
  recorder.addEventListener('stop',()=>{
    const blob=new Blob(state.chunks,{type:recorder.mimeType||'video/webm'});
    if (!blob.size) return;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`futoltech-c-purlin-load-to-yield-${Date.now()}.webm`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    panel.querySelector('[data-cpy-record]').textContent='RECORD + DOWNLOAD VIDEO';
  });
  recorder.start(250);
  state.recorder=recorder;
  panel.querySelector('[data-cpy-record]').textContent='RECORDING…';
}

function stopRecording(state) {
  if (state.recorder?.state==='recording' || state.recorder?.state==='paused') state.recorder.stop();
  state.recorder=null;
}

function setRunningControls(disabled) {
  panel.querySelectorAll('[data-cpy-span-range],[data-cpy-span-number],[data-cpy-slope-range],[data-cpy-slope-number],[data-cpy-duration],[data-cpy-third],[data-cpy-default]').forEach((node)=>{node.disabled=disabled;});
}

function mount() {
  if (!panel || !loadInput || !loadUnit || panel.dataset.physicsPolishV3==='true') return;
  panel.dataset.physicsPolishV3='true';
  const legacyCanvas=panel.querySelector('[data-cpy-canvas]');
  if (!legacyCanvas) return;
  legacyCanvas.hidden=true;
  legacyCanvas.setAttribute('aria-hidden','true');

  const canvas=document.createElement('canvas');
  canvas.width=1280;canvas.height=720;
  canvas.dataset.cpyPolishedCanvas='true';
  canvas.setAttribute('aria-label','Polished animated C-purlin load-to-yield comparison');
  canvas.style.cssText='display:block;width:100%;aspect-ratio:16/9;margin-top:.7rem;border:1px solid var(--border);border-radius:12px;';
  legacyCanvas.insertAdjacentElement('beforebegin',canvas);

  panel.querySelector('.c-purlin-physics-bench__head h3').textContent='Live C-Purlin Load-to-Yield Comparison';
  panel.querySelector('[data-cpy-start]').textContent='START TEST · 0 → ALL YIELDS';
  const note=panel.querySelector('.c-purlin-physics-bench__note');
  note.innerHTML='<strong>Engineering boundary:</strong> one shared quasi-static center load continues until every active specimen reaches its own gross-section first-yield reference. When a member yields, that lane freezes at first yield while stronger members continue; no post-yield response is invented. Actual context remains roof sheet <strong>tek-screwed</strong> to C-purlin and C-purlin <strong>welded to rafters</strong>, but connection restraint is not credited as perfect fixity. Local/distortional/LTB, effective width, connection behavior and post-yield failure require later validated physics.';

  const state={canvas,playing:false,paused:false,raf:null,startStamp:null,pauseStamp:null,pausedMs:0,lastRender:0,lastShared:0,recorder:null,chunks:[],sequence:[],snapshots:new Map(),first:null,last:null};

  function prepare() {
    const prepared=prepareSequence();
    Object.assign(state,prepared);
    return state;
  }

  function redrawIdle() {
    if (state.playing) return;
    try {
      prepare();
      drawFrame(state,0);
      updateReadouts(state,0,0);
    } catch (error) {
      const banner=panel.querySelector('[data-cpy-error]');
      if (banner) {banner.hidden=false;banner.textContent=error.message||String(error);}
    }
  }

  function stop(resetText=true) {
    state.playing=false;state.paused=false;
    if(state.raf)cancelAnimationFrame(state.raf);
    state.raf=null;
    setRunningControls(false);
    if(resetText)panel.querySelector('[data-cpy-start]').textContent='START TEST · 0 → ALL YIELDS';
    panel.querySelector('[data-cpy-pause]').textContent='PAUSE';
  }

  function finish() {
    const finalLoad=state.last.thresholdKN;
    setSharedLoadKN(finalLoad,true);
    drawFrame(state,finalLoad);
    updateReadouts(state,finalLoad,1);
    stop(true);
    if(state.recorder)setTimeout(()=>stopRecording(state),450);
  }

  function tick(stamp) {
    if(!state.playing)return;
    if(state.paused){state.raf=requestAnimationFrame(tick);return;}
    if(state.startStamp==null)state.startStamp=stamp;
    const elapsed=Math.max(0,stamp-state.startStamp-state.pausedMs);
    const linear=Math.min(1,elapsed/(durationNow()*1000));
    const progress=dramaticProgress(linear);
    const loadKN=state.last.thresholdKN*progress;
    if(stamp-state.lastRender>=FRAME_INTERVAL_MS||linear>=1){
      state.lastRender=stamp;
      drawFrame(state,loadKN);
      updateReadouts(state,loadKN,progress);
      if(stamp-state.lastShared>=100||linear>=1){state.lastShared=stamp;setSharedLoadKN(loadKN,true);}
      if(linear>=1){finish();return;}
    }
    state.raf=requestAnimationFrame(tick);
  }

  function start(recordVideo=false) {
    try {
      if(state.playing)stop(false);
      prepare();
      state.playing=true;state.paused=false;state.startStamp=null;state.pausedMs=0;state.lastRender=0;state.lastShared=0;
      setRunningControls(true);
      setSharedLoadKN(0,true);
      drawFrame(state,0);updateReadouts(state,0,0);
      if(recordVideo)startRecording(state);
      panel.querySelector('[data-cpy-start]').textContent='TEST RUNNING…';
      state.raf=requestAnimationFrame(tick);
    } catch(error){
      stopRecording(state);stop(true);
      const banner=panel.querySelector('[data-cpy-error]');if(banner){banner.hidden=false;banner.textContent=error.message||String(error);}
    }
  }

  function intercept(selector,handler){
    panel.querySelector(selector)?.addEventListener('click',(event)=>{event.preventDefault();event.stopImmediatePropagation();handler(event);},true);
  }
  intercept('[data-cpy-start]',()=>start(false));
  intercept('[data-cpy-record]',()=>start(true));
  intercept('[data-cpy-pause]',()=>{
    if(!state.playing)return;
    state.paused=!state.paused;
    const button=panel.querySelector('[data-cpy-pause]');
    if(state.paused){state.pauseStamp=performance.now();if(state.recorder?.state==='recording')state.recorder.pause();button.textContent='RESUME';}
    else{if(state.pauseStamp!=null)state.pausedMs+=performance.now()-state.pauseStamp;state.pauseStamp=null;if(state.recorder?.state==='paused')state.recorder.resume();button.textContent='PAUSE';}
  });
  intercept('[data-cpy-reset]',()=>{stop(true);stopRecording(state);setSharedLoadKN(0,true);redrawIdle();});

  const watched='[data-cpy-span-range],[data-cpy-span-number],[data-cpy-slope-range],[data-cpy-slope-number],[data-cpy-third]';
  panel.addEventListener('input',(event)=>{if(event.target?.matches?.(watched))requestAnimationFrame(redrawIdle);});
  panel.addEventListener('change',(event)=>{if(event.target?.matches?.(watched))requestAnimationFrame(redrawIdle);});
  document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change',()=>setTimeout(redrawIdle,80));
  window.addEventListener('ft-theme-change',()=>requestAnimationFrame(redrawIdle));

  window.__FT_C_PURLIN_PHYSICS_POLISH_V3__={redraw:redrawIdle,getState:()=>({firstYieldKN:state.first?.thresholdKN||0,allYieldKN:state.last?.thresholdKN||0,sequence:state.sequence.map((item)=>({...item}))})};
  redrawIdle();
}

mount();
