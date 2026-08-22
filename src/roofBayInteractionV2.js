import { createRoofBayProject, serializeRoofBayProject } from './interchange/roofBayProject.js';

const root = document.querySelector('[data-roof-bay-app]');

function compact(value, digits = 3) {
  if (!Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper
    ? { accent:'#176a60', select:'#9b5c12', fill:'rgba(207,147,54,.18)', text:'#172127', muted:'#526066', surface:'#fffaf1', line:'#756957', arrow:'#9b5c12' }
    : { accent:'#62e1c7', select:'#ffd36a', fill:'rgba(255,211,106,.13)', text:'#eefbff', muted:'#a8bbc4', surface:'#0a1b24', line:'#66808a', arrow:'#ffd36a' };
}

function injectStyles() {
  if (document.getElementById('ft-roof-bay-interaction-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-interaction-v2-style';
  style.textContent = `
    .roof-bay-v2-tools{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;margin:.75rem 0 1rem;padding:.7rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.2)}
    .roof-bay-v2-tools strong{margin-right:auto}.roof-bay-canvas-stack{position:relative}.roof-bay-canvas-stack>[data-rb-canvas]{position:relative;z-index:1}.roof-bay-selection-overlay{position:absolute;inset:0;z-index:2;width:100%;height:100%;pointer-events:none;background:transparent!important;border:0!important;margin:0!important}
    .roof-bay-focus{display:grid;grid-template-columns:minmax(260px,.7fr) minmax(0,1.3fr);gap:.8rem;margin-top:.8rem}.roof-bay-focus__trace,.roof-bay-focus__exploded{padding:.85rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.2);min-width:0}.roof-bay-focus h3{margin:.1rem 0 .55rem}.roof-bay-focus__trace pre{white-space:pre-wrap;margin:0;font:600 .84rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;color:inherit}.roof-bay-focus__exploded canvas{display:block;width:100%;height:auto;border:0!important;margin:0!important;background:transparent!important}
    [data-rb-body] tr{cursor:pointer}[data-rb-body] tr:hover{background:rgba(98,225,199,.07)}[data-rb-body] tr.is-selected{outline:2px solid var(--accent);outline-offset:-2px;background:rgba(98,225,199,.1)}
    html[data-ft-theme="paper-matte"] .roof-bay-v2-tools,html[data-ft-theme="paper-matte"] .roof-bay-focus__trace,html[data-ft-theme="paper-matte"] .roof-bay-focus__exploded{background:#fffaf1;color:#172127}
    @media(max-width:900px){.roof-bay-focus{grid-template-columns:1fr}}@media print{.roof-bay-v2-tools{display:none!important}.roof-bay-selection-overlay{display:none!important}}
  `;
  document.head.appendChild(style);
}

function arrow(ctx, x1, y1, x2, y2, color, width = 3) {
  const angle = Math.atan2(y2-y1, x2-x1), head = 10;
  ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-head*Math.cos(angle-.55),y2-head*Math.sin(angle-.55)); ctx.lineTo(x2-head*Math.cos(angle+.55),y2-head*Math.sin(angle+.55)); ctx.closePath(); ctx.fill(); ctx.restore();
}

function project(model, xM, yM) {
  const left=110, top=145, bayW=780, bayH=430, skew=130;
  return { x:left+(xM/model.inputs.rafterSpacingM)*bayW+(yM/model.inputs.roofSlopeLengthM)*skew, y:top+(yM/model.inputs.roofSlopeLengthM)*bayH };
}

function modelNow() {
  return window.__FT_ROOF_BAY_MODEL__ ?? null;
}

function download(text, filename) {
  const blob = new Blob([text], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href=url; link.download=filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}

if (root) {
  injectStyles();
  const baseCanvas = root.querySelector('[data-rb-canvas]');
  const summary = root.querySelector('[data-rb-summary]');
  const body = root.querySelector('[data-rb-body]');
  const actions = root.querySelector('.roof-bay-actions');
  const sectionSelect = root.querySelector('[data-rb-section]');
  const fySelect = root.querySelector('[data-rb-fy]');
  if (baseCanvas && summary && body && actions) {
    const stack = document.createElement('div'); stack.className='roof-bay-canvas-stack'; baseCanvas.before(stack); stack.appendChild(baseCanvas);
    const overlay = document.createElement('canvas'); overlay.width=1200; overlay.height=720; overlay.className='roof-bay-selection-overlay'; overlay.dataset.rbSelectionOverlay='true'; stack.appendChild(overlay);

    const tools = document.createElement('div'); tools.className='roof-bay-v2-tools'; tools.innerHTML=`<strong data-rb-selected-label>Selected purlin · —</strong><button class="button button--ghost" type="button" data-rb-cycle>SELECT NEXT PURLIN</button><button class="button" type="button" data-rb-exploded-toggle>EXPLODED LOAD PATH · ON</button><button class="button button--ghost" type="button" data-rb-export-project>EXPORT PROJECT JSON</button>`; actions.insertAdjacentElement('afterend',tools);

    const focus = document.createElement('section'); focus.className='roof-bay-focus'; focus.innerHTML=`<div class="roof-bay-focus__trace"><p class="eyebrow">Selected load path</p><h3 data-rb-focus-title>Purlin trace</h3><pre data-rb-focus-trace>Waiting for model…</pre></div><div class="roof-bay-focus__exploded" data-rb-exploded-panel><p class="eyebrow">Exploded demand routing</p><h3>Sheet → screws → selected purlin → two rafter reactions</h3><canvas width="900" height="330" data-rb-exploded-canvas aria-label="Exploded selected roof load path"></canvas></div>`; summary.insertAdjacentElement('afterend',focus);

    const label=tools.querySelector('[data-rb-selected-label]'), cycle=tools.querySelector('[data-rb-cycle]'), explodedToggle=tools.querySelector('[data-rb-exploded-toggle]'), exportProject=tools.querySelector('[data-rb-export-project]'), focusTitle=focus.querySelector('[data-rb-focus-title]'), trace=focus.querySelector('[data-rb-focus-trace]'), explodedPanel=focus.querySelector('[data-rb-exploded-panel]'), explodedCanvas=focus.querySelector('[data-rb-exploded-canvas]');
    let selectedIndex=1, exploded=true;

    function normalizeSelection(model) {
      if (!model?.purlins?.length) return 0;
      selectedIndex=Math.max(0,Math.min(selectedIndex,model.purlins.length-1));
      return selectedIndex;
    }

    function selected(model) { return model?.purlins?.[normalizeSelection(model)] ?? null; }

    function drawOverlay(model) {
      const ctx=overlay.getContext('2d'), p=palette(); ctx.clearRect(0,0,overlay.width,overlay.height); const item=selected(model); if(!item)return;
      const bandTop=item.tributaryStartM, bandBottom=item.tributaryEndM;
      const q1=project(model,0,bandTop),q2=project(model,model.inputs.rafterSpacingM,bandTop),q3=project(model,model.inputs.rafterSpacingM,bandBottom),q4=project(model,0,bandBottom);
      ctx.fillStyle=p.fill; ctx.strokeStyle=p.select; ctx.lineWidth=2; ctx.setLineDash([8,5]); ctx.beginPath(); [q1,q2,q3,q4].forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y));ctx.closePath();ctx.fill();ctx.stroke();ctx.setLineDash([]);
      const a=project(model,0,item.stationM),b=project(model,model.inputs.rafterSpacingM,item.stationM); ctx.strokeStyle=p.select;ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      [a,b].forEach((pt)=>{ctx.fillStyle=p.select;ctx.beginPath();ctx.arc(pt.x,pt.y,10,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle=p.select;ctx.font='900 20px system-ui,sans-serif';ctx.fillText(`${item.label} SELECTED`,a.x+16,a.y-15);ctx.font='800 15px system-ui,sans-serif';ctx.fillText(`tributary ${compact(item.tributaryStartM,3)}–${compact(item.tributaryEndM,3)} m · width ${compact(item.tributaryWidthM,3)} m`,a.x+16,a.y+24);
    }

    function drawExploded(model) {
      const ctx=explodedCanvas.getContext('2d'),p=palette();ctx.clearRect(0,0,explodedCanvas.width,explodedCanvas.height);ctx.fillStyle=p.surface;ctx.fillRect(0,0,explodedCanvas.width,explodedCanvas.height);const item=selected(model);if(!item)return;
      const x0=85,x1=815; const ys={sheet:55,screws:110,purlin:170,rafters:250,support:305};
      ctx.font='800 14px system-ui,sans-serif';ctx.textAlign='left';
      const layer=(y,labelText,color,width=5)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke();ctx.fillStyle=p.text;ctx.fillText(labelText,15,y+5);};
      layer(ys.sheet,`ROOF SHEET · selected tributary band ${compact(item.tributaryWidthM,3)} m`,p.line,8);
      for(let i=0;i<8;i+=1){const x=x0+(i+.5)*(x1-x0)/8;ctx.fillStyle=p.select;ctx.beginPath();ctx.arc(x,ys.screws,5,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle=p.text;ctx.fillText('SCREWS · demand routing only',15,ys.screws+5);
      layer(ys.purlin,`${item.label} · wₙ ${compact(item.result.loads.normalKNM,3)} kN/m · gross screening`,p.accent,10);
      ctx.strokeStyle=p.line;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(180,ys.rafters);ctx.lineTo(360,ys.rafters);ctx.moveTo(540,ys.rafters);ctx.lineTo(720,ys.rafters);ctx.stroke();ctx.fillStyle=p.text;ctx.fillText(`RAFTER A · R ${compact(item.leftRafterReaction.resultantKN,3)} kN`,15,ys.rafters+5);ctx.fillText(`RAFTER B · R ${compact(item.rightRafterReaction.resultantKN,3)} kN`,615,ys.rafters+5);
      layer(ys.support,'SUPPORTING SYSTEM · outside current M2 analysis boundary',p.line,3);
      [190,360,540,710].forEach((x)=>arrow(ctx,x,ys.sheet+10,x,ys.screws-10,p.arrow,2));[190,360,540,710].forEach((x)=>arrow(ctx,x,ys.screws+8,x,ys.purlin-10,p.arrow,2));arrow(ctx,360,ys.purlin+10,270,ys.rafters-10,p.arrow,3);arrow(ctx,540,ys.purlin+10,630,ys.rafters-10,p.arrow,3);arrow(ctx,270,ys.rafters+10,270,ys.support-10,p.arrow,3);arrow(ctx,630,ys.rafters+10,630,ys.support-10,p.arrow,3);
      ctx.fillStyle=p.muted;ctx.font='600 13px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('Capacity is intentionally unresolved at sheet, screw and rafter/connection layers until M4/M6 physics is implemented.',450,327);
    }

    function updateRows(model) {
      [...body.querySelectorAll('tr')].forEach((row,index)=>{row.classList.toggle('is-selected',index===selectedIndex);row.dataset.rbPurlinIndex=String(index);row.setAttribute('tabindex','0');row.setAttribute('aria-label',`Select ${model?.purlins?.[index]?.label ?? `purlin ${index+1}`}`);});
    }

    function updateTrace(model) {
      const item=selected(model);if(!item)return;label.textContent=`Selected purlin · ${item.label}${item.edge?' · EDGE':' · INTERIOR'}`;focusTitle.textContent=`${item.label} · station ${compact(item.stationM,3)} m`;
      const L=model.inputs.rafterSpacingM,w=item.result.loads.normalKNM,trib=item.tributaryWidthM,R=item.leftRafterReaction.normalKN,M=item.result.momentNormalKNM;
      trace.textContent=[
        `Tributary band = ${compact(item.tributaryStartM,4)} to ${compact(item.tributaryEndM,4)} m · width ${compact(trib,4)} m`,
        `Roof-normal line load wₙ = ${compact(w,5)} kN/m`,
        `Purlin span L = ${compact(L,4)} m`,
        `Reaction per rafter Rₙ = wₙL/2 = ${compact(R,5)} kN`,
        `Simply-supported Mₙ,max = wₙL²/8 = ${compact(M,5)} kN·m`,
        `Gross envelope stress = ${compact(item.result.grossEnvelopeStressMPa,2)} MPa`,
        `Resultant deflection = ${compact(item.result.resultantDeflectionMm,3)} mm`,
        `Gross utilization = ${compact(item.result.utilization*100,2)}%`,
        `Connection = ${item.connectionStatus}`,
        '',
        'The highlighted sheet band, purlin and two reaction points are one conserved demand path.',
        'No screw/cleat/weld/rafter capacity is inferred by this visualization.'
      ].join('\n');
    }

    function refresh() {
      const model=modelNow();if(!model)return;normalizeSelection(model);updateRows(model);updateTrace(model);drawOverlay(model);if(exploded)drawExploded(model);explodedPanel.hidden=!exploded;window.__FT_ROOF_BAY_SELECTION__={index:selectedIndex,label:selected(model)?.label,exploded};
    }

    function selectIndex(index) { const model=modelNow();if(!model)return;selectedIndex=Math.max(0,Math.min(Number(index)||0,model.purlins.length-1));refresh(); }

    body.addEventListener('click',(event)=>{const row=event.target.closest('tr[data-rb-purlin-index]');if(row)selectIndex(Number(row.dataset.rbPurlinIndex));});
    body.addEventListener('keydown',(event)=>{if(event.key!=='Enter'&&event.key!==' ')return;const row=event.target.closest('tr[data-rb-purlin-index]');if(row){event.preventDefault();selectIndex(Number(row.dataset.rbPurlinIndex));}});
    cycle.addEventListener('click',()=>{const model=modelNow();if(!model)return;selectIndex((selectedIndex+1)%model.purlins.length);});
    explodedToggle.addEventListener('click',()=>{exploded=!exploded;explodedToggle.textContent=`EXPLODED LOAD PATH · ${exploded?'ON':'OFF'}`;refresh();});
    exportProject.addEventListener('click',()=>{const model=modelNow();if(!model)return;const project=createRoofBayProject({projectId:`roof-bay-${Date.now()}`,projectName:'FutolTech Roof Bay M2 project',sectionId:sectionSelect?.value,rafterSpacingM:model.inputs.rafterSpacingM,roofSlopeLengthM:model.inputs.roofSlopeLengthM,maxPurlinSpacingM:model.inputs.maxPurlinSpacingM,layoutMode:model.geometry.layoutMode,purlinStationsM:model.geometry.layoutMode==='custom-stations'?model.geometry.stationsM:null,slopeDeg:model.inputs.slopeDeg,orientationDeg:model.inputs.orientationDeg,elasticModulusMPa:200000,yieldStrengthMPa:Number(fySelect?.value||250),densityKgM3:7850,mode:model.inputs.mode,deadLoadKPa:model.inputs.deadLoadKPa,roofLiveLoadKPa:model.inputs.roofLiveLoadKPa,windPressureKPa:model.inputs.windPressureKPa,windSense:model.inputs.windSense,loadFactor:Number(root.querySelector('[data-rb-factor]')?.value||1)});download(serializeRoofBayProject(project),`futoltech-roof-bay-project-${Date.now()}.json`);window.__FT_LAST_ROOF_BAY_PROJECT__=project;});

    const observer=new MutationObserver(()=>requestAnimationFrame(refresh));observer.observe(body,{childList:true,subtree:true});window.addEventListener('ft-theme-change',refresh);window.addEventListener('resize',refresh);
    requestAnimationFrame(()=>requestAnimationFrame(refresh));
  }
}
