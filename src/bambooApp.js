import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { solveTaperedCulmBeam, culmProperties } from './solver/taperedCulmBeam.js';
import { convertLoadToKN } from './solver/sectionRecommender.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const material = PH_BAMBOO_MATERIALS[0];
const ids = [
  'bambooLengthInput', 'bambooDirectionSelect', 'bambooBoundarySelect', 'bambooDeflectionSelect',
  'bambooLoadInput', 'bambooLoadUnitSelect', 'bambooLoadPositionInput', 'bambooECaseSelect',
  'bambooButtDiameterInput', 'bambooButtThicknessInput', 'bambooMiddleDiameterInput',
  'bambooMiddleThicknessInput', 'bambooTopDiameterInput', 'bambooTopThicknessInput',
  'bambooLoadEquivalent', 'bambooErrorBanner', 'bambooStateBanner', 'bambooDiagram',
  'bambooResultCards', 'bambooGeometryResults', 'bambooInterpretation', 'bambooResetButton'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function numeric(element) { return Number(element.value); }
function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function supports(boundary) {
  if (boundary === 'cantilever-left') return { leftSupport: 'fixed', rightSupport: 'free' };
  if (boundary === 'cantilever-right') return { leftSupport: 'free', rightSupport: 'fixed' };
  return { leftSupport: 'pin', rightSupport: 'roller' };
}

function measuredGeometry() {
  return {
    butt: { diameterMm: numeric(elements.bambooButtDiameterInput), thicknessMm: numeric(elements.bambooButtThicknessInput) },
    middle: { diameterMm: numeric(elements.bambooMiddleDiameterInput), thicknessMm: numeric(elements.bambooMiddleThicknessInput) },
    top: { diameterMm: numeric(elements.bambooTopDiameterInput), thicknessMm: numeric(elements.bambooTopThicknessInput) }
  };
}

function stationsFor(lengthM) {
  const geometry = measuredGeometry();
  const leftToRight = elements.bambooDirectionSelect.value === 'butt-left'
    ? [geometry.butt, geometry.middle, geometry.top]
    : [geometry.top, geometry.middle, geometry.butt];
  return [
    { xM: 0, ...leftToRight[0], stationName: elements.bambooDirectionSelect.value === 'butt-left' ? 'butt' : 'top' },
    { xM: lengthM / 2, ...leftToRight[1], stationName: 'middle' },
    { xM: lengthM, ...leftToRight[2], stationName: elements.bambooDirectionSelect.value === 'butt-left' ? 'top' : 'butt' }
  ];
}

function elasticModulus() {
  return elements.bambooECaseSelect.value === 'minimum'
    ? material.minimumElasticModulusMPa
    : material.elasticModulusMPa;
}

function resultCard(label, value, note = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${note ? `<small>${note}</small>` : ''}</article>`;
}

function svgElement(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function addText(svg, x, y, content, className = 'bamboo-svg-label', anchor = 'start') {
  const node = svgElement('text', { x, y, class: className, 'text-anchor': anchor });
  node.textContent = content;
  svg.appendChild(node);
}

function drawSupport(svg, x, y, type) {
  if (type === 'free') return;
  if (type === 'fixed') {
    svg.appendChild(svgElement('line', { x1: x, y1: y - 25, x2: x, y2: y + 28, stroke: '#dbe8ef', 'stroke-width': 5 }));
    for (let offset = -22; offset <= 22; offset += 9) svg.appendChild(svgElement('line', { x1: x - 12, y1: y + offset + 7, x2: x, y2: y + offset, stroke: '#7f96a4', 'stroke-width': 2 }));
    return;
  }
  svg.appendChild(svgElement('polygon', { points: `${x},${y + 5} ${x - 22},${y + 34} ${x + 22},${y + 34}`, fill: 'none', stroke: '#dbe8ef', 'stroke-width': 3 }));
  if (type === 'roller') {
    svg.appendChild(svgElement('circle', { cx: x - 10, cy: y + 42, r: 5, fill: 'none', stroke: '#dbe8ef', 'stroke-width': 3 }));
    svg.appendChild(svgElement('circle', { cx: x + 10, cy: y + 42, r: 5, fill: 'none', stroke: '#dbe8ef', 'stroke-width': 3 }));
  }
}

function linePath(points, xScale, yTransform) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.xM).toFixed(2)} ${yTransform(point).toFixed(2)}`).join(' ');
}

function drawDiagram(result, loadKN, loadPositionM, boundary) {
  const svg = elements.bambooDiagram;
  svg.replaceChildren();
  const x0 = 70;
  const x1 = 830;
  const baselineY = 190;
  const spanPx = x1 - x0;
  const xScale = (xM) => x0 + spanPx * xM / result.stations.at(-1).xM;
  const truePxPerMm = spanPx / (result.stations.at(-1).xM * 1000);
  const desiredMagnification = 50;
  const rawPeakPx = result.maxDeflectionMm * truePxPerMm * desiredMagnification;
  const effectiveMagnification = rawPeakPx > 95 && rawPeakPx > 0 ? desiredMagnification * 95 / rawPeakPx : desiredMagnification;
  const displacementPx = (point) => point.displacementMm * truePxPerMm * effectiveMagnification;
  const yCenter = (point) => baselineY - displacementPx(point);
  const maxDiameter = Math.max(...result.deflectionSeries.map((point) => point.diameterMm));
  const radiusPx = (point) => 8 + 12 * point.diameterMm / maxDiameter;

  svg.appendChild(svgElement('path', { d: `M ${x0} ${baselineY} L ${x1} ${baselineY}`, class: 'bamboo-undeformed' }));
  const upperPath = linePath(result.deflectionSeries, xScale, (point) => yCenter(point) - radiusPx(point));
  const lowerPath = linePath([...result.deflectionSeries].reverse(), xScale, (point) => yCenter(point) + radiusPx(point));
  svg.appendChild(svgElement('path', { d: `${upperPath} ${lowerPath.replace(/^M/, 'L')} Z`, class: 'bamboo-outer' }));
  svg.appendChild(svgElement('path', { d: linePath(result.deflectionSeries, xScale, yCenter), class: 'bamboo-centerline' }));

  for (const station of result.stations) {
    const nearest = result.deflectionSeries.reduce((best, point) => Math.abs(point.xM - station.xM) < Math.abs(best.xM - station.xM) ? point : best, result.deflectionSeries[0]);
    const x = xScale(station.xM);
    const y = yCenter(nearest);
    const r = radiusPx(nearest);
    svg.appendChild(svgElement('line', { x1: x, y1: y - r, x2: x, y2: y + r, class: 'bamboo-station-mark' }));
    addText(svg, x, y + r + 25, `${station.stationName}: Ø${format(station.diameterMm, 1)} / t${format(station.thicknessMm, 1)}`, 'bamboo-svg-label', 'middle');
  }

  const supportTypes = supports(boundary);
  drawSupport(svg, x0, baselineY, supportTypes.leftSupport);
  drawSupport(svg, x1, baselineY, supportTypes.rightSupport);

  const loadX = xScale(loadPositionM);
  svg.appendChild(svgElement('line', { x1: loadX, y1: 70, x2: loadX, y2: 135, class: 'bamboo-load' }));
  svg.appendChild(svgElement('polygon', { points: `${loadX},148 ${loadX - 11},130 ${loadX + 11},130`, fill: '#ffc75f' }));
  addText(svg, loadX, 55, `${formatLoadEquivalents(loadKN)}`, 'bamboo-load-label', 'middle');

  const criticalPoint = result.deflectionSeries.reduce((best, point) => Math.abs(point.xM - result.maxStressXM) < Math.abs(best.xM - result.maxStressXM) ? point : best, result.deflectionSeries[0]);
  const criticalX = xScale(criticalPoint.xM);
  const criticalY = yCenter(criticalPoint);
  svg.appendChild(svgElement('circle', { cx: criticalX, cy: criticalY, r: 7, class: 'bamboo-critical' }));
  addText(svg, criticalX + 12, criticalY - 12, 'max bending stress', 'bamboo-critical-label');

  addText(svg, x0, 355, '0.00 m');
  addText(svg, x1, 355, `${format(result.stations.at(-1).xM, 2)} m`, 'bamboo-svg-label', 'end');
  addText(svg, 450, 385, `Calculated variable-EI centerline · deflection display ≈ ×${format(effectiveMagnification, 1)} · culm width schematic`, 'bamboo-svg-label', 'middle');
}

function renderState(result, loadKN, deflectionLimitMm) {
  const stressRatio = result.maxBendingStressMPa / material.bendingReferenceMPa;
  const characteristicRatio = result.maxBendingStressMPa / material.ultimateBendingMPa;
  const deflectionRatio = result.maxDeflectionMm / deflectionLimitMm;
  let className = 'bamboo-state bamboo-state--pass';
  let title = 'ELASTIC COMPARISON RANGE';
  let text = 'The selected culm remains below the study permissible bending reference and the selected deflection limit.';
  if (characteristicRatio >= 1) {
    className = 'bamboo-state bamboo-state--danger';
    title = 'CHARACTERISTIC BENDING THRESHOLD EXCEEDED';
    text = 'Fracture, splitting, local crushing, or another brittle limit may govern. The elastic curve must not be interpreted as valid post-failure behavior.';
  } else if (stressRatio > 1 || deflectionRatio > 1) {
    className = 'bamboo-state bamboo-state--warn';
    title = stressRatio > 1 ? 'PERMISSIBLE BENDING REFERENCE EXCEEDED' : 'DEFLECTION LIMIT EXCEEDED';
    text = 'The specimen is outside the selected preliminary acceptance range even though the elastic solver can still draw a mathematical curve.';
  } else if (Math.max(stressRatio, deflectionRatio) > 0.75) {
    className = 'bamboo-state bamboo-state--warn';
    title = 'APPROACHING FIRST LIMIT';
    text = 'The selected case is above 75% of its governing preliminary limit. Actual culm variability and connection effects may reduce available margin.';
  }
  elements.bambooStateBanner.className = className;
  elements.bambooStateBanner.innerHTML = `<p class="eyebrow">Live culm state</p><h3>${title}</h3><p>${text}</p>`;
  if (loadKN === 0) elements.bambooStateBanner.innerHTML = '<p class="eyebrow">Live culm state</p><h3>ZERO LOAD</h3><p>Enter a positive load to calculate bending response and threshold estimates.</p>';
}

function render() {
  try {
    elements.bambooErrorBanner.classList.add('is-hidden');
    const lengthM = numeric(elements.bambooLengthInput);
    const loadKN = convertLoadToKN(numeric(elements.bambooLoadInput), elements.bambooLoadUnitSelect.value);
    const loadPositionM = numeric(elements.bambooLoadPositionInput);
    elements.bambooLoadPositionInput.max = String(lengthM);
    elements.bambooLoadEquivalent.textContent = `Applied load: ${formatLoadEquivalents(loadKN)}`;
    const boundary = elements.bambooBoundarySelect.value;
    const result = solveTaperedCulmBeam({
      lengthM,
      elasticModulusMPa: elasticModulus(),
      densityKgM3: material.densityKgM3,
      stations: stationsFor(lengthM),
      ...supports(boundary),
      pointLoads: [{ xM: loadPositionM, forceKN: loadKN }]
    });
    const deflectionDivisor = numeric(elements.bambooDeflectionSelect);
    const deflectionLimitMm = lengthM * 1000 / deflectionDivisor;
    const permissibleLoadKN = result.maxBendingStressMPa > 0 ? loadKN * material.bendingReferenceMPa / result.maxBendingStressMPa : null;
    const characteristicLoadKN = result.maxBendingStressMPa > 0 ? loadKN * material.ultimateBendingMPa / result.maxBendingStressMPa : null;
    const stressUse = result.maxBendingStressMPa / material.bendingReferenceMPa;

    renderState(result, loadKN, deflectionLimitMm);
    drawDiagram(result, loadKN, loadPositionM, boundary);
    elements.bambooResultCards.innerHTML = [
      resultCard('Maximum deflection', `${format(result.maxDeflectionMm, 3)} mm`, `at x = ${format(result.peakDeflectionXM, 2)} m · L/${deflectionDivisor} = ${format(deflectionLimitMm, 2)} mm`),
      resultCard('Maximum bending stress', `${format(result.maxBendingStressMPa, 2)} MPa`, `${format(stressUse * 100, 1)}% of 7.7 MPa permissible reference · x = ${format(result.maxStressXM, 2)} m`),
      resultCard('Permissible-load estimate', permissibleLoadKN == null ? '—' : formatLoadEquivalents(permissibleLoadKN), 'linear scaling to 7.7 MPa'),
      resultCard('Characteristic-load estimate', characteristicLoadKN == null ? '—' : formatLoadEquivalents(characteristicLoadKN), 'linear scaling to 34.6 MPa; not a safe design load'),
      resultCard('Support reactions', `${format(result.leftReactionKN, 3)} / ${format(result.rightReactionKN, 3)} kN`, 'left / right, upward positive'),
      resultCard('Estimated culm mass', `${format(result.totalMassKg, 2)} kg`, 'integrated from tapered hollow geometry')
    ].join('');

    const geometry = measuredGeometry();
    const butt = culmProperties(geometry.butt.diameterMm, geometry.butt.thicknessMm);
    const middle = culmProperties(geometry.middle.diameterMm, geometry.middle.thicknessMm);
    const top = culmProperties(geometry.top.diameterMm, geometry.top.thicknessMm);
    elements.bambooGeometryResults.innerHTML = [
      ['Direction', elements.bambooDirectionSelect.value === 'butt-left' ? 'Butt → top, left to right' : 'Top → butt, left to right'],
      ['Butt area / I', `${format(butt.areaMm2, 0)} mm² / ${format(butt.inertiaMm4, 0)} mm⁴`],
      ['Middle area / I', `${format(middle.areaMm2, 0)} mm² / ${format(middle.inertiaMm4, 0)} mm⁴`],
      ['Top area / I', `${format(top.areaMm2, 0)} mm² / ${format(top.inertiaMm4, 0)} mm⁴`],
      ['Diameter taper', `${format(geometry.butt.diameterMm - geometry.top.diameterMm, 1)} mm butt-to-top`],
      ['E used', `${format(elasticModulus() / 1000, 1)} GPa`]
    ].map(([term, detail]) => `<div><dt>${term}</dt><dd>${detail}</dd></div>`).join('');

    elements.bambooInterpretation.innerHTML = `
      <p>BC-001 subdivides the culm into short beam elements. Each element receives its own hollow-circular <strong>A, I, and Z</strong> from the linearly interpolated outside diameter and wall thickness.</p>
      <p>The maximum stress need not occur exactly at maximum moment because the culm section modulus changes along its length. Reversing butt and top can therefore change the governing stress and deflection.</p>
      <p>The present permissible and characteristic load estimates scale the elastic point-load result. They do not account for shear, nodes, splitting, ovality, crookedness, treatment damage, moisture, bearing, or connections.</p>
      <p><strong>No snap animation yet in BC-001:</strong> exceeding characteristic bending triggers a danger state, but physical fracture requires the future bamboo damage and joint model.</p>`;
  } catch (error) {
    elements.bambooErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.bambooErrorBanner.classList.remove('is-hidden');
    elements.bambooStateBanner.innerHTML = '';
    elements.bambooResultCards.innerHTML = '';
    elements.bambooGeometryResults.innerHTML = '';
    elements.bambooInterpretation.innerHTML = '<p>Correct the specimen measurements or boundary/load inputs before analysis can continue.</p>';
    elements.bambooDiagram.replaceChildren();
  }
}

function syncBoundary() {
  const lengthM = numeric(elements.bambooLengthInput);
  if (elements.bambooBoundarySelect.value === 'cantilever-left') elements.bambooLoadPositionInput.value = String(lengthM);
  else if (elements.bambooBoundarySelect.value === 'cantilever-right') elements.bambooLoadPositionInput.value = '0';
  else if (numeric(elements.bambooLoadPositionInput) > lengthM) elements.bambooLoadPositionInput.value = String(lengthM / 2);
}

function reset() {
  elements.bambooLengthInput.value = '3';
  elements.bambooDirectionSelect.value = 'butt-left';
  elements.bambooBoundarySelect.value = 'simply-supported';
  elements.bambooDeflectionSelect.value = '360';
  elements.bambooLoadInput.value = '100';
  elements.bambooLoadUnitSelect.value = 'kgf';
  elements.bambooLoadPositionInput.value = '1.5';
  elements.bambooECaseSelect.value = 'mean';
  elements.bambooButtDiameterInput.value = '94';
  elements.bambooButtThicknessInput.value = '24';
  elements.bambooMiddleDiameterInput.value = '91.2';
  elements.bambooMiddleThicknessInput.value = '10';
  elements.bambooTopDiameterInput.value = '80.9';
  elements.bambooTopThicknessInput.value = '7';
  render();
}

for (const id of ids.filter((id) => id.endsWith('Input') || id.endsWith('Select'))) {
  elements[id]?.addEventListener('input', render);
  elements[id]?.addEventListener('change', render);
}
elements.bambooLengthInput.addEventListener('change', () => { syncBoundary(); render(); });
elements.bambooBoundarySelect.addEventListener('change', () => { syncBoundary(); render(); });
elements.bambooResetButton.addEventListener('click', reset);
reset();
