function isMaterialsLabHome() {
  return !!document.getElementById('materialSelect') && !!document.querySelector('main.app-shell');
}

function ensureStyles() {
  if (document.getElementById('ft-cp-demo-entry-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-cp-demo-entry-style';
  style.textContent = `
    .ft-cp-demo-entry { max-width:1500px; margin:1rem auto 0; padding:0 1rem; }
    .ft-cp-demo-entry__card { display:grid; grid-template-columns:1fr auto; gap:1rem; align-items:center; padding:1rem 1.1rem; border:1px solid rgba(255,207,92,.48); border-radius:16px; background:linear-gradient(135deg,rgba(31,51,62,.95),rgba(7,24,33,.96)); box-shadow:0 12px 30px rgba(0,0,0,.16); }
    .ft-cp-demo-entry__card h2 { margin:.15rem 0 .35rem; font-size:1.35rem; }
    .ft-cp-demo-entry__card p { margin:.2rem 0; max-width:850px; }
    .ft-cp-demo-entry__chips { display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.55rem; }
    .ft-cp-demo-entry__chips span { padding:.22rem .48rem; border:1px solid rgba(99,224,198,.28); border-radius:999px; font-size:.8rem; opacity:.88; }
    .ft-cp-demo-entry__cta { display:inline-flex; align-items:center; justify-content:center; min-width:205px; padding:.78rem 1rem; border-radius:10px; text-decoration:none; font-weight:800; border:1px solid rgba(255,207,92,.75); }
    @media (max-width:760px) { .ft-cp-demo-entry__card { grid-template-columns:1fr; } .ft-cp-demo-entry__cta { width:100%; } }
  `;
  document.head.appendChild(style);
}

export function ensureCPurlinDemoEntry() {
  if (!isMaterialsLabHome() || document.querySelector('[data-ft-cp-demo-entry]')) return;
  ensureStyles();
  const wrapper = document.createElement('section');
  wrapper.className = 'ft-cp-demo-entry';
  wrapper.dataset.ftCpDemoEntry = 'true';
  wrapper.innerHTML = `
    <div class="ft-cp-demo-entry__card">
      <div>
        <p class="eyebrow">PUBLIC PHYSICS DEMO · SIM-VIZ-003</p>
        <h2>C-Purlin Orientation Test · Watch the same load reach first yield</h2>
        <p>Start with the canonical 0° versus 90° C-purlin comparison at a 2.0 m rafter span. Change one shared roof slope or rafter-spacing slider and every active specimen—Member A, Member B, and optional Member C—updates together.</p>
        <div class="ft-cp-demo-entry__chips"><span>0° vs 90° canonical pair</span><span>optional 3rd C-purlin</span><span>shared span + slope</span><span>kgf live load</span><span>video export</span></div>
      </div>
      <a class="button ft-cp-demo-entry__cta" href="./compare.html?demo=c-purlin#c-purlin-physics-bench">OPEN LIVE C-PURLIN TEST →</a>
    </div>`;
  const main = document.querySelector('main.app-shell');
  main?.insertAdjacentElement('beforebegin', wrapper);
}

ensureCPurlinDemoEntry();
