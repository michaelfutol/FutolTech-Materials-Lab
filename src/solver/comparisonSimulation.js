export const COMPARISON_SIMULATION_SCHEMA = 'futoltech.structural-lab.comparison-simulation';
export const COMPARISON_SIMULATION_VERSION = '1.0.0';

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function crossed(loadKN, thresholdKN) {
  return Number.isFinite(loadKN) && Number.isFinite(thresholdKN)
    && loadKN + Math.max(1e-9, Math.abs(thresholdKN) * 1e-8) >= thresholdKN;
}

function beamEvents(record, loadKN) {
  const events = [];
  const deflectionThresholdKN = record.deflectionRatio > 0
    ? loadKN / record.deflectionRatio
    : null;
  if (Number.isFinite(deflectionThresholdKN) && deflectionThresholdKN >= 0) {
    events.push({ loadKN: deflectionThresholdKN, label: 'SERVICEABILITY LIMIT', kind: 'serviceability' });
  }

  if (Number.isFinite(record.referenceThresholdLoadKN)) {
    let label = 'STRENGTH REFERENCE';
    if (record.productCategory === 'c-purlin') label = 'GROSS FIRST-YIELD SCREEN';
    else if (record.family === 'steel') label = 'FIRST YIELD';
    else if (record.family === 'bamboo') label = 'BENDING REFERENCE';
    else label = 'WORKING / ALLOWABLE REFERENCE';
    events.push({ loadKN: record.referenceThresholdLoadKN, label, kind: 'strength-reference' });
  }

  if (Number.isFinite(record.physicalThresholdLoadKN)) {
    let label = 'PHYSICAL REFERENCE';
    if (record.productCategory === 'c-purlin') label = 'GROSS FIRST-YIELD SCREEN';
    else if (record.family === 'steel') label = 'FIRST YIELD';
    else if (record.family === 'bamboo') label = 'CHARACTERISTIC BENDING REFERENCE';
    else label = 'RUPTURE REFERENCE';
    events.push({ loadKN: record.physicalThresholdLoadKN, label, kind: 'physical-reference' });
  }

  const unique = new Map();
  for (const event of events) {
    const key = `${event.label}:${event.loadKN.toPrecision(12)}`;
    unique.set(key, event);
  }
  return [...unique.values()].sort((a, b) => a.loadKN - b.loadKN);
}

export function currentComparisonEvent(record, loadKN, mode = 'beam') {
  if (mode === 'compression') {
    if (record.governingRatio >= 1) {
      return {
        label: record.screeningOnly ? 'SCREENING LIMIT' : 'GOVERNING COMPRESSION LIMIT',
        kind: record.screeningOnly ? 'screening' : 'capacity',
        loadKN
      };
    }
    return { label: 'ELASTIC COMPRESSION', kind: 'elastic', loadKN: 0 };
  }

  const crossedEvents = beamEvents(record, loadKN).filter((event) => crossed(loadKN, event.loadKN));
  return crossedEvents.at(-1) ?? { label: 'ELASTIC RESPONSE', kind: 'elastic', loadKN: 0 };
}

export function comparisonSimulationFrame({
  index,
  progress,
  timeS,
  loadKN,
  mode,
  result,
  orientationDegreesById = {}
}) {
  if (!result?.records?.length) throw new Error('Comparison simulation frame requires solver records.');
  if (!Number.isFinite(loadKN) || loadKN < 0) throw new Error('Comparison simulation load must be zero or greater.');
  if (!Number.isFinite(timeS) || timeS < 0) throw new Error('Comparison simulation time must be zero or greater.');

  return {
    index,
    progress,
    timeS,
    loadKN,
    mode,
    members: result.records.map((record) => {
      const event = currentComparisonEvent(record, loadKN, mode);
      return {
        id: record.comparisonId,
        label: record.comparisonLabel,
        materialId: record.materialId,
        sectionId: record.basePresetId ?? record.presetId ?? null,
        productCategory: record.productCategory ?? null,
        orientation: record.orientation,
        orientationDeg: orientationDegreesById[record.comparisonId] ?? null,
        status: record.pass ? (record.screeningOnly ? 'SCREENING' : 'PASS') : 'FAIL',
        event,
        response: mode === 'beam'
          ? {
              maxMomentKNm: finiteOrNull(record.result?.maxMomentKNm),
              maxDeflectionMm: finiteOrNull(record.result?.maxDeflectionMm),
              maxBendingStressMPa: finiteOrNull(record.result?.maxBendingStressMPa),
              strengthUse: finiteOrNull(record.strengthRatio),
              deflectionUse: finiteOrNull(record.deflectionRatio),
              governingUse: finiteOrNull(record.governingRatio)
            }
          : {
              axialLoadKN: loadKN,
              maxCompressionStressMPa: finiteOrNull(record.result?.maxCompressionStressMPa),
              shorteningMm: finiteOrNull(record.result?.shorteningMm),
              capacityUse: finiteOrNull(record.capacityRatio),
              stressUse: finiteOrNull(record.stressRatio),
              governingUse: finiteOrNull(record.governingRatio)
            }
      };
    })
  };
}

export function comparisonSimulationPackage({
  loadingRateKNPerS,
  targetLoadKN,
  mode,
  conditions,
  frames
}) {
  if (!Number.isFinite(loadingRateKNPerS) || loadingRateKNPerS <= 0) {
    throw new Error('Simulation loading rate must be greater than zero.');
  }
  if (!Number.isFinite(targetLoadKN) || targetLoadKN <= 0) {
    throw new Error('Simulation target load must be greater than zero.');
  }
  if (!Array.isArray(frames) || frames.length < 2) throw new Error('Simulation export requires at least two frames.');

  return {
    schema: COMPARISON_SIMULATION_SCHEMA,
    version: COMPARISON_SIMULATION_VERSION,
    sourceSystem: 'FutolTech Structural Lab',
    simulationType: 'synchronized quasi-static comparison',
    mode,
    loadingRateKNPerS,
    targetLoadKN,
    virtualDurationS: targetLoadKN / loadingRateKNPerS,
    conditions,
    frames,
    analysisBoundary: 'Frames are deterministic Structural Lab solver states under one shared quasi-static load history. Time is load/rate, not dynamic time integration. No unimplemented fracture, post-buckling, local/distortional buckling or connection failure is inferred.'
  };
}
