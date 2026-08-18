import { minimumStockPieces } from './spliceDemand.js';

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function lowerBoundStockPlan(candidate, requiredLengthM) {
  const stockLengthM = finite(candidate.stockBoundaryM);
  if (!(stockLengthM > 0)) {
    return {
      status: 'UNKNOWN',
      stockLengthM: null,
      pieces: null,
      spliceCount: null,
      purchasedLengthM: null,
      wasteLengthM: null,
      purchasedMassKg: null,
      note: 'Usable stock length is not verified.'
    };
  }

  const plan = minimumStockPieces({ requiredLengthM, stockLengthM, overlapM: 0 });
  const purchasedMassKg = finite(candidate.massPerM) == null
    ? null
    : plan.totalPurchasedLengthM * candidate.massPerM;
  return {
    status: plan.spliceCount === 0 ? 'NO SPLICE' : 'SPLICE REQUIRED',
    stockLengthM,
    pieces: plan.pieces,
    spliceCount: plan.spliceCount,
    purchasedLengthM: plan.totalPurchasedLengthM,
    wasteLengthM: plan.wasteLengthM,
    purchasedMassKg,
    note: plan.spliceCount === 0
      ? 'Required length fits inside the verified stock-length boundary.'
      : 'Minimum stock-piece lower bound assumes zero splice overlap. Actual splice type may require overlap, sleeves, plates, weld preparation, or additional stock.'
  };
}

function classifySolution(candidate, stockPlan) {
  if (!candidate.strengthPass || !candidate.deflectionPass) {
    return {
      solutionStatus: 'FAIL',
      solutionComplete: false,
      connectionStatus: 'NOT EVALUATED',
      reason: 'Member strength/serviceability screen fails before stock/connection completion.'
    };
  }
  if (candidate.screeningOnly) {
    return {
      solutionStatus: 'SCREENING',
      solutionComplete: false,
      connectionStatus: stockPlan.spliceCount > 0 ? 'REQUIRED / UNVERIFIED' : 'SUPPORT CONNECTIONS OUTSIDE SCOPE',
      reason: 'The member family itself is screening-only under the currently implemented physics.'
    };
  }
  if (stockPlan.status === 'UNKNOWN') {
    return {
      solutionStatus: 'INCOMPLETE',
      solutionComplete: false,
      connectionStatus: 'UNKNOWN',
      reason: 'Member checks pass but usable stock length is not verified.'
    };
  }
  if (stockPlan.spliceCount > 0) {
    return {
      solutionStatus: 'INCOMPLETE',
      solutionComplete: false,
      connectionStatus: 'SPLICE CONNECTION REQUIRED / UNVERIFIED',
      reason: 'Member checks pass, but the required splice is not yet a design-verified connection. Connection Lab v1 is research screening only.'
    };
  }
  return {
    solutionStatus: 'MEMBER FEASIBLE',
    solutionComplete: false,
    connectionStatus: 'END/SUPPORT CONNECTIONS OUTSIDE SCOPE',
    reason: 'Member and stock-length checks pass. Support/end connections are still outside this solution package.'
  };
}

export function buildDesignSolution(candidate, { requiredLengthM }) {
  const stockPlan = lowerBoundStockPlan(candidate, requiredLengthM);
  const classification = classifySolution(candidate, stockPlan);
  return {
    id: `${candidate.materialId}:${candidate.presetId}`,
    candidate,
    ...classification,
    stockPlan,
    governingRatio: finite(candidate.governingRatio),
    memberMassKg: finite(candidate.totalMassKg),
    purchasedMassKg: finite(stockPlan.purchasedMassKg),
    spliceCount: stockPlan.spliceCount,
    wasteLengthM: finite(stockPlan.wasteLengthM),
    metricsAvailable: {
      memberMass: finite(candidate.totalMassKg) != null,
      purchasedMass: finite(stockPlan.purchasedMassKg) != null,
      utilisation: finite(candidate.governingRatio) != null,
      stockWaste: finite(stockPlan.wasteLengthM) != null,
      price: false,
      carbon: false
    }
  };
}

function metricValue(solution, metric) {
  if (metric === 'utilisation') return solution.governingRatio;
  if (metric === 'splices') return solution.spliceCount;
  if (metric === 'waste') return solution.wasteLengthM;
  if (metric === 'purchasedMass') return solution.purchasedMassKg;
  return solution.memberMassKg;
}

function dominates(a, b, metrics) {
  let strictlyBetter = false;
  for (const metric of metrics) {
    const av = metricValue(a, metric);
    const bv = metricValue(b, metric);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return false;
    if (av > bv + 1e-12) return false;
    if (av < bv - 1e-12) strictlyBetter = true;
  }
  return strictlyBetter;
}

export function paretoFrontier(solutions, metrics = ['purchasedMass', 'utilisation', 'splices', 'waste']) {
  const eligible = solutions.filter((solution) => (
    solution.solutionStatus !== 'FAIL'
    && metrics.every((metric) => Number.isFinite(metricValue(solution, metric)))
  ));
  return eligible.filter((candidate, index) => !eligible.some((other, otherIndex) => (
    otherIndex !== index && dominates(other, candidate, metrics)
  )));
}

export function exploreDesignSolutions({ candidates, requiredLengthM }) {
  if (!Array.isArray(candidates)) throw new Error('Design Explorer requires member candidates.');
  if (!Number.isFinite(requiredLengthM) || requiredLengthM <= 0) throw new Error('Required length must be greater than zero.');

  const solutions = candidates.map((candidate) => buildDesignSolution(candidate, { requiredLengthM }));
  const frontier = paretoFrontier(solutions);
  const frontierIds = new Set(frontier.map((solution) => solution.id));
  for (const solution of solutions) solution.paretoEfficient = frontierIds.has(solution.id);

  const memberFeasible = solutions.filter((solution) => solution.solutionStatus === 'MEMBER FEASIBLE');
  const incomplete = solutions.filter((solution) => solution.solutionStatus === 'INCOMPLETE');
  const screening = solutions.filter((solution) => solution.solutionStatus === 'SCREENING');
  const failed = solutions.filter((solution) => solution.solutionStatus === 'FAIL');

  return {
    solutions,
    frontier,
    memberFeasible,
    incomplete,
    screening,
    failed,
    priceStatus: 'UNAVAILABLE — no verified current supplier price dataset is connected to these candidates.',
    carbonStatus: 'UNAVAILABLE — no verified product EPD/carbon dataset is connected to these candidates.',
    connectionBoundary: 'A splice-required option is never promoted to complete PASS until an applicable design-verified connection model exists.'
  };
}
