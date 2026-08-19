const MAX_ATTEMPTS = 240;
const INTERVAL_MS = 50;
const GLOBAL_GUARD = '__FT_COMPARISON_PLAYBACK_LOADER_ACTIVE__';
let attempts = 0;
let loaded = false;

function deconflictPrintCloneIds(root = document) {
  root.querySelectorAll?.('.ft-print-document #compareSelectors').forEach((node, index) => {
    node.dataset.printCloneSourceId = 'compareSelectors';
    node.id = `compareSelectorsPrintClone${index + 1}`;
  });
}

function watchPrintCloneIds() {
  deconflictPrintCloneIds();
  const observer = new MutationObserver((records) => {
    let needsScan = false;
    for (const record of records) {
      if (record.addedNodes.length) { needsScan = true; break; }
    }
    if (needsScan) deconflictPrintCloneIds();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function slotReady(index) {
  const liveRoot = document.querySelector('.compare-shell #compareSelectors');
  return !!liveRoot?.querySelector(`[data-slot-material="${index}"]`)
    && !!liveRoot?.querySelector(`[data-slot-preset="${index}"]`)
    && !!liveRoot?.querySelector(`[data-slot-orientation="${index}"]`);
}

function compareReady() {
  return document.readyState !== 'loading'
    && [0, 1, 2].every(slotReady)
    && !!document.getElementById('compareLoadEquivalent')
    && !!document.getElementById('compareResultCards')
    && !!document.querySelector('.compare-shell [data-slot-enable="2"]');
}

async function tryMount() {
  if (loaded || document.querySelector('.compare-shell [data-comparison-playback]')) {
    loaded = true;
    return;
  }
  if (compareReady()) {
    deconflictPrintCloneIds();
    loaded = true;
    // The C-purlin roof-slope control shares the same member solver state as
    // Direct Compare and SIM-VIZ-002. Load it first so both views always use
    // one slope definition rather than separate calculation paths.
    await import('./cPurlinSlopeUi.js');
    await import('./comparisonPlaybackUi.js');
    return;
  }
  attempts += 1;
  if (attempts >= MAX_ATTEMPTS) {
    window[GLOBAL_GUARD] = false;
    console.warn('SIM-VIZ-002 did not mount because Direct Compare did not reach its ready state.');
    return;
  }
  setTimeout(tryMount, INTERVAL_MS);
}

if (!window[GLOBAL_GUARD]) {
  window[GLOBAL_GUARD] = true;
  watchPrintCloneIds();
  tryMount();
}
