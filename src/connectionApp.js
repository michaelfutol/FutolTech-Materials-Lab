import {
  FPL_CONNECTION_SOURCE,
  smoothNailWithdrawalReference,
  annularNailWithdrawalReference,
  nailLateralProportionalLimit,
  boltDowelBearingReference,
  boltSpacingScreen,
  arithmeticFastenerGroupUpperBound
} from './solver/connectionResearch.js';

const $ = (id) => document.getElementById(id);
const els = {
  nailMode: $('nailModeButton'), boltMode: $('boltModeButton'), reset: $('connectionResetButton'),
  woodClass: $('connectionWoodClassSelect'), g: $('connectionSpecificGravityInput'), demand: $('connectionDemandInput'), count: $('connectionFastenerCountInput'),
  nailFields: $('nailFields'), boltFields: $('boltFields'), nailType: $('nailTypeSelect'), nailD: $('nailDiameterInput'), nailL: $('nailPenetrationInput'), nailDuration: $('nailDurationSelect'),
  boltSide: $('boltSideMemberSelect'), boltD: $('boltDiameterInput'), boltL: $('boltBearingThicknessInput'), boltTheta: $('boltLoadAngleSelect'), boltLoadCase: $('boltLoadCaseSelect'), boltSpacing: $('boltSpacingInput'), boltEnd: $('boltEndDistanceInput'), boltEdge: $('boltEdgeDistanceInput'), plateLabel: $('steelPlateThicknessLabel'), plateT: $('steelPlateThicknessInput'),
  title: $('connectionResultTitle'), state: $('connectionStateBanner'), diagram: $('connectionDiagram'), cards: $('connectionResultCards'), trace: $('connectionCalculationTrace'), geometry: $('connectionGeometryChecks'), source: $('connectionSourceCard')
};

let mode = 'nail';
const n = (input) => Number(input.value);
const fmt = (value, digits = 3) => Number.isFinite(value) ? Number(value).toFixed(digits) : '—';

function stateClass(level) {
  return level === 'danger' ? 'connection-state connection-state--danger' : level === 'warning' ? 'connection-state connection-state--warning' : 'connection-state';
}

function renderSource() {
  els.source.innerHTML = `<p class="eyebrow">Primary research source</p><strong>${FPL_CONNECTION_SOURCE.organization}</strong><p>${FPL_CONNECTION_SOURCE.citation}</p><p>${FPL_CONNECTION_SOURCE.boundary}</p><p><strong>Current design cross-check:</strong> American Wood Council Connection Calculator / governing NDS edition for project design values and full dowel-yield modes.</p>`;
}

function arrowDefs() {
  return `<defs><marker id="connectionArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#f1c56a" /></marker></defs>`;
}

function fastenerCircles(count, y = 150) {
  const capped = Math.min(12, Math.max(1, count));
  const start = 330;
  const end = 570;
  const dx = capped === 1 ? 0 : (end - start) / (capped - 1);
  return Array.from({ length: capped }, (_, i) => `<circle class="connection-fastener" cx="${capped === 1 ? 450 : start + i * dx}" cy="${y}" r="9" />`).join('');
}

function drawNail(count) {
  els.diagram.innerHTML = `${arrowDefs()}<rect class="connection-member" x="130" y="105" width="640" height="90" rx="8"/><rect class="connection-member" x="250" y="80" width="400" height="38" rx="5"/>${fastenerCircles(count,118)}<line class="connection-load" x1="450" y1="35" x2="450" y2="78"/><text class="connection-label" x="145" y="220">timber main member</text><text class="connection-label" x="260" y="70">side member / scab</text><text class="connection-label" x="470" y="38">demand</text>`;
}

function drawBolt(count, steelSide) {
  const side = steelSide ? `<rect class="connection-plate" x="235" y="80" width="430" height="22" rx="3"/><text class="connection-label" x="245" y="68">steel side plate / strap</text>` : `<rect class="connection-member" x="235" y="75" width="430" height="36" rx="5"/><text class="connection-label" x="245" y="64">wood side member</text>`;
  els.diagram.innerHTML = `${arrowDefs()}<rect class="connection-member" x="130" y="112" width="640" height="92" rx="8"/>${side}${fastenerCircles(count,101)}<line class="connection-load" x1="450" y1="32" x2="450" y2="72"/><line class="connection-dim" x1="300" y1="230" x2="600" y2="230"/><text class="connection-label" x="145" y="225">wood bearing member</text><text class="connection-label" x="470" y="36">demand</text>`;
}

function card(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function check(label, pass, detail) {
  const cls = pass == null ? 'warn' : pass ? 'pass' : 'fail';
  const text = pass == null ? 'VERIFY' : pass ? 'OK' : 'NOT OK';
  return `<div class="connection-check connection-check--${cls}"><strong>${text}</strong> ${label}<br/><small>${detail}</small></div>`;
}

function renderNail() {
  const G = n(els.g), D = n(els.nailD), L = n(els.nailL), count = Math.trunc(n(els.count)), demand = n(els.demand);
  drawNail(count);
  const smooth = els.nailType.value === 'smooth';
  const withdrawal = smooth
    ? smoothNailWithdrawalReference({ specificGravity: G, diameterMm: D, penetrationMm: L, duration: els.nailDuration.value === 'normal' ? 'normal' : 'long-term' })
    : annularNailWithdrawalReference({ specificGravity: G, diameterMm: D, penetrationMm: L });
  const lateral = nailLateralProportionalLimit({ woodClass: els.woodClass.value, specificGravity: G, diameterMm: D, penetrationMm: L });
  const singleReference = smooth ? withdrawal.selectedReferenceKN : withdrawal.maximumKN;
  const group = arithmeticFastenerGroupUpperBound(singleReference, count);
  const demandRatio = group.arithmeticSumKN > 0 ? demand / group.arithmeticSumKN : null;

  const classified = els.woodClass.value !== 'unclassified';
  const screeningWithin = classified && smooth && demandRatio <= 1 && (!lateral.available || lateral.penetrationPass !== false);
  els.state.className = stateClass(!classified ? 'warning' : demandRatio > 1 ? 'danger' : 'warning');
  els.state.textContent = !classified
    ? 'SCREENING BOUNDARY — coconut palm / unclassified material is not silently mapped to the FPL hardwood/softwood lateral K table.'
    : screeningWithin
      ? 'SCREENING — demand is below the arithmetic withdrawal reference, but group action/splitting/current NDS design are still unverified.'
      : 'SCREENING — one or more research references or geometry conditions require attention.';

  els.cards.innerHTML = [
    card('Single-fastener withdrawal', `${fmt(singleReference)} kN`, smooth ? 'selected handbook reference' : 'maximum annular research value'),
    card('Arithmetic n× reference', `${fmt(group.arithmeticSumKN)} kN`, 'not a group design capacity'),
    card('Demand / arithmetic reference', Number.isFinite(demandRatio) ? `${fmt(demandRatio * 100, 1)}%` : '—'),
    card('Lateral proportional-limit', lateral.available ? `${fmt(lateral.proportionalLimitKN)} kN / nail` : 'UNAVAILABLE', lateral.available ? 'historic ~0.38 mm slip reference' : 'classification/range not supported')
  ].join('');

  els.trace.innerHTML = smooth
    ? `<p><b>Withdrawal maximum:</b> p = 54.12 G^2.5 D L</p><p>p = 54.12(${fmt(G,2)})^2.5(${fmt(D,2)})(${fmt(L,1)}) = ${fmt(withdrawal.maximumKN)} kN</p><p>Long-time reference = p/6 = ${fmt(withdrawal.longTermReferenceKN)} kN</p><p>Normal-duration reference = 1.10(p/6) = ${fmt(withdrawal.normalDurationReferenceKN)} kN</p><p>Arithmetic ${count} fasteners = ${count} × ${fmt(singleReference)} = ${fmt(group.arithmeticSumKN)} kN <b>(upper-bound arithmetic only)</b></p>`
    : `<p><b>Annular-thread maximum:</b> p = 77.57 G² D L</p><p>p = 77.57(${fmt(G,2)})²(${fmt(D,2)})(${fmt(L,1)}) = ${fmt(withdrawal.maximumKN)} kN</p><p>No allowable/design reduction is inferred here for the annular case.</p>`;

  els.geometry.innerHTML = [
    check('Wood classification', classified ? true : null, classified ? `${els.woodClass.value} selected by user; verify species applicability.` : 'Coconut palm/unclassified material needs its own validated connection calibration.'),
    check('Recommended nail penetration', lateral.penetration ? L >= lateral.penetration.minimumPenetrationMm : null, lateral.penetration ? `Provided ${fmt(L,1)} mm; research recommendation ≈ ${fmt(lateral.penetration.minimumPenetrationMm,1)} mm (${fmt(lateral.penetration.multiplier,1)}D).` : 'Not available.'),
    check('Multiple-fastener group action', null, group.boundary)
  ].join('');
}

function renderBolt() {
  const G = n(els.g), D = n(els.boltD), L = n(els.boltL), count = Math.trunc(n(els.count)), demand = n(els.demand), theta = n(els.boltTheta);
  const steelSide = els.boltSide.value === 'steel';
  drawBolt(count, steelSide);
  const bearing = boltDowelBearingReference({ specificGravity: G, diameterMm: D, loadToGrainDeg: theta, memberThicknessMm: L });
  const spacing = boltSpacingScreen({ woodClass: els.woodClass.value, diameterMm: D, spacingAlongGrainMm: n(els.boltSpacing), loadedEndDistanceMm: n(els.boltEnd), edgeDistanceMm: n(els.boltEdge), loadCase: els.boltLoadCase.value, loadToGrainDeg: theta });
  const arithmetic = arithmeticFastenerGroupUpperBound(bearing.bearingCeilingKN, count);
  const ratio = demand / arithmetic.arithmeticSumKN;
  const geometryPass = spacing.spacingPass && spacing.edgeDistancePass && spacing.endDistancePass !== false;
  els.state.className = stateClass(ratio > 1 || !geometryPass ? 'danger' : 'warning');
  els.state.textContent = ratio > 1 || !geometryPass
    ? 'SCREENING — demand or spacing exceeds a research component/reference. Full bolt yield-mode design is still required.'
    : 'SCREENING — demand is below the arithmetic wood-bearing ceiling and shown spacing checks, but this is not a complete bolted-connection design.';

  els.cards.innerHTML = [
    card('Wood dowel-bearing Feθ', `${fmt(bearing.bearingMPa,2)} MPa`, `θ = ${theta}°`),
    card('Wood bearing ceiling / bolt', `${fmt(bearing.bearingCeilingKN)} kN`, 'component only; bolt bending omitted'),
    card('Arithmetic n× ceiling', `${fmt(arithmetic.arithmeticSumKN)} kN`, 'not a group design capacity'),
    card('Demand / arithmetic ceiling', `${fmt(ratio * 100,1)}%`)
  ].join('');

  els.trace.innerHTML = `<p>Fe∥ = 77.2G = 77.2(${fmt(G,2)}) = ${fmt(bearing.parallelMPa,2)} MPa</p><p>Fe⊥ = 212 G^1.45 D^-0.5 = ${fmt(bearing.perpendicularMPa,2)} MPa</p><p>Feθ = P Q / (P sin²θ + Q cos²θ) = ${fmt(bearing.bearingMPa,2)} MPa</p><p>Projected wood bearing area = L D = ${fmt(L,1)} × ${fmt(D,2)} = ${fmt(bearing.projectedAreaMm2,1)} mm²</p><p>Wood bearing component ceiling = FeθLD = ${fmt(bearing.bearingCeilingKN)} kN / bolt</p><p>${count} × bearing ceiling = ${fmt(arithmetic.arithmeticSumKN)} kN <b>(arithmetic ceiling only)</b></p>`;

  els.geometry.innerHTML = [
    check('Spacing along grain', spacing.spacingPass, `Provided ${fmt(n(els.boltSpacing),1)} mm; research minimum ${fmt(spacing.minimumSpacingMm,1)} mm = 4D.`),
    check('Loaded end distance', spacing.endDistancePass, spacing.minimumEndDistanceMm == null ? spacing.boundary : `Provided ${fmt(n(els.boltEnd),1)} mm; research minimum ${fmt(spacing.minimumEndDistanceMm,1)} mm.`),
    check('Edge distance', spacing.edgeDistancePass, `Provided ${fmt(n(els.boltEdge),1)} mm; research minimum ${fmt(spacing.minimumEdgeDistanceMm,1)} mm for this load direction.`),
    check('Fastener yield / group effects', null, bearing.boundary),
    check('Steel plate / strap capacity', steelSide ? null : true, steelSide ? `Plate thickness ${fmt(n(els.plateT),1)} mm recorded only. Plate bearing, net section, tear-out and bolt interaction are not yet calculated.` : 'No steel side plate selected.')
  ].join('');
}

function render() {
  try {
    els.nailFields.classList.toggle('is-hidden', mode !== 'nail');
    els.boltFields.classList.toggle('is-hidden', mode !== 'bolt');
    els.plateLabel.classList.toggle('is-hidden', mode !== 'bolt' || els.boltSide.value !== 'steel');
    els.nailMode.classList.toggle('is-active', mode === 'nail');
    els.boltMode.classList.toggle('is-active', mode === 'bolt');
    els.title.textContent = mode === 'nail' ? 'Nail research screen' : 'Bolt / steel-plate research screen';
    if (mode === 'nail') renderNail(); else renderBolt();
  } catch (error) {
    els.state.className = stateClass('danger');
    els.state.textContent = error.message;
    els.cards.innerHTML = '';
    els.trace.innerHTML = '';
    els.geometry.innerHTML = '';
  }
}

els.nailMode.addEventListener('click', () => { mode = 'nail'; render(); });
els.boltMode.addEventListener('click', () => { mode = 'bolt'; render(); });
els.reset.addEventListener('click', () => {
  mode = 'nail';
  els.woodClass.value = 'unclassified'; els.g.value = '0.55'; els.demand.value = '1'; els.count.value = '4';
  els.nailType.value = 'smooth'; els.nailD.value = '3.33'; els.nailL.value = '50'; els.nailDuration.value = 'long-term';
  els.boltSide.value = 'wood'; els.boltD.value = '12.7'; els.boltL.value = '50'; els.boltTheta.value = '0'; els.boltLoadCase.value = 'tension'; els.boltSpacing.value = '80'; els.boltEnd.value = '90'; els.boltEdge.value = '25'; els.plateT.value = '3';
  render();
});

document.querySelector('.connection-controls').addEventListener('input', render);
document.querySelector('.connection-controls').addEventListener('change', render);
renderSource();
render();
