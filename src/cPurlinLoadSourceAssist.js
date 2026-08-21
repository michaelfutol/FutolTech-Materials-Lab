const root = document.querySelector('[data-cp-loadcase-app]');

const LAMBDA_TABLE = [
  { h: 4.5, B: 1.00, C: 1.21, D: 1.47 },
  { h: 6.0, B: 1.00, C: 1.29, D: 1.55 },
  { h: 7.5, B: 1.00, C: 1.35, D: 1.61 },
  { h: 9.0, B: 1.00, C: 1.40, D: 1.66 },
  { h: 10.5, B: 1.05, C: 1.45, D: 1.70 },
  { h: 12.0, B: 1.09, C: 1.49, D: 1.74 },
  { h: 13.5, B: 1.12, C: 1.53, D: 1.78 },
  { h: 15.0, B: 1.16, C: 1.56, D: 1.81 },
  { h: 16.5, B: 1.19, C: 1.59, D: 1.84 },
  { h: 18.0, B: 1.22, C: 1.62, D: 1.87 }
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function interpolateLambda(height, exposure) {
  const h = clamp(height, 4.5, 18);
  const first = LAMBDA_TABLE[0];
  const last = LAMBDA_TABLE[LAMBDA_TABLE.length - 1];
  if (h <= first.h) return first[exposure];
  if (h >= last.h) return last[exposure];
  for (let i = 1; i < LAMBDA_TABLE.length; i += 1) {
    const upper = LAMBDA_TABLE[i];
    const lower = LAMBDA_TABLE[i - 1];
    if (h <= upper.h) {
      const t = (h - lower.h) / (upper.h - lower.h);
      return lower[exposure] + (upper[exposure] - lower[exposure]) * t;
    }
  }
  return last[exposure];
}

function emit(control) {
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new Event('change', { bubbles: true }));
}

function setValue(selector, value) {
  const control = root.querySelector(selector);
  if (!control) return;
  control.value = String(value);
  emit(control);
}

function injectStyles() {
  if (document.getElementById('ft-cplc-load-source-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-cplc-load-source-style';
  style.textContent = `
    .cp-load-source{margin:.85rem 0 1rem;padding:.9rem;border:1px solid var(--border);border-radius:14px;background:rgba(7,20,28,.20)}
    .cp-load-source-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
    .cp-load-source-head h3{margin:.08rem 0 .2rem}.cp-load-source-head p{margin:0;color:var(--muted);line-height:1.45;max-width:48rem}
    .cp-load-source-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.45rem;margin-top:.75rem}
    .cp-load-source-tab{min-height:46px;border:1px solid var(--border);border-radius:10px;background:transparent;color:var(--text);font-weight:800;cursor:pointer}
    .cp-load-source-tab.is-active{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:rgba(103,230,207,.08)}
    .cp-load-source-pane{display:none;margin-top:.75rem}.cp-load-source-pane.is-active{display:block}
    .cp-load-source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.cp-load-source-grid label{display:grid;gap:.25rem}
    .cp-load-source-grid input,.cp-load-source-grid select{width:100%}.cp-load-source-wide{grid-column:1/-1}
    .cp-load-source-summary{margin-top:.7rem;padding:.75rem;border:1px solid var(--border);border-radius:10px;background:rgba(7,20,28,.22);line-height:1.5}
    .cp-load-source-summary strong{display:block;margin-bottom:.2rem}.cp-load-source-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.65rem}
    .cp-load-source-badge{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:.25rem .55rem;font-size:.78rem;font-weight:900;letter-spacing:.04em}
    .cp-load-source-warning{color:#ffd65c}.cp-load-source-ok{color:#67e6cf}
    html[data-ft-theme="paper-matte"] .cp-load-source{background:#fffaf1;color:#172127}
    html[data-ft-theme="paper-matte"] .cp-load-source-summary{background:#fffdf8;color:#172127}
    html[data-ft-theme="paper-matte"] .cp-load-source-warning{color:#8a5200}
    html[data-ft-theme="paper-matte"] .cp-load-source-ok{color:#176a60}
    @media(max-width:620px){.cp-load-source-tabs,.cp-load-source-grid{grid-template-columns:1fr}.cp-load-source-wide{grid-column:auto}}
    @media print{.cp-load-source{break-inside:avoid}.cp-load-source-actions{display:none!important}}
  `;
  document.head.appendChild(style);
}

function panelHtml() {
  return `
    <section class="cp-load-source" data-cplc-load-source aria-label="Load source mode">
      <div class="cp-load-source-head">
        <div>
          <span class="cp-load-source-badge" data-cplc-source-badge>MANUAL</span>
          <h3>Load source</h3>
          <p>Choose where the kPa values come from. Manual inputs always remain available; code-assisted values are screening aids until the full roof-zone/effective-area lookup engine is implemented.</p>
        </div>
      </div>
      <div class="cp-load-source-tabs" role="tablist">
        <button type="button" class="cp-load-source-tab is-active" data-cplc-source="manual">Manual</button>
        <button type="button" class="cp-load-source-tab" data-cplc-source="educational">Educational preset</button>
        <button type="button" class="cp-load-source-tab" data-cplc-source="nscp">NSCP 2015 assisted</button>
      </div>

      <div class="cp-load-source-pane is-active" data-cplc-source-pane="manual">
        <div class="cp-load-source-summary"><strong>Manual override</strong>Use the dead/live/wind kPa fields below directly. This remains the safest fallback whenever a code-derived pressure has already been calculated elsewhere.</div>
      </div>

      <div class="cp-load-source-pane" data-cplc-source-pane="educational">
        <div class="cp-load-source-grid">
          <label class="cp-load-source-wide">Teaching preset
            <select data-cplc-edu-preset>
              <option value="original">Original FutolTech demo · 0.20 DL + 0.75 LL + 1.50 uplift / 0.80 downward</option>
              <option value="zone1-250">NSCP-style teaching example · 250 kph · low-rise purlin · Zone 1</option>
            </select>
          </label>
        </div>
        <div class="cp-load-source-actions"><button type="button" class="button" data-cplc-apply-edu>Apply teaching preset</button></div>
        <div class="cp-load-source-summary"><strong>Educational only</strong>The 250 kph example seeds 1.09 kPa downward and 1.85 kPa uplift from a published teaching example for a low-rise purlin case. It is not a site-specific design value.</div>
      </div>

      <div class="cp-load-source-pane" data-cplc-source-pane="nscp">
        <div class="cp-load-source-grid">
          <label>Procedure
            <select data-cplc-nscp-procedure disabled><option>NSCP 2015 §207E.5 · enclosed low-rise C&C simplified</option></select>
          </label>
          <label>Enclosure classification
            <select data-cplc-nscp-enclosure><option value="enclosed" selected>Enclosed</option><option value="other">Other / not eligible for this simplified helper</option></select>
          </label>
          <label>Basic wind speed V, kph
            <input data-cplc-nscp-v type="number" min="100" max="400" step="10" value="310" />
          </label>
          <label>Mean roof height h, m
            <input data-cplc-nscp-h type="number" min="4.5" max="18" step="0.5" value="9" />
          </label>
          <label>Exposure
            <select data-cplc-nscp-exposure><option value="B">B</option><option value="C" selected>C</option><option value="D">D</option></select>
          </label>
          <label>Topographic factor Kzt
            <input data-cplc-nscp-kzt type="number" min="1" max="3" step="0.01" value="1.00" />
          </label>
          <label>Roof zone
            <select data-cplc-nscp-zone><option value="1" selected>Zone 1 · interior</option><option value="2">Zone 2 · edge/end</option><option value="3">Zone 3 · corner</option></select>
          </label>
          <label>Effective wind area, m²
            <input data-cplc-nscp-area type="number" min="0.1" max="100" step="0.1" value="2.0" />
          </label>
          <label>Pnet9 uplift magnitude, kPa
            <input data-cplc-nscp-p9-uplift type="number" min="0" max="20" step="0.01" placeholder="Enter from Fig. 207E.5-1" />
          </label>
          <label>Pnet9 downward, kPa
            <input data-cplc-nscp-p9-down type="number" min="0" max="20" step="0.01" placeholder="Enter from Fig. 207E.5-1" />
          </label>
        </div>
        <div class="cp-load-source-actions">
          <button type="button" class="button" data-cplc-nscp-seed>Seed 250-kph Zone-1 teaching Pnet9</button>
          <button type="button" class="button primary" data-cplc-nscp-apply>Apply adjusted wind pressures</button>
        </div>
        <div class="cp-load-source-summary" data-cplc-nscp-summary></div>
      </div>
    </section>
  `;
}

function mount() {
  if (!root) return;
  injectStyles();
  const grid = root.querySelector('.cp-loadcase-grid');
  if (!grid || root.querySelector('[data-cplc-load-source]')) return;
  grid.insertAdjacentHTML('beforebegin', panelHtml());

  const panel = root.querySelector('[data-cplc-load-source]');
  const badge = panel.querySelector('[data-cplc-source-badge]');
  const tabs = [...panel.querySelectorAll('[data-cplc-source]')];
  const panes = [...panel.querySelectorAll('[data-cplc-source-pane]')];
  const windUplift = root.querySelector('[data-cplc-wind-uplift]');
  const windDownward = root.querySelector('[data-cplc-wind-downward]');
  const nscp = {
    enclosure: panel.querySelector('[data-cplc-nscp-enclosure]'),
    v: panel.querySelector('[data-cplc-nscp-v]'),
    h: panel.querySelector('[data-cplc-nscp-h]'),
    exposure: panel.querySelector('[data-cplc-nscp-exposure]'),
    kzt: panel.querySelector('[data-cplc-nscp-kzt]'),
    zone: panel.querySelector('[data-cplc-nscp-zone]'),
    area: panel.querySelector('[data-cplc-nscp-area]'),
    p9Uplift: panel.querySelector('[data-cplc-nscp-p9-uplift]'),
    p9Down: panel.querySelector('[data-cplc-nscp-p9-down]'),
    summary: panel.querySelector('[data-cplc-nscp-summary]')
  };

  let source = 'manual';

  function setSource(next) {
    source = next;
    tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.cplcSource === source));
    panes.forEach((pane) => pane.classList.toggle('is-active', pane.dataset.cplcSourcePane === source));
    badge.textContent = source === 'nscp' ? 'NSCP-ASSISTED' : source.toUpperCase();
    root.dataset.loadSource = source;
    windUplift.readOnly = source === 'nscp';
    windDownward.readOnly = source === 'nscp';
  }

  function renderNscpSummary() {
    const exposure = nscp.exposure.value;
    const h = Number(nscp.h.value);
    const kzt = clamp(nscp.kzt.value, 1, 3);
    const lambda = interpolateLambda(h, exposure);
    const p9Up = Number(nscp.p9Uplift.value);
    const p9Down = Number(nscp.p9Down.value);
    const eligible = nscp.enclosure.value === 'enclosed' && h <= 18;
    const up = Number.isFinite(p9Up) && p9Up > 0 ? lambda * kzt * p9Up : null;
    const down = Number.isFinite(p9Down) && p9Down > 0 ? lambda * kzt * p9Down : null;
    const statusClass = eligible ? 'cp-load-source-ok' : 'cp-load-source-warning';
    nscp.summary.innerHTML = `
      <strong>NSCP-assisted screening trace</strong>
      <span class="${statusClass}">${eligible ? 'Simplified-helper eligibility appears satisfied for enclosure/height.' : 'Not eligible for this simplified helper; use the appropriate NSCP procedure.'}</span><br>
      V = ${Number(nscp.v.value) || '—'} kph · h = ${h || '—'} m · Exposure ${exposure} · Zone ${nscp.zone.value} · Aeff = ${Number(nscp.area.value) || '—'} m²<br>
      λ = ${lambda.toFixed(3)} · Kzt = ${kzt.toFixed(2)} · pnet = λ Kzt Pnet9<br>
      Adjusted uplift = ${up == null ? 'enter verified Pnet9' : `${up.toFixed(3)} kPa`} · adjusted downward = ${down == null ? 'enter verified Pnet9' : `${down.toFixed(3)} kPa`}<br>
      <small>Pnet9 must be selected/verified from NSCP Figure 207E.5-1 for the applicable wind speed, roof zone and effective wind area. This helper intentionally does not invent that lookup.</small>`;
    return { eligible, up, down, lambda, kzt };
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => setSource(tab.dataset.cplcSource)));
  panel.querySelector('[data-cplc-apply-edu]').addEventListener('click', () => {
    const preset = panel.querySelector('[data-cplc-edu-preset]').value;
    setSource('educational');
    if (preset === 'zone1-250') {
      setValue('[data-cplc-wind-uplift]', 1.85);
      setValue('[data-cplc-wind-downward]', 1.09);
      nscp.v.value = '250'; nscp.h.value = '9'; nscp.exposure.value = 'B'; nscp.kzt.value = '1'; nscp.zone.value = '1'; nscp.area.value = '2.1'; nscp.p9Uplift.value = '1.85'; nscp.p9Down.value = '1.09';
    } else {
      setValue('[data-cplc-dead]', 0.20);
      setValue('[data-cplc-live]', 0.75);
      setValue('[data-cplc-wind-uplift]', 1.50);
      setValue('[data-cplc-wind-downward]', 0.80);
    }
    root.dataset.loadSourceDetail = preset;
    renderNscpSummary();
  });

  panel.querySelector('[data-cplc-nscp-seed]').addEventListener('click', () => {
    setSource('nscp');
    nscp.v.value = '250'; nscp.h.value = '9'; nscp.exposure.value = 'B'; nscp.kzt.value = '1'; nscp.zone.value = '1'; nscp.area.value = '2.1'; nscp.p9Uplift.value = '1.85'; nscp.p9Down.value = '1.09';
    renderNscpSummary();
  });

  panel.querySelector('[data-cplc-nscp-apply]').addEventListener('click', () => {
    setSource('nscp');
    const result = renderNscpSummary();
    if (!result.eligible || result.up == null || result.down == null) return;
    windUplift.value = result.up.toFixed(3);
    windDownward.value = result.down.toFixed(3);
    emit(windUplift); emit(windDownward);
    root.dataset.loadSourceDetail = `NSCP-207E5|lambda=${result.lambda.toFixed(3)}|Kzt=${result.kzt.toFixed(2)}`;
  });

  [nscp.enclosure, nscp.v, nscp.h, nscp.exposure, nscp.kzt, nscp.zone, nscp.area, nscp.p9Uplift, nscp.p9Down]
    .forEach((control) => { control.addEventListener('input', renderNscpSummary); control.addEventListener('change', renderNscpSummary); });

  renderNscpSummary();
  setSource('manual');
}

mount();
