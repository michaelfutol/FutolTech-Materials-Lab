const panel = document.querySelector('[data-c-purlin-physics-bench]');

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function settleZeroFrame() {
  panel?.querySelector('[data-cpy-reset]')?.click();
  await nextFrame();
  await nextFrame();
  window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.render?.();
  await nextFrame();
  const state = window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.getState?.();
  const loadKN = Number(state?.sharedLoadKN ?? Number.NaN);
  panel.dataset.recordingPreRollLoadKn = Number.isFinite(loadKN) ? String(loadKN) : 'nan';
  panel.dataset.recordingPreRollReady = Number.isFinite(loadKN) && Math.abs(loadKN) < 1e-9 ? 'true' : 'false';
  return Number.isFinite(loadKN) && Math.abs(loadKN) < 1e-9;
}

function mount() {
  if (!panel || panel.dataset.recordingPreRollV6 === 'true') return;
  const button = panel.querySelector('[data-cpy-record]');
  if (!button) return;
  panel.dataset.recordingPreRollV6 = 'true';
  let replaying = false;
  let preparing = false;

  button.addEventListener('click', async (event) => {
    if (replaying) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (preparing) return;
    preparing = true;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'PREPARING ZERO FRAME…';
    try {
      const ready = await settleZeroFrame();
      if (!ready) throw new Error('Could not settle the recording canvas at zero load.');
      replaying = true;
      button.disabled = false;
      button.textContent = originalText;
      button.click();
      replaying = false;
    } catch (error) {
      replaying = false;
      button.disabled = false;
      button.textContent = originalText;
      const banner = panel.querySelector('[data-cpy-error]');
      if (banner) {
        banner.hidden = false;
        banner.textContent = error.message || String(error);
      }
    } finally {
      preparing = false;
    }
  }, true);
}

mount();
