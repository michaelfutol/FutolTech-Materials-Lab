import { MATERIALS, getMaterial } from './data/materials.js';
import { calculateSectionProperties } from './solver/sections.js';
import { solveBeam } from './solver/beamFem.js';
import {
  evaluateSpliceDemand,
  feasibleSingleSpliceInterval,
  internalActionsAtSplice,
  minimumStockPieces,
  suggestSpliceLocation
} from './solver/spliceDemand.js';

const ids = [
  'spliceMaterialSelect', 'spliceTypeSelect', 'assembledLengthInput', 'stockLengthInput',
  'spliceOverlapInput', 'spliceDetailLengthInput', 'spliceWidthInput', 'spliceDepthInput',
  'spliceThicknessInput', 'spliceThicknessLabel', 'spliceSectionSummary', 'spliceLeftSupportSelect',
  'spliceRightSupportSelect', 'spliceLoadInput', 'spliceLoadPositionInput', 'splicePositionInput',
  'splicePositionRange', 'spliceMomentCapacityInput', 'spliceShearCapacityInput',
  'spliceRotationalStiffnessInput', 'spliceShearStiffnessInput', 'useSuggestedSpliceButton',
  'spliceSourceCard', 'spliceErrorBanner', 'spliceStateBanner', 'spliceDiagram', 'spliceResultCards',
  'stockPlanResults', 'spliceDemandResults', 'spliceInterpretation', 'spliceResetButton'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const SPLICE_TYPES = {
  wood: [
    ['wood-double-scab', 'Butt splice + double timber scabs / sister plates'],
    ['wood-steel-side-plates', 'Butt splice + double steel side plates'],
    ['wood-half-lap', 'Half-lap splice'],
    ['wood-scarf', 'Scarf splice']
  ],
  steel: [
    ['steel-butt-weld', 'Butt-welded splice'],
    ['steel-sleeve', 'Internal / external sleeve splice'],
    ['steel-cover-plates', 'Welded or bolted cover-plate splice']
  ]
};

const SPLICE_DEFAULTS = {
  'wood-double-scab': { overlapM: 0, detailLengthM: 0.9 },
  'wood-steel-side-plates': { overlapM: 0, detailLengthM: 0.6 },
  'wood-half-lap': { overlapM: 0.6, detailLengthM: 0.6 },
  'wood-scarf': { overlapM: 0.9, detailLengthM: 0.9 },
  'steel-butt-weld': { overlapM: 0, detailLengthM: 0.15 },
  'steel-sleeve': { overlapM: 0, detailLengthM: 0.6 },
  'steel-cover-plates': { overlapM: 0, detailLengthM: 0.6 }
};

function numberValue(element) {
  return Number(element.value);
}

function optionalNumber(element) {
  if (element.value.trim() === '') return null;
  const value = Number(element.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function resultCard(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function renderDefinition(target, rows) {
  target.innerHTML = rows.map(([term, detail]) => `<div><dt>${term}</dt><dd>${detail}</dd></div>`).join('');
}

function populateMaterials() {
  elements.spliceMaterialSelect.innerHTML = MATERIALS
    .map((material) => `<option value="${material.id}">${material.name}</option>`)
    .join('');
}

function populateSpliceTypes(material, preferred = null) {
  const types = SPLICE_TYPES[material.family] ?? [];
  elements.spliceTypeSelect.innerHTML = types
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
  if (preferred && types.some(([value]) => value === preferred)) elements.spliceTypeSelect.value = preferred;
}

function spliceTypeLabel() {
  return elements.spliceTypeSelect.selectedOptions[0]?.textContent ?? 'Selected splice';
}

function currentSection(material) {
  if (material.family === 'steel') {
    return {
      type: 'rhs',
      widthMm: numberValue(elements.spliceWidthInput),
      depthMm: numberValue(elements.spliceDepthInput),
      thicknessMm: numberValue(elements.spliceThicknessInput)
    };
  }
  return {
    type: 'rectangle',
    widthMm: numberValue(elements.spliceWidthInput),
    depthMm: numberValue(elements.spliceDepthInput)
  };
}

function sectionDescription(material) {
  if (material.family === 'steel') {
    return `${format(numberValue(elements.spliceDepthInput), 1)} × ${format(numberValue(elements.spliceWidthInput), 1)} × ${format(numberValue(elements.spliceThicknessInput), 2)} mm RHS/SHS`;
  }
  return `${format(numberValue(elements.spliceWidthInput), 1)} × ${format(numberValue(elements.spliceDepthInput), 1)} mm solid coco/timber rectangle`;
}

function renderSectionSummary(material) {
  elements.spliceSectionSummary.innerHTML = `<strong>Solver uses:</strong> ${sectionDescription(material)} · ${format(numberValue(elements.spliceDepthInput), 1)} mm vertical.`;
}

function renderSource(material) {
  elements.spliceSourceCard.innerHTML = `
    <p class="eyebrow">Main-member property source</p>
    <strong>${material.source.label}</strong>
    <div class="source-meta">
      <span>${material.source.status}</span>
      <span>${material.source.confidence} confidence</span>
      ${material.source.year ? `<span>${material.source.year}</span>` : ''}
    </div>
    <p>${material.source.note}</p>
  `;
}

function applySpliceTypeDefaults() {
  const defaults = SPLICE_DEFAULTS[elements.spliceTypeSelect.value];
  if (!defaults) return;
  elements.spliceOverlapInput.value = String(defaults.overlapM);
  elements.spliceDetailLengthInput.value = String(defaults.detailLengthM);
  analyse();
}

function syncMaterial({ resetGeometry = true } = {}) {
  const material = getMaterial(elements.spliceMaterialSelect.value);
  populateSpliceTypes(material);
  elements.spliceThicknessLabel.classList.toggle('is-hidden', material.family !== 'steel');

  if (resetGeometry) {
    if (material.family === 'wood') {
      elements.assembledLengthInput.value = '5.4';
      elements.stockLengthInput.value = '3.6';
      elements.spliceWidthInput.value = '50';
      elements.spliceDepthInput.value = '100';
      elements.spliceLoadInput.value = '1';
    } else {
      elements.assembledLengthInput.value = '9';
      elements.stockLengthInput.value = '6';
      elements.spliceWidthInput.value = '50';
      elements.spliceDepthInput.value = '50';
      elements.spliceThicknessInput.value = '1.5';
      elements.spliceLoadInput.value = '1';
    }
    const lengthM = numberValue(elements.assembledLengthInput);
    elements.spliceLoadPositionInput.value = String(lengthM / 2);
    elements.splicePositionInput.value = String(lengthM / 2);
    elements.splicePositionRange.value = String(lengthM / 2);
    elements.spliceMomentCapacityInput.value = '';
    elements.spliceShearCapacityInput.value = '';
    elements.spliceRotationalStiffnessInput.value = '';
    elements.spliceShearStiffnessInput.value = '';
  }

  const defaults = SPLICE_DEFAULTS[elements.spliceTypeSelect.value];
  if (defaults) {
    elements.spliceOverlapInput.value = String(defaults.overlapM);
    elements.spliceDetailLengthInput.value = String(defaults.detailLengthM);
  }
  renderSectionSummary(material);
  analyse();
}

function setStateBanner({ severity, title, message }) {
  elements.spliceStateBanner.className = `capacity-banner capacity-banner--${severity}`;
  elements.spliceStateBanner.innerHTML = `
    <div class="capacity-banner__heading"><span>LIVE SPLICE CHECK</span><strong>${title}</strong></div>
    <p>${message}</p>
  `;
}

function svgElement(name, attributes = {}, text = null) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text != null) node.textContent = text;
  return node;
}

function addSvg(name, attributes = {}, text = null) {
  const node = svgElement(name, attributes, text);
  elements.spliceDiagram.appendChild(node);
  return node;
}

function drawSupport(x, y, support, side) {
  if (support === 'fixed') {
    addSvg('line', { x1: x, y1: y - 24, x2: x, y2: y + 28, class: 'support-symbol' });
    for (let offset = -20; offset <= 20; offset += 10) {
      const direction = side === 'left' ? -1 : 1;
      addSvg('line', { x1: x, y1: y + offset, x2: x + 10 * direction, y2: y + offset - 7, class: 'support-symbol' });
    }
    return;
  }
  if (support === 'free') {
    addSvg('text', { x, y: y + 42, class: 'svg-label' }, 'free');
    return;
  }
  addSvg('polygon', { points: `${x},${y + 2} ${x - 14},${y + 25} ${x + 14},${y + 25}`, class: 'support-symbol' });
  if (support === 'roller') {
    addSvg('circle', { cx: x - 7, cy: y + 31, r: 4, class: 'support-symbol' });
    addSvg('circle', { cx: x + 7, cy: y + 31, r: 4, class: 'support-symbol' });
  }
}

function drawDiagram({
  beamResult,
  lengthM,
  loadKN,
  loadPositionM,
  splicePositionM,
  overlapM,
  detailLengthM,
  interval,
  leftSupport,
  rightSupport
}) {
  elements.spliceDiagram.replaceChildren();
  const x0 = 70;
  const x1 = 830;
  const y0 = 185;
  const scaleX = (xM) => x0 + (xM / lengthM) * (x1 - x0);

  if (interval.feasible) {
    const zoneX = scaleX(interval.minimumM);
    const zoneWidth = Math.max(1, scaleX(interval.maximumM) - zoneX);
    addSvg('rect', { x: zoneX, y: y0 - 38, width: zoneWidth, height: 76, class: 'splice-feasible-zone' });
    addSvg('text', { x: zoneX + zoneWidth / 2, y: y0 - 48, class: 'svg-caption' }, 'stock-feasible single-splice zone');
  }

  addSvg('line', { x1: x0, y1: y0, x2: x1, y2: y0, class: 'reference-line' });

  const maxDeflection = Math.max(...beamResult.deflectionSeries.map((point) => Math.abs(point.displacementMm)), 0);
  const visualScale = maxDeflection > 1e-12 ? 48 / maxDeflection : 0;
  const path = beamResult.deflectionSeries.map((point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${command} ${scaleX(point.xM).toFixed(2)} ${(y0 - point.displacementMm * visualScale).toFixed(2)}`;
  }).join(' ');
  addSvg('path', { d: path, class: 'member-path' });

  const detailHalfM = Math.min(detailLengthM / 2, lengthM / 2);
  const detailStart = Math.max(0, splicePositionM - detailHalfM);
  const detailEnd = Math.min(lengthM, splicePositionM + detailHalfM);
  addSvg('rect', {
    x: scaleX(detailStart), y: y0 - 13,
    width: Math.max(4, scaleX(detailEnd) - scaleX(detailStart)), height: 26,
    class: 'splice-detail-band'
  });

  if (overlapM > 0) {
    const overlapStart = Math.max(0, splicePositionM - overlapM / 2);
    const overlapEnd = Math.min(lengthM, splicePositionM + overlapM / 2);
    addSvg('rect', {
      x: scaleX(overlapStart), y: y0 - 20,
      width: Math.max(4, scaleX(overlapEnd) - scaleX(overlapStart)), height: 40,
      class: 'splice-overlap-band'
    });
  }

  const spliceX = scaleX(splicePositionM);
  addSvg('line', { x1: spliceX, y1: y0 - 62, x2: spliceX, y2: y0 + 64, class: 'splice-marker' });
  addSvg('text', { x: spliceX, y: y0 + 86, class: 'svg-label svg-label--strong' }, `splice ${splicePositionM.toFixed(2)} m`);

  const loadX = scaleX(loadPositionM);
  addSvg('line', { x1: loadX, y1: y0 - 100, x2: loadX, y2: y0 - 20, class: 'load-arrow' });
  addSvg('polygon', { points: `${loadX},${y0 - 12} ${loadX - 8},${y0 - 27} ${loadX + 8},${y0 - 27}`, class: 'load-arrow-head' });
  addSvg('text', { x: loadX, y: y0 - 112, class: 'svg-label svg-label--strong' }, `${loadKN.toFixed(2)} kN`);

  drawSupport(x0, y0, leftSupport, 'left');
  drawSupport(x1, y0, rightSupport, 'right');
  addSvg('text', { x: x0, y: y0 + 122, class: 'svg-label' }, '0.00 m');
  addSvg('text', { x: x1, y: y0 + 122, class: 'svg-label svg-label--end' }, `${lengthM.toFixed(2)} m`);

  const leftPieceLength = splicePositionM + overlapM / 2;
  const rightPieceLength = lengthM - splicePositionM + overlapM / 2;
  addSvg('text', { x: (x0 + spliceX) / 2, y: y0 + 112, class: 'svg-caption' }, `left piece ≈ ${leftPieceLength.toFixed(2)} m`);
  addSvg('text', { x: (spliceX + x1) / 2, y: y0 + 112, class: 'svg-caption' }, `right piece ≈ ${rightPieceLength.toFixed(2)} m`);
  addSvg('text', { x: 450, y: 344, class: 'svg-caption' }, 'Deflected shape is normalized for visibility; SP-001 does not yet insert splice flexibility into the global beam solution.');
}

function analyse() {
  try {
    elements.spliceErrorBanner.classList.add('is-hidden');
    const material = getMaterial(elements.spliceMaterialSelect.value);
    const lengthM = numberValue(elements.assembledLengthInput);
    const stockLengthM = numberValue(elements.stockLengthInput);
    const overlapM = numberValue(elements.spliceOverlapInput);
    const detailLengthM = numberValue(elements.spliceDetailLengthInput);
    const loadKN = numberValue(elements.spliceLoadInput);
    const loadPositionM = numberValue(elements.spliceLoadPositionInput);
    const splicePositionM = numberValue(elements.splicePositionInput);

    if (![lengthM, stockLengthM, detailLengthM].every((value) => Number.isFinite(value) && value > 0)) {
      throw new Error('Assembled length, stock length, and splice-detail length must be greater than zero.');
    }
    if (!Number.isFinite(overlapM) || overlapM < 0) throw new Error('Main-member overlap cannot be negative.');
    if (!Number.isFinite(loadKN) || loadKN < 0) throw new Error('Point load cannot be negative.');
    if (loadPositionM < 0 || loadPositionM > lengthM) throw new Error('Point-load position must lie on the assembled member.');
    if (splicePositionM < 0 || splicePositionM > lengthM) throw new Error('Splice position must lie on the assembled member.');

    elements.spliceLoadPositionInput.max = String(lengthM);
    elements.splicePositionInput.max = String(lengthM);
    elements.splicePositionRange.max = String(lengthM);
    elements.splicePositionRange.value = String(splicePositionM);

    const section = currentSection(material);
    const properties = calculateSectionProperties(section);
    const beamResult = solveBeam({
      lengthM,
      elasticModulusMPa: material.elasticModulusMPa,
      inertiaMm4: properties.ixMm4,
      sectionModulusMm3: properties.zxMm3,
      leftSupport: elements.spliceLeftSupportSelect.value,
      rightSupport: elements.spliceRightSupportSelect.value,
      pointLoads: [{ xM: loadPositionM, forceKN: loadKN }]
    });

    const plan = minimumStockPieces({ requiredLengthM: lengthM, stockLengthM, overlapM });
    const interval = feasibleSingleSpliceInterval({ requiredLengthM: lengthM, stockLengthM, overlapM });
    const actions = internalActionsAtSplice(beamResult, splicePositionM);
    const momentCapacityKNm = optionalNumber(elements.spliceMomentCapacityInput);
    const shearCapacityKN = optionalNumber(elements.spliceShearCapacityInput);
    const demand = evaluateSpliceDemand({
      momentKNm: actions.momentKNm,
      shearKN: actions.shearKN,
      momentCapacityKNm,
      shearCapacityKN,
      rotationalStiffnessKNmPerRad: optionalNumber(elements.spliceRotationalStiffnessInput),
      shearStiffnessKNPerMm: optionalNumber(elements.spliceShearStiffnessInput)
    });
    const suggestion = plan.pieces === 2
      ? suggestSpliceLocation({
          beamResult,
          requiredLengthM: lengthM,
          stockLengthM,
          overlapM,
          momentCapacityKNm,
          shearCapacityKN
        })
      : { feasible: false, recommended: null };

    elements.useSuggestedSpliceButton.disabled = !suggestion.feasible;
    elements.useSuggestedSpliceButton.dataset.recommended = suggestion.recommended?.xM ?? '';

    renderSectionSummary(material);
    renderSource(material);
    drawDiagram({
      beamResult,
      lengthM,
      loadKN,
      loadPositionM,
      splicePositionM,
      overlapM,
      detailLengthM,
      interval,
      leftSupport: elements.spliceLeftSupportSelect.value,
      rightSupport: elements.spliceRightSupportSelect.value
    });

    const withinFeasibleZone = interval.feasible
      && splicePositionM >= interval.minimumM - 1e-9
      && splicePositionM <= interval.maximumM + 1e-9;

    elements.spliceResultCards.innerHTML = [
      resultCard('Stock pieces required', String(plan.pieces), `${plan.spliceCount} splice${plan.spliceCount === 1 ? '' : 's'} minimum`),
      resultCard('Moment at selected splice', `${format(actions.momentMagnitudeKNm, 3)} kN·m`, `signed ${format(actions.momentKNm, 3)} kN·m`),
      resultCard('Shear at selected splice', `${format(actions.shearMagnitudeKN, 3)} kN`, `signed ${format(actions.shearKN, 3)} kN`),
      resultCard('Governing splice utilisation', demand.governingRatio == null ? 'UNRATED' : `${format(demand.governingRatio * 100, 1)}%`, demand.governingMode)
    ].join('');

    renderDefinition(elements.stockPlanResults, [
      ['Required assembled length', `${format(lengthM, 3)} m`],
      ['Available stock length', `${format(stockLengthM, 3)} m`],
      ['Main-member overlap per splice', `${format(overlapM, 3)} m`],
      ['Minimum stock pieces', String(plan.pieces)],
      ['Minimum splice count', String(plan.spliceCount)],
      ['Total purchased length', `${format(plan.totalPurchasedLengthM, 3)} m`],
      ['Piece length consumed', `${format(plan.totalUsedPieceLengthM, 3)} m`],
      ['Theoretical offcut / waste', `${format(plan.wasteLengthM, 3)} m`],
      ['Single-splice feasible zone', interval.feasible ? `${format(interval.minimumM, 3)}–${format(interval.maximumM, 3)} m` : 'none'],
      ['Suggested selected-zone position', suggestion.recommended ? `${format(suggestion.recommended.xM, 3)} m` : 'not available']
    ]);

    renderDefinition(elements.spliceDemandResults, [
      ['Splice family', spliceTypeLabel()],
      ['Selected splice centre', `${format(splicePositionM, 3)} m`],
      ['Selected position stock-feasible', plan.pieces === 2 ? (withinFeasibleZone ? 'yes' : 'no') : 'single-splice check not applicable'],
      ['Local bending moment |M|', `${format(actions.momentMagnitudeKNm, 4)} kN·m`],
      ['Local shear |V|', `${format(actions.shearMagnitudeKN, 4)} kN`],
      ['Assumed moment capacity', momentCapacityKNm ? `${format(momentCapacityKNm, 3)} kN·m` : 'not entered'],
      ['Assumed shear capacity', shearCapacityKN ? `${format(shearCapacityKN, 3)} kN` : 'not entered'],
      ['Estimated joint rotation', demand.estimatedRotationRad == null ? 'stiffness not entered' : `${format(demand.estimatedRotationRad, 6)} rad`],
      ['Estimated shear slip', demand.estimatedShearSlipMm == null ? 'stiffness not entered' : `${format(demand.estimatedShearSlipMm, 4)} mm`]
    ]);

    if (plan.pieces > 2) {
      setStateBanner({
        severity: 'warning',
        title: 'MULTIPLE SPLICES REQUIRED',
        message: `The stock planner requires ${plan.pieces} pieces and ${plan.spliceCount} splices. SP-001 currently checks one selected splice; multi-splice placement and interaction follow next.`
      });
    } else if (plan.pieces === 2 && !withinFeasibleZone) {
      setStateBanner({
        severity: 'danger',
        title: 'STOCK-LENGTH INFEASIBLE SPLICE POSITION',
        message: `The selected splice centre is outside the ${format(interval.minimumM, 2)}–${format(interval.maximumM, 2)} m zone that both available stock pieces can reach${overlapM > 0 ? ' with the entered overlap' : ''}.`
      });
    } else if (demand.state === 'exceeded') {
      setStateBanner({
        severity: 'danger',
        title: 'ASSUMED SPLICE CAPACITY EXCEEDED',
        message: `The ${demand.governingMode} demand is above the user-entered provisional capacity. The present beam curve does not yet represent splice yielding, slip growth, splitting, weld fracture, or release.`
      });
    } else if (demand.state === 'approaching') {
      setStateBanner({
        severity: 'warning',
        title: 'APPROACHING ASSUMED SPLICE CAPACITY',
        message: `The governing ${demand.governingMode} demand exceeds 80% of the user-entered provisional capacity.`
      });
    } else if (demand.state === 'unrated') {
      setStateBanner({
        severity: 'warning',
        title: plan.pieces === 1 ? 'NO SPLICE REQUIRED / CONNECTION UNRATED' : 'CONNECTION UNRATED',
        message: 'Force demand and stock feasibility are calculated, but no moment or shear capacity has been entered. Do not treat the selected splice as adequate yet.'
      });
    } else {
      setStateBanner({
        severity: 'safe',
        title: 'WITHIN USER-ENTERED SPLICE LIMITS',
        message: 'The selected local moment and shear demands are below the provisional capacities entered. Source-backed fastener/weld checks and connection-induced global deflection are still pending.'
      });
    }

    const suggestedText = suggestion.recommended
      ? `<p>The lowest-demand stock-feasible search point is <strong>${format(suggestion.recommended.xM, 2)} m</strong>, where |M| ≈ ${format(suggestion.recommended.momentMagnitudeKNm, 3)} kN·m and |V| ≈ ${format(suggestion.recommended.shearMagnitudeKN, 3)} kN.</p>`
      : '<p>No single-splice recommendation is available for the current stock plan.</p>';
    elements.spliceInterpretation.innerHTML = `
      <p><strong>${spliceTypeLabel()}</strong> is currently represented by its location, overlap/detail geometry, and user-entered force capacities/stiffnesses.</p>
      <p>The selected splice must transfer the actual local actions: <strong>|M| = ${format(actions.momentMagnitudeKNm, 3)} kN·m</strong> and <strong>|V| = ${format(actions.shearMagnitudeKN, 3)} kN</strong>. A splice near a support may reduce moment but increase shear; a midspan splice may do the opposite.</p>
      ${suggestedText}
      <p>The optimizer therefore searches only positions reachable by the entered stock lengths, then minimizes the worse of the moment and shear demand ratios. This is more defensible than always placing the splice at midspan or beside a support.</p>
      <p><strong>Current boundary:</strong> nail diameter/count, bolt layout, weld size/length, timber splitting, net section, steel local wall distortion, and nonlinear joint degradation are not calculated yet.</p>
    `;
  } catch (error) {
    elements.spliceErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.spliceErrorBanner.classList.remove('is-hidden');
    elements.spliceResultCards.innerHTML = '';
    elements.stockPlanResults.innerHTML = '';
    elements.spliceDemandResults.innerHTML = '';
    elements.spliceInterpretation.innerHTML = '<p>Correct the splice setup before analysis can continue.</p>';
    elements.spliceDiagram.replaceChildren();
    setStateBanner({ severity: 'danger', title: 'ANALYSIS SETUP ERROR', message: 'The current member, load, support, stock, or splice inputs cannot be solved.' });
  }
}

function resetSp001() {
  elements.spliceMaterialSelect.value = 'coco-uh-2007-average';
  elements.spliceLeftSupportSelect.value = 'pin';
  elements.spliceRightSupportSelect.value = 'roller';
  syncMaterial({ resetGeometry: true });
}

populateMaterials();
resetSp001();

elements.spliceMaterialSelect.addEventListener('change', () => syncMaterial({ resetGeometry: true }));
elements.spliceTypeSelect.addEventListener('change', applySpliceTypeDefaults);
elements.spliceResetButton.addEventListener('click', resetSp001);

elements.splicePositionRange.addEventListener('input', () => {
  elements.splicePositionInput.value = elements.splicePositionRange.value;
  analyse();
});
elements.splicePositionInput.addEventListener('input', () => {
  elements.splicePositionRange.value = elements.splicePositionInput.value;
  analyse();
});

elements.useSuggestedSpliceButton.addEventListener('click', () => {
  const recommended = Number(elements.useSuggestedSpliceButton.dataset.recommended);
  if (!Number.isFinite(recommended)) return;
  elements.splicePositionInput.value = recommended.toFixed(2);
  elements.splicePositionRange.value = recommended.toFixed(2);
  analyse();
});

for (const id of [
  'assembledLengthInput', 'stockLengthInput', 'spliceOverlapInput', 'spliceDetailLengthInput',
  'spliceWidthInput', 'spliceDepthInput', 'spliceThicknessInput', 'spliceLeftSupportSelect',
  'spliceRightSupportSelect', 'spliceLoadInput', 'spliceLoadPositionInput',
  'spliceMomentCapacityInput', 'spliceShearCapacityInput', 'spliceRotationalStiffnessInput',
  'spliceShearStiffnessInput'
]) {
  elements[id].addEventListener('input', analyse);
  elements[id].addEventListener('change', analyse);
}
