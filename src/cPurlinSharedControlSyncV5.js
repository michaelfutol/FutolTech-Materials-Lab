const panel = document.querySelector('[data-c-purlin-physics-bench]');
const mainLength = document.getElementById('compareLengthInput');
const mainSlope = document.getElementById('compareRoofSlopeInput');
const loadPosition = document.getElementById('compareLoadPositionInput');
const boundary = document.getElementById('compareBoundarySelect');

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function setIfDifferent(input, value) {
  if (!input) return false;
  const next = String(value);
  if (input.value === next) return false;
  input.value = next;
  return true;
}

function emit(input, type = 'input') {
  input?.dispatchEvent(new Event(type, { bubbles: true }));
}

function mount() {
  if (!panel || panel.dataset.sharedControlSyncV5 === 'true') return;
  const spanRange = panel.querySelector('[data-cpy-span-range]');
  const spanNumber = panel.querySelector('[data-cpy-span-number]');
  const slopeRange = panel.querySelector('[data-cpy-slope-range]');
  const slopeNumber = panel.querySelector('[data-cpy-slope-number]');
  if (!mainLength || !spanRange || !spanNumber || !slopeRange || !slopeNumber) return;

  panel.dataset.sharedControlSyncV5 = 'true';
  let syncing = false;

  // The main Direct Compare field and the Physics Bench field are two views of
  // the same physical test variable, not independent inputs.
  const mainSlopeLabel = mainSlope?.closest('[data-cp-slope-control]') || mainSlope?.closest('label');
  if (mainSlope && mainSlopeLabel) {
    mainSlopeLabel.hidden = false;
    mainSlopeLabel.removeAttribute('aria-hidden');
    mainSlopeLabel.style.removeProperty('display');
    mainSlope.tabIndex = 0;
    mainSlope.dataset.sharedMirror = 'roof-slope';
    const labelText = mainSlopeLabel.querySelector('span, .field-label');
    if (labelText && !/shared/i.test(labelText.textContent || '')) {
      labelText.textContent = 'Roof slope, ° · shared with C-purlin bench';
    }
  }
  mainLength.dataset.sharedMirror = 'c-purlin-span';
  spanNumber.dataset.sharedMirror = 'c-purlin-span';
  slopeNumber.dataset.sharedMirror = 'roof-slope';

  function refreshBench() {
    queueMicrotask(() => {
      window.__FT_C_PURLIN_PHYSICS_BENCH__?.refresh?.();
      window.__FT_C_PURLIN_PHYSICS_POLISH_V3__?.redraw?.();
      window.__FT_C_PURLIN_COORDINATED_VIDEO_V5__?.render?.();
    });
  }

  function syncSpan(raw, source = 'unknown') {
    if (syncing) return;
    const span = clamp(raw, 0.8, 4, 2);
    syncing = true;
    try {
      setIfDifferent(spanRange, span);
      setIfDifferent(spanNumber, span);
      const mainChanged = setIfDifferent(mainLength, span);
      const center = Number((span / 2).toFixed(4));
      const positionChanged = setIfDifferent(loadPosition, center);
      if (boundary && boundary.value !== 'simply-supported') {
        boundary.value = 'simply-supported';
        emit(boundary, 'change');
      }
      // Direct Compare owns the actual solver inputs, so notify it whenever the
      // synchronized span changes from either UI location.
      if (mainChanged || source !== 'main') {
        emit(mainLength, 'input');
        emit(mainLength, 'change');
      }
      if (positionChanged || source !== 'main') emit(loadPosition, 'input');
      panel.dataset.sharedSpanM = String(span);
    } finally {
      syncing = false;
    }
    refreshBench();
  }

  function syncSlope(raw, source = 'unknown') {
    if (syncing) return;
    const slope = clamp(raw, 0, 60, 0);
    syncing = true;
    try {
      setIfDifferent(slopeRange, slope);
      setIfDifferent(slopeNumber, slope);
      if (mainSlope) {
        const mainChanged = setIfDifferent(mainSlope, slope);
        if (mainChanged || source !== 'main') emit(mainSlope, 'input');
      }
      panel.dataset.sharedRoofSlopeDeg = String(slope);
    } finally {
      syncing = false;
    }
    refreshBench();
  }

  // Main -> bench.
  mainLength.addEventListener('input', () => syncSpan(mainLength.value, 'main'));
  mainLength.addEventListener('change', () => syncSpan(mainLength.value, 'main'));
  mainSlope?.addEventListener('input', () => syncSlope(mainSlope.value, 'main'));
  mainSlope?.addEventListener('change', () => syncSlope(mainSlope.value, 'main'));

  // Bench -> main. V2 already performs this direction; V5 mirrors it as an
  // explicit invariant so the two controls cannot drift if legacy listeners
  // are later removed or reordered.
  spanRange.addEventListener('input', () => syncSpan(spanRange.value, 'bench'));
  spanNumber.addEventListener('input', () => syncSpan(spanNumber.value, 'bench'));
  spanNumber.addEventListener('change', () => syncSpan(spanNumber.value, 'bench'));
  slopeRange.addEventListener('input', () => syncSlope(slopeRange.value, 'bench'));
  slopeNumber.addEventListener('input', () => syncSlope(slopeNumber.value, 'bench'));
  slopeNumber.addEventListener('change', () => syncSlope(slopeNumber.value, 'bench'));

  // Let the already-initialized Physics Bench state win at mount time, then
  // keep both UI locations locked to that one shared state.
  syncSpan(spanNumber.value, 'bench');
  syncSlope(slopeNumber.value, 'bench');

  window.__FT_C_PURLIN_SHARED_CONTROL_SYNC_V5__ = {
    syncSpan,
    syncSlope,
    getState: () => ({
      spanM: Number(spanNumber.value),
      mainSpanM: Number(mainLength.value),
      loadPositionM: Number(loadPosition?.value),
      roofSlopeDeg: Number(slopeNumber.value),
      mainRoofSlopeDeg: Number(mainSlope?.value)
    })
  };
}

mount();
