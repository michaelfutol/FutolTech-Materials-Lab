const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function text(svg, x, y, value, className = 'svg-label') {
  const node = svgElement('text', { x, y, class: className });
  node.textContent = value;
  svg.append(node);
}

function clear(svg) {
  [...svg.children].forEach((child) => {
    if (!['title', 'desc'].includes(child.tagName)) child.remove();
  });
}

function drawSupport(svg, x, y, type, orientation = 'horizontal') {
  if (type === 'free') return;
  const group = svgElement('g', { class: 'support-symbol' });
  if (type === 'fixed') {
    const line = orientation === 'horizontal'
      ? svgElement('line', { x1: x, y1: y - 28, x2: x, y2: y + 28 })
      : svgElement('line', { x1: x - 28, y1: y, x2: x + 28, y2: y });
    group.append(line);
  } else {
    const points = orientation === 'horizontal'
      ? `${x},${y} ${x - 18},${y + 24} ${x + 18},${y + 24}`
      : `${x},${y} ${x - 24},${y - 18} ${x - 24},${y + 18}`;
    group.append(svgElement('polygon', { points }));
    if (type === 'roller') {
      if (orientation === 'horizontal') {
        group.append(svgElement('circle', { cx: x - 8, cy: y + 31, r: 4 }));
        group.append(svgElement('circle', { cx: x + 8, cy: y + 31, r: 4 }));
      } else {
        group.append(svgElement('circle', { cx: x - 31, cy: y - 8, r: 4 }));
        group.append(svgElement('circle', { cx: x - 31, cy: y + 8, r: 4 }));
      }
    }
  }
  svg.append(group);
}

export function drawBeamDiagram(svg, { result, lengthM, loadPositionM, loadKN, leftSupport, rightSupport, magnification }) {
  clear(svg);
  const x0 = 90;
  const x1 = 810;
  const baselineY = 175;
  const scaleX = (x1 - x0) / lengthM;
  const maxVisible = 85;
  const maxComputed = Math.max(result.maxDeflectionMm, 0.001);
  const deflectionScale = Math.min(magnification, maxVisible / maxComputed);

  svg.append(svgElement('line', { x1: x0, y1: baselineY, x2: x1, y2: baselineY, class: 'reference-line' }));
  drawSupport(svg, x0, baselineY, leftSupport);
  drawSupport(svg, x1, baselineY, rightSupport);

  const path = result.deflectionSeries.map((point, index) => {
    const x = x0 + point.xM * scaleX;
    const y = baselineY - point.displacementMm * deflectionScale;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  svg.append(svgElement('path', { d: path, class: 'member-path' }));

  const loadX = x0 + loadPositionM * scaleX;
  svg.append(svgElement('line', { x1: loadX, y1: 55, x2: loadX, y2: 128, class: 'load-arrow' }));
  svg.append(svgElement('polygon', { points: `${loadX},140 ${loadX - 9},124 ${loadX + 9},124`, class: 'load-arrow-head' }));
  text(svg, loadX, 42, `${loadKN.toFixed(2)} kN`, 'svg-label svg-label--strong');
  text(svg, x0, 322, '0.00 m');
  text(svg, x1, 322, `${lengthM.toFixed(2)} m`, 'svg-label svg-label--end');
  text(svg, 450, 345, `Displayed deformation: ${magnification === 1 ? 'actual' : `×${magnification}`}`, 'svg-caption');
}

export function drawColumnDiagram(svg, { result, lengthM, loadKN, eccentricityMm, bottomSupport, topSupport, magnification }) {
  clear(svg);
  const x = 450;
  const yBottom = 300;
  const yTop = 65;
  const amplitude = Number.isFinite(result.amplification)
    ? Math.min(75, Math.max(4, result.loadRatio * 45 * magnification / 10 + eccentricityMm * 0.4))
    : 90;

  drawSupport(svg, x, yBottom, bottomSupport, 'vertical');
  drawSupport(svg, x, yTop, topSupport, 'vertical');
  svg.append(svgElement('line', { x1: x, y1: yTop, x2: x, y2: yBottom, class: 'reference-line' }));
  const direction = eccentricityMm === 0 ? 1 : Math.sign(eccentricityMm);
  const controlX = x + direction * amplitude;
  const path = `M ${x} ${yBottom} Q ${controlX} ${(yBottom + yTop) / 2} ${x} ${yTop}`;
  svg.append(svgElement('path', { d: path, class: 'member-path' }));

  const loadX = x + Math.min(60, eccentricityMm * 0.8);
  svg.append(svgElement('line', { x1: loadX, y1: 12, x2: loadX, y2: 44, class: 'load-arrow' }));
  svg.append(svgElement('polygon', { points: `${loadX},56 ${loadX - 9},40 ${loadX + 9},40`, class: 'load-arrow-head' }));
  text(svg, loadX + 18, 30, `${loadKN.toFixed(2)} kN`, 'svg-label svg-label--strong');
  text(svg, x + 45, 190, `KL/r = ${result.slenderness.toFixed(1)}`);
  text(svg, x + 45, 215, `K = ${result.k.toFixed(3)}`);
  text(svg, 450, 345, `Idealised ${result.governingAxis}-axis buckling shape over ${lengthM.toFixed(2)} m`, 'svg-caption');
}
