const elements = Object.fromEntries([
  'sectionTypeSelect', 'sectionPresetSelect', 'materialSelect', 'widthInput', 'depthInput',
  'thicknessInput', 'widthLabel', 'depthLabel', 'thicknessLabel', 'widthLabelText',
  'depthLabelText', 'thicknessLabelText', 'sectionSummary', 'columnModeButton', 'beamModeButton',
  'rotateSectionButton'
].map((id) => [id, document.getElementById(id)]));

if (Object.values(elements).some((node) => !node)) throw new Error('Angle-bar UI cannot find the Materials Lab controls.');

let syncingMaterial = false;

function isAngle() {
  return elements.sectionTypeSelect.value === 'angle';
}

function numberValue(element, fallback) {
  const value = Number(element.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function ensureSteelMaterial() {
  if (!isAngle() || syncingMaterial) return;
  const option = elements.materialSelect.selectedOptions?.[0];
  const looksSteel = option?.textContent?.toLowerCase().includes('steel');
  if (looksSteel) return;
  const baseline = [...elements.materialSelect.options].find((candidate) => candidate.value === 'steel-generic-250');
  if (!baseline) return;
  syncingMaterial = true;
  elements.materialSelect.value = baseline.value;
  elements.materialSelect.dispatchEvent(new Event('change', { bubbles: true }));
  syncingMaterial = false;
}

function ensureBoundaryNote() {
  let note = document.getElementById('angleBarBoundaryNote');
  if (!note) {
    note = document.createElement('div');
    note.id = 'angleBarBoundaryNote';
    note.className = 'support-help is-hidden';
    note.setAttribute('aria-live', 'polite');
    document.querySelector('.section-editor')?.append(note);
  }
  return note;
}

function renderAngleSummary() {
  if (!isAngle()) return;
  const b = numberValue(elements.widthInput, 50);
  const a = numberValue(elements.depthInput, 50);
  const t = numberValue(elements.thicknessInput, 3);
  elements.sectionSummary.innerHTML = `<strong>Solver uses:</strong> idealized sharp-corner steel angle A ${a.toFixed(1)} × B ${b.toFixed(1)} × t ${t.toFixed(2)} mm; gross centroidal x/y axes parallel to the legs.`;
}

function sync() {
  const angle = isAngle();
  const note = ensureBoundaryNote();
  note.classList.toggle('is-hidden', !angle);
  elements.columnModeButton.disabled = angle;

  if (!angle) return;
  ensureSteelMaterial();
  if (elements.columnModeButton.classList.contains('is-active')) elements.beamModeButton.click();

  elements.widthLabel.classList.remove('is-hidden');
  elements.depthLabel.classList.remove('is-hidden');
  elements.thicknessLabel.classList.remove('is-hidden');
  elements.widthLabelText.textContent = 'Horizontal angle leg B, mm';
  elements.depthLabelText.textContent = 'Vertical angle leg A, mm';
  elements.thicknessLabelText.textContent = 'Angle thickness t, mm';
  if (!(Number(elements.thicknessInput.value) > 0)) elements.thicknessInput.value = '3';

  note.innerHTML = `<strong>Angle-bar engineering boundary</strong><p>The beam solver derives gross A, centroid, Iₓ/Iᵧ and Zₓ/Zᵧ from the entered A×B×t as an idealized sharp-corner L section. Rolled root/toe radii are not inferred. For an actual market section, prefer verified published section properties when available.</p><p><strong>Column compression is intentionally disabled for angle bars in this release.</strong> A complete angle-column check needs principal-axis and torsional/flexural-torsional buckling treatment rather than reusing the simple rectangle/tube column model.</p>`;
  queueMicrotask(renderAngleSummary);
}

for (const control of [elements.sectionTypeSelect, elements.sectionPresetSelect, elements.materialSelect]) {
  control.addEventListener('change', () => queueMicrotask(sync));
}
for (const input of [elements.widthInput, elements.depthInput, elements.thicknessInput]) {
  input.addEventListener('input', () => queueMicrotask(() => {
    sync();
    renderAngleSummary();
  }));
}
elements.rotateSectionButton.addEventListener('click', () => queueMicrotask(() => {
  sync();
  renderAngleSummary();
}));

sync();
