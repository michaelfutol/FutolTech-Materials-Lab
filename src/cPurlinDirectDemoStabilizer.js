function isDirectCPurlinDemo() {
  return new URLSearchParams(window.location.search).get('demo') === 'c-purlin';
}

function setDisplayOrientation(slot, degrees) {
  const display = document.querySelector(`[data-c-purlin-orientation-display="${slot}"]`);
  if (!(display instanceof HTMLSelectElement)) return false;
  const desired = String(degrees);
  if (display.value !== desired) {
    display.value = desired;
    display.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return display.value === desired;
}

function stabilizeCanonicalPair() {
  if (!isDirectCPurlinDemo()) return false;
  const a = setDisplayOrientation(0, 0);
  const b = setDisplayOrientation(1, 90);
  return a && b;
}

async function settleCanonicalPairOnce() {
  if (!isDirectCPurlinDemo()) return;

  // The four-way orientation enhancer uses queued mutation work while the
  // direct demo is mounting. Re-assert the canonical teaching pair only during
  // that startup window, then stop permanently so user edits remain free.
  stabilizeCanonicalPair();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  stabilizeCanonicalPair();
  await new Promise((resolve) => setTimeout(resolve, 120));
  stabilizeCanonicalPair();

  const polish = window.__FT_C_PURLIN_PHYSICS_POLISH_V3__;
  polish?.redraw?.();
  document.querySelector('[data-c-purlin-physics-bench]')?.setAttribute('data-direct-demo-stabilized', 'true');
}

settleCanonicalPairOnce();
