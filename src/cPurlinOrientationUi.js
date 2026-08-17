const orientationDegreesBySlot = [0, 0, 0];

function isCPurlinPreset(select) {
  return String(select?.value ?? '').startsWith('ph-cp-');
}

function setTextIfChanged(node, nextText) {
  if (node && node.textContent !== nextText) node.textContent = nextText;
}

function orientationLabel(degrees) {
  const axis = degrees % 180 === 0 ? 'web vertical · major-axis screening' : 'web horizontal · minor-axis screening';
  return `Orientation ${degrees}° · ${axis}`;
}

function orientationNote(degrees) {
  if (degrees === 0) {
    return 'Orientation 0° selected: web depth is vertical, so roof load is screened about the section major/strong gross axis.';
  }
  if (degrees === 90) {
    return 'Orientation 90° selected: web is horizontal, so the same C-section is screened about its minor/weak gross axis.';
  }
  if (degrees === 180) {
    return 'Orientation 180° selected: web is vertical with the C opening reversed. Gross major-axis properties are equivalent to Orientation 0°, while installation direction remains explicit.';
  }
  return 'Orientation 270° selected: web is horizontal with the C opening reversed. Gross minor-axis properties are equivalent to Orientation 90°, while installation direction remains explicit.';
}

function ensureFourOrientationOptions(select) {
  const listed = select.querySelector('option[value="listed"]');
  const rotated = select.querySelector('option[value="rotated"]');
  if (!listed || !rotated) return;

  listed.dataset.orientationDeg = '0';
  rotated.dataset.orientationDeg = '90';
  setTextIfChanged(listed, orientationLabel(0));
  setTextIfChanged(rotated, orientationLabel(90));

  if (!select.querySelector('option[data-orientation-deg="180"]')) {
    const option180 = document.createElement('option');
    option180.value = 'listed';
    option180.dataset.orientationDeg = '180';
    option180.textContent = orientationLabel(180);
    select.append(option180);
  }
  if (!select.querySelector('option[data-orientation-deg="270"]')) {
    const option270 = document.createElement('option');
    option270.value = 'rotated';
    option270.dataset.orientationDeg = '270';
    option270.textContent = orientationLabel(270);
    select.append(option270);
  }
}

function setSectionSketchAngle(root, selector, degrees) {
  const group = root.querySelector(`${selector} .section-sketch > g`);
  if (!group) return;
  const nextTransform = `rotate(${degrees} 60 58)`;
  if (group.getAttribute('transform') !== nextTransform) {
    group.setAttribute('transform', nextTransform);
  }
}

function applySelectorLabels() {
  const root = document.getElementById('compareSelectors');
  if (!root) return;

  for (const card of root.querySelectorAll('.compare-selector-card')) {
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    if (!presetSelect || !orientationSelect) continue;

    const index = Number(presetSelect.dataset.slotPreset);
    const existingNote = card.querySelector('[data-c-purlin-orientation-note]');
    if (!isCPurlinPreset(presetSelect)) {
      existingNote?.remove();
      continue;
    }

    ensureFourOrientationOptions(orientationSelect);
    const degrees = orientationDegreesBySlot[index] ?? 0;
    const targetOption = [...orientationSelect.options]
      .find((option) => Number(option.dataset.orientationDeg) === degrees);
    if (targetOption && !targetOption.selected) targetOption.selected = true;

    // Rotate the actual C-section SVG group, not the outer SVG element. This makes
    // the opening direction visibly change at 180°/270° and avoids CSS-transform lag.
    setSectionSketchAngle(card, '.compare-selector-visual', degrees);

    const note = existingNote ?? document.createElement('p');
    note.dataset.cPurlinOrientationNote = 'true';
    note.className = 'candidate-source';
    setTextIfChanged(note, orientationNote(degrees));
    if (!existingNote) orientationSelect.closest('label')?.insertAdjacentElement('afterend', note);
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

    // The solver still uses the same gross-axis pair (0/180 major, 90/270 minor),
    // while the drawing is forced to the exact installation angle selected.
    setSectionSketchAngle(resultCard, '.compare-result-card__visual', degrees);

    const description = resultCard.querySelector('.compare-result-card__body h3 + p');
    const strong = description?.querySelector('strong');
    if (!description || !strong) return;
    let orientationTextNode = [...description.childNodes]
      .find((node) => node.nodeType === Node.TEXT_NODE && node !== strong);
    const nextText = ` · Orientation ${degrees}°`;
    if (!orientationTextNode) {
      orientationTextNode = document.createTextNode(nextText);
      description.append(orientationTextNode);
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
  applySelectorLabels();
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
    const index = Number(target.dataset.slotOrientation);
    const degrees = Number(target.selectedOptions[0]?.dataset.orientationDeg);
    if (Number.isInteger(index) && Number.isFinite(degrees)) orientationDegreesBySlot[index] = degrees;
  }
  scheduleEnhancements();
});
scheduleEnhancements();
