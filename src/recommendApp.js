import { MATERIALS } from './data/materials.js';
import { SECTION_PRESETS } from './data/sectionPresets.js';
import { convertLoadToKN, recommendMemberSections } from './solver/sectionRecommender.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const ids = [
  'recommendFamilySelect', 'recommendObjectiveSelect', 'recommendLengthInput',
  'recommendBoundarySelect', 'recommendLoadInput', 'recommendLoadUnitSelect',
  'recommendLoadPositionInput', 'recommendDeflectionSelect', 'recommendResetButton',
  'recommendErrorBanner', 'recommendSummary', 'recommendTableBody', 'recommendSourceNote'
];
const elements = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

function numeric(element) { return Number(element.value); }
function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function objectiveCopy(objective) {
  if (objective === 'utilisation') {
    return {
      eyebrow: 'Lowest-utilisation passing option',
      badge: 'BEST · LOWEST USE',
      explanation: 'lowest governing strength/deflection utilisation'
    };
  }
  return {
    eyebrow: 'Lightest passing option',
    badge: 'BEST · LIGHTEST PASS',
    explanation: 'minimum member mass among the passing listed candidates'
  };
}

function statusBadge(candidate, isBest, objective) {
  if (isBest) return `<span class="recommend-badge recommend-badge--best">${objectiveCopy(objective).badge}</span>`;
  if (candidate.pass) return '<span class="recommend-badge recommend-badge--pass">PASS</span>';
  if (!candidate.stockPass) return '<span class="recommend-badge recommend-badge--splice">SPLICE</span>';
  return '<span class="recommend-badge recommend-badge--fail">FAIL</span>';
}

function render() {
  try {
    elements.recommendErrorBanner.classList.add('is-hidden');
    const lengthM = numeric(elements.recommendLengthInput);
    const loadKN = convertLoadToKN(numeric(elements.recommendLoadInput), elements.recommendLoadUnitSelect.value);
    const loadPositionM = numeric(elements.recommendLoadPositionInput);
    const objective = elements.recommendObjectiveSelect.value;
    elements.recommendLoadPositionInput.max = String(lengthM);

    const result = recommendMemberSections({
      materials: MATERIALS,
      presetsByFamily: SECTION_PRESETS,
      familyFilter: elements.recommendFamilySelect.value,
      lengthM,
      loadKN,
      loadPositionM,
      boundary: elements.recommendBoundarySelect.value,
      deflectionDivisor: numeric(elements.recommendDeflectionSelect),
      objective
    });

    const best = result.best;
    const bestCopy = objectiveCopy(objective);
    elements.recommendSummary.className = `recommend-summary ${best ? 'recommend-summary--pass recommend-summary--best' : 'recommend-summary--fail'}`;
    elements.recommendSummary.innerHTML = best
      ? `<p class="eyebrow">${bestCopy.eyebrow}</p><strong>${best.materialName}</strong><h3>${best.sectionLabel} · ${best.orientation}</h3><p>Required load: <b>${formatLoadEquivalents(loadKN)}</b>; ${format(best.result.maxDeflectionMm, 2)} mm deflection; ${format((best.strengthRatio ?? 0) * 100, 1)}% strength-reference use; ${format(best.totalMassKg, 2)} kg member mass.</p><p class="recommend-best-note"><strong>Why highlighted:</strong> ${bestCopy.explanation}. This is not yet a peso-cost result; current supplier prices are required for a true lowest-cost ranking.</p>`
      : `<p class="eyebrow">No listed candidate passes</p><h3>Increase the candidate library, shorten the span, change the boundary/load position, add a brace or intermediate support, or permit a designed splice/connection solution.</h3><p>Checked load: <b>${formatLoadEquivalents(loadKN)}</b>.</p>`;

    elements.recommendTableBody.innerHTML = result.candidates.slice(0, 50).map((candidate, index) => {
      const isBest = candidate === best;
      const physicalLabel = candidate.family === 'wood' ? 'rupture est.' : 'yield est.';
      const sourceLine = candidate.marketStatus
        ? candidate.marketStatus
        : `${candidate.materialSource?.status ?? 'source status unavailable'} · ${candidate.strengthReferenceLabel}`;
      return `<tr class="${candidate.pass ? 'is-pass' : ''} ${isBest ? 'is-best' : ''}">
        <td>${index + 1}${isBest ? '<small class="best-arrow">★ minimum</small>' : ''}</td>
        <td>${statusBadge(candidate, isBest, objective)}<small>${candidate.reasons.join('; ')}</small></td>
        <td>${candidate.materialName}<small>${candidate.family}</small></td>
        <td><strong>${candidate.sectionLabel}</strong><small>${candidate.orientation}</small><small class="candidate-source">${sourceLine}</small></td>
        <td>${format(candidate.result.maxDeflectionMm, 2)} mm<small>${format(candidate.deflectionRatio * 100, 1)}% of limit</small></td>
        <td>${candidate.strengthRatio == null ? 'unrated' : `${format(candidate.strengthRatio * 100, 1)}%`}<small>${format(candidate.result.maxBendingStressMPa, 1)} MPa</small><small>${candidate.strengthReferenceLabel}</small></td>
        <td>${candidate.physicalThresholdLoadKN == null ? '—' : formatLoadEquivalents(candidate.physicalThresholdLoadKN)}<small>${physicalLabel}</small></td>
        <td>${format(candidate.totalMassKg, 2)} kg<small>${format(candidate.massPerM, 2)} kg/m</small></td>
      </tr>`;
    }).join('');

    const woodCount = result.candidates.filter((candidate) => candidate.family === 'wood').length;
    const steelCount = result.candidates.filter((candidate) => candidate.family === 'steel').length;
    elements.recommendSourceNote.innerHTML = `<p class="eyebrow">Current search space</p><strong>${result.candidates.length} section/material/orientation candidates evaluated</strong><p>${result.passing.length} pass the selected strength, deflection, and no-splice checks. Search mix: ${woodCount} wood and ${steelCount} steel candidate combinations. The highlighted row is the minimum under the selected objective, not automatically the cheapest purchase price.</p>`;
  } catch (error) {
    elements.recommendErrorBanner.textContent = error instanceof Error ? error.message : String(error);
    elements.recommendErrorBanner.classList.remove('is-hidden');
    elements.recommendSummary.innerHTML = '';
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
  elements.recommendLengthInput.value = '3';
  elements.recommendBoundarySelect.value = 'simply-supported';
  elements.recommendLoadInput.value = '1000';
  elements.recommendLoadUnitSelect.value = 'kgf';
  elements.recommendLoadPositionInput.value = '1.5';
  elements.recommendDeflectionSelect.value = '360';
  render();
}

for (const id of [
  'recommendFamilySelect', 'recommendObjectiveSelect', 'recommendLoadInput',
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
