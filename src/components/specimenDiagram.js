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

export function formatMagnificationLabel(value) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1) return value.toFixed(1).replace(/\.0$/, '');
  if (value >= 0.1) return value.toFixed(2).replace(/0$/, '');
  return value.toPrecision(2);
}

export function beamDeformationDisplayScale({
  x0,
  x1,
  lengthM,
  magnification,
  maxDeflectionMm,
  maxVisiblePx = 85
}) {
  if (lengthM <= 0) throw new Error('Beam display length must be greater than zero.');
  const basePxPerMm = (x1 - x0) / (lengthM * 1000);
  const requestedPxPerMm = basePxPerMm * magnification;
  const maxComputed = Math.max(maxDeflectionMm, 0.001);
  const cappedPxPerMm = maxVisiblePx / maxComputed;
  const pxPerMm = Math.min(requestedPxPerMm, cappedPxPerMm);
  return {
    pxPerMm,
    basePxPerMm,
    effectiveMagnification: pxPerMm / basePxPerMm,
    capped: pxPerMm < requestedPxPerMm - 1e-12
  };
}

export function drawBeamDiagram(svg, { result, lengthM, loadPositionM, loadKN, leftSupport, rightSupport, magnification }) {
  clear(svg);
  const x0 = 90;
  const x1 = 810;
  const baselineY = 175;
  const scaleX = (x1 - x0) / lengthM;
  const displayScale = beamDeformationDisplayScale({
    x0,
    x1,
    lengthM,
    magnification,
    maxDeflectionMm: result.maxDeflectionMm
  });

  svg.append(svgElement('line', { x1: x0, y1: baselineY, x2: x1, y2: baselineY, class: 'reference-line' }));
  drawSupport(svg, x0, baselineY, leftSupport);
  drawSupport(svg, x1, baselineY, rightSupport);

  const path = result.deflectionSeries.map((point, index) => {
    const x = x0 + point.xM * scaleX;
    const y = baselineY - point.displacementMm * displayScale.pxPerMm;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  svg.append(svgElement('path', { d: path, class: 'member-path' }));

  const peak = result.deflectionSeries.reduce((current, point) => (
    Math.abs(point.displacementMm) > Math.abs(current.displacementMm) ? point : current
  ), result.deflectionSeries[0]);
  const peakX = x0 + peak.xM * scaleX;
  const peakY = baselineY - peak.displacementMm * displayScale.pxPerMm;
  const direction = peak.displacementMm < -1e-9 ? 'downward ↓' : peak.displacementMm > 1e-9 ? 'upward ↑' : 'zero';
  svg.append(svgElement('line', { x1: peakX, y1: baselineY, x2: peakX, y2: peakY, class: 'deflection-marker' }));
  svg.append(svgElement('circle', { cx: peakX, cy: peakY, r: 5, class: 'deflection-point' }));

  const loadX = x0 + loadPositionM * scaleX;
  const loadGroup = svgElement('g', {
    class: 'load-handle',
    'data-x0': x0,
    'data-x1': x1,
    'data-length-m': lengthM,
    role: 'button',
    'aria-label': `Point load at ${loadPositionM.toFixed(2)} metres. Drag horizontally to move.`
  });
  loadGroup.append(svgElement('line', { x1: loadX, y1: 45, x2: loadX, y2: 145, class: 'load-hitbox' }));
  loadGroup.append(svgElement('line', { x1: loadX, y1: 55, x2: loadX, y2: 128, class: 'load-arrow' }));
  loadGroup.append(svgElement('polygon', { points: `${loadX},140 ${loadX - 9},124 ${loadX + 9},124`, class: 'load-arrow-head' }));
  svg.append(loadGroup);
  text(svg, loadX, 42, `${loadKN.toFixed(2)} kN`, 'svg-label svg-label--strong load-value-label');
  text(svg, x0, 322, '0.00 m');
  text(svg, x1, 322, `${lengthM.toFixed(2)} m`, 'svg-label svg-label--end');
  text(svg, 450, 282, `Physical deflection: ${direction} · maximum ${result.maxDeflectionMm.toFixed(3)} mm`, 'svg-direction-label');

  const displayLabel = displayScale.capped
    ? `requested ×${magnification}, capped at ×${formatMagnificationLabel(displayScale.effectiveMagnification)}`
    : magnification === 1
      ? 'true geometric deformation ×1'
      : `true geometric deformation ×${magnification}`;
  text(svg, 450, 345, `Dashed = undeformed · turquoise = deformed · ${displayLabel} · drag load arrow`, 'svg-caption');
}

export function drawColumnDiagram(svg, { result, lengthM, loadKN, eccentricityMm, bottomSupport, topSupport, magnification }) {
  clear(svg);
  const x = 450;
  const yBottom = 300;
  const yTop = 65;
  const amplitude = Number.isFinite(result.amplification)
    ? Math.min(75, Math.max(4, result.loadRatio * 45 * magnification / 10 + Math.abs(eccentricityMm) * 0.4))
    : 90;

  drawSupport(svg, x, yBottom, bottomSupport, 'vertical');
  drawSupport(svg, x, yTop, topSupport, 'vertical');
  svg.append(svgElement('line', { x1: x, y1: yTop, x2: x, y2: yBottom, class: 'reference-line' }));
  const direction = eccentricityMm === 0 ? 1 : Math.sign(eccentricityMm);
  const controlX = x + direction * amplitude;
  const path = `M ${x} ${yBottom} Q ${controlX} ${(yBottom + yTop) / 2} ${x} ${yTop}`;
  svg.append(svgElement('path', { d: path, class: 'member-path' }));

  const loadOffset = Math.max(-60, Math.min(60, eccentricityMm * 0.8));
  const loadX = x + loadOffset;
  svg.append(svgElement('line', { x1: loadX, y1: 12, x2: loadX, y2: 44, class: 'load-arrow' }));
  svg.append(svgElement('polygon', { points: `${loadX},56 ${loadX - 9},40 ${loadX + 9},40`, class: 'load-arrow-head' }));
  text(svg, loadX + (loadOffset >= 0 ? 18 : -18), 30, `${loadKN.toFixed(2)} kN`, 'svg-label svg-label--strong');
  text(svg, x + 45, 190, `KL/r = ${result.slenderness.toFixed(1)}`);
  text(svg, x + 45, 215, `K = ${result.k.toFixed(3)}`);
  text(svg, 450, 345, `Idealised schematic buckling shape · display multiplier ×${magnification} · ${result.governingAxis}-axis · ${lengthM.toFixed(2)} m`, 'svg-caption');
}
