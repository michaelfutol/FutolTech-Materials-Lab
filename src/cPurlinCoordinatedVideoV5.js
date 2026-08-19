import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { compareMemberCandidates } from './solver/memberComparison.js';
import { setCPurlinRoofSlopeDeg } from './solver/sectionRecommender.js';
import { KGF_PER_KN, centerPointFormulaSnapshot } from './solver/cPurlinYieldDemo.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const panel = document.querySelector('[data-c-purlin-physics-bench]');
const deflectionSelect = document.getElementById('compareDeflectionSelect');

function compact(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function themeKey() {
  return document.documentElement.dataset.ftTheme === 'paper-matte' ? 'paper-matte' : 'lab-dark';
}

function palette() {
  return themeKey() === 'paper-matte' ? {
    bg:'#f1ece1', lane:'#faf7ef', border:'#bcb3a4', text:'#26343a', muted:'#66747a',
    accent:'#2f796d', warning:'#9a6c20', danger:'#a94747', reference:'#9b927f', bar:'#ddd5c7', formula:'#48565c', rafter:'#6d6254'
  } : {
    bg:'#07141c', lane:'#0b1c25', border:'#27414d', text:'#f1f7f8', muted:'#9eb1ba',
    accent:'#63e0c6', warning:'#ffe08a', danger:'#ff7272', reference:'#617985', bar:'#223843', formula:'#b8c9d0', rafter:'#aab8be'
  };
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
  return activeCards().map((card) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    const slot = Number(presetSelect?.dataset.slotPreset);
    const material = materialById(materialSelect?.value);
    const preset = material ? presetById(material, presetSelect?.value) : null;
    if (!material || !preset || preset.productCategory !== 'c-purlin') throw new Error('Every active C-purlin video specimen must be a C-purlin.');
    const orientation = orientationSelect?.value === 'rotated' ? 'rotated' : 'listed';
    const display = card.querySelector('[data-c-purlin-orientation-display]');
    const orientationDeg = Number(display?.value ?? (orientation === 'rotated' ? 90 : 0));
    return {
      id:`member-${String.fromCharCode(97 + slot)}`,
      label:`Member ${String.fromCharCode(65 + slot)}`,
      material,
      preset,
      orientation,
      orientationDeg:Number.isFinite(orientationDeg) ? orientationDeg : 0
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

function solveAtLoad(loadKN) {
  const selections = currentSelections();
  const lengthM = spanNow();
  const slope = slopeNow();
  setCPurlinRoofSlopeDeg(slope);
  const result = compareMemberCandidates({
    selections,
    lengthM,
    loadKN:Math.max(0, Number(loadKN) || 0),
    loadPositionM:lengthM / 2,
    boundary:'simply-supported',
    deflectionDivisor:Number(deflectionSelect?.value) || 180
  });
  return { selections, result, lengthM, slope };
}

function sequenceState() {
  const state = window.__FT_C_PURLIN_PHYSICS_POLISH_V3__?.getState?.();
  return state?.sequence?.length ? state : null;
}

function recordForLoad(solved, id) {
  return solved.result.records.find((record) => record.comparisonId === id) ?? null;
}

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawCSection(ctx, x, y, size, degrees, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(5, size * .13);
  ctx.lineCap = 'round';
  const h = size, b = size * .48, lip = size * .18;
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

function drawTransverseRafter(ctx, x, y, colors, side) {
  ctx.save();
  ctx.strokeStyle = colors.rafter;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(x, y + 30);
  ctx.stroke();
  ctx.fillStyle = colors.muted;
  ctx.font = '10px system-ui,sans-serif';
  ctx.textAlign = side === 'left' ? 'left' : 'right';
  ctx.fillText('RAFTER', x + (side === 'left' ? 7 : -7), y + 43);
  ctx.restore();
  return { x1:x, y1:y - 30, x2:x, y2:y + 30 };
}

function deflectionAtMid(record) {
  const series = record.result?.deflectionSeries ?? [];
  if (!series.length) return Math.abs(record.result?.maxDeflectionMm || 0);
  const half = (series.at(-1)?.xM || 0) / 2;
  return Math.abs(series.reduce((best, point) => Math.abs(point.xM - half) < Math.abs(best.xM - half) ? point : best, series[0]).displacementMm || 0);
}

function drawContactArrow(ctx, x, topY, contactY, displayLoadKgf, ratio, colors, compactLayout) {
  const safe = Math.max(topY + 38, contactY);
  ctx.save();
  ctx.strokeStyle = colors.warning;
  ctx.fillStyle = colors.warning;
  ctx.lineWidth = 3 + 6 * Math.min(1, ratio);
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.lineTo(x, safe - 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, safe);
  ctx.lineTo(x - 10, safe - 17);
  ctx.lineTo(x + 10, safe - 17);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 13, safe + 1);
  ctx.lineTo(x + 13, safe + 1);
  ctx.stroke();
  ctx.font = `800 ${compactLayout ? 12 : 15}px ui-monospace,SFMono-Regular,Consolas,monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`${compact(displayLoadKgf, 1)} kgf`, x, topY - 8);
  ctx.restore();
  return safe;
}

function formulaLines(selection, record, loadKN, spanM, compactLayout) {
  const formula = centerPointFormulaSnapshot({ loadKN, lengthM:spanM, record });
  const props = record.properties ?? {};
  const E = Number(selection.material.elasticModulusMPa) || 0;
  if (formula.roofSlopeDeg > .001) {
    const normal = record.result?.roofNormalResponse ?? {};
    const parallel = record.result?.roofParallelResponse ?? {};
    const zx = Number(props.zxMm3) || 0;
    const zy = Number(props.zyMm3) || 0;
    if (compactLayout) return [
      `P⊥=${compact(loadKN,3)}cos${compact(formula.roofSlopeDeg,1)}°=${compact(formula.roofNormalKN,3)} kN; P∥=${compact(formula.roofParallelKN,3)} kN`,
      `M⊥=${compact(normal.maxMomentKNm,3)}; M∥=${compact(parallel.maxMomentKNm,3)} kN·m`,
      `σ=|M⊥|10⁶/${compact(zx,0)}+|M∥|10⁶/${compact(zy,0)}=${compact(formula.stressMPa,1)} MPa`,
      `δglobal=${compact(formula.deflectionMm,2)} mm`
    ];
    return [
      `P⊥=P cosθ=${compact(loadKN,3)} cos ${compact(formula.roofSlopeDeg,1)}°=${compact(formula.roofNormalKN,3)} kN; P∥=${compact(formula.roofParallelKN,3)} kN`,
      `M⊥=P⊥L/4=${compact(normal.maxMomentKNm,3)} kN·m; M∥=${compact(parallel.maxMomentKNm,3)} kN·m`,
      `σgross=|M⊥|10⁶/Zx+|M∥|10⁶/Zy=${compact(formula.stressMPa,1)} MPa`,
      `δglobal=${compact(formula.deflectionMm,2)} mm · E=${compact(E,0)} MPa`
    ];
  }
  const Z = Number(props.zxMm3) || 0;
  const I = Number(props.ixMm4) || 0;
  const M = Number(formula.maxMomentKNm) || 0;
  return [
    `P=${compact(loadKN,3)} kN (${compact(loadKN * KGF_PER_KN,1)} kgf), L=${compact(spanM,2)} m`,
    `Mmax=PL/4=${compact(M,3)} kN·m`,
    `σ=M×10⁶/Z=${compact(M,3)}×10⁶/${compact(Z,0)}=${compact(formula.stressMPa,1)} MPa`,
    `δ=P·1000(L·1000)³/(48EI)=${compact(formula.deflectionMm,2)} mm · I=${compact(I,0)} mm⁴`
  ];
}

function draw(canvas, sharedLoadKN) {
  const state = sequenceState();
  if (!state) return null;
  const current = solveAtLoad(sharedLoadKN);
  const colors = palette();
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  const count = current.selections.length;
  const thresholdById = new Map(state.sequence.map((item) => [item.id, Number(item.thresholdKN)]));
  const yieldedCount = state.sequence.filter((item) => sharedLoadKN >= Number(item.thresholdKN) * .999999).length;

  ctx.textAlign = 'left';
  ctx.fillStyle = colors.warning;
  ctx.font = '800 16px system-ui,sans-serif';
  ctx.fillText('FUTOLTECH ENGINEERING AND PROJECT SYSTEMS', 36, 34);
  ctx.fillStyle = colors.text;
  ctx.font = '900 24px system-ui,sans-serif';
  ctx.fillText(`LONGITUDINAL C-PURLIN LOAD / DEFLECTION ANIMATION · ${count} MEMBERS`, 36, 66);
  ctx.fillStyle = colors.muted;
  ctx.font = '13px system-ui,sans-serif';
  ctx.fillText('Shared load rises for all members; each lane freezes at its own first-yield load while stronger members continue.', 36, 91);

  ctx.textAlign = 'right';
  ctx.fillStyle = yieldedCount ? colors.danger : colors.warning;
  ctx.font = '900 30px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`${compact(sharedLoadKN * KGF_PER_KN,1)} kgf`, width - 36, 58);
  ctx.fillStyle = colors.muted;
  ctx.font = '13px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`${compact(sharedLoadKN,3)} kN · ${yieldedCount}/${count} yielded · ${themeKey() === 'paper-matte' ? 'PaperMatte' : 'Lab Dark'}`, width - 36, 82);

  const thresholdRecords = state.sequence
    .map((item) => recordForLoad(solveAtLoad(Number(item.thresholdKN)), item.id))
    .filter(Boolean);
  const maxYieldDeflection = Math.max(.01, ...thresholdRecords.map((record) => Math.abs(record.result?.maxDeflectionMm || 0)));
  const pxPerMm = Math.min(54 / maxYieldDeflection, 18);
  const gap = count === 3 ? 22 : 50;
  const totalWidth = width - 72;
  const laneWidth = (totalWidth - gap * (count - 1)) / count;
  const lanes = Array.from({ length:count }, (_, index) => ({ x:36 + index * (laneWidth + gap), y:125, width:laneWidth }));
  const members = [];

  current.selections.forEach((selection, index) => {
    const lane = lanes[index];
    const thresholdKN = thresholdById.get(selection.id);
    if (!Number.isFinite(thresholdKN) || thresholdKN <= 0) return;
    const yielded = sharedLoadKN >= thresholdKN * .999999;
    const displayLoadKN = yielded ? thresholdKN : sharedLoadKN;
    const displaySolved = yielded ? solveAtLoad(thresholdKN) : current;
    const record = recordForLoad(displaySolved, selection.id);
    if (!record) return;

    const displayLoadKgf = displayLoadKN * KGF_PER_KN;
    const compactLayout = lane.width < 430;
    const accent = yielded ? colors.danger : colors.accent;
    drawRoundRect(ctx, lane.x, lane.y, lane.width, 440, 15, colors.lane, colors.border);
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.text;
    ctx.font = `800 ${compactLayout ? 16 : 19}px system-ui,sans-serif`;
    ctx.fillText(`${selection.label} · orientation ${selection.orientationDeg}°`, lane.x + 16, lane.y + 27);
    ctx.fillStyle = colors.muted;
    ctx.font = `${compactLayout ? 10 : 12}px system-ui,sans-serif`;
    const label = selection.preset.label.replace(/ —.*/, '');
    ctx.fillText(label.length > (compactLayout ? 38 : 58) ? `${label.slice(0, compactLayout ? 35 : 55)}…` : label, lane.x + 16, lane.y + 48);
    drawCSection(ctx, lane.x + lane.width - (compactLayout ? 42 : 55), lane.y + 38, compactLayout ? 36 : 46, selection.orientationDeg, accent);

    const x0 = lane.x + 24, x1 = lane.x + lane.width - 24, baselineY = lane.y + 150;
    const centerX = (x0 + x1) / 2;
    ctx.strokeStyle = colors.reference;
    ctx.setLineDash([5,5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, baselineY);
    ctx.lineTo(x1, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);
    const leftRafter = drawTransverseRafter(ctx, x0, baselineY, colors, 'left');
    const rightRafter = drawTransverseRafter(ctx, x1, baselineY, colors, 'right');

    const series = record.result?.deflectionSeries ?? [];
    ctx.strokeStyle = accent;
    ctx.lineWidth = compactLayout ? 4 : 5;
    ctx.beginPath();
    if (series.length) {
      const total = Math.max(.000001, spanNow());
      series.forEach((point, seriesIndex) => {
        const t = Math.max(0, Math.min(1, Number(point.xM) / total));
        const x = x0 + (x1 - x0) * t;
        const y = baselineY + Math.abs(Number(point.displacementMm) || 0) * pxPerMm;
        if (seriesIndex === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
    } else {
      ctx.moveTo(x0, baselineY);
      ctx.lineTo(x1, baselineY);
    }
    ctx.stroke();

    const midY = baselineY + deflectionAtMid(record) * pxPerMm;
    const arrowTipY = drawContactArrow(
      ctx,
      centerX,
      lane.y + 72,
      midY,
      displayLoadKgf,
      Math.min(1, displayLoadKN / thresholdKN),
      colors,
      compactLayout
    );

    const use = Math.min(1, Math.max(0, displayLoadKN / thresholdKN));
    const barX = lane.x + 16, barY = lane.y + 236, barW = lane.width - 32;
    ctx.fillStyle = colors.bar;
    ctx.fillRect(barX, barY, barW, 12);
    ctx.fillStyle = yielded ? colors.danger : use >= .8 ? colors.warning : colors.accent;
    ctx.fillRect(barX, barY, use * barW, 12);
    ctx.fillStyle = yielded ? colors.danger : colors.text;
    ctx.font = `800 ${compactLayout ? 10 : 12}px ui-monospace,SFMono-Regular,Consolas,monospace`;
    ctx.fillText(
      yielded
        ? `YIELDED at ${compact(displayLoadKgf,1)} kgf · lane frozen at its own first-yield state`
        : use >= .8 ? `NEAR YIELD · ${compact(use * 100,1)}%` : `ELASTIC · ${compact(use * 100,1)}% of first-yield load`,
      barX,
      barY + 31
    );

    ctx.fillStyle = colors.formula;
    ctx.font = `${compactLayout ? 9 : 11}px ui-monospace,SFMono-Regular,Consolas,monospace`;
    formulaLines(selection, record, displayLoadKN, spanNow(), compactLayout)
      .forEach((line, lineIndex) => ctx.fillText(line, barX, lane.y + 306 + lineIndex * 23));

    members.push({
      id:selection.id,
      label:selection.label,
      orientationDeg:selection.orientationDeg,
      yielded,
      thresholdKN,
      thresholdKgf:thresholdKN * KGF_PER_KN,
      sharedLoadKN,
      sharedLoadKgf:sharedLoadKN * KGF_PER_KN,
      displayLoadKN,
      displayLoadKgf,
      midY,
      arrowTipY,
      startY:baselineY,
      endY:baselineY,
      leftRafter,
      rightRafter
    });
  });

  ctx.textAlign = 'left';
  ctx.fillStyle = colors.formula;
  ctx.font = '13px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`Shared purlin span=${compact(spanNow(),2)} m · roof slope=${compact(slopeNow(),1)}° · vertical point load at L/2`, 36, 602);
  const sequenceText = state.sequence.map((item, index) => `${index + 1}. ${item.label} ${compact(Number(item.thresholdKN) * KGF_PER_KN,1)} kgf`).join('   →   ');
  ctx.fillText(`Yield sequence: ${sequenceText}`, 36, 629);
  ctx.fillText('Important: the number above each arrow is that member’s current/frozen load state; the top-right number is the shared applied load.', 36, 656);
  ctx.fillStyle = colors.muted;
  ctx.font = '12px system-ui,sans-serif';
  ctx.fillText('SCREENING: effective width, local/distortional/LTB, weld/tek-screw stiffness, diaphragm action and post-yield failure remain outside this model.', 36, 685);

  const publicState = {
    theme:themeKey(),
    sharedLoadKN,
    sharedLoadKgf:sharedLoadKN * KGF_PER_KN,
    spanM:spanNow(),
    roofSlopeDeg:slopeNow(),
    yieldedCount,
    members
  };
  window.__FT_C_PURLIN_COORDINATED_VIDEO_V5_STATE__ = publicState;
  return publicState;
}

function preferredMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    .find((type) => MediaRecorder.isTypeSupported?.(type)) ?? 'video/webm';
}

function startRecording(canvas, button) {
  if (!canvas.captureStream || typeof MediaRecorder === 'undefined') throw new Error('This browser does not support canvas video recording.');
  const recordingTheme = themeKey();
  const mimeType = preferredMime();
  const recorder = new MediaRecorder(canvas.captureStream(30), mimeType ? { mimeType, videoBitsPerSecond:6_000_000 } : undefined);
  const chunks = [];
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
  recorder.addEventListener('stop', () => {
    const blob = new Blob(chunks, { type:recorder.mimeType || 'video/webm' });
    if (!blob.size) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `futoltech-c-purlin-${recordingTheme}-load-to-yield-${Date.now()}.webm`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    button.textContent = 'RECORD + DOWNLOAD VIDEO';
    panel.dataset.lastRecordedTheme = recordingTheme;
    panel.dataset.lastRecordedBytes = String(blob.size);
  });
  recorder.start(250);
  button.textContent = `RECORDING ${recordingTheme === 'paper-matte' ? 'PAPERMATTE' : 'LAB DARK'}…`;
  panel.dataset.recordingTheme = recordingTheme;
  return recorder;
}

function mount() {
  if (!panel || panel.dataset.coordinatedVideoV5 === 'true') return;
  const staticCanvas = panel.querySelector('[data-cpy-static-setup-canvas]');
  const v4Canvas = panel.querySelector('[data-cpy-longitudinal-canvas]');
  if (!staticCanvas || !v4Canvas) return;
  panel.dataset.coordinatedVideoV5 = 'true';

  const style = document.createElement('style');
  style.id = 'ft-cp-coordinated-video-v5';
  style.textContent = `
    .c-purlin-physics-bench [data-cpy-longitudinal-canvas]{display:none!important}
    .c-purlin-physics-bench [data-cpy-coordinated-canvas]{display:block!important;width:100%;height:auto;aspect-ratio:16/9;margin-top:.7rem;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
  `;
  document.head.appendChild(style);
  v4Canvas.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  canvas.dataset.cpyCoordinatedCanvas = 'true';
  canvas.setAttribute('aria-label', 'Coordinated longitudinal C-purlin load-to-yield animation with per-member frozen yield loads');
  v4Canvas.insertAdjacentElement('afterend', canvas);

  let lastSignature = '';
  function signature() {
    const frame = window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__;
    const sequence = sequenceState()?.sequence ?? [];
    let selections = [];
    try { selections = currentSelections(); } catch {}
    return [
      themeKey(),
      Number(frame?.loadKN || 0).toFixed(6),
      spanNow(),
      slopeNow(),
      selections.map((selection) => `${selection.id}:${selection.orientationDeg}:${selection.preset.id}`).join('|'),
      sequence.map((item) => `${item.id}:${Number(item.thresholdKN).toFixed(6)}`).join('|')
    ].join('::');
  }

  function render(force = false) {
    const next = signature();
    if (!force && next === lastSignature) return window.__FT_C_PURLIN_COORDINATED_VIDEO_V5_STATE__ ?? null;
    lastSignature = next;
    const sharedLoadKN = Number(window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__?.loadKN || 0);
    try { return draw(canvas, sharedLoadKN); }
    catch (error) {
      const banner = panel.querySelector('[data-cpy-error]');
      if (banner) { banner.hidden = false; banner.textContent = error.message || String(error); }
      return null;
    }
  }

  function loop() {
    render(false);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.addEventListener('ft-theme-change', () => render(true));
  panel.addEventListener('input', () => setTimeout(() => render(true), 0));
  panel.addEventListener('change', () => setTimeout(() => render(true), 0));
  document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change', () => setTimeout(() => render(true), 100));

  const oldRecordButton = panel.querySelector('[data-cpy-record]');
  if (oldRecordButton) {
    const recordButton = oldRecordButton.cloneNode(true);
    oldRecordButton.replaceWith(recordButton);
    let recorder = null;
    recordButton.addEventListener('click', () => {
      try {
        if (recorder && recorder.state !== 'inactive') return;
        render(true);
        recorder = startRecording(canvas, recordButton);
        panel.querySelector('[data-cpy-start]')?.click();
        const watch = setInterval(() => {
          const status = panel.querySelector('[data-cpy-status]')?.textContent || '';
          if (/ALL ACTIVE MEMBERS REACHED FIRST YIELD/i.test(status)) {
            clearInterval(watch);
            setTimeout(() => {
              if (recorder?.state === 'recording' || recorder?.state === 'paused') recorder.stop();
              recorder = null;
            }, 450);
          }
        }, 100);
      } catch (error) {
        recordButton.textContent = 'RECORD + DOWNLOAD VIDEO';
        const banner = panel.querySelector('[data-cpy-error]');
        if (banner) { banner.hidden = false; banner.textContent = error.message || String(error); }
      }
    });
  }

  window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__ = {
    render: () => render(true),
    getState: () => window.__FT_C_PURLIN_COORDINATED_VIDEO_V5_STATE__ ?? null,
    canvas
  };
  render(true);
}

mount();
