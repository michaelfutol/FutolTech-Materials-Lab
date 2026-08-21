import { PH_C_PURLIN_SECTIONS } from './data/phCPurlinCatalog.js';
import {
  governingCommonWindSense,
  resolveRoofLineLoads,
  solveCPurlinLoadCase,
  yieldSequence
} from './solver/cPurlinLoadCases.js';

const DEFAULT_SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const DENSITY_KG_M3 = 7850;
const E_MPA = 200000;
const FPS = 30;
const root = document.querySelector('[data-cp-loadcase-app]');

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function compact(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function themePalette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
    paper: true,
    bg: '#fbf7ee', card: '#fffdf8', panel: '#f0e6d6', text: '#182329', muted: '#4c575c',
    line: '#315d57', border: '#8f806b', gravity: '#b77913', wind: '#1769a8', resultant: '#b33a3a',
    normal: '#7c3fb0', parallel: '#147460', good: '#176a60', warn: '#986012', fail: '#a52f36', rafter: '#6c655b'
  } : {
    paper: false,
    bg: '#07141c', card: '#0b2029', panel: '#0d2631', text: '#ecfbff', muted: '#a9bdc7',
    line: '#67e6cf', border: '#35515c', gravity: '#ffd65c', wind: '#69b9ff', resultant: '#ff6f74',
    normal: '#cf89ff', parallel: '#6ff2c6', good: '#67e6cf', warn: '#ffd65c', fail: '#ff6f74', rafter: '#a9bdc7'
  };
}

function injectStyles() {
  if (document.getElementById('ft-cp-loadcase-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-cp-loadcase-style';
  style.textContent = `
    .cp-loadcase-page{display:grid;grid-template-columns:minmax(300px,.78fr) minmax(0,1.55fr);gap:1px;background:var(--border)}
    .cp-loadcase-page>.panel{min-width:0}.cp-loadcase-controls{grid-row:span 3}.cp-loadcase-static,.cp-loadcase-animation,.cp-loadcase-results{grid-column:2}
    .cp-loadcase-intro,.cp-loadcase-note{color:var(--muted);line-height:1.5}.cp-loadcase-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
    .cp-loadcase-grid label,.cp-loadcase-member-control label{display:grid;gap:.28rem}.cp-loadcase-grid input,.cp-loadcase-grid select,.cp-loadcase-member-control select{width:100%}
    .cp-loadcase-members{display:grid;gap:.65rem;margin-top:.9rem}.cp-loadcase-member-control{padding:.7rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.25)}
    .cp-loadcase-inline{display:flex!important;grid-template-columns:auto 1fr;align-items:center;gap:.4rem!important}.cp-loadcase-inline input{width:auto}
    .cp-loadcase-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:1rem 0}.cp-loadcase-readouts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}
    .cp-loadcase-readouts>div{padding:.7rem;border:1px solid var(--border);border-radius:10px;background:rgba(7,20,28,.25)}.cp-loadcase-readouts small{display:block;color:var(--muted)}.cp-loadcase-readouts strong{display:block;margin-top:.18rem;font-size:1.05rem}
    .cp-loadcase-static canvas,.cp-loadcase-animation canvas{display:block;width:100%;height:auto;border:1px solid var(--border);border-radius:14px;background:#07141c}
    .cp-loadcase-result-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:.75rem}.cp-loadcase-result-card{padding:.8rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.2)}
    .cp-loadcase-result-card h3{margin:.1rem 0 .55rem}.cp-loadcase-result-card dl{display:grid;grid-template-columns:1fr auto;gap:.35rem .7rem;margin:0}.cp-loadcase-result-card dt{color:var(--muted)}.cp-loadcase-result-card dd{margin:0;font-weight:800;text-align:right}
    .cp-loadcase-equations{margin-top:.85rem;padding:.85rem;border:1px solid var(--border);border-radius:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;line-height:1.6;overflow:auto}.cp-loadcase-equations strong{font-family:inherit}
    html[data-ft-theme="paper-matte"] .cp-loadcase-member-control,html[data-ft-theme="paper-matte"] .cp-loadcase-readouts>div,html[data-ft-theme="paper-matte"] .cp-loadcase-result-card{background:#fffaf1;color:#172127}
    html[data-ft-theme="paper-matte"] .cp-loadcase-equations{background:#fffdf8;color:#172127}.cp-loadcase-disabled{opacity:.45}
    @media(max-width:1050px){.cp-loadcase-page{grid-template-columns:1fr}.cp-loadcase-controls{grid-row:auto}.cp-loadcase-static,.cp-loadcase-animation,.cp-loadcase-results{grid-column:1}}
    @media(max-width:620px){.cp-loadcase-grid,.cp-loadcase-readouts{grid-template-columns:1fr}}
    @media print{.cp-loadcase-actions{display:none!important}}
  `;
  document.head.appendChild(style);
}

function dom() {
  const get = (selector) => root.querySelector(selector);
  return {
    mode: get('[data-cplc-mode]'), section: get('[data-cplc-section]'), grade: get('[data-cplc-grade]'),
    span: get('[data-cplc-span]'), slope: get('[data-cplc-slope]'), tributary: get('[data-cplc-tributary]'),
    dead: get('[data-cplc-dead]'), live: get('[data-cplc-live]'), windUplift: get('[data-cplc-wind-uplift]'), windDownward: get('[data-cplc-wind-downward]'), windSense: get('[data-cplc-wind-sense]'),
    duration: get('[data-cplc-duration]'), maxFactor: get('[data-cplc-max-factor]'), third: get('[data-cplc-third]'),
    orientations: [0,1,2].map((index) => get(`[data-cplc-orientation="${index}"]`)),
    resetInputs: get('[data-cplc-reset-inputs]'), start: get('[data-cplc-start]'), pause: get('[data-cplc-pause]'), reset: get('[data-cplc-reset]'), record: get('[data-cplc-record]'),
    factor: get('[data-cplc-factor]'), normal: get('[data-cplc-normal]'), parallel: get('[data-cplc-parallel]'), case: get('[data-cplc-case]'), yieldState: get('[data-cplc-yield-state]'),
    vectorCanvas: get('[data-cplc-vector]'), videoCanvas: get('[data-cplc-video]'), results: get('[data-cplc-member-results]'), equations: get('[data-cplc-equations]')
  };
}

const ui = root ? dom() : null;
const animation = { running:false, paused:false, raf:0, startMs:0, elapsedMs:0, factor:0, targetFactor:1, caseContext:null, recorder:null, chunks:[], recording:false };

function populateSections() {
  const groups = new Map([['Colorsteel source profiles', []], ['Philippine nominal market models', []]]);
  PH_C_PURLIN_SECTIONS.forEach((preset) => {
    const key = preset.id.startsWith('ph-cp-colorsteel') ? 'Colorsteel source profiles' : 'Philippine nominal market models';
    groups.get(key).push(preset);
  });
  ui.section.innerHTML = '';
  for (const [label, presets] of groups) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      optgroup.appendChild(option);
    });
    ui.section.appendChild(optgroup);
  }
  if ([...ui.section.options].some((option) => option.value === DEFAULT_SECTION_ID)) ui.section.value = DEFAULT_SECTION_ID;
}

function selectedPreset() {
  return PH_C_PURLIN_SECTIONS.find((preset) => preset.id === ui.section.value) ?? PH_C_PURLIN_SECTIONS[0];
}

function activeMembers() {
  const preset = selectedPreset();
  const count = ui.third.checked ? 3 : 2;
  return Array.from({ length:count }, (_, index) => ({
    label:`Member ${String.fromCharCode(65 + index)}`,
    preset,
    orientationDeg:Number(ui.orientations[index].value),
    elasticModulusMPa:E_MPA,
    yieldStrengthMPa:Number(ui.grade.value),
    densityKgM3:DENSITY_KG_M3
  }));
}

function rawInputs() {
  const windSense = ui.windSense.value === 'downward' ? 'downward' : 'uplift';
  const windUpliftKPa = clamp(ui.windUplift.value,0,10);
  const windDownwardKPa = clamp(ui.windDownward.value,0,10);
  return {
    mode:ui.mode.value,
    spanM:clamp(ui.span.value,.8,6), slopeDeg:clamp(ui.slope.value,0,60), tributaryWidthM:clamp(ui.tributary.value,.2,3),
    deadLoadKPa:clamp(ui.dead.value,0,5), roofLiveLoadKPa:clamp(ui.live.value,0,5),
    windUpliftKPa, windDownwardKPa, windSense,
    windPressureKPa:windSense === 'downward' ? windDownwardKPa : windUpliftKPa,
    maxFactor:clamp(ui.maxFactor.value,1,20)
  };
}

function buildCaseContext() {
  const input = rawInputs();
  const members = activeMembers();
  let solveMode = input.mode;
  let windSense = input.windSense;
  let windPressureKPa = input.windPressureKPa;
  let envelope = null;
  if (input.mode === 'envelope') {
    envelope = governingCommonWindSense({ members, ...input });
    solveMode = 'combined';
    windSense = envelope.windSense;
    windPressureKPa = envelope.windPressureKPa;
  }
  const common = { ...input, mode:solveMode, windSense, windPressureKPa };
  const sequence = yieldSequence({ members, ...common, maxFactor:input.maxFactor });
  const targetFactor = Math.max(.0001, sequence.allYieldFactor);
  return { input, members, common, sequence, targetFactor, envelope };
}

function laneResults(context, factor) {
  return context.members.map((member) => {
    const base = solveCPurlinLoadCase({ ...context.common, ...member, loadFactor:1 });
    const laneFactor = Number.isFinite(base.yieldFactor) ? Math.min(factor, base.yieldFactor) : factor;
    return {
      member,
      laneFactor,
      firstYieldFactor:base.yieldFactor,
      yielded:Number.isFinite(base.yieldFactor) && factor >= base.yieldFactor - 1e-9,
      result:solveCPurlinLoadCase({ ...context.common, ...member, loadFactor:laneFactor })
    };
  });
}

function syncModeDisabledState() {
  const mode = ui.mode.value;
  const windDisabled = mode === 'gravity';
  const gravityDisabled = mode === 'wind';
  ui.windUplift.disabled = windDisabled;
  ui.windDownward.disabled = windDisabled;
  ui.windSense.disabled = windDisabled || mode === 'envelope';
  ui.dead.disabled = gravityDisabled;
  ui.live.disabled = gravityDisabled;
  [ui.windUplift.closest('label'), ui.windDownward.closest('label'), ui.windSense.closest('label')].forEach((node) => node?.classList.toggle('cp-loadcase-disabled', windDisabled));
  [ui.dead.closest('label'), ui.live.closest('label')].forEach((node) => node?.classList.toggle('cp-loadcase-disabled', gravityDisabled));
}

function resetInputs() {
  ui.mode.value = 'combined';
  ui.section.value = [...ui.section.options].some((option) => option.value === DEFAULT_SECTION_ID) ? DEFAULT_SECTION_ID : ui.section.options[0].value;
  ui.grade.value = '250'; ui.span.value = '2'; ui.slope.value = '30'; ui.tributary.value = '.8'; ui.dead.value = '.20'; ui.live.value = '.75'; ui.windUplift.value = '1.50'; ui.windDownward.value = '.80'; ui.windSense.value = 'uplift'; ui.duration.value = '16'; ui.maxFactor.value = '12';
  ui.third.checked = false; ui.orientations[0].value = '0'; ui.orientations[1].value = '90'; ui.orientations[2].value = '180';
  syncModeDisabledState(); resetAnimation();
}

function drawArrow(ctx, x1, y1, x2, y2, color, label, width = 5) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 14;
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-head*Math.cos(angle-.5),y2-head*Math.sin(angle-.5)); ctx.lineTo(x2-head*Math.cos(angle+.5),y2-head*Math.sin(angle+.5)); ctx.closePath(); ctx.fill();
  if (label) { ctx.font = '800 19px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign='center'; ctx.fillText(label,(x1+x2)/2,(y1+y2)/2-10); }
  ctx.restore();
}

function drawC(ctx, x, y, size, degrees, color) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(degrees*Math.PI/180); ctx.strokeStyle=color; ctx.lineWidth=Math.max(4,size*.08); ctx.lineJoin='miter';
  ctx.beginPath(); ctx.moveTo(size*.35,-size*.5); ctx.lineTo(-size*.35,-size*.5); ctx.lineTo(-size*.35,size*.5); ctx.lineTo(size*.35,size*.5); ctx.moveTo(size*.35,-size*.5); ctx.lineTo(size*.35,-size*.27); ctx.moveTo(size*.35,size*.5); ctx.lineTo(size*.35,size*.27); ctx.stroke(); ctx.restore();
}

function canvasHeader(ctx, palette, title, subtitle, width) {
  ctx.fillStyle=palette.text; ctx.font='900 28px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign='left'; ctx.fillText('FUTOLTECH ENGINEERING & PROJECT SYSTEMS',42,43);
  ctx.font='900 31px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(title,42,83);
  ctx.fillStyle=palette.muted; ctx.font='500 17px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(subtitle,42,111);
  ctx.strokeStyle=palette.border; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(42,128); ctx.lineTo(width-42,128); ctx.stroke();
}

function drawVectorCanvas(context = buildCaseContext()) {
  const canvas=ui.vectorCanvas, ctx=canvas.getContext('2d'), p=themePalette(), w=canvas.width;
  ctx.fillStyle=p.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
  canvasHeader(ctx,p,'ROOF CROSS-SECTION · GRAVITY + WIND VECTOR EXPLANATION','Static installation/load-path view — no span deflection is animated here.',w);
  const input=context.common, preset=context.members[0].preset;
  const loads=resolveRoofLineLoads({ ...input, preset, densityKgM3:DENSITY_KG_M3 });
  const theta=input.slopeDeg*Math.PI/180;
  const cx=500, cy=300, half=250;
  const dx=Math.cos(theta)*half, dy=Math.sin(theta)*half;
  ctx.strokeStyle=p.rafter; ctx.lineWidth=12; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(cx-dx,cy+dy); ctx.lineTo(cx+dx,cy-dy); ctx.stroke();
  ctx.fillStyle=p.muted; ctx.font='800 16px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(`RAFTER / ROOF SLOPE θ = ${compact(input.slopeDeg,1)}°`,cx+90,cy-dy-18);
  drawC(ctx,cx,cy-28,70,Number(ui.orientations[0].value),p.line);
  ctx.fillStyle=p.text; ctx.font='800 16px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('C-purlin axis runs out of page',cx-108,cy-74);

  const scale=85/Math.max(.25,loads.gravityVerticalKNM,Math.abs(loads.windNormalKNM),loads.resultantKNM);
  if (loads.gravityVerticalKNM>1e-9) drawArrow(ctx,cx-120,160,cx-120,160+loads.gravityVerticalKNM*scale,p.gravity,`gravity ${compact(loads.gravityVerticalKNM)} kN/m`);
  if (Math.abs(loads.windNormalKNM)>1e-9) {
    const nx=Math.sin(theta), ny=Math.cos(theta), sign=Math.sign(loads.windNormalKNM);
    drawArrow(ctx,cx+130,225,cx+130+nx*sign*Math.abs(loads.windNormalKNM)*scale,225+ny*sign*Math.abs(loads.windNormalKNM)*scale,p.wind,`wind ${loads.windSense}`);
  }
  const nx=Math.sin(theta), ny=Math.cos(theta), tx=-Math.cos(theta), ty=Math.sin(theta);
  const originX=900, originY=230;
  drawArrow(ctx,originX,originY,originX+nx*loads.normalKNM*scale,originY+ny*loads.normalKNM*scale,p.normal,`w⊥ ${compact(loads.normalKNM)} kN/m`,4);
  drawArrow(ctx,originX,originY,originX+tx*loads.parallelKNM*scale,originY+ty*loads.parallelKNM*scale,p.parallel,`w∥ ${compact(loads.parallelKNM)} kN/m`,4);
  const rx=nx*loads.normalKNM+tx*loads.parallelKNM, ry=ny*loads.normalKNM+ty*loads.parallelKNM;
  drawArrow(ctx,originX,originY,originX+rx*scale,originY+ry*scale,p.resultant,`resultant ${compact(loads.resultantKNM)} kN/m`,6);
  ctx.fillStyle=p.text; ctx.font='800 18px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(`Normal direction: ${loads.normalDirection.toUpperCase()}`,790,365);
  ctx.fillStyle=p.muted; ctx.font='600 15px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText('gravity → w⊥ = W cosθ ; w∥ = W sinθ',790,392); ctx.fillText('wind → roof-normal only in this idealized layer',790,414);
}

function drawDistributedLoad(ctx, x1, x2, baselineY, amplitude, color, label) {
  if (Math.abs(amplitude)<1e-9) return;
  const down=amplitude>0, length=44, top=down?baselineY-82:baselineY+82, end=down?top+length:top-length;
  for(let i=0;i<6;i+=1){const x=x1+(x2-x1)*(i+.5)/6;drawArrow(ctx,x,top,x,end,color,'',3)}
  ctx.fillStyle=color;ctx.font='800 15px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.textAlign='center';ctx.fillText(label,(x1+x2)/2,down?top-10:top+18);
}

function drawVideo(context = buildCaseContext(), factor = animation.factor) {
  const canvas=ui.videoCanvas,ctx=canvas.getContext('2d'),p=themePalette(),w=canvas.width;
  ctx.fillStyle=p.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  const modeLabel=context.input.mode==='envelope'?'GOVERNING ENVELOPE':context.common.mode.toUpperCase();
  canvasHeader(ctx,p,`C-PURLIN GRAVITY + WIND LOAD TEST · ${context.members.length} MEMBERS`,`${modeLabel} · roof slope ${compact(context.common.slopeDeg,1)}° · span ${compact(context.common.spanM,2)} m · tributary width ${compact(context.common.tributaryWidthM,2)} m`,w);
  ctx.textAlign='right';ctx.fillStyle=p.warn;ctx.font='900 28px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(`${compact(factor,2)}×`,w-45,47);ctx.fillStyle=p.muted;ctx.font='700 14px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(`design input marker = 1.00× · wind ${context.common.windSense} ${compact(context.common.windPressureKPa,2)} kPa`,w-45,73);
  const lanes=laneResults(context,factor),gap=18,left=35,right=35,top=150,laneW=(w-left-right-gap*(lanes.length-1))/lanes.length;
  const targetLanes=laneResults(context,context.targetFactor); const maxDelta=Math.max(1,...targetLanes.map(l=>Math.abs(l.result.deltaNormalMm)));
  lanes.forEach((lane,index)=>{
    const x=left+index*(laneW+gap),y=top,cw=laneW,ch=470;
    ctx.fillStyle=p.card;ctx.strokeStyle=lane.yielded?p.fail:p.border;ctx.lineWidth=lane.yielded?3:2;ctx.beginPath();ctx.roundRect(x,y,cw,ch,15);ctx.fill();ctx.stroke();
    ctx.textAlign='left';ctx.fillStyle=p.text;ctx.font='900 21px ui-sans-serif,system-ui,sans-serif';ctx.fillText(`${lane.member.label} · ${lane.member.orientationDeg}°`,x+18,y+31);
    ctx.fillStyle=p.muted;ctx.font='600 13px ui-sans-serif,system-ui,sans-serif';ctx.fillText(lane.member.preset.label.slice(0,45),x+18,y+55);
    drawC(ctx,x+cw-45,y+42,40,lane.member.orientationDeg,lane.yielded?p.fail:p.line);
    const bx1=x+30,bx2=x+cw-30,by=y+210;
    ctx.strokeStyle=p.border;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(bx1,by);ctx.lineTo(bx2,by);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle=p.rafter;ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx1,by-28);ctx.lineTo(bx1,by+28);ctx.moveTo(bx2,by-28);ctx.lineTo(bx2,by+28);ctx.stroke();
    const amp=lane.result.deltaNormalMm/maxDelta*70;
    ctx.strokeStyle=lane.yielded?p.fail:p.line;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(bx1,by);ctx.quadraticCurveTo((bx1+bx2)/2,by+amp*2,bx2,by);ctx.stroke();
    drawDistributedLoad(ctx,bx1+8,bx2-8,by,lane.result.loads.normalKNM,p.normal,`w⊥ ${compact(lane.result.loads.normalKNM)} kN/m`);
    ctx.fillStyle=p.parallel;ctx.font='800 14px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(`w∥ ${compact(lane.result.loads.parallelKNM)} kN/m · out-of-plane component`,x+18,y+292);
    const util=Math.min(1,lane.result.utilization);ctx.fillStyle=p.panel;ctx.fillRect(x+18,y+315,cw-36,12);ctx.fillStyle=lane.yielded?p.fail:p.good;ctx.fillRect(x+18,y+315,(cw-36)*util,12);
    ctx.fillStyle=lane.yielded?p.fail:p.text;ctx.font='900 15px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(lane.yielded?`YIELDED at ${compact(lane.firstYieldFactor,2)}× · lane frozen`:`ELASTIC · ${(lane.result.utilization*100).toFixed(1)}% of Fy`,x+18,y+350);
    ctx.fillStyle=p.muted;ctx.font='600 13px ui-monospace,SFMono-Regular,Consolas,monospace';
    ctx.fillText(`M⊥=${compact(lane.result.momentNormalKNM)} kN·m · M∥=${compact(lane.result.momentParallelKNM)} kN·m`,x+18,y+382);
    ctx.fillText(`σgross=${compact(lane.result.grossEnvelopeStressMPa,1)} MPa / Fy=${lane.result.yieldStrengthMPa} MPa`,x+18,y+407);
    ctx.fillText(`δ⊥=${compact(lane.result.deltaNormalMm,2)} mm · δ∥=${compact(lane.result.deltaParallelMm,2)} mm`,x+18,y+432);
    ctx.fillText(`gross resultant δ=${compact(lane.result.resultantDeflectionMm,2)} mm`,x+18,y+455);
  });
  const yielded=lanes.filter(l=>l.yielded).length;ctx.textAlign='left';ctx.fillStyle=p.text;ctx.font='800 16px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(`Shared factor ${compact(factor,3)}× · ${yielded}/${lanes.length} yielded · each yielded lane is held at its own elastic first-yield snapshot`,42,680);
  ctx.fillStyle=p.muted;ctx.font='600 13px ui-sans-serif,system-ui,sans-serif';ctx.fillText('SCREENING: gross section only; local/distortional/LTB, fasteners, welds, roof diaphragm and post-yield behavior are not modeled.',42,705);
}

function updateDom(context = buildCaseContext(), factor = animation.factor) {
  const lanes=laneResults(context,factor); const representative=lanes[0]?.result;
  ui.factor.textContent=`${compact(factor,2)}×`; ui.normal.textContent=`${compact(representative?.loads.normalKNM ?? 0)} kN/m`; ui.parallel.textContent=`${compact(representative?.loads.parallelKNM ?? 0)} kN/m`;
  ui.case.textContent=context.input.mode==='envelope'?`AUTO ${context.common.windSense.toUpperCase()} · ${compact(context.common.windPressureKPa,2)} kPa`:`${context.common.windSense.toUpperCase()} · ${compact(context.common.windPressureKPa,2)} kPa`; ui.yieldState.textContent=`${lanes.filter(l=>l.yielded).length} / ${lanes.length} yielded`;
  ui.results.innerHTML=lanes.map((lane)=>`<article class="cp-loadcase-result-card"><h3>${lane.member.label} · ${lane.member.orientationDeg}°</h3><dl><dt>Axis for roof-normal load</dt><dd>${lane.result.axes.normalAxis}</dd><dt>Axis for down-slope load</dt><dd>${lane.result.axes.parallelAxis}</dd><dt>First-yield factor</dt><dd>${Number.isFinite(lane.firstYieldFactor)?compact(lane.firstYieldFactor,2)+'×':'—'}</dd><dt>Gross stress now</dt><dd>${compact(lane.result.grossEnvelopeStressMPa,1)} MPa</dd><dt>δ roof-normal</dt><dd>${compact(lane.result.deltaNormalMm,2)} mm</dd><dt>δ down-slope</dt><dd>${compact(lane.result.deltaParallelMm,2)} mm</dd></dl></article>`).join('');
  const preset=selectedPreset(), baseLoads=resolveRoofLineLoads({ ...context.common,preset,densityKgM3:DENSITY_KG_M3 });
  ui.equations.innerHTML=`<strong>Shared load decomposition at 1.00× input</strong><br>q<sub>g</sub> = D + Lr = ${compact(context.common.deadLoadKPa,2)} + ${compact(context.common.roofLiveLoadKPa,2)} = ${compact(baseLoads.gravityAreaKPa,2)} kPa<br>w<sub>g,area</sub> = q<sub>g</sub>s = ${compact(baseLoads.gravityAreaKPa,2)} × ${compact(context.common.tributaryWidthM,2)} = ${compact(baseLoads.gravityAreaLineKNM)} kN/m<br>w<sub>self</sub> = ρAg = ${compact(baseLoads.selfWeightKNM)} kN/m ${context.common.mode==='wind'?'(excluded in Wind Only mode)':''}<br>selected wind = ${context.common.windSense} ${compact(context.common.windPressureKPa,2)} kPa → ${compact(baseLoads.windNormalKNM)} kN/m roof-normal<br>w<sub>⊥</sub> = w<sub>g</sub>cosθ ± w<sub>wind</sub> = ${compact(baseLoads.normalKNM)} kN/m<br>w<sub>∥</sub> = w<sub>g</sub>sinθ = ${compact(baseLoads.parallelKNM)} kN/m<br><br><strong>For each simply supported purlin</strong><br>M<sub>⊥</sub> = w<sub>⊥</sub>L²/8 · M<sub>∥</sub> = w<sub>∥</sub>L²/8<br>σ<sub>gross</sub> = |M<sub>⊥</sub>|/Z<sub>⊥</sub> + |M<sub>∥</sub>|/Z<sub>∥</sub><br>δ = 5wL⁴/(384EI) independently about the two mapped gross axes.<br><br><strong>Current common test target:</strong> ${compact(context.targetFactor,2)}×${context.sequence.allYieldReachable?' · reaches every active gross first-yield':' · capped before every member yields'}.`;
  drawVectorCanvas(context); drawVideo(context,factor);
}

function stopLoop() { if(animation.raf) cancelAnimationFrame(animation.raf); animation.raf=0; animation.running=false; animation.paused=false; ui.pause.textContent='PAUSE'; }

function resetAnimation() { stopLoop(); animation.factor=0; animation.caseContext=buildCaseContext(); animation.targetFactor=animation.caseContext.targetFactor; updateDom(animation.caseContext,0); }

function finishAnimation() {
  animation.factor=animation.targetFactor; updateDom(animation.caseContext,animation.factor); stopLoop();
  if(animation.recording&&animation.recorder?.state!=='inactive') animation.recorder.stop();
}

function frame(now) {
  if(!animation.running||animation.paused) return;
  const duration=Number(ui.duration.value)*1000; const elapsed=animation.elapsedMs+(now-animation.startMs); const progress=Math.min(1,elapsed/duration);
  animation.factor=animation.targetFactor*progress; updateDom(animation.caseContext,animation.factor);
  if(progress>=1){finishAnimation();return;} animation.raf=requestAnimationFrame(frame);
}

function startAnimation({ fromZero=true }={}) {
  if(fromZero){stopLoop();animation.factor=0;animation.elapsedMs=0;animation.caseContext=buildCaseContext();animation.targetFactor=animation.caseContext.targetFactor;updateDom(animation.caseContext,0);} else if(!animation.caseContext) animation.caseContext=buildCaseContext();
  animation.running=true;animation.paused=false;animation.startMs=performance.now();ui.pause.textContent='PAUSE';animation.raf=requestAnimationFrame(frame);
}

function togglePause() {
  if(!animation.running) return;
  if(!animation.paused){animation.paused=true;animation.elapsedMs+=performance.now()-animation.startMs;if(animation.raf)cancelAnimationFrame(animation.raf);animation.raf=0;ui.pause.textContent='RESUME';}
  else{animation.paused=false;animation.startMs=performance.now();ui.pause.textContent='PAUSE';animation.raf=requestAnimationFrame(frame);}
}

function waitFrames(count=2){return new Promise((resolve)=>{const tick=()=>count--<=0?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);});}

async function recordVideo() {
  if(animation.recording) return;
  if(typeof MediaRecorder==='undefined'||typeof ui.videoCanvas.captureStream!=='function'){alert('This browser does not expose canvas WebM recording.');return;}
  resetAnimation(); await waitFrames(2); drawVideo(animation.caseContext,0); await waitFrames(1);
  const stream=ui.videoCanvas.captureStream(FPS); const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||'';
  animation.chunks=[];animation.recording=true;ui.record.textContent='RECORDING…';
  const recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);animation.recorder=recorder;
  recorder.ondataavailable=(event)=>{if(event.data?.size)animation.chunks.push(event.data)};
  recorder.onstop=()=>{const blob=new Blob(animation.chunks,{type:recorder.mimeType||'video/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');const theme=document.documentElement.dataset.ftTheme==='paper-matte'?'paper-matte':'lab-dark';a.href=url;a.download=`futoltech-c-purlin-gravity-wind-${animation.caseContext.common.windSense}-${theme}-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);animation.recording=false;ui.record.textContent='RECORD + DOWNLOAD VIDEO';root.dataset.lastRecordedBytes=String(blob.size);root.dataset.lastRecordedTheme=theme;};
  recorder.start(250); startAnimation({fromZero:true});
}

function bind() {
  const inputs=[ui.mode,ui.section,ui.grade,ui.span,ui.slope,ui.tributary,ui.dead,ui.live,ui.windUplift,ui.windDownward,ui.windSense,ui.maxFactor,ui.third,...ui.orientations];
  inputs.forEach((control)=>{control.addEventListener(control.tagName==='SELECT'||control.type==='checkbox'?'change':'input',()=>{syncModeDisabledState();resetAnimation();});});
  ui.resetInputs.addEventListener('click',resetInputs);ui.start.addEventListener('click',()=>startAnimation({fromZero:true}));ui.pause.addEventListener('click',togglePause);ui.reset.addEventListener('click',resetAnimation);ui.record.addEventListener('click',recordVideo);
  window.addEventListener('ft-theme-change',()=>{if(animation.caseContext)updateDom(animation.caseContext,animation.factor)});
}

function mount() {
  injectStyles(); populateSections(); bind(); syncModeDisabledState(); resetAnimation();
  root.dataset.cpLoadcaseReady='true';
  window.__FT_C_PURLIN_LOAD_CASES__={getState:()=>({factor:animation.factor,targetFactor:animation.targetFactor,running:animation.running,recording:animation.recording,theme:document.documentElement.dataset.ftTheme,context:animation.caseContext}),render:()=>updateDom(animation.caseContext??buildCaseContext(),animation.factor),reset:resetAnimation};
}

if (root) mount();
