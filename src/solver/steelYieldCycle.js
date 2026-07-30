import { solveBeam } from './beamFem.js';

const EPSILON = 1e-9;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function classifyYieldBoundary(leftSupport, rightSupport) {
  const leftSimple = leftSupport === 'pin' || leftSupport === 'roller';
  const rightSimple = rightSupport === 'pin' || rightSupport === 'roller';
  if (leftSimple && rightSimple) return 'simply-supported';
  if (leftSupport === 'fixed' && rightSupport === 'free') return 'cantilever-left';
  if (leftSupport === 'free' && rightSupport === 'fixed') return 'cantilever-right';
  return 'unsupported';
}

function mechanismMode(boundaryCase, xM, lengthM, hingeLocationM) {
  if (boundaryCase === 'simply-supported') {
    if (hingeLocationM <= EPSILON || hingeLocationM >= lengthM - EPSILON) return 0;
    return xM <= hingeLocationM
      ? xM / hingeLocationM
      : (lengthM - xM) / (lengthM - hingeLocationM);
  }
  if (boundaryCase === 'cantilever-left') return xM / lengthM;
  if (boundaryCase === 'cantilever-right') return (lengthM - xM) / lengthM;
  return 0;
}

function hingeLocation(boundaryCase, loadPositionM, lengthM) {
  if (boundaryCase === 'simply-supported') return loadPositionM;
  if (boundaryCase === 'cantilever-left') return 0;
  if (boundaryCase === 'cantilever-right') return lengthM;
  return null;
}

function peakDisplacementPoint(series) {
  return series.reduce((peak, point) => (
    Math.abs(point.displacementMm) > Math.abs(peak.displacementMm) ? point : peak
  ), series[0]);
}

function validatePositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

export function createSteelYieldModel({
  lengthM,
  elasticModulusMPa,
  inertiaMm4,
  sectionModulusMm3,
  yieldStrengthMPa,
  leftSupport,
  rightSupport,
  loadPositionM,
  requestedPeakLoadKN,
  postYieldTangentRatio = 0.05,
  loadingDurationS = 5,
  holdDurationS = 1,
  unloadingDurationS = 5,
  residualDurationS = 2,
  maximumModelLoadRatio = 1.20
}) {
  validatePositive('Member length', lengthM);
  validatePositive('Elastic modulus', elasticModulusMPa);
  validatePositive('Second moment of area', inertiaMm4);
  validatePositive('Section modulus', sectionModulusMm3);
  validatePositive('Yield strength', yieldStrengthMPa);
  validatePositive('Requested peak load', requestedPeakLoadKN);
  validatePositive('Loading duration', loadingDurationS);
  if (![holdDurationS, unloadingDurationS, residualDurationS].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error('Hold, unloading, and residual durations cannot be negative.');
  }
  if (loadPositionM < 0 || loadPositionM > lengthM) throw new Error('Point-load position must lie on the member.');

  const boundaryCase = classifyYieldBoundary(leftSupport, rightSupport);
  if (boundaryCase === 'unsupported') {
    throw new Error('NL-001 currently supports pin/roller-ended beams and one-sided cantilevers only. Fixed–fixed and mixed indeterminate frames require moment redistribution with multiple plastic hinges.');
  }

  const tangentRatio = clamp(postYieldTangentRatio, 0.005, 1);
  const unitResult = solveBeam({
    lengthM,
    elasticModulusMPa,
    inertiaMm4,
    sectionModulusMm3,
    leftSupport,
    rightSupport,
    pointLoads: [{ xM: loadPositionM, forceKN: 1 }]
  });

  if (unitResult.maxMomentKNm <= EPSILON || unitResult.maxDeflectionMm <= EPSILON) {
    throw new Error('The selected load position does not generate a usable bending response for yield-cycle analysis.');
  }

  const yieldMomentKNm = yieldStrengthMPa * sectionModulusMm3 / 1_000_000;
  const firstYieldLoadKN = yieldMomentKNm / unitResult.maxMomentKNm;
  const maximumModelLoadKN = firstYieldLoadKN * maximumModelLoadRatio;
  const analysedPeakLoadKN = Math.min(requestedPeakLoadKN, maximumModelLoadKN);
  const terminatedAtModelLimit = requestedPeakLoadKN > maximumModelLoadKN + EPSILON;
  const hingeLocationM = hingeLocation(boundaryCase, loadPositionM, lengthM);
  const unitPeak = peakDisplacementPoint(unitResult.deflectionSeries);
  const displacementSign = Math.sign(unitPeak.displacementMm) || -1;
  const elasticComplianceMmPerKN = unitResult.maxDeflectionMm;
  const totalDurationS = loadingDurationS + holdDurationS + unloadingDurationS + residualDurationS;

  return {
    lengthM,
    elasticModulusMPa,
    inertiaMm4,
    sectionModulusMm3,
    yieldStrengthMPa,
    yieldMomentKNm,
    firstYieldLoadKN,
    requestedPeakLoadKN,
    analysedPeakLoadKN,
    maximumModelLoadKN,
    maximumModelLoadRatio,
    terminatedAtModelLimit,
    postYieldTangentRatio: tangentRatio,
    leftSupport,
    rightSupport,
    boundaryCase,
    loadPositionM,
    hingeLocationM,
    unitResult,
    displacementSign,
    elasticComplianceMmPerKN,
    loadingDurationS,
    holdDurationS,
    unloadingDurationS,
    residualDurationS,
    totalDurationS
  };
}

function totalDeflectionMagnitude(model, loadKN) {
  const elasticAtYield = model.elasticComplianceMmPerKN * model.firstYieldLoadKN;
  if (loadKN <= model.firstYieldLoadKN) return model.elasticComplianceMmPerKN * loadKN;
  return elasticAtYield
    + model.elasticComplianceMmPerKN * (loadKN - model.firstYieldLoadKN) / model.postYieldTangentRatio;
}

function plasticAmplitudeAtLoad(model, loadKN) {
  if (loadKN <= model.firstYieldLoadKN) return 0;
  return Math.max(0, totalDeflectionMagnitude(model, loadKN) - model.elasticComplianceMmPerKN * loadKN);
}

export function loadAtTime(model, timeS) {
  const time = clamp(timeS, 0, model.totalDurationS);
  const loadingEnd = model.loadingDurationS;
  const holdEnd = loadingEnd + model.holdDurationS;
  const unloadingEnd = holdEnd + model.unloadingDurationS;

  if (time <= loadingEnd) {
    return {
      phase: 'loading',
      appliedLoadKN: model.analysedPeakLoadKN * (time / loadingEnd),
      timeS: time
    };
  }
  if (time <= holdEnd) {
    return { phase: 'hold', appliedLoadKN: model.analysedPeakLoadKN, timeS: time };
  }
  if (time <= unloadingEnd && model.unloadingDurationS > 0) {
    const progress = (time - holdEnd) / model.unloadingDurationS;
    return {
      phase: 'unloading',
      appliedLoadKN: model.analysedPeakLoadKN * (1 - progress),
      timeS: time
    };
  }
  return { phase: 'residual', appliedLoadKN: 0, timeS: time };
}

function plasticRotationRad(model, plasticAmplitudeMm) {
  const amplitudeM = plasticAmplitudeMm / 1000;
  if (plasticAmplitudeMm <= 0) return 0;
  if (model.boundaryCase === 'simply-supported') {
    const leftLength = Math.max(model.hingeLocationM, EPSILON);
    const rightLength = Math.max(model.lengthM - model.hingeLocationM, EPSILON);
    return amplitudeM / leftLength + amplitudeM / rightLength;
  }
  return amplitudeM / model.lengthM;
}

export function evaluateSteelYieldState(model, timeS) {
  const schedule = loadAtTime(model, timeS);
  const peakPlasticAmplitudeMm = plasticAmplitudeAtLoad(model, model.analysedPeakLoadKN);
  const plasticAmplitudeMm = schedule.phase === 'loading'
    ? plasticAmplitudeAtLoad(model, schedule.appliedLoadKN)
    : peakPlasticAmplitudeMm;
  const yielded = model.analysedPeakLoadKN >= model.firstYieldLoadKN - EPSILON
    && (schedule.phase !== 'loading' || schedule.appliedLoadKN >= model.firstYieldLoadKN - EPSILON);

  const deflectionSeries = model.unitResult.deflectionSeries.map((point) => {
    const elasticDisplacementMm = point.displacementMm * schedule.appliedLoadKN;
    const plasticDisplacementMm = model.displacementSign
      * mechanismMode(model.boundaryCase, point.xM, model.lengthM, model.hingeLocationM)
      * plasticAmplitudeMm;
    return {
      xM: point.xM,
      displacementMm: elasticDisplacementMm + plasticDisplacementMm,
      elasticDisplacementMm,
      plasticDisplacementMm,
      rotationRad: point.rotationRad * schedule.appliedLoadKN
    };
  });

  const peak = peakDisplacementPoint(deflectionSeries);
  const elasticTrialStressMPa = model.unitResult.maxBendingStressMPa * schedule.appliedLoadKN;
  const sectionStressMPa = elasticTrialStressMPa <= model.yieldStrengthMPa
    ? elasticTrialStressMPa
    : model.yieldStrengthMPa + model.postYieldTangentRatio * (elasticTrialStressMPa - model.yieldStrengthMPa);
  const residualDeflectionMm = peakPlasticAmplitudeMm;
  const firstYieldTimeS = model.analysedPeakLoadKN >= model.firstYieldLoadKN
    ? model.loadingDurationS * model.firstYieldLoadKN / model.analysedPeakLoadKN
    : null;

  let state = 'elastic';
  if (schedule.phase === 'loading' && yielded) state = 'yielding';
  else if (schedule.phase === 'hold' && yielded) state = 'plastic-hold';
  else if (schedule.phase === 'unloading' && peakPlasticAmplitudeMm > 0) state = 'elastic-unloading-with-residual';
  else if (schedule.phase === 'residual' && peakPlasticAmplitudeMm > 0) state = 'residual-deformation';
  else if (schedule.phase === 'unloading') state = 'elastic-unloading';
  else if (schedule.phase === 'residual') state = 'returned-to-zero';

  return {
    ...schedule,
    state,
    yielded,
    deflectionSeries,
    maxDeflectionMm: Math.abs(peak.displacementMm),
    peakDeflectionPoint: peak,
    plasticAmplitudeMm,
    residualDeflectionMm,
    plasticRotationRad: plasticRotationRad(model, plasticAmplitudeMm),
    residualPlasticRotationRad: plasticRotationRad(model, peakPlasticAmplitudeMm),
    elasticTrialStressMPa,
    sectionStressMPa,
    firstYieldTimeS,
    currentMomentKNm: model.unitResult.maxMomentKNm * schedule.appliedLoadKN,
    peakMomentKNm: model.unitResult.maxMomentKNm * model.analysedPeakLoadKN
  };
}

export function buildSteelYieldHistory(model, sampleCount = 121) {
  const count = Math.max(2, Math.floor(sampleCount));
  return Array.from({ length: count }, (_, index) => {
    const timeS = model.totalDurationS * index / (count - 1);
    const state = evaluateSteelYieldState(model, timeS);
    return {
      timeS,
      phase: state.phase,
      state: state.state,
      appliedLoadKN: state.appliedLoadKN,
      maxDeflectionMm: state.maxDeflectionMm,
      yielded: state.yielded
    };
  });
}
