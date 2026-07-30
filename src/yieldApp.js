import { MATERIALS, getMaterial } from './data/materials.js';
import { calculateSectionProperties } from './solver/sections.js';
import {
  buildSteelYieldHistory,
  createSteelYieldModel,
  evaluateSteelYieldState
} from './solver/steelYieldCycle.js';

const ids = [
  'yieldMaterialSelect', 'yieldLengthInput', 'yieldBoundarySelect', 'yieldPeakLoadInput',
  'yieldLoadPositionInput', 'yieldWidthInput', 'yieldDepthInput', 'yieldThicknessInput',
  'yieldTangentRatioInput', 'yieldLoadingDurationInput', 'yieldHoldDurationInput',
  'yieldUnloadingDurationInput', 'yieldResidualDurationInput', 'yieldSectionSummary',
  'yieldSourceCard', 'yieldResetButton', 'yieldPlayButton', 'yieldTimelineResetButton',
  'yieldSpeedSelect', 'yieldErrorBanner', 'yieldStateBanner', 'yieldTimelineRange',
  'yieldTimelineOutput', 'yieldDiagram', 'yieldResultCards', 'yieldHistoryChart',
  'yieldInterpretation'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

let currentModel = null;
let currentHistory = [];
let playing = false;
let animationFrame = null;
let lastAnimationTimestamp = null;

function numeric(element) {
  return Number(element.value);
}

function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function svgElement(name, attributes = {}, text = null) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text != null) node.textContent = text;
  return node;
}

function addSvg(svg, name, attributes = {}, text = null) {
  const node = svgElement(name, attributes, text);
  svg.appendChild(node);
  return node;
}

function resultCard(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function populateSteelMaterials() {
  elements.yieldMaterialSelect.innerHTML = MATERIALS
    .filter((material) => material.family === 'steel')
    .map((material) => `<option value="${material.id}">${material.name}</option>`)
    .join('');
}

function supportsForBoundary() {
  if (elements.yieldBoundarySelect.value === 'cantilever-left') {
    return { leftSupport: 'fixed', rightSupport: 'free' };
  }
  if (elements.yieldBoundarySelect.value === 'cantilever-right') {
    return { leftSupport: 'free', rightSupport: 'fixed' };
  }
  return { leftSupport: 'pin', rightSupport: 'roller' };
}

function sectionProperties() {
  return calculateSectionProperties({
    type: 'rhs',
    widthMm: numeric(elements.yieldWidthInput),
    depthMm: numeric(elements.yieldDepthInput),
    thicknessMm: numeric(elements.yieldThicknessInput)
  });
}

function renderSectionSummary(material, properties) {
  const massPerM = properties.areaMm2 * 1e-6 * material.densityKgM3;
  elements.yieldSectionSummary.innerHTML = `
    <strong>Solver uses:</strong> ${format(numeric(elements.yieldDepthInput), 1)} × ${format(numeric(elements.yieldWidthInput), 1)} × ${format(numeric(elements.yieldThicknessInput), 2)} mm RHS/SHS ·
    Zₓ ${format(properties.zxMm3, 0)} mm³ · Iₓ ${format(properties.ixMm4, 0)} mm⁴ · ${format(massPerM, 2)} kg/m.
  `;
}

function renderSource(material) {
  elements.yieldSourceCard.innerHTML = `
    <p class="eyebrow">Yield-property source</p>
    <strong>${material.source.label}</strong>
    <div class="source-meta">
      <span>${material.source.status}</span>
      <span>${material.source.confidence} confidence</span>
      <span>Fy ${format(material.yieldStrengthMPa, 0)} MPa</span>
    </div>
    <p>${material.source.note}</p>
  `;
}

function drawSupport(svg, x, y, support, side) {
  if (support === 'fixed') {
    addSvg(svg, 'line', { x1: x, y1: y - 25, x2: x, y2: y + 29, class: 'yield-support' });
    for (let offset = -20; offset <= 20; offset += 10) {
      const direction = side === 'left' ? -1 : 1;
      addSvg(svg, 'line', { x1: x, y1: y + offset, x2: x + 10 * direction, y2: y + offset - 7, class: 'yield-support' });
    }
    return;
  }
  if (support === 'free') {
    addSvg(svg, 'text', { x, y: y + 45, class: 'yield-svg-label' }, 'free');
    return;
  }
  addSvg(svg, 'polygon', { points: `${x},${y + 2} ${x - 14},${y + 25} ${x + 14},${y + 25}`, class: 'yield-support' });
  if (support === 'roller') {
    addSvg(svg, 'circle', { cx: x - 7, cy: y + 31, r: 4, class: 'yield-support' });
    addSvg(svg, 'circle', { cx: x + 7, cy: y + 31, r: 4, class: 'yield-support' });
  }
}

function stateStyle(state) {
  if (state.state === 'yielding' || state.state === 'plastic-hold') return 'plastic';
  if (state.state === 'elastic-unloading-with-residual' || state.state === 'residual-deformation') return 'residual';
  return 'elastic';
}

function drawYieldDiagram(model, state) {
  const svg = elements.yieldDiagram;
  svg.replaceChildren();
  const x0 = 70;
  const x1 = 830;
  const y0 = 180;
  const scaleX = (xM) => x0 + (xM / model.lengthM) * (x1 - x0);
  const maximumPhysicalDeflection = Math.max(...state.deflectionSeries.map((point) => Math.abs(point.displacementMm)), 0);
  const verticalPixelsPerMm = maximumPhysicalDeflection > 1e-9 ? Math.min(50, 82 / maximumPhysicalDeflection) : 1;
  const effectiveMagnification = verticalPixelsPerMm / ((x1 - x0) / (model.lengthM * 1000));

  addSvg(svg, 'line', { x1: x0, y1: y0, x2: x1, y2: y0, class: 'yield-reference' });
  const path = state.deflectionSeries.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${scaleX(point.xM).toFixed(2)} ${(y0 - point.displacementMm * verticalPixelsPerMm).toFixed(2)}`;
  }).join(' ');
  const style = stateStyle(state);
  addSvg(svg, 'path', {
    d: path,
    class: `yield-member${style === 'plastic' ? ' yield-member--plastic' : ''}${style === 'residual' ? ' yield-member--residual' : ''}`
  });

  if (state.appliedLoadKN > 1e-6) {
    const loadX = scaleX(model.loadPositionM);
    addSvg(svg, 'line', { x1: loadX, y1: y0 - 105, x2: loadX, y2: y0 - 22, class: 'yield-load' });
    addSvg(svg, 'polygon', { points: `${loadX},${y0 - 13} ${loadX - 8},${y0 - 28} ${loadX + 8},${y0 - 28}`, class: 'yield-load-head' });
    addSvg(svg, 'text', { x: loadX, y: y0 - 116, class: 'yield-svg-label yield-svg-label--strong' }, `${state.appliedLoadKN.toFixed(2)} kN`);
  }

  if (state.yielded || state.residualDeflectionMm > 1e-8) {
    const hingeX = scaleX(model.hingeLocationM);
    const hingeSeriesPoint = state.deflectionSeries.reduce((nearest, point) => (
      Math.abs(point.xM - model.hingeLocationM) < Math.abs(nearest.xM - model.hingeLocationM) ? point : nearest
    ), state.deflectionSeries[0]);
    const hingeY = y0 - hingeSeriesPoint.displacementMm * verticalPixelsPerMm;
    addSvg(svg, 'circle', { cx: hingeX, cy: hingeY, r: 11, class: 'yield-hinge-pulse' });
    addSvg(svg, 'circle', { cx: hingeX, cy: hingeY, r: 6, class: 'yield-hinge' });
    addSvg(svg, 'text', { x: hingeX, y: hingeY - 20, class: 'yield-svg-label yield-svg-label--strong' }, 'plastic hinge');
  }

  drawSupport(svg, x0, y0, model.leftSupport, 'left');
  drawSupport(svg, x1, y0, model.rightSupport, 'right');
  addSvg(svg, 'text', { x: x0, y: 315, class: 'yield-svg-label' }, '0.00 m');
  addSvg(svg, 'text', { x: x1, y: 315, class: 'yield-svg-label' }, `${model.lengthM.toFixed(2)} m`);
  addSvg(svg, 'text', { x: 450, y: 340, class: 'yield-svg-caption' }, `Calculated shape · auto-fit display ≈ ×${format(effectiveMagnification, effectiveMagnification < 0.1 ? 3 : 1)} geometric magnification · physical max ${format(state.maxDeflectionMm, 3)} mm`);
}

function drawHistoryChart(model, history, state) {
  const svg = elements.yieldHistoryChart;
  svg.replaceChildren();
  const left = 58;
  const right = 500;
  const top = 24;
  const bottom = 268;
  const maxDeflection = Math.max(...history.map((point) => point.maxDeflectionMm), 1e-6) * 1.08;
  const maxLoad = Math.max(model.analysedPeakLoadKN, 1e-6) * 1.08;
  const xScale = (value) => left + value / maxDeflection * (right - left);
  const yScale = (value) => bottom - value / maxLoad * (bottom - top);

  for (let index = 0; index <= 4; index += 1) {
    const fraction = index / 4;
    const x = left + fraction * (right - left);
    const y = bottom - fraction * (bottom - top);
    addSvg(svg, 'line', { x1: x, y1: top, x2: x, y2: bottom, class: 'yield-gridline' });
    addSvg(svg, 'line', { x1: left, y1: y, x2: right, y2: y, class: 'yield-gridline' });
    addSvg(svg, 'text', { x, y: bottom + 20, class: 'yield-chart-label', 'text-anchor': 'middle' }, format(maxDeflection * fraction, 1));
    addSvg(svg, 'text', { x: left - 8, y: y + 4, class: 'yield-chart-label yield-chart-label--end' }, format(maxLoad * fraction, 1));
  }
  addSvg(svg, 'line', { x1: left, y1: bottom, x2: right, y2: bottom, class: 'yield-axis' });
  addSvg(svg, 'line', { x1: left, y1: top, x2: left, y2: bottom, class: 'yield-axis' });

  const path = history.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.maxDeflectionMm).toFixed(2)} ${yScale(point.appliedLoadKN).toFixed(2)}`).join(' ');
  const hasYield = history.some((point) => point.yielded);
  addSvg(svg, 'path', { d: path, class: `yield-history-path${hasYield ? ' yield-history-path--plastic' : ''}` });
  addSvg(svg, 'circle', { cx: xScale(state.maxDeflectionMm), cy: yScale(state.appliedLoadKN), r: 6, class: 'yield-history-point' });
  addSvg(svg, 'text', { x: (left + right) / 2, y: 304, class: 'yield-chart-label', 'text-anchor': 'middle' }, 'maximum deflection magnitude, mm');
  addSvg(svg, 'text', { x: 16, y: (top + bottom) / 2, class: 'yield-chart-label', transform: `rotate(-90 16 ${(top + bottom) / 2})`, 'text-anchor': 'middle' }, 'load, kN');
}

function renderStateBanner(model, state) {
  let style = 'elastic';
  let title = 'ELASTIC LOADING';
  let message = 'The current load is below first yield. The path follows the initial elastic stiffness.';

  if (state.state === 'yielding') {
    style = 'yield';
    title = 'PLASTIC HINGE FORMING';
    message = 'The first-yield moment has been exceeded. The solver reduces tangent stiffness and accumulates irreversible plastic rotation.';
  } else if (state.state === 'plastic-hold') {
    style = 'yield';
    title = 'PEAK LOAD HELD — YIELDED';
    message = 'The peak load is being held with a formed idealised plastic hinge and accumulated permanent deformation.';
  } else if (state.state === 'elastic-unloading-with-residual') {
    style = 'residual';
    title = 'UNLOADING — PERMANENT SET REMAINS';
    message = 'Load is reducing along the initial elastic unloading slope, while the plastic component remains locked in.';
  } else if (state.state === 'residual-deformation') {
    style = 'residual';
    title = 'ZERO LOAD — RESIDUAL DEFORMATION';
    message = 'The external point load is zero, but the idealised plastic hinge leaves a permanent bent shape.';
  } else if (state.state === 'elastic-unloading') {
    title = 'ELASTIC UNLOADING';
    message = 'The peak load never reached first yield, so the member returns along the elastic path.';
  } else if (state.state === 'returned-to-zero') {
    title = 'ZERO LOAD — RETURNED TO ZERO';
    message = 'The selected peak remained elastic, so no residual deformation is predicted by NL-001.';
  }

  if (model.terminatedAtModelLimit) {
    style = 'limited';
    title = `${title} · MODEL LOAD CAPPED`;
    message += ` The requested ${format(model.requestedPeakLoadKN, 2)} kN exceeds the NL-001 boundary of ${format(model.maximumModelLoadKN, 2)} kN (${format(model.maximumModelLoadRatio, 2)}Py); the cycle is capped because local buckling or fracture may govern.`;
  }

  elements.yieldStateBanner.className = `yield-state-banner yield-state-banner--${style}`;
  elements.yieldStateBanner.innerHTML = `<span class="yield-state-banner__label">LIVE NONLINEAR STATE</span><strong>${title}</strong><p>${message}</p>`;
}

function renderResults(model, state) {
  elements.yieldResultCards.innerHTML = [
    resultCard('Current applied load', `${format(state.appliedLoadKN, 3)} kN`, `${state.phase} · t = ${format(state.timeS, 2)} s`),
    resultCard('Calculated first-yield load', `${format(model.firstYieldLoadKN, 3)} kN`, `My = ${format(model.yieldMomentKNm, 3)} kN·m`),
    resultCard('Current maximum deflection', `${format(state.maxDeflectionMm, 3)} mm`, state.yielded ? 'elastic + plastic components' : 'elastic component'),
    resultCard('Residual deflection after unload', `${format(state.residualDeflectionMm, 3)} mm`, state.residualDeflectionMm > 0 ? 'permanent set predicted' : 'none'),
    resultCard('Plastic hinge location', `${format(model.hingeLocationM, 3)} m`, model.boundaryCase.replaceAll('-', ' ')),
    resultCard('Plastic rotation', `${format(state.plasticRotationRad, 5)} rad`, `residual ${format(state.residualPlasticRotationRad, 5)} rad`)
  ].join('');
}

function renderInterpretation(model, state, material) {
  const yieldTimeText = state.firstYieldTimeS == null
    ? 'The entered peak load remains below calculated first yield.'
    : `First yield occurs at approximately <strong>${format(state.firstYieldTimeS, 2)} s</strong> during loading.`;
  elements.yieldInterpretation.innerHTML = `
    <p>${yieldTimeText}</p>
    <p>The elastic first-yield threshold is calculated from <strong>My = FyZ</strong> and the exact point-load moment from the beam FEM. The selected section uses Fy = <strong>${format(material.yieldStrengthMPa, 0)} MPa</strong>.</p>
    <p>After first yield, NL-001 uses a <strong>${format(model.postYieldTangentRatio * 100, 1)}%</strong> global post-yield tangent-stiffness assumption. Unloading uses the initial elastic slope, producing the residual shape visible at zero load.</p>
    <p>The current elastic-trial extreme-fibre stress is ${format(state.elasticTrialStressMPa, 1)} MPa. The idealised bilinear section-state stress is ${format(state.sectionStressMPa, 1)} MPa.</p>
    <p><strong>Engineering boundary:</strong> a thin SHS/RHS may locally buckle before or soon after this idealised plastic response. NL-001 must not be used as a certified post-yield capacity or ductility check.</p>
  `;
}

function renderCurrentState() {
  if (!currentModel) return;
  const state = evaluateSteelYieldState(currentModel, numeric(elements.yieldTimelineRange));
  const material = getMaterial(elements.yieldMaterialSelect.value);
  elements.yieldTimelineOutput.textContent = `${state.timeS.toFixed(2)} s / ${currentModel.totalDurationS.toFixed(2)} s`;
  drawYieldDiagram(currentModel, state);
  drawHistoryChart(currentModel, currentHistory, state);
  renderStateBanner(currentModel, state);
  renderResults(currentModel, state);
  renderInterpretation(currentModel, state, material);
}

function rebuildModel({ preserveTimeFraction = false } = {}) {
  try {
    elements.yieldErrorBanner.classList.add('is-hidden');
    const oldMaximum = numeric(elements.yieldTimelineRange.max ? elements.yieldTimelineRange : { value: 0 });
    const oldTime = numeric(elements.yieldTimelineRange);
    const oldFraction = preserveTimeFraction && oldMaximum > 0 ? oldTime / oldMaximum : 0;
    const material = getMaterial(elements.yieldMaterialSelect.value);
    const properties = sectionProperties();
    const lengthM = numeric(elements.yieldLengthInput);
    const loadPositionM = numeric(elements.yieldLoadPositionInput);
    elements.yieldLoadPositionInput.max = String(lengthM);
    const supports = supportsForBoundary();

    currentModel = createSteelYieldModel({
      lengthM,
      elasticModulusMPa: material.elasticModulusMPa,
      inertiaMm4: properties.ixMm4,
      sectionModulusMm3: properties.zxMm3,
      yieldStrengthMPa: material.yieldStrengthMPa,
      ...supports,
      loadPositionM,
      requestedPeakLoadKN: numeric(elements.yieldPeakLoadInput),
      postYieldTangentRatio: numeric(elements.yieldTangentRatioInput) / 100,
      loadingDurationS: numeric(elements.yieldLoadingDurationInput),
      holdDurationS: numeric(elements.yieldHoldDurationInput),
      unloadingDurationS: numeric(elements.yieldUnloadingDurationInput),
      residualDurationS: numeric(elements.yieldResidualDurationInput)
    });
    currentHistory = buildSteelYieldHistory(currentModel, 151);
    elements.yieldTimelineRange.max = String(currentModel.totalDurationS);
    elements.yieldTimelineRange.value = String(preserveTimeFraction ? currentModel.totalDurationS * oldFraction : 0);
    renderSectionSummary(material, properties);
    renderSource(material);
    renderCurrentState();
  } catch (error) {
    currentModel = null;
    currentHistory = [];
    elements.yieldErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.yieldErrorBanner.classList.remove('is-hidden');
    elements.yieldStateBanner.innerHTML = '';
    elements.yieldDiagram.replaceChildren();
    elements.yieldHistoryChart.replaceChildren();
    elements.yieldResultCards.innerHTML = '';
    elements.yieldInterpretation.innerHTML = '<p>Correct the setup before NL-001 can run.</p>';
  }
}

function stopPlayback() {
  playing = false;
  elements.yieldPlayButton.textContent = '▶ Play';
  lastAnimationTimestamp = null;
  if (animationFrame != null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
}

function animationTick(timestamp) {
  if (!playing || !currentModel) return;
  if (lastAnimationTimestamp == null) lastAnimationTimestamp = timestamp;
  const elapsedS = (timestamp - lastAnimationTimestamp) / 1000 * numeric(elements.yieldSpeedSelect);
  lastAnimationTimestamp = timestamp;
  const nextTime = numeric(elements.yieldTimelineRange) + elapsedS;
  if (nextTime >= currentModel.totalDurationS) {
    elements.yieldTimelineRange.value = String(currentModel.totalDurationS);
    renderCurrentState();
    stopPlayback();
    return;
  }
  elements.yieldTimelineRange.value = String(nextTime);
  renderCurrentState();
  animationFrame = requestAnimationFrame(animationTick);
}

function togglePlayback() {
  if (!currentModel) return;
  if (playing) {
    stopPlayback();
    return;
  }
  if (numeric(elements.yieldTimelineRange) >= currentModel.totalDurationS - 1e-6) {
    elements.yieldTimelineRange.value = '0';
  }
  playing = true;
  elements.yieldPlayButton.textContent = '❚❚ Pause';
  lastAnimationTimestamp = null;
  animationFrame = requestAnimationFrame(animationTick);
}

function syncBoundaryLoadPosition() {
  const lengthM = numeric(elements.yieldLengthInput);
  if (elements.yieldBoundarySelect.value === 'cantilever-left') elements.yieldLoadPositionInput.value = String(lengthM);
  else if (elements.yieldBoundarySelect.value === 'cantilever-right') elements.yieldLoadPositionInput.value = '0';
  else elements.yieldLoadPositionInput.value = String(lengthM / 2);
}

function resetNl001() {
  stopPlayback();
  elements.yieldMaterialSelect.value = 'steel-generic-250';
  elements.yieldLengthInput.value = '3';
  elements.yieldBoundarySelect.value = 'simply-supported';
  elements.yieldPeakLoadInput.value = '2';
  elements.yieldLoadPositionInput.value = '1.5';
  elements.yieldWidthInput.value = '50';
  elements.yieldDepthInput.value = '50';
  elements.yieldThicknessInput.value = '1.5';
  elements.yieldTangentRatioInput.value = '5';
  elements.yieldLoadingDurationInput.value = '5';
  elements.yieldHoldDurationInput.value = '1';
  elements.yieldUnloadingDurationInput.value = '5';
  elements.yieldResidualDurationInput.value = '2';
  rebuildModel();
}

populateSteelMaterials();
resetNl001();

elements.yieldPlayButton.addEventListener('click', togglePlayback);
elements.yieldTimelineResetButton.addEventListener('click', () => {
  stopPlayback();
  elements.yieldTimelineRange.value = '0';
  renderCurrentState();
});
elements.yieldResetButton.addEventListener('click', resetNl001);
elements.yieldTimelineRange.addEventListener('input', () => {
  stopPlayback();
  renderCurrentState();
});
elements.yieldBoundarySelect.addEventListener('change', () => {
  stopPlayback();
  syncBoundaryLoadPosition();
  rebuildModel();
});
elements.yieldLengthInput.addEventListener('change', () => {
  stopPlayback();
  syncBoundaryLoadPosition();
  rebuildModel();
});

for (const id of [
  'yieldMaterialSelect', 'yieldLengthInput', 'yieldPeakLoadInput', 'yieldLoadPositionInput',
  'yieldWidthInput', 'yieldDepthInput', 'yieldThicknessInput', 'yieldTangentRatioInput',
  'yieldLoadingDurationInput', 'yieldHoldDurationInput', 'yieldUnloadingDurationInput',
  'yieldResidualDurationInput'
]) {
  elements[id].addEventListener('input', () => {
    stopPlayback();
    rebuildModel({ preserveTimeFraction: true });
  });
  elements[id].addEventListener('change', () => {
    stopPlayback();
    rebuildModel({ preserveTimeFraction: true });
  });
}
