export function minimumPositiveSearchValue(unit) {
  if (unit === 'kgf') return 0.001;
  if (unit === 'tf') return 0.000001;
  return 0.0001;
}

export function guardedSearchValue(value, unit, searching) {
  const numeric = Number(value);
  if (!searching || !Number.isFinite(numeric) || numeric > 0) return value;
  return minimumPositiveSearchValue(unit);
}

function mountPositiveLoadGuard() {
  const input = document.getElementById('compareLoadInput');
  const unitSelect = document.getElementById('compareLoadUnitSelect');
  if (!input || !unitSelect || input.dataset.comparisonLimitPositiveGuard === 'true') return;

  input.dataset.comparisonLimitPositiveGuard = 'true';
  input.addEventListener('input', () => {
    const searching = document.getElementById('compareLimitButton')?.disabled === true;
    const guarded = guardedSearchValue(input.value, unitSelect.value, searching);
    if (String(guarded) !== input.value) input.value = String(guarded);
  }, { capture: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPositiveLoadGuard, { once: true });
  } else {
    mountPositiveLoadGuard();
  }
}
