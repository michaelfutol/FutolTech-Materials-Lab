import { createWindDesignBasis } from './interchange/windDesignBasis.js';

const root = document.querySelector('[data-roof-bay-app]');

function injectStyles() {
  if (document.getElementById('ft-roof-bay-wind-basis-v6-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-wind-basis-v6-style';
  style.textContent = `
    .roof-bay-wind-basis{grid-column:1/-1}.roof-bay-wind-basis__lead{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}.roof-bay-wind-basis__grid{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.1fr);gap:.8rem}.roof-bay-wind-basis__card{padding:.9rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}.roof-bay-wind-basis__card h3{margin:.1rem 0 .55rem}.roof-bay-wind-basis__meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.roof-bay-wind-basis__meta>div,.roof-bay-wind-basis__input{padding:.65rem;border:1px solid var(--border);border-radius:10px}.roof-bay-wind-basis small{display:block;color:var(--muted)}.roof-bay-wind-basis strong{display:block;margin-top:.18rem}.roof-bay-wind-basis__inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.roof-bay-wind-basis__evidence{margin:.75rem 0 0;padding-left:1.1rem}.roof-bay-wind-basis__evidence li{margin:.4rem 0;line-height:1.4}.roof-bay-wind-basis__evidence a{color:var(--accent)}.roof-bay-wind-basis__blocked{font-weight:900;color:#ffd36a}.roof-bay-wind-basis__boundary{margin-top:.8rem;padding:.8rem;border:1px solid var(--border);border-radius:10px;font:700 .86rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}
    html[data-ft-theme="paper-matte"] .roof-bay-wind-basis__card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-wind-basis__blocked{color:#8a5a12}@media(max-width:900px){.roof-bay-wind-basis__grid{grid-template-columns:1fr}}@media(max-width:650px){.roof-bay-wind-basis__meta,.roof-bay-wind-basis__inputs{grid-template-columns:1fr}}@media print{.roof-bay-wind-basis{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

if (root) {
  injectStyles();
  const zonePanel = root.querySelector('.roof-bay-zone-panel');
  const results = root.querySelector('.roof-bay-results');
  const anchor = zonePanel ?? results;
  if (anchor) {
    const basis = createWindDesignBasis();
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-wind-basis';
    panel.setAttribute('aria-label', 'M3 wind design basis provenance');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M3 · code identity + provenance</p><h2>Wind design basis</h2></div><span class="status-pill roof-bay-wind-basis__blocked" data-rb-wind-basis-status>Code calculation · BLOCKED</span></div>
      <p class="roof-bay-wind-basis__lead">This first M3 slice identifies the code edition and public evidence record before any wind equation is enabled. The current Roof Bay still uses the manual uniform wind-pressure input above.</p>
      <div class="roof-bay-wind-basis__grid">
        <article class="roof-bay-wind-basis__card"><h3 data-rb-wind-code-title></h3><div class="roof-bay-wind-basis__meta" data-rb-wind-code-meta></div><h3 style="margin-top:1rem">Public provenance</h3><ol class="roof-bay-wind-basis__evidence" data-rb-wind-evidence></ol></article>
        <article class="roof-bay-wind-basis__card"><h3>Required inputs · not yet accepted</h3><div class="roof-bay-wind-basis__inputs" data-rb-wind-inputs></div><div class="roof-bay-wind-basis__boundary" data-rb-wind-boundary></div></article>
      </div>`;
    anchor.insertAdjacentElement('afterend', panel);

    const title = panel.querySelector('[data-rb-wind-code-title]');
    const meta = panel.querySelector('[data-rb-wind-code-meta]');
    const evidence = panel.querySelector('[data-rb-wind-evidence]');
    const inputs = panel.querySelector('[data-rb-wind-inputs]');
    const boundary = panel.querySelector('[data-rb-wind-boundary]');
    const code = basis.adoptedCode;

    title.textContent = `${code.title} · ${code.edition} · ${code.year}`;
    meta.innerHTML = `
      <div><small>Profile ID</small><strong>${code.profileId}</strong></div>
      <div><small>Jurisdiction</small><strong>${code.jurisdiction}</strong></div>
      <div><small>Volume</small><strong>${code.volume ?? '—'}</strong></div>
      <div><small>Printing</small><strong>${code.printing ?? '—'}</strong></div>
      <div><small>Publisher</small><strong>${code.publisher ?? '—'}</strong></div>
      <div><small>Profile status</small><strong>${code.profileStatus}</strong></div>`;
    evidence.innerHTML = code.evidence.map((item) => `<li><strong>${item.organization}</strong><small>${item.claim}</small><a href="${item.url}" target="_blank" rel="noreferrer">Open source record</a></li>`).join('');
    inputs.innerHTML = Object.entries(basis.inputs).map(([key,input]) => `<div class="roof-bay-wind-basis__input" data-rb-wind-input="${key}"><small>${input.label}</small><strong>${input.status}</strong></div>`).join('');
    boundary.textContent = `NO CODE WIND PRESSURE CALCULATED · velocity-pressure chain ${basis.formulaImplementation.velocityPressureChain} · external coefficients ${basis.formulaImplementation.externalPressureCoefficients} · internal coefficients ${basis.formulaImplementation.internalPressureCoefficients} · field/edge/corner geometry ${basis.formulaImplementation.fieldEdgeCornerGeometry}. Manual pressure fallback remains ${basis.manualPressureFallback?'ENABLED':'DISABLED'}.`;

    window.__FT_WIND_DESIGN_BASIS__ = basis;
    window.__FT_WIND_BASIS_UI__ = {
      mounted:true,
      profileId:code.profileId,
      calculationStatus:basis.calculationStatus,
      unresolvedInputCount:Object.values(basis.inputs).filter((item)=>item.status==='UNRESOLVED').length,
      evidenceCount:code.evidence.length,
      formulaStatuses:{...basis.formulaImplementation}
    };
  }
}
