import { resolveRoofLineLoads } from './solver/cPurlinLoadCases.js';

const root = document.querySelector('[data-cp-loadcase-app]');
const DENSITY_KG_M3 = 7850;

function compact(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper ? {
    bg:'#fffaf0', card:'#fffdf8', text:'#172127', muted:'#46535a', border:'#8f806b', rafter:'#625a50',
    purlin:'#176a60', gravity:'#a96808', wind:'#1769a8', normal:'#6c35a0', parallel:'#12695a', resultant:'#a52f36', weld:'#8f670d'
  } : {
    bg:'#07141c', card:'#0b2029', text:'#ecfbff', muted:'#a9bdc7', border:'#35515c', rafter:'#a9bdc7',
    purlin:'#67e6cf', gravity:'#ffd65c', wind:'#69b9ff', normal:'#cf89ff', parallel:'#6ff2c6', resultant:'#ff6f74', weld:'#ffd65c'
  };
}

function currentContext() {
  return window.__FT_C_PURLIN_LOAD_CASES__?.getState?.()?.context ?? null;
}

function arrow(ctx, x1, y1, x2, y2, color, width = 5) {
  const angle = Math.atan2(y2-y1,x2-x1), head = 14;
  ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-head*Math.cos(angle-.5),y2-head*Math.sin(angle-.5)); ctx.lineTo(x2-head*Math.cos(angle+.5),y2-head*Math.sin(angle+.5)); ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawC(ctx,x,y,size,degrees,color){
  ctx.save(); ctx.translate(x,y); ctx.rotate(degrees*Math.PI/180); ctx.strokeStyle=color; ctx.lineWidth=Math.max(4,size*.075); ctx.lineJoin='miter';
  ctx.beginPath(); ctx.moveTo(size*.35,-size*.5); ctx.lineTo(-size*.35,-size*.5); ctx.lineTo(-size*.35,size*.5); ctx.lineTo(size*.35,size*.5);
  ctx.moveTo(size*.35,-size*.5); ctx.lineTo(size*.35,-size*.27); ctx.moveTo(size*.35,size*.5); ctx.lineTo(size*.35,size*.27); ctx.stroke(); ctx.restore();
}

function box(ctx,p,x,y,w,h,title,value,color){
  ctx.save(); ctx.fillStyle=p.card; ctx.strokeStyle=p.border; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(x,y,w,h,12); ctx.fill(); ctx.stroke();
  ctx.fillStyle=color; ctx.font='900 16px ui-sans-serif,system-ui,sans-serif'; ctx.textAlign='left'; ctx.fillText(title,x+14,y+24);
  ctx.fillStyle=p.text; ctx.font='800 18px ui-monospace,SFMono-Regular,Consolas,monospace'; ctx.fillText(value,x+14,y+50); ctx.restore();
}

function draw(canvas){
  const context=currentContext(); if(!context?.common||!context.members?.length) return;
  const ctx=canvas.getContext('2d'), p=palette(), input=context.common, preset=context.members[0].preset;
  const loads=resolveRoofLineLoads({...input,preset,densityKgM3:DENSITY_KG_M3});
  const theta=input.slopeDeg*Math.PI/180, orientation=Number(context.members[0].orientationDeg||0);
  ctx.fillStyle=p.bg; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.textAlign='left';
  ctx.fillStyle=p.text; ctx.font='900 28px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('FUTOLTECH ENGINEERING & PROJECT SYSTEMS',42,42);
  ctx.font='900 31px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('ROOF CROSS-SECTION · GRAVITY + WIND VECTOR EXPLANATION',42,82);
  ctx.fillStyle=p.muted; ctx.font='500 17px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('Static load-path view · C-purlin seated on the rafter · vectors kept in dedicated non-overlap zones.',42,110);
  ctx.strokeStyle=p.border; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(42,128); ctx.lineTo(1238,128); ctx.stroke();

  // Reserved left annotation column.
  box(ctx,p,55,150,270,68,'GRAVITY · VERTICAL',`${compact(loads.gravityVerticalKNM)} kN/m ↓`,p.gravity);
  box(ctx,p,55,238,270,68,`WIND · ${loads.windSense.toUpperCase()}`,`${compact(Math.abs(loads.windNormalKNM))} kN/m ⟂ roof`,p.wind);

  // Geometry occupies the centre only.
  const x1=355,y1=435,rafterLength=520,x2=x1+Math.cos(theta)*rafterLength,y2=y1-Math.sin(theta)*rafterLength;
  ctx.strokeStyle=p.rafter; ctx.lineWidth=13; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.strokeStyle=p.border; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x1+135,y1); ctx.stroke(); ctx.beginPath(); ctx.arc(x1,y1,70,0,-theta,true); ctx.stroke();
  ctx.fillStyle=p.text; ctx.font='800 17px ui-monospace,SFMono-Regular,Consolas,monospace'; ctx.fillText(`θ = ${compact(input.slopeDeg,1)}°`,x1+78,y1-18);

  const seatT=.52, seatX=x1+(x2-x1)*seatT, seatY=y1+(y2-y1)*seatT, nx=Math.sin(theta), ny=Math.cos(theta);
  const purlinX=seatX-nx*42,purlinY=seatY-ny*42;
  drawC(ctx,purlinX,purlinY,82,orientation-input.slopeDeg,p.purlin);
  ctx.fillStyle=p.weld; ctx.save(); ctx.translate(seatX,seatY); ctx.rotate(-theta); ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(0,-15); ctx.lineTo(9,-4); ctx.lineTo(0,4); ctx.closePath(); ctx.fill(); ctx.restore();

  // Compact member badge above geometry — never intersects the rafter.
  ctx.fillStyle=p.card; ctx.strokeStyle=p.border; ctx.lineWidth=1.2; ctx.beginPath(); ctx.roundRect(390,148,430,52,10); ctx.fill(); ctx.stroke();
  ctx.fillStyle=p.text; ctx.font='900 16px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(`MEMBER A · ${orientation}° · SEATED ON RAFTER`,406,171);
  ctx.fillStyle=p.muted; ctx.font='600 13px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('C-purlin axis runs out of page; section rotates with the sloping installation datum.',406,191);

  const scale=68/Math.max(.25,loads.gravityVerticalKNM,Math.abs(loads.windNormalKNM),loads.resultantKNM);
  if(loads.gravityVerticalKNM>1e-9) arrow(ctx,210,320,210,320+Math.max(45,loads.gravityVerticalKNM*scale),p.gravity,6);
  const windSign=Math.sign(loads.windNormalKNM)||(loads.windSense==='uplift'?-1:1),windAnchorX=seatX+nx*86,windAnchorY=seatY+ny*86,windLen=Math.max(52,Math.abs(loads.windNormalKNM)*scale);
  if(Math.abs(loads.windNormalKNM)>1e-9) arrow(ctx,windAnchorX,windAnchorY,windAnchorX+nx*windSign*windLen,windAnchorY+ny*windSign*windLen,p.wind,6);

  // Dedicated right result panel.
  const px=920,py=150,pw=315,ph=300; ctx.fillStyle=p.card; ctx.strokeStyle=p.border; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(px,py,pw,ph,14); ctx.fill(); ctx.stroke();
  ctx.fillStyle=p.text; ctx.font='900 18px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('RESOLVED LINE LOADS',px+18,py+30);
  ctx.fillStyle=p.muted; ctx.font='600 13px ui-sans-serif,system-ui,sans-serif'; ctx.fillText('Same load expressed in roof axes',px+18,py+52);
  const ox=px+82,oy=py+142,vs=54/Math.max(.25,Math.abs(loads.normalKNM),Math.abs(loads.parallelKNM),loads.resultantKNM),tx=-Math.cos(theta),ty=Math.sin(theta);
  arrow(ctx,ox,oy,ox+nx*loads.normalKNM*vs,oy+ny*loads.normalKNM*vs,p.normal,4); arrow(ctx,ox,oy,ox+tx*loads.parallelKNM*vs,oy+ty*loads.parallelKNM*vs,p.parallel,4);
  const rx=nx*loads.normalKNM+tx*loads.parallelKNM, ry=ny*loads.normalKNM+ty*loads.parallelKNM; arrow(ctx,ox,oy,ox+rx*vs,oy+ry*vs,p.resultant,6);
  const rows=[[p.normal,'roof-normal w⊥',loads.normalKNM],[p.parallel,'down-slope w∥',loads.parallelKNM],[p.resultant,'resultant |w|',loads.resultantKNM]];
  rows.forEach(([color,label,value],i)=>{const y=py+108+i*58; ctx.fillStyle=color; ctx.fillRect(px+160,y-10,11,11); ctx.font='800 14px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(label,px+180,y); ctx.fillStyle=p.text; ctx.font='800 16px ui-monospace,SFMono-Regular,Consolas,monospace'; ctx.fillText(`${compact(value)} kN/m`,px+180,y+23);});

  ctx.fillStyle=p.text; ctx.font='800 17px ui-sans-serif,system-ui,sans-serif'; ctx.fillText(`NET ROOF-NORMAL: ${loads.normalDirection.toUpperCase()}`,55,490);
  ctx.fillStyle=p.muted; ctx.font='600 14px ui-monospace,SFMono-Regular,Consolas,monospace'; ctx.fillText('gravity: w⊥ = W cosθ, w∥ = W sinθ   ·   wind: roof-normal in this educational layer',355,490);
  root.dataset.vectorFigureLayout='seated-nonoverlap-v2'; root.dataset.vectorFigureSlopeDeg=String(input.slopeDeg); root.dataset.vectorFigurePurlinRotationDeg=String(orientation-input.slopeDeg);
}

function mount(){
  if(!root) return;
  const wait=()=>{
    const prior=root.querySelector('[data-cplc-vector-clean]');
    if(!prior||!currentContext()){requestAnimationFrame(wait);return;}
    if(root.querySelector('[data-cplc-vector-polished]')) return;
    prior.hidden=true; prior.style.display='none'; prior.removeAttribute('data-cplc-vector');
    const canvas=document.createElement('canvas'); canvas.width=1280; canvas.height=520; canvas.setAttribute('data-cplc-vector-polished',''); canvas.setAttribute('data-cplc-vector',''); canvas.setAttribute('aria-label','Polished roof slope C-purlin gravity wind vector explanation'); prior.insertAdjacentElement('afterend',canvas);
    const redraw=()=>requestAnimationFrame(()=>draw(canvas)); root.querySelectorAll('input,select').forEach(c=>{c.addEventListener('input',redraw);c.addEventListener('change',redraw);}); window.addEventListener('ft-theme-change',redraw); draw(canvas);
  };
  wait();
}

mount();
