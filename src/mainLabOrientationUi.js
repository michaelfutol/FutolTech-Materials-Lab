const elements = Object.fromEntries([
  'sectionTypeSelect', 'sectionPresetSelect', 'materialSelect', 'widthInput', 'depthInput', 'thicknessInput', 'lipInput', 'rotateSectionButton', 'resetButton'
].map((id) => [id, document.getElementById(id)]));

if (Object.values(elements).some((node) => !node)) throw new Error('Section orientation UI cannot find the Materials Lab controls.');

let orientationDeg = 0;
let internalRotation = false;

function isCPurlin() {
  return elements.sectionTypeSelect.selectedOptions?.[0]?.dataset.sectionKind === 'c-purlin';
}

function sectionKind() {
  if (isCPurlin()) return 'c-purlin';
  return elements.sectionTypeSelect.value;
}

function dims() {
  return {
    width: Number(elements.widthInput.value) || 50,
    depth: Number(elements.depthInput.value) || 100,
    thickness: Number(elements.thicknessInput.value) || 1.5,
    lip: Number(elements.lipInput.value) || 15
  };
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function shapeMarkup(angle, compact = false) {
  const kind = sectionKind();
  const { width, depth, thickness, lip } = dims();
  const size = compact ? 54 : 110;
  const cx = size / 2;
  const cy = size / 2;
  const maxW = compact ? 31 : 60;
  const maxH = compact ? 33 : 68;
  const scale = Math.min(maxW / Math.max(width, 1), maxH / Math.max(depth, 1));
  const w = Math.max(compact ? 11 : 22, width * scale);
  const h = Math.max(compact ? 14 : 28, depth * scale);
  const x = cx - w / 2;
  const y = cy - h / 2;
  const line = compact ? 2 : 3;
  const marker = compact ? 3.6 : 6;
  let shape = '';

  if (kind === 'c-purlin') {
    const t = Math.max(line, thickness * scale);
    const l = Math.min(h * .32, Math.max(compact ? 5 : 9, lip * scale));
    shape = `<g fill="currentColor"><rect x="${x}" y="${y}" width="${t}" height="${h}"/><rect x="${x}" y="${y}" width="${w}" height="${t}"/><rect x="${x}" y="${y + h - t}" width="${w}" height="${t}"/><rect x="${x + w - t}" y="${y}" width="${t}" height="${l}"/><rect x="${x + w - t}" y="${y + h - l}" width="${t}" height="${l}"/></g>`;
  } else if (kind === 'rhs') {
    const inset = Math.max(3, Math.min(w, h) * .16);
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="none" stroke="currentColor" stroke-width="${line}"/><rect x="${x + inset}" y="${y + inset}" width="${Math.max(2, w - 2 * inset)}" height="${Math.max(2, h - 2 * inset)}" fill="none" stroke="currentColor" stroke-width="${line * .75}"/>`;
  } else if (kind === 'chs' || kind === 'round') {
    const r = Math.min(w, h) / 2;
    shape = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${kind === 'round' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${line}"/>`;
    if (kind === 'chs') shape += `<circle cx="${cx}" cy="${cy}" r="${Math.max(2, r - line * 2.2)}" fill="none" stroke="currentColor" stroke-width="${line * .75}"/>`;
  } else {
    shape = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="${line}"/>`;
  }

  const indicatorY = cy - h / 2 - (compact ? 3 : 5);
  const indicator = `<path d="M ${cx} ${indicatorY} l ${marker} ${marker * 1.15} h ${-marker * 2} z" fill="#ffd06a" stroke="#07131c" stroke-width=".5"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><g transform="rotate(${angle} ${cx} ${cy})">${shape}${indicator}</g></svg>`;
}

function orientationText(angle = orientationDeg) {
  if (isCPurlin()) {
    if (angle === 0) return '0° · web vertical · opening right · major-axis gross screening';
    if (angle === 90) return '90° · web horizontal · opening down · minor-axis gross screening';
    if (angle === 180) return '180° · web vertical · opening left · major-axis gross screening';
    return '270° · web horizontal · opening up · minor-axis gross screening';
  }
  const kind = sectionKind();
  if (kind === 'chs' || kind === 'round') return `${angle}° · circular section; bending properties are unchanged by rotation`;
  return `${angle}° section orientation${angle % 180 === 90 ? ' · alternate bending axis' : ' · original bending axis'}`;
}

function installStyle() {
  if (document.getElementById('orientationUiStyle')) return;
  const style = document.createElement('style');
  style.id = 'orientationUiStyle';
  style.textContent = `
    .orientation-panel{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;align-items:center;margin-top:12px;padding:12px;border:1px solid rgba(127,231,207,.24);border-radius:14px;background:rgba(7,23,33,.48)}.orientation-current{display:grid;place-items:center;min-height:112px;border:1px solid rgba(127,231,207,.18);border-radius:10px;background:rgba(255,255,255,.025);color:#dbe8e6}.orientation-current svg{width:104px;height:104px}.orientation-controls{display:grid;gap:8px}.orientation-controls>strong{font-size:.83rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.orientation-choices{display:grid;grid-template-columns:repeat(4,minmax(64px,1fr));gap:7px}.orientation-choice{display:grid;place-items:center;gap:2px;min-width:0;padding:7px 5px;border:1px solid rgba(127,231,207,.2);border-radius:10px;background:rgba(255,255,255,.025);color:var(--text);cursor:pointer}.orientation-choice svg{width:48px;height:48px;color:#dbe8e6}.orientation-choice span{font-weight:800;font-size:.76rem}.orientation-choice.is-active{border-color:#52d6b5;background:rgba(82,214,181,.12);box-shadow:inset 0 0 0 1px rgba(82,214,181,.16)}.orientation-description{margin:0;color:var(--muted);font-size:.82rem;line-height:1.4}.orientation-description strong{color:var(--text)}
    @media(max-width:680px){.orientation-panel{grid-template-columns:1fr}.orientation-current{min-height:96px}.orientation-choices{grid-template-columns:repeat(2,1fr)}}@media print{.orientation-panel{display:none!important}}
  `;
  document.head.appendChild(style);
}

function mount() {
  if (document.getElementById('sectionOrientationPanel')) return;
  installStyle();
  const actionRow = elements.rotateSectionButton.closest('.section-action-row');
  const panel = document.createElement('div');
  panel.id = 'sectionOrientationPanel';
  panel.className = 'orientation-panel';
  panel.innerHTML = `<div class="orientation-current" data-orientation-current></div><div class="orientation-controls"><strong>Section orientation</strong><div class="orientation-choices"></div><p class="orientation-description"></p></div>`;
  actionRow.insertAdjacentElement('afterend', panel);
  elements.rotateSectionButton.textContent = 'Rotate +90°';

  const choices = panel.querySelector('.orientation-choices');
  for (const angle of [0, 90, 180, 270]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'orientation-choice';
    button.dataset.angle = String(angle);
    button.innerHTML = `${shapeMarkup(angle, true)}<span>${angle}°</span>`;
    choices.appendChild(button);
  }

  function render() {
    document.documentElement.dataset.sectionOrientationDeg = String(orientationDeg);
    panel.querySelector('[data-orientation-current]').innerHTML = shapeMarkup(orientationDeg, false);
    panel.querySelector('.orientation-description').innerHTML = `<strong>Current:</strong> ${esc(orientationText())}. For symmetric sections, 0° ≡ 180° and 90° ≡ 270° structurally; the four views still preserve installation direction. C-purlin opening direction is shown explicitly.`;
    for (const choice of choices.querySelectorAll('.orientation-choice')) {
      const angle = Number(choice.dataset.angle);
      choice.classList.toggle('is-active', angle === orientationDeg);
      choice.innerHTML = `${shapeMarkup(angle, true)}<span>${angle}°</span>`;
    }
    elements.rotateSectionButton.textContent = `Rotate +90° · now ${orientationDeg}°`;
  }

  function reset() {
    orientationDeg = 0;
    render();
  }

  elements.rotateSectionButton.addEventListener('click', () => {
    orientationDeg = (orientationDeg + 90) % 360;
    render();
  });

  choices.addEventListener('click', (event) => {
    const target = event.target.closest('.orientation-choice');
    if (!target) return;
    const requested = Number(target.dataset.angle);
    const steps = ((requested - orientationDeg + 360) % 360) / 90;
    internalRotation = true;
    for (let index = 0; index < steps; index += 1) elements.rotateSectionButton.click();
    internalRotation = false;
    render();
  });

  for (const control of [elements.sectionTypeSelect, elements.sectionPresetSelect, elements.materialSelect]) {
    control.addEventListener('change', () => {
      if (!internalRotation) queueMicrotask(reset);
    });
  }
  for (const input of [elements.widthInput, elements.depthInput, elements.thicknessInput, elements.lipInput]) input.addEventListener('input', render);
  elements.resetButton.addEventListener('click', () => queueMicrotask(reset));
  render();
}

mount();
