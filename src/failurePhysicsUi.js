import { failurePhysicsStateForEvent, failureVisualDefinition } from './solver/failurePhysicsState.js';

const loadInput = document.getElementById('loadInput');
const beamModeButton = document.getElementById('beamModeButton');
const diagramWrap = document.querySelector('.diagram-wrap');
const resultCards = document.getElementById('resultCards');
if (!loadInput || !beamModeButton || !diagramWrap || !resultCards) throw new Error('Failure Physics v1 cannot find the Materials Lab anchors.');

function ensureStyle() {
  if (document.getElementById('failurePhysicsStyle')) return;
  const style = document.createElement('style');
  style.id = 'failurePhysicsStyle';
  style.textContent = `
    .failure-physics-panel{margin:14px 0;border:1px solid rgba(92,219,195,.34);border-radius:14px;background:rgba(8,30,38,.72);overflow:hidden}.failure-physics-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid rgba(92,219,195,.18)}.failure-physics-head p{margin:0}.failure-physics-head strong{display:block;font-size:1rem}.failure-physics-state{font-weight:900;letter-spacing:.05em}.failure-physics-body{display:grid;grid-template-columns:minmax(280px,.85fr) minmax(300px,1.15fr);gap:12px;padding:12px}.failure-physics-copy{display:grid;gap:8px;align-content:start}.failure-physics-copy p{margin:0;line-height:1.45}.failure-physics-boundary{padding:8px 10px;border-left:3px solid #f5bd55;background:rgba(245,189,85,.07);color:var(--muted)}.failure-physics-visual{border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#07161d;padding:8px}.failure-physics-visual svg{display:block;width:100%;height:auto}.fp-member{fill:none;stroke:#62e0c7;stroke-width:7;stroke-linecap:round}.fp-reference{stroke:#f5bd55;stroke-width:3;stroke-dasharray:8 6}.fp-yield-zone{fill:#f5bd55;opacity:.85}.fp-compression-zone{fill:#f5bd55;opacity:.24}.fp-support{fill:#9db1b7}.fp-text{fill:#dbe9ec;font-size:15px}.fp-title{fill:#62e0c7;font-size:16px;font-weight:800}.fp-warning{fill:#f5bd55;font-size:13px}.failure-physics-modes{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.failure-physics-modes span{border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:3px 7px;color:var(--muted);font-size:.72rem}.failure-physics-modes .is-supported{border-color:rgba(92,219,195,.4);color:#62e0c7}@media(max-width:860px){.failure-physics-body{grid-template-columns:1fr}}@media print{.failure-physics-panel{break-inside:avoid;background:#fff;color:#111}.failure-physics-visual{background:#fff}.fp-text{fill:#111}.fp-support{fill:#555}}
  `;
  document.head.appendChild(style);
}

function mount() {
  let panel = document.getElementById('failurePhysicsPanel');
  if (panel) return panel;
  ensureStyle();
  panel = document.createElement('section');
  panel.id = 'failurePhysicsPanel';
  panel.className = 'failure-physics-panel';
  panel.innerHTML = `
    <div class="failure-physics-head"><div><p class="eyebrow">FAILURE PHYSICS v1 · event-linked interpretation</p><strong>What physical threshold has actually been reached?</strong></div><span class="failure-physics-state" data-fp-state>ELASTIC RESPONSE</span></div>
    <div class="failure-physics-body">
      <div class="failure-physics-copy"><p data-fp-meaning></p><p class="failure-physics-boundary" data-fp-boundary></p><div class="failure-physics-modes"><span class="is-supported">serviceability</span><span class="is-supported">first yield</span><span class="is-supported">published rupture reference</span><span class="is-supported">global column limit</span><span>local buckling · pending</span><span>LTB · pending</span><span>timber splitting/shear · pending</span><span>connection fracture · pending</span></div></div>
      <div class="failure-physics-visual" data-fp-visual></div>
    </div>`;
  diagramWrap.insertAdjacentElement('afterend', panel);
  return panel;
}

function currentCrossedEventId() {
  const crossed = [...document.querySelectorAll('.failure-ramp-event.is-crossed')];
  return crossed.at(-1)?.dataset.eventId ?? null;
}

function svgFor(state, mode) {
  const visual = failureVisualDefinition(state, { mode });
  if (visual.kind.startsWith('column-')) {
    const modeCopy = visual.kind === 'column-mode'
      ? '<text x="220" y="100" class="fp-text">straight reference axis</text><text x="220" y="128" class="fp-text">schematic instability mode</text>'
      : '<text x="220" y="100" class="fp-text">straight member axis</text><text x="220" y="128" class="fp-text">no instability event crossed</text>';
    const compressionCue = visual.kind === 'column-compression-reference'
      ? '<rect x="148" y="116" width="24" height="90" rx="5" class="fp-compression-zone"/><text x="220" y="156" class="fp-warning">compression reference reached</text>'
      : '';
    return `<svg viewBox="0 0 480 300" role="img" aria-label="Column failure physics event schematic"><text x="22" y="28" class="fp-title">${visual.title}</text><line x1="160" y1="65" x2="160" y2="255" class="fp-reference"/><path d="${visual.path}" class="fp-member"/><rect x="126" y="255" width="68" height="12" class="fp-support"/><polygon points="145,65 175,65 160,48" class="fp-support"/>${compressionCue}${modeCopy}<text x="22" y="286" class="fp-warning">${visual.disclaimer}</text></svg>`;
  }
  const marker = visual.kind === 'beam-yield'
    ? '<rect x="232" y="194" width="16" height="10" rx="3" class="fp-yield-zone"/><text x="260" y="204" class="fp-warning">extreme-fibre yield onset</text>'
    : visual.kind === 'beam-rupture-reference'
      ? '<line x1="240" y1="145" x2="240" y2="222" class="fp-reference"/><text x="255" y="216" class="fp-warning">reference plane only</text>'
      : '';
  return `<svg viewBox="0 0 480 280" role="img" aria-label="Beam failure physics event schematic"><text x="22" y="28" class="fp-title">${visual.title}</text><line x1="80" y1="170" x2="400" y2="170" class="fp-reference"/><path d="${visual.path}" class="fp-member"/><polygon points="65,185 95,185 80,170" class="fp-support"/><circle cx="400" cy="185" r="8" class="fp-support"/><circle cx="400" cy="203" r="8" class="fp-support"/>${marker}<text x="22" y="258" class="fp-warning">${visual.disclaimer}</text></svg>`;
}

function render() {
  const panel = mount();
  const state = failurePhysicsStateForEvent(currentCrossedEventId());
  const mode = beamModeButton.classList.contains('is-active') ? 'beam' : 'column';
  const stateNode = panel.querySelector('[data-fp-state]');
  const meaning = panel.querySelector('[data-fp-meaning]');
  const boundary = panel.querySelector('[data-fp-boundary]');
  const visual = panel.querySelector('[data-fp-visual]');
  if (stateNode.textContent !== state.phase) stateNode.textContent = state.phase;
  if (meaning.textContent !== state.physicalMeaning) meaning.textContent = state.physicalMeaning;
  if (boundary.textContent !== state.boundary) boundary.textContent = state.boundary;
  const svg = svgFor(state, mode);
  if (visual.innerHTML !== svg) visual.innerHTML = svg;
  panel.dataset.failureMode = state.mode;
  panel.dataset.failureSeverity = state.severity;
}

let rampObserver = null;
function connectRampObserver() {
  const controls = document.getElementById('failureRampControls');
  if (!controls) return false;
  rampObserver?.disconnect();
  rampObserver = new MutationObserver(render);
  rampObserver.observe(controls, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  render();
  return true;
}

if (!connectRampObserver()) {
  const bootObserver = new MutationObserver(() => {
    if (connectRampObserver()) bootObserver.disconnect();
  });
  bootObserver.observe(document.body, { childList: true, subtree: true });
}
loadInput.addEventListener('input', () => queueMicrotask(render));
beamModeButton.addEventListener('click', () => queueMicrotask(render));
document.getElementById('columnModeButton')?.addEventListener('click', () => queueMicrotask(render));
render();
