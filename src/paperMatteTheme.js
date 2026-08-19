const STORAGE_KEY = 'ft-structural-lab-theme';
const PAPER_THEME = 'paper-matte';

function injectThemeStyles() {
  if (document.getElementById('ft-paper-matte-theme-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-paper-matte-theme-style';
  style.textContent = `
    html[data-ft-theme="paper-matte"] {
      color-scheme: light;
      --bg: #f7f2e8;
      --panel: #fffaf1;
      --panel-soft: #eee5d4;
      --border: #9f927d;
      --text: #1f2a31;
      --muted: #49545b;
      --accent: #176a60;
      --accent-soft: rgba(23, 106, 96, .11);
      --warning: #7c5513;
      --danger: #993838;
    }
    html[data-ft-theme="paper-matte"] body { background:#f7f2e8; color:#1f2a31; }
    html[data-ft-theme="paper-matte"] .topbar { background:#f1e8d8; color:#1f2a31; }
    html[data-ft-theme="paper-matte"] .topbar .eyebrow {
      color:#155f56 !important;
      font-size:clamp(1rem,1.25vw,1.25rem) !important;
      font-weight:900 !important;
      letter-spacing:.075em !important;
      line-height:1.2 !important;
      text-transform:none !important;
    }
    html[data-ft-theme="paper-matte"] .topbar h1,
    html[data-ft-theme="paper-matte"] h1,
    html[data-ft-theme="paper-matte"] h2,
    html[data-ft-theme="paper-matte"] h3,
    html[data-ft-theme="paper-matte"] strong { color:#172127; }
    html[data-ft-theme="paper-matte"] .subtitle,
    html[data-ft-theme="paper-matte"] .eyebrow,
    html[data-ft-theme="paper-matte"] .muted,
    html[data-ft-theme="paper-matte"] small { color:#49545b; }
    html[data-ft-theme="paper-matte"] .controls-panel,
    html[data-ft-theme="paper-matte"] .workspace-panel,
    html[data-ft-theme="paper-matte"] .compare-selector-card,
    html[data-ft-theme="paper-matte"] .compare-result-card,
    html[data-ft-theme="paper-matte"] .result-card { background:#fffaf1; color:#1f2a31; }
    html[data-ft-theme="paper-matte"] .workspace-panel { background:linear-gradient(180deg,#fffdf8,#f4ecdf); }
    html[data-ft-theme="paper-matte"] input,
    html[data-ft-theme="paper-matte"] select,
    html[data-ft-theme="paper-matte"] .button,
    html[data-ft-theme="paper-matte"] .mode-button {
      background:#fffdf8;
      color:#172127;
      border-color:#8d806c;
    }
    html[data-ft-theme="paper-matte"] .compare-selector-visual,
    html[data-ft-theme="paper-matte"] .compare-result-card__visual { background:#f6efe2; }
    html[data-ft-theme="paper-matte"] .section-sketch__void { fill:#f6efe2; stroke:#68746d; }
    html[data-ft-theme="paper-matte"] .compare-table,
    html[data-ft-theme="paper-matte"] .compare-table th,
    html[data-ft-theme="paper-matte"] .compare-table td { color:#202b31; }
    html[data-ft-theme="paper-matte"] .compare-table thead th { background:#e8decd; color:#172127; }
    html[data-ft-theme="paper-matte"] .compare-table tbody tr:nth-child(even) { background:rgba(255,255,255,.28); }
    html[data-ft-theme="paper-matte"] .app-tooltip { background:#fffdf8; color:#172127; border-color:#8d806c; }
    html[data-ft-theme="paper-matte"] .support-help,
    html[data-ft-theme="paper-matte"] .section-editor__note,
    html[data-ft-theme="paper-matte"] .custom-properties p,
    html[data-ft-theme="paper-matte"] .interpretation { color:#3f4a50; }
    html[data-ft-theme="paper-matte"] .load-equivalent,
    html[data-ft-theme="paper-matte"] .section-summary { color:#155f56; }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench {
      background:linear-gradient(180deg,#fffaf1,#f0e6d6) !important;
      color:#1f2a31;
      border-color:#8f7f66 !important;
    }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__shared-rule,
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__readout > div { background:rgba(255,255,255,.46) !important; }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__load strong { color:#704b0f !important; }
    html[data-ft-theme="paper-matte"] .compare-summary,
    html[data-ft-theme="paper-matte"] .compare-boundary,
    html[data-ft-theme="paper-matte"] .comparison-boundary { color:#263238 !important; }
    html[data-ft-theme="paper-matte"] .compare-result-card.is-best,
    html[data-ft-theme="paper-matte"] .compare-table .is-best,
    html[data-ft-theme="paper-matte"] .comparison-best { background:#dbe8d6 !important; color:#173321 !important; }
    html[data-ft-theme="paper-matte"] footer,
    html[data-ft-theme="paper-matte"] .engineering-notice { background:#fffaf1 !important; color:#354047 !important; }
    .ft-theme-toggle { white-space:nowrap; cursor:pointer; background:transparent; }
  `;
  document.head.appendChild(style);
}

function applyTheme(theme) {
  const active = theme === PAPER_THEME ? PAPER_THEME : 'lab-dark';
  document.documentElement.dataset.ftTheme = active;
  try { localStorage.setItem(STORAGE_KEY, active); } catch {}
  const button = document.querySelector('[data-ft-theme-toggle]');
  if (button) {
    button.textContent = active === PAPER_THEME ? 'Lab Dark mode' : 'PaperMatte mode';
    button.setAttribute('aria-pressed', String(active === PAPER_THEME));
    button.title = active === PAPER_THEME ? 'Switch to dark laboratory theme' : 'Switch to warm PaperMatte theme';
  }
  window.dispatchEvent(new CustomEvent('ft-theme-change', { detail: { theme: active } }));
}

function mountToggle() {
  injectThemeStyles();
  const cluster = document.querySelector('.status-cluster');
  if (!cluster) return;
  let button = cluster.querySelector('[data-ft-theme-toggle]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'status-pill ft-theme-toggle';
    button.dataset.ftThemeToggle = 'true';
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.ftTheme === PAPER_THEME ? 'lab-dark' : PAPER_THEME;
      applyTheme(next);
    });
    cluster.appendChild(button);
  }
  let stored = 'lab-dark';
  try { stored = localStorage.getItem(STORAGE_KEY) || 'lab-dark'; } catch {}
  applyTheme(stored);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountToggle, { once:true });
} else {
  mountToggle();
}
