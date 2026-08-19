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

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
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
    if (!material || !preset || preset.productCategory !== 'c-purlin') throw new Error('Every active visual specimen must be a C-purlin.');
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

function drawRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, width/2, height/2));
  if (fill) { ctx.fillStyle=fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle=stroke; ctx.stroke(); }
}

function drawCSection(ctx, x, y, size, degrees, color) {
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate((degrees || 0) * Math.PI / 180);
  ctx.strokeStyle=color;
  ctx.lineWidth=Math.max(5,size*.13);
  ctx.lineCap='round';
  const h=size, b=size*.48, lip=size*.18;
  ctx.beginPath();
  ctx.moveTo(b,-h/2+lip); ctx.lineTo(b,-h/2); ctx.lineTo(0,-h/2);
  ctx.lineTo(0,h/2); ctx.lineTo(b,h/2); ctx.lineTo(b,h/2-lip);
  ctx.stroke();
  ctx.restore();
}

function staticRafterGeometry(lane, slopeDeg) {
  const theta = slopeDeg * Math.PI / 180;
  const length = Math.min(270, lane.width - 70);
  const cx = lane.x + lane.width/2;
  const cy = lane.y + 175;
  const dx = Math.cos(theta) * length/2;
  const dy = Math.sin(theta) * length/2;
  return {
    start:{x:cx-dx,y:cy+dy},
    end:{x:cx+dx,y:cy-dy},
    center:{x:cx,y:cy},
    theta
  };
}

function drawAngleArc(ctx, geometry, slopeDeg, colors) {
  const origin = geometry.start;
  const radius = 34;
  ctx.save();
  ctx.strokeStyle=colors.warning;
  ctx.fillStyle=colors.warning;
  ctx.lineWidth=2;
  ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(origin.x,origin.y); ctx.lineTo(origin.x+70,origin.y); ctx.stroke();
  ctx.setLineDash([]);
  if (slopeDeg > 0) {
    ctx.beginPath();
    ctx.arc(origin.x,origin.y,radius,-slopeDeg*Math.PI/180,0,false);
    ctx.stroke();
  }
  ctx.font='800 13px ui-monospace, SFMono-Regular, Consolas, monospace';
  ctx.fillText(`θ = ${compact(slopeDeg,1)}°`,origin.x+42,origin.y-11);
  ctx.restore();
}

function drawStaticSetup(staticCanvas) {
  const selections=currentSelections();
  const slope=slopeNow();
  const colors=palette();
  const ctx=staticCanvas.getContext('2d');
  const width=staticCanvas.width, height=staticCanvas.height;
  ctx.clearRect(0,0,width,height); ctx.fillStyle=colors.bg; ctx.fillRect(0,0,width,height);
  ctx.textAlign='left'; ctx.fillStyle=colors.warning; ctx.font='800 16px system-ui,sans-serif';
  ctx.fillText('STATIC ROOF-SLOPE / RAFTER ATTACHMENT REFERENCE',32,34);
  ctx.fillStyle=colors.text; ctx.font='900 22px system-ui,sans-serif';
  ctx.fillText('Cross-section through the sloping rafter — no load, no deflection, no support symbols',32,65);
  ctx.fillStyle=colors.muted; ctx.font='13px system-ui,sans-serif';
  ctx.fillText('The C-purlin axis runs perpendicular to this cross-section (out of the page). This view only explains installation orientation and roof slope.',32,89);

  const count=selections.length;
  const gap=count===3?20:44;
  const laneWidth=(width-64-gap*(count-1))/count;
  const lanes=Array.from({length:count},(_,i)=>({x:32+i*(laneWidth+gap),y:108,width:laneWidth,height:205}));
  const setupGeometry=[];
  selections.forEach((selection,index)=>{
    const lane=lanes[index];
    drawRoundRect(ctx,lane.x,lane.y,lane.width,lane.height,14,colors.lane,colors.border);
    ctx.fillStyle=colors.text; ctx.font=`800 ${count===3?15:17}px system-ui,sans-serif`;
    ctx.fillText(`${selection.label} · section orientation ${selection.orientationDeg}°`,lane.x+14,lane.y+25);
    const g=staticRafterGeometry(lane,slope);
    ctx.strokeStyle=colors.rafter; ctx.lineWidth=9; ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(g.start.x,g.start.y);ctx.lineTo(g.end.x,g.end.y);ctx.stroke();
    ctx.lineWidth=1; ctx.fillStyle=colors.muted; ctx.font='12px system-ui,sans-serif';
    ctx.fillText('RAFTER',g.end.x-45,g.end.y-10);
    drawAngleArc(ctx,g,slope,colors);

    // Orientation is local to the roof/rafter plane: 0° follows the sloping seat,
    // then 90/180/270 rotate the same C-section about its longitudinal axis.
    const sectionRotationDeg=selection.orientationDeg-slope;
    const sectionY=g.center.y-28;
    drawCSection(ctx,g.center.x-12,sectionY,54,sectionRotationDeg,colors.accent);
    ctx.strokeStyle=colors.warning; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(g.center.x-26,g.center.y-4); ctx.lineTo(g.center.x-18,g.center.y-12); ctx.lineTo(g.center.x-10,g.center.y-4); ctx.stroke();
    ctx.fillStyle=colors.muted; ctx.font='11px system-ui,sans-serif';
    ctx.fillText('welded to rafter',g.center.x+18,g.center.y+24);
    setupGeometry.push({
      id:selection.id,
      rafterStartY:g.start.y,
      rafterEndY:g.end.y,
      slopeDeg:slope,
      sectionRotationDeg,
      supportSymbols:false,
      animated:false
    });
  });
  window.__FT_C_PURLIN_SEPARATED_VIEWS__={
    ...(window.__FT_C_PURLIN_SEPARATED_VIEWS__||{}),
    staticSetup:{slopeDeg:slope,memberGeometry:setupGeometry,supportSymbols:false,animated:false}
  };
}

function longitudinalGeometry(lane) {
  const x0=lane.x+24, x1=lane.x+lane.width-24, y=lane.y+150;
  return {start:{x:x0,y},end:{x:x1,y},center:{x:(x0+x1)/2,y}};
}

function drawTransverseRafter(ctx,x,y,colors,labelSide='left') {
  ctx.save();
  ctx.strokeStyle=colors.rafter;ctx.lineWidth=8;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x,y-30);ctx.lineTo(x,y+30);ctx.stroke();
  ctx.fillStyle=colors.muted;ctx.font='10px system-ui,sans-serif';ctx.textAlign=labelSide==='left'?'left':'right';
  ctx.fillText('RAFTER',x+(labelSide==='left'?7:-7),y+43);
  ctx.restore();
  return {x1:x,y1:y-30,x2:x,y2:y+30};
}

function deflectionAtMid(record) {
  const series=record.result?.deflectionSeries??[];
  if(!series.length)return Math.abs(record.result?.maxDeflectionMm||0);
  const half=(series.at(-1)?.xM||0)/2;
  return Math.abs(series.reduce((best,p)=>Math.abs(p.xM-half)<Math.abs(best.xM-half)?p:best,series[0]).displacementMm||0);
}

function drawVerticalContactArrow(ctx,x,topY,contactY,loadKgf,ratio,colors,compactLayout) {
  const safe=Math.max(topY+38,contactY);
  ctx.save();ctx.strokeStyle=colors.warning;ctx.fillStyle=colors.warning;ctx.lineWidth=3+6*Math.min(1,ratio);
  ctx.beginPath();ctx.moveTo(x,topY);ctx.lineTo(x,safe-16);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,safe);ctx.lineTo(x-10,safe-17);ctx.lineTo(x+10,safe-17);ctx.closePath();ctx.fill();
  ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-13,safe+1);ctx.lineTo(x+13,safe+1);ctx.stroke();
  ctx.font=`800 ${compactLayout?12:15}px ui-monospace,SFMono-Regular,Consolas,monospace`;ctx.textAlign='center';
  ctx.fillText(`${compact(loadKgf,1)} kgf`,x,topY-8);ctx.restore();return safe;
}

function formulaLines(selection,record,loadKN,spanM,compactLayout) {
  const f=centerPointFormulaSnapshot({loadKN,lengthM:spanM,record});
  const props=record.properties??{};
  const E=Number(selection.material.elasticModulusMPa)||0;
  if(f.roofSlopeDeg>.001){
    const n=record.result?.roofNormalResponse??{}, p=record.result?.roofParallelResponse??{};
    const zx=Number(props.zxMm3)||0, zy=Number(props.zyMm3)||0;
    if(compactLayout)return [
      `P⊥=${compact(loadKN,3)}cos${compact(f.roofSlopeDeg,1)}°=${compact(f.roofNormalKN,3)} kN; P∥=${compact(f.roofParallelKN,3)} kN`,
      `M⊥=${compact(n.maxMomentKNm,3)}; M∥=${compact(p.maxMomentKNm,3)} kN·m`,
      `σ=|M⊥|10⁶/${compact(zx,0)}+|M∥|10⁶/${compact(zy,0)}=${compact(f.stressMPa,1)} MPa`,
      `δglobal=${compact(f.deflectionMm,2)} mm`
    ];
    return [
      `P⊥=P cosθ=${compact(loadKN,3)} cos ${compact(f.roofSlopeDeg,1)}°=${compact(f.roofNormalKN,3)} kN; P∥=P sinθ=${compact(f.roofParallelKN,3)} kN`,
      `M⊥=P⊥L/4=${compact(n.maxMomentKNm,3)} kN·m; M∥=${compact(p.maxMomentKNm,3)} kN·m`,
      `σgross=|M⊥|10⁶/Zx+|M∥|10⁶/Zy=${compact(f.stressMPa,1)} MPa`,
      `δglobal=${compact(f.deflectionMm,2)} mm · E=${compact(E,0)} MPa`
    ];
  }
  const Z=Number(props.zxMm3)||0, I=Number(props.ixMm4)||0, M=Number(f.maxMomentKNm)||0;
  return [
    `P=${compact(loadKN,3)} kN (${compact(loadKN*KGF_PER_KN,1)} kgf), L=${compact(spanM,2)} m`,
    `Mmax=PL/4=${compact(M,3)} kN·m`,
    `σ=M×10⁶/Z=${compact(M,3)}×10⁶/${compact(Z,0)}=${compact(f.stressMPa,1)} MPa`,
    `δ=P·1000(L·1000)³/(48EI)=${compact(f.deflectionMm,2)} mm · I=${compact(I,0)} mm⁴`
  ];
}

function sequenceState() {
  const state=window.__FT_C_PURLIN_PHYSICS_POLISH_V3__?.getState?.();
  return state?.sequence?.length ? state : null;
}

function recordForLoad(solved,id){return solved.result.records.find((record)=>record.comparisonId===id)??null;}

function drawLongitudinalCanvas(canvas,loadKN) {
  const state=sequenceState();
  if(!state)return;
  const current=solveAtLoad(loadKN);
  const colors=palette(),ctx=canvas.getContext('2d'),width=canvas.width,height=canvas.height;
  ctx.clearRect(0,0,width,height);ctx.fillStyle=colors.bg;ctx.fillRect(0,0,width,height);
  const count=current.selections.length;
  const thresholdById=new Map(state.sequence.map((item)=>[item.id,item.thresholdKN]));
  const yieldedCount=state.sequence.filter((item)=>loadKN>=item.thresholdKN*.999999).length;
  ctx.textAlign='left';ctx.fillStyle=colors.warning;ctx.font='800 16px system-ui,sans-serif';
  ctx.fillText('FUTOLTECH ENGINEERING AND PROJECT SYSTEMS',36,34);
  ctx.fillStyle=colors.text;ctx.font='900 24px system-ui,sans-serif';
  ctx.fillText(`LONGITUDINAL C-PURLIN LOAD / DEFLECTION ANIMATION · ${count} MEMBERS`,36,66);
  ctx.fillStyle=colors.muted;ctx.font='13px system-ui,sans-serif';
  ctx.fillText('View along the C-purlin span between rafters. Rafters are transverse/perpendicular to the purlin; roof slope is handled in the solver load decomposition, not by tilting this span view.',36,91);
  ctx.textAlign='right';ctx.fillStyle=yieldedCount?colors.danger:colors.warning;ctx.font='900 30px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`${compact(loadKN*KGF_PER_KN,1)} kgf`,width-36,58);
  ctx.fillStyle=colors.muted;ctx.font='13px ui-monospace,SFMono-Regular,Consolas,monospace';ctx.fillText(`${compact(loadKN,3)} kN · ${yieldedCount}/${count} yielded`,width-36,82);

  const thresholdRecords=state.sequence.map((item)=>recordForLoad(solveAtLoad(item.thresholdKN),item.id)).filter(Boolean);
  const maxYieldDeflection=Math.max(.01,...thresholdRecords.map((record)=>Math.abs(record.result?.maxDeflectionMm||0)));
  const pxPerMm=Math.min(54/maxYieldDeflection,18);
  const gap=count===3?22:50,totalWidth=width-72,laneWidth=(totalWidth-gap*(count-1))/count;
  const lanes=Array.from({length:count},(_,i)=>({x:36+i*(laneWidth+gap),y:125,width:laneWidth}));
  const memberGeometry=[];

  current.selections.forEach((selection,index)=>{
    const lane=lanes[index],thresholdKN=thresholdById.get(selection.id),yielded=loadKN>=thresholdKN*.999999;
    const displayLoadKN=yielded?thresholdKN:loadKN;
    const displaySolved=yielded?solveAtLoad(thresholdKN):current;
    const record=recordForLoad(displaySolved,selection.id);
    if(!record)return;
    const compactLayout=lane.width<430,accent=yielded?colors.danger:colors.accent;
    drawRoundRect(ctx,lane.x,lane.y,lane.width,440,15,colors.lane,colors.border);
    ctx.textAlign='left';ctx.fillStyle=colors.text;ctx.font=`800 ${compactLayout?16:19}px system-ui,sans-serif`;
    ctx.fillText(`${selection.label} · orientation ${selection.orientationDeg}°`,lane.x+16,lane.y+27);
    ctx.fillStyle=colors.muted;ctx.font=`${compactLayout?10:12}px system-ui,sans-serif`;
    const label=selection.preset.label.replace(/ —.*/, '');ctx.fillText(label.length>(compactLayout?38:58)?`${label.slice(0,compactLayout?35:55)}…`:label,lane.x+16,lane.y+48);
    drawCSection(ctx,lane.x+lane.width-(compactLayout?42:55),lane.y+38,compactLayout?36:46,selection.orientationDeg,accent);

    const g=longitudinalGeometry(lane);
    ctx.strokeStyle=colors.reference;ctx.setLineDash([5,5]);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(g.start.x,g.start.y);ctx.lineTo(g.end.x,g.end.y);ctx.stroke();ctx.setLineDash([]);
    const leftRafter=drawTransverseRafter(ctx,g.start.x,g.start.y,colors,'left');
    const rightRafter=drawTransverseRafter(ctx,g.end.x,g.end.y,colors,'right');
    const series=record.result?.deflectionSeries??[];
    ctx.strokeStyle=accent;ctx.lineWidth=compactLayout?4:5;ctx.beginPath();
    if(series.length){
      const total=Math.max(.000001,spanNow());
      series.forEach((point,i)=>{const t=Math.max(0,Math.min(1,Number(point.xM)/total));const x=g.start.x+(g.end.x-g.start.x)*t;const y=g.start.y+Math.abs(Number(point.displacementMm)||0)*pxPerMm;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
    }else{ctx.moveTo(g.start.x,g.start.y);ctx.lineTo(g.end.x,g.end.y);}ctx.stroke();
    const midY=g.center.y+deflectionAtMid(record)*pxPerMm;
    const arrowTipY=drawVerticalContactArrow(ctx,g.center.x,lane.y+72,midY,loadKN*KGF_PER_KN,Math.min(1,loadKN/thresholdKN),colors,compactLayout);

    const use=Math.min(1,Math.max(0,displayLoadKN/thresholdKN)),barX=lane.x+16,barY=lane.y+236,barW=lane.width-32;
    ctx.fillStyle=colors.bar;ctx.fillRect(barX,barY,barW,12);ctx.fillStyle=yielded?colors.danger:use>=.8?colors.warning:colors.accent;ctx.fillRect(barX,barY,use*barW,12);
    ctx.fillStyle=yielded?colors.danger:colors.text;ctx.font=`800 ${compactLayout?10:12}px ui-monospace,SFMono-Regular,Consolas,monospace`;
    ctx.fillText(yielded?`YIELDED at ${compact(thresholdKN*KGF_PER_KN,1)} kgf · deflection lane frozen at first yield`:use>=.8?`NEAR YIELD · ${compact(use*100,1)}%`:`ELASTIC · ${compact(use*100,1)}% of first-yield load`,barX,barY+31);
    ctx.fillStyle=colors.formula;ctx.font=`${compactLayout?9:11}px ui-monospace,SFMono-Regular,Consolas,monospace`;
    formulaLines(selection,record,displayLoadKN,spanNow(),compactLayout).forEach((line,i)=>ctx.fillText(line,barX,lane.y+306+i*23));
    memberGeometry.push({id:selection.id,startY:g.start.y,endY:g.end.y,midY,arrowTipY,leftRafter,rightRafter,raftersPerpendicular:true,yielded,thresholdKN});
  });

  ctx.textAlign='left';ctx.fillStyle=colors.formula;ctx.font='13px ui-monospace,SFMono-Regular,Consolas,monospace';
  ctx.fillText(`Shared purlin span=${compact(spanNow(),2)} m · roof slope=${compact(slopeNow(),1)}° is applied in P⊥/P∥ solver decomposition · vertical point load at L/2`,36,602);
  const seq=state.sequence.map((item,i)=>`${i+1}. ${item.label} ${compact(item.thresholdKN*KGF_PER_KN,1)} kgf`).join('   →   ');ctx.fillText(`Yield sequence: ${seq}`,36,629);
  ctx.fillText('Only this longitudinal view animates deflection. The static installation view above does not move.',36,656);
  ctx.fillStyle=colors.muted;ctx.font='12px system-ui,sans-serif';ctx.fillText('SCREENING: effective width, local/distortional/LTB, weld/tek-screw stiffness, diaphragm action and post-yield failure remain outside this model.',36,685);
  window.__FT_C_PURLIN_SEPARATED_VIEWS__={
    ...(window.__FT_C_PURLIN_SEPARATED_VIEWS__||{}),
    animation:{loadKN,roofSlopeDeg:slopeNow(),memberGeometry,view:'longitudinal-span',baselineRotatesWithRoofSlope:false,raftersPerpendicular:true}
  };
}

function preferredMime(){if(typeof MediaRecorder==='undefined')return null;return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find((t)=>MediaRecorder.isTypeSupported?.(t))??'video/webm';}
function startVisibleRecording(canvas,button){
  if(!canvas.captureStream||typeof MediaRecorder==='undefined')throw new Error('This browser does not support canvas video recording.');
  const mimeType=preferredMime();const recorder=new MediaRecorder(canvas.captureStream(30),mimeType?{mimeType,videoBitsPerSecond:6_000_000}:undefined);const chunks=[];
  recorder.addEventListener('dataavailable',(e)=>{if(e.data?.size)chunks.push(e.data);});
  recorder.addEventListener('stop',()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});if(!blob.size)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`futoltech-c-purlin-longitudinal-load-to-yield-${Date.now()}.webm`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);button.textContent='RECORD + DOWNLOAD VIDEO';});
  recorder.start(250);button.textContent='RECORDING…';return recorder;
}

function mount(){
  if(!panel||panel.dataset.separatedViewsV4==='true')return;
  const oldPolished=panel.querySelector('[data-cpy-polished-canvas]');
  const legacy=panel.querySelector('[data-cpy-canvas]');
  if(!oldPolished)return;
  panel.dataset.separatedViewsV4='true';
  const style=document.createElement('style');style.id='ft-cp-separated-views-v4';style.textContent=`
    .c-purlin-physics-bench [data-cpy-canvas],.c-purlin-physics-bench [data-cpy-polished-canvas]{display:none!important}
    .c-purlin-physics-bench [data-cpy-static-setup-canvas],.c-purlin-physics-bench [data-cpy-longitudinal-canvas]{display:block!important;width:100%;height:auto;border:1px solid var(--border);border-radius:12px;background:var(--panel);}
    .c-purlin-physics-bench [data-cpy-static-setup-canvas]{aspect-ratio:1280/340;margin-top:.75rem}
    .c-purlin-physics-bench [data-cpy-longitudinal-canvas]{aspect-ratio:16/9;margin-top:.7rem}
  `;document.head.appendChild(style);
  legacy?.setAttribute('aria-hidden','true');oldPolished.setAttribute('aria-hidden','true');

  const staticCanvas=document.createElement('canvas');staticCanvas.width=1280;staticCanvas.height=340;staticCanvas.dataset.cpyStaticSetupCanvas='true';staticCanvas.setAttribute('aria-label','Static roof slope and C-purlin to rafter installation reference');
  const animationCanvas=document.createElement('canvas');animationCanvas.width=1280;animationCanvas.height=720;animationCanvas.dataset.cpyLongitudinalCanvas='true';animationCanvas.setAttribute('aria-label','Longitudinal C-purlin span deflection animation between perpendicular rafters');
  oldPolished.insertAdjacentElement('beforebegin',staticCanvas);oldPolished.insertAdjacentElement('beforebegin',animationCanvas);

  let lastStaticSignature='';let lastAnimationSignature='';
  function staticSignature(){try{return `${document.documentElement.dataset.ftTheme}|${slopeNow()}|${currentSelections().map((s)=>`${s.id}:${s.orientationDeg}:${s.preset.id}`).join('|')}`;}catch{return 'invalid';}}
  function animationSignature(){const f=window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__;return f?`${document.documentElement.dataset.ftTheme}|${f.loadKN}|${slopeNow()}|${spanNow()}|${currentSelections().map((s)=>`${s.id}:${s.orientationDeg}:${s.preset.id}`).join('|')}`:'none';}
  function render(){
    const ss=staticSignature();if(ss!==lastStaticSignature){lastStaticSignature=ss;try{drawStaticSetup(staticCanvas);}catch{}}
    const f=window.__FT_LAST_C_PURLIN_PHYSICS_FRAME__;const as=animationSignature();if(f&&as!==lastAnimationSignature){lastAnimationSignature=as;try{drawLongitudinalCanvas(animationCanvas,Number(f.loadKN)||0);}catch{}}
  }
  function loop(){render();requestAnimationFrame(loop);}requestAnimationFrame(loop);
  panel.addEventListener('input',()=>setTimeout(render,0));panel.addEventListener('change',()=>setTimeout(render,0));document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change',()=>setTimeout(render,100));window.addEventListener('ft-theme-change',()=>setTimeout(render,0));

  const oldRecord=panel.querySelector('[data-cpy-record]');
  if(oldRecord){
    const recordButton=oldRecord.cloneNode(true);oldRecord.replaceWith(recordButton);
    let recorder=null;
    recordButton.addEventListener('click',()=>{
      try{
        if(recorder&&recorder.state!=='inactive')return;
        render();recorder=startVisibleRecording(animationCanvas,recordButton);
        panel.querySelector('[data-cpy-start]')?.click();
        const watch=setInterval(()=>{
          const status=panel.querySelector('[data-cpy-status]')?.textContent||'';
          if(/ALL ACTIVE MEMBERS REACHED FIRST YIELD/i.test(status)){
            clearInterval(watch);setTimeout(()=>{if(recorder?.state==='recording'||recorder?.state==='paused')recorder.stop();recorder=null;},450);
          }
        },100);
      }catch(error){recordButton.textContent='RECORD + DOWNLOAD VIDEO';const banner=panel.querySelector('[data-cpy-error]');if(banner){banner.hidden=false;banner.textContent=error.message||String(error);}}
    });
  }
  render();
}

mount();
