import {
  createWindProjectInputAcceptance,
  requiredWindSpeedFigureForOccupancy
} from './interchange/windProjectInputAcceptance.js';
import { calculateAcceptedWindProjectVelocityPressure } from './interchange/windProjectInputBridge.js';
import { serializeWindProjectInputAcceptance } from './interchange/windProjectInputSerialization.js';

const root = document.querySelector('[data-roof-bay-app]');

function injectStyles() {
  if (document.getElementById('ft-roof-bay-wind-project-v8-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-wind-project-v8-style';
  style.textContent = `
    .roof-bay-wind-project-v8{grid-column:1/-1}.roof-bay-wind-project-v8__lead{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}.roof-bay-wind-project-v8__grid{display:grid;grid-template-columns:minmax(320px,1.2fr) minmax(260px,.8fr);gap:.8rem}.roof-bay-wind-project-v8__card{padding:.9rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}.roof-bay-wind-project-v8__card h3{margin:.1rem 0 .65rem}.roof-bay-wind-project-v8__form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.roof-bay-wind-project-v8__form label{display:grid;gap:.28rem}.roof-bay-wind-project-v8__form input,.roof-bay-wind-project-v8__form select,.roof-bay-wind-project-v8__form textarea{width:100%}.roof-bay-wind-project-v8__form textarea{min-height:4.8rem;resize:vertical}.roof-bay-wind-project-v8__wide{grid-column:1/-1}.roof-bay-wind-project-v8__hint{display:block;color:var(--muted);font-size:.78rem;line-height:1.35}.roof-bay-wind-project-v8__actions{display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.8rem}.roof-bay-wind-project-v8__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem}.roof-bay-wind-project-v8__fact{padding:.65rem;border:1px solid var(--border);border-radius:10px}.roof-bay-wind-project-v8 small{display:block;color:var(--muted)}.roof-bay-wind-project-v8 strong{display:block;margin-top:.18rem}.roof-bay-wind-project-v8__accepted{font-weight:950;color:#8bdc9a}.roof-bay-wind-project-v8__pending{font-weight:950;color:#ffd36a}.roof-bay-wind-project-v8__error{margin-top:.7rem;padding:.7rem;border:1px solid #ff7777;border-radius:10px;color:#ff9d9d;font-weight:800;line-height:1.45}.roof-bay-wind-project-v8__boundary{margin-top:.8rem;padding:.8rem;border:1px solid var(--border);border-radius:10px;font:700 .84rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.roof-bay-wind-project-v8__result{font-size:1.15rem;font-weight:950}
    html[data-ft-theme="paper-matte"] .roof-bay-wind-project-v8__card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-wind-project-v8__accepted{color:#276738}html[data-ft-theme="paper-matte"] .roof-bay-wind-project-v8__pending{color:#8a5a12}html[data-ft-theme="paper-matte"] .roof-bay-wind-project-v8__error{color:#8f2222;border-color:#b13b3b}@media(max-width:950px){.roof-bay-wind-project-v8__grid{grid-template-columns:1fr}}@media(max-width:650px){.roof-bay-wind-project-v8__form,.roof-bay-wind-project-v8__facts{grid-template-columns:1fr}.roof-bay-wind-project-v8__wide{grid-column:auto}}@media print{.roof-bay-wind-project-v8__actions{display:none!important}.roof-bay-wind-project-v8{break-inside:avoid}}
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
  const velocityPanel = root.querySelector('.roof-bay-velocity-v7');
  const windBasisPanel = root.querySelector('.roof-bay-wind-basis');
  const results = root.querySelector('.roof-bay-results');
  const anchor = velocityPanel ?? windBasisPanel ?? results;

  if (anchor) {
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-wind-project-v8';
    panel.setAttribute('aria-label', 'M3 project wind input acceptance');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M3.2 · project input acceptance</p><h2>Project wind inputs</h2></div><span class="status-pill roof-bay-wind-project-v8__pending" data-rb-wpi-status>PROJECT INPUTS · NOT ACCEPTED</span></div>
      <p class="roof-bay-wind-project-v8__lead">Enter explicit project values and their source references. Acceptance only unlocks the already benchmarked velocity-pressure calculation; it does <strong>not</strong> generate roof pressure coefficients, field/edge/corner zones, or replace the manual Roof Bay wind-pressure input.</p>
      <div class="roof-bay-wind-project-v8__grid">
        <article class="roof-bay-wind-project-v8__card">
          <h3>Source-referenced project record</h3>
          <div class="roof-bay-wind-project-v8__form">
            <label><span>Site / location</span><input data-rb-wpi-site type="text" value="Sta. Magdalena, Sorsogon, Philippines" /></label>
            <label><span>Site source reference</span><input data-rb-wpi-site-ref type="text" placeholder="Survey / project site record" /></label>
            <label><span>Occupancy category</span><select data-rb-wpi-occupancy><option>I</option><option>II</option><option selected>III</option><option>IV</option><option>V</option></select></label>
            <label><span>Occupancy source reference</span><input data-rb-wpi-occupancy-ref type="text" placeholder="Project classification + code table check" /></label>
            <label><span>Basic wind speed, kph</span><input data-rb-wpi-speed type="number" min="1" step="1" placeholder="Explicit project value" /></label>
            <label><span>Wind-speed source type</span><select data-rb-wpi-source-type><option value="authorized-code-map" selected>Authorized code map</option><option value="project-design-criteria">Project design criteria</option><option value="site-specific-study">Site-specific study</option></select></label>
            <label><span>Selection method</span><select data-rb-wpi-selection><option value="direct-contour-read" selected>Direct contour read</option><option value="linear-interpolation">Linear interpolation</option><option value="project-specified">Project specified</option><option value="site-specific-study">Site-specific study</option></select></label>
            <label><span>Declared wind-speed figure</span><input data-rb-wpi-figure type="text" /></label>
            <label class="roof-bay-wind-project-v8__wide"><span>Basic wind-speed source reference</span><input data-rb-wpi-speed-ref type="text" placeholder="Authorized map read / design criteria / study reference" /><small class="roof-bay-wind-project-v8__hint" data-rb-wpi-required-figure></small></label>
            <label><span>Exposure category</span><select data-rb-wpi-exposure><option>B</option><option selected>C</option><option>D</option></select></label>
            <label><span>Exposure source reference</span><input data-rb-wpi-exposure-ref type="text" placeholder="Engineer terrain classification record" /></label>
            <label><span>Topographic factor Kzt</span><input data-rb-wpi-kzt type="number" min="0.01" step="0.01" value="1" /></label>
            <label><span>Topography source reference</span><input data-rb-wpi-topo-ref type="text" placeholder="Engineer topographic-factor record" /></label>
            <label><span>Evaluation / mean roof height, m</span><input data-rb-wpi-height type="number" min="0.01" step="0.01" placeholder="Explicit project geometry" /></label>
            <label><span>Height source reference</span><input data-rb-wpi-height-ref type="text" placeholder="Project geometry record" /></label>
            <label class="roof-bay-wind-project-v8__wide"><span>Note · optional</span><textarea data-rb-wpi-note placeholder="Project-specific boundary or review note"></textarea></label>
          </div>
          <div class="roof-bay-wind-project-v8__actions"><button class="button" type="button" data-rb-wpi-accept>VALIDATE + ACCEPT FOR q</button><button class="button button--ghost" type="button" data-rb-wpi-reset>RESET INPUT RECORD</button><button class="button button--ghost" type="button" data-rb-wpi-export disabled>EXPORT ACCEPTED INPUT JSON</button></div>
          <div class="roof-bay-wind-project-v8__error" data-rb-wpi-error hidden></div>
        </article>
        <article class="roof-bay-wind-project-v8__card">
          <h3>Acceptance result</h3>
          <div class="roof-bay-wind-project-v8__facts">
            <div class="roof-bay-wind-project-v8__fact"><small>Record status</small><strong data-rb-wpi-record-status>NOT ACCEPTED</strong></div>
            <div class="roof-bay-wind-project-v8__fact"><small>Required occupancy figure</small><strong data-rb-wpi-result-figure>—</strong></div>
            <div class="roof-bay-wind-project-v8__fact"><small>Velocity pressure q</small><strong class="roof-bay-wind-project-v8__result" data-rb-wpi-q>—</strong></div>
            <div class="roof-bay-wind-project-v8__fact"><small>Exposure coefficient Kz</small><strong data-rb-wpi-kz>—</strong></div>
            <div class="roof-bay-wind-project-v8__fact"><small>Source type</small><strong data-rb-wpi-result-source>—</strong></div>
            <div class="roof-bay-wind-project-v8__fact"><small>Roof Bay pressure applied?</small><strong data-rb-wpi-applied>NO · MANUAL PRESSURE REMAINS ACTIVE</strong></div>
          </div>
          <div class="roof-bay-wind-project-v8__boundary" data-rb-wpi-boundary>NOT ACCEPTED · provide source-referenced site, occupancy, basic wind speed, exposure, Kzt and height. Enclosure/internal pressure, roof geometry, external/internal coefficients and field/edge/corner zoning remain outside this acceptance slice.</div>
        </article>
      </div>`;
    anchor.insertAdjacentElement('afterend', panel);

    const field = (name) => panel.querySelector(`[data-rb-wpi-${name}]`);
    const ui = {
      site:field('site'), siteRef:field('site-ref'), occupancy:field('occupancy'), occupancyRef:field('occupancy-ref'), speed:field('speed'), sourceType:field('source-type'), selection:field('selection'), figure:field('figure'), speedRef:field('speed-ref'), requiredFigure:field('required-figure'), exposure:field('exposure'), exposureRef:field('exposure-ref'), kzt:field('kzt'), topoRef:field('topo-ref'), height:field('height'), heightRef:field('height-ref'), note:field('note'), accept:field('accept'), reset:field('reset'), export:field('export'), error:field('error'), status:field('status'), recordStatus:field('record-status'), resultFigure:field('result-figure'), q:field('q'), kz:field('kz'), resultSource:field('result-source'), applied:field('applied'), boundary:field('boundary')
    };

    let acceptedRecord = null;
    let acceptedResult = null;

    function setPublicState() {
      window.__FT_WIND_PROJECT_INPUT_UI__ = {
        mounted:true,
        accepted:Boolean(acceptedRecord),
        schemaVersion:acceptedRecord?.schemaVersion ?? null,
        status:acceptedRecord?.status ?? 'NOT_ACCEPTED',
        requiredFigureId:acceptedRecord?.occupancy?.requiredWindSpeedFigure?.figureId ?? requiredWindSpeedFigureForOccupancy(ui.occupancy.value).figureId,
        qKPa:acceptedResult?.calculation?.result?.qKPa ?? null,
        kz:acceptedResult?.calculation?.exposure?.kz ?? null,
        roofBayPressureApplied:false
      };
    }

    function syncSourceMode() {
      const sourceType = ui.sourceType.value;
      if (sourceType === 'authorized-code-map') {
        if (!['direct-contour-read','linear-interpolation'].includes(ui.selection.value)) ui.selection.value = 'direct-contour-read';
        ui.figure.value = requiredWindSpeedFigureForOccupancy(ui.occupancy.value).figureId;
      } else if (sourceType === 'project-design-criteria') {
        ui.selection.value = 'project-specified';
      } else {
        ui.selection.value = 'site-specific-study';
      }
      const required = requiredWindSpeedFigureForOccupancy(ui.occupancy.value);
      ui.requiredFigure.textContent = `Occupancy ${ui.occupancy.value} requires NSCP wind-speed Figure ${required.figureId} when the source is an authorized code-map read. Non-map sources remain explicitly non-map.`;
    }

    function invalidate() {
      acceptedRecord = null;
      acceptedResult = null;
      window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__ = null;
      window.__FT_WIND_PROJECT_INPUT_RESULT__ = null;
      ui.export.disabled = true;
      ui.status.textContent = 'PROJECT INPUTS · NOT ACCEPTED';
      ui.status.classList.remove('roof-bay-wind-project-v8__accepted');
      ui.status.classList.add('roof-bay-wind-project-v8__pending');
      ui.recordStatus.textContent = 'NOT ACCEPTED';
      ui.resultFigure.textContent = requiredWindSpeedFigureForOccupancy(ui.occupancy.value).figureId;
      ui.q.textContent = '—';
      ui.kz.textContent = '—';
      ui.resultSource.textContent = '—';
      ui.applied.textContent = 'NO · MANUAL PRESSURE REMAINS ACTIVE';
      ui.boundary.textContent = 'NOT ACCEPTED · provide source-referenced site, occupancy, basic wind speed, exposure, Kzt and height. Enclosure/internal pressure, roof geometry, external/internal coefficients and field/edge/corner zoning remain outside this acceptance slice.';
      ui.error.hidden = true;
      ui.error.textContent = '';
      setPublicState();
    }

    function values() {
      return {
        siteLocation:ui.site.value,
        siteSourceReference:ui.siteRef.value,
        occupancyCategory:ui.occupancy.value,
        occupancySourceReference:ui.occupancyRef.value,
        basicWindSpeedKph:ui.speed.value,
        windSpeedSourceType:ui.sourceType.value,
        windSpeedSourceReference:ui.speedRef.value,
        windSpeedSelectionMethod:ui.selection.value,
        windSpeedFigureId:ui.figure.value.trim() || null,
        exposureCategory:ui.exposure.value,
        exposureSourceReference:ui.exposureRef.value,
        topographicFactorKzt:ui.kzt.value,
        topographySourceReference:ui.topoRef.value,
        heightM:ui.height.value,
        heightSourceReference:ui.heightRef.value,
        note:ui.note.value.trim() || null
      };
    }

    function accept() {
      try {
        const record = createWindProjectInputAcceptance(values());
        const result = calculateAcceptedWindProjectVelocityPressure(record);
        acceptedRecord = record;
        acceptedResult = result;
        window.__FT_WIND_PROJECT_INPUT_ACCEPTANCE__ = record;
        window.__FT_WIND_PROJECT_INPUT_RESULT__ = result;
        ui.export.disabled = false;
        ui.status.textContent = 'PROJECT INPUTS · ACCEPTED FOR q ONLY';
        ui.status.classList.remove('roof-bay-wind-project-v8__pending');
        ui.status.classList.add('roof-bay-wind-project-v8__accepted');
        ui.recordStatus.textContent = record.status;
        ui.resultFigure.textContent = record.occupancy.requiredWindSpeedFigure.figureId;
        ui.q.textContent = `${result.calculation.result.qKPa.toFixed(6)} kPa`;
        ui.kz.textContent = result.calculation.exposure.kz.toFixed(9);
        ui.resultSource.textContent = `${record.basicWindSpeed.sourceType} · ${record.basicWindSpeed.selectionMethod}`;
        ui.applied.textContent = 'NO · MANUAL PRESSURE REMAINS ACTIVE';
        ui.boundary.textContent = 'ACCEPTED FOR VELOCITY PRESSURE ONLY · this accepted record may be embedded in the Roof Bay project export and may feed the benchmarked q chain. External/internal pressure coefficients, enclosure effects, roof zoning and final code-derived Roof Bay pressure remain BLOCKED.';
        ui.error.hidden = true;
        ui.error.textContent = '';
        setPublicState();
        window.dispatchEvent(new CustomEvent('ft-wind-project-input-accepted', { detail:{ record, result } }));
      } catch (error) {
        invalidate();
        ui.error.hidden = false;
        ui.error.textContent = error instanceof Error ? error.message : String(error);
      }
    }

    function reset() {
      ui.site.value = 'Sta. Magdalena, Sorsogon, Philippines';
      ui.siteRef.value = '';
      ui.occupancy.value = 'III';
      ui.occupancyRef.value = '';
      ui.speed.value = '';
      ui.sourceType.value = 'authorized-code-map';
      ui.selection.value = 'direct-contour-read';
      ui.exposure.value = 'C';
      ui.exposureRef.value = '';
      ui.kzt.value = '1';
      ui.topoRef.value = '';
      ui.height.value = '';
      ui.heightRef.value = '';
      ui.note.value = '';
      syncSourceMode();
      invalidate();
    }

    panel.addEventListener('input', (event) => {
      if (event.target === ui.occupancy || event.target === ui.sourceType) syncSourceMode();
      invalidate();
    });
    panel.addEventListener('change', (event) => {
      if (event.target === ui.occupancy || event.target === ui.sourceType) syncSourceMode();
      invalidate();
    });
    ui.accept.addEventListener('click', accept);
    ui.reset.addEventListener('click', reset);
    ui.export.addEventListener('click', () => {
      if (!acceptedRecord) return;
      download(serializeWindProjectInputAcceptance(acceptedRecord), `futoltech-wind-project-input-${Date.now()}.json`);
    });

    reset();
  }
}
