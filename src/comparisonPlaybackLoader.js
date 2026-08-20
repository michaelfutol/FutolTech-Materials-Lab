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

function isCPurlinTestPage() {
  const queryDemo = new URLSearchParams(window.location.search).get('demo');
  return document.body?.dataset.testPage === 'c-purlin' || queryDemo === 'c-purlin';
}

function mountExperienceTabs() {
  const cluster = document.querySelector('.status-cluster');
  if (!cluster || cluster.querySelector('[data-comparison-experience-tab]')) return;
  const link = document.createElement('a');
  link.className = 'status-pill status-link';
  link.dataset.comparisonExperienceTab = 'true';
  link.target = '_blank';
  link.rel = 'noopener';
  if (isCPurlinTestPage()) {
    link.href = './compare.html';
    link.textContent = 'General Material Comparison ↗';
  } else {
    link.href = './c-purlin-test.html';
    link.textContent = 'C-Purlin Test Bench ↗';
  }
  const themeToggle = cluster.querySelector('[data-ft-theme-toggle]');
  cluster.insertBefore(link, themeToggle ?? null);
}

function physicsBenchInitialized() {
  const panel = document.querySelector('.compare-shell [data-c-purlin-physics-bench]');
  if (!panel?.dataset.yieldTargetKn) return false;
  const activeCards = [...document.querySelectorAll('.compare-shell #compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  if (activeCards.length !== 2) return false;
  const presets = activeCards.map((card) => card.querySelector('[data-slot-preset]')?.value ?? '');
  const angles = activeCards.map((card) => card.querySelector('[data-c-purlin-orientation-display]')?.value ?? '');
  return presets.every((value) => value.includes('colorsteel-c100'))
    && angles[0] === '0'
    && angles[1] === '90'
    && Number(document.getElementById('compareLengthInput')?.value) === 2
    && Number(document.getElementById('compareLoadInput')?.value) === 0;
}

async function waitForPhysicsBenchInitialization() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (physicsBenchInitialized()) return;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  throw new Error('SIM-VIZ-003 did not finish canonical C-purlin initialization before synchronized playback mounted.');
}

async function mountGenericComparisonPlayback() {
  await import('./comparisonPlaybackUi.js');
  await import('./genericComparisonVideoV1.js');
  document.documentElement.dataset.comparisonExperience = 'general-materials';
}

async function mountCPurlinPhysicsExperience() {
  // The dedicated C-purlin page retains the validated specialist stack.
  // Its one shared Direct Compare state drives slope, orientation, yield
  // sequencing, formula traces and PaperMatte/Lab-Dark video export.
  await import('./cPurlinSlopeUi.js');
  await import('./cPurlinPhysicsBenchV2.js');
  await waitForPhysicsBenchInitialization();
  await import('./cPurlinSharedSlopePolish.js');
  await import('./comparisonPlaybackUi.js');
  await import('./cPurlinTestBasisPanel.js');
  await import('./cPurlinPhysicsPolishV3.js');
  await import('./cPurlinViewSeparationV4.js');
  await import('./cPurlinDirectDemoStabilizer.js');
  await import('./cPurlinSharedControlSyncV5.js');
  await import('./cPurlinCoordinatedVideoV5.js');
  await import('./cPurlinRecordingPreRollV6.js');
  await import('./cPurlinPaperMatteReadabilityV7.js');
  await import('./cPurlinFinalStartupStabilizerV7.js');
  document.documentElement.dataset.comparisonExperience = 'c-purlin';
}

async function tryMount() {
  if (loaded || document.querySelector('.compare-shell [data-comparison-playback]')) {
    loaded = true;
    return;
  }
  if (compareReady()) {
    deconflictPrintCloneIds();
    mountExperienceTabs();
    loaded = true;
    if (isCPurlinTestPage()) await mountCPurlinPhysicsExperience();
    else await mountGenericComparisonPlayback();
    return;
  }
  attempts += 1;
  if (attempts >= MAX_ATTEMPTS) {
    window[GLOBAL_GUARD] = false;
    console.warn('SIM-VIZ did not mount because Direct Compare did not reach its ready state.');
    return;
  }
  setTimeout(tryMount, INTERVAL_MS);
}

if (!window[GLOBAL_GUARD]) {
  window[GLOBAL_GUARD] = true;
  watchPrintCloneIds();
  tryMount().catch((error) => {
    window[GLOBAL_GUARD] = false;
    console.error(error);
  });
}
