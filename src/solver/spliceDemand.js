function requirePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
}

function ratio(demand, capacity) {
  if (!Number.isFinite(capacity) || capacity <= 0) return null;
  return Math.abs(demand) / capacity;
}

export function minimumStockPieces({ requiredLengthM, stockLengthM, overlapM = 0 }) {
  requirePositive(requiredLengthM, 'Required assembled length');
  requirePositive(stockLengthM, 'Available stock length');
  if (!Number.isFinite(overlapM) || overlapM < 0) throw new Error('Main-member overlap cannot be negative.');
  if (overlapM >= stockLengthM) throw new Error('Main-member overlap must be shorter than one stock piece.');

  for (let pieces = 1; pieces <= 100; pieces += 1) {
    const spliceCount = Math.max(0, pieces - 1);
    const maximumAssembledLengthM = pieces * stockLengthM - spliceCount * overlapM;
    if (maximumAssembledLengthM + 1e-9 >= requiredLengthM) {
      const totalPurchasedLengthM = pieces * stockLengthM;
      const totalUsedPieceLengthM = requiredLengthM + spliceCount * overlapM;
      return {
        pieces,
        spliceCount,
        maximumAssembledLengthM,
        totalPurchasedLengthM,
        totalUsedPieceLengthM,
        wasteLengthM: Math.max(0, totalPurchasedLengthM - totalUsedPieceLengthM)
      };
    }
  }

  throw new Error('The requested assembly requires more than 100 stock pieces.');
}

export function feasibleSingleSpliceInterval({ requiredLengthM, stockLengthM, overlapM = 0 }) {
  requirePositive(requiredLengthM, 'Required assembled length');
  requirePositive(stockLengthM, 'Available stock length');
  if (!Number.isFinite(overlapM) || overlapM < 0) throw new Error('Main-member overlap cannot be negative.');

  const halfOverlapM = overlapM / 2;
  const minimumM = Math.max(0, requiredLengthM - stockLengthM + halfOverlapM);
  const maximumM = Math.min(requiredLengthM, stockLengthM - halfOverlapM);
  return {
    feasible: minimumM <= maximumM + 1e-9,
    minimumM,
    maximumM
  };
}

function actionFromElement(element, xM) {
  const localXmm = (xM - element.startM) * 1000;
  const shearN = element.localForces[0];
  const momentNmm = -element.localForces[1] + shearN * localXmm;
  return {
    startM: element.startM,
    endM: element.endM,
    shearKN: shearN / 1000,
    momentKNm: momentNmm / 1_000_000
  };
}

export function internalActionsAtSplice(beamResult, xM, tolerance = 1e-8) {
  if (!beamResult?.elementForces?.length) throw new Error('A solved beam result is required.');
  if (!Number.isFinite(xM)) throw new Error('Splice position must be a finite number.');

  const first = beamResult.elementForces[0];
  const last = beamResult.elementForces[beamResult.elementForces.length - 1];
  if (xM < first.startM - tolerance || xM > last.endM + tolerance) {
    throw new Error('Splice position lies outside the analysed member.');
  }

  const adjacent = beamResult.elementForces.filter((element) => (
    xM >= element.startM - tolerance && xM <= element.endM + tolerance
  ));
  if (adjacent.length === 0) throw new Error('No beam element contains the splice position.');

  const sideActions = adjacent.map((element) => actionFromElement(element, Math.max(element.startM, Math.min(element.endM, xM))));
  const governingMoment = sideActions.reduce((peak, action) => (
    Math.abs(action.momentKNm) > Math.abs(peak.momentKNm) ? action : peak
  ), sideActions[0]);
  const governingShear = sideActions.reduce((peak, action) => (
    Math.abs(action.shearKN) > Math.abs(peak.shearKN) ? action : peak
  ), sideActions[0]);

  return {
    xM,
    momentKNm: governingMoment.momentKNm,
    momentMagnitudeKNm: Math.abs(governingMoment.momentKNm),
    shearKN: governingShear.shearKN,
    shearMagnitudeKN: Math.abs(governingShear.shearKN),
    sideActions
  };
}

export function evaluateSpliceDemand({
  momentKNm,
  shearKN,
  axialKN = 0,
  momentCapacityKNm,
  shearCapacityKN,
  axialCapacityKN = null,
  rotationalStiffnessKNmPerRad = null,
  shearStiffnessKNPerMm = null
}) {
  const momentRatio = ratio(momentKNm, momentCapacityKNm);
  const shearRatio = ratio(shearKN, shearCapacityKN);
  const axialRatio = ratio(axialKN, axialCapacityKN);
  const availableRatios = [
    ['moment', momentRatio],
    ['shear', shearRatio],
    ['axial', axialRatio]
  ].filter(([, value]) => value != null);

  const governing = availableRatios.length
    ? availableRatios.reduce((peak, item) => item[1] > peak[1] ? item : peak)
    : ['unrated', null];
  const governingRatio = governing[1];

  let state = 'unrated';
  if (governingRatio != null) {
    state = governingRatio >= 1 ? 'exceeded' : governingRatio >= 0.8 ? 'approaching' : 'within';
  }

  return {
    momentRatio,
    shearRatio,
    axialRatio,
    governingMode: governing[0],
    governingRatio,
    state,
    estimatedRotationRad: Number.isFinite(rotationalStiffnessKNmPerRad) && rotationalStiffnessKNmPerRad > 0
      ? momentKNm / rotationalStiffnessKNmPerRad
      : null,
    estimatedShearSlipMm: Number.isFinite(shearStiffnessKNPerMm) && shearStiffnessKNPerMm > 0
      ? shearKN / shearStiffnessKNPerMm
      : null
  };
}

export function suggestSpliceLocation({
  beamResult,
  requiredLengthM,
  stockLengthM,
  overlapM = 0,
  momentCapacityKNm = null,
  shearCapacityKN = null,
  stepM = 0.05,
  endClearanceM = 0.1
}) {
  requirePositive(stepM, 'Splice search step');
  const interval = feasibleSingleSpliceInterval({ requiredLengthM, stockLengthM, overlapM });
  if (!interval.feasible) return { feasible: false, interval, candidates: [] };

  const startM = Math.max(interval.minimumM, endClearanceM);
  const endM = Math.min(interval.maximumM, requiredLengthM - endClearanceM);
  if (startM > endM + 1e-9) return { feasible: false, interval, candidates: [] };

  const positions = [];
  for (let xM = startM; xM <= endM + 1e-9; xM += stepM) positions.push(Math.min(xM, endM));
  if (positions.length === 0 || Math.abs(positions[positions.length - 1] - endM) > 1e-8) positions.push(endM);

  const actions = positions.map((xM) => internalActionsAtSplice(beamResult, xM));
  const maxMoment = Math.max(...actions.map((item) => item.momentMagnitudeKNm), 1e-12);
  const maxShear = Math.max(...actions.map((item) => item.shearMagnitudeKN), 1e-12);
  const midpoint = (startM + endM) / 2;

  const candidates = actions.map((item) => {
    const momentScore = Number.isFinite(momentCapacityKNm) && momentCapacityKNm > 0
      ? item.momentMagnitudeKNm / momentCapacityKNm
      : item.momentMagnitudeKNm / maxMoment;
    const shearScore = Number.isFinite(shearCapacityKN) && shearCapacityKN > 0
      ? item.shearMagnitudeKN / shearCapacityKN
      : item.shearMagnitudeKN / maxShear;
    return {
      ...item,
      score: Math.max(momentScore, shearScore),
      momentScore,
      shearScore,
      balanceDistanceM: Math.abs(item.xM - midpoint)
    };
  });

  candidates.sort((a, b) => a.score - b.score || a.balanceDistanceM - b.balanceDistanceM || a.xM - b.xM);
  return {
    feasible: true,
    interval,
    startM,
    endM,
    recommended: candidates[0],
    candidates
  };
}
