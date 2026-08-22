import { createWindDesignBasis } from './interchange/windDesignBasis.js';

const root = document.querySelector('[data-roof-bay-app]');

const BENCHMARK_CASE = Object.freeze({
  siteLocation: 'Independent NSCP 2015 hand benchmark',
  siteSourceReference: 'docs/M3_VELOCITY_PRESSURE.md#independent-benchmark',
  occupancyCategory: 'III',
  occupancySourceReference: 'NSCP 2015 Table 103-1 benchmark classification record',
  basicWindSpeedKph: 240,
  basicWindSpeedSourceReference: 'Independent benchmark input; not a Roof Bay project wind-map lookup',
  exposureCategory: 'C',
  exposureSourceReference: 'NSCP 2015 Section 207A.7 benchmark classification',
  topographicFactorKzt: 1,
  topographySourceReference: 'Independent flat-terrain benchmark input',
  heightM: 8.82,
  heightSourceReference: 'Independent benchmark mean roof height'
});

function injectStyles() {
  if (document.getElementById('ft-roof-bay-velocity-v7-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-velocity-v7-style';
  style.textContent = `
    .roof-bay-velocity-v7{grid-column:1/-1}.roof-bay-velocity-v7__lead{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}.roof-bay-velocity-v7__grid{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(0,1.15fr);gap:.8rem}.roof-bay-velocity-v7__card{padding:.9rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}.roof-bay-velocity-v7__card h3{margin:.1rem 0 .65rem}.roof-bay-velocity-v7__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.roof-bay-velocity-v7__fact{padding:.65rem;border:1px solid var(--border);border-radius:10px}.roof-bay-velocity-v7 small{display:block;color:var(--muted)}.roof-bay-velocity-v7 strong{display:block;margin-top:.18rem}.roof-bay-velocity-v7__eq{padding:.72rem;border:1px solid var(--border);border-radius:10px;margin:.5rem 0;font:700 .86rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.roof-bay-velocity-v7__result{font-size:1.15rem;font-weight:950}.roof-bay-velocity-v7__verified{font-weight:900;color:#8bdc9a}.roof-bay-velocity-v7__boundary{margin-top:.8rem;padding:.8rem;border:1px solid var(--border);border-radius:10px;font:700 .84rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}
    html[data-ft-theme="paper-matte"] .roof-bay-velocity-v7__card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-velocity-v7__verified{color:#276738}@media(max-width:900px){.roof-bay-velocity-v7__grid{grid-template-columns:1fr}}@media(max-width:650px){.roof-bay-velocity-v7__facts{grid-template-columns:1fr}}@media print{.roof-bay-velocity-v7{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

if (root) {
  injectStyles();
  const windBasisPanel = root.querySelector('.roof-bay-wind-basis');
  const results = root.querySelector('.roof-bay-results');
  const anchor = windBasisPanel ?? results;

  if (anchor) {
    const basis = createWindDesignBasis({ velocityPressureCase: BENCHMARK_CASE });
    const vp = basis.velocityPressure;
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-velocity-v7';
    panel.setAttribute('aria-label', 'M3 velocity pressure independent benchmark');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M3.1 · independent equation benchmark</p><h2>Velocity-pressure chain</h2></div><span class="status-pill roof-bay-velocity-v7__verified" data-rb-vp-status>q chain · VERIFIED</span></div>
      <p class="roof-bay-velocity-v7__lead">This panel exercises the implemented NSCP 2015 building velocity-pressure equation against an independent hand benchmark. It is a verification case only: its result is <strong>not applied</strong> to the Roof Bay load model, which still uses the manual pressure input above.</p>
      <div class="roof-bay-velocity-v7__grid">
        <article class="roof-bay-velocity-v7__card">
          <h3>Benchmark inputs</h3>
          <div class="roof-bay-velocity-v7__facts">
            <div class="roof-bay-velocity-v7__fact"><small>Basic wind speed</small><strong data-rb-vp-speed>${vp.inputs.basicWindSpeedKph.toFixed(0)} kph · ${vp.inputs.basicWindSpeedMps.toFixed(4)} m/s</strong></div>
            <div class="roof-bay-velocity-v7__fact"><small>Exposure</small><strong data-rb-vp-exposure>${vp.inputs.exposureCategory}</strong></div>
            <div class="roof-bay-velocity-v7__fact"><small>Mean roof / evaluation height</small><strong data-rb-vp-height>${vp.inputs.heightM.toFixed(2)} m</strong></div>
            <div class="roof-bay-velocity-v7__fact"><small>Topographic factor Kzt</small><strong data-rb-vp-kzt>${vp.inputs.topographicFactorKzt.toFixed(2)}</strong></div>
            <div class="roof-bay-velocity-v7__fact"><small>Directionality Kd · buildings</small><strong data-rb-vp-kd>${vp.constants.directionalityFactorKd.toFixed(2)}</strong></div>
            <div class="roof-bay-velocity-v7__fact"><small>Exposure constants</small><strong data-rb-vp-constants>α ${vp.constants.alpha} · zg ${vp.constants.zgM.toFixed(2)} m</strong></div>
          </div>
        </article>
        <article class="roof-bay-velocity-v7__card">
          <h3>Visible substitutions</h3>
          <div class="roof-bay-velocity-v7__eq" data-rb-vp-eq-speed>${vp.substitutions.speed}</div>
          <div class="roof-bay-velocity-v7__eq" data-rb-vp-eq-kz>${vp.substitutions.kz}</div>
          <div class="roof-bay-velocity-v7__eq" data-rb-vp-eq-q>${vp.substitutions.q}</div>
          <div class="roof-bay-velocity-v7__fact"><small>Velocity pressure at benchmark height</small><strong class="roof-bay-velocity-v7__result" data-rb-vp-result>${vp.result.qKPa.toFixed(6)} kPa</strong><small>Kz = <span data-rb-vp-kz>${vp.exposure.kz.toFixed(9)}</span></small></div>
        </article>
      </div>
      <div class="roof-bay-velocity-v7__boundary" data-rb-vp-boundary>VERIFIED SLICE ONLY · velocity pressure is available from explicit source-referenced inputs · external pressure coefficients UNIMPLEMENTED · internal pressure coefficients UNIMPLEMENTED · field/edge/corner geometry UNIMPLEMENTED · benchmark pressure is not routed into Roof Bay.</div>`;
    anchor.insertAdjacentElement('afterend', panel);

    window.__FT_WIND_VELOCITY_BENCHMARK__ = basis;
    window.__FT_WIND_VELOCITY_UI__ = {
      mounted: true,
      status: basis.calculationStatus,
      kz: vp.exposure.kz,
      qKPa: vp.result.qKPa,
      velocityPressureImplementation: basis.formulaImplementation.velocityPressureChain,
      unresolvedInputCount: Object.values(basis.inputs).filter((item) => item.status === 'UNRESOLVED').length,
      roofBayPressureApplied: false
    };
  }
}
