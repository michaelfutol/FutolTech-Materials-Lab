function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function scaledLoad(currentLoadKN, currentDemand, limit) {
  if (!positive(currentLoadKN) || !positive(currentDemand) || !positive(limit)) return null;
  return currentLoadKN * limit / currentDemand;
}

function event({ id, label, loadKN, type, status = 'REFERENCE', terminal = false, note = '', sourceStatus = 'model' }) {
  if (!positive(loadKN)) return null;
  return { id, label, loadKN, type, status, terminal, note, sourceStatus };
}

function sortUnique(events) {
  const valid = events.filter(Boolean).sort((a, b) => a.loadKN - b.loadKN);
  const output = [];
  for (const item of valid) {
    const duplicate = output.find((existing) => Math.abs(existing.loadKN - item.loadKN) <= Math.max(1e-9, item.loadKN * 1e-8) && existing.type === item.type);
    if (!duplicate) output.push(item);
  }
  return output;
}

function terminalize(events, terminalId) {
  return events.map((item) => ({ ...item, terminal: item.id === terminalId }));
}

export function beamGoverningLimitTimeline({
  family,
  currentLoadKN,
  currentDeflectionMm,
  deflectionLimitMm,
  currentStressMPa,
  allowableBendingMPa = null,
  yieldStrengthMPa = null,
  ultimateBendingMPa = null,
  screeningOnly = false,
  screeningLabel = 'gross-section'
}) {
  if (!positive(currentLoadKN)) throw new Error('A positive current beam load is required to build the governing-limit timeline.');
  if (!positive(currentStressMPa)) throw new Error('A positive current bending stress is required to build the governing-limit timeline.');

  const events = [];
  const serviceLoad = scaledLoad(currentLoadKN, currentDeflectionMm, deflectionLimitMm);
  events.push(event({
    id: 'serviceability',
    label: 'SERVICEABILITY LIMIT',
    loadKN: serviceLoad,
    type: 'serviceability',
    status: 'SERVICEABILITY',
    sourceStatus: 'selected criterion',
    note: `Elastic deflection reaches the selected ${positive(deflectionLimitMm) ? `${deflectionLimitMm.toFixed(2)} mm` : 'serviceability'} limit.`
  }));

  const allowableLoad = scaledLoad(currentLoadKN, currentStressMPa, allowableBendingMPa);
  if (positive(allowableLoad)) {
    events.push(event({
      id: 'working-reference',
      label: 'WORKING / ALLOWABLE REFERENCE',
      loadKN: allowableLoad,
      type: 'working-reference',
      status: 'REFERENCE',
      sourceStatus: 'material dataset',
      note: 'Bending stress reaches the selected working/allowable material reference.'
    }));
  }

  if (family === 'steel' && positive(yieldStrengthMPa)) {
    const yieldLoad = scaledLoad(currentLoadKN, currentStressMPa, yieldStrengthMPa);
    events.push(event({
      id: screeningOnly ? 'gross-yield-screen' : 'first-yield',
      label: screeningOnly ? `${screeningLabel.toUpperCase()} FIRST-YIELD SCREEN` : 'FIRST YIELD',
      loadKN: yieldLoad,
      type: screeningOnly ? 'screening' : 'yield',
      status: screeningOnly ? 'SCREENING' : 'YIELD',
      sourceStatus: 'selected steel Fy',
      note: screeningOnly
        ? 'Gross-section elastic yield screen only. Local/distortional/LTB/torsion or connection/restraint failure can govern earlier.'
        : 'Elastic stress reaches Fy. This is first yield, not fracture; post-yield behavior belongs in Steel Yield Lab.'
    }));
    const timeline = terminalize(sortUnique(events), screeningOnly ? 'gross-yield-screen' : 'first-yield');
    return {
      mode: 'beam',
      events: timeline,
      terminalEvent: timeline.find((item) => item.terminal),
      boundary: screeningOnly ? 'Stops at the gross first-yield screening reference because governing instability/local-failure modes are not yet implemented.' : 'Stops at first yield; fracture is not inferred from Fy.'
    };
  }

  if (family === 'wood' && positive(ultimateBendingMPa)) {
    const ruptureLoad = scaledLoad(currentLoadKN, currentStressMPa, ultimateBendingMPa);
    events.push(event({
      id: 'rupture-reference',
      label: 'PUBLISHED RUPTURE REFERENCE',
      loadKN: ruptureLoad,
      type: 'rupture',
      status: 'RUPTURE REFERENCE',
      sourceStatus: 'published material dataset',
      note: 'Elastic scaling reaches the selected published rupture stress. Actual timber can fracture earlier; crack initiation/propagation is not modeled.'
    }));
    const timeline = terminalize(sortUnique(events), 'rupture-reference');
    return {
      mode: 'beam',
      events: timeline,
      terminalEvent: timeline.find((item) => item.terminal),
      boundary: 'Published rupture is a material reference, not a deterministic prediction of the exact specimen fracture load.'
    };
  }

  if (positive(allowableLoad)) {
    const timeline = terminalize(sortUnique(events), 'working-reference');
    return {
      mode: 'beam',
      events: timeline,
      terminalEvent: timeline.find((item) => item.terminal),
      boundary: 'No source-backed rupture/yield terminal exists for this dataset, so the chronology stops at the last verified bending reference.'
    };
  }

  throw new Error('This material dataset has no source-backed governing bending reference for an automatic test.');
}

export function columnGoverningLimitTimeline({
  family,
  currentLoadKN,
  predictedCapacityKN,
  eulerCriticalKN = null,
  currentCompressionStressMPa = null,
  compressionStrengthMPa = null
}) {
  if (!positive(currentLoadKN)) throw new Error('A positive current column load is required to build the governing-limit timeline.');
  const events = [];

  if (positive(predictedCapacityKN)) {
    events.push(event({
      id: 'governing-capacity',
      label: family === 'steel' ? 'PRELIMINARY GOVERNING COLUMN CAPACITY' : 'RESEARCH GOVERNING COLUMN CAPACITY',
      loadKN: predictedCapacityKN,
      type: 'column-capacity',
      status: family === 'steel' ? 'PRELIM LIMIT' : 'SCREENING',
      sourceStatus: 'column model',
      note: 'Current idealised governing capacity from the implemented column model.'
    }));
  }

  const stressLoad = scaledLoad(currentLoadKN, currentCompressionStressMPa, compressionStrengthMPa);
  if (positive(stressLoad)) {
    events.push(event({
      id: 'compression-reference',
      label: 'COMPRESSION-STRESS REFERENCE',
      loadKN: stressLoad,
      type: 'compression-reference',
      status: 'REFERENCE',
      sourceStatus: 'material dataset',
      note: 'Amplified compression stress reaches the selected material compression/yield reference under the current idealisation.'
    }));
  }

  if (positive(eulerCriticalKN)) {
    events.push(event({
      id: 'euler-reference',
      label: 'ELASTIC EULER BUCKLING REFERENCE',
      loadKN: eulerCriticalKN,
      type: 'buckling-reference',
      status: 'THEORETICAL',
      sourceStatus: 'Euler model',
      note: 'Ideal elastic Euler reference for the selected K and governing weak axis; not a post-buckling prediction.'
    }));
  }

  if (!events.length) throw new Error('The current column result has no finite governing event for an automatic test.');

  // The automatic column test must stop at the earliest implemented adverse limit.
  const adverse = events.filter((item) => item.id !== 'euler-reference' || !positive(predictedCapacityKN));
  const terminalCandidate = adverse.sort((a, b) => a.loadKN - b.loadKN)[0] ?? events.sort((a, b) => a.loadKN - b.loadKN)[0];
  const visible = sortUnique(events).filter((item) => item.loadKN <= terminalCandidate.loadKN * (1 + 1e-8) || item.id === terminalCandidate.id);
  const timeline = terminalize(visible, terminalCandidate.id);
  return {
    mode: 'column',
    events: timeline,
    terminalEvent: timeline.find((item) => item.terminal),
    boundary: 'Stops at the earliest implemented column limit. Post-buckling, crushing, splitting, local failure and connection degradation are not simulated.'
  };
}

export function timelineProgress(events, terminalLoadKN) {
  if (!Array.isArray(events) || !positive(terminalLoadKN)) return [];
  return events.map((item) => ({
    ...item,
    progress: Math.max(0, Math.min(1, item.loadKN / terminalLoadKN))
  }));
}
