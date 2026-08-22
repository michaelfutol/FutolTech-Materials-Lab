const ROOT_SELECTOR = '.compare-shell';
const PANEL_SELECTOR = '[data-comparison-playback]';

function injectStyles() {
  if (document.getElementById('ft-general-comparison-layout-v2')) return;
  const style = document.createElement('style');
  style.id = 'ft-general-comparison-layout-v2';
  style.textContent = `
    .compare-shell > .comparison-playback {
      grid-column: 1 / -1 !important;
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      border-radius: 0 !important;
      box-sizing: border-box;
    }
    .compare-shell > .comparison-playback .comparison-playback__cards {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 1rem !important;
    }
    .compare-shell > .comparison-playback .comparison-playback-card {
      min-width: 0 !important;
      overflow: hidden;
    }
    .compare-shell > .comparison-playback .comparison-playback-card__top {
      grid-template-columns: minmax(76px, 96px) minmax(0, 1fr) !important;
    }
    .compare-shell > .comparison-playback .comparison-playback-card__top strong,
    .compare-shell > .comparison-playback .comparison-playback-card__event,
    .compare-shell > .comparison-playback .comparison-playback-card__metrics strong {
      overflow-wrap: anywhere;
    }
    .compare-shell > .comparison-playback .generic-comparison-video {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    @media (max-width: 1120px) {
      .compare-shell > .comparison-playback .comparison-playback__cards {
        grid-template-columns: 1fr !important;
      }
    }
    @media print {
      .compare-shell > .comparison-playback { display:none !important; }
    }
  `;
  document.head.appendChild(style);
}

function relocate() {
  const shell = document.querySelector(ROOT_SELECTOR);
  const panel = document.querySelector(`${ROOT_SELECTOR} ${PANEL_SELECTOR}`);
  if (!shell || !panel) return false;
  injectStyles();
  if (panel.parentElement !== shell) {
    const results = shell.querySelector(':scope > .compare-results');
    if (results) shell.insertBefore(panel, results);
    else shell.appendChild(panel);
  }
  panel.dataset.fullWidthComparisonPlayback = 'true';
  document.documentElement.dataset.generalComparisonLayout = 'full-width-v2';
  return true;
}

if (!relocate()) {
  const observer = new MutationObserver(() => {
    if (relocate()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  window.setTimeout(() => observer.disconnect(), 15000);
}
