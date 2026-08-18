const MAX_ATTEMPTS = 240;
const INTERVAL_MS = 50;
let attempts = 0;
let loaded = false;

function compareReady() {
  return document.readyState !== 'loading'
    && document.querySelectorAll('#compareSelectors .compare-selector-card').length === 3
    && !!document.getElementById('compareLoadEquivalent')
    && !!document.getElementById('compareResultCards');
}

async function tryMount() {
  if (loaded) return;
  if (compareReady()) {
    loaded = true;
    await import('./comparisonPlaybackUi.js');
    return;
  }
  attempts += 1;
  if (attempts >= MAX_ATTEMPTS) {
    console.warn('SIM-VIZ-002 did not mount because Direct Compare did not reach its ready state.');
    return;
  }
  setTimeout(tryMount, INTERVAL_MS);
}

tryMount();
