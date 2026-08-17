function isCPurlinPreset(select) {
  return String(select?.value ?? '').startsWith('ph-cp-');
}

function applySelectorLabels() {
  const root = document.getElementById('compareSelectors');
  if (!root) return;

  for (const card of root.querySelectorAll('.compare-selector-card')) {
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    if (!presetSelect || !orientationSelect) continue;

    const existingNote = card.querySelector('[data-c-purlin-orientation-note]');
    if (!isCPurlinPreset(presetSelect)) {
      existingNote?.remove();
      continue;
    }

    const listed = orientationSelect.querySelector('option[value="listed"]');
    const rotated = orientationSelect.querySelector('option[value="rotated"]');
    if (listed) listed.textContent = 'Orientation 0° · web vertical · major-axis screening';
    if (rotated) rotated.textContent = 'Orientation 90° · web horizontal · minor-axis screening';

    const note = existingNote ?? document.createElement('p');
    note.dataset.cPurlinOrientationNote = 'true';
    note.className = 'candidate-source';
    note.textContent = orientationSelect.value === 'rotated'
      ? 'Orientation 90° selected: the same C-section is bending about its minor/weak gross axis. Compare I, Z, stress and deflection directly against Orientation 0°.'
      : 'Orientation 0° selected: the web depth is vertical so the roof load is screened about the section major/strong gross axis.';
    if (!existingNote) orientationSelect.closest('label')?.insertAdjacentElement('afterend', note);
  }
}

function applyScreeningBadges() {
  const resultRoot = document.getElementById('compareResultCards');
  if (!resultRoot) return;
  for (const card of resultRoot.querySelectorAll('.compare-result-card')) {
    const heading = card.querySelector('h3');
    if (!heading?.textContent?.includes('Cold-formed C purlin')) continue;
    const badge = card.querySelector('.recommend-badge');
    if (!badge || badge.textContent.trim() === 'FAIL') continue;
    badge.textContent = 'SCREENING';
    badge.classList.remove('recommend-badge--pass');
    badge.classList.add('recommend-badge--screening');
  }
}

function applyEnhancements() {
  applySelectorLabels();
  applyScreeningBadges();
}

const selectors = document.getElementById('compareSelectors');
const results = document.getElementById('compareResultCards');
const observer = new MutationObserver(applyEnhancements);
if (selectors) observer.observe(selectors, { childList: true, subtree: true });
if (results) observer.observe(results, { childList: true, subtree: true });
selectors?.addEventListener('change', () => queueMicrotask(applyEnhancements));
applyEnhancements();
