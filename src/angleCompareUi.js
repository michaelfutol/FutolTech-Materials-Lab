import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';

function isAngleSelect(select) {
  return String(select?.value ?? '').startsWith('angle-');
}

function presetById(id) {
  return presetsForFamily('steel').find((preset) => preset.id === id) ?? null;
}

function setTextIfChanged(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function applySelectorAngleState() {
  const root = document.getElementById('compareSelectors');
  if (!root) return;
  for (const card of root.querySelectorAll('.compare-selector-card')) {
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientation = card.querySelector('[data-slot-orientation]');
    if (!presetSelect || !orientation || !isAngleSelect(presetSelect)) continue;

    // Direct Compare core normally disables orientation for non-rectangular
    // presets. Angle screening needs the two leg-parallel bending directions.
    orientation.disabled = card.classList.contains('is-disabled');
    const listed = orientation.querySelector('option[value="listed"]');
    const rotated = orientation.querySelector('option[value="rotated"]');
    if (listed) setTextIfChanged(listed, 'Orientation 0° · gross leg-axis screening');
    if (rotated) setTextIfChanged(rotated, 'Orientation 90° · swapped gross leg-axis screening');

    const preset = presetById(presetSelect.value);
    const visual = card.querySelector('.compare-selector-visual');
    if (!preset || !visual) continue;
    const degrees = orientation.value === 'rotated' ? 90 : 0;
    const key = `${preset.id}:${degrees}`;
    if (visual.dataset.angleFigureKey !== key) {
      visual.innerHTML = sectionSketchSvg({ ...preset, displayRotationDeg: degrees }, 'steel', {
        title: `${preset.label} · Orientation ${degrees}°`
      });
      visual.dataset.angleFigureKey = key;
    }
  }
}

function activeSelectorCards() {
  return [...(document.getElementById('compareSelectors')?.querySelectorAll('.compare-selector-card') ?? [])]
    .filter((card) => !card.classList.contains('is-disabled'));
}

function applyAngleScreeningBadges() {
  const selectorCards = activeSelectorCards();
  const resultCards = [...(document.getElementById('compareResultCards')?.querySelectorAll('.compare-result-card') ?? [])];
  resultCards.forEach((card, index) => {
    const presetSelect = selectorCards[index]?.querySelector('[data-slot-preset]');
    if (!isAngleSelect(presetSelect)) return;
    const badge = card.querySelector('.recommend-badge');
    if (!badge || badge.textContent.trim() === 'FAIL') return;
    setTextIfChanged(badge, 'SCREENING');
    badge.classList.remove('recommend-badge--pass');
    badge.classList.add('recommend-badge--screening');
  });
}

function applyAngleTableStatuses() {
  const selectorCards = activeSelectorCards();
  const statusRow = document.getElementById('compareTableBody')?.querySelector('tr:first-child');
  if (!statusRow) return;
  const cells = [...statusRow.querySelectorAll('td')];
  cells.forEach((cell, index) => {
    const presetSelect = selectorCards[index]?.querySelector('[data-slot-preset]');
    if (!isAngleSelect(presetSelect) || cell.textContent.trim() === 'FAIL') return;
    setTextIfChanged(cell, 'SCREENING');
  });
}

function applyAngleSummaryBoundary() {
  const selectors = activeSelectorCards();
  const angleCount = selectors.filter((card) => isAngleSelect(card.querySelector('[data-slot-preset]'))).length;
  const summary = document.getElementById('compareSummary');
  if (!summary || angleCount === 0) return;
  let note = summary.querySelector('[data-angle-screening-summary]');
  if (!note) {
    note = document.createElement('p');
    note.dataset.angleScreeningSummary = 'true';
    summary.append(note);
  }
  setTextIfChanged(note, `${angleCount} selected angle-bar result${angleCount === 1 ? ' is' : 's are'} gross leg-axis SCREENING only; principal-axis unsymmetric bending, torsion, local instability and lateral-/flexural-torsional buckling are not yet design-checked.`);
}

function applyEnhancements() {
  applySelectorAngleState();
  applyAngleScreeningBadges();
  applyAngleTableStatuses();
  applyAngleSummaryBoundary();
}

let queued = false;
function scheduleEnhancements() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    applyEnhancements();
  });
}

const observer = new MutationObserver(scheduleEnhancements);
for (const id of ['compareSelectors', 'compareResultCards', 'compareTableBody', 'compareSummary']) {
  const node = document.getElementById(id);
  if (node) observer.observe(node, { childList: true, subtree: true });
}

document.getElementById('compareSelectors')?.addEventListener('change', scheduleEnhancements);
scheduleEnhancements();
