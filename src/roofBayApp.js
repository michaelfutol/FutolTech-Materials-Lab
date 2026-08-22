import { PH_C_PURLIN_SECTIONS } from './data/phCPurlinCatalog.js';
import { solveRoofBay } from './solver/roofBay.js';

const root = document.querySelector('[data-roof-bay-app]');
const DEFAULT_SECTION_ID = 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8';
const E_MPA = 200000;
const DENSITY_KG_M3 = 7850;

function compact(value, digits = 3) {
  if (!Number.isFinite(value)) return '—';
  return Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function injectStyles() {
  if (document.getElementById('ft-roof-bay-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-style';
  style.textContent = `
    .roof-bay-page{display:grid;grid-template-columns:minmax(310px,.78fr) minmax(0,1.55fr);gap:1px;background:var(--border)}
    .roof-bay-page>.panel{min-width:0}.roof-bay-controls{grid-row:span 2}.roof-bay-visual{grid-column:2}.roof-bay-results{grid-column:1/-1}
    .roof-bay-note{color:var(--muted);line-height:1.55}.roof-bay-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}
    .roof-bay-grid label{display:grid;gap:.28rem}.roof-bay-grid input,.roof-bay-grid select{width:100%}.roof-bay-grid output{font-weight:800;color:var(--accent)}
    .roof-bay-actions{display:flex;gap:.55rem;flex-wrap:wrap;margin:1rem 0}.roof-bay-visual canvas{width:100%;height:auto;display:block;border:1px solid var(--border);border-radius:14px;background:#07141c}
    .roof-bay-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.55rem;margin-top:.75rem}.roof-bay-summary>div,.roof-bay-result-card{padding:.75rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.24)}
    .roof-bay-summary small{display:block;color:var(--muted)}.roof-bay-summary strong{display:block;margin-top:.15rem;font-size:1.08rem}.roof-bay-result-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.7rem}
    .roof-bay-result-card h3{margin:.1rem 0 .45rem}.roof-bay-result-card dl{display:grid;grid-template-columns:1fr auto;gap:.3rem .7rem;margin:0}.roof-bay-result-card dt{color:var(--muted)}.roof-bay-result-card dd{margin:0;font-weight:800;text-align:right}
    .roof-bay-table-wrap{overflow:auto;margin-top:1rem;border:1px solid var(--border);border-radius:12px}.roof-bay-table{width:100%;min-width:1050px;border-collapse:collapse}.roof-bay-table th,.roof-bay-table td{padding:.7rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}.roof-bay-table th{background:rgba(7,20,28,.4)}
    .roof-bay-equations{margin-top:1rem;padding:1rem;border:1px solid var(--border);border-radius:12px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;line-height:1.65;overflow:auto}.roof-bay-pass{color:#69e7ca!important}.roof-bay-fail{color:#ff7777!important}.roof-bay-unresolved{color:#ffd36a;font-weight:800}
    html[data-ft-theme="paper-matte"] .roof-bay-summary>div,html[data-ft-theme="paper-matte"] .roof-bay-result-card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-visual canvas{background:#fbf7ee}html[data-ft-theme="paper-matte"] .roof-bay-equations{background:#fffdf8;color:#172127}
    @media(max-width:1080px){.roof-bay-page{grid-template-columns:1fr}.roof-bay-controls{grid-row:auto}.roof-bay-visual,.roof-bay-results{grid-column:1}.roof-bay-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:650px){.roof-bay-grid,.roof-bay-summary{grid-template-columns:1fr}}
    @media print{.roof-bay-actions{display:none!important}.roof-bay-page{display:block}.roof-bay-page>.panel{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

function dom() {
  const get = (selector) => root.querySelector(selector);
  return {
    section:get('[data-rb-section]'), fy:get('[data-rb-fy]'), span:get('[data-rb-span]'), length:get('[data-rb-length]'), spacing:get('[data-rb-spacing]'), slope:get('[data-rb-slope]'), orientation:get('[data-rb-orientation]'), mode:get('[data-rb-mode]'), dead:get('[data-rb-dead]'), live:get('[data-rb-live]'), wind:get('[data-rb-wind]'), windSense:get('[data-rb-wind-sense]'), factor:get('[data-rb-factor]'), factorOut:get('[data-rb-factor-out]'), opacity:get('[data-rb-opacity]'), opacityOut:get('[data-rb-opacity-out]'),
    reset:get('[data-rb-reset]'), play:get('[data-rb-play]'), export:get('[data-rb-export]'), canvas:get('[data-rb-canvas]'), equilibrium:get('[data-rb-equilibrium]'), summary:get('[data-rb-summary]'), cards:get('[data-rb-cards]'), body:get('[data-rb-body]'), equations:get('[data-rb-equations]')
  };
}

if (root) {
  injectStyles();
  const ui = dom();
  let animation = { running:false, raf:0, started:0, targetFactor:1, displayFactor:1 };

  function populateSections() {
    ui.section.innerHTML = '';
    const verified = document.createElement('optgroup');
    verified.label = 'Source-backed / catalog C-purlins';
    const other = document.createElement('optgroup');
    other.label = 'Other PH market models';
    PH_C_PURLIN_SECTIONS.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.label;
      (preset.id.startsWith('ph-cp-colorsteel') ? verified : other).appendChild(option);
    });
    if (verified.children.length) ui.section.appendChild(verified);
    if (other.children.length) ui.section.appendChild(other);
    if ([...ui.section.options].some((option) => option.value === DEFAULT_SECTION_ID)) ui.section.value = DEFAULT_SECTION_ID;
  }

  function selectedPreset() {
    return PH_C_PURLIN_SECTIONS.find((preset) => preset.id === ui.section.value) ?? PH_C_PURLIN_SECTIONS[0];
  }

  function currentInput(loadFactor = Number(ui.factor.value)) {
    return {
      preset:selectedPreset(), rafterSpacingM:clamp(ui.span.value,1,8), roofSlopeLengthM:clamp(ui.length.value,1,15), maxPurlinSpacingM:clamp(ui.spacing.value,.3,2), customPurlinStationsM:Array.isArray(window.__FT_ROOF_BAY_CUSTOM_STATIONS__)?[...window.__FT_ROOF_BAY_CUSTOM_STATIONS__]:null, slopeDeg:clamp(ui.slope.value,0,60), orientationDeg:Number(ui.orientation.value), elasticModulusMPa:E_MPA, yieldStrengthMPa:Number(ui.fy.value), densityKgM3:DENSITY_KG_M3,
      mode:ui.mode.value, deadLoadKPa:clamp(ui.dead.value,0,5), roofLiveLoadKPa:clamp(ui.live.value,0,5), windPressureKPa:clamp(ui.wind.value,0,10), windSense:ui.windSense.value, loadFactor:Math.max(0, Number(loadFactor) || 0)
    };
  }

  function palette() {
    const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
    return paper ? { bg:'#fbf7ee', sheet:'rgba(185,209,214,.34)', sheetLine:'#7f9297', purlin:'#176a60', rafter:'#5e5549', fastener:'#8a5615', load:'#a83535', reaction:'#1c6b9d', text:'#172127', muted:'#526066', band:'rgba(35,118,104,.08)', good:'#176a60', warn:'#8a5a12' }
      : { bg:'#07141c', sheet:'rgba(139,209,220,.22)', sheetLine:'#617d87', purlin:'#62e1c7', rafter:'#d0d9dd', fastener:'#ffd36a', load:'#ff7777', reaction:'#69b9ff', text:'#eefbff', muted:'#a8bbc4', band:'rgba(98,225,199,.07)', good:'#62e1c7', warn:'#ffd36a' };
  }

  function arrow(ctx, x1, y1, x2, y2, color, width = 4) {
    const angle = Math.atan2(y2-y1,x2-x1), head = 11;
    ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=width; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-head*Math.cos(angle-.55),y2-head*Math.sin(angle-.55)); ctx.lineTo(x2-head*Math.cos(angle+.55),y2-head*Math.sin(angle+.55)); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function project(model, xM, yM) {
    const left = 110, top = 145, bayW = 780, bayH = 430, skew = 130;
    return {
      x:left + (xM/model.inputs.rafterSpacingM)*bayW + (yM/model.inputs.roofSlopeLengthM)*skew,
      y:top + (yM/model.inputs.roofSlopeLengthM)*bayH
    };
  }

  function draw(model) {
    const canvas=ui.canvas, ctx=canvas.getContext('2d'), p=palette();
    ctx.fillStyle=p.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=p.text; ctx.font='900 28px system-ui,sans-serif'; ctx.fillText('ROOF BAY PHYSICS · M2 LOAD PATH',42,45);
    ctx.fillStyle=p.muted; ctx.font='600 16px system-ui,sans-serif'; ctx.fillText(`${compact(model.inputs.rafterSpacingM,2)} m rafter spacing · ${compact(model.inputs.roofSlopeLengthM,2)} m slope length · ${model.geometry.purlinCount} purlins · load factor ${compact(model.inputs.loadFactor,2)}×`,42,75);
    ctx.fillText('Transparent sheet routes demand to purlins; fastener and rafter capacities remain unresolved.',42,99);

    const corners=[project(model,0,0),project(model,model.inputs.rafterSpacingM,0),project(model,model.inputs.rafterSpacingM,model.inputs.roofSlopeLengthM),project(model,0,model.inputs.roofSlopeLengthM)];
    ctx.save(); ctx.fillStyle=p.sheet; ctx.strokeStyle=p.sheetLine; ctx.lineWidth=2; ctx.beginPath(); corners.forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();

    const opacity=Number(ui.opacity.value);
    ctx.save(); ctx.globalAlpha=Math.max(.12,opacity);
    for (let i=1;i<12;i+=1) {
      const a=project(model,model.inputs.rafterSpacingM*i/12,0), b=project(model,model.inputs.rafterSpacingM*i/12,model.inputs.roofSlopeLengthM);
      ctx.strokeStyle=p.sheetLine; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    ctx.restore();

    const rafterLeftA=project(model,0,0), rafterLeftB=project(model,0,model.inputs.roofSlopeLengthM), rafterRightA=project(model,model.inputs.rafterSpacingM,0), rafterRightB=project(model,model.inputs.rafterSpacingM,model.inputs.roofSlopeLengthM);
    ctx.strokeStyle=p.rafter; ctx.lineWidth=12; [[rafterLeftA,rafterLeftB],[rafterRightA,rafterRightB]].forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
    ctx.fillStyle=p.text; ctx.font='800 16px system-ui,sans-serif'; ctx.fillText('RAFTER A',rafterLeftA.x-38,rafterLeftA.y-16); ctx.fillText('RAFTER B',rafterRightA.x-38,rafterRightA.y-16);

    model.purlins.forEach((item,index)=>{
      const a=project(model,0,item.stationM), b=project(model,model.inputs.rafterSpacingM,item.stationM);
      const bt=item.tributaryStartM, bb=item.tributaryEndM;
      const q1=project(model,0,bt),q2=project(model,model.inputs.rafterSpacingM,bt),q3=project(model,model.inputs.rafterSpacingM,bb),q4=project(model,0,bb);
      ctx.fillStyle=index%2===0?p.band:'transparent'; ctx.beginPath(); [q1,q2,q3,q4].forEach((pt,i)=>i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=p.purlin; ctx.lineWidth=item===model.governingPurlin?8:5; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.fillStyle=p.text; ctx.font='800 14px system-ui,sans-serif'; ctx.fillText(item.label,a.x-34,a.y+5);
      for(let j=1;j<8;j+=1){const f=project(model,model.inputs.rafterSpacingM*j/8,item.stationM);ctx.fillStyle=p.fastener;ctx.beginPath();ctx.arc(f.x,f.y,3.5,0,Math.PI*2);ctx.fill();}
      const reactionScale=22+Math.min(55,Math.abs(item.leftRafterReaction.normalKN)*8);
      const dir=item.leftRafterReaction.normalKN<0?-1:1;
      arrow(ctx,a.x,a.y,a.x,a.y+dir*reactionScale,p.reaction,3);
      arrow(ctx,b.x,b.y,b.x,b.y+dir*reactionScale,p.reaction,3);
    });

    if (model.inputs.loadFactor>0.001) {
      const samplesY=[.16,.38,.62,.84]; const samplesX=[.22,.5,.78];
      samplesY.forEach((yf)=>samplesX.forEach((xf)=>{
        const pt=project(model,model.inputs.rafterSpacingM*xf,model.inputs.roofSlopeLengthM*yf);
        const uplift=model.applied.normalKN<0; const len=28+Math.min(35,Math.abs(model.applied.normalKN));
        arrow(ctx,pt.x,pt.y-(uplift?0:len),pt.x,pt.y-(uplift?len:0),p.load,3);
      }));
    }

    ctx.fillStyle=p.text;ctx.font='900 18px system-ui,sans-serif';ctx.fillText('LOAD PATH',42,615);
    ctx.fillStyle=p.muted;ctx.font='600 15px system-ui,sans-serif';ctx.fillText('roof pressure → sheet tributary bands → fasteners (routing only) → purlins → discrete reactions at Rafter A/B → supporting system',42,643);
    ctx.fillStyle=model.equilibrium.pass?p.good:p.warn;ctx.font='900 16px system-ui,sans-serif';ctx.fillText(`Σ reactions − applied load residual = ${compact(model.equilibrium.residualKN,9)} kN · ${model.equilibrium.pass?'BALANCED':'CHECK'}`,42,675);
  }

  function render(loadFactor = Number(ui.factor.value)) {
    ui.factorOut.textContent=`${compact(Number(ui.factor.value),2)}×`; ui.opacityOut.textContent=`${Math.round(Number(ui.opacity.value)*100)}%`;
    let model;
    try { model=solveRoofBay(currentInput(loadFactor)); } catch(error) { console.error(error); return; }
    draw(model);
    ui.equilibrium.textContent=`Equilibrium · ${model.equilibrium.pass?'PASS':'CHECK'}`;
    ui.equilibrium.classList.toggle('roof-bay-pass',model.equilibrium.pass); ui.equilibrium.classList.toggle('roof-bay-fail',!model.equilibrium.pass);
    const layoutSummary=model.geometry.layoutMode==='custom-stations'
      ? `${model.geometry.purlinCount} custom rows · gaps ${compact(model.geometry.minSpacingM,3)}–${compact(model.geometry.maxSpacingM,3)} m`
      : `${model.geometry.purlinCount} rows @ ${compact(model.geometry.actualSpacingM,3)} m`;
    ui.summary.innerHTML=`
      <div><small>Roof bay area</small><strong>${compact(model.geometry.areaM2,2)} m²</strong></div>
      <div><small>Purlin layout</small><strong>${layoutSummary}</strong></div>
      <div><small>Applied resultant</small><strong>${compact(model.applied.resultantKN,3)} kN</strong></div>
      <div><small>Reaction each rafter</small><strong>${compact(model.rafters.left.resultantKN,3)} kN</strong></div>
      <div><small>Governing purlin</small><strong>${model.governingPurlin?.label ?? '—'}</strong></div>
      <div><small>Gross utilization</small><strong>${compact((model.governingPurlin?.result.utilization ?? 0)*100,1)}%</strong></div>
      <div><small>Max deflection</small><strong>${compact(model.governingPurlin?.result.resultantDeflectionMm ?? 0,2)} mm</strong></div>
      <div><small>Load conservation residual</small><strong>${compact(model.equilibrium.residualKN,9)} kN</strong></div>`;
    const gov=model.governingPurlin;
    const layoutCard=model.geometry.layoutMode==='custom-stations'
      ? `<dt>Layout mode</dt><dd>Custom stations</dd><dt>Station gaps</dt><dd>${compact(model.geometry.minSpacingM,3)}–${compact(model.geometry.maxSpacingM,3)} m</dd>`
      : `<dt>Requested max spacing</dt><dd>${compact(model.geometry.requestedMaxSpacingM,3)} m</dd><dt>Actual equal spacing</dt><dd>${compact(model.geometry.actualSpacingM,3)} m</dd>`;
    ui.cards.innerHTML=`
      <article class="roof-bay-result-card"><h3>Geometry & tributary layout</h3><dl>${layoutCard}<dt>Purlin rows</dt><dd>${model.geometry.purlinCount}</dd><dt>First tributary width</dt><dd>${compact(model.purlins[0].tributaryWidthM,3)} m</dd></dl></article>
      <article class="roof-bay-result-card"><h3>Rafter reaction transfer</h3><dl><dt>Rafter A normal</dt><dd>${compact(model.rafters.left.normalKN,3)} kN</dd><dt>Rafter A downslope</dt><dd>${compact(model.rafters.left.parallelKN,3)} kN</dd><dt>Rafter B normal</dt><dd>${compact(model.rafters.right.normalKN,3)} kN</dd><dt>Balance</dt><dd>${model.equilibrium.pass?'PASS':'CHECK'}</dd></dl></article>
      <article class="roof-bay-result-card"><h3>Governing purlin screening</h3><dl><dt>Member</dt><dd>${gov?.label ?? '—'}</dd><dt>Tributary width</dt><dd>${compact(gov?.tributaryWidthM,3)} m</dd><dt>Gross stress</dt><dd>${compact(gov?.result.grossEnvelopeStressMPa,1)} MPa</dd><dt>Gross utilization</dt><dd>${compact((gov?.result.utilization ?? 0)*100,1)}%</dd></dl></article>
      <article class="roof-bay-result-card"><h3>Unresolved next links</h3><dl><dt>Roof sheet</dt><dd class="roof-bay-unresolved">UNRESOLVED</dd><dt>Fasteners</dt><dd class="roof-bay-unresolved">UNRESOLVED</dd><dt>Purlin→rafter connection</dt><dd class="roof-bay-unresolved">UNRESOLVED</dd><dt>Rafter/truss design</dt><dd class="roof-bay-unresolved">UNRESOLVED</dd></dl></article>`;
    ui.body.innerHTML=model.purlins.map((item)=>`<tr><td><strong>${item.label}</strong>${item.edge?' · edge':''}</td><td>${compact(item.stationM,3)} m</td><td>${compact(item.tributaryWidthM,3)} m</td><td>${compact(item.result.loads.normalKNM,3)} kN/m</td><td>${compact(item.leftRafterReaction.resultantKN,3)} kN</td><td>${compact(item.result.momentNormalKNM,3)} kN·m</td><td>${compact(item.result.resultantDeflectionMm,2)} mm</td><td>${compact(item.result.utilization*100,1)}%</td><td class="roof-bay-unresolved">${item.connectionStatus}</td></tr>`).join('');
    ui.equations.innerHTML=`<strong>Load routing trace</strong><br>Roof area = L<sub>slope</sub> × rafter spacing = ${compact(model.inputs.roofSlopeLengthM,3)} × ${compact(model.inputs.rafterSpacingM,3)} = ${compact(model.geometry.areaM2,3)} m²<br>Layout = ${model.geometry.layoutMode==='custom-stations'?'custom station list':'equalized maximum spacing'}; Σ tributary widths = ${compact(model.geometry.tributaryWidthsM.reduce((a,b)=>a+b,0),6)} m = roof slope length<br>Each purlin: w = q × tributary width + self-weight; simply-supported reactions = wL/2 per rafter.<br>Rafter A total resultant = ${compact(model.rafters.left.resultantKN,6)} kN; Rafter B = ${compact(model.rafters.right.resultantKN,6)} kN.<br>Applied roof-bay resultant = ${compact(model.applied.resultantKN,6)} kN; vector equilibrium residual = ${compact(model.equilibrium.residualKN,9)} kN.<br><strong>${model.equilibrium.pass?'CONSERVATION CHECK PASS':'CONSERVATION CHECK REQUIRES REVIEW'}</strong><br><br><strong>Boundary:</strong> ${model.boundary}`;
    window.__FT_ROOF_BAY_MODEL__=model;
  }

  function syncMode() {
    const mode=ui.mode.value; const gravityOff=mode==='wind'; const windOff=mode==='gravity';
    ui.dead.disabled=gravityOff; ui.live.disabled=gravityOff; ui.wind.disabled=windOff; ui.windSense.disabled=windOff;
  }

  function reset() {
    window.__FT_ROOF_BAY_CUSTOM_STATIONS__=null;
    ui.section.value=[...ui.section.options].some((o)=>o.value===DEFAULT_SECTION_ID)?DEFAULT_SECTION_ID:ui.section.options[0]?.value;
    ui.fy.value='250';ui.span.value='3';ui.length.value='4';ui.spacing.value='.8';ui.slope.value='25';ui.orientation.value='0';ui.mode.value='combined';ui.dead.value='.20';ui.live.value='.75';ui.wind.value='1.50';ui.windSense.value='uplift';ui.factor.value='1';ui.opacity.value='.35';syncMode();render();
  }

  function stopAnimation() { if(animation.raf) cancelAnimationFrame(animation.raf); animation.running=false; animation.raf=0; ui.play.textContent='PLAY LOAD PATH'; }
  function play() {
    if(animation.running){stopAnimation();return;}
    animation.running=true;animation.started=performance.now();animation.targetFactor=Math.max(.01,Number(ui.factor.value)||1);ui.play.textContent='PAUSE';
    const tick=(now)=>{if(!animation.running)return;const progress=Math.min(1,(now-animation.started)/6000);const eased=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;animation.displayFactor=animation.targetFactor*eased;render(animation.displayFactor);if(progress<1)animation.raf=requestAnimationFrame(tick);else{stopAnimation();render(animation.targetFactor);}};
    animation.raf=requestAnimationFrame(tick);
  }

  function exportJson() {
    const model=solveRoofBay(currentInput(Number(ui.factor.value))); const blob=new Blob([JSON.stringify(model,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`futoltech-roof-bay-${Date.now()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  populateSections();
  root.addEventListener('input',(event)=>{if(event.target===ui.opacity||event.target===ui.factor||event.target.matches('input')){stopAnimation();render();}});
  root.addEventListener('change',()=>{stopAnimation();syncMode();render();});
  ui.reset.addEventListener('click',reset); ui.play.addEventListener('click',play); ui.export.addEventListener('click',exportJson); window.addEventListener('ft-theme-change',()=>render());
  reset();
}
