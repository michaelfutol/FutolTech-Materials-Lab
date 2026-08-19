function isDirectCPurlinDemo() {
  return new URLSearchParams(window.location.search).get('demo') === 'c-purlin';
}

function setDisplayOrientation(slot, degrees) {
  const display = document.querySelector(`[data-c-purlin-orientation-display="${slot}"]`);
  if (!(display instanceof HTMLSelectElement)) return false;
  const desired = String(degrees);
  if (display.value !== desired) {
    display.value = desired;
    display.dispatchEvent(new Event('change', { bubbles:true }));
  }
  return display.value === desired;
}

async function settleAfterReadabilityMount() {
  if (!isDirectCPurlinDemo()) return;
  const apply = () => setDisplayOrientation(0, 0) && setDisplayOrientation(1, 90);
  apply();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  apply();
  await new Promise((resolve) => setTimeout(resolve, 140));
  apply();
  window.__FT_C_PURLIN_PHYSICS_POLISH_V3__?.redraw?.();
  window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.render?.();
  document.querySelector('[data-c-purlin-physics-bench]')?.setAttribute('data-final-startup-stabilized-v7', 'true');
}

settleAfterReadabilityMount();
