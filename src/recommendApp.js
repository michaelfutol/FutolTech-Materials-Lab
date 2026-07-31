import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { SECTION_PRESETS } from './data/sectionPresets.js';
import { convertLoadToKN, recommendMemberSections } from './solver/sectionRecommender.js';
import { solveMemberSelectionQubo } from './solver/quboMemberSelector.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const RECOMMENDER_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];

const ids = [
  'recommendFamilySelect', 'recommendObjectiveSelect', 'recommendEngineSelect', 'recommendLengthInput',
  'recommendBoundarySelect', 'recommendLoadInput', 'recommendLoadUnitSelect',
  'recommendLoadPositionInput', 'recommendDeflectionSelect', 'recommendResetButton',
  'recommendErrorBanner', 'recommendSummary', 'recommendQuboReport', 'recommendTableBody', 'recommendSourceNote'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function numeric(element) { return Number(element.value); }
function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function objectiveCopy(objective, engine = 'classical') {
  const quboPrefix = engine === 'qubo' ? 'QUBO-selected · ' : '';
  if (objective === 'utilisation') {
    return {
      eyebrow: `${quboPrefix}Lowest-utilisation passing option`,
      badge: engine === 'qubo' ? 'QUBO · LOWEST USE' : 'BEST · LOWEST USE',
      explanation: 'lowest governing strength/deflection utilisation'
    };
  }
  return {
    eyebrow: `${quboPrefix}Lightest passing option`,
    badge: engine === 'qubo' ? 'QUBO · LIGHTEST PASS' : 'BEST · LIGHTEST PASS',
    explanation: 'minimum member mass among the passing listed candidates'
  };
}

function statusBadge(candidate, isBest, objective, engine) {
  if (isBest) return `<span class="recommend-badge recommend-badge--best">${objectiveCopy(objective, engine).badge}</span>`;
  if (candidate.pass) return '<span class="recommend-badge recommend-badge--pass">PASS</span>';
  if (!candidate.stockPass) return '<span class="recommend-badge recommend-badge--splice">SPLICE</span>';
  return '<span class="recommend-badge recommend-badge--fail">FAIL</span>';
}

function physicalThresholdLabel(candidate) {
  if (candidate.family === 'steel') return 'yield est.';
  if (candidate.family === 'bamboo') return 'characteristic bending est.';
  return 'rupture est.';
}

function libraryHref(candidate) {
  return `./library.html?section=${encodeURIComponent(candidate.librarySectionId)}`;
}

function quboReportHtml(qubo, objective) {
  if (!qubo?.selectedCandidate) {
    return '<p class="eyebrow">Local QUBO result</p><strong>No valid one-member state selected</strong><p>Review the QUBO penalties and candidate window.</p>';
  }
  const selected = qubo.selectedCandidate;
  const objectiveLabel = objective === 'utilisation' ? 'governing utilisation' : 'member mass';
  return `<p class="eyebrow">QUBO-001 · local exact binary solve</p>
    <strong>${qubo.agreesWithClassical ? 'QUBO agrees with classical optimum' : 'QUBO result differs from classical ranking'}</strong>
    <p>${qubo.pool.length} binary variables; ${format(qubo.statesEvaluated, 0)} states evaluated; exactly-one penalty ${format(qubo.penalties.exactlyOnePenalty, 1)}; infeasible-selection penalty ${format(qubo.penalties.infeasiblePenalty, 1)}.</p>
    <p>Selected <b>${selected.sectionLabel}</b> with ${objectiveLabel} objective, then deterministic verification: <b>${qubo.verificationPass ? 'PASS' : 'FAIL'}</b>. QUBO energy: ${format(qubo.bestEnergy, 4)}.</p>
    <p>This is an in-browser exact solution of the QUBO model, not yet a BlueQubit or quantum-hardware run.</p>`;
}

function render() {
  try {
    elements.recommendErrorBanner.classList.add('is-hidden');
    const lengthM = numeric(elements.recommendLengthInput);
    const loadKN = convertLoadToKN(numeric(elements.recommendLoadInput), elements.recommendLoadUnitSelect.value);
    const loadPositionM = numeric(elements.recommendLoadPositionInput);
    const objective = elements.recommendObjectiveSelect.value;
    const engine = elements.recommendEngineSelect.value;
    elements.recommendLoadPositionInput.max = String(lengthM);

    const result = recommendMemberSections({
      materials: RECOMMENDER_MATERIALS,
      presetsByFamily: SECTION_PRESETS,
      familyFilter: elements.recommendFamilySelect.value,
      lengthM,
      loadKN,
      loadPositionM,
      boundary: elements.recommendBoundarySelect.value,
      deflectionDivisor: numeric(elements.recommendDeflectionSelect),
      objective
    });

    const qubo = engine === 'qubo'
      ? solveMemberSelectionQubo({ candidates: result.candidates, objective, maxVariables: 14 })
      : null;
    const best = qubo?.selectedCandidate ?? result.best;
    const bestCopy = objectiveCopy(objective, engine);

    elements.recommendQuboReport.classList.toggle('is-hidden', engine !== 'qubo');
    elements.recommendQuboReport.innerHTML = engine === 'qubo' ? quboReportHtml(qubo, objective) : '';

    elements.recommendSummary.className = `recommend-summary ${best ? 'recommend-summary--pass recommend-summary--best' : 'recommend-summary--fail'}`;
    elements.recommendSummary.innerHTML = best
      ? `<p class="eyebrow">${bestCopy.eyebrow}</p><strong>${best.displayMaterialName}</strong><h3>${best.sectionLabel} · ${best.orientation}</h3><p>${best.productCategoryLabel}. Required load: <b>${formatLoadEquivalents(loadKN)}</b>; ${format(best.result.maxDeflectionMm, 2)} mm deflection; ${format((best.strengthRatio ?? 0) * 100, 1)}% strength-reference use; ${format(best.totalMassKg, 2)} kg member mass.</p><p class="recommend-best-note"><strong>Why highlighted:</strong> ${bestCopy.explanation}. ${engine === 'qubo' ? 'The binary QUBO result was rechecked by the deterministic member solver.' : ''} This is not yet a peso-cost result; current supplier prices are required for a true lowest-cost ranking.</p><a class="recommend-library-link" href="${libraryHref(best)}">View shape, properties, and source in Library →</a>`
      : `<p class="eyebrow">No listed candidate passes</p><h3>Increase the candidate library, shorten the span, change the boundary/load position, add a brace or intermediate support, or permit a designed splice/connection solution.</h3><p>Checked load: <b>${formatLoadEquivalents(loadKN)}</b>.</p>`;

    elements.recommendTableBody.innerHTML = result.candidates.slice(0, 60).map((candidate, index) => {
      const isBest = candidate === best;
      const sourceLine = candidate.marketStatus
        ? candidate.marketStatus
        : `${candidate.materialSource?.status ?? 'source status unavailable'} · ${candidate.strengthReferenceLabel}`;
      return `<tr class="${candidate.pass ? 'is-pass' : ''} ${isBest ? 'is-best' : ''}">
        <td>${index + 1}${isBest ? `<small class="best-arrow">★ ${engine === 'qubo' ? 'QUBO selected' : 'minimum'}</small>` : ''}</td>
        <td>${statusBadge(candidate, isBest, objective, engine)}<small>${candidate.reasons.join('; ')}</small></td>
        <td>${candidate.displayMaterialName}<small>${candidate.productCategoryLabel}</small></td>
        <td><a class="recommend-section-link" href="${libraryHref(candidate)}"><strong>${candidate.sectionLabel}</strong></a><small>${candidate.orientation}</small><small class="candidate-source">${sourceLine}</small><small><a class="recommend-library-link" href="${libraryHref(candidate)}">View in Library</a></small></td>
        <td>${format(candidate.result.maxDeflectionMm, 2)} mm<small>${format(candidate.deflectionRatio * 100, 1)}% of limit</small></td>
        <td>${candidate.strengthRatio == null ? 'unrated' : `${format(candidate.strengthRatio * 100, 1)}%`}<small>${format(candidate.result.maxBendingStressMPa, 1)} MPa</small><small>${candidate.strengthReferenceLabel}</small></td>
        <td>${candidate.physicalThresholdLoadKN == null ? '—' : formatLoadEquivalents(candidate.physicalThresholdLoadKN)}<small>${physicalThresholdLabel(candidate)}</small></td>
        <td>${format(candidate.totalMassKg, 2)} kg<small>${format(candidate.massPerM, 2)} kg/m</small></td>
      </tr>`;
    }).join('');

    const woodCount = result.candidates.filter((candidate) => candidate.family === 'wood').length;
    const bambooCount = result.candidates.filter((candidate) => candidate.family === 'bamboo').length;
    const steelCount = result.candidates.filter((candidate) => candidate.family === 'steel').length;
    const pipeCount = result.candidates.filter((candidate) => candidate.productCategory === 'steel-pipe').length;
    elements.recommendSourceNote.innerHTML = `<p class="eyebrow">Current search space</p><strong>${result.candidates.length} section/material/orientation candidates evaluated</strong><p>${result.passing.length} pass the selected strength and deflection checks plus stock limits where defined. Search mix: ${woodCount} sawn-wood, ${bambooCount} round-bamboo, and ${steelCount} steel combinations, including ${pipeCount} pipe/grade combinations. ${engine === 'qubo' ? `The QUBO window contains ${qubo.pool.length} binary choices.` : 'Classical mode ranks the complete current library.'}</p>`;
  } catch (error) {
    elements.recommendErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.recommendErrorBanner.classList.remove('is-hidden');
    elements.recommendSummary.innerHTML = '';
    elements.recommendQuboReport.innerHTML = '';
    elements.recommendQuboReport.classList.add('is-hidden');
    elements.recommendTableBody.innerHTML = '';
  }
}

function syncLoadPosition() {
  const lengthM = numeric(elements.recommendLengthInput);
  const boundary = elements.recommendBoundarySelect.value;
  if (boundary === 'cantilever-left') elements.recommendLoadPositionInput.value = String(lengthM);
  else if (boundary === 'cantilever-right') elements.recommendLoadPositionInput.value = '0';
  else elements.recommendLoadPositionInput.value = String(lengthM / 2);
}

function resetOneTonCase() {
  elements.recommendFamilySelect.value = 'all';
  elements.recommendObjectiveSelect.value = 'mass';
  elements.recommendEngineSelect.value = 'classical';
  elements.recommendLengthInput.value = '3';
  elements.recommendBoundarySelect.value = 'simply-supported';
  elements.recommendLoadInput.value = '1000';
  elements.recommendLoadUnitSelect.value = 'kgf';
  elements.recommendLoadPositionInput.value = '1.5';
  elements.recommendDeflectionSelect.value = '360';
  render();
}

for (const id of [
  'recommendFamilySelect', 'recommendObjectiveSelect', 'recommendEngineSelect', 'recommendLoadInput',
  'recommendLoadUnitSelect', 'recommendLoadPositionInput', 'recommendDeflectionSelect'
]) {
  elements[id].addEventListener('input', render);
  elements[id].addEventListener('change', render);
}

elements.recommendBoundarySelect.addEventListener('change', () => { syncLoadPosition(); render(); });
elements.recommendLengthInput.addEventListener('change', () => { syncLoadPosition(); render(); });
elements.recommendLengthInput.addEventListener('input', render);
elements.recommendResetButton.addEventListener('click', resetOneTonCase);
resetOneTonCase();
