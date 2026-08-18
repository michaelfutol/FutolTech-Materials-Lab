import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDesignSolution, exploreDesignSolutions, paretoFrontier } from '../src/solver/designExplorer.js';

function candidate(overrides = {}) {
  return {
    materialId: 'm1',
    presetId: 's1',
    strengthPass: true,
    deflectionPass: true,
    screeningOnly: false,
    stockBoundaryM: 6,
    massPerM: 5,
    totalMassKg: 20,
    governingRatio: 0.6,
    ...overrides
  };
}

test('no-splice passing member is MEMBER FEASIBLE but not a complete connection design', () => {
  const solution = buildDesignSolution(candidate(), { requiredLengthM: 4 });
  assert.equal(solution.solutionStatus, 'MEMBER FEASIBLE');
  assert.equal(solution.solutionComplete, false);
  assert.equal(solution.stockPlan.spliceCount, 0);
  assert.match(solution.connectionStatus, /OUTSIDE SCOPE/);
});

test('member that needs more than one stock piece is INCOMPLETE until splice connection is verified', () => {
  const solution = buildDesignSolution(candidate({ stockBoundaryM: 3, totalMassKg: 25 }), { requiredLengthM: 5 });
  assert.equal(solution.solutionStatus, 'INCOMPLETE');
  assert.equal(solution.stockPlan.pieces, 2);
  assert.equal(solution.stockPlan.spliceCount, 1);
  assert.equal(solution.stockPlan.purchasedLengthM, 6);
  assert.equal(solution.stockPlan.wasteLengthM, 1);
  assert.equal(solution.stockPlan.purchasedMassKg, 30);
  assert.match(solution.connectionStatus, /SPLICE CONNECTION REQUIRED/);
  assert.match(solution.reason, /not yet a design-verified connection/i);
});

test('member strength or serviceability failure remains FAIL even if stock exists', () => {
  const solution = buildDesignSolution(candidate({ deflectionPass: false }), { requiredLengthM: 4 });
  assert.equal(solution.solutionStatus, 'FAIL');
  assert.equal(solution.connectionStatus, 'NOT EVALUATED');
});

test('screening-only family is never promoted to MEMBER FEASIBLE', () => {
  const solution = buildDesignSolution(candidate({ screeningOnly: true }), { requiredLengthM: 4 });
  assert.equal(solution.solutionStatus, 'SCREENING');
  assert.equal(solution.solutionComplete, false);
});

test('Pareto frontier removes a solution dominated in purchased mass, utilisation, splices and waste', () => {
  const a = { id: 'a', solutionStatus: 'MEMBER FEASIBLE', purchasedMassKg: 20, governingRatio: 0.6, spliceCount: 0, wasteLengthM: 1 };
  const b = { id: 'b', solutionStatus: 'MEMBER FEASIBLE', purchasedMassKg: 25, governingRatio: 0.8, spliceCount: 0, wasteLengthM: 2 };
  const c = { id: 'c', solutionStatus: 'INCOMPLETE', purchasedMassKg: 18, governingRatio: 0.7, spliceCount: 1, wasteLengthM: 0.5 };
  const frontier = paretoFrontier([a, b, c]);
  assert.ok(frontier.includes(a));
  assert.ok(frontier.includes(c));
  assert.ok(!frontier.includes(b));
});

test('Design Explorer explicitly leaves price and carbon unavailable without source data', () => {
  const result = exploreDesignSolutions({ candidates: [candidate()], requiredLengthM: 4 });
  assert.match(result.priceStatus, /UNAVAILABLE/);
  assert.match(result.carbonStatus, /UNAVAILABLE/);
  assert.match(result.connectionBoundary, /never promoted to complete PASS/i);
});
