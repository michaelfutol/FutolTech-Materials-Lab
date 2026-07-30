import { presetsForFamily } from '../data/sectionPresets.js';

const presetSelect = document.getElementById('yieldSectionPresetSelect');
const widthInput = document.getElementById('yieldWidthInput');
const depthInput = document.getElementById('yieldDepthInput');
const thicknessInput = document.getElementById('yieldThicknessInput');
const rotateButton = document.getElementById('yieldRotateSectionButton');
const resetButton = document.getElementById('yieldResetButton');

if (!presetSelect || !widthInput || !depthInput || !thicknessInput || !rotateButton) {
  throw new Error('NL-001 section preset controls are incomplete.');
}

const presets = presetsForFamily('steel');
presetSelect.innerHTML = presets
  .map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
  .join('');

let applyingPreset = false;

function dispatchSectionInput() {
  widthInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function dimensionsMatch(preset) {
  if (!preset || preset.id === 'custom') return false;
  return Math.abs(Number(widthInput.value) - preset.widthMm) < 1e-9
    && Math.abs(Number(depthInput.value) - preset.depthMm) < 1e-9
    && Math.abs(Number(thicknessInput.value) - preset.thicknessMm) < 1e-9;
}

function syncPresetFromDimensions() {
  if (applyingPreset) return;
  const match = presets.find(dimensionsMatch);
  presetSelect.value = match?.id ?? 'custom';
}

function applyPreset() {
  const preset = presets.find((candidate) => candidate.id === presetSelect.value);
  if (!preset || preset.id === 'custom') return;
  applyingPreset = true;
  widthInput.value = String(preset.widthMm);
  depthInput.value = String(preset.depthMm);
  thicknessInput.value = String(preset.thicknessMm);
  applyingPreset = false;
  dispatchSectionInput();
}

presetSelect.addEventListener('change', applyPreset);
for (const input of [widthInput, depthInput, thicknessInput]) {
  input.addEventListener('input', syncPresetFromDimensions);
  input.addEventListener('change', syncPresetFromDimensions);
}

rotateButton.addEventListener('click', () => {
  const width = widthInput.value;
  widthInput.value = depthInput.value;
  depthInput.value = width;
  syncPresetFromDimensions();
  dispatchSectionInput();
});

resetButton?.addEventListener('click', () => requestAnimationFrame(syncPresetFromDimensions));
syncPresetFromDimensions();
