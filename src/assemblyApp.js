import { MATERIALS } from './data/materials.js';
import { evaluateBuiltUpTimberAssembly } from './solver/builtUpTimberAssembly.js';

const $ = (id) => document.getElementById(id);
const materialSelect = $('assemblyMaterialSelect');
const arrangementSelect = $('assemblyArrangementSelect');
const plyCountSelect = $('assemblyPlyCountSelect');
const widthInput = $('assemblyWidthInput');
const depthInput = $('assemblyDepthInput');
const spanInput = $('assemblySpanInput');
const loadInput = $('assemblyLoadInput');
const etaInput = $('assemblyEtaInput');
const etaOutput = $('assemblyEtaOutput');
const etaEvidenceSelect = $('assemblyEtaEvidenceSelect');
const diagram = $('assemblyDiagram');
const resultCards = $('assemblyResultCards');
const calculationTrace = $('assemblyCalculationTrace');
const interpretation = $('assemblyInterpretation');
const sourceCard = $('assemblySourceCard');
const stateBanner = $('assemblyStateBanner');

const timberMaterials = MATERIALS.filter((m) => m.family === 'wood' && m.elasticModulusMPa > 0);
materialSelect.innerHTML = timberMaterials.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
materialSelect.value = timberMaterials.some((m) => m.id === 'coco-uh-2007-average') ? 'coco-uh-2007-average' : timberMaterials[0]?.id;

function selectedMaterial() {
  return timberMaterials.find((m) => m.id === materialSelect.value) ?? timberMaterials[0];
}

function n(value, digits = 2) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
}

function renderDiagram(result) {
  const { plyCount, arrangement } = result.section;
  const eta = result.eta;
  const stacked = arrangement === 'stacked-depth';
  const x0 = 310;
  const y0 = 70;
  const totalW = stacked ? 260 : 260;
  const totalH = stacked ? 150 : 100;
  const plyW = stacked ? totalW : totalW / plyCount;
  const plyH = stacked ? totalH / plyCount : totalH;
  const rects = [];
  for (let i = 0; i < plyCount; i += 1) {
    const x = stacked ? x0 : x0 + i * plyW;
    const y = stacked ? y0 + i * plyH : y0;
    rects.push(`<rect x="${x}" y="${y}" width="${plyW}" height="${plyH}" class="assembly-ply"/>`);
  }
  const connectorLines = stacked
    ? Array.from({ length: plyCount - 1 }, (_, i) => {
        const y = y0 + (i + 1) * plyH;
        return `<line x1="${x0 + 20}" y1="${y}" x2="${x0 + totalW - 20}" y2="${y}" class="assembly-interface"/>`;
      }).join('')
    : '';
  diagram.innerHTML = `
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
    <text x="30" y="42" class="assembly-label">${stacked ? 'STACKED THROUGH DEPTH' : 'SIDE-BY-SIDE'}</text>
    <text x="30" y="72" class="assembly-note">η = ${eta.toFixed(2)} · ${etaEvidenceSelect.options[etaEvidenceSelect.selectedIndex].text}</text>
    ${rects.join('')}${connectorLines}
    <line x1="440" y1="25" x2="440" y2="60" class="assembly-load" marker-end="url(#arrow)"/>
    <text x="455" y="42" class="assembly-load-text">P = ${n(result.loadKN, 3)} kN</text>
    <text x="310" y="245" class="assembly-note">Independent lower bound I = ${n(result.section.independentIxMm4, 0)} mm⁴</text>
    <text x="310" y="270" class="assembly-note">Effective I(η) = ${n(result.effectiveIxMm4, 0)} mm⁴</text>
    <text x="310" y="295" class="assembly-note">Full-composite upper bound I = ${n(result.section.fullCompositeIxMm4, 0)} mm⁴</text>`;
}

function card(label, value, sub = '') {
  return `<article class="result-card"><span>${label}</span><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ''}</article>`;
}

function render() {
  try {
    const material = selectedMaterial();
    const result = evaluateBuiltUpTimberAssembly({
      plyCount: Number(plyCountSelect.value),
      plyWidthMm: Number(widthInput.value),
      plyDepthMm: Number(depthInput.value),
      arrangement: arrangementSelect.value,
      eta: Number(etaInput.value),
      elasticModulusMPa: material.elasticModulusMPa,
      loadKN: Number(loadInput.value),
      spanM: Number(spanInput.value)
    });
    etaOutput.value = result.eta.toFixed(2);
    etaOutput.textContent = result.eta.toFixed(2);
    stateBanner.className = 'assembly-state';
    stateBanner.innerHTML = `<strong>SCREENING · bounded composite-action model</strong><span>η is ${etaEvidenceSelect.value === 'assumed' ? 'a sensitivity input, not a derived connection property' : 'user-declared evidence-backed; verify applicability'}.</span>`;
    renderDiagram(result);
    resultCards.innerHTML = [
      card('Independent-ply deflection', `${n(result.independentDeflectionMm)} mm`, 'η = 0 lower bound'),
      card('Effective deflection', `${n(result.effectiveDeflectionMm)} mm`, `η = ${result.eta.toFixed(2)}`),
      card('Full-composite deflection', `${n(result.fullCompositeDeflectionMm)} mm`, 'η = 1 upper bound'),
      card('Effective I', `${n(result.effectiveIxMm4, 0)} mm⁴`),
      card('Independent-ply stress', `${n(result.independentPlyStressMPa)} MPa`, 'each ply under equal load share'),
      card('Full-composite stress', `${n(result.fullCompositeStressMPa)} MPa`, 'perfectly bonded upper-bound section')
    ].join('');
    calculationTrace.innerHTML = `
      <p><b>Single ply:</b> I₁ = bh³/12 = ${n(result.section.singleIxMm4, 0)} mm⁴.</p>
      <p><b>Independent lower bound:</b> I_ind = nI₁ = ${n(result.section.independentIxMm4, 0)} mm⁴.</p>
      <p><b>Fully composite upper bound:</b> I_full = ${n(result.section.fullCompositeIxMm4, 0)} mm⁴ for the selected arrangement.</p>
      <p><b>Bounded interpolation:</b> I_eff = I_ind + η(I_full − I_ind) = ${n(result.effectiveIxMm4, 0)} mm⁴.</p>
      <p><b>Centre-load moment:</b> M_max = PL/4 = ${n(result.momentNmm / 1e6, 3)} kN·m.</p>
      <p><b>Elastic deflection:</b> δ = PL³/(48EI). Current δ_eff = ${n(result.effectiveDeflectionMm)} mm.</p>`;
    interpretation.innerHTML = `
      <p>${result.note}</p>
      <p>${result.section.compositeLeverageExists
        ? `At η=${result.eta.toFixed(2)}, the elastic deflection lies between the independent-ply and full-bond bounds. This does not prove the fasteners can transfer the required interface shear.`
        : 'For equal-depth side-by-side plies in this idealized major-axis bending model, simply increasing width makes independent and fully bonded EI identical; connector action does not create the depth leverage seen in stacked plies.'}</p>
      <p><b>Do not interpret the effective outer-fibre stress indicator as a code design stress for partial composite action.</b> A slip-compatible stress distribution requires a connection stiffness model.</p>`;
    sourceCard.innerHTML = `<strong>${material.name}</strong><p>E = ${n(material.elasticModulusMPa, 0)} MPa · ${material.source?.label ?? 'source unavailable'}</p><p>Material evidence and composite-action evidence are intentionally separate.</p>`;
  } catch (error) {
    stateBanner.className = 'assembly-state assembly-state--error';
    stateBanner.textContent = error.message;
    resultCards.innerHTML = '';
    calculationTrace.innerHTML = '';
    interpretation.innerHTML = '';
    sourceCard.innerHTML = '';
    diagram.innerHTML = '';
  }
}

for (const control of [materialSelect, arrangementSelect, plyCountSelect, widthInput, depthInput, spanInput, loadInput, etaInput, etaEvidenceSelect]) {
  control.addEventListener('input', render);
  control.addEventListener('change', render);
}

$('assemblyResetButton').addEventListener('click', () => {
  materialSelect.value = timberMaterials.some((m) => m.id === 'coco-uh-2007-average') ? 'coco-uh-2007-average' : timberMaterials[0]?.id;
  arrangementSelect.value = 'stacked-depth';
  plyCountSelect.value = '2';
  widthInput.value = '50';
  depthInput.value = '100';
  spanInput.value = '3';
  loadInput.value = '1';
  etaInput.value = '0';
  etaEvidenceSelect.value = 'assumed';
  render();
});

render();
