function objectiveValue(candidate, objective) {
  if (objective === 'utilisation') return candidate.governingRatio;
  return candidate.totalMassKg;
}

function candidateKey(candidate) {
  return `${candidate.materialId}::${candidate.presetId}::${candidate.orientation ?? ''}`;
}

function chooseQuboPool(candidates, maxVariables) {
  const passing = candidates.filter((candidate) => candidate.pass);
  const failing = candidates.filter((candidate) => !candidate.pass);
  const passSlots = Math.min(passing.length, Math.max(1, maxVariables - Math.min(4, failing.length)));
  const pool = [...passing.slice(0, passSlots)];
  const remaining = maxVariables - pool.length;
  pool.push(...failing.slice(0, remaining));
  if (!pool.length) pool.push(...candidates.slice(0, maxVariables));
  return pool;
}

function normalizeObjectives(pool, objective) {
  const raw = pool.map((candidate) => objectiveValue(candidate, objective));
  const finite = raw.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 1;
  const range = Math.max(max - min, 1e-12);
  return raw.map((value) => Number.isFinite(value) ? (value - min) / range : 1);
}

export function buildMemberSelectionQubo({
  candidates,
  objective = 'mass',
  maxVariables = 14,
  exactlyOnePenalty = 10,
  infeasiblePenalty = 20
}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('QUBO member selection requires at least one candidate.');
  }
  if (!Number.isInteger(maxVariables) || maxVariables < 1 || maxVariables > 20) {
    throw new Error('QUBO local exact mode supports 1 to 20 binary variables.');
  }

  const pool = chooseQuboPool(candidates, maxVariables);
  const objectiveScores = normalizeObjectives(pool, objective);
  const size = pool.length;
  const q = Array.from({ length: size }, () => Array(size).fill(0));

  for (let i = 0; i < size; i += 1) {
    q[i][i] = objectiveScores[i]
      + (pool[i].pass ? 0 : infeasiblePenalty)
      - exactlyOnePenalty;
    for (let j = i + 1; j < size; j += 1) q[i][j] = 2 * exactlyOnePenalty;
  }

  return {
    objective,
    pool,
    q,
    constant: exactlyOnePenalty,
    penalties: { exactlyOnePenalty, infeasiblePenalty },
    objectiveScores
  };
}

export function evaluateQuboEnergy(bits, model) {
  if (!Array.isArray(bits) || bits.length !== model.pool.length) {
    throw new Error('QUBO bit vector length does not match the model.');
  }
  let energy = model.constant;
  for (let i = 0; i < bits.length; i += 1) {
    if (!bits[i]) continue;
    energy += model.q[i][i];
    for (let j = i + 1; j < bits.length; j += 1) {
      if (bits[j]) energy += model.q[i][j];
    }
  }
  return energy;
}

export function solveMemberSelectionQubo({
  candidates,
  objective = 'mass',
  maxVariables = 14,
  exactlyOnePenalty = 10,
  infeasiblePenalty = 20
}) {
  const model = buildMemberSelectionQubo({
    candidates,
    objective,
    maxVariables,
    exactlyOnePenalty,
    infeasiblePenalty
  });
  const variableCount = model.pool.length;
  const stateCount = 2 ** variableCount;
  let bestEnergy = Infinity;
  let bestMask = 0;

  for (let mask = 0; mask < stateCount; mask += 1) {
    const bits = Array.from({ length: variableCount }, (_, index) => (mask >> index) & 1);
    const energy = evaluateQuboEnergy(bits, model);
    if (energy < bestEnergy - 1e-12) {
      bestEnergy = energy;
      bestMask = mask;
    }
  }

  const selectedIndices = [];
  for (let index = 0; index < variableCount; index += 1) {
    if ((bestMask >> index) & 1) selectedIndices.push(index);
  }
  const selectedCandidate = selectedIndices.length === 1 ? model.pool[selectedIndices[0]] : null;
  const classicalBest = candidates.find((candidate) => candidate.pass) ?? null;

  return {
    ...model,
    statesEvaluated: stateCount,
    bestEnergy,
    bestMask,
    selectedIndices,
    selectedCandidate,
    selectedKey: selectedCandidate ? candidateKey(selectedCandidate) : null,
    classicalBest,
    agreesWithClassical: Boolean(
      selectedCandidate
      && classicalBest
      && candidateKey(selectedCandidate) === candidateKey(classicalBest)
    ),
    verificationPass: Boolean(selectedCandidate?.pass)
  };
}
