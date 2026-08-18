const loadInput = document.getElementById('loadInput');
const lengthInput = document.getElementById('lengthInput');
const beamModeButton = document.getElementById('beamModeButton');
const columnModeButton = document.getElementById('columnModeButton');
const resultCards = document.getElementById('resultCards');
const diagramWrap = document.querySelector('.diagram-wrap');
const magnificationSelect = document.getElementById('magnificationSelect');
if (!loadInput || !lengthInput || !beamModeButton || !columnModeButton || !resultCards || !diagramWrap) {
  throw new Error('SIM-VIZ-001 cannot find the Materials Lab anchors.');
}

function parseFirstNumber(text) {
  const match = String(text ?? '').replaceAll(',', '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function resultValue(label) {
  const card = [...resultCards.querySelectorAll('.result-card')]
    .find((candidate) => candidate.querySelector('span')?.textContent.trim() === label);
  return card ? parseFirstNumber(card.querySelector('strong')?.textContent) : null;
}

function isBeam() {
  return beamModeButton.classList.contains('is-active');
}

function crossedEvent() {
  return [...document.querySelectorAll('.failure-ramp-event.is-crossed')].at(-1) ?? null;
}

function currentPhase() {
  const panel = document.getElementById('failurePhysicsPanel');
  return {
    label: panel?.querySelector('[data-fp-state]')?.textContent?.trim() || 'ELASTIC RESPONSE',
    mode: panel?.dataset.failureMode || 'elastic'
  };
}

function ensureStyle() {
  if (document.getElementById('simulationPlaybackStyle')) return;
  const style = document.createElement('style');
  style.id = 'simulationPlaybackStyle';
  style.textContent = `
    .sim-playback{margin:14px 0;border:1px solid rgba(126,205,255,.34);border-radius:16px;background:linear-gradient(180deg,rgba(7,27,38,.96),rgba(5,20,29,.92));overflow:hidden}.sim-playback__head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid rgba(126,205,255,.16)}.sim-playback__head h3{margin:2px 0 0;font-size:1rem}.sim-playback__badge{border:1px solid rgba(126,205,255,.32);border-radius:999px;padding:5px 9px;color:#9edcff;font-size:.72rem;font-weight:800;letter-spacing:.04em}.sim-playback__body{display:grid;grid-template-columns:minmax(320px,1.25fr) minmax(260px,.75fr);gap:12px;padding:12px}.sim-stage{position:relative;min-height:230px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:radial-gradient(circle at 50% 10%,rgba(45,104,126,.16),transparent 48%),#06151d;overflow:hidden}.sim-stage svg{display:block;width:100%;height:auto}.sim-hud{position:absolute;left:10px;top:10px;display:grid;gap:3px;padding:7px 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(2,13,19,.82);font-size:.72rem;line-height:1.35}.sim-hud strong{font-size:.85rem}.sim-side{display:grid;align-content:start;gap:9px}.sim-control{display:grid;gap:5px}.sim-control label{font-size:.75rem;color:var(--muted)}.sim-control input{width:100%}.sim-readouts{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sim-readout{padding:8px 9px;border:1px solid rgba(255,255,255,.1);border-radius:9px;background:rgba(255,255,255,.025)}.sim-readout span{display:block;color:var(--muted);font-size:.69rem}.sim-readout strong{display:block;margin-top:2px;font-size:.88rem}.sim-note{margin:0;padding:8px 9px;border-left:3px solid #7ecfff;background:rgba(126,207,255,.06);color:var(--muted);font-size:.75rem;line-height:1.4}.sim-actions{display:flex;gap:7px;flex-wrap:wrap}.sim-member{fill:none;stroke:#62e0c7;stroke-width:8;stroke-linecap:round}.sim-reference{fill:none;stroke:#5c7781;stroke-width:2;stroke-dasharray:7 6}.sim-load{stroke:#ffd06a;stroke-width:4}.sim-support{fill:#a4b8be}.sim-event{fill:#ffd06a}.sim-event--critical{fill:#ff8f63}.sim-label{fill:#dcecf0;font-size:14px}.sim-small{fill:#9db3ba;font-size:11px}@media(max-width:900px){.sim-playback__body{grid-template-columns:1fr}}@media print{.sim-playback{display:none!important}}
  `;
  document.head.appendChild(style);
}

function mount() {
  let panel = document.getElementById('simulationPlaybackPanel');
  if (panel) return panel;
  ensureStyle();
  panel = document.createElement('section');
  panel.id = 'simulationPlaybackPanel';
  panel.className = 'sim-playback';
  panel.innerHTML = `
    <div class="sim-playback__head">
      <div><p class="eyebrow">PHASE 2 · SIM-VIZ-001</p><h3>Specimen Simulation Console</h3></div>
      <span class="sim-playback__badge">SOLVER-DRIVEN · QUASI-STATIC</span>
    </div>
    <div class="sim-playback__body">
      <div class="sim-stage" data-sim-stage></div>
      <div class="sim-side">
        <div class="sim-control"><label for="simLoadRate">Virtual loading rate, kN/s</label><input id="simLoadRate" type="number" min="0.0001" step="0.1" value="0.5" /></div>
        <div class="sim-readouts">
          <div class="sim-readout"><span>Virtual test time</span><strong data-sim-time>—</strong></div>
          <div class="sim-readout"><span>Current load</span><strong data-sim-load>—</strong></div>
          <div class="sim-readout"><span>Response</span><strong data-sim-response>—</strong></div>
          <div class="sim-readout"><span>Crossed event</span><strong data-sim-event>—</strong></div>
        </div>
        <div class="sim-actions"><button id="simPlayButton" type="button" class="button">PLAY SOLVER TEST ▶</button></div>
        <p class="sim-note">Virtual time = applied load ÷ the loading rate selected above for a monotonic quasi-static ramp from zero. It is not earthquake, impact, fatigue or other dynamic time integration.</p>
      </div>
    </div>`;
  const failure = document.getElementById('failurePhysicsPanel');
  (failure ?? diagramWrap).insertAdjacentElement('afterend', panel);
  return panel;
}

function formatResponse() {
  if (isBeam()) {
    const deflection = resultValue('Maximum deflection');
    const stress = resultValue('Maximum bending stress');
    const d = Number.isFinite(deflection) ? `${deflection.toFixed(2)} mm` : '—';
    const s = Number.isFinite(stress) ? `${stress.toFixed(1)} MPa` : '—';
    return `${d} · ${s}`;
  }
  const stress = resultValue('Maximum compression stress');
  const capacity = resultValue('Predicted governing capacity');
  const s = Number.isFinite(stress) ? `${stress.toFixed(1)} MPa` : '—';
  const c = Number.isFinite(capacity) ? `cap ${capacity.toFixed(2)} kN` : 'cap —';
  return `${s} · ${c}`;
}

function beamSvg(loadKN, deflectionMm, phase) {
  const spanMm = Math.max(1, Number(lengthInput.value) * 1000);
  const magnification = Number(magnificationSelect?.value || 1);
  const scaled = Number.isFinite(deflectionMm) ? Math.min(86, Math.abs(deflectionMm) / spanMm * 260 * Math.max(1, magnification)) : 0;
  const y = 150 + scaled;
  const critical = /YIELD|RUPTURE|LIMIT|FAIL/i.test(phase.label);
  return `<svg viewBox="0 0 620 250" role="img" aria-label="Solver-driven beam specimen playback"><line x1="90" y1="150" x2="530" y2="150" class="sim-reference"/><path d="M90 150 Q310 ${y} 530 150" class="sim-member"/><polygon points="74,168 106,168 90,150" class="sim-support"/><circle cx="530" cy="168" r="8" class="sim-support"/><circle cx="530" cy="188" r="8" class="sim-support"/><line x1="310" y1="52" x2="310" y2="120" class="sim-load"/><polygon points="298,112 322,112 310,128" class="sim-event${critical ? ' sim-event--critical' : ''}"/><text x="328" y="74" class="sim-label">${loadKN.toFixed(3)} kN</text><text x="22" y="226" class="sim-small">Displayed deformation follows current solver deflection × selected display magnification.</text></svg>`;
}

function columnSvg(loadKN, phase) {
  const instability = /column-global-instability|column-governing-limit/i.test(phase.mode) || /INSTABILITY|BUCKLING/i.test(phase.label);
  const path = instability ? 'M310 205 C250 160 370 110 310 55' : 'M310 205 L310 55';
  return `<svg viewBox="0 0 620 250" role="img" aria-label="Solver-driven column specimen playback"><line x1="310" y1="48" x2="310" y2="210" class="sim-reference"/><path d="${path}" class="sim-member"/><rect x="270" y="205" width="80" height="12" class="sim-support"/><line x1="310" y1="18" x2="310" y2="42" class="sim-load"/><polygon points="298,34 322,34 310,50" class="sim-event${instability ? ' sim-event--critical' : ''}"/><text x="336" y="36" class="sim-label">${loadKN.toFixed(3)} kN</text><text x="22" y="226" class="sim-small">Column remains straight until an implemented stored instability event is crossed.</text></svg>`;
}

function render() {
  const panel = mount();
  const rateInput = panel.querySelector('#simLoadRate');
  const rate = Math.max(0.0001, Number(rateInput.value) || 0.5);
  const loadKN = Math.max(0, Number(loadInput.value) || 0);
  const phase = currentPhase();
  const event = crossedEvent();
  const deflection = resultValue('Maximum deflection');
  panel.querySelector('[data-sim-time]').textContent = `${(loadKN / rate).toFixed(2)} s`;
  panel.querySelector('[data-sim-load]').textContent = `${loadKN.toFixed(3)} kN`;
  panel.querySelector('[data-sim-response]').textContent = formatResponse();
  panel.querySelector('[data-sim-event]').textContent = event?.querySelector('span')?.textContent?.trim() || phase.label;
  panel.querySelector('[data-sim-stage]').innerHTML = isBeam() ? beamSvg(loadKN, deflection, phase) : columnSvg(loadKN, phase);
  panel.dataset.simulationMode = isBeam() ? 'beam' : 'column';
  panel.dataset.simulationPhase = phase.mode;
}

const panel = mount();
panel.querySelector('#simLoadRate').addEventListener('input', render);
panel.querySelector('#simPlayButton').addEventListener('click', () => {
  const ramp = document.getElementById('failureRampButton');
  if (!ramp || ramp.disabled) return;
  ramp.click();
});

loadInput.addEventListener('input', () => queueMicrotask(render));
beamModeButton.addEventListener('click', () => queueMicrotask(render));
columnModeButton.addEventListener('click', () => queueMicrotask(render));
magnificationSelect?.addEventListener('change', () => queueMicrotask(render));

const observer = new MutationObserver(() => queueMicrotask(render));
observer.observe(resultCards, { childList: true, subtree: true, characterData: true });
const rampControls = document.getElementById('failureRampControls');
if (rampControls) observer.observe(rampControls, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
const failurePanel = document.getElementById('failurePhysicsPanel');
if (failurePanel) observer.observe(failurePanel, { childList: true, subtree: true, characterData: true, attributes: true });

render();
