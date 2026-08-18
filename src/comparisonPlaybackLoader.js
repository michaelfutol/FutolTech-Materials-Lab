const MAX_ATTEMPTS = 240;
const INTERVAL_MS = 50;
let attempts = 0;
let loaded = false;

function slotReady(index) {
  return !!document.querySelector(`[data-slot-material="${index}"]`)
    && !!document.querySelector(`[data-slot-preset="${index}"]`)
    && !!document.querySelector(`[data-slot-orientation="${index}"]`);
}

function compareReady() {
  return document.readyState !== 'loading'
    && [0, 1, 2].every(slotReady)
    && !!document.getElementById('compareLoadEquivalent')
    && !!document.getElementById('compareResultCards')
    && !!document.querySelector('[data-slot-enable="2"]');
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
