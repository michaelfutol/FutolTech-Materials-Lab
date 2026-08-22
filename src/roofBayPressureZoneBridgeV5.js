const root = document.querySelector('[data-roof-bay-app]');

function compact(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function modelNow() {
  return window.__FT_ROOF_BAY_MODEL__ ?? null;
}

function injectStyles() {
  if (document.getElementById('ft-roof-bay-pressure-zone-v5-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-pressure-zone-v5-style';
  style.textContent = `
    .roof-bay-zone-panel{grid-column:1/-1}.roof-bay-zone-note{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}
    .roof-bay-zone-grid{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr);gap:.8rem}.roof-bay-zone-card{padding:.85rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}
    .roof-bay-zone-card h3{margin:.1rem 0 .55rem}.roof-bay-zone-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem;margin-top:.65rem}.roof-bay-zone-type{padding:.7rem;border:1px dashed var(--border);border-radius:10px;text-align:center}.roof-bay-zone-type strong{display:block}.roof-bay-zone-type small{display:block;margin-top:.2rem;color:var(--muted)}
    .roof-bay-zone-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.roof-bay-zone-meta>div{padding:.65rem;border:1px solid var(--border);border-radius:10px}.roof-bay-zone-meta small{display:block;color:var(--muted)}.roof-bay-zone-meta strong{display:block;margin-top:.2rem}
    .roof-bay-zone-warning{margin-top:.8rem;padding:.8rem;border:1px solid var(--border);border-radius:10px;font:700 .88rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.roof-bay-zone-unresolved{font-weight:900;color:#ffd36a}
    html[data-ft-theme="paper-matte"] .roof-bay-zone-card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-zone-unresolved{color:#8a5a12}
    @media(max-width:900px){.roof-bay-zone-grid{grid-template-columns:1fr}}@media(max-width:620px){.roof-bay-zone-types,.roof-bay-zone-meta{grid-template-columns:1fr}}@media print{.roof-bay-zone-panel{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

if (root) {
  injectStyles();
  const results = root.querySelector('.roof-bay-results');
  const body = root.querySelector('[data-rb-body]');
  if (results && body) {
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-zone-panel';
    panel.setAttribute('aria-label', 'M3-ready roof pressure zone bridge');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M2 → M3 data bridge</p><h2>Roof pressure-zone placeholders</h2></div><span class="status-pill roof-bay-zone-unresolved" data-rb-zone-status>Zoning · UNRESOLVED</span></div>
      <p class="roof-bay-zone-note">The shared Roof Bay model now reserves a stable roof-local coordinate frame and field / edge / corner region types. M2 still applies one manual uniform wind pressure. No code-derived zone geometry, coefficients or zone pressures are created here.</p>
      <div class="roof-bay-zone-grid">
        <article class="roof-bay-zone-card"><h3>Reserved M3 region types</h3><div class="roof-bay-zone-types" data-rb-zone-types></div><div class="roof-bay-zone-warning" data-rb-zone-warning></div></article>
        <article class="roof-bay-zone-card"><h3>Shared roof-local frame</h3><div class="roof-bay-zone-meta" data-rb-zone-meta></div></article>
      </div>`;
    results.insertAdjacentElement('beforebegin', panel);

    const typeWrap = panel.querySelector('[data-rb-zone-types]');
    const meta = panel.querySelector('[data-rb-zone-meta]');
    const warning = panel.querySelector('[data-rb-zone-warning]');
    const status = panel.querySelector('[data-rb-zone-status]');

    function refresh() {
      const model = modelNow();
      const zoning = model?.pressureZoning;
      if (!zoning) return;
      typeWrap.innerHTML = zoning.supportedRegionTypes.map((type) => `<div class="roof-bay-zone-type"><strong>${type.toUpperCase()}</strong><small>schema reserved · polygon not assigned</small></div>`).join('');
      const frame = zoning.coordinateFrame;
      meta.innerHTML = `
        <div><small>Coordinate system</small><strong>${frame.system}</strong></div>
        <div><small>Origin</small><strong>${frame.origin}</strong></div>
        <div><small>x axis / extent</small><strong>${frame.xAxis} · ${compact(frame.xExtentM,3)} m</strong></div>
        <div><small>y axis / extent</small><strong>${frame.yAxis} · ${compact(frame.yExtentM,3)} m</strong></div>
        <div><small>Active M2 wind model</small><strong>${zoning.activePressureModel}</strong></div>
        <div><small>Manual wind input</small><strong>${compact(zoning.manualUniformWind.pressureKPa,3)} kPa · ${zoning.manualUniformWind.sense}</strong></div>
        <div><small>Assigned zone polygons</small><strong>${zoning.regions.length}</strong></div>
        <div><small>Code basis</small><strong>${zoning.codeBasis ?? 'UNASSIGNED'}</strong></div>`;
      warning.textContent = `NO CODE ZONES APPLIED · ${zoning.regions.length} region polygons · purlin zone assignments ${model.purlins.filter((item) => item.pressureZoneIds?.length).length}/${model.purlins.length}. M3 will populate this reserved schema only after code/version, site wind basis, exposure, topography, enclosure, height and roof geometry are explicitly resolved.`;
      status.textContent = `Zoning · ${zoning.status}`;
      window.__FT_ROOF_BAY_PRESSURE_ZONE_BRIDGE__ = {
        mounted: true,
        schemaVersion: zoning.schemaVersion,
        status: zoning.status,
        activePressureModel: zoning.activePressureModel,
        regionTypes: [...zoning.supportedRegionTypes],
        regionCount: zoning.regions.length,
        codeBasis: zoning.codeBasis,
        coordinateFrame: { ...frame },
        assignedPurlinCount: model.purlins.filter((item) => item.pressureZoneIds?.length).length
      };
    }

    const observer = new MutationObserver(() => requestAnimationFrame(refresh));
    observer.observe(body, { childList:true, subtree:true });
    window.addEventListener('ft-theme-change', refresh);
    requestAnimationFrame(() => requestAnimationFrame(refresh));
  }
}
