import {
  createNF001Model,
  rectangularSectionProperties,
  solveFrame2D,
  solveFrame2DPDelta,
  solveFrameWithConnectionRedistribution
} from './solver/frame2d.js';
import { addNF001DiagonalBrace, evaluateNF001BraceSensitivity } from './solver/braceSensitivity.js';

const ids = [
  'frameWidthInput','frameHeightInput','frameEInput','frameMemberWidthInput','frameMemberDepthInput',
  'frameLateralLoadInput','frameGravityLoadInput','frameAnalysisSelect','frameJointTypeSelect',
  'frameSpringStiffnessLabel','frameSpringStiffnessInput','frameSpringEvidenceLabel','frameSpringEvidenceSelect',
  'frameSpringSourceLabel','frameSpringSourceInput','frameMomentLimitLabel','frameMomentLimitInput',
  'frameResidualRatioLabel','frameResidualRatioInput','frameJointEvidence',
  'frameBraceSelect','frameBraceELabel','frameBraceEInput','frameBraceAreaLabel','frameBraceAreaInput',
  'frameBraceEvidenceLabel','frameBraceEvidenceSelect','frameBraceSourceLabel','frameBraceSourceInput','frameBraceEvidence',
  'frameResetButton','frameRunButton','frameErrorBanner','frameStateBanner','frameDiagram','frameResultCards',
  'frameCalculationTrace','frameJointInterpretation','frameBraceAdviserSection','frameBraceAdviser','frameElementBody',
  'frameConnectionBody','frameRedistributionSection','frameRedistributionEvents','frameSourceCard'
];
const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
if (Object.values(el).some((node) => !node)) throw new Error('NF-001 Frame Analyzer cannot find required page controls.');

function num(input) { return Number(input.value); }
function format(value, decimals = 3) {
  if (!Number.isFinite(value)) return '—';
  const clean = Math.abs(value) < 1e-12 ? 0 : value;
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(clean);
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

const evidenceLabels = {
  sensitivity: 'UNVERIFIED SENSITIVITY',
  measured: 'USER-MEASURED / UNVERIFIED',
  research: 'USER-SUPPLIED RESEARCH',
  calibration: 'USER-SUPPLIED CAL VALUE'
};

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
  return {
    status: evidenceLabels[evidence],
    className: evidence === 'sensitivity' ? 'is-warning' : 'is-good',
    note: evidence === 'sensitivity'
      ? 'kθ is an arbitrary sensitivity variable. Do not treat it as connection evidence.'
      : `kθ is tagged as ${evidenceLabels[evidence].toLowerCase()}; Structural Lab records the supplied provenance but does not independently validate it. Reference: ${source}`
  };
}

function braceEvidence() {
  if (el.frameBraceSelect.value === 'none') return { enabled: false, status: 'BRACE OFF', className: 'is-warning', note: 'No diagonal stiffness is included in the frame.' };
  const evidence = el.frameBraceEvidenceSelect.value;
  const source = el.frameBraceSourceInput.value.trim();
  if (evidence !== 'sensitivity' && !source) throw new Error('Enter the source/test/CAL reference for brace E/A properties that are not merely sensitivity inputs.');
  return {
    enabled: true,
    status: evidenceLabels[evidence],
    className: evidence === 'sensitivity' ? 'is-warning' : 'is-good',
    note: evidence === 'sensitivity'
      ? 'Brace E and area are arbitrary stiffness-sensitivity inputs. They are not brace design evidence.'
      : `Brace E/A are tagged as ${evidenceLabels[evidence].toLowerCase()}; provenance is recorded but not independently validated. Reference: ${source}`
  };
}

function syncControls() {
  const spring = el.frameJointTypeSelect.value === 'spring';
  const redistribution = el.frameAnalysisSelect.value === 'redistribution';
  for (const label of [el.frameSpringStiffnessLabel,el.frameSpringEvidenceLabel,el.frameSpringSourceLabel]) label.classList.toggle('is-hidden', !spring);
  el.frameMomentLimitLabel.classList.toggle('is-hidden', !(spring && redistribution));
  el.frameResidualRatioLabel.classList.toggle('is-hidden', !(spring && redistribution));
  const brace = el.frameBraceSelect.value !== 'none';
  for (const label of [el.frameBraceELabel,el.frameBraceAreaLabel,el.frameBraceEvidenceLabel,el.frameBraceSourceLabel]) label.classList.toggle('is-hidden', !brace);
  let joint;
  try { joint = jointEvidence(); } catch (error) { joint = { status:'SOURCE REQUIRED',className:'is-warning',note:error.message }; }
  el.frameJointEvidence.innerHTML = `<strong>Joint evidence <span class="frame-evidence-badge ${joint.className}">${escapeHtml(joint.status)}</span></strong><p>${escapeHtml(joint.note)}</p>`;
  let braceInfo;
  try { braceInfo = braceEvidence(); } catch (error) { braceInfo = { status:'SOURCE REQUIRED',className:'is-warning',note:error.message }; }
  el.frameBraceEvidence.innerHTML = `<strong>Brace evidence <span class="frame-evidence-badge ${braceInfo.className}">${escapeHtml(braceInfo.status)}</span></strong><p>${escapeHtml(braceInfo.note)}</p>`;
}

function collectInputs() {
  const analysis = el.frameAnalysisSelect.value;
  const jointType = el.frameJointTypeSelect.value;
  const joint = jointEvidence();
  const brace = braceEvidence();
  const options = {
    widthM:num(el.frameWidthInput), heightM:num(el.frameHeightInput), elasticModulusMPa:num(el.frameEInput),
    memberWidthMm:num(el.frameMemberWidthInput), memberDepthMm:num(el.frameMemberDepthInput),
    lateralLoadKN:num(el.frameLateralLoadInput), gravityLoadKN:num(el.frameGravityLoadInput), topJointType:jointType
  };
  if (jointType === 'spring') options.topJointKThetaKNmPerRad = num(el.frameSpringStiffnessInput);
  if (analysis === 'redistribution') {
    if (jointType !== 'spring') throw new Error('Connection redistribution requires an explicit semi-rigid spring model.');
    if (el.frameMomentLimitInput.value === '' || el.frameResidualRatioInput.value === '') throw new Error('Redistribution requires an explicit connection moment limit and residual stiffness ratio.');
    options.topJointMomentLimitKNm = num(el.frameMomentLimitInput);
    options.postLimitStiffnessRatio = num(el.frameResidualRatioInput);
  }
  const braceConfig = brace.enabled ? { direction:el.frameBraceSelect.value, elasticModulusMPa:num(el.frameBraceEInput), areaMm2:num(el.frameBraceAreaInput) } : null;
  return { analysis, options, joint, brace, braceConfig };
}

function reactionTotals(result) { return result.reactions.reduce((s,r)=>({fxKN:s.fxKN+r.fxKN,fyKN:s.fyKN+r.fyKN,mzKNm:s.mzKNm+r.mzKNm}),{fxKN:0,fyKN:0,mzKNm:0}); }
function equilibrium(result, model) {
  const reactions=reactionTotals(result);
  const loads=model.nodes.reduce((s,n)=>({fxKN:s.fxKN+Number(n.loads?.fxKN??0),fyKN:s.fyKN+Number(n.loads?.fyKN??0),momentAboutOriginKNm:s.momentAboutOriginKNm+Number(n.loads?.mzKNm??0)+Number(n.xM)*Number(n.loads?.fyKN??0)-Number(n.yM)*Number(n.loads?.fxKN??0)}),{fxKN:0,fyKN:0,momentAboutOriginKNm:0});
  const reactionMoment=model.nodes.reduce((s,n)=>{const r=result.reactions.find((x)=>x.id===n.id);return s+r.mzKNm+Number(n.xM)*r.fyKN-Number(n.yM)*r.fxKN;},0);
  return {reactions,loads,residualFxKN:reactions.fxKN+loads.fxKN,residualFyKN:reactions.fyKN+loads.fyKN,residualMomentKNm:reactionMoment+loads.momentAboutOriginKNm};
}
function roofDrift(result,model){const maxY=Math.max(...model.nodes.map((n)=>Number(n.yM))),ids=model.nodes.filter((n)=>Math.abs(Number(n.yM)-maxY)<1e-9).map((n)=>n.id),roof=result.nodes.filter((n)=>ids.includes(n.id)),meanUxMm=roof.reduce((s,n)=>s+n.uxMm,0)/roof.length;return{meanUxMm,inverse:Math.abs(meanUxMm)>1e-12?maxY*1000/Math.abs(meanUxMm):Infinity};}
function maxEndMoment(result){return Math.max(...result.elements.flatMap((m)=>[Math.abs(m.endMomentIKNm),Math.abs(m.endMomentJKNm)]),0);}

function renderCards(result,model,analysis,redistribution,adviser){const eq=equilibrium(result,model),drift=roofDrift(result,model),maxUse=Math.max(...result.connections.map((c)=>c.utilization??0),0);const cards=[['Max translation',`${format(result.maxTranslationMm)} mm`,`node ${result.maxTranslationNodeId}`],['Mean roof drift',`${format(drift.meanUxMm)} mm`,Number.isFinite(drift.inverse)?`H/${format(drift.inverse,1)} · no code limit applied`:'zero horizontal drift'],['Base shear reaction',`${format(Math.abs(eq.reactions.fxKN))} kN`,`ΣFx residual ${format(eq.residualFxKN,6)} kN`],['Max |member end M|',`${format(maxEndMoment(result))} kN·m`,'elastic end action'],['Connection springs',`${result.connections.length}`,result.connections.length?`max threshold use ${maxUse?`${format(maxUse*100,1)}%`:'unrated'}`:'rigid/pin idealization only'],[adviser?'Brace sensitivity':analysis==='pdelta'?'P–Δ amplification':analysis==='redistribution'?'Connection events':'Analysis order',adviser?`${format(adviser.driftReductionPercent,1)}% drift reduction`:analysis==='pdelta'?`${format(result.translationAmplification,3)}×`:analysis==='redistribution'?`${redistribution.events.length}`:'1st',adviser?'UNRATED brace capacity':analysis==='pdelta'?result.boundary:analysis==='redistribution'?redistribution.boundary:'linear elastic stiffness solution']];el.frameResultCards.innerHTML=cards.map(([l,v,n])=>`<article class="result-card"><span>${escapeHtml(l)}</span><strong>${escapeHtml(v)}</strong><small>${escapeHtml(n)}</small></article>`).join('');}

function diagramPoint(node,resultNode,bounds,mag){const scale=Math.min(650/Math.max(bounds.maxX,.1),350/Math.max(bounds.maxY,.1)),x=120+Number(node.xM)*scale,y=450-Number(node.yM)*scale;return{x,y,xd:x+(resultNode?.uxMm??0)/1000*scale*mag,yd:y-(resultNode?.uyMm??0)/1000*scale*mag};}
function connectionGlyph(x,y,type){if(type==='spring')return`<path d="M ${x-14} ${y} l 5 -7 l 5 14 l 5 -14 l 5 14 l 5 -7" class="frame-spring"/>`;if(type==='pin')return`<circle cx="${x}" cy="${y}" r="8" class="frame-pin"/>`;return'';}
function renderDiagram(result,model,jointType){const bounds={maxX:Math.max(...model.nodes.map((n)=>Number(n.xM))),maxY:Math.max(...model.nodes.map((n)=>Number(n.yM)))},pxPerM=Math.min(650/Math.max(bounds.maxX,.1),350/Math.max(bounds.maxY,.1)),raw=Math.max(result.maxTranslationMm,1e-9)/1000*pxPerM,mag=Math.min(100,Math.max(1,55/Math.max(raw,.01))),map=new Map(model.nodes.map((n)=>[n.id,diagramPoint(n,result.nodes.find((r)=>r.id===n.id),bounds,mag)])),defs='<defs><marker id="frameArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#ff8a7f"/></marker></defs>',lines=model.elements.map((m)=>{const a=map.get(m.nodeI),b=map.get(m.nodeJ),brace=m.id==='BR1';return`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="frame-member-base${brace?' frame-brace-base':''}"><title>${escapeHtml(m.id)} undeformed</title></line><line x1="${a.xd}" y1="${a.yd}" x2="${b.xd}" y2="${b.yd}" class="frame-member-deformed${brace?' frame-brace-deformed':''}"><title>${escapeHtml(m.id)} deformed · ${format(mag,1)}× display</title></line>`;}).join(''),nodes=model.nodes.map((n)=>{const p=map.get(n.id);return`<circle cx="${p.xd}" cy="${p.yd}" r="5" class="frame-node"/><text x="${p.xd+9}" y="${p.yd-9}" class="frame-label">${escapeHtml(n.id)}</text>`;}).join(''),supports=model.nodes.filter((n)=>n.restraints?.ux&&n.restraints?.uy).map((n)=>{const p=map.get(n.id);return`<rect x="${p.x-24}" y="${p.y+7}" width="48" height="9" class="frame-support"/>`;}).join(''),joints=model.nodes.filter((n)=>!n.restraints?.ux&&Number(n.yM)>0).map((n)=>{const p=map.get(n.id);return connectionGlyph(p.x,p.y,jointType);}).join('');let arrow='';const loaded=model.nodes.find((n)=>Number(n.loads?.fxKN??0)!==0);if(loaded){const p=map.get(loaded.id),sign=Math.sign(Number(loaded.loads.fxKN))||1;arrow=`<line x1="${p.x-sign*70}" y1="${p.y-38}" x2="${p.x-sign*8}" y2="${p.y-38}" class="frame-load"/><text x="${p.x-sign*72}" y="${p.y-48}" text-anchor="${sign>0?'end':'start'}" class="frame-warning-label">${format(Math.abs(loaded.loads.fxKN))} kN lateral</text>`;}el.frameDiagram.innerHTML=`${defs}<line x1="120" y1="450" x2="770" y2="450" class="frame-gridline"/><line x1="120" y1="100" x2="120" y2="450" class="frame-gridline"/><text x="24" y="32" class="frame-label">NF-001 · grey undeformed · green deformed (${format(mag,1)}× display)</text>${lines}${supports}${joints}${nodes}${arrow}<text x="24" y="500" class="frame-muted-label">Deformation magnification affects display only. Solver displacements remain physical millimetres.</text>`;}

function renderElements(result){el.frameElementBody.innerHTML=result.elements.map((m)=>`<tr><td><strong>${escapeHtml(m.id)}</strong><small>${escapeHtml(m.nodeI)} → ${escapeHtml(m.nodeJ)} · ${format(m.lengthM)} m${m.id==='BR1'?' · brace sensitivity':''}</small></td><td>${format(m.axialForceKN)} kN<small>${m.axialForceKN<0?'compression':'tension-positive convention'}</small></td><td>${format(m.endShearIKN)} / ${format(m.endShearJKN)} kN</td><td>${format(m.endMomentIKNm)} / ${format(m.endMomentJKNm)} kN·m</td></tr>`).join('');}
function renderConnections(result){el.frameConnectionBody.innerHTML=result.connections.length?result.connections.map((c)=>`<tr><td><strong>${escapeHtml(c.id)}</strong><small>node ${escapeHtml(c.nodeId)}</small></td><td>${format(c.kThetaKNmPerRad)} kN·m/rad</td><td>${format(c.relativeRotationRad,6)} rad</td><td>${format(c.momentKNm)} kN·m</td><td>${c.utilization==null?'UNRATED':`${format(c.utilization*100,1)}%`}<small>${c.momentLimitKNm==null?'no explicit threshold supplied':`limit ${format(c.momentLimitKNm)} kN·m`}</small></td></tr>`).join(''):'<tr><td colspan="5">No finite rotational springs in this model. Rigid/pin end conditions are explicit idealizations.</td></tr>';}
function renderTrace(result,model,analysis,redistribution){const sec=rectangularSectionProperties(num(el.frameMemberWidthInput),num(el.frameMemberDepthInput)),eq=equilibrium(result,model),drift=roofDrift(result,model);el.frameCalculationTrace.innerHTML=`<p><strong>Section:</strong> A = b·h = ${format(num(el.frameMemberWidthInput),1)} × ${format(num(el.frameMemberDepthInput),1)} = ${format(sec.areaMm2,1)} mm².</p><p><strong>In-plane gross I:</strong> b·h³/12 = ${format(sec.inertiaMm4,1)} mm⁴.</p><p><strong>Elastic modulus:</strong> E = ${format(num(el.frameEInput),1)} MPa.</p><p><strong>Equilibrium ΣFx:</strong> applied ${format(eq.loads.fxKN)} kN + reactions ${format(eq.reactions.fxKN)} kN = residual ${format(eq.residualFxKN,6)} kN.</p><p><strong>Equilibrium ΣFy:</strong> applied ${format(eq.loads.fyKN)} kN + reactions ${format(eq.reactions.fyKN)} kN = residual ${format(eq.residualFyKN,6)} kN.</p><p><strong>Equilibrium ΣM about origin:</strong> residual ${format(eq.residualMomentKNm,6)} kN·m.</p><p><strong>Roof drift report:</strong> mean ux = ${format(drift.meanUxMm)} mm = ${Number.isFinite(drift.inverse)?`H/${format(drift.inverse,1)}`:'zero'}; no code drift criterion is automatically applied in NF-001.</p>${analysis==='pdelta'?`<p><strong>P–Δ:</strong> first-order max translation ${format(result.firstOrderMaxTranslationMm)} mm → second-order ${format(result.maxTranslationMm)} mm; amplification ${format(result.translationAmplification,4)}×.</p>`:''}${analysis==='redistribution'?`<p><strong>Redistribution:</strong> ${redistribution.events.length} explicit threshold event(s); mechanism = ${redistribution.mechanism?'YES':'NO'}.</p>`:''}`;}
function renderJoint(joint,analysis,redistribution){const type=el.frameJointTypeSelect.value,k=type==='spring'?`<p><strong>kθ = ${format(num(el.frameSpringStiffnessInput))} kN·m/rad.</strong> ${escapeHtml(joint.note)}</p>`:`<p>${escapeHtml(joint.note)}</p>`,path=analysis==='redistribution'?`<p><strong>Event path:</strong> threshold ${format(num(el.frameMomentLimitInput))} kN·m; residual stiffness ratio ${format(num(el.frameResidualRatioInput),3)}. ${escapeHtml(redistribution.boundary)}</p>`:analysis==='pdelta'?'<p><strong>Second-order boundary:</strong> elastic geometric stiffness only. No material yielding, connection degradation or large-rotation corotational formulation.</p>':'<p><strong>First-order boundary:</strong> elastic small-displacement system response.</p>';el.frameJointInterpretation.innerHTML=`<p><strong>${escapeHtml(joint.status)}</strong></p>${k}${path}<p>Connection Lab fastener count is deliberately not converted to stiffness or capacity here. A future calibrated connection force–rotation law may populate these inputs explicitly.</p>`;}
function renderBrace(adviser,info){el.frameBraceAdviserSection.classList.toggle('is-hidden',!adviser);if(!adviser){el.frameBraceAdviser.innerHTML='';return;}el.frameBraceAdviser.innerHTML=`<p><strong>${escapeHtml(adviser.status)} · capacity ${escapeHtml(adviser.capacityStatus)}</strong></p><p>${escapeHtml(info.note)}</p><p>Baseline mean roof drift: <b>${format(adviser.baselineDriftMm)} mm</b> → with ${escapeHtml(adviser.direction)} brace: <b>${format(adviser.bracedDriftMm)} mm</b>. Elastic drift reduction: <b>${format(adviser.driftReductionPercent,1)}%</b>.</p><p>Brace axial demand: <b>${format(adviser.braceAxialForceKN)} kN ${escapeHtml(adviser.braceAxialSense)}</b>. This is demand only—not brace capacity.</p><p class="frame-source-line">${escapeHtml(adviser.boundary)}</p>`;}
function renderRedistribution(r){el.frameRedistributionSection.classList.toggle('is-hidden',!r);if(!r){el.frameRedistributionEvents.innerHTML='';return;}if(!r.events.length){el.frameRedistributionEvents.innerHTML='<div class="support-help"><strong>No supplied threshold crossed</strong><p>The target load factor reached 1.0 without crossing any explicit spring moment limit.</p></div>';return;}el.frameRedistributionEvents.innerHTML=`<div class="frame-event-list">${r.events.map((e)=>`<article class="frame-event"><strong>#${e.sequence}</strong><div><b>${escapeHtml(e.connectionId)} · load factor ${format(e.loadFactor,4)}</b><p>|M| reached explicit ${format(e.momentLimitKNm)} kN·m threshold. kθ ${format(e.oldKThetaKNmPerRad)} → ${format(e.newKThetaKNmPerRad)} kN·m/rad (${escapeHtml(e.stateAfter)}). Max translation ${format(e.maxTranslationBeforeMm)} → ${e.maxTranslationAfterMm==null?'mechanism':format(e.maxTranslationAfterMm)} mm.</p></div><span>${e.mechanismAfter?'MECHANISM':'REDISTRIBUTED'}</span></article>`).join('')}</div>${r.mechanism?`<div class="error-banner"><strong>Mechanism / singular state:</strong> ${escapeHtml(r.mechanismMessage)}</div>`:''}`;}
function renderSource(model,joint,brace,analysis){el.frameSourceCard.innerHTML=`<p class="eyebrow">NF-001 provenance and limits</p><strong>${escapeHtml(model.description)}</strong><p>${escapeHtml(model.evidenceBoundary)}</p><p><b>Joint state:</b> ${escapeHtml(joint.status)}${el.frameJointTypeSelect.value==='spring'&&el.frameSpringSourceInput.value.trim()?` · ${escapeHtml(el.frameSpringSourceInput.value.trim())}`:''}.</p><p><b>Brace state:</b> ${escapeHtml(brace.status)}${brace.enabled&&el.frameBraceSourceInput.value.trim()?` · ${escapeHtml(el.frameBraceSourceInput.value.trim())}`:''}. Brace capacity remains UNRATED.</p><p><b>Analysis:</b> ${escapeHtml(analysis==='pdelta'?'elastic P–Δ geometric-stiffness iteration':analysis==='redistribution'?'first-order piecewise-elastic connection redistribution':'first-order elastic frame stiffness')}. NF-001 is not a code design or complete wall-system load-path certification.</p>`;}

function analyze(){try{el.frameErrorBanner.classList.add('is-hidden');el.frameErrorBanner.textContent='';const{analysis,options,joint,brace,braceConfig}=collectInputs(),baseModel=createNF001Model(options),adviser=braceConfig?evaluateNF001BraceSensitivity(baseModel,braceConfig):null,model=braceConfig?addNF001DiagonalBrace(baseModel,braceConfig):baseModel;let result,redistribution=null;if(analysis==='pdelta')result=solveFrame2DPDelta(model);else if(analysis==='redistribution'){redistribution=solveFrameWithConnectionRedistribution(model);result=redistribution.finalResult;if(!result)result=solveFrame2D(model);}else result=solveFrame2D(model);const state=analysis==='redistribution'?(redistribution.mechanism?{className:'is-danger',text:`MECHANISM / SINGULAR STATE AFTER CONNECTION EVENT · ${redistribution.events.length} event(s)`}:{className:'is-warning',text:`PIECEWISE ELASTIC REDISTRIBUTION · ${redistribution.events.length} explicit connection event(s)`}):analysis==='pdelta'?{className:result.translationAmplification>1.1?'is-warning':'',text:`SECOND-ORDER ELASTIC P–Δ · converged in ${result.iterations} iteration(s) · displacement amplification ${format(result.translationAmplification,3)}×`}:{className:'',text:'FIRST-ORDER ELASTIC FRAME RESPONSE'};el.frameStateBanner.className=`frame-state ${state.className}`;el.frameStateBanner.textContent=state.text;renderCards(result,model,analysis,redistribution,adviser);renderDiagram(result,model,el.frameJointTypeSelect.value);renderElements(result);renderConnections(result);renderTrace(result,model,analysis,redistribution);renderJoint(joint,analysis,redistribution);renderBrace(adviser,brace);renderRedistribution(redistribution);renderSource(model,joint,brace,analysis);document.documentElement.dataset.frameState=redistribution?.mechanism?'mechanism':'analyzed';}catch(error){delete document.documentElement.dataset.frameState;el.frameErrorBanner.textContent=error instanceof Error?error.message:String(error);el.frameErrorBanner.classList.remove('is-hidden');}}
function reset(){el.frameWidthInput.value='3';el.frameHeightInput.value='3';el.frameEInput.value='13100';el.frameMemberWidthInput.value='50';el.frameMemberDepthInput.value='100';el.frameLateralLoadInput.value='1';el.frameGravityLoadInput.value='0';el.frameAnalysisSelect.value='first-order';el.frameJointTypeSelect.value='rigid';el.frameSpringStiffnessInput.value='';el.frameSpringEvidenceSelect.value='sensitivity';el.frameSpringSourceInput.value='';el.frameMomentLimitInput.value='';el.frameResidualRatioInput.value='';el.frameBraceSelect.value='none';el.frameBraceEInput.value='13100';el.frameBraceAreaInput.value='2500';el.frameBraceEvidenceSelect.value='sensitivity';el.frameBraceSourceInput.value='';syncControls();analyze();}
for(const input of [el.frameJointTypeSelect,el.frameAnalysisSelect,el.frameSpringEvidenceSelect,el.frameBraceSelect,el.frameBraceEvidenceSelect])input.addEventListener('change',syncControls);el.frameRunButton.addEventListener('click',analyze);el.frameResetButton.addEventListener('click',reset);reset();
