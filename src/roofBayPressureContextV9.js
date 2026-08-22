import {
  createWindPressureContextAcceptance,
  serializeWindPressureContextAcceptance
} from './interchange/windPressureContextAcceptance.js';

const root = document.querySelector('[data-roof-bay-app]');

function injectStyles() {
  if (document.getElementById('ft-roof-bay-pressure-context-v9-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-pressure-context-v9-style';
  style.textContent = `
    .roof-bay-pressure-context-v9{grid-column:1/-1}.roof-bay-pressure-context-v9__lead{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}.roof-bay-pressure-context-v9__grid{display:grid;grid-template-columns:minmax(340px,1.15fr) minmax(280px,.85fr);gap:.85rem}.roof-bay-pressure-context-v9__card{padding:.95rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}.roof-bay-pressure-context-v9__card h3{margin:.1rem 0 .65rem}.roof-bay-pressure-context-v9__form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.roof-bay-pressure-context-v9__form label{display:grid;gap:.3rem;min-width:0}.roof-bay-pressure-context-v9__form input,.roof-bay-pressure-context-v9__form select,.roof-bay-pressure-context-v9__form textarea{width:100%;min-width:0;font-size:.94rem;line-height:1.3}.roof-bay-pressure-context-v9__form textarea{min-height:4.8rem;resize:vertical}.roof-bay-pressure-context-v9__wide{grid-column:1/-1}.roof-bay-pressure-context-v9__hint{display:block;color:var(--muted);font-size:.82rem;line-height:1.4}.roof-bay-pressure-context-v9__actions{display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.85rem}.roof-bay-pressure-context-v9__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.roof-bay-pressure-context-v9__fact{padding:.7rem;border:1px solid var(--border);border-radius:10px;min-width:0}.roof-bay-pressure-context-v9__fact small{display:block;color:var(--muted);font-size:.82rem}.roof-bay-pressure-context-v9__fact strong{display:block;margin-top:.2rem;overflow-wrap:anywhere}.roof-bay-pressure-context-v9__accepted{font-weight:950;color:#8bdc9a}.roof-bay-pressure-context-v9__pending{font-weight:950;color:#ffd36a}.roof-bay-pressure-context-v9__error{margin-top:.75rem;padding:.75rem;border:1px solid #ff7777;border-radius:10px;color:#ff9d9d;font-weight:800;line-height:1.45}.roof-bay-pressure-context-v9__boundary{margin-top:.85rem;padding:.85rem;border:1px solid var(--border);border-radius:10px;font:700 .88rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}
    html[data-ft-theme="paper-matte"] .roof-bay-pressure-context-v9__card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-pressure-context-v9__accepted{color:#276738}html[data-ft-theme="paper-matte"] .roof-bay-pressure-context-v9__pending{color:#8a5a12}html[data-ft-theme="paper-matte"] .roof-bay-pressure-context-v9__error{color:#8f2222;border-color:#b13b3b}@media(max-width:980px){.roof-bay-pressure-context-v9__grid{grid-template-columns:1fr}}@media(max-width:680px){.roof-bay-pressure-context-v9__form,.roof-bay-pressure-context-v9__facts{grid-template-columns:1fr}.roof-bay-pressure-context-v9__wide{grid-column:auto}}@media print{.roof-bay-pressure-context-v9__actions{display:none!important}.roof-bay-pressure-context-v9{break-inside:avoid}}
  `;
  document.head.appendChild(style);
}

function download(text, filename) {
  const blob = new Blob([text], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (root) {
  injectStyles();
  const upstreamPanel = root.querySelector('.roof-bay-wind-project-v8');
  const anchor = upstreamPanel ?? root.querySelector('.roof-bay-velocity-v7') ?? root.querySelector('.roof-bay-results');

  if (anchor) {
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-pressure-context-v9';
    panel.setAttribute('aria-label', 'M3 enclosure and roof geometry input acceptance');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M3.3 · pressure-context acceptance</p><h2>Enclosure + roof/building geometry</h2></div><span class="status-pill roof-bay-pressure-context-v9__pending" data-rb-pc-status>PRESSURE CONTEXT · NOT ACCEPTED</span></div>
      <p class="roof-bay-pressure-context-v9__lead">This record is allowed only after the source-referenced project wind inputs are accepted. It stores an <strong>engineer-declared</strong> enclosure classification and traceable roof/building geometry for later coefficient and zoning work. It does not calculate GCpi, external coefficients, effective wind area, roof zones, or final roof pressure.</p>
      <div class="roof-bay-pressure-context-v9__grid">
        <article class="roof-bay-pressure-context-v9__card">
          <h3>Source-referenced pressure context</h3>
          <div class="roof-bay-pressure-context-v9__form">
            <label><span>Enclosure classification</span><select data-rb-pc-enclosure><option value="enclosed" selected>Enclosed</option><option value="partially-enclosed">Partially enclosed</option><option value="open">Open</option></select></label>
            <label><span>Classification source reference</span><input data-rb-pc-enclosure-ref type="text" placeholder="Engineer classification + authorized NSCP check" /></label>
            <label class="roof-bay-pressure-context-v9__wide"><span>Building-envelope openings assessment reference</span><input data-rb-pc-openings-ref type="text" placeholder="Opening schedule / façade assessment / project record" /><small class="roof-bay-pressure-context-v9__hint">The app records the engineer-declared category; it does not yet evaluate the quantitative NSCP opening thresholds.</small></label>
            <label><span>Roof form</span><select data-rb-pc-roof-form><option value="gable" selected>Gable</option><option value="hip">Hip</option><option value="monoslope">Monoslope</option><option value="flat">Flat</option><option value="other">Other</option></select></label>
            <label><span>Roof-form source reference</span><input data-rb-pc-roof-form-ref type="text" placeholder="Architectural / structural roof plan" /></label>
            <label><span>Building plan length, m</span><input data-rb-pc-plan-length type="number" min="0.01" step="0.01" placeholder="Overall building dimension" /></label>
            <label><span>Building plan width, m</span><input data-rb-pc-plan-width type="number" min="0.01" step="0.01" placeholder="Overall building dimension" /></label>
            <label class="roof-bay-pressure-context-v9__wide"><span>Plan-dimension source reference</span><input data-rb-pc-plan-ref type="text" placeholder="Dimensioned project plan / survey" /></label>
            <label><span>Mean roof height, m</span><input data-rb-pc-height type="number" readonly /></label>
            <label><span>Mean-height source reference</span><input data-rb-pc-height-ref type="text" readonly /></label>
            <label><span>Roof slope, degrees</span><input data-rb-pc-slope type="number" min="0" max="60" step="0.1" /></label>
            <label><span>Roof-slope source reference</span><input data-rb-pc-slope-ref type="text" placeholder="Roof section / project geometry record" /></label>
            <label class="roof-bay-pressure-context-v9__wide"><span>Note · optional</span><textarea data-rb-pc-note placeholder="Project-specific review note"></textarea></label>
          </div>
          <div class="roof-bay-pressure-context-v9__actions"><button class="button" type="button" data-rb-pc-accept>VALIDATE + ACCEPT CONTEXT</button><button class="button button--ghost" type="button" data-rb-pc-reset>RESET CONTEXT</button><button class="button button--ghost" type="button" data-rb-pc-export disabled>EXPORT CONTEXT JSON</button></div>
          <div class="roof-bay-pressure-context-v9__error" data-rb-pc-error hidden></div>
        </article>
        <article class="roof-bay-pressure-context-v9__card">
          <h3>Acceptance result</h3>
          <div class="roof-bay-pressure-context-v9__facts">
            <div class="roof-bay-pressure-context-v9__fact"><small>Upstream wind inputs</small><strong data-rb-pc-upstream>NOT ACCEPTED</strong></div>
            <div class="roof-bay-pressure-context-v9__fact"><small>Context status</small><strong data-rb-pc-record-status>NOT ACCEPTED</strong></div>
            <div class="roof-bay-pressure-context-v9__fact"><small>Enclosure</small><strong data-rb-pc-result-enclosure>—</strong></div>
            <div class="roof-bay-pressure-context-v9__fact"><small>Roof geometry</small><strong data-rb-pc-result-geometry>—</strong></div>
            <div class="roof-bay-pressure-context-v9__fact"><small>Code pressure applied?</small><strong data-rb-pc-applied>NO · MANUAL PRESSURE REMAINS ACTIVE</strong></div>
            <div class="roof-bay-pressure-context-v9__fact"><small>Zone polygons</small><strong data-rb-pc-zones>0 · BLOCKED</strong></div>
          </div>
          <div class="roof-bay-pressure-context-v9__boundary" data-rb-pc-boundary>WAITING · accept the M3.2 project wind-input record first. GCpi, external coefficients, effective wind area, field/edge/corner zoning, and final roof pressure remain blocked.</div>
        </article>
      </div>`;
    anchor.insertAdjacentElement('afterend', panel);

    const field = (name) => panel.querySelector(`[data-rb-pc-${name}]`);
    const ui = {
      enclosure:field('enclosure'), enclosureRef:field('enclosure-ref'), openingsRef:field('openings-ref'), roofForm:field('roof-form'), roofFormRef:field('roof-form-ref'), planLength:field('plan-length'), planWidth:field('plan-width'), planRef:field('plan-ref'), height:field('height'), heightRef:field('height-ref'), slope:field('slope'), slopeRef:field('slope-ref'), note:field('note'), accept:field('accept'), reset:field('reset'), export:field('export'), error:field('error'), status:field('status'), upstream:field('upstream'), recordStatus:field('record-status'), resultEnclosure:field('result-enclosure'), resultGeometry:field('result-geometry'), applied:field('applied'), zones:field('zones'), boundary:field('boundary')
    };

    let acceptedRecord = null;

    function upstreamRecord() {
      return window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__ ?? null;
    }

    function currentRoofSlope() {
      return Number(root.querySelector('[data-rb-slope]')?.value ?? 0);
    }

    function setPublicState() {
      window.__FT_WIND_PRESSURE_CONTEXT_UI__ = {
        mounted:true,
        upstreamAccepted:Boolean(upstreamRecord()),
        accepted:Boolean(acceptedRecord),
        schemaVersion:acceptedRecord?.schemaVersion ?? null,
        status:acceptedRecord?.status ?? 'NOT_ACCEPTED',
        enclosureClassification:acceptedRecord?.enclosure?.classification ?? null,
        roofForm:acceptedRecord?.roofGeometry?.roofForm ?? null,
        pressureModel:'manual-uniform',
        codeZones:0
      };
    }

    function syncUpstream() {
      const upstream = upstreamRecord();
      if (upstream) {
        ui.upstream.textContent = upstream.status;
        ui.height.value = String(upstream.height.valueM);
        ui.heightRef.value = upstream.height.sourceReference;
        ui.accept.disabled = false;
      } else {
        ui.upstream.textContent = 'NOT ACCEPTED';
        ui.height.value = '';
        ui.heightRef.value = '';
        ui.accept.disabled = true;
      }
      ui.slope.value = String(currentRoofSlope());
      setPublicState();
    }

    function invalidate(message = null) {
      acceptedRecord = null;
      window.__FT_WIND_PRESSURE_CONTEXT_ACCEPTANCE__ = null;
      ui.export.disabled = true;
      ui.status.textContent = 'PRESSURE CONTEXT · NOT ACCEPTED';
      ui.status.classList.remove('roof-bay-pressure-context-v9__accepted');
      ui.status.classList.add('roof-bay-pressure-context-v9__pending');
      ui.recordStatus.textContent = 'NOT ACCEPTED';
      ui.resultEnclosure.textContent = '—';
      ui.resultGeometry.textContent = '—';
      ui.applied.textContent = 'NO · MANUAL PRESSURE REMAINS ACTIVE';
      ui.zones.textContent = '0 · BLOCKED';
      ui.boundary.textContent = upstreamRecord()
        ? 'NOT ACCEPTED · provide traceable enclosure and building/roof geometry. GCpi, external coefficients, effective wind area, field/edge/corner zoning, and final roof pressure remain blocked.'
        : 'WAITING · accept the M3.2 project wind-input record first. GCpi, external coefficients, effective wind area, field/edge/corner zoning, and final roof pressure remain blocked.';
      ui.error.hidden = message == null;
      ui.error.textContent = message ?? '';
      syncUpstream();
    }

    function values() {
      return {
        windProjectInputAcceptance:upstreamRecord(),
        enclosureClassification:ui.enclosure.value,
        enclosureClassificationSourceReference:ui.enclosureRef.value,
        openingsAssessmentSourceReference:ui.openingsRef.value,
        roofForm:ui.roofForm.value,
        roofFormSourceReference:ui.roofFormRef.value,
        planLengthM:ui.planLength.value,
        planWidthM:ui.planWidth.value,
        planDimensionSourceReference:ui.planRef.value,
        meanRoofHeightM:ui.height.value,
        meanRoofHeightSourceReference:ui.heightRef.value,
        roofSlopeDeg:ui.slope.value,
        roofSlopeSourceReference:ui.slopeRef.value,
        note:ui.note.value.trim() || null
      };
    }

    function accept() {
      try {
        if (!upstreamRecord()) throw new Error('Accept the source-referenced M3.2 project wind inputs before accepting pressure context.');
        if (Math.abs(Number(ui.slope.value) - currentRoofSlope()) > 1e-9) {
          throw new Error('Pressure-context roof slope must match the active Roof Bay project slope. Update the context value or the Roof Bay slope, then validate again.');
        }
        const record = createWindPressureContextAcceptance(values());
        acceptedRecord = record;
        window.__FT_WIND_PRESSURE_CONTEXT_ACCEPTANCE__ = record;
        ui.export.disabled = false;
        ui.status.textContent = 'PRESSURE CONTEXT · ACCEPTED INPUTS ONLY';
        ui.status.classList.remove('roof-bay-pressure-context-v9__pending');
        ui.status.classList.add('roof-bay-pressure-context-v9__accepted');
        ui.recordStatus.textContent = record.status;
        ui.resultEnclosure.textContent = `${record.enclosure.classification} · engineer declared`;
        ui.resultGeometry.textContent = `${record.roofGeometry.roofForm} · ${record.roofGeometry.planLengthM.toFixed(2)} × ${record.roofGeometry.planWidthM.toFixed(2)} m · h ${record.roofGeometry.meanRoofHeightM.toFixed(2)} m · ${record.roofGeometry.roofSlopeDeg.toFixed(1)}°`;
        ui.boundary.textContent = 'ACCEPTED INPUT CONTEXT ONLY · this record may now travel with Roof Bay project JSON. It does not select GCpi/Cp/GCp, effective wind area, zone dimensions/polygons, load combinations, or final code-derived roof pressure. Manual-uniform pressure remains active.';
        ui.error.hidden = true;
        ui.error.textContent = '';
        setPublicState();
        window.dispatchEvent(new CustomEvent('ft-wind-pressure-context-accepted', { detail:{ record } }));
      } catch (error) {
        invalidate(error instanceof Error ? error.message : String(error));
      }
    }

    function reset() {
      ui.enclosure.value = 'enclosed';
      ui.enclosureRef.value = '';
      ui.openingsRef.value = '';
      ui.roofForm.value = 'gable';
      ui.roofFormRef.value = '';
      ui.planLength.value = '';
      ui.planWidth.value = '';
      ui.planRef.value = '';
      ui.slopeRef.value = '';
      ui.note.value = '';
      invalidate();
    }

    panel.addEventListener('input', (event) => {
      if (event.target === ui.height || event.target === ui.heightRef) return;
      invalidate();
    });
    panel.addEventListener('change', () => invalidate());
    ui.accept.addEventListener('click', accept);
    ui.reset.addEventListener('click', reset);
    ui.export.addEventListener('click', () => {
      if (!acceptedRecord) return;
      download(serializeWindPressureContextAcceptance(acceptedRecord), `futoltech-wind-pressure-context-${Date.now()}.json`);
    });

    if (upstreamPanel) {
      upstreamPanel.addEventListener('input', () => invalidate());
      upstreamPanel.addEventListener('change', () => invalidate());
    }
    root.querySelector('[data-rb-slope]')?.addEventListener('input', () => invalidate());
    root.querySelector('[data-rb-slope]')?.addEventListener('change', () => invalidate());
    window.addEventListener('ft-wind-project-input-accepted', () => invalidate());

    reset();
  }
}