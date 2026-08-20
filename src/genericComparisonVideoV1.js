import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { compareCompressionCandidates, compareMemberCandidates } from './solver/memberComparison.js';
import { comparisonSimulationFrame } from './solver/comparisonSimulation.js';
import { convertLoadToKN } from './utils/loadUnits.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const MIN_COMPRESSION_LOAD_KN = 1e-6;
const MOUNT_ATTEMPTS = 240;
const MOUNT_INTERVAL_MS = 50;

function compact(value, decimals = 2) {
  return Number.isFinite(value)
    ? Number(value).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
    : '—';
}

function numberValue(selector) {
  return Number(document.querySelector(selector)?.value);
}

function modeNow() {
  return document.getElementById('compareColumnModeButton')?.classList.contains('is-active') ? 'compression' : 'beam';
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? null;
}

function presetById(material, id) {
  return presetsForFamily(material.family).find((preset) => preset.id === id) ?? null;
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
        boundary: document.getElementById('compareBoundarySelect')?.value ?? 'simply-supported',
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
      boundary: document.getElementById('compareColumnBoundarySelect')?.value ?? 'pinned-pinned',
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
      loadKN: Math.max(0, loadKN),
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

function currentLoadKN() {
  try {
    return convertLoadToKN(Number(document.getElementById('compareLoadInput')?.value ?? 0), document.getElementById('compareLoadUnitSelect')?.value ?? 'kN');
  } catch {
    return 0;
  }
}

function currentPlaybackTimeS() {
  const text = document.querySelector('[data-comparison-playback] [data-cp-time]')?.textContent ?? '';
  const value = Number(text.match(/([\d.]+)\s*s/i)?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function themePalette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
    paper: true,
    bg: '#fffdf8',
    surface: '#f5ecdd',
    surface2: '#fffaf1',
    ink: '#172127',
    muted: '#46535a',
    grid: '#a5967d',
    line: '#176a60',
    load: '#8b4f00',
    fail: '#a22f2f',
    warn: '#7c5513',
    pass: '#176a60'
  } : {
    paper: false,
    bg: '#06151e',
    surface: '#0b202a',
    surface2: '#102934',
    ink: '#eef8fb',
    muted: '#a9c0ca',
    grid: '#48616d',
    line: '#5de0c5',
    load: '#ffd36a',
    fail: '#ff7676',
    warn: '#f2be4f',
    pass: '#5de0c5'
  };
}

function drawArrow(ctx, x, y1, y2, palette, label) {
  ctx.save();
  ctx.strokeStyle = palette.load;
  ctx.fillStyle = palette.load;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y2);
  ctx.lineTo(x - 10, y2 - 17);
  ctx.lineTo(x + 10, y2 - 17);
  ctx.closePath();
  ctx.fill();
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y1 - 10);
  ctx.restore();
}

function drawSupport(ctx, x, y, kind, palette) {
  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.fillStyle = palette.surface;
  ctx.lineWidth = 2;
  if (kind === 'fixed') {
    ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 24); ctx.stroke();
    for (let i = -20; i <= 20; i += 8) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x - 10, y + i + 6); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 20); ctx.lineTo(x + 12, y + 20); ctx.closePath(); ctx.stroke();
    if (kind === 'roller') {
      ctx.beginPath(); ctx.arc(x - 6, y + 25, 4, 0, Math.PI * 2); ctx.arc(x + 6, y + 25, 4, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}

function orientationById(definition) {
  return Object.fromEntries(definition.selections.map((selection) => [selection.id, selection.orientationDeg]));
}

function drawBeamLane(ctx, lane, definition, record, allRecords, loadKN, palette) {
  const x0 = lane.x + 28;
  const x1 = lane.x + lane.w - 28;
  const baselineY = lane.y + 205;
  const series = Array.isArray(record.result?.deflectionSeries) ? record.result.deflectionSeries : [];
  const maxDef = Math.max(0.001, ...allRecords.map((item) => Math.abs(item.result?.maxDeflectionMm ?? 0)));
  const scale = Math.min(70 / maxDef, 18);

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, baselineY); ctx.lineTo(x1, baselineY); ctx.stroke();
  ctx.setLineDash([]);

  if (series.length >= 2) {
    const lengthM = series.at(-1)?.xM || definition.lengthM || 1;
    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 5;
    ctx.beginPath();
    series.forEach((point, index) => {
      const x = x0 + (point.xM / lengthM) * (x1 - x0);
      const y = baselineY - point.displacementMm * scale;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const loadPosition = definition.conditions.loadPositionM;
    let nearest = series[0];
    for (const point of series) if (Math.abs(point.xM - loadPosition) < Math.abs(nearest.xM - loadPosition)) nearest = point;
    const loadX = x0 + (loadPosition / lengthM) * (x1 - x0);
    const loadY = baselineY - (nearest?.displacementMm ?? 0) * scale;
    drawArrow(ctx, loadX, lane.y + 105, loadY, palette, `${compact(loadKN * 101.9716, 1)} kgf`);
  }

  const boundary = definition.conditions.boundary;
  if (boundary === 'simply-supported') {
    drawSupport(ctx, x0, baselineY, 'pin', palette);
    drawSupport(ctx, x1, baselineY, 'roller', palette);
  } else if (boundary === 'cantilever-left') drawSupport(ctx, x0, baselineY, 'fixed', palette);
  else if (boundary === 'cantilever-right') drawSupport(ctx, x1, baselineY, 'fixed', palette);
  ctx.restore();
}

function drawCompressionLane(ctx, lane, definition, record, allRecords, loadKN, palette) {
  const centerX = lane.x + lane.w / 2;
  const topY = lane.y + 105;
  const bottomY = lane.y + 300;
  const maxShortening = Math.max(0.001, ...allRecords.map((item) => Math.abs(item.result?.shorteningMm ?? 0)));
  const shorteningScale = Math.min(52 / maxShortening, 22);
  const shortenedPx = Math.min(55, Math.abs(record.result?.shorteningMm ?? 0) * shorteningScale);
  const currentTop = topY + shortenedPx;

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.setLineDash([7, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(centerX, topY); ctx.lineTo(centerX, bottomY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(centerX, currentTop); ctx.lineTo(centerX, bottomY); ctx.stroke();

  const boundary = definition.conditions.boundary;
  const [bottomKind, topKind] = boundary === 'fixed-fixed' ? ['fixed', 'fixed']
    : boundary === 'fixed-pinned' ? ['fixed', 'pin']
      : boundary === 'fixed-free' ? ['fixed', 'free']
        : ['pin', 'pin'];
  if (bottomKind !== 'free') drawSupport(ctx, centerX, bottomY, bottomKind, palette);
  if (topKind !== 'free') {
    ctx.save(); ctx.translate(centerX * 2, currentTop * 2); ctx.rotate(Math.PI); ctx.translate(-centerX * 2, -currentTop * 2); ctx.restore();
  }

  const eccentricity = definition.conditions.eccentricityMm;
  const offsetPx = Math.max(-45, Math.min(45, eccentricity * 0.8));
  drawArrow(ctx, centerX + offsetPx, lane.y + 45, currentTop, palette, `${compact(loadKN * 101.9716, 1)} kgf`);
  if (Math.abs(eccentricity) > 0.01) {
    ctx.fillStyle = palette.muted;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`e = ${compact(eccentricity, 1)} mm`, centerX + offsetPx + 12, lane.y + 82);
  }
  ctx.restore();
}

function drawFrame(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const palette = themePalette();
  let definition;
  try { definition = currentDefinition(); } catch { return null; }
  const loadKN = currentLoadKN();
  let result;
  try { result = solveDefinition(definition, loadKN); } catch { return null; }
  const timeS = currentPlaybackTimeS();
  const frame = comparisonSimulationFrame({
    index: 0,
    progress: 0,
    timeS,
    loadKN: Math.max(0, loadKN),
    mode: definition.mode,
    result,
    orientationDegreesById: orientationById(definition)
  });

  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palette.ink;
  ctx.font = '900 29px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('FUTOLTECH ENGINEERING & PROJECT SYSTEMS', 44, 48);
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText(definition.mode === 'beam' ? 'GENERAL MATERIAL COMPARISON · BEAM LOAD TEST' : 'GENERAL MATERIAL COMPARISON · COMPRESSION LOAD TEST', 44, 82);
  ctx.fillStyle = palette.muted;
  ctx.font = '600 17px system-ui, sans-serif';
  ctx.fillText(`Shared length ${compact(definition.lengthM, 2)} m · load ${compact(loadKN, 3)} kN (${compact(loadKN * 101.9716, 1)} kgf) · t = ${compact(timeS, 2)} s`, 44, 108);

  const count = result.records.length;
  const gap = 18;
  const left = 36;
  const top = 132;
  const usable = canvas.width - left * 2;
  const laneW = (usable - gap * (count - 1)) / count;
  const laneH = 505;

  result.records.forEach((record, index) => {
    const lane = { x: left + index * (laneW + gap), y: top, w: laneW, h: laneH };
    const memberFrame = frame.members[index];
    ctx.fillStyle = palette.surface2;
    ctx.strokeStyle = memberFrame.status === 'FAIL' ? palette.fail : memberFrame.status === 'SCREENING' ? palette.warn : palette.grid;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(lane.x, lane.y, lane.w, lane.h, 16); ctx.fill(); ctx.stroke();

    ctx.fillStyle = palette.ink;
    ctx.font = '900 21px system-ui, sans-serif';
    ctx.fillText(`${record.comparisonLabel} · ${record.displayMaterialName ?? record.materialName}`, lane.x + 20, lane.y + 32);
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillStyle = palette.muted;
    const sectionName = String(record.sectionLabel ?? '').replace(/ —.*/, '');
    ctx.fillText(sectionName.slice(0, 48), lane.x + 20, lane.y + 57);
    ctx.fillText(`Orientation ${definition.selections[index]?.orientationDeg ?? 0}°`, lane.x + 20, lane.y + 80);

    if (definition.mode === 'beam') drawBeamLane(ctx, lane, definition, record, result.records, loadKN, palette);
    else drawCompressionLane(ctx, lane, definition, record, result.records, loadKN, palette);

    const eventY = lane.y + 345;
    ctx.fillStyle = memberFrame.status === 'FAIL' ? palette.fail : memberFrame.status === 'SCREENING' ? palette.warn : palette.pass;
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.fillText(memberFrame.event.label, lane.x + 20, eventY);
    ctx.fillStyle = palette.ink;
    ctx.font = '700 16px system-ui, sans-serif';
    if (definition.mode === 'beam') {
      ctx.fillText(`Mmax = ${compact(record.result.maxMomentKNm, 3)} kN·m`, lane.x + 20, eventY + 30);
      ctx.fillText(`δmax = ${compact(record.result.maxDeflectionMm, 2)} mm`, lane.x + 20, eventY + 55);
      ctx.fillText(`σb = ${compact(record.result.maxBendingStressMPa, 1)} MPa`, lane.x + 20, eventY + 80);
      ctx.fillText(`Deflection use = ${compact(record.deflectionRatio * 100, 1)}%`, lane.x + 20, eventY + 105);
    } else {
      ctx.fillText(`Shortening = ${compact(record.result.shorteningMm, 3)} mm`, lane.x + 20, eventY + 30);
      ctx.fillText(`σmax = ${compact(record.result.maxCompressionStressMPa, 1)} MPa`, lane.x + 20, eventY + 55);
      ctx.fillText(`Capacity use = ${compact(record.capacityRatio * 100, 1)}%`, lane.x + 20, eventY + 80);
      ctx.fillText(`Governing use = ${compact(record.governingRatio * 100, 1)}%`, lane.x + 20, eventY + 105);
    }
  });

  ctx.fillStyle = palette.muted;
  ctx.font = '600 14px system-ui, sans-serif';
  const note = definition.mode === 'beam'
    ? 'Beam shape uses the current elastic solver deflection series with one common visual scale across members.'
    : 'Compression view animates solver-computed axial shortening only. No lateral post-buckled shape is invented by this screen.';
  ctx.fillText(note, 44, 672);
  ctx.fillText('Quasi-static visualization only · verify governing code, stability, connections, delivered properties and unimplemented limit states before design use.', 44, 696);
  return { definition, result, frame, palette };
}

function injectStyles() {
  if (document.getElementById('ft-generic-comparison-video-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-generic-comparison-video-style';
  style.textContent = `
    .generic-comparison-video { margin-top:1rem; padding:1rem; border:1px solid rgba(132,164,177,.32); border-radius:14px; background:rgba(2,13,20,.34); }
    .generic-comparison-video__head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
    .generic-comparison-video__head h3 { margin:.15rem 0; }
    .generic-comparison-video__actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    .generic-comparison-video canvas { width:100%; height:auto; display:block; margin-top:.8rem; border:1px solid rgba(132,164,177,.38); border-radius:12px; background:#06151e; }
    html[data-ft-theme="paper-matte"] .generic-comparison-video { background:#fffaf1; border-color:#9f927d; color:#172127; }
    html[data-ft-theme="paper-matte"] .generic-comparison-video canvas { background:#fffdf8; border-color:#8d806c; }
    .generic-comparison-video__note { margin:.65rem 0 0; opacity:.82; }
    @media print { .generic-comparison-video { display:none !important; } }
  `;
  document.head.appendChild(style);
}

function waitFrames(count = 2) {
  return new Promise((resolve) => {
    const step = () => count-- <= 0 ? resolve() : requestAnimationFrame(step);
    requestAnimationFrame(step);
  });
}

async function recordCanvas(panel, canvas, button) {
  if (!window.MediaRecorder || typeof canvas.captureStream !== 'function') {
    throw new Error('This browser does not support canvas video recording.');
  }
  const playback = document.querySelector('[data-comparison-playback]');
  const reset = playback?.querySelector('[data-cp-reset]');
  const play = playback?.querySelector('[data-cp-play]');
  const scrub = playback?.querySelector('[data-cp-scrub]');
  if (!reset || !play || !scrub) throw new Error('Generic synchronized playback controls are unavailable.');

  reset.click();
  await waitFrames(3);
  drawFrame(canvas);

  const stream = canvas.captureStream(30);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
  const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once:true }));
  button.disabled = true;
  button.textContent = 'RECORDING…';
  recorder.start(200);
  play.click();

  const timeoutAt = performance.now() + 90000;
  while (Number(scrub.value) < 999 && performance.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  await waitFrames(3);
  if (recorder.state !== 'inactive') recorder.stop();
  await stopped;
  stream.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: mimeType });
  if (!blob.size) throw new Error('Recorded video was empty.');
  const theme = document.documentElement.dataset.ftTheme === 'paper-matte' ? 'paper-matte' : 'lab-dark';
  const mode = modeNow();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `futoltech-general-${mode}-${theme}-load-test-${Date.now()}.webm`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.__FT_LAST_GENERIC_COMPARISON_VIDEO__ = { size: blob.size, theme, mode };
  button.disabled = false;
  button.textContent = 'RECORD + DOWNLOAD VIDEO';
}

function mount(panel) {
  if (panel.querySelector('[data-generic-comparison-video]')) return;
  injectStyles();
  panel.querySelector('[data-cp-benchmark]')?.remove();
  const heading = panel.querySelector('.comparison-playback__head h3');
  if (heading) heading.textContent = 'General material load-test playback';
  const intro = panel.querySelector('.comparison-playback__head p:not(.eyebrow)');
  if (intro) intro.textContent = 'The selected two or three real members stay selected. One shared load history is applied to all of them.';
  const boundary = panel.querySelector('.comparison-playback__boundary');
  if (boundary) boundary.textContent = 'Virtual time = load ÷ selected loading rate. This is synchronized quasi-static solver playback, not impact/dynamic time integration. Beam animation uses solver deflection. Compression animation uses solver axial shortening only; lateral post-buckling deformation is not invented.';

  const section = document.createElement('section');
  section.className = 'generic-comparison-video';
  section.dataset.genericComparisonVideo = 'true';
  section.innerHTML = `
    <div class="generic-comparison-video__head">
      <div><p class="eyebrow">GEN-VIZ-001 · selected members only</p><h3>Load-test video canvas</h3><p>Beam or compression visualization follows the members you actually selected above.</p></div>
      <div class="generic-comparison-video__actions"><button type="button" class="button" data-generic-record>RECORD + DOWNLOAD VIDEO</button></div>
    </div>
    <canvas width="1280" height="720" data-generic-video-canvas aria-label="General material comparison load-test video canvas"></canvas>
    <p class="generic-comparison-video__note">PaperMatte and Lab Dark are both recordable. The canvas mirrors the current synchronized playback; it never substitutes a C-purlin specimen unless you actually selected a C-purlin.</p>`;
  panel.appendChild(section);
  const canvas = section.querySelector('[data-generic-video-canvas]');
  const recordButton = section.querySelector('[data-generic-record]');

  let active = true;
  let last = 0;
  const loop = (stamp) => {
    if (!active || !canvas.isConnected) return;
    if (stamp - last > 50) { drawFrame(canvas); last = stamp; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.addEventListener('ft-theme-change', () => drawFrame(canvas));
  recordButton.addEventListener('click', async () => {
    try { await recordCanvas(panel, canvas, recordButton); }
    catch (error) {
      recordButton.disabled = false;
      recordButton.textContent = 'RECORD + DOWNLOAD VIDEO';
      console.error(error);
      alert(error.message || String(error));
    }
  });

  window.__FT_GENERIC_COMPARISON_VIDEO__ = {
    canvas,
    redraw: () => drawFrame(canvas),
    stop: () => { active = false; }
  };
  drawFrame(canvas);
}

async function boot() {
  for (let attempt = 0; attempt < MOUNT_ATTEMPTS; attempt += 1) {
    const panel = document.querySelector('.compare-shell [data-comparison-playback]');
    if (panel) { mount(panel); return; }
    await new Promise((resolve) => setTimeout(resolve, MOUNT_INTERVAL_MS));
  }
  console.warn('GEN-VIZ-001 did not mount because generic comparison playback was unavailable.');
}

boot();
