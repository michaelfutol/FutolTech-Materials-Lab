function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function scaledLoad(loadKN, demand, limit) {
  if (!positive(loadKN) || !positive(demand) || !positive(limit)) return null;
  return loadKN * limit / demand;
}

export function beamTerminalTarget({
  family,
  loadKN,
  maxBendingStressMPa,
  allowableBendingMPa = null,
  yieldStrengthMPa = null,
  ultimateBendingMPa = null,
  screeningOnly = false
}) {
  if (!positive(loadKN)) throw new Error('A positive current beam load is required to estimate the automatic ramp target.');
  if (!positive(maxBendingStressMPa)) throw new Error('A positive current bending stress is required to estimate the automatic ramp target.');

  let kind;
  let title;
  let stressLimitMPa;
  let physicalFailureReference = false;
  let note;

  if (family === 'wood' && positive(ultimateBendingMPa)) {
    kind = 'rupture';
    title = 'PUBLISHED-AVERAGE RUPTURE REFERENCE';
    stressLimitMPa = ultimateBendingMPa;
    physicalFailureReference = true;
    note = 'Elastic scaling reaches the selected published average rupture stress. Actual timber can fracture earlier; fracture location and propagation are not modeled.';
  } else if (family === 'steel' && positive(yieldStrengthMPa)) {
    kind = screeningOnly ? 'gross-yield-screen' : 'yield';
    title = screeningOnly ? 'GROSS FIRST-YIELD SCREEN' : 'FIRST-YIELD REFERENCE';
    stressLimitMPa = yieldStrengthMPa;
    note = screeningOnly
      ? 'Gross-section elastic scaling only. Local/distortional/lateral-torsional buckling or connection/restraint failure can govern before this reference.'
      : 'Elastic scaling reaches Fy. This is first yield, not fracture; post-yield response belongs in the Steel Yield Lab.';
  } else if (positive(allowableBendingMPa)) {
    kind = 'working-reference';
    title = 'LAST VERIFIED BENDING REFERENCE';
    stressLimitMPa = allowableBendingMPa;
    note = 'The current dataset has no source-backed rupture stress, so the automatic test stops at the last verified bending reference instead of inventing a snap load.';
  } else {
    throw new Error('This material dataset has no source-backed bending threshold for an automatic load ramp.');
  }

  const targetLoadKN = scaledLoad(loadKN, maxBendingStressMPa, stressLimitMPa);
  if (!positive(targetLoadKN)) throw new Error('The automatic beam target could not be calculated from the current elastic response.');

  return {
    kind,
    title,
    targetLoadKN,
    stressLimitMPa,
    physicalFailureReference,
    note
  };
}

export function columnTerminalTarget({
  family,
  loadKN,
  predictedCapacityKN,
  maxCompressionStressMPa = null,
  compressionStrengthMPa = null
}) {
  const candidates = [];
  if (positive(predictedCapacityKN)) {
    candidates.push({
      loadKN: predictedCapacityKN,
      basis: 'predicted governing column capacity'
    });
  }
  const stressLoadKN = scaledLoad(loadKN, maxCompressionStressMPa, compressionStrengthMPa);
  if (positive(stressLoadKN)) {
    candidates.push({
      loadKN: stressLoadKN,
      basis: 'compression-strength reference'
    });
  }
  if (candidates.length === 0) {
    throw new Error('The current column result has no finite governing capacity for an automatic load ramp.');
  }

  candidates.sort((a, b) => a.loadKN - b.loadKN);
  const controlling = candidates[0];
  return {
    kind: 'column-capacity',
    title: family === 'steel' ? 'IDEALISED YIELD / BUCKLING CAPACITY' : 'IDEALISED CRUSHING / BUCKLING CAPACITY',
    targetLoadKN: controlling.loadKN,
    physicalFailureReference: false,
    note: `Stops at the current ${controlling.basis}. This is an idealised terminal check; actual instability, crushing, splitting, local failure and connection behavior are not post-failure predictions.`
  };
}

export function rampLoadSeries({ currentLoadKN, targetLoadKN, steps = 56 }) {
  if (!positive(targetLoadKN)) throw new Error('Automatic ramp target must be greater than zero.');
  if (!Number.isInteger(steps) || steps < 2) throw new Error('Automatic ramp requires at least two steps.');

  const current = Number.isFinite(currentLoadKN) && currentLoadKN >= 0 ? currentLoadKN : 0;
  const startLoadKN = current >= targetLoadKN * 0.995
    ? Math.max(targetLoadKN * 0.05, Math.min(0.01, targetLoadKN * 0.05))
    : current;
  const range = targetLoadKN - startLoadKN;
  const values = [];
  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    const eased = ratio ** 1.28;
    values.push(startLoadKN + range * eased);
  }
  values[values.length - 1] = targetLoadKN;
  return { startLoadKN, values };
}
