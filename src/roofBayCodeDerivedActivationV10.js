import { parseWindRoofStrengthCombinationAssembly, validateWindRoofStrengthCombinationAssembly } from './solver/windRoofStrengthCombinationAssembly.js';
import { resolveRoofBayCodeDerivedActivation, serializeRoofBayCodeDerivedActivation } from './interchange/roofBayCodeDerivedActivation.js';

const root = document.querySelector('[data-roof-bay-app]');

function compact(value, digits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return number.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1');
}

function injectStyles() {
  if (document.getElementById('ft-roof-bay-code-derived-v10-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-roof-bay-code-derived-v10-style';
  style.textContent = `
    .roof-bay-code-derived-v10{grid-column:1/-1}.roof-bay-code-derived-v10__lead{margin:.25rem 0 1rem;color:var(--muted);line-height:1.55}.roof-bay-code-derived-v10__grid{display:grid;grid-template-columns:minmax(360px,1.08fr) minmax(300px,.92fr);gap:.85rem}.roof-bay-code-derived-v10__card{padding:.95rem;border:1px solid var(--border);border-radius:12px;background:rgba(7,20,28,.22);min-width:0}.roof-bay-code-derived-v10__card h3{margin:.1rem 0 .65rem}.roof-bay-code-derived-v10__form{display:grid;gap:.65rem}.roof-bay-code-derived-v10__form label{display:grid;gap:.3rem}.roof-bay-code-derived-v10__form textarea{width:100%;min-height:9rem;resize:vertical;font:650 .8rem/1.45 ui-monospace,SFMono-Regular,Consolas,monospace}.roof-bay-code-derived-v10__form input,.roof-bay-code-derived-v10__form select{width:100%}.roof-bay-code-derived-v10__check{display:flex!important;grid-template-columns:auto 1fr!important;align-items:flex-start;gap:.55rem!important}.roof-bay-code-derived-v10__check input{width:auto;margin-top:.2rem}.roof-bay-code-derived-v10__actions{display:flex;gap:.55rem;flex-wrap:wrap;margin-top:.85rem}.roof-bay-code-derived-v10__facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem}.roof-bay-code-derived-v10__fact{padding:.7rem;border:1px solid var(--border);border-radius:10px;min-width:0}.roof-bay-code-derived-v10__fact small{display:block;color:var(--muted);font-size:.82rem}.roof-bay-code-derived-v10__fact strong{display:block;margin-top:.2rem;overflow-wrap:anywhere}.roof-bay-code-derived-v10__active{font-weight:950;color:#8bdc9a}.roof-bay-code-derived-v10__pending{font-weight:950;color:#ffd36a}.roof-bay-code-derived-v10__blocked{font-weight:950;color:#ff9d9d}.roof-bay-code-derived-v10__error{margin-top:.75rem;padding:.75rem;border:1px solid #ff7777;border-radius:10px;color:#ff9d9d;font-weight:800;line-height:1.45}.roof-bay-code-derived-v10__boundary{margin-top:.85rem;padding:.85rem;border:1px solid var(--border);border-radius:10px;font:700 .88rem/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.roof-bay-code-derived-v10__result{font-size:1.12rem;font-weight:950}
    html[data-ft-theme="paper-matte"] .roof-bay-code-derived-v10__card{background:#fffaf1;color:#172127}html[data-ft-theme="paper-matte"] .roof-bay-code-derived-v10__active{color:#276738}html[data-ft-theme="paper-matte"] .roof-bay-code-derived-v10__pending{color:#8a5a12}html[data-ft-theme="paper-matte"] .roof-bay-code-derived-v10__blocked,html[data-ft-theme="paper-matte"] .roof-bay-code-derived-v10__error{color:#8f2222}@media(max-width:980px){.roof-bay-code-derived-v10__grid{grid-template-columns:1fr}}@media(max-width:680px){.roof-bay-code-derived-v10__facts{grid-template-columns:1fr}}@media print{.roof-bay-code-derived-v10__actions,.roof-bay-code-derived-v10__input-only{display:none!important}.roof-bay-code-derived-v10{break-inside:avoid}}
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
  const contextPanel = root.querySelector('.roof-bay-pressure-context-v9');
  const anchor = contextPanel ?? root.querySelector('.roof-bay-results');

  if (anchor) {
    const panel = document.createElement('section');
    panel.className = 'panel roof-bay-code-derived-v10';
    panel.setAttribute('aria-label', 'M3 controlled code-derived Roof Bay activation');
    panel.innerHTML = `
      <div class="panel-heading"><div><p class="eyebrow">M3.10 · controlled activation</p><h2>Verified code-derived demand</h2></div><span class="status-pill roof-bay-code-derived-v10__pending" data-rb-cda-status>CODE-DERIVED · MANUAL FALLBACK ACTIVE</span></div>
      <p class="roof-bay-code-derived-v10__lead">Load a verified PR #133 strength-combination assembly record, then select one <strong>complete</strong> case. The activation bridge checks the exact accepted pressure context, Roof Bay span/slope, purlin stations, D and Lr before displaying that case as active. The existing manual-uniform M2 solver stays intact as a fallback; this UI does not recalculate wind pressure or combinations.</p>
      <div class="roof-bay-code-derived-v10__grid">
        <article class="roof-bay-code-derived-v10__card roof-bay-code-derived-v10__input-only">
          <h3>Verified assembly record</h3>
          <div class="roof-bay-code-derived-v10__form">
            <label><span>Paste <code>futoltech.wind-roof-strength-combination-assembly/1</code> JSON</span><textarea data-rb-cda-json placeholder="Paste verified PR #133 assembly JSON here"></textarea></label>
            <button class="button button--ghost" type="button" data-rb-cda-load>LOAD + VALIDATE ASSEMBLY</button>
            <label><span>Complete combination case</span><select data-rb-cda-case disabled><option value="">Load a verified assembly first</option></select></label>
            <label class="roof-bay-code-derived-v10__check"><input data-rb-cda-selfweight-confirm type="checkbox" /><span>I confirm the imported PR #132 purlin self-weight basis matches the active Roof Bay C-purlin section.</span></label>
            <label><span>Self-weight / section compatibility source</span><input data-rb-cda-selfweight-ref type="text" placeholder="Section calculation / catalog-property verification record" /></label>
            <label><span>Activation source / approval reference</span><input data-rb-cda-activation-ref type="text" placeholder="Engineer activation / review record" /></label>
            <label><span>Activation note · optional</span><input data-rb-cda-note type="text" placeholder="Project-specific note" /></label>
          </div>
          <div class="roof-bay-code-derived-v10__actions"><button class="button" type="button" data-rb-cda-activate disabled>ACTIVATE SELECTED COMPLETE CASE</button><button class="button button--ghost" type="button" data-rb-cda-manual>RETURN TO MANUAL FALLBACK</button><button class="button button--ghost" type="button" data-rb-cda-export disabled>EXPORT ACTIVATION JSON</button></div>
          <div class="roof-bay-code-derived-v10__error" data-rb-cda-error hidden></div>
        </article>
        <article class="roof-bay-code-derived-v10__card">
          <h3>Active demand state</h3>
          <div class="roof-bay-code-derived-v10__facts">
            <div class="roof-bay-code-derived-v10__fact"><small>Assembly record</small><strong data-rb-cda-record>NOT LOADED</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Demand model</small><strong data-rb-cda-mode>MANUAL-UNIFORM FALLBACK</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Selected case</small><strong data-rb-cda-selected>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Wind direction</small><strong data-rb-cda-direction>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Lr/R state</small><strong data-rb-cda-lrr>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Equilibrium</small><strong data-rb-cda-equilibrium>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Roof-normal force</small><strong class="roof-bay-code-derived-v10__result" data-rb-cda-normal>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Down-slope force</small><strong class="roof-bay-code-derived-v10__result" data-rb-cda-parallel>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Rafter A normal</small><strong data-rb-cda-ra>—</strong></div>
            <div class="roof-bay-code-derived-v10__fact"><small>Rafter B normal</small><strong data-rb-cda-rb>—</strong></div>
          </div>
          <div class="roof-bay-code-derived-v10__boundary" data-rb-cda-boundary>MANUAL FALLBACK ACTIVE · load and validate a complete PR #133 assembly record. Blocked/incomplete cases cannot be activated. No member-capacity claim is made.</div>
        </article>
      </div>`;
    anchor.insertAdjacentElement('afterend', panel);

    const field = (name) => panel.querySelector(`[data-rb-cda-${name}]`);
    const ui = {
      json:field('json'), load:field('load'), caseSelect:field('case'), selfWeightConfirm:field('selfweight-confirm'), selfWeightRef:field('selfweight-ref'), activationRef:field('activation-ref'), note:field('note'), activate:field('activate'), manual:field('manual'), export:field('export'), error:field('error'), status:field('status'), record:field('record'), mode:field('mode'), selected:field('selected'), direction:field('direction'), lrr:field('lrr'), equilibrium:field('equilibrium'), normal:field('normal'), parallel:field('parallel'), ra:field('ra'), rb:field('rb'), boundary:field('boundary')
    };

    let loadedAssembly = null;
    let activeRecord = null;

    function baseProject() {
      const bridge = window.__FT_ROOF_BAY_PRESSURE_CONTEXT_PROJECT_EXPORT__;
      if (!bridge?.buildProject) throw new Error('Accept the M3 pressure context before code-derived activation.');
      const project = bridge.buildProject();
      if (!project) throw new Error('Current Roof Bay project is not ready for code-derived activation.');
      if (project.codeDerivedActivation) delete project.codeDerivedActivation;
      return project;
    }

    function completeCases(record) {
      return record.cases.filter((item) => item.fullCombinationResult != null && item.status === 'COMPLETE_STRENGTH_COMBINATION_ACTION_RESULT' && item.equilibrium?.pass === true);
    }

    function setPublicState(reason = null) {
      window.__FT_ROOF_BAY_CODE_DERIVED_UI__ = {
        mounted:true,
        assemblyLoaded:Boolean(loadedAssembly),
        active:Boolean(activeRecord),
        activeDemandModel:activeRecord?.activeDemandModel ?? 'manual-uniform',
        manualFallbackRetained:true,
        selectedCombinationCaseId:activeRecord?.selectedCombinationCaseId ?? null,
        completeCaseCount:loadedAssembly ? completeCases(loadedAssembly).length : 0,
        reason
      };
      window.__FT_ROOF_BAY_ACTIVE_DEMAND_MODE__ = activeRecord
        ? { mode:'code-derived-strength-combination', selectedCombinationCaseId:activeRecord.selectedCombinationCaseId }
        : { mode:'manual-uniform', selectedCombinationCaseId:null };
    }

    function renderActive(reason = null) {
      if (!activeRecord) {
        ui.status.textContent = 'CODE-DERIVED · MANUAL FALLBACK ACTIVE';
        ui.status.classList.remove('roof-bay-code-derived-v10__active','roof-bay-code-derived-v10__blocked');
        ui.status.classList.add('roof-bay-code-derived-v10__pending');
        ui.mode.textContent = 'MANUAL-UNIFORM FALLBACK';
        ui.selected.textContent = '—'; ui.direction.textContent = '—'; ui.lrr.textContent = '—'; ui.equilibrium.textContent = '—'; ui.normal.textContent = '—'; ui.parallel.textContent = '—'; ui.ra.textContent = '—'; ui.rb.textContent = '—';
        ui.boundary.textContent = reason
          ? `ACTIVATION INVALIDATED · ${reason} Manual-uniform fallback remains active.`
          : 'MANUAL FALLBACK ACTIVE · load and validate a complete PR #133 assembly record. Blocked/incomplete cases cannot be activated. No member-capacity claim is made.';
        ui.export.disabled = true;
        setPublicState(reason);
        return;
      }
      const display = activeRecord.displayResult;
      const result = display.fullCombinationResult;
      ui.status.textContent = 'CODE-DERIVED · COMPLETE CASE ACTIVE';
      ui.status.classList.remove('roof-bay-code-derived-v10__pending','roof-bay-code-derived-v10__blocked');
      ui.status.classList.add('roof-bay-code-derived-v10__active');
      ui.mode.textContent = 'CODE-DERIVED STRENGTH COMBINATION';
      ui.selected.textContent = `${display.templateId} · ${activeRecord.selectedCombinationCaseId}`;
      ui.direction.textContent = `${display.windDirection} · ${display.windCaseId}`;
      ui.lrr.textContent = display.selectedLrOrRAction ?? 'not required for this template';
      ui.equilibrium.textContent = display.equilibrium?.pass ? 'PASS · force + moment conserved' : 'CHECK';
      ui.normal.textContent = `${compact(result.roofNormalForceKN,6)} kN`;
      ui.parallel.textContent = `${compact(result.roofDownslopeForceKN,6)} kN`;
      ui.ra.textContent = `${compact(result.rafterANormalReactionKN,6)} kN`;
      ui.rb.textContent = `${compact(result.rafterBNormalReactionKN,6)} kN`;
      ui.boundary.textContent = 'ACTIVE VERIFIED ACTION RESULT · the displayed values are taken directly from the selected complete PR #133 case. Manual-uniform M2 remains stored as fallback. Piecewise purlin stress/deflection and capacity are still UNRESOLVED.';
      ui.export.disabled = false;
      setPublicState();
    }

    function invalidate(reason = 'Active Roof Bay/project inputs changed.') {
      activeRecord = null;
      window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__ = null;
      renderActive(reason);
    }

    function loadRecord(record) {
      validateWindRoofStrengthCombinationAssembly(record);
      loadedAssembly = JSON.parse(JSON.stringify(record));
      const complete = completeCases(loadedAssembly);
      ui.caseSelect.innerHTML = '';
      if (!complete.length) {
        ui.caseSelect.innerHTML = '<option value="">No complete cases available</option>';
        ui.caseSelect.disabled = true;
        ui.activate.disabled = true;
        ui.record.textContent = `${record.status} · 0 complete cases`;
      } else {
        complete.forEach((item) => {
          const option = document.createElement('option');
          option.value = item.combinationCaseId;
          option.textContent = `${item.templateId} · ${item.windDirection} · ${item.selectedLrOrRAction ?? 'no Lr/R term'}`;
          ui.caseSelect.appendChild(option);
        });
        ui.caseSelect.disabled = false;
        ui.activate.disabled = false;
        ui.record.textContent = `${record.status} · ${complete.length}/${record.cases.length} complete cases`;
      }
      ui.error.hidden = true;
      ui.error.textContent = '';
      invalidate('A verified assembly was loaded; activate a compatible complete case to leave manual fallback.');
      return complete.length;
    }

    function loadFromText() {
      try {
        const record = parseWindRoofStrengthCombinationAssembly(ui.json.value);
        loadRecord(record);
      } catch (error) {
        loadedAssembly = null;
        ui.caseSelect.innerHTML = '<option value="">Invalid / unavailable assembly</option>';
        ui.caseSelect.disabled = true;
        ui.activate.disabled = true;
        ui.record.textContent = 'INVALID / NOT LOADED';
        invalidate('Assembly load failed.');
        ui.error.hidden = false;
        ui.error.textContent = error instanceof Error ? error.message : String(error);
      }
    }

    function activate() {
      try {
        if (!loadedAssembly) throw new Error('Load and validate a PR #133 strength assembly first.');
        const project = baseProject();
        const record = resolveRoofBayCodeDerivedActivation({
          roofBayProject:project,
          windRoofStrengthCombinationAssembly:loadedAssembly,
          selectedCombinationCaseId:ui.caseSelect.value,
          engineerConfirmedPurlinSelfWeightMatchesProjectSection:ui.selfWeightConfirm.checked,
          purlinSelfWeightCompatibilitySourceReference:ui.selfWeightRef.value,
          activationSourceReference:ui.activationRef.value,
          note:ui.note.value.trim() || null
        });
        activeRecord = record;
        window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__ = record;
        ui.error.hidden = true;
        ui.error.textContent = '';
        renderActive();
        window.dispatchEvent(new CustomEvent('ft-roof-bay-code-derived-activated', { detail:{ record } }));
      } catch (error) {
        invalidate('Compatibility/acceptance gate did not pass.');
        ui.error.hidden = false;
        ui.error.textContent = error instanceof Error ? error.message : String(error);
      }
    }

    ui.load.addEventListener('click', loadFromText);
    ui.activate.addEventListener('click', activate);
    ui.manual.addEventListener('click', () => invalidate('Engineer returned the page to manual-uniform fallback.'));
    ui.export.addEventListener('click', () => {
      if (!activeRecord) return;
      download(serializeRoofBayCodeDerivedActivation(activeRecord), `futoltech-roof-bay-code-derived-activation-${Date.now()}.json`);
    });
    panel.addEventListener('input', (event) => {
      if (event.target === ui.json) return;
      if (activeRecord) invalidate('Activation controls changed after acceptance.');
    });
    panel.addEventListener('change', () => { if (activeRecord) invalidate('Activation controls changed after acceptance.'); });

    root.addEventListener('input', (event) => {
      if (panel.contains(event.target)) return;
      if (activeRecord) invalidate('Active Roof Bay/project inputs changed.');
    });
    root.addEventListener('change', (event) => {
      if (panel.contains(event.target)) return;
      if (activeRecord) invalidate('Active Roof Bay/project inputs changed.');
    });
    window.addEventListener('ft-wind-project-input-accepted', () => { if (activeRecord) invalidate('Accepted wind-input record changed.'); });
    window.addEventListener('ft-wind-pressure-context-accepted', () => { if (activeRecord) invalidate('Accepted pressure-context record changed.'); });

    window.__FT_ROOF_BAY_CODE_DERIVED_API__ = {
      mounted:true,
      loadRecord,
      activateRecord(record, options = {}) {
        loadRecord(record);
        if (options.selectedCombinationCaseId) ui.caseSelect.value = options.selectedCombinationCaseId;
        ui.selfWeightConfirm.checked = options.engineerConfirmedPurlinSelfWeightMatchesProjectSection === true;
        ui.selfWeightRef.value = options.purlinSelfWeightCompatibilitySourceReference ?? '';
        ui.activationRef.value = options.activationSourceReference ?? '';
        ui.note.value = options.note ?? '';
        activate();
        return window.__FT_ROOF_BAY_CODE_DERIVED_ACTIVATION__;
      },
      invalidate
    };

    ui.record.textContent = 'NOT LOADED';
    renderActive();
  }
}