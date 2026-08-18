import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';

// Direct Compare's structural solver still needs only two gross bending-axis
// states: listed (major axis) and rotated (minor axis). Installation direction,
// however, has four distinct views. Keep those concerns separate: this module
// owns the exact 0/90/180/270 display state and bridges it to the solver's
// existing listed/rotated select instead of trying to put duplicate values in
// one HTML select.
const orientationDegreesBySlot = [0, 0, 0];

function isCPurlinPreset(select) {
  return String(select?.value ?? '').startsWith('ph-cp-');
}

function normalizeDegrees(value) {
  const degrees = Number(value);
  if (![0, 90, 180, 270].includes(degrees)) return 0;
  return degrees;
}

function solverOrientation(degrees) {
  return normalizeDegrees(degrees) % 180 === 90 ? 'rotated' : 'listed';
}

function setTextIfChanged(node, nextText) {
  if (node && node.textContent !== nextText) node.textContent = nextText;
}

function orientationLabel(degrees) {
  if (degrees === 0) return 'Orientation 0° · web vertical · opening right · major-axis screening';
  if (degrees === 90) return 'Orientation 90° · web horizontal · opening down · minor-axis screening';
  if (degrees === 180) return 'Orientation 180° · web vertical · opening left · major-axis screening';
  return 'Orientation 270° · web horizontal · opening up · minor-axis screening';
}

function cPurlinPresetById(id) {
  return presetsForFamily('steel').find((preset) => preset.id === id) ?? null;
}

function renderCPurlinFigure(container, presetId, degrees, titlePrefix = 'C-purlin') {
  if (!container) return;
  const preset = cPurlinPresetById(presetId);
  if (!preset) return;
  const normalizedDegrees = normalizeDegrees(degrees);
  const key = `${preset.id}:${normalizedDegrees}`;
  if (container.dataset.orientationFigureKey === key) return;

  const orientedPreset = { ...preset, displayRotationDeg: normalizedDegrees };
  container.innerHTML = sectionSketchSvg(orientedPreset, 'steel', {
    title: `${titlePrefix} · Orientation ${normalizedDegrees}°`
  });
  container.dataset.orientationFigureKey = key;
}

function setCoreOrientation(coreSelect, degrees, { dispatch = false } = {}) {
  if (!coreSelect) return;
  const normalizedDegrees = normalizeDegrees(degrees);
  const solverValue = solverOrientation(normalizedDegrees);
  coreSelect.value = solverValue;

  // The manual-calculation trace reads this data attribute from the solver
  // selector, so preserve the exact installation angle even though the solver
  // itself only receives major/minor-axis state.
  const selected = coreSelect.selectedOptions?.[0];
  if (selected) selected.dataset.orientationDeg = String(normalizedDegrees);

  if (dispatch) coreSelect.dispatchEvent(new Event('change', { bubbles: true }));
}

function ensureDisplayOrientationSelect(card, coreSelect, slotIndex) {
  const label = coreSelect.closest('label');
  if (!label) return null;

  // Keep the core binary select in the DOM for compareApp and print trace, but
  // do not expose it as the user control. A second select has four unique values.
  coreSelect.hidden = true;
  coreSelect.dataset.cPurlinSolverOrientation = 'true';
  const listed = coreSelect.querySelector('option[value="listed"]');
  const rotated = coreSelect.querySelector('option[value="rotated"]');
  if (listed && !listed.dataset.orientationDeg) listed.dataset.orientationDeg = '0';
  if (rotated && !rotated.dataset.orientationDeg) rotated.dataset.orientationDeg = '90';

  let displaySelect = label.querySelector('[data-c-purlin-orientation-display]');
  if (!displaySelect) {
    displaySelect = document.createElement('select');
    displaySelect.dataset.cPurlinOrientationDisplay = String(slotIndex);
    displaySelect.setAttribute('aria-label', `Member ${String.fromCharCode(65 + slotIndex)} C-purlin orientation`);
    displaySelect.innerHTML = [0, 90, 180, 270]
      .map((degrees) => `<option value="${degrees}">${orientationLabel(degrees)}</option>`)
      .join('');
    coreSelect.insertAdjacentElement('afterend', displaySelect);

    displaySelect.addEventListener('change', () => {
      const degrees = normalizeDegrees(displaySelect.value);
      orientationDegreesBySlot[slotIndex] = degrees;
      setCoreOrientation(coreSelect, degrees, { dispatch: true });
      scheduleEnhancements();
    });
  }

  const degrees = orientationDegreesBySlot[slotIndex] ?? 0;
  if (displaySelect.value !== String(degrees)) displaySelect.value = String(degrees);
  displaySelect.disabled = coreSelect.disabled;
  setCoreOrientation(coreSelect, degrees);
  return displaySelect;
}

function removeDisplayOrientationSelect(card, coreSelect) {
  card.querySelector('[data-c-purlin-orientation-display]')?.remove();
  card.querySelector('[data-c-purlin-orientation-note]')?.remove();
  if (coreSelect) {
    coreSelect.hidden = false;
    delete coreSelect.dataset.cPurlinSolverOrientation;
    const listed = coreSelect.querySelector('option[value="listed"]');
    const rotated = coreSelect.querySelector('option[value="rotated"]');
    if (listed) delete listed.dataset.orientationDeg;
    if (rotated) delete rotated.dataset.orientationDeg;
  }
}

function applySelectorControls() {
  const root = document.getElementById('compareSelectors');
  if (!root) return;

  for (const card of root.querySelectorAll('.compare-selector-card')) {
    const presetSelect = card.querySelector('[data-slot-preset]');
    const coreSelect = card.querySelector('[data-slot-orientation]');
    if (!presetSelect || !coreSelect) continue;

    const index = Number(presetSelect.dataset.slotPreset);
    if (!isCPurlinPreset(presetSelect)) {
      removeDisplayOrientationSelect(card, coreSelect);
      card.querySelector('.compare-selector-visual')?.removeAttribute('data-orientation-figure-key');
      continue;
    }

    // The four-way selector already communicates angle, web direction, opening
    // direction and gross screening axis. Do not duplicate that information in
    // a paragraph below the control; the detailed explanation belongs in the
    // manual-calculation trace on Page 7.
    card.querySelector('[data-c-purlin-orientation-note]')?.remove();

    const degrees = orientationDegreesBySlot[index] ?? 0;
    ensureDisplayOrientationSelect(card, coreSelect, index);
    renderCPurlinFigure(
      card.querySelector('.compare-selector-visual'),
      presetSelect.value,
      degrees,
      card.querySelector('h3')?.textContent?.trim() || 'C-purlin'
    );
  }
}

function applyResultOrientationVisuals() {
  const selectorRoot = document.getElementById('compareSelectors');
  const resultRoot = document.getElementById('compareResultCards');
  if (!selectorRoot || !resultRoot) return;

  const activeSelectors = [...selectorRoot.querySelectorAll('.compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  const resultCards = [...resultRoot.querySelectorAll('.compare-result-card')];

  resultCards.forEach((resultCard, resultIndex) => {
    const selectorCard = activeSelectors[resultIndex];
    if (!selectorCard) return;
    const presetSelect = selectorCard.querySelector('[data-slot-preset]');
    const slotIndex = Number(presetSelect?.dataset.slotPreset);
    if (!presetSelect || !isCPurlinPreset(presetSelect)) return;

    const degrees = orientationDegreesBySlot[slotIndex] ?? 0;
    renderCPurlinFigure(
      resultCard.querySelector('.compare-result-card__visual'),
      presetSelect.value,
      degrees,
      selectorCard.querySelector('h3')?.textContent?.trim() || 'C-purlin'
    );

    const description = resultCard.querySelector('.compare-result-card__body h3 + p');
    const strong = description?.querySelector('strong');
    if (!description || !strong) return;
    let orientationTextNode = [...description.childNodes]
      .find((node) => node.nodeType === Node.TEXT_NODE && node !== strong);
    const nextText = ` · Orientation ${degrees}°`;
    if (!orientationTextNode) {
      description.append(document.createTextNode(nextText));
    } else if (orientationTextNode.nodeValue !== nextText) {
      orientationTextNode.nodeValue = nextText;
    }
  });
}

function applyScreeningBadges() {
  const resultRoot = document.getElementById('compareResultCards');
  if (!resultRoot) return;
  for (const card of resultRoot.querySelectorAll('.compare-result-card')) {
    const heading = card.querySelector('h3');
    if (!heading?.textContent?.includes('Cold-formed C purlin')) continue;
    const badge = card.querySelector('.recommend-badge');
    if (!badge || badge.textContent.trim() === 'FAIL') continue;
    setTextIfChanged(badge, 'SCREENING');
    badge.classList.remove('recommend-badge--pass');
    badge.classList.add('recommend-badge--screening');
  }
}

function applyEnhancements() {
  applySelectorControls();
  applyResultOrientationVisuals();
  applyScreeningBadges();
}

let enhancementQueued = false;
function scheduleEnhancements() {
  if (enhancementQueued) return;
  enhancementQueued = true;
  queueMicrotask(() => {
    enhancementQueued = false;
    applyEnhancements();
  });
}

const selectors = document.getElementById('compareSelectors');
const results = document.getElementById('compareResultCards');
const observer = new MutationObserver(scheduleEnhancements);
if (selectors) observer.observe(selectors, { childList: true, subtree: true });
if (results) observer.observe(results, { childList: true, subtree: true });

selectors?.addEventListener('change', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    scheduleEnhancements();
    return;
  }

  if (target.matches('[data-slot-material], [data-slot-preset]')) {
    const index = Number(target.dataset.slotMaterial ?? target.dataset.slotPreset);
    if (Number.isInteger(index)) orientationDegreesBySlot[index] = 0;
  } else if (target.matches('[data-slot-orientation]')) {
    // This is the hidden solver bridge. It can also be driven by automated QA.
    const index = Number(target.dataset.slotOrientation);
    const degrees = normalizeDegrees(target.selectedOptions?.[0]?.dataset.orientationDeg
      ?? (target.value === 'rotated' ? 90 : 0));
    if (Number.isInteger(index)) orientationDegreesBySlot[index] = degrees;
  }
  scheduleEnhancements();
});

scheduleEnhancements();
