const STORAGE_KEY = 'ft-structural-lab-theme';
const PAPER_THEME = 'paper-matte';

function injectThemeStyles() {
  if (document.getElementById('ft-paper-matte-theme-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-paper-matte-theme-style';
  style.textContent = `
    html[data-ft-theme="paper-matte"] {
      color-scheme: light;
      --bg: #f2eee4;
      --panel: #f8f4ea;
      --panel-soft: #eee7d9;
      --border: #b9b1a1;
      --text: #253139;
      --muted: #66727a;
      --accent: #2f796d;
      --accent-soft: rgba(47, 121, 109, .10);
      --warning: #9a6c20;
      --danger: #a94747;
    }
    html[data-ft-theme="paper-matte"] body { background:#f2eee4; color:#253139; }
    html[data-ft-theme="paper-matte"] .topbar { background:#e9e2d4; }
    html[data-ft-theme="paper-matte"] .controls-panel,
    html[data-ft-theme="paper-matte"] .workspace-panel,
    html[data-ft-theme="paper-matte"] .compare-selector-card,
    html[data-ft-theme="paper-matte"] .compare-result-card,
    html[data-ft-theme="paper-matte"] .result-card { background:#f8f4ea; }
    html[data-ft-theme="paper-matte"] .workspace-panel { background:linear-gradient(180deg,#fbf8ef,#f2eee4); }
    html[data-ft-theme="paper-matte"] input,
    html[data-ft-theme="paper-matte"] select,
    html[data-ft-theme="paper-matte"] .button,
    html[data-ft-theme="paper-matte"] .mode-button { background:#fffaf0; color:#253139; }
    html[data-ft-theme="paper-matte"] .compare-selector-visual,
    html[data-ft-theme="paper-matte"] .compare-result-card__visual { background:#f1eadc; }
    html[data-ft-theme="paper-matte"] .section-sketch__void { fill:#f1eadc; stroke:#8e968f; }
    html[data-ft-theme="paper-matte"] .compare-table thead th { background:#e9e2d4; }
    html[data-ft-theme="paper-matte"] .app-tooltip { background:#fffaf0; color:#253139; }
    html[data-ft-theme="paper-matte"] .support-help,
    html[data-ft-theme="paper-matte"] .section-editor__note,
    html[data-ft-theme="paper-matte"] .custom-properties p,
    html[data-ft-theme="paper-matte"] .interpretation { color:#4d5960; }
    html[data-ft-theme="paper-matte"] .load-equivalent,
    html[data-ft-theme="paper-matte"] .section-summary { color:#245a51; }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench { background:linear-gradient(180deg,#f8f4ea,#eee7d9) !important; color:#253139; }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__shared-rule,
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__readout > div { background:rgba(47,121,109,.06) !important; }
    html[data-ft-theme="paper-matte"] .c-purlin-physics-bench__load strong { color:#8b621c !important; }
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
