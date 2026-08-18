import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { SECTION_PRESETS } from './data/sectionPresets.js';
import { convertLoadToKN, recommendMemberSections } from './solver/sectionRecommender.js';
import { solveMemberSelectionQubo } from './solver/quboMemberSelector.js';
import { exploreDesignSolutions } from './solver/designExplorer.js';
import { formatLoadEquivalents } from './utils/loadUnits.js';

const MATERIAL_POOL = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const $ = (id) => document.getElementById(id);
const ids = [
  'recommendFamilySelect','recommendObjectiveSelect','recommendEngineSelect','recommendLengthInput',
  'recommendBoundarySelect','recommendLoadInput','recommendLoadUnitSelect','recommendLoadPositionInput',
  'recommendDeflectionSelect','recommendSummary','recommendExplorerSummary','recommendTableBody','recommendResetButton'
];
const e = Object.fromEntries(ids.map((id) => [id, $(id)]));

function numeric(element) { return Number(element?.value); }
function f(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
}
function libraryHref(candidate) { return `./library.html?section=${encodeURIComponent(candidate.librarySectionId)}`; }

function statusClass(status) {
  if (status === 'MEMBER FEASIBLE') return 'recommend-badge--pass';
  if (status === 'FAIL') return 'recommend-badge--fail';
  return 'recommend-badge--splice';
}

function compute() {
  const lengthM = numeric(e.recommendLengthInput);
  const loadKN = convertLoadToKN(numeric(e.recommendLoadInput), e.recommendLoadUnitSelect.value);
  const objective = e.recommendObjectiveSelect.value;
  const memberResult = recommendMemberSections({
    materials: MATERIAL_POOL,
    presetsByFamily: SECTION_PRESETS,
    familyFilter: e.recommendFamilySelect.value,
    lengthM,
    loadKN,
    loadPositionM: numeric(e.recommendLoadPositionInput),
    boundary: e.recommendBoundarySelect.value,
    deflectionDivisor: numeric(e.recommendDeflectionSelect),
    objective
  });
  const explorer = exploreDesignSolutions({ candidates: memberResult.candidates, requiredLengthM: lengthM });
  const qubo = e.recommendEngineSelect.value === 'qubo'
    ? solveMemberSelectionQubo({ candidates: memberResult.candidates, objective, maxVariables: 14 })
    : null;
  const selectedCandidate = qubo?.selectedCandidate ?? memberResult.best;
  const selectedSolution = selectedCandidate
    ? explorer.solutions.find((solution) => solution.candidate === selectedCandidate || (
      solution.candidate.materialId === selectedCandidate.materialId
      && solution.candidate.presetId === selectedCandidate.presetId
    ))
    : null;
  return { lengthM, loadKN, memberResult, explorer, selectedCandidate, selectedSolution };
}

function render() {
  try {
    const { loadKN, memberResult, explorer, selectedCandidate, selectedSolution } = compute();
    const efficient = explorer.frontier.length;
    e.recommendExplorerSummary.innerHTML = `<p class="eyebrow">DE-002 · integrated solution packages</p>
      <strong>${explorer.memberFeasible.length} member-feasible · ${explorer.incomplete.length} incomplete · ${explorer.failed.length} failed · ${efficient} Pareto-efficient</strong>
      <p>${explorer.connectionBoundary}</p>
      <p><b>Price:</b> ${explorer.priceStatus}<br><b>Carbon:</b> ${explorer.carbonStatus}</p>`;

    if (selectedCandidate && selectedSolution) {
      const c = selectedCandidate;
      const s = selectedSolution;
      e.recommendSummary.className = `recommend-summary ${s.solutionStatus === 'FAIL' ? 'recommend-summary--fail' : 'recommend-summary--pass recommend-summary--best'}`;
      e.recommendSummary.innerHTML = `<p class="eyebrow">Selected under primary member objective</p>
        <strong>${c.displayMaterialName}</strong><h3>${c.sectionLabel} · ${c.orientation}</h3>
        <p><span class="recommend-badge ${statusClass(s.solutionStatus)}">${s.solutionStatus}</span> Required load: <b>${formatLoadEquivalents(loadKN)}</b>. ${s.reason}</p>
        <p>${f(c.result.maxDeflectionMm)} mm deflection · ${f((c.governingRatio ?? 0) * 100, 1)}% governing use · stock: <b>${s.stockPlan.status}</b>${s.stockPlan.pieces == null ? '' : ` · ${s.stockPlan.pieces} piece(s) · ${s.stockPlan.spliceCount} splice(s)`}.</p>
        <p><b>Connection:</b> ${s.connectionStatus}. ${s.paretoEfficient ? '<b>★ Pareto-efficient on the currently available quantitative metrics.</b>' : ''}</p>
        <a class="recommend-library-link" href="${libraryHref(c)}">View shape, properties, and source in Library →</a>`;
    }

    e.recommendTableBody.innerHTML = explorer.solutions.slice(0, 60).map((s, index) => {
      const c = s.candidate;
      const selected = c === selectedCandidate || (selectedCandidate && c.materialId === selectedCandidate.materialId && c.presetId === selectedCandidate.presetId);
      const stock = s.stockPlan.status === 'UNKNOWN'
        ? 'UNKNOWN'
        : `${s.stockPlan.pieces} pc · ${s.stockPlan.spliceCount} splice${s.stockPlan.spliceCount === 1 ? '' : 's'}`;
      const waste = s.stockPlan.wasteLengthM == null ? 'waste —' : `waste ${f(s.stockPlan.wasteLengthM)} m`;
      const mass = s.purchasedMassKg ?? s.memberMassKg;
      return `<tr class="${selected ? 'is-best' : ''}">
        <td>${index + 1}${selected ? '<small class="best-arrow">★ primary selection</small>' : ''}</td>
        <td><span class="recommend-badge ${statusClass(s.solutionStatus)}">${s.solutionStatus}</span><small>${s.reason}</small></td>
        <td>${c.displayMaterialName}<small>${c.productCategoryLabel}</small></td>
        <td><a class="recommend-section-link" href="${libraryHref(c)}"><strong>${c.sectionLabel}</strong></a><small>${c.orientation}</small></td>
        <td>${f(c.result.maxDeflectionMm)} mm<small>${f((c.deflectionRatio ?? 0) * 100, 1)}% deflection limit</small><small>${c.strengthRatio == null ? 'strength unrated' : `${f(c.strengthRatio * 100, 1)}% strength use`}</small></td>
        <td><strong>${s.stockPlan.status}</strong><small>${stock}</small><small>${waste}</small><small>${s.stockPlan.note}</small></td>
        <td><strong>${s.connectionStatus}</strong><small>${s.solutionStatus === 'INCOMPLETE' ? 'Not eligible for complete solution PASS.' : 'Support/end detailing remains project-specific.'}</small></td>
        <td>${mass == null ? 'mass —' : `${f(mass)} kg`}<small>${s.purchasedMassKg != null ? 'purchased-stock mass' : 'member mass'}</small>${s.paretoEfficient ? '<span class="recommend-badge recommend-badge--best">PARETO</span>' : ''}</td>
      </tr>`;
    }).join('');
  } catch {
    // The base recommender owns input-validation messaging; leave its error banner intact.
  }
}

for (const id of [
  'recommendFamilySelect','recommendObjectiveSelect','recommendEngineSelect','recommendLengthInput',
  'recommendBoundarySelect','recommendLoadInput','recommendLoadUnitSelect','recommendLoadPositionInput','recommendDeflectionSelect'
]) {
  e[id]?.addEventListener('input', () => queueMicrotask(render));
  e[id]?.addEventListener('change', () => queueMicrotask(render));
}
e.recommendResetButton?.addEventListener('click', () => queueMicrotask(render));
queueMicrotask(render);
