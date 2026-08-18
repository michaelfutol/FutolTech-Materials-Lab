import {
  createNF001Model,
  rectangularSectionProperties,
  solveFrame2D,
  solveFrame2DPDelta,
  solveFrameWithConnectionRedistribution
} from './solver/frame2d.js';

const ids = [
  'frameWidthInput','frameHeightInput','frameEInput','frameMemberWidthInput','frameMemberDepthInput',
  'frameLateralLoadInput','frameGravityLoadInput','frameAnalysisSelect','frameJointTypeSelect',
  'frameSpringStiffnessLabel','frameSpringStiffnessInput','frameSpringEvidenceLabel','frameSpringEvidenceSelect',
  'frameSpringSourceLabel','frameSpringSourceInput','frameMomentLimitLabel','frameMomentLimitInput',
  'frameResidualRatioLabel','frameResidualRatioInput','frameJointEvidence','frameResetButton','frameRunButton',
  'frameErrorBanner','frameStateBanner','frameDiagram','frameResultCards','frameCalculationTrace',
  'frameJointInterpretation','frameElementBody','frameConnectionBody','frameRedistributionSection',
  'frameRedistributionEvents','frameSourceCard'
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
if (Object.values(el).some((node) => !node)) throw new Error('NF-001 Frame Analyzer cannot find required page controls.');

let lastAnalysis = null;

function number(input) { return Number(input.value); }
function format(value, decimals = 3) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function jointEvidence() {
  const type = el.frameJointTypeSelect.value;
  if (type !== 'spring') return {
    status: type === 'rigid' ? 'IDEALIZED RIGID' : 'IDEALIZED PIN',
    className: 'is-warning',
    note: `${type === 'rigid' ? 'Rigid continuity' : 'Zero end moment'} is an explicit analytical idealization, not a measured connection law.`
  };
  const evidence = el.frameSpringEvidenceSelect.value;
  const source = el.frameSpringSourceInput.value.trim();
  if (evidence !== 'sensitivity' && !source) throw new Error('Enter the source/test/CAL reference for a semi-rigid stiffness that is not merely a sensitivity input.');
  const labels = {
    sensitivity: 'UNVERIFIED SENSITIVITY',
    measured: 'USER-MEASURED / UNVERIFIED',
    research: 'USER-SUPPLIED RESEARCH',
    calibration: 'USER-SUPPLIED CAL VALUE'
  };
  return {
    status: labels[evidence],
    className: evidence === 'sensitivity' ? 'is-warning' : 'is-good',
    note: evidence === 'sensitivity'
      ? 'kθ is an arbitrary sensitivity variable. Do not treat it as connection evidence.'
      : `kθ is tagged as ${labels[evidence].toLowerCase()}; Structural Lab records the supplied provenance but does not independently validate it.${source ? ` Reference: ${source}` : ''}`
  };
}

function syncJointControls() {
  const spring = el.frameJointTypeSelect.value === 'spring';
  const redistribution = el.frameAnalysisSelect.value === 'redistribution';
  for (const label of [el.frameSpringStiffnessLabel, el.frameSpringEvidenceLabel, el.frameSpringSourceLabel]) label.classList.toggle('is-hidden', !spring);
  el.frameMomentLimitLabel.classList.toggle('is-hidden', !(spring && redistribution));
  el.frameResidualRatioLabel.classList.toggle('is-hidden', !(spring && redistribution));
  let info;
  try { info = jointEvidence(); }
  catch (error) { info = { status: 'SOURCE REQUIRED', className: 'is-warning', note: error.message }; }
  el.frameJointEvidence.innerHTML = `<strong>Joint evidence <span class="frame-evidence-badge ${info.className}">${escapeHtml(info.status)}</span></strong><p>${escapeHtml(info.note)}</p>`;
}

function inputs() {
  const jointType = el.frameJointTypeSelect.value;
  const analysis = el.frameAnalysisSelect.value;
  const evidence = jointEvidence();
  const options = {
    widthM: number(el.frameWidthInput),
    heightM: number(el.frameHeightInput),
    elasticModulusMPa: number(el.frameEInput),
    memberWidthMm: number(el.frameMemberWidthInput),
    memberDepthMm: number(el.frameMemberDepthInput),
    lateralLoadKN: number(el.frameLateralLoadInput),
    gravityLoadKN: number(el.frameGravityLoadInput),
    topJointType: jointType
  };
  if (jointType === 'spring') options.topJointKThetaKNmPerRad = number(el.frameSpringStiffnessInput);
  if (analysis === 'redistribution') {
    if (jointType !== 'spring') throw new Error('Connection redistribution requires an explicit semi-rigid spring model.');
    if (el.frameMomentLimitInput.value === '' || el.frameResidualRatioInput.value === '') throw new Error('Redistribution requires an explicit connection moment limit and residual stiffness ratio.');
    options.topJointMomentLimitKNm = number(el.frameMomentLimitInput);
    options.postLimitStiffnessRatio = number(el.frameResidualRatioInput);
  }
  return { options, analysis, evidence };
}

function baseReactionTotals(result) {
  return result.reactions.reduce((sum, reaction) => ({
    fxKN: sum.fxKN + reaction.fxKN,
    fyKN: sum.fyKN + reaction.fyKN,
    mzKNm: sum.mzKNm + reaction.mzKNm
  }), { fxKN: 0, fyKN: 0, mzKNm: 0 });
}

function equilibrium(result, model) {
  const reactions = baseReactionTotals(result);
  const loads = model.nodes.reduce((sum, node) => ({
    fxKN: sum.fxKN + Number(node.loads?.fxKN ?? 0),
    fyKN: sum.fyKN + Number(node.loads?.fyKN ?? 0),
    mzKNm: sum.mzKNm + Number(node.loads?.mzKNm ?? 0),
    momentAboutOriginKNm: sum.momentAboutOriginKNm
      + Number(node.loads?.mzKNm ?? 0)
      + Number(node.xM) * Number(node.loads?.fyKN ?? 0)
      - Number(node.yM) * Number(node.loads?.fxKN ?? 0)
  }), { fxKN: 0, fyKN: 0, mzKNm: 0, momentAboutOriginKNm: 0 });
  const reactionMomentAboutOrigin = model.nodes.reduce((sum, node) => {
    const reaction = result.reactions.find((item) => item.id === node.id);
    return sum + reaction.mzKNm + Number(node.xM) * reaction.fyKN - Number(node.yM) * reaction.fxKN;
  }, 0);
  return {
    reactions,
    loads,
    residualFxKN: reactions.fxKN + loads.fxKN,
    residualFyKN: reactions.fyKN + loads.fyKN,
    residualMomentKNm: reactionMomentAboutOrigin + loads.momentAboutOriginKNm
  };
}

function maxEndMoment(result) {
  return Math.max(...result.elements.flatMap((member) => [Math.abs(member.endMomentIKNm), Math.abs(member.endMomentJKNm)]), 0);
}

function roofDrift(result, model) {
  const maxY = Math.max(...model.nodes.map((node) => Number(node.yM)));
  const roofIds = model.nodes.filter((node) => Math.abs(Number(node.yM) - maxY) < 1e-9).map((node) => node.id);
  const roofNodes = result.nodes.filter((node) => roofIds.includes(node.id));
  const meanUxMm = roofNodes.reduce((sum, node) => sum + node.uxMm, 0) / roofNodes.length;
  return { meanUxMm, ratio: Math.abs(meanUxMm) / (maxY * 1000), inverse: Math.abs(meanUxMm) > 1e-12 ? maxY * 1000 / Math.abs(meanUxMm) : Infinity };
}

function stateCopy(analysis, result, redistribution) {
  if (analysis === 'redistribution') {
    if (redistribution.mechanism) return { className: 'is-danger', text: `MECHANISM / SINGULAR STATE AFTER CONNECTION EVENT · ${redistribution.events.length} event(s)` };
    return { className: 'is-warning', text: `PIECEWISE ELASTIC REDISTRIBUTION · ${redistribution.events.length} explicit connection event(s)` };
  }
  if (analysis === 'pdelta') return { className: result.translationAmplification > 1.1 ? 'is-warning' : '', text: `SECOND-ORDER ELASTIC P–Δ · converged in ${result.iterations} iteration(s) · displacement amplification ${format(result.translationAmplification, 3)}×` };
  return { className: '', text: 'FIRST-ORDER ELASTIC FRAME RESPONSE' };
}

function renderCards(result, model, analysis, redistribution = null) {
  const eq = equilibrium(result, model);
  const drift = roofDrift(result, model);
  const maxConnectionUse = Math.max(...result.connections.map((connection) => connection.utilization ?? 0), 0);
  const cards = [
    ['Max translation', `${format(result.maxTranslationMm)} mm`, `node ${result.maxTranslationNodeId}`],
    ['Mean roof drift', `${format(drift.meanUxMm)} mm`, Number.isFinite(drift.inverse) ? `H/${format(drift.inverse, 1)} · no code limit applied` : 'zero horizontal drift'],
    ['Base shear reaction', `${format(Math.abs(eq.reactions.fxKN))} kN`, `ΣFx residual ${format(eq.residualFxKN, 6)} kN`],
    ['Max |member end M|', `${format(maxEndMoment(result))} kN·m`, 'elastic end action'],
    ['Connection springs', `${result.connections.length}`, result.connections.length ? `max threshold use ${maxConnectionUse ? `${format(maxConnectionUse * 100, 1)}%` : 'unrated'}` : 'rigid/pin idealization only'],
    [analysis === 'pdelta' ? 'P–Δ amplification' : analysis === 'redistribution' ? 'Connection events' : 'Analysis order', analysis === 'pdelta' ? `${format(result.translationAmplification, 3)}×` : analysis === 'redistribution' ? `${redistribution.events.length}` : '1st', analysis === 'pdelta' ? result.boundary : analysis === 'redistribution' ? redistribution.boundary : 'linear elastic stiffness solution']
  ];
  el.frameResultCards.innerHTML = cards.map(([label, value, note]) => `<article class="result-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`).join('');
}

function diagramPoint(node, resultNode, bounds, magnification) {
  const padX = 120, padY = 82, plotW = 650, plotH = 350;
  const xScale = plotW / Math.max(bounds.maxX, 0.1);
  const yScale = plotH / Math.max(bounds.maxY, 0.1);
  const scale = Math.min(xScale, yScale);
  const x = padX + Number(node.xM) * scale;
  const y = 450 - Number(node.yM) * scale;
  return {
    x, y,
    xd: x + (resultNode?.uxMm ?? 0) / 1000 * scale * magnification,
    yd: y - (resultNode?.uyMm ?? 0) / 1000 * scale * magnification
  };
}

function connectionGlyph(x, y, type) {
  if (type === 'spring') return `<path d="M ${x - 14} ${y} l 5 -7 l 5 14 l 5 -14 l 5 14 l 5 -7" class="frame-spring"/>`;
  if (type === 'pin') return `<circle cx="${x}" cy="${y}" r="8" class="frame-pin"/>`;
  return '';
}

function renderDiagram(result, model, jointType) {
  const bounds = { maxX: Math.max(...model.nodes.map((node) => Number(node.xM))), maxY: Math.max(...model.nodes.map((node) => Number(node.yM))) };
  const maxDisp = Math.max(result.maxTranslationMm, 1e-9);
  const geometryPixelPerM = Math.min(650 / Math.max(bounds.maxX, .1), 350 / Math.max(bounds.maxY, .1));
  const rawPixelsAt1 = maxDisp / 1000 * geometryPixelPerM;
  const magnification = Math.min(100, Math.max(1, 55 / Math.max(rawPixelsAt1, .01)));
  const nodeMap = new Map(model.nodes.map((node) => {
    const resultNode = result.nodes.find((item) => item.id === node.id);
    return [node.id, diagramPoint(node, resultNode, bounds, magnification)];
  }));
  const defs = '<defs><marker id="frameArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#ff8a7f"/></marker></defs>';
  const grid = `<line x1="120" y1="450" x2="770" y2="450" class="frame-gridline"/><line x1="120" y1="100" x2="120" y2="450" class="frame-gridline"/>`;
  const undeformed = model.elements.map((member) => {
    const a = nodeMap.get(member.nodeI), b = nodeMap.get(member.nodeJ);
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="frame-member-base"><title>${escapeHtml(member.id)} undeformed</title></line>`;
  }).join('');
  const deformed = model.elements.map((member) => {
    const a = nodeMap.get(member.nodeI), b = nodeMap.get(member.nodeJ);
    return `<line x1="${a.xd}" y1="${a.yd}" x2="${b.xd}" y2="${b.yd}" class="frame-member-deformed"><title>${escapeHtml(member.id)} deformed · ${format(magnification,1)}× display</title></line>`;
  }).join('');
  const nodes = model.nodes.map((node) => {
    const p = nodeMap.get(node.id);
    return `<circle cx="${p.xd}" cy="${p.yd}" r="5" class="frame-node"/><text x="${p.xd + 9}" y="${p.yd - 9}" class="frame-label">${escapeHtml(node.id)}</text>`;
  }).join('');
  const baseNodes = model.nodes.filter((node) => node.restraints?.ux && node.restraints?.uy).map((node) => {
    const p = nodeMap.get(node.id); return `<rect x="${p.x - 24}" y="${p.y + 7}" width="48" height="9" class="frame-support"/>`;
  }).join('');
  const topNodes = model.nodes.filter((node) => !node.restraints?.ux && Number(node.yM) > 0).map((node) => {
    const p = nodeMap.get(node.id); return connectionGlyph(p.x, p.y, jointType);
  }).join('');
  const loadedNode = model.nodes.find((node) => Number(node.loads?.fxKN ?? 0) !== 0);
  const loadArrow = loadedNode ? (() => {
    const p = nodeMap.get(loadedNode.id); const sign = Math.sign(Number(loadedNode.loads.fxKN)) || 1;
    return `<line x1="${p.x - sign * 70}" y1="${p.y - 38}" x2="${p.x - sign * 8}" y2="${p.y - 38}" class="frame-load"/><text x="${p.x - sign * 72}" y="${p.y - 48}" text-anchor="${sign > 0 ? 'end' : 'start'}" class="frame-warning-label">${format(Math.abs(loadedNode.loads.fxKN))} kN lateral</text>`;
  })() : '';
  el.frameDiagram.innerHTML = `${defs}${grid}<text x="24" y="32" class="frame-label">NF-001 · grey undeformed · green deformed (${format(magnification,1)}× display)</text>${undeformed}${deformed}${baseNodes}${topNodes}${nodes}${loadArrow}<text x="24" y="500" class="frame-muted-label">Deformation magnification affects display only. Solver displacements remain physical millimetres.</text>`;
}

function renderElements(result) {
  el.frameElementBody.innerHTML = result.elements.map((member) => `<tr><td><strong>${escapeHtml(member.id)}</strong><small>${escapeHtml(member.nodeI)} → ${escapeHtml(member.nodeJ)} · ${format(member.lengthM)} m</small></td><td>${format(member.axialForceKN)} kN<small>${member.axialForceKN < 0 ? 'compression' : 'tension-positive convention'}</small></td><td>${format(member.endShearIKN)} / ${format(member.endShearJKN)} kN</td><td>${format(member.endMomentIKNm)} / ${format(member.endMomentJKNm)} kN·m</td></tr>`).join('');
}

function renderConnections(result) {
  if (!result.connections.length) {
    el.frameConnectionBody.innerHTML = '<tr><td colspan="5">No finite rotational springs in this model. Rigid/pin end conditions are explicit idealizations.</td></tr>';
    return;
  }
  el.frameConnectionBody.innerHTML = result.connections.map((connection) => `<tr><td><strong>${escapeHtml(connection.id)}</strong><small>node ${escapeHtml(connection.nodeId)}</small></td><td>${format(connection.kThetaKNmPerRad)} kN·m/rad</td><td>${format(connection.relativeRotationRad, 6)} rad</td><td>${format(connection.momentKNm)} kN·m</td><td>${connection.utilization == null ? 'UNRATED' : `${format(connection.utilization * 100, 1)}%`}<small>${connection.momentLimitKNm == null ? 'no explicit threshold supplied' : `limit ${format(connection.momentLimitKNm)} kN·m`}</small></td></tr>`).join('');
}

function renderTrace(result, model, analysis, redistribution) {
  const section = rectangularSectionProperties(number(el.frameMemberWidthInput), number(el.frameMemberDepthInput));
  const eq = equilibrium(result, model);
  const drift = roofDrift(result, model);
  el.frameCalculationTrace.innerHTML = `
    <p><strong>Section:</strong> A = b·h = ${format(number(el.frameMemberWidthInput),1)} × ${format(number(el.frameMemberDepthInput),1)} = ${format(section.areaMm2,1)} mm².</p>
    <p><strong>In-plane gross I:</strong> b·h³/12 = ${format(section.inertiaMm4,1)} mm⁴.</p>
    <p><strong>Elastic modulus:</strong> E = ${format(number(el.frameEInput),1)} MPa.</p>
    <p><strong>Equilibrium ΣFx:</strong> applied ${format(eq.loads.fxKN)} kN + reactions ${format(eq.reactions.fxKN)} kN = residual ${format(eq.residualFxKN,6)} kN.</p>
    <p><strong>Equilibrium ΣFy:</strong> applied ${format(eq.loads.fyKN)} kN + reactions ${format(eq.reactions.fyKN)} kN = residual ${format(eq.residualFyKN,6)} kN.</p>
    <p><strong>Equilibrium ΣM about origin:</strong> residual ${format(eq.residualMomentKNm,6)} kN·m.</p>
    <p><strong>Roof drift report:</strong> mean ux = ${format(drift.meanUxMm)} mm = ${Number.isFinite(drift.inverse) ? `H/${format(drift.inverse,1)}` : 'zero'}; no code drift criterion is automatically applied in NF-001.</p>
    ${analysis === 'pdelta' ? `<p><strong>P–Δ:</strong> first-order max translation ${format(result.firstOrderMaxTranslationMm)} mm → second-order ${format(result.maxTranslationMm)} mm; amplification ${format(result.translationAmplification,4)}×.</p>` : ''}
    ${analysis === 'redistribution' ? `<p><strong>Redistribution:</strong> ${redistribution.events.length} explicit threshold event(s); mechanism = ${redistribution.mechanism ? 'YES' : 'NO'}.</p>` : ''}`;
}

function renderJointInterpretation(evidence, analysis, redistribution) {
  const jointType = el.frameJointTypeSelect.value;
  const kCopy = jointType === 'spring' ? `<p><strong>kθ = ${format(number(el.frameSpringStiffnessInput))} kN·m/rad.</strong> ${escapeHtml(evidence.note)}</p>` : `<p>${escapeHtml(evidence.note)}</p>`;
  const path = analysis === 'redistribution'
    ? `<p><strong>Event path:</strong> threshold ${format(number(el.frameMomentLimitInput))} kN·m; residual stiffness ratio ${format(number(el.frameResidualRatioInput),3)}. ${escapeHtml(redistribution.boundary)}</p>`
    : analysis === 'pdelta'
      ? '<p><strong>Second-order boundary:</strong> elastic geometric stiffness only. No material yielding, connection degradation or large-rotation corotational formulation.</p>'
      : '<p><strong>First-order boundary:</strong> elastic small-displacement system response.</p>';
  el.frameJointInterpretation.innerHTML = `<p><strong>${escapeHtml(evidence.status)}</strong></p>${kCopy}${path}<p>Connection Lab fastener count is deliberately not converted to stiffness or capacity here. A future calibrated connection force–rotation law may populate these inputs explicitly.</p>`;
}

function renderRedistribution(redistribution) {
  el.frameRedistributionSection.classList.toggle('is-hidden', !redistribution);
  if (!redistribution) { el.frameRedistributionEvents.innerHTML = ''; return; }
  if (!redistribution.events.length) {
    el.frameRedistributionEvents.innerHTML = '<div class="support-help"><strong>No supplied threshold crossed</strong><p>The target load factor reached 1.0 without crossing any explicit spring moment limit.</p></div>';
    return;
  }
  el.frameRedistributionEvents.innerHTML = `<div class="frame-event-list">${redistribution.events.map((event) => `<article class="frame-event"><strong>#${event.sequence}</strong><div><b>${escapeHtml(event.connectionId)} · load factor ${format(event.loadFactor,4)}</b><p>|M| reached explicit ${format(event.momentLimitKNm)} kN·m threshold. kθ ${format(event.oldKThetaKNmPerRad)} → ${format(event.newKThetaKNmPerRad)} kN·m/rad (${escapeHtml(event.stateAfter)}). Max translation ${format(event.maxTranslationBeforeMm)} → ${event.maxTranslationAfterMm == null ? 'mechanism' : format(event.maxTranslationAfterMm)} mm.</p></div><span>${event.mechanismAfter ? 'MECHANISM' : 'REDISTRIBUTED'}</span></article>`).join('')}</div>${redistribution.mechanism ? `<div class="error-banner"><strong>Mechanism / singular state:</strong> ${escapeHtml(redistribution.mechanismMessage)}</div>` : ''}`;
}

function renderSource(model, evidence, analysis) {
  el.frameSourceCard.innerHTML = `<p class="eyebrow">NF-001 provenance and limits</p><strong>${escapeHtml(model.description)}</strong><p>${escapeHtml(model.evidenceBoundary)}</p><p><b>Joint state:</b> ${escapeHtml(evidence.status)}${el.frameJointTypeSelect.value === 'spring' && el.frameSpringSourceInput.value.trim() ? ` · ${escapeHtml(el.frameSpringSourceInput.value.trim())}` : ''}.</p><p><b>Analysis:</b> ${escapeHtml(analysis === 'pdelta' ? 'elastic P–Δ geometric-stiffness iteration' : analysis === 'redistribution' ? 'first-order piecewise-elastic connection redistribution' : 'first-order elastic frame stiffness')}. NF-001 is not a code design or complete wall-system load-path certification.</p>`;
}

function analyze() {
  try {
    el.frameErrorBanner.classList.add('is-hidden');
    el.frameErrorBanner.textContent = '';
    const { options, analysis, evidence } = inputs();
    const model = createNF001Model(options);
    let result;
    let redistribution = null;
    if (analysis === 'pdelta') result = solveFrame2DPDelta(model);
    else if (analysis === 'redistribution') {
      redistribution = solveFrameWithConnectionRedistribution(model);
      result = redistribution.finalResult;
      if (!result) {
        // Preserve a physically readable pre-event/initial response when the released system is a mechanism.
        result = solveFrame2D(model);
      }
    } else result = solveFrame2D(model);
    lastAnalysis = { model, result, redistribution, analysis, evidence };
    const state = stateCopy(analysis, result, redistribution);
    el.frameStateBanner.className = `frame-state ${state.className}`;
    el.frameStateBanner.textContent = state.text;
    renderCards(result, model, analysis, redistribution);
    renderDiagram(result, model, el.frameJointTypeSelect.value);
    renderElements(result);
    renderConnections(result);
    renderTrace(result, model, analysis, redistribution);
    renderJointInterpretation(evidence, analysis, redistribution);
    renderRedistribution(redistribution);
    renderSource(model, evidence, analysis);
    document.documentElement.dataset.frameState = redistribution?.mechanism ? 'mechanism' : 'analyzed';
  } catch (error) {
    lastAnalysis = null;
    delete document.documentElement.dataset.frameState;
    el.frameErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    el.frameErrorBanner.classList.remove('is-hidden');
  }
}

function reset() {
  el.frameWidthInput.value = '3';
  el.frameHeightInput.value = '3';
  el.frameEInput.value = '13100';
  el.frameMemberWidthInput.value = '50';
  el.frameMemberDepthInput.value = '100';
  el.frameLateralLoadInput.value = '1';
  el.frameGravityLoadInput.value = '0';
  el.frameAnalysisSelect.value = 'first-order';
  el.frameJointTypeSelect.value = 'rigid';
  el.frameSpringStiffnessInput.value = '';
  el.frameSpringEvidenceSelect.value = 'sensitivity';
  el.frameSpringSourceInput.value = '';
  el.frameMomentLimitInput.value = '';
  el.frameResidualRatioInput.value = '';
  syncJointControls();
  analyze();
}

for (const input of [el.frameJointTypeSelect, el.frameAnalysisSelect, el.frameSpringEvidenceSelect]) input.addEventListener('change', syncJointControls);
el.frameRunButton.addEventListener('click', analyze);
el.frameResetButton.addEventListener('click', reset);
reset();
