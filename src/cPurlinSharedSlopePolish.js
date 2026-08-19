function hideDuplicateMainSlopeControl() {
  const duplicateInput = document.getElementById('compareRoofSlopeInput');
  const duplicateLabel = duplicateInput?.closest('[data-cp-slope-control]');
  if (!duplicateInput || !duplicateLabel) return false;

  // Keep the legacy input in the DOM as an internal compatibility bridge for
  // the slope readout/print trace, but expose only the Physics Bench control.
  // This avoids two visible editable values while preserving existing QA and
  // solver wiring until the legacy module is fully retired.
  duplicateLabel.hidden = true;
  duplicateLabel.setAttribute('aria-hidden', 'true');
  duplicateLabel.dataset.internalSlopeBridge = 'true';
  duplicateInput.tabIndex = -1;
  return true;
}

function markCanonicalSlopeControl() {
  const panel = document.querySelector('[data-c-purlin-physics-bench]');
  const number = panel?.querySelector('[data-cpy-slope-number]');
  const range = panel?.querySelector('[data-cpy-slope-range]');
  if (!panel || !number || !range) return false;

  const label = number.closest('label');
  if (label) {
    label.dataset.canonicalSlopeControl = 'true';
    const span = label.querySelector('span');
    if (span) span.textContent = 'Shared roof slope, ° · all active C-purlins';
  }
  number.setAttribute('aria-label', 'Shared roof slope in degrees for all active C-purlins');
  range.setAttribute('aria-label', 'Shared roof slope slider for all active C-purlins');
  return true;
}

function apply() {
  const hidden = hideDuplicateMainSlopeControl();
  const marked = markCanonicalSlopeControl();
  return hidden && marked;
}

if (!apply()) {
  const observer = new MutationObserver(() => {
    if (apply()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
