function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function activeMemberLabels() {
  const cards = [...document.querySelectorAll('.compare-shell #compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  return cards.map((card, index) => {
    const angle = card.querySelector('[data-c-purlin-orientation-display]')?.value ?? '—';
    return `Member ${String.fromCharCode(65 + index)} · ${angle}°`;
  });
}

function assemblySvg() {
  return `
  <svg viewBox="0 0 1040 225" role="img" aria-labelledby="cpAssemblyTitle cpAssemblyDesc">
    <title id="cpAssemblyTitle">Actual roof assembly context used beside the C-purlin physics benchmark</title>
    <desc id="cpAssemblyDesc">Roof sheet above a C-purlin with tek screw connection, C-purlin welded to two rafters, and a center point load. The connection details are visual context and not credited as fixed-end restraint in the current benchmark solver.</desc>
    <defs>
      <marker id="cpLoadArrow" viewBox="0 0 10 10" refX="5" refY="8" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 0 L 5 10 z" fill="currentColor"/></marker>
      <pattern id="cpSheetPattern" width="30" height="10" patternUnits="userSpaceOnUse"><path d="M0 7 Q7 1 15 7 T30 7" fill="none" stroke="currentColor" stroke-width="2"/></pattern>
    </defs>

    <g class="cp-assembly-sheet">
      <rect x="115" y="40" width="810" height="25" rx="5" fill="url(#cpSheetPattern)"/>
      <text x="520" y="27" text-anchor="middle">ROOF SHEET · tek-screwed to C-purlin</text>
    </g>

    <g class="cp-assembly-load">
      <line x1="520" y1="5" x2="520" y2="93" marker-end="url(#cpLoadArrow)"/>
      <text x="540" y="85">shared center point load</text>
    </g>

    <g class="cp-assembly-screws">
      <circle cx="400" cy="58" r="6"/><circle cx="520" cy="58" r="6"/><circle cx="640" cy="58" r="6"/>
      <line x1="520" y1="58" x2="520" y2="102"/>
      <text x="656" y="63">tek screws</text>
    </g>

    <g class="cp-assembly-purlin">
      <path d="M170 106 H870"/>
      <path d="M305 95 v22 h-18 M305 95 h32 v13 h-11"/>
      <text x="520" y="130" text-anchor="middle">C-PURLIN · orientation is member-specific</text>
    </g>

    <g class="cp-assembly-rafters">
      <path d="M165 112 L130 202 H195 L175 112 Z"/>
      <path d="M865 112 L845 202 H910 L875 112 Z"/>
      <text x="162" y="220" text-anchor="middle">rafter</text>
      <text x="878" y="220" text-anchor="middle">rafter</text>
    </g>

    <g class="cp-assembly-welds">
      <path d="M174 108 l16 16 h-16 z"/><path d="M866 108 l-16 16 h16 z"/>
      <text x="214" y="166">welded to rafter</text>
      <text x="826" y="166" text-anchor="end">welded to rafter</text>
    </g>

    <g class="cp-assembly-span">
      <line x1="175" y1="188" x2="870" y2="188"/>
      <path d="M175 181 v14 M870 181 v14"/>
      <text x="520" y="210" text-anchor="middle">shared rafter spacing / purlin span</text>
    </g>
  </svg>`;
}

function ensureStyles() {
  if (document.getElementById('ft-cp-assembly-visual-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-cp-assembly-visual-style';
  style.textContent = `
    .cp-assembly-context { margin:.75rem 0; border:1px solid rgba(132,164,177,.28); border-radius:12px; padding:.7rem .8rem; background:rgba(3,15,22,.58); }
    .cp-assembly-context__head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; margin-bottom:.4rem; }
    .cp-assembly-context__head h4 { margin:.1rem 0; }
    .cp-assembly-context__members { font-size:.86rem; opacity:.82; }
    .cp-assembly-context svg { width:100%; height:auto; display:block; color:#dce8eb; }
    .cp-assembly-context svg text { fill:#b9cbd1; font:600 15px system-ui,sans-serif; }
    .cp-assembly-context .cp-assembly-sheet { color:#8fb8c8; }
    .cp-assembly-context .cp-assembly-load { color:#ffd65c; stroke:#ffd65c; stroke-width:5; }
    .cp-assembly-context .cp-assembly-load text { fill:#ffe08a; }
    .cp-assembly-context .cp-assembly-screws { fill:#ffe08a; stroke:#ffe08a; stroke-width:2; }
    .cp-assembly-context .cp-assembly-screws text { fill:#d8e6ea; }
    .cp-assembly-context .cp-assembly-purlin { fill:none; stroke:#63e0c6; stroke-width:8; stroke-linecap:round; stroke-linejoin:round; }
    .cp-assembly-context .cp-assembly-purlin text { fill:#9debdc; stroke:none; }
    .cp-assembly-context .cp-assembly-rafters { fill:rgba(125,147,157,.16); stroke:#96aeb8; stroke-width:3; }
    .cp-assembly-context .cp-assembly-rafters text { fill:#9eb1ba; stroke:none; }
    .cp-assembly-context .cp-assembly-welds { fill:#ff9f72; stroke:#ff9f72; stroke-width:2; }
    .cp-assembly-context .cp-assembly-welds text { fill:#ffc3a7; stroke:none; }
    .cp-assembly-context .cp-assembly-span { fill:none; stroke:#8299a4; stroke-width:2; }
    .cp-assembly-context .cp-assembly-span text { fill:#a9bbc2; stroke:none; }
    .cp-assembly-context__boundary { margin:.35rem 0 0; font-size:.84rem; opacity:.8; }
    @media print { .cp-assembly-context { display:none !important; } }
  `;
  document.head.appendChild(style);
}

function updateMemberText(root) {
  const labels = activeMemberLabels();
  const output = root.querySelector('[data-cp-assembly-members]');
  if (output) output.textContent = labels.length ? labels.join(' · ') : 'No active C-purlin specimens';
}

export function ensureCPurlinAssemblyVisual() {
  const bench = document.querySelector('[data-c-purlin-physics-bench]');
  if (!bench || bench.querySelector('[data-cp-assembly-context]')) return;
  ensureStyles();
  const block = document.createElement('section');
  block.className = 'cp-assembly-context';
  block.dataset.cpAssemblyContext = 'true';
  block.innerHTML = `
    <div class="cp-assembly-context__head">
      <div><p class="eyebrow">REAL ROOF ASSEMBLY CONTEXT</p><h4>What is physically connected in the roof</h4></div>
      <div class="cp-assembly-context__members" data-cp-assembly-members></div>
    </div>
    ${assemblySvg()}
    <p class="cp-assembly-context__boundary"><strong>Important:</strong> the welds and tek screws are shown because they exist in the real assembly. The current controlled benchmark still uses idealized simple supports so connection restraint does not artificially improve the orientation comparison.</p>`;
  const canvas = bench.querySelector('[data-cpy-canvas]');
  canvas?.insertAdjacentElement('beforebegin', block);
  updateMemberText(block);

  const selectors = document.querySelector('.compare-shell #compareSelectors');
  if (selectors) {
    const observer = new MutationObserver(() => updateMemberText(block));
    observer.observe(selectors, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    selectors.addEventListener('change', () => queueMicrotask(() => updateMemberText(block)));
  }
}

ensureCPurlinAssemblyVisual();
