const root = document.querySelector('[data-roof-bay-app]');

function compact(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function modelNow() {
  return window.__FT_ROOF_BAY_MODEL__ ?? null;
}

function palette() {
  const paper = document.documentElement.dataset.ftTheme === 'paper-matte';
  return paper
    ? { bg:'#fffaf1', line:'#665d50', text:'#172127', muted:'#526066', normal:'#1c6b9d', parallel:'#9b5c12', axis:'#938777', good:'#176a60', bad:'#a83535' }
    : { bg:'#091922', line:'#d0d9dd', text:'#eefbff', muted:'#a8bbc4', normal:'#69b9ff', parallel:'#ffd36a', axis:'#66808a', good:'#62e1c7', bad:'#ff7777' };
}

function injectStyles() {
  if (document.getElementById('ft-roof-bay-reaction-v4-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-reaction-v4-style';
  style.textContent = `
    .roof-bay-reaction-panel{grid-column:1/-1}.roof-bay-reaction-note{color:var(--muted);line-height:1.5;margin:.25rem 0 1rem}
    .roof-bay-reaction-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.roof-bay-reaction-card{min-width:0;border:1px solid var(--border);border-radius:12px;padding:.8rem;background:rgba(7,20,28,.22)}
    .roof-bay-reaction-card h3{margin:.1rem 0 .55rem}.roof-bay-reaction-card canvas{width:100%;height:auto;display:block;border:1px solid var(--border);border-radius:10px;background:#091922}
    .roof-bay-reaction-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;margin-top:.55rem}.roof-bay-reaction-totals>div{padding:.55rem;border:1px solid var(--border);border-radius:9px}.roof-bay-reaction-totals small{display:block;color:var(--muted)}.roof-bay-reaction-totals strong{display:block;margin-top:.15rem}
    .roof-bay-conservation-wrap{overflow:auto;margin-top:1rem;border:1px solid var(--border);border-radius:12px}.roof-bay-conservation{width:100%;min-width:1050px;border-collapse:collapse}.roof-bay-conservation th,.roof-bay-conservation td{padding:.65rem;border-bottom:1px solid var(--border);text-align:right;white-space:nowrap}.roof-bay-conservation th:first-child,.roof-bay-conservation td:first-child{text-align:left}.roof-bay-conservation th{background:rgba(7,20,28,.38)}
    .roof-bay-conservation-trace{margin-top:.8rem;padding:.85rem;border:1px solid var(--border);border-radius:12px;font:600 .86rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap}.roof-bay-component-pass{font-weight:900;color:#69e7ca}.roof-bay-component-check{font-weight:900;color:#ff7777}
    html[data-ft-theme="paper-matte"] .roof-bay-reaction-card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-reaction-card canvas{background:#fffaf1}html[data-ft-theme="paper-matte"] .roof-bay-conservation th{background:#f5eee2}html[data-ft-theme="paper-matte"] .roof-bay-component-pass{color:#176a60}html[data-ft-theme="paper-matte"] .roof-bay-component-check{color:#a83535}
    @media(max-width:900px){.roof-bay-reaction-grid{grid-template-columns:1fr}}@media print{.roof-bay-reaction-panel{break-before:page}.roof-bay-reaction-card{break-inside:avoid}.roof-bay-conservation-wrap{overflow:visible}}
  `;
  document.head.appendChild(style);
}

function arrow(ctx, x1, y1, x2, y2, color, width = 3) {
  const angle = Math.atan2(y2-y1,x2-x1), head = 9;
  ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-head*Math.cos(angle-.55),y2-head*Math.sin(angle-.55));ctx.lineTo(x2-head*Math.cos(angle+.55),y2-head*Math.sin(angle+.55));ctx.closePath();ctx.fill();ctx.restore();
}

function drawRafter(canvas, model, rafterKey, label) {
  const rafter=model.rafters?.[rafterKey]; if(!rafter)return;
  const ctx=canvas.getContext('2d'),p=palette(),w=canvas.width,h=canvas.height;
  ctx.fillStyle=p.bg;ctx.fillRect(0,0,w,h);
  const x0=75,x1=w-55,y0=170,length=model.inputs.roofSlopeLengthM;
  ctx.fillStyle=p.text;ctx.font='900 19px system-ui,sans-serif';ctx.fillText(`${label} · DISCRETE PURLIN REACTIONS`,25,32);
  ctx.fillStyle=p.muted;ctx.font='600 13px system-ui,sans-serif';ctx.fillText('Station axis: eave 0 m → high edge / ridge-side roof boundary',25,54);
  ctx.strokeStyle=p.line;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y0);ctx.stroke();
  ctx.strokeStyle=p.axis;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,y0+75);ctx.lineTo(x1,y0+75);ctx.stroke();
  ctx.fillStyle=p.muted;ctx.font='600 12px system-ui,sans-serif';ctx.fillText('0',x0-4,y0+95);ctx.fillText(`${compact(length,2)} m`,x1-30,y0+95);
  const maxNormal=Math.max(1e-9,...rafter.pointLoads.map((item)=>Math.abs(item.normalKN)));
  const maxParallel=Math.max(1e-9,...rafter.pointLoads.map((item)=>Math.abs(item.parallelKN)));
  rafter.pointLoads.forEach((item,index)=>{
    const x=x0+(item.stationM/length)*(x1-x0);
    ctx.strokeStyle=p.axis;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y0+7);ctx.lineTo(x,y0+74);ctx.stroke();
    ctx.fillStyle=p.text;ctx.font='800 12px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(item.purlin,x,y0+91+(index%2)*15);
    const nLen=28+Math.min(72,Math.abs(item.normalKN)/maxNormal*72);
    const nSign=item.normalKN>=0?1:-1;
    arrow(ctx,x,y0,x,y0+nSign*nLen,p.normal,3);
    const pLen=18+Math.min(45,Math.abs(item.parallelKN)/maxParallel*45);
    if(Math.abs(item.parallelKN)>1e-10){const pSign=item.parallelKN>=0?1:-1;arrow(ctx,x-2,y0-10,x-2+pSign*pLen,y0-10,p.parallel,3);}
  });
  ctx.textAlign='left';ctx.font='800 13px system-ui,sans-serif';ctx.fillStyle=p.normal;ctx.fillText('Blue: roof-normal Rₙ (signed; uplift negative)',25,h-42);ctx.fillStyle=p.parallel;ctx.fillText('Gold: roof-downslope Rₛ (signed)',25,h-21);
}

if (root) {
  injectStyles();
  const results=root.querySelector('.roof-bay-results');
  const body=root.querySelector('[data-rb-body]');
  if (results && body) {
    const panel=document.createElement('section');
    panel.className='panel roof-bay-reaction-panel';
    panel.setAttribute('aria-label','Rafter reaction diagrams and conservation');
    panel.innerHTML=`
      <div class="panel-heading"><div><p class="eyebrow">M2 · rafter reaction transfer</p><h2>Reaction diagrams & component conservation</h2></div><span class="status-pill" data-rb-component-status>Components · —</span></div>
      <p class="roof-bay-reaction-note">These diagrams show demand transferred into each rafter line only. They are not rafter-capacity, connection-capacity or truss-design checks.</p>
      <div class="roof-bay-reaction-grid">
        <article class="roof-bay-reaction-card"><h3>Rafter A</h3><canvas width="760" height="315" data-rb-rafter-a aria-label="Rafter A reaction diagram"></canvas><div class="roof-bay-reaction-totals" data-rb-rafter-a-totals></div></article>
        <article class="roof-bay-reaction-card"><h3>Rafter B</h3><canvas width="760" height="315" data-rb-rafter-b aria-label="Rafter B reaction diagram"></canvas><div class="roof-bay-reaction-totals" data-rb-rafter-b-totals></div></article>
      </div>
      <div class="roof-bay-conservation-wrap"><table class="roof-bay-conservation"><thead><tr><th>Axis</th><th>Roof area gravity</th><th>Purlin self-weight</th><th>Wind</th><th>Applied total</th><th>Rafter A</th><th>Rafter B</th><th>A+B</th><th>Residual</th><th>Status</th></tr></thead><tbody data-rb-conservation-body></tbody></table></div>
      <div class="roof-bay-conservation-trace" data-rb-conservation-trace></div>`;
    results.insertAdjacentElement('beforebegin',panel);
    const canvasA=panel.querySelector('[data-rb-rafter-a]'),canvasB=panel.querySelector('[data-rb-rafter-b]'),totalsA=panel.querySelector('[data-rb-rafter-a-totals]'),totalsB=panel.querySelector('[data-rb-rafter-b-totals]'),tableBody=panel.querySelector('[data-rb-conservation-body]'),trace=panel.querySelector('[data-rb-conservation-trace]'),status=panel.querySelector('[data-rb-component-status]');

    function totalsMarkup(rafter) {
      return `<div><small>Σ roof-normal Rₙ</small><strong>${compact(rafter.normalKN,5)} kN</strong></div><div><small>Σ downslope Rₛ</small><strong>${compact(rafter.parallelKN,5)} kN</strong></div>`;
    }

    function row(axisLabel, component) {
      const klass=component.pass?'roof-bay-component-pass':'roof-bay-component-check';
      return `<tr><td><strong>${axisLabel}</strong></td><td>${compact(component.applied.roofAreaGravityKN,6)}</td><td>${compact(component.applied.purlinSelfWeightKN,6)}</td><td>${compact(component.applied.windKN,6)}</td><td><strong>${compact(component.applied.totalKN,6)}</strong></td><td>${compact(component.reactions.leftRafterKN,6)}</td><td>${compact(component.reactions.rightRafterKN,6)}</td><td><strong>${compact(component.reactions.totalKN,6)}</strong></td><td>${compact(component.residualKN,9)}</td><td class="${klass}">${component.pass?'PASS':'CHECK'}</td></tr>`;
    }

    function refresh() {
      const model=modelNow(); if(!model?.conservation)return;
      drawRafter(canvasA,model,'left','RAFTER A');drawRafter(canvasB,model,'right','RAFTER B');
      totalsA.innerHTML=totalsMarkup(model.rafters.left);totalsB.innerHTML=totalsMarkup(model.rafters.right);
      tableBody.innerHTML=row('Roof-normal',model.conservation.normal)+row('Roof-downslope',model.conservation.parallel);
      const allPass=model.conservation.normal.pass&&model.conservation.parallel.pass;
      status.textContent=`Components · ${allPass?'PASS':'CHECK'}`;status.classList.toggle('roof-bay-component-pass',allPass);status.classList.toggle('roof-bay-component-check',!allPass);
      const n=model.conservation.normal,s=model.conservation.parallel;
      trace.textContent=[
        `Roof-normal: N_applied = W_roof cosθ + W_purlin cosθ + P_wind = ${compact(n.applied.roofAreaGravityKN,6)} + ${compact(n.applied.purlinSelfWeightKN,6)} + ${compact(n.applied.windKN,6)} = ${compact(n.applied.totalKN,6)} kN`,
        `              ΣR_n = R_A,n + R_B,n = ${compact(n.reactions.leftRafterKN,6)} + ${compact(n.reactions.rightRafterKN,6)} = ${compact(n.reactions.totalKN,6)} kN; residual = ${compact(n.residualKN,9)} kN`,
        `Roof-downslope: S_applied = W_roof sinθ + W_purlin sinθ + P_wind,parallel = ${compact(s.applied.roofAreaGravityKN,6)} + ${compact(s.applied.purlinSelfWeightKN,6)} + ${compact(s.applied.windKN,6)} = ${compact(s.applied.totalKN,6)} kN`,
        `                ΣR_s = R_A,s + R_B,s = ${compact(s.reactions.leftRafterKN,6)} + ${compact(s.reactions.rightRafterKN,6)} = ${compact(s.reactions.totalKN,6)} kN; residual = ${compact(s.residualKN,9)} kN`,
        '',
        `Vector equilibrium residual = ${compact(model.equilibrium.residualKN,9)} kN · ${model.equilibrium.pass?'PASS':'CHECK'}`,
        'Sign convention: uplift roof-normal values are negative; gravity downslope values are positive. Current wind input is roof-normal only.'
      ].join('\n');
      window.__FT_ROOF_BAY_REACTION_DIAGRAMS__={mounted:true,normalPass:n.pass,parallelPass:s.pass,normalResidualKN:n.residualKN,parallelResidualKN:s.residualKN,leftPointCount:model.rafters.left.pointLoads.length,rightPointCount:model.rafters.right.pointLoads.length};
    }

    const observer=new MutationObserver(()=>requestAnimationFrame(refresh));observer.observe(body,{childList:true,subtree:true});
    window.addEventListener('ft-theme-change',refresh);window.addEventListener('resize',refresh);
    requestAnimationFrame(()=>requestAnimationFrame(refresh));
  }
}
