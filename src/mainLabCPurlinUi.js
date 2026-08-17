import { MATERIALS } from './data/materials.js';
import { findPreset, presetsForFamily } from './data/sectionPresets.js';
import { PH_C_PURLIN_SOURCES, idealizedLippedCProperties } from './data/phCPurlinCatalog.js';

const elements = Object.fromEntries([
  'materialSelect', 'sectionTypeSelect', 'sectionPresetSelect',
  'widthInput', 'depthInput', 'thicknessInput', 'lipInput',
  'widthLabelText', 'depthLabelText', 'thicknessLabelText', 'lipLabel',
  'customPropertyFields', 'areaInput', 'ixInput', 'iyInput', 'zxInput', 'zyInput',
  'rotateSectionButton', 'sectionSummary', 'cPurlinBoundaryNote',
  'beamModeButton', 'columnModeButton', 'loadInput', 'resetButton'
].map((id) => [id, document.getElementById(id)]));

const cPurlinTypeOption = [...elements.sectionTypeSelect.options]
  .find((option) => option.dataset.sectionKind === 'c-purlin');
const sourceLookup = new Map(Object.values(PH_C_PURLIN_SOURCES).map((source) => [source.id, source]));

let active = false;
let rotated = false;
let internalMaterialChange = false;
let preRotatePresetId = 'custom';

function format(value, decimals = 2) {
  return Number.isFinite(value)
    ? new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value)
    : '—';
}

function currentMaterial() {
  return MATERIALS.find((material) => material.id === elements.materialSelect.value) ?? MATERIALS[0];
}

function cPurlinPresets() {
  return presetsForFamily('steel').filter((preset) => preset.productCategory === 'c-purlin');
}

function defaultCPurlinPreset() {
  const presets = cPurlinPresets();
  return presets.find((preset) => preset.label.includes('2×4') && Math.abs((preset.thicknessMm ?? 0) - 1.2) < 1e-9)
    ?? presets[0];
}

function currentCPurlinPreset() {
  const preset = findPreset('steel', elements.sectionPresetSelect.value);
  return preset?.productCategory === 'c-purlin' ? preset : null;
}

function cPurlinOptionSelected() {
  return elements.sectionTypeSelect.selectedOptions[0]?.dataset.sectionKind === 'c-purlin';
}

function populateCPurlinPresets(preferredId = null) {
  const presets = cPurlinPresets();
  elements.sectionPresetSelect.innerHTML = [
    ...presets.map((preset) => `<option value="${preset.id}">${preset.label}</option>`),
    '<option value="custom">Custom measured C-purlin H/B/A/t</option>'
  ].join('');
  const preferred = preferredId && presets.some((preset) => preset.id === preferredId)
    ? preferredId
    : defaultCPurlinPreset()?.id;
  elements.sectionPresetSelect.value = preferred ?? 'custom';
}

function restoreFullPresetList(preferredId = 'custom') {
  const presets = presetsForFamily(currentMaterial().family);
  elements.sectionPresetSelect.innerHTML = presets
    .map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
    .join('');
  elements.sectionPresetSelect.value = presets.some((preset) => preset.id === preferredId)
    ? preferredId
    : presets.some((preset) => preset.id === 'custom') ? 'custom' : presets[0]?.id;
}

function ensureSteelMaterial() {
  if (currentMaterial().family === 'steel') return;
  const fallback = MATERIALS.find((material) => material.id === 'steel-generic-250')
    ?? MATERIALS.find((material) => material.family === 'steel');
  if (!fallback) return;
  internalMaterialChange = true;
  elements.materialSelect.value = fallback.id;
  elements.materialSelect.dispatchEvent(new Event('change', { bubbles: true }));
  internalMaterialChange = false;
}

function grossProperties() {
  return idealizedLippedCProperties({
    depthMm: Number(elements.depthInput.value),
    flangeMm: Number(elements.widthInput.value),
    lipMm: Number(elements.lipInput.value),
    thicknessMm: Number(elements.thicknessInput.value)
  });
}

function writeGrossProperties({ analyseAfter = true } = {}) {
  if (!active) return;
  const properties = grossProperties();
  elements.areaInput.value = properties.areaMm2.toFixed(3);
  elements.ixInput.value = (rotated ? properties.iyMm4 : properties.ixMm4).toFixed(3);
  elements.iyInput.value = (rotated ? properties.ixMm4 : properties.iyMm4).toFixed(3);
  elements.zxInput.value = (rotated ? properties.zyMm3 : properties.zxMm3).toFixed(3);
  elements.zyInput.value = (rotated ? properties.zxMm3 : properties.zyMm3).toFixed(3);
  refreshCPurlinUi();
  if (analyseAfter) elements.loadInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function summaryMarkup() {
  const orientation = rotated
    ? '<strong>PATAOB 90°</strong> · web horizontal · weak-axis gross screening'
    : '<strong>PATAYO</strong> · web vertical · major-axis gross screening';
  return `<strong>Solver uses:</strong> C-purlin H${format(Number(elements.depthInput.value), 1)} × B${format(Number(elements.widthInput.value), 1)} × A${format(Number(elements.lipInput.value), 1)} × t${format(Number(elements.thicknessInput.value), 2)} mm · ${orientation}`;
}

function sourceNoteMarkup() {
  const preset = currentCPurlinPreset();
  const source = preset ? sourceLookup.get(preset.sourceId) : null;
  const sourceLine = source
    ? `<p><strong>Selected market source:</strong> ${source.organization} · ${source.marketStatus}</p>`
    : '<p><strong>Custom measured C-purlin:</strong> verify delivered H, B, A, t, steel grade/coating and bend radii.</p>';
  return `
    <strong>C-purlin orientation screening</strong>
    <p>This page compares gross elastic response only. PATAYO and PATAOB are the same physical lipped-C section rotated 90°. This is not yet a cold-formed design capacity.</p>
    ${sourceLine}
    <p>Effective width, local/distortional buckling, lateral-torsional buckling, roof-sheet restraint, bridging/sag rods, connection eccentricity, wind uplift and governing load combinations remain outside this screening.</p>
  `;
}

function refreshCPurlinUi() {
  if (!active) return;
  cPurlinTypeOption.selected = true;
  elements.widthLabelText.textContent = 'Actual flange width B, mm';
  elements.depthLabelText.textContent = 'Actual web depth H, mm';
  elements.thicknessLabelText.textContent = 'Actual sheet thickness t, mm';
  elements.lipLabel.classList.remove('is-hidden');
  elements.customPropertyFields.classList.add('is-hidden');
  elements.rotateSectionButton.disabled = false;
  elements.rotateSectionButton.textContent = rotated ? 'Return → PATAYO' : 'Rotate 90° → PATAOB';
  elements.columnModeButton.disabled = true;
  elements.columnModeButton.title = 'C-purlin mode is currently limited to beam-bending orientation screening.';
  elements.cPurlinBoundaryNote.classList.remove('is-hidden');
  elements.cPurlinBoundaryNote.innerHTML = sourceNoteMarkup();
  const expected = summaryMarkup();
  if (elements.sectionSummary.innerHTML !== expected) elements.sectionSummary.innerHTML = expected;
}

function applyPreset(preset) {
  if (!preset) return;
  rotated = false;
  elements.widthInput.value = String(preset.purlinFlangeMm ?? preset.widthMm);
  elements.depthInput.value = String(preset.purlinDepthMm ?? preset.depthMm);
  elements.lipInput.value = String(preset.lipMm ?? 15);
  elements.thicknessInput.value = String(preset.thicknessMm ?? 1.2);
  writeGrossProperties();
}

function activateCPurlinMode({ preferredPresetId = null, chooseDefault = false } = {}) {
  ensureSteelMaterial();
  active = true;
  rotated = false;
  cPurlinTypeOption.selected = true;

  if (elements.columnModeButton.classList.contains('is-active')) elements.beamModeButton.click();

  const preferred = preferredPresetId
    ?? (!chooseDefault && currentCPurlinPreset()?.id)
    ?? defaultCPurlinPreset()?.id;
  populateCPurlinPresets(preferred);
  const preset = currentCPurlinPreset();
  if (preset) applyPreset(preset);
  else {
    elements.lipInput.value = elements.lipInput.value || '15';
    writeGrossProperties();
  }
  refreshCPurlinUi();
}

function exitCPurlinMode({ restorePresets = true } = {}) {
  if (!active) return;
  active = false;
  rotated = false;
  elements.lipLabel.classList.add('is-hidden');
  elements.cPurlinBoundaryNote.classList.add('is-hidden');
  elements.columnModeButton.disabled = false;
  elements.columnModeButton.removeAttribute('title');
  elements.rotateSectionButton.textContent = 'Rotate section 90°';
  if (restorePresets) restoreFullPresetList('custom');
}

elements.sectionTypeSelect.addEventListener('change', () => {
  if (cPurlinOptionSelected()) {
    activateCPurlinMode({ chooseDefault: true });
  } else if (active) {
    exitCPurlinMode({ restorePresets: true });
  }
});

elements.sectionPresetSelect.addEventListener('change', () => {
  const preset = findPreset('steel', elements.sectionPresetSelect.value);
  if (preset?.productCategory === 'c-purlin') {
    if (!active) {
      active = true;
      cPurlinTypeOption.selected = true;
      if (elements.columnModeButton.classList.contains('is-active')) elements.beamModeButton.click();
      populateCPurlinPresets(preset.id);
    }
    applyPreset(preset);
  } else if (active && elements.sectionPresetSelect.value === 'custom') {
    refreshCPurlinUi();
  }
});

for (const input of [elements.widthInput, elements.depthInput, elements.thicknessInput]) {
  input.addEventListener('input', () => {
    if (!active) return;
    writeGrossProperties();
  });
}

elements.lipInput.addEventListener('input', () => {
  if (!active) return;
  if ([...elements.sectionPresetSelect.options].some((option) => option.value === 'custom')) {
    elements.sectionPresetSelect.value = 'custom';
  }
  writeGrossProperties();
});

elements.rotateSectionButton.addEventListener('click', () => {
  if (active) preRotatePresetId = elements.sectionPresetSelect.value;
}, { capture: true });

elements.rotateSectionButton.addEventListener('click', () => {
  if (!active) return;
  const widthAfterAppRotation = elements.widthInput.value;
  elements.widthInput.value = elements.depthInput.value;
  elements.depthInput.value = widthAfterAppRotation;
  rotated = !rotated;
  if ([...elements.sectionPresetSelect.options].some((option) => option.value === preRotatePresetId)) {
    elements.sectionPresetSelect.value = preRotatePresetId;
  }
  writeGrossProperties();
});

elements.materialSelect.addEventListener('change', () => {
  if (internalMaterialChange || !active) return;
  if (currentMaterial().family === 'steel') {
    populateCPurlinPresets(currentCPurlinPreset()?.id);
    refreshCPurlinUi();
    return;
  }
  const rectangleOption = [...elements.sectionTypeSelect.options].find((option) => option.value === 'rectangle');
  if (rectangleOption) rectangleOption.selected = true;
  exitCPurlinMode({ restorePresets: false });
  elements.sectionTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
});

elements.resetButton.addEventListener('click', () => {
  if (!active) return;
  exitCPurlinMode({ restorePresets: false });
});

new MutationObserver(() => {
  if (active) refreshCPurlinUi();
}).observe(elements.sectionSummary, { childList: true, subtree: true, characterData: true });
