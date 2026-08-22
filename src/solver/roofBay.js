import { solveCPurlinLoadCase } from './cPurlinLoadCases.js';

const EPS = 1e-9;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = finite(value, fallback);
  return number > 0 ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, finite(value, min)));
}

/**
 * Create equally spaced purlin stations from eave (0) to ridge/high edge
 * (roofSlopeLengthM). The requested spacing is treated as a maximum so the
 * final bay is never a tiny remainder bay.
 */
export function roofBayPurlinStations(roofSlopeLengthM = 4, maxSpacingM = 0.8) {
  const length = positive(roofSlopeLengthM, 4);
  const requested = positive(maxSpacingM, 0.8);
  const spaces = Math.max(1, Math.ceil(length / requested - EPS));
  const actualSpacingM = length / spaces;
  const stationsM = Array.from({ length: spaces + 1 }, (_, index) => index * actualSpacingM);
  stationsM[stationsM.length - 1] = length;
  return { roofSlopeLengthM: length, requestedMaxSpacingM: requested, actualSpacingM, spaces, stationsM };
}

/**
 * Tributary widths are based on half the distance to the adjacent purlin on
 * each side. End rows therefore receive half of the adjacent spacing.
 */
export function tributaryWidthsFromStations(stationsM = []) {
  if (!Array.isArray(stationsM) || stationsM.length < 2) {
    throw new Error('At least two purlin stations are required.');
  }
  const clean = stationsM.map((value) => finite(value, NaN));
  if (!clean.every(Number.isFinite)) throw new Error('Purlin stations must be finite numbers.');
  for (let index = 1; index < clean.length; index += 1) {
    if (!(clean[index] > clean[index - 1])) throw new Error('Purlin stations must be strictly increasing.');
  }
  return clean.map((station, index) => {
    const leftHalf = index === 0 ? 0 : (station - clean[index - 1]) / 2;
    const rightHalf = index === clean.length - 1 ? 0 : (clean[index + 1] - station) / 2;
    return leftHalf + rightHalf;
  });
}

function windSign(windSense) {
  return windSense === 'downward' ? 1 : -1;
}

function vectorMagnitude(normalKN, parallelKN) {
  return Math.hypot(normalKN, parallelKN);
}

export function solveRoofBay({
  preset,
  rafterSpacingM = 3,
  roofSlopeLengthM = 4,
  maxPurlinSpacingM = 0.8,
  slopeDeg = 25,
  orientationDeg = 0,
  elasticModulusMPa = 200000,
  yieldStrengthMPa = 250,
  densityKgM3 = 7850,
  mode = 'combined',
  deadLoadKPa = 0.2,
  roofLiveLoadKPa = 0.75,
  windPressureKPa = 1.5,
  windSense = 'uplift',
  loadFactor = 1
} = {}) {
  if (!preset?.productCategory || preset.productCategory !== 'c-purlin') {
    throw new Error('Roof Bay v0.1 requires a C-purlin catalog preset.');
  }

  const spanM = positive(rafterSpacingM, 3);
  const slopeLengthM = positive(roofSlopeLengthM, 4);
  const slope = clamp(slopeDeg, 0, 60);
  const factor = Math.max(0, finite(loadFactor, 1));
  const safeMode = ['gravity', 'wind', 'combined'].includes(mode) ? mode : 'combined';
  const safeWindSense = windSense === 'downward' ? 'downward' : 'uplift';
  const layout = roofBayPurlinStations(slopeLengthM, maxPurlinSpacingM);
  const tributaryWidthsM = tributaryWidthsFromStations(layout.stationsM);

  const purlins = layout.stationsM.map((stationM, index) => {
    const tributaryWidthM = tributaryWidthsM[index];
    const result = solveCPurlinLoadCase({
      preset,
      orientationDeg,
      spanM,
      elasticModulusMPa,
      yieldStrengthMPa,
      densityKgM3,
      mode: safeMode,
      slopeDeg: slope,
      tributaryWidthM,
      deadLoadKPa,
      roofLiveLoadKPa,
      windPressureKPa,
      windSense: safeWindSense,
      loadFactor: factor
    });
    const totalNormalKN = result.loads.normalKNM * spanM;
    const totalParallelKN = result.loads.parallelKNM * spanM;
    const reaction = {
      normalKN: totalNormalKN / 2,
      parallelKN: totalParallelKN / 2,
      resultantKN: vectorMagnitude(totalNormalKN / 2, totalParallelKN / 2)
    };
    return {
      index,
      label: `P${index + 1}`,
      stationM,
      tributaryWidthM,
      edge: index === 0 || index === layout.stationsM.length - 1,
      result,
      totalNormalKN,
      totalParallelKN,
      leftRafterReaction: { ...reaction },
      rightRafterReaction: { ...reaction },
      connectionStatus: 'UNRESOLVED'
    };
  });

  const leftPointLoads = purlins.map((purlin) => ({
    purlin: purlin.label,
    stationM: purlin.stationM,
    ...purlin.leftRafterReaction
  }));
  const rightPointLoads = purlins.map((purlin) => ({
    purlin: purlin.label,
    stationM: purlin.stationM,
    ...purlin.rightRafterReaction
  }));

  const sumReactionNormalKN = purlins.reduce((sum, item) => sum + item.leftRafterReaction.normalKN + item.rightRafterReaction.normalKN, 0);
  const sumReactionParallelKN = purlins.reduce((sum, item) => sum + item.leftRafterReaction.parallelKN + item.rightRafterReaction.parallelKN, 0);

  const areaM2 = slopeLengthM * spanM;
  const includeGravity = safeMode !== 'wind';
  const includeWind = safeMode !== 'gravity';
  const theta = slope * Math.PI / 180;
  const gravityAreaKPa = Math.max(0, finite(deadLoadKPa, 0)) + Math.max(0, finite(roofLiveLoadKPa, 0));
  const roofGravityVerticalKN = includeGravity ? gravityAreaKPa * areaM2 * factor : 0;
  const purlinSelfWeightVerticalKN = includeGravity
    ? purlins.reduce((sum, item) => sum + item.result.loads.selfWeightKNM * spanM * factor, 0)
    : 0;
  const totalGravityVerticalKN = roofGravityVerticalKN + purlinSelfWeightVerticalKN;
  const windNormalKN = includeWind ? windSign(safeWindSense) * Math.max(0, finite(windPressureKPa, 0)) * areaM2 * factor : 0;
  const appliedNormalKN = totalGravityVerticalKN * Math.cos(theta) + windNormalKN;
  const appliedParallelKN = totalGravityVerticalKN * Math.sin(theta);

  const normalResidualKN = sumReactionNormalKN - appliedNormalKN;
  const parallelResidualKN = sumReactionParallelKN - appliedParallelKN;
  const residualKN = vectorMagnitude(normalResidualKN, parallelResidualKN);
  const appliedMagnitudeKN = Math.max(EPS, vectorMagnitude(appliedNormalKN, appliedParallelKN));
  const relativeResidual = residualKN / appliedMagnitudeKN;

  const leftRafter = {
    pointLoads: leftPointLoads,
    normalKN: leftPointLoads.reduce((sum, item) => sum + item.normalKN, 0),
    parallelKN: leftPointLoads.reduce((sum, item) => sum + item.parallelKN, 0)
  };
  leftRafter.resultantKN = vectorMagnitude(leftRafter.normalKN, leftRafter.parallelKN);
  const rightRafter = {
    pointLoads: rightPointLoads,
    normalKN: rightPointLoads.reduce((sum, item) => sum + item.normalKN, 0),
    parallelKN: rightPointLoads.reduce((sum, item) => sum + item.parallelKN, 0)
  };
  rightRafter.resultantKN = vectorMagnitude(rightRafter.normalKN, rightRafter.parallelKN);

  const governingPurlin = [...purlins].sort((a, b) => {
    const utilizationDiff = (b.result.utilization ?? 0) - (a.result.utilization ?? 0);
    if (Math.abs(utilizationDiff) > EPS) return utilizationDiff;
    return (b.result.resultantDeflectionMm ?? 0) - (a.result.resultantDeflectionMm ?? 0);
  })[0] ?? null;

  return {
    model: 'ROOF-BAY-M2-v0.1',
    boundary: 'Two-rafter, simply-supported purlin bay. Roof sheet and fasteners route demand only; their capacities and rafter/truss member capacities are unresolved.',
    inputs: {
      rafterSpacingM: spanM,
      roofSlopeLengthM: slopeLengthM,
      maxPurlinSpacingM: positive(maxPurlinSpacingM, 0.8),
      slopeDeg: slope,
      orientationDeg,
      mode: safeMode,
      deadLoadKPa: Math.max(0, finite(deadLoadKPa, 0)),
      roofLiveLoadKPa: Math.max(0, finite(roofLiveLoadKPa, 0)),
      windPressureKPa: Math.max(0, finite(windPressureKPa, 0)),
      windSense: safeWindSense,
      loadFactor: factor
    },
    geometry: {
      areaM2,
      ...layout,
      purlinCount: purlins.length,
      tributaryWidthsM
    },
    purlins,
    rafters: { left: leftRafter, right: rightRafter },
    applied: {
      roofGravityVerticalKN,
      purlinSelfWeightVerticalKN,
      totalGravityVerticalKN,
      windNormalKN,
      normalKN: appliedNormalKN,
      parallelKN: appliedParallelKN,
      resultantKN: vectorMagnitude(appliedNormalKN, appliedParallelKN)
    },
    equilibrium: {
      reactionNormalKN: sumReactionNormalKN,
      reactionParallelKN: sumReactionParallelKN,
      normalResidualKN,
      parallelResidualKN,
      residualKN,
      relativeResidual,
      tolerance: 1e-9,
      pass: relativeResidual <= 1e-9 || residualKN <= 1e-9
    },
    governingPurlin,
    loadPath: ['roof sheet pressure', 'sheet-to-purlin fasteners (demand routing only)', 'purlins', 'left/right rafter reactions', 'supporting system (not analyzed here)']
  };
}
