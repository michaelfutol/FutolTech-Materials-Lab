function activeMemberSummaries() {
  return [...document.querySelectorAll('.compare-shell #compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'))
    .map((card, index) => {
      const preset = card.querySelector('[data-slot-preset]')?.selectedOptions?.[0]?.textContent?.trim() || '—';
      const angle = card.querySelector('[data-c-purlin-orientation-display]')?.value
        ?? (card.querySelector('[data-slot-orientation]')?.value === 'rotated' ? '90' : '0');
      const material = card.querySelector('[data-slot-material]')?.selectedOptions?.[0]?.textContent?.trim() || '—';
      return `Member ${String.fromCharCode(65 + index)} · ${angle}° · ${preset} · ${material}`;
    });
}

function compact(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function injectStyles() {
  if (document.getElementById('ft-cp-test-basis-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-cp-test-basis-style';
  style.textContent = `
    .ft-cp-test-basis { margin:.8rem 0; padding:.85rem; border:1px solid var(--border); border-radius:12px; background:rgba(82,214,181,.035); }
    .ft-cp-test-basis__grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.7rem; }
    .ft-cp-test-basis h4 { margin:.1rem 0 .45rem; font-size:.93rem; }
    .ft-cp-test-basis p, .ft-cp-test-basis li { font-size:.78rem; line-height:1.45; }
    .ft-cp-test-basis ul, .ft-cp-test-basis ol { margin:.35rem 0 0; padding-left:1.15rem; }
    .ft-cp-test-basis code { white-space:normal; color:var(--accent); font-weight:700; }
    .ft-cp-test-basis__members { margin-top:.55rem; padding-top:.55rem; border-top:1px dashed var(--border); }
    .ft-cp-test-basis__members span { display:block; font-size:.76rem; margin:.18rem 0; }
    @media (max-width:980px) { .ft-cp-test-basis__grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);
}

function render(panel, basis) {
  const span = Number(panel.querySelector('[data-cpy-span-number]')?.value) || 2;
  const slope = Number(panel.querySelector('[data-cpy-slope-number]')?.value) || 0;
  const members = activeMemberSummaries();
  basis.innerHTML = `
    <p class="eyebrow">Test parameters · assumptions · equation basis</p>
    <div class="ft-cp-test-basis__grid">
      <section>
        <h4>Shared test parameters</h4>
        <ul>
          <li>Rafter spacing / C-purlin span: <strong>${compact(span,2)} m</strong></li>
          <li>Roof slope: <strong>${compact(slope,1)}°</strong></li>
          <li>Load: one global vertical point load at <strong>L/2</strong>, displayed in kgf and solved internally in kN</li>
          <li>Boundary idealization: <strong>simple support benchmark</strong></li>
        </ul>
        <div class="ft-cp-test-basis__members">${members.map((item) => `<span>${item}</span>`).join('')}</div>
      </section>
      <section>
        <h4>Physical assembly vs model</h4>
        <p>Actual roof context: roof sheet is fastened to the C-purlin with tek screws and the C-purlin is welded to rafters. This benchmark does <strong>not</strong> credit those connections as perfect fixed-end restraint. Their stiffness, slip, local deformation and roof-sheet restraint belong to the later calibrated connection/system layer.</p>
        <p>Current result is gross-section elastic screening to first yield for each specimen; local/distortional/LTB, effective width, post-yield plasticity, connection fracture and diaphragm action are outside this layer.</p>
      </section>
      <section>
        <h4>Equation basis & references</h4>
        <p><code>Mmax = PL/4</code>, <code>σ = M/Z</code>, and <code>δmax = PL³/(48EI)</code> are the standard Euler–Bernoulli simply-supported center-point-load relations used for the flat benchmark. For a sloped roof, the one vertical load is resolved as <code>P⊥ = P cosθ</code> and <code>P∥ = P sinθ</code>, then the two gross elastic axis responses are combined by the current screening model.</p>
        <ol>
          <li>Roark’s <em>Formulas for Stress and Strain</em> — simply supported beam load/deflection cases.</li>
          <li>Gere & Goodno, <em>Mechanics of Materials</em> — elastic flexure formula and Euler–Bernoulli beam relations.</li>
          <li>BIPM SI Brochure — standard gravity basis for kgf conversion, g₀ = 9.80665 m/s².</li>
          <li>Section geometry/properties: the selected PH catalog/source dataset shown in each member record.</li>
        </ol>
      </section>
    </div>`;
}

function mount() {
  const panel = document.querySelector('[data-c-purlin-physics-bench]');
  if (!panel || panel.querySelector('[data-ft-cp-test-basis]')) return;
  injectStyles();
  const basis = document.createElement('section');
  basis.className = 'ft-cp-test-basis';
  basis.dataset.ftCpTestBasis = 'true';
  const canvas = panel.querySelector('[data-cpy-canvas]');
  canvas?.insertAdjacentElement('beforebegin', basis);
  const update = () => render(panel, basis);
  panel.addEventListener('input', update);
  panel.addEventListener('change', update);
  document.querySelector('.compare-shell #compareSelectors')?.addEventListener('change', () => queueMicrotask(update));
  const observer = new MutationObserver(() => queueMicrotask(update));
  const selectors = document.querySelector('.compare-shell #compareSelectors');
  if (selectors) observer.observe(selectors, { childList:true, subtree:true });
  update();
}

mount();
