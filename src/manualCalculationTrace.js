import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { compareMemberCandidates } from './solver/memberComparison.js';
import { convertLoadToKN } from './solver/sectionRecommender.js';
import { sectionSketchSvg } from './components/sectionSketch.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];

function num(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function fmt(value, decimals = 3) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? null;
}

function presetById(material, id) {
  return presetsForFamily(material.family).find((preset) => preset.id === id) ?? null;
}

function activeSelectorCards() {
  return [...document.querySelectorAll('#compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
}

function orientationDegrees(card, orientationValue) {
  const select = card.querySelector('[data-slot-orientation]');
  const listed = Number(select?.selectedOptions?.[0]?.dataset?.orientationDeg);
  if (Number.isFinite(listed)) return ((listed % 360) + 360) % 360;
  return orientationValue === 'rotated' ? 90 : 0;
}

function currentBeamSnapshot() {
  const cards = activeSelectorCards();
  const selections = cards.map((card, index) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    const material = materialById(materialSelect?.value);
    const preset = material ? presetById(material, presetSelect?.value) : null;
    if (!material || !preset) throw new Error(`Manual calculation trace cannot resolve Member ${String.fromCharCode(65 + index)}.`);
    return {
      id: `member-${String.fromCharCode(97 + index)}`,
      label: `Member ${String.fromCharCode(65 + index)}`,
      material,
      preset,
      orientation: orientationSelect?.value === 'rotated' ? 'rotated' : 'listed',
      displayDegrees: orientationDegrees(card, orientationSelect?.value)
    };
  });

  const lengthM = num('compareLengthInput', 3);
  const loadKN = convertLoadToKN(num('compareLoadInput', 0), document.getElementById('compareLoadUnitSelect')?.value || 'kN');
  const loadPositionM = num('compareLoadPositionInput', lengthM / 2);
  const boundary = document.getElementById('compareBoundarySelect')?.value || 'simply-supported';
  const deflectionDivisor = num('compareDeflectionSelect', 360);
  const comparison = compareMemberCandidates({
    selections,
    lengthM,
    loadKN,
    loadPositionM,
    boundary,
    deflectionDivisor
  });

  return {
    selections,
    records: comparison.records,
    lengthM,
    loadKN,
    loadPositionM,
    boundary,
    deflectionDivisor
  };
}

function simplySupportedClosedForm({ Pn, Lmm, amm, E, I }) {
  const bmm = Lmm - amm;
  const leftReactionN = Lmm > 0 ? Pn * bmm / Lmm : 0;
  const rightReactionN = Lmm > 0 ? Pn * amm / Lmm : 0;
  const momentNmm = Lmm > 0 ? Pn * amm * bmm / Lmm : 0;
  const candidates = [];

  function deflectionAt(xmm) {
    if (xmm <= amm) {
      return Pn * bmm * xmm * (Lmm ** 2 - bmm ** 2 - xmm ** 2) / (6 * Lmm * E * I);
    }
    const smm = Lmm - xmm;
    return Pn * amm * smm * (Lmm ** 2 - amm ** 2 - smm ** 2) / (6 * Lmm * E * I);
  }

  if (amm >= 0 && amm <= Lmm) candidates.push({ xMm: amm, deflectionMm: Math.abs(deflectionAt(amm)) });
  const xLeft = Math.sqrt(Math.max(0, (Lmm ** 2 - bmm ** 2) / 3));
  if (xLeft >= 0 && xLeft <= amm + 1e-9) candidates.push({ xMm: xLeft, deflectionMm: Math.abs(deflectionAt(xLeft)) });
  const sRight = Math.sqrt(Math.max(0, (Lmm ** 2 - amm ** 2) / 3));
  const xRight = Lmm - sRight;
  if (xRight >= amm - 1e-9 && xRight <= Lmm) candidates.push({ xMm: xRight, deflectionMm: Math.abs(deflectionAt(xRight)) });
  const governing = candidates.sort((a, b) => b.deflectionMm - a.deflectionMm)[0] ?? { xMm: 0, deflectionMm: 0 };

  return {
    leftReactionN,
    rightReactionN,
    momentNmm,
    deflectionMm: governing.deflectionMm,
    deflectionXMm: governing.xMm,
    distanceFromFixedMm: null
  };
}

function cantileverClosedForm({ Pn, Lmm, amm, E, I, boundary }) {
  const distanceFromFixedMm = boundary === 'cantilever-right' ? Lmm - amm : amm;
  const d = Math.max(0, Math.min(Lmm, distanceFromFixedMm));
  return {
    leftReactionN: boundary === 'cantilever-left' ? Pn : 0,
    rightReactionN: boundary === 'cantilever-right' ? Pn : 0,
    momentNmm: Pn * d,
    deflectionMm: Pn * d ** 2 * (3 * Lmm - d) / (6 * E * I),
    deflectionXMm: boundary === 'cantilever-right' ? 0 : Lmm,
    distanceFromFixedMm: d
  };
}

function closedForm(snapshot, record) {
  const Pn = snapshot.loadKN * 1000;
  const Lmm = snapshot.lengthM * 1000;
  const amm = snapshot.loadPositionM * 1000;
  const E = record.materialSource ? record.section ? record.result ? record.family ? null : null : null : null : null;
  const material = materialById(record.materialId);
  const elasticModulusMPa = material?.elasticModulusMPa;
  const I = record.properties.ixMm4;
  if (!Number.isFinite(elasticModulusMPa) || !Number.isFinite(I) || I <= 0 || Lmm <= 0) return null;
  const args = { Pn, Lmm, amm, E: elasticModulusMPa, I };
  const response = snapshot.boundary === 'simply-supported'
    ? simplySupportedClosedForm(args)
    : cantileverClosedForm({ ...args, boundary: snapshot.boundary });
  return { ...response, elasticModulusMPa, Pn, Lmm, amm, bmm: Lmm - amm };
}

function cPurlinPropertyHtml(selection, record) {
  const base = selection.preset;
  const H = base.purlinDepthMm ?? base.depthMm;
  const B = base.purlinFlangeMm ?? base.widthMm;
  const A = base.lipMm;
  const t = base.thicknessMm;
  const deg = selection.displayDegrees;
  const major = deg % 180 === 0;
  const Iused = record.properties.ixMm4;
  const Zused = record.properties.zxMm3;
  return `
    <div class="ft-calc-block ft-calc-block--cpurlin">
      <div class="ft-calc-sketch">${sectionSketchSvg({ ...base, displayRotationDeg: deg }, selection.material.family, { title: `${selection.label} orientation ${deg} degrees` })}</div>
      <div>
        <p><strong>Gross lipped-C geometry:</strong> H=${fmt(H, 1)} mm, B=${fmt(B, 1)} mm, A=${fmt(A, 1)} mm, t=${fmt(t, 2)} mm.</p>
        <p class="ft-equation">A<sub>g</sub> = t(H + 2B + 2A) = ${fmt(t, 2)}[${fmt(H, 1)} + 2(${fmt(B, 1)}) + 2(${fmt(A, 1)})] = <strong>${fmt(base.areaMm2, 2)} mm²</strong></p>
        <p class="ft-equation">x̄ = Σ(A<sub>i</sub>x<sub>i</sub>)/ΣA<sub>i</sub> = <strong>${fmt(base.centroidXmm, 3)} mm</strong> from the web centreline.</p>
        <p class="ft-equation">I<sub>x</sub> = Σ[I<sub>x,i</sub> + A<sub>i</sub>(y<sub>i</sub>−ȳ)²] = <strong>${fmt(base.ixMm4, 0)} mm⁴</strong></p>
        <p class="ft-equation">I<sub>y</sub> = Σ[I<sub>y,i</sub> + A<sub>i</sub>(x<sub>i</sub>−x̄)²] = <strong>${fmt(base.iyMm4, 0)} mm⁴</strong></p>
        <p class="ft-equation">Z<sub>x</sub> = I<sub>x</sub>/(H/2) = <strong>${fmt(base.zxMm3, 0)} mm³</strong>; Z<sub>y</sub> = I<sub>y</sub>/c<sub>x</sub> = <strong>${fmt(base.zyMm3, 0)} mm³</strong></p>
        <p class="ft-axis-callout"><strong>Orientation ${deg}°:</strong> ${major ? 'major-axis gross screening' : 'minor-axis gross screening'} → I = ${fmt(Iused, 0)} mm⁴, Z = ${fmt(Zused, 0)} mm³.</p>
      </div>
    </div>`;
}

function genericPropertyHtml(selection, record) {
  const s = record.section;
  let formula = 'Catalog / calculated gross properties used directly by the elastic solver.';
  if (s.type === 'rectangle') formula = `I = bd³/12; Z = I/(d/2), with b=${fmt(s.widthMm, 1)} mm and d=${fmt(s.depthMm, 1)} mm.`;
  if (s.type === 'rhs') formula = `I = [bd³ − bᵢdᵢ³]/12; Z = I/(d/2), using outside dimensions and wall thickness t=${fmt(s.thicknessMm, 2)} mm.`;
  if (s.type === 'chs') formula = `I = π(D⁴−d⁴)/64; Z = I/(D/2), with D=${fmt(s.diameterMm, 1)} mm and t=${fmt(s.thicknessMm, 2)} mm.`;
  return `<div class="ft-calc-block"><div class="ft-calc-sketch">${sectionSketchSvg(record.section, selection.material.family)}</div><div><p><strong>${esc(record.sectionLabel.replace(/ —.*/, ''))}</strong></p><p>${formula}</p><p class="ft-equation">I used = <strong>${fmt(record.properties.ixMm4, 0)} mm⁴</strong>; Z used = <strong>${fmt(record.properties.zxMm3, 0)} mm³</strong>; A = <strong>${fmt(record.properties.areaMm2, 2)} mm²</strong>.</p></div></div>`;
}

function responseHtml(snapshot, selection, record) {
  const hand = closedForm(snapshot, record);
  const material = selection.material;
  if (!hand) return '<p>Closed-form verification unavailable for this member.</p>';
  const Z = record.properties.zxMm3;
  const sigmaHand = hand.momentNmm / Z;
  const momentHandKNm = hand.momentNmm / 1e6;
  const momentDiff = Math.abs(momentHandKNm - record.result.maxMomentKNm) / Math.max(Math.abs(momentHandKNm), 1e-9) * 100;
  const deflectionDiff = Math.abs(hand.deflectionMm - record.result.maxDeflectionMm) / Math.max(Math.abs(hand.deflectionMm), 1e-9) * 100;
  const limitMm = snapshot.lengthM * 1000 / snapshot.deflectionDivisor;
  const strengthReference = record.strengthReferenceMPa;
  const degree = selection.displayDegrees;
  const supportLine = snapshot.boundary === 'simply-supported'
    ? `R<sub>A</sub>=Pb/L=${fmt(hand.leftReactionN / 1000, 3)} kN; R<sub>B</sub>=Pa/L=${fmt(hand.rightReactionN / 1000, 3)} kN.`
    : `Distance from fixed support to load = ${fmt(hand.distanceFromFixedMm / 1000, 3)} m.`;
  const momentFormula = snapshot.boundary === 'simply-supported'
    ? `M<sub>max</sub>=Pab/L`
    : `M<sub>max</sub>=Pa<sub>fixed</sub>`;
  const deflectionFormula = snapshot.boundary === 'simply-supported'
    ? 'Exact point-load elastic curve evaluated at the stationary-deflection location.'
    : 'δmax = Pa²(3L−a)/(6EI) at the free end.';

  return `<article class="ft-calc-response-card">
    <div class="ft-calc-response-card__head"><div><span>${esc(selection.label)}</span><strong>${esc(record.sectionLabel.replace(/ —.*/, ''))}</strong></div><b>Orientation ${degree}°</b></div>
    <p class="ft-equation">P=${fmt(snapshot.loadKN, 4)} kN; L=${fmt(snapshot.lengthM, 3)} m; a=${fmt(snapshot.loadPositionM, 3)} m; b=${fmt(snapshot.lengthM - snapshot.loadPositionM, 3)} m; E=${fmt(material.elasticModulusMPa, 0)} MPa.</p>
    <p class="ft-equation">${supportLine}</p>
    <p class="ft-equation">${momentFormula} = <strong>${fmt(momentHandKNm, 5)} kN·m</strong>. FEM = ${fmt(record.result.maxMomentKNm, 5)} kN·m; difference = ${fmt(momentDiff, 3)}%.</p>
    <p class="ft-equation">σ = M/Z = ${fmt(hand.momentNmm, 0)} / ${fmt(Z, 0)} = <strong>${fmt(sigmaHand, 3)} MPa</strong>. FEM stress = ${fmt(record.result.maxBendingStressMPa, 3)} MPa.</p>
    <p class="ft-equation">${deflectionFormula} Hand check = <strong>${fmt(hand.deflectionMm, 3)} mm</strong> at x≈${fmt(hand.deflectionXMm / 1000, 3)} m. FEM nodal maximum = ${fmt(record.result.maxDeflectionMm, 3)} mm; difference = ${fmt(deflectionDiff, 3)}%.</p>
    <p class="ft-equation">Serviceability limit = L/${snapshot.deflectionDivisor} = ${fmt(limitMm, 3)} mm → use = <strong>${fmt(record.deflectionRatio * 100, 2)}%</strong>.</p>
    <p class="ft-equation">Strength reference = ${fmt(strengthReference, 3)} MPa → σ/reference = <strong>${fmt(record.strengthRatio * 100, 2)}%</strong>. ${record.screeningOnly ? '<b>C-purlin result remains gross-section SCREENING only.</b>' : record.pass ? '<b>Selected elastic checks pass.</b>' : '<b>One or more selected elastic checks fail.</b>'}</p>
  </article>`;
}

function makeSection(className, kicker, title, trailing) {
  const section = document.createElement('section');
  section.className = `ft-print-section ${className}`;
  section.innerHTML = `<div class="ft-section-head"><div><p class="ft-section-kicker">${kicker}</p><h2>${title}</h2></div>${trailing ? `<span>${trailing}</span>` : ''}</div>`;
  return section;
}

export function buildManualCalculationTrace() {
  const beamMode = document.getElementById('compareBeamModeButton')?.classList.contains('is-active');
  const propertiesSection = makeSection('ft-manual-calc', 'Calculation trace', 'Manual calculation — section properties', 'Same geometry and axes used by the solver');
  const responseSection = makeSection('ft-manual-calc', 'Calculation trace', 'Manual calculation — bending response', 'Closed-form hand check versus FEM result');

  if (!beamMode) {
    propertiesSection.insertAdjacentHTML('beforeend', '<div class="ft-final-note"><h3>Compression mode</h3><p>The detailed manual trace in this revision is implemented for beam bending. Compression remains governed by the column solver and the printed comparison schedule.</p></div>');
    responseSection.insertAdjacentHTML('beforeend', '<div class="ft-final-note"><h3>Planned extension</h3><p>A separate column trace will show Euler buckling, effective length, ASD/global-buckling screening, eccentricity amplification and shortening.</p></div>');
    return { propertiesSection, responseSection };
  }

  const snapshot = currentBeamSnapshot();
  const propertyGrid = document.createElement('div');
  propertyGrid.className = 'ft-calc-grid';
  snapshot.records.forEach((record, index) => {
    const selection = snapshot.selections[index];
    const wrapper = document.createElement('article');
    wrapper.className = 'ft-calc-card';
    wrapper.innerHTML = `<h3>${esc(selection.label)} — ${esc(record.displayMaterialName)}</h3>${record.productCategory === 'c-purlin' ? cPurlinPropertyHtml(selection, record) : genericPropertyHtml(selection, record)}`;
    propertyGrid.appendChild(wrapper);
  });
  propertiesSection.appendChild(propertyGrid);

  const common = document.createElement('div');
  common.className = 'ft-calc-common';
  common.innerHTML = `<strong>Common beam basis</strong><span>Euler-Bernoulli elastic bending · P=${fmt(snapshot.loadKN, 4)} kN · L=${fmt(snapshot.lengthM, 3)} m · load position a=${fmt(snapshot.loadPositionM, 3)} m · ${esc(snapshot.boundary)} · deflection criterion L/${snapshot.deflectionDivisor}</span>`;
  responseSection.appendChild(common);
  const responseGrid = document.createElement('div');
  responseGrid.className = 'ft-calc-response-grid';
  snapshot.records.forEach((record, index) => {
    const holder = document.createElement('div');
    holder.innerHTML = responseHtml(snapshot, snapshot.selections[index], record);
    responseGrid.appendChild(holder.firstElementChild);
  });
  responseSection.appendChild(responseGrid);

  const note = document.createElement('div');
  note.className = 'ft-final-note';
  note.innerHTML = '<h3>What this trace proves — and what it does not</h3><p>The hand check independently reproduces gross-section elastic bending response using the same geometry, axis and material stiffness. For C-purlins it does not constitute a complete cold-formed steel design: effective-width/local buckling, distortional buckling, lateral-torsional buckling, fastener restraint, roof-sheet bracing/diaphragm action and wind uplift still require the governing design method and project details.</p>';
  responseSection.appendChild(note);
  return { propertiesSection, responseSection };
}
