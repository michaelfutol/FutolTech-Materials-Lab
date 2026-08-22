import { solveCPurlinLoadCase } from './cPurlinLoadCases.js';

const EPS = 1e-9;
const PRESSURE_ZONE_TYPES = Object.freeze(['field', 'edge', 'corner']);
const PRESSURE_ZONE_SCHEMA = 'futoltech.roof-pressure-zones/1';

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

function validatedStations(stationsM = []) {
  if (!Array.isArray(stationsM) || stationsM.length < 2) {
    throw new Error('At least two purlin stations are required.');
  }
  const clean = stationsM.map((value) => finite(value, NaN));
  if (!clean.every(Number.isFinite)) throw new Error('Purlin stations must be finite numbers.');
  for (let index = 1; index < clean.length; index += 1) {
    if (!(clean[index] > clean[index - 1])) throw new Error('Purlin stations must be strictly increasing.');
  }
  return clean;
}

export function roofBayPurlinStations(roofSlopeLengthM = 4, maxSpacingM = 0.8) {
  const length = positive(roofSlopeLengthM, 4);
  const requested = positive(maxSpacingM, 0.8);
  const spaces = Math.max(1, Math.ceil(length / requested - EPS));
  const actualSpacingM = length / spaces;
  const stationsM = Array.from({ length: spaces + 1 }, (_, index) => index * actualSpacingM);
  stationsM[stationsM.length - 1] = length;
  const stationGapsM = stationsM.slice(1).map((station, index) => station - stationsM[index]);
  return {
    layoutMode: 'equal-max-spacing',
    roofSlopeLengthM: length,
    requestedMaxSpacingM: requested,
    actualSpacingM,
    minSpacingM: actualSpacingM,
    maxSpacingM: actualSpacingM,
    spaces,
    stationsM,
    stationGapsM
  };
}

export function customRoofBayPurlinLayout(roofSlopeLengthM = 4, stationsM = []) {
  const length = positive(roofSlopeLengthM, 4);
  const clean = validatedStations(stationsM);
  if (clean[0] < -EPS || clean[clean.length - 1] > length + EPS) {
    throw new Error('Custom purlin stations must stay within the roof slope length.');
  }
  const bounded = clean.map((station) => clamp(station, 0, length));
  const stationGapsM = bounded.slice(1).map((station, index) => station - bounded[index]);
  return {
    layoutMode: 'custom-stations',
    roofSlopeLengthM: length,
    requestedMaxSpacingM: null,
    actualSpacingM: null,
    minSpacingM: Math.min(...stationGapsM),
    maxSpacingM: Math.max(...stationGapsM),
    spaces: stationGapsM.length,
    stationsM: bounded,
    stationGapsM
  };
}

export function tributaryBandsFromStations(stationsM = [], roofSlopeLengthM = null) {
  const clean = validatedStations(stationsM);
  const hasRoofBoundary = roofSlopeLengthM != null;
  const domainStartM = hasRoofBoundary ? 0 : clean[0];
  const domainEndM = hasRoofBoundary ? positive(roofSlopeLengthM, clean[clean.length - 1]) : clean[clean.length - 1];
  if (clean[0] < domainStartM - EPS || clean[clean.length - 1] > domainEndM + EPS) {
    throw new Error('Purlin stations must lie inside the tributary roof domain.');
  }

  return clean.map((stationM, index) => {
    const startM = index === 0 ? domainStartM : (clean[index - 1] + stationM) / 2;
    const endM = index === clean.length - 1 ? domainEndM : (stationM + clean[index + 1]) / 2;
    return { stationM, startM, endM, widthM: endM - startM };
  });
}

export function tributaryWidthsFromStations(stationsM = [], roofSlopeLengthM = null) {
  return tributaryBandsFromStations(stationsM, roofSlopeLengthM).map((band) => band.widthM);
}

function windSign(windSense) {
  return windSense === 'downward' ? 1 : -1;
}

function vectorMagnitude(normalKN, parallelKN) {
  return Math.hypot(normalKN, parallelKN);
}

function componentPass(residualKN, appliedKN, tolerance = 1e-9) {
  return Math.abs(residualKN) <= tolerance || Math.abs(residualKN) / Math.max(EPS, Math.abs(appliedKN)) <= tolerance;
}

function roofPlaneFrame(spanM, slopeLengthM) {
  return {
    system: 'roof-local-xy-m',
    origin: 'rafter-a-eave',
    xAxis: 'toward-rafter-b',
    yAxis: 'upslope',
    xExtentM: spanM,
    yExtentM: slopeLengthM
  };
}

function pressureZoningPlaceholder(spanM, slopeLengthM, windPressureKPa, windSense) {
  return {
    schemaVersion: PRESSURE_ZONE_SCHEMA,
    status: 'UNRESOLVED',
    activePressureModel: 'manual-uniform',
    coordinateFrame: roofPlaneFrame(spanM, slopeLengthM),
    supportedRegionTypes: [...PRESSURE_ZONE_TYPES],
    regions: [],
    codeBasis: null,
    manualUniformWind: {
      pressureKPa: windPressureKPa,
      sense: windSense
    },
    note: 'Field/edge/corner region types and a roof-local coordinate frame are reserved for M3. M2 applies one manual uniform wind pressure and does not calculate zone geometry, coefficients or zone pressures.'
  };
}

export function solveRoofBay({
  preset,
  rafterSpacingM = 3,
  roofSlopeLengthM = 4,
  maxPurlinSpacingM = 0.8,
  customPurlinStationsM = null,
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
  const safeWindPressureKPa = Math.max(0, finite(windPressureKPa, 0));
  const layout = customPurlinStationsM == null
    ? roofBayPurlinStations(slopeLengthM, maxPurlinSpacingM)
    : customRoofBayPurlinLayout(slopeLengthM, customPurlinStationsM);
  const tributaryBands = tributaryBandsFromStations(layout.stationsM, slopeLengthM);
  const tributaryWidthsM = tributaryBands.map((band) => band.widthM);

  const purlins = layout.stationsM.map((stationM, index) => {
    const tributaryBand = tributaryBands[index];
    const tributaryWidthM = tributaryBand.widthM;
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
      windPressureKPa: safeWindPressureKPa,
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
      tributaryStartM: tributaryBand.startM,
      tributaryEndM: tributaryBand.endM,
      tributaryWidthM,
      edge: index === 0 || index === layout.stationsM.length - 1,
      pressureZoneIds: [],
      pressureZoneStatus: 'UNASSIGNED_M3',
      result,
      totalNormalKN,
      totalParallelKN,
      leftRafterReaction: { ...reaction },
      rightRafterReaction: { ...reaction },
      connectionStatus: 'UNRESOLVED'
    };
  });

  const leftPointLoads = purlins.map((purlin) => ({ purlin: purlin.label, stationM: purlin.stationM, ...purlin.leftRafterReaction }));
  const rightPointLoads = purlins.map((purlin) => ({ purlin: purlin.label, stationM: purlin.stationM, ...purlin.rightRafterReaction }));

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

  const sumReactionNormalKN = leftRafter.normalKN + rightRafter.normalKN;
  const sumReactionParallelKN = leftRafter.parallelKN + rightRafter.parallelKN;

  const areaM2 = slopeLengthM * spanM;
  const includeGravity = safeMode !== 'wind';
  const includeWind = safeMode !== 'gravity';
  const theta = slope * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const gravityAreaKPa = Math.max(0, finite(deadLoadKPa, 0)) + Math.max(0, finite(roofLiveLoadKPa, 0));
  const roofGravityVerticalKN = includeGravity ? gravityAreaKPa * areaM2 * factor : 0;
  const purlinSelfWeightVerticalKN = includeGravity
    ? purlins.reduce((sum, item) => sum + item.result.loads.selfWeightKNM * spanM * factor, 0)
    : 0;
  const totalGravityVerticalKN = roofGravityVerticalKN + purlinSelfWeightVerticalKN;
  const roofGravityNormalKN = roofGravityVerticalKN * cosTheta;
  const purlinSelfWeightNormalKN = purlinSelfWeightVerticalKN * cosTheta;
  const roofGravityParallelKN = roofGravityVerticalKN * sinTheta;
  const purlinSelfWeightParallelKN = purlinSelfWeightVerticalKN * sinTheta;
  const windNormalKN = includeWind ? windSign(safeWindSense) * safeWindPressureKPa * areaM2 * factor : 0;
  const windParallelKN = 0;
  const appliedNormalKN = roofGravityNormalKN + purlinSelfWeightNormalKN + windNormalKN;
  const appliedParallelKN = roofGravityParallelKN + purlinSelfWeightParallelKN + windParallelKN;

  const normalResidualKN = sumReactionNormalKN - appliedNormalKN;
  const parallelResidualKN = sumReactionParallelKN - appliedParallelKN;
  const residualKN = vectorMagnitude(normalResidualKN, parallelResidualKN);
  const appliedMagnitudeKN = Math.max(EPS, vectorMagnitude(appliedNormalKN, appliedParallelKN));
  const relativeResidual = residualKN / appliedMagnitudeKN;
  const tolerance = 1e-9;

  const conservation = {
    normal: {
      axis: 'roof-normal',
      applied: {
        roofAreaGravityKN: roofGravityNormalKN,
        purlinSelfWeightKN: purlinSelfWeightNormalKN,
        windKN: windNormalKN,
        totalKN: appliedNormalKN
      },
      reactions: {
        leftRafterKN: leftRafter.normalKN,
        rightRafterKN: rightRafter.normalKN,
        totalKN: sumReactionNormalKN
      },
      residualKN: normalResidualKN,
      tolerance,
      pass: componentPass(normalResidualKN, appliedNormalKN, tolerance)
    },
    parallel: {
      axis: 'roof-downslope',
      applied: {
        roofAreaGravityKN: roofGravityParallelKN,
        purlinSelfWeightKN: purlinSelfWeightParallelKN,
        windKN: windParallelKN,
        totalKN: appliedParallelKN
      },
      reactions: {
        leftRafterKN: leftRafter.parallelKN,
        rightRafterKN: rightRafter.parallelKN,
        totalKN: sumReactionParallelKN
      },
      residualKN: parallelResidualKN,
      tolerance,
      pass: componentPass(parallelResidualKN, appliedParallelKN, tolerance)
    }
  };

  const governingPurlin = [...purlins].sort((a, b) => {
    const utilizationDiff = (b.result.utilization ?? 0) - (a.result.utilization ?? 0);
    if (Math.abs(utilizationDiff) > EPS) return utilizationDiff;
    return (b.result.resultantDeflectionMm ?? 0) - (a.result.resultantDeflectionMm ?? 0);
  })[0] ?? null;

  const pressureZoning = pressureZoningPlaceholder(spanM, slopeLengthM, safeWindPressureKPa, safeWindSense);

  return {
    model: 'ROOF-BAY-M2-v0.1',
    boundary: 'Two-rafter, simply-supported purlin bay. Roof sheet and fasteners route demand only; their capacities, code wind zoning and rafter/truss member capacities are unresolved.',
    inputs: {
      rafterSpacingM: spanM,
      roofSlopeLengthM: slopeLengthM,
      maxPurlinSpacingM: positive(maxPurlinSpacingM, 0.8),
      customPurlinStationsM: layout.layoutMode === 'custom-stations' ? [...layout.stationsM] : null,
      slopeDeg: slope,
      orientationDeg,
      mode: safeMode,
      deadLoadKPa: Math.max(0, finite(deadLoadKPa, 0)),
      roofLiveLoadKPa: Math.max(0, finite(roofLiveLoadKPa, 0)),
      windPressureKPa: safeWindPressureKPa,
      windSense: safeWindSense,
      loadFactor: factor
    },
    geometry: {
      areaM2,
      ...layout,
      purlinCount: purlins.length,
      tributaryBands,
      tributaryWidthsM,
      roofPlaneFrame: roofPlaneFrame(spanM, slopeLengthM)
    },
    pressureZoning,
    purlins,
    rafters: { left: leftRafter, right: rightRafter },
    applied: {
      roofGravityVerticalKN,
      purlinSelfWeightVerticalKN,
      totalGravityVerticalKN,
      roofGravityNormalKN,
      purlinSelfWeightNormalKN,
      roofGravityParallelKN,
      purlinSelfWeightParallelKN,
      windNormalKN,
      windParallelKN,
      normalKN: appliedNormalKN,
      parallelKN: appliedParallelKN,
      resultantKN: vectorMagnitude(appliedNormalKN, appliedParallelKN)
    },
    conservation,
    equilibrium: {
      reactionNormalKN: sumReactionNormalKN,
      reactionParallelKN: sumReactionParallelKN,
      normalResidualKN,
      parallelResidualKN,
      residualKN,
      relativeResidual,
      tolerance,
      pass: (relativeResidual <= tolerance || residualKN <= tolerance) && conservation.normal.pass && conservation.parallel.pass
    },
    governingPurlin,
    loadPath: ['roof sheet pressure', 'sheet-to-purlin fasteners (demand routing only)', 'purlins', 'left/right rafter reactions', 'supporting system (not analyzed here)']
  };
}
