import { sectionShapeKind } from '../data/sectionTaxonomy.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ringMarkup(preset, bamboo = false) {
  const diameter = preset.diameterMm ?? preset.widthMm ?? 100;
  const thickness = preset.thicknessMm ?? diameter * 0.12;
  const outer = 46;
  const inner = clamp(outer * (1 - 2 * thickness / diameter), 5, outer - 3);
  return `
    <circle cx="60" cy="58" r="${outer}" class="section-sketch__solid ${bamboo ? 'is-bamboo' : ''}" />
    <circle cx="60" cy="58" r="${inner}" class="section-sketch__void" />
    ${bamboo ? '<path d="M14 58 H106" class="section-sketch__node"/><circle cx="60" cy="58" r="3" class="section-sketch__node-dot"/>' : ''}
  `;
}

function rectangleMarkup(preset, hollow = false) {
  const width = preset.widthMm ?? 50;
  const depth = preset.depthMm ?? 100;
  const scale = Math.min(84 / width, 86 / depth);
  const w = clamp(width * scale, 24, 84);
  const h = clamp(depth * scale, 24, 86);
  const x = 60 - w / 2;
  const y = 58 - h / 2;
  const outer = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" class="section-sketch__solid" />`;
  if (!hollow) return outer;
  const thickness = preset.thicknessMm ?? 2;
  const inset = clamp(thickness * scale, 3, Math.min(w, h) / 3);
  return `${outer}<rect x="${x + inset}" y="${y + inset}" width="${Math.max(4, w - 2 * inset)}" height="${Math.max(4, h - 2 * inset)}" rx="1" class="section-sketch__void" />`;
}

function hMarkup(preset) {
  const width = preset.widthMm ?? 150;
  const depth = preset.depthMm ?? 300;
  const scale = Math.min(84 / width, 88 / depth);
  const w = clamp(width * scale, 36, 84);
  const h = clamp(depth * scale, 48, 88);
  const x = 60 - w / 2;
  const y = 58 - h / 2;
  const tf = clamp((preset.flangeThicknessMm ?? 10) * scale, 5, h / 4);
  const tw = clamp((preset.webThicknessMm ?? 7) * scale, 4, w / 4);
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${tf}" class="section-sketch__solid" />
    <rect x="${60 - tw / 2}" y="${y + tf}" width="${tw}" height="${Math.max(4, h - 2 * tf)}" class="section-sketch__solid" />
    <rect x="${x}" y="${y + h - tf}" width="${w}" height="${tf}" class="section-sketch__solid" />
  `;
}

function cMarkup(preset) {
  const depth = preset.purlinDepthMm ?? preset.depthMm ?? 100;
  const flange = preset.purlinFlangeMm ?? preset.widthMm ?? 50;
  const lip = preset.lipMm ?? 15;
  const thickness = preset.thicknessMm ?? 1.2;
  const scale = Math.min(72 / flange, 86 / depth);
  const w = clamp(flange * scale, 28, 72);
  const h = clamp(depth * scale, 38, 86);
  const lipPx = clamp(lip * scale, 7, h / 3);
  const tPx = clamp(thickness * scale, 3, 6);
  const x = 60 - w / 2;
  const y = 58 - h / 2;
  const rotatedBySolver = Number.isFinite(preset.purlinDepthMm)
    && Number.isFinite(preset.purlinFlangeMm)
    && Math.abs((preset.depthMm ?? preset.purlinDepthMm) - preset.purlinFlangeMm) < 1e-9
    && Math.abs((preset.widthMm ?? preset.purlinFlangeMm) - preset.purlinDepthMm) < 1e-9;
  const rawRotation = Number(preset.displayRotationDeg ?? (rotatedBySolver ? 90 : 0));
  const rotation = ((rawRotation % 360) + 360) % 360;
  return `<g transform="rotate(${rotation} 60 58)">
    <rect x="${x}" y="${y}" width="${tPx}" height="${h}" class="section-sketch__solid" />
    <rect x="${x}" y="${y}" width="${w}" height="${tPx}" class="section-sketch__solid" />
    <rect x="${x}" y="${y + h - tPx}" width="${w}" height="${tPx}" class="section-sketch__solid" />
    <rect x="${x + w - tPx}" y="${y}" width="${tPx}" height="${lipPx}" class="section-sketch__solid" />
    <rect x="${x + w - tPx}" y="${y + h - lipPx}" width="${tPx}" height="${lipPx}" class="section-sketch__solid" />
  </g>`;
}

export function sectionSketchSvg(preset, family, { title = preset?.label ?? 'Section sketch' } = {}) {
  const kind = sectionShapeKind(preset, family);
  let shape = '';
  if (kind === 'solid-rectangle') shape = rectangleMarkup(preset, false);
  else if (kind === 'rectangular-hollow') shape = rectangleMarkup(preset, true);
  else if (kind === 'pipe-ring') shape = ringMarkup(preset, false);
  else if (kind === 'bamboo-ring') shape = ringMarkup(preset, true);
  else if (kind === 'h-section') shape = hMarkup(preset);
  else if (kind === 'lipped-c') shape = cMarkup(preset);
  else shape = '<path d="M28 90 L28 26 L92 26 L92 90" class="section-sketch__catalog"/><text x="60" y="63" text-anchor="middle" class="section-sketch__question">A,I,Z</text>';

  return `<svg class="section-sketch" viewBox="0 0 120 118" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${shape}</svg>`;
}
