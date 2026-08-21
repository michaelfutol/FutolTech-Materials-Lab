const STANDARD_GRAVITY = 9.80665;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = finite(value, fallback);
  return number > 0 ? number : fallback;
}

export function normalizeOrientationDeg(value) {
  const raw = Math.round(finite(value, 0) / 90) * 90;
  return ((raw % 360) + 360) % 360;
}

export function cPurlinSelfWeightKNM(preset, densityKgM3 = 7850) {
  const areaMm2 = positive(preset?.areaMm2, 0);
  if (!areaMm2) return 0;
  const massKgM = areaMm2 * 1e-6 * positive(densityKgM3, 7850);
  return massKgM * STANDARD_GRAVITY / 1000;
}

export function orientationAxes(preset, orientationDeg = 0) {
  if (!preset) throw new Error('C-purlin preset is required.');
  const orientation = normalizeOrientationDeg(orientationDeg);
  const majorNormal = orientation === 0 || orientation === 180;
  const ixMm4 = positive(preset.ixMm4, NaN);
  const iyMm4 = positive(preset.iyMm4, NaN);
  const zxMm3 = positive(preset.zxMm3, NaN);
  const zyMm3 = positive(preset.zyMm3, NaN);
  if (![ixMm4, iyMm4, zxMm3, zyMm3].every(Number.isFinite)) {
    throw new Error('C-purlin gross Ix, Iy, Zx and Zy are required.');
  }
  return {
    orientationDeg: orientation,
    normalAxis: majorNormal ? 'major' : 'minor',
    parallelAxis: majorNormal ? 'minor' : 'major',
    iNormalMm4: majorNormal ? ixMm4 : iyMm4,
    iParallelMm4: majorNormal ? iyMm4 : ixMm4,
    zNormalMm3: majorNormal ? zxMm3 : zyMm3,
    zParallelMm3: majorNormal ? zyMm3 : zxMm3
  };
}

export function resolveRoofLineLoads({
  mode = 'combined',
  slopeDeg = 0,
  tributaryWidthM = 1,
  deadLoadKPa = 0,
  roofLiveLoadKPa = 0,
  windPressureKPa = 0,
  windSense = 'uplift',
  preset = null,
  densityKgM3 = 7850
} = {}) {
  const safeMode = ['gravity', 'wind', 'combined'].includes(mode) ? mode : 'combined';
  const thetaDeg = Math.max(0, Math.min(60, finite(slopeDeg, 0)));
  const thetaRad = thetaDeg * Math.PI / 180;
  const tributary = positive(tributaryWidthM, 1);
  const gravityAreaKPa = Math.max(0, finite(deadLoadKPa, 0)) + Math.max(0, finite(roofLiveLoadKPa, 0));
  const gravityAreaLineKNM = gravityAreaKPa * tributary;
  const selfWeightKNM = preset ? cPurlinSelfWeightKNM(preset, densityKgM3) : 0;
  const includeGravity = safeMode !== 'wind';
  const includeWind = safeMode !== 'gravity';
  const gravityVerticalKNM = includeGravity ? gravityAreaLineKNM + selfWeightKNM : 0;
  const gravityNormalKNM = gravityVerticalKNM * Math.cos(thetaRad);
  const gravityParallelKNM = gravityVerticalKNM * Math.sin(thetaRad);
  const windMagnitudeKNM = includeWind ? Math.max(0, finite(windPressureKPa, 0)) * tributary : 0;
  const windSign = windSense === 'downward' ? 1 : -1;
  const windNormalKNM = windSign * windMagnitudeKNM;
  const normalKNM = gravityNormalKNM + windNormalKNM;
  const parallelKNM = gravityParallelKNM;
  const resultantKNM = Math.hypot(normalKNM, parallelKNM);

  return {
    mode: safeMode,
    slopeDeg: thetaDeg,
    tributaryWidthM: tributary,
    gravityAreaKPa,
    gravityAreaLineKNM,
    selfWeightKNM: includeGravity ? selfWeightKNM : 0,
    gravityVerticalKNM,
    gravityNormalKNM,
    gravityParallelKNM,
    windPressureKPa: includeWind ? Math.max(0, finite(windPressureKPa, 0)) : 0,
    windSense: includeWind ? (windSense === 'downward' ? 'downward' : 'uplift') : 'none',
    windNormalKNM,
    normalKNM,
    parallelKNM,
    resultantKNM,
    normalDirection: normalKNM < 0 ? 'uplift' : normalKNM > 0 ? 'downward' : 'balanced'
  };
}

function simplySupportedUdlMomentKNM(lineLoadKNM, spanM) {
  return lineLoadKNM * spanM ** 2 / 8;
}

function simplySupportedUdlDeflectionMm(lineLoadKNM, spanM, elasticModulusMPa, inertiaMm4) {
  const wNPerMm = lineLoadKNM; // 1 kN/m = 1 N/mm
  const lengthMm = spanM * 1000;
  return 5 * wNPerMm * lengthMm ** 4 / (384 * elasticModulusMPa * inertiaMm4);
}

export function solveCPurlinLoadCase({
  preset,
  orientationDeg = 0,
  spanM = 2,
  elasticModulusMPa = 200000,
  yieldStrengthMPa = 250,
  densityKgM3 = 7850,
  mode = 'combined',
  slopeDeg = 0,
  tributaryWidthM = 1,
  deadLoadKPa = 0,
  roofLiveLoadKPa = 0,
  windPressureKPa = 0,
  windSense = 'uplift',
  loadFactor = 1
} = {}) {
  if (!preset?.productCategory || preset.productCategory !== 'c-purlin') {
    throw new Error('A C-purlin preset is required for the gravity/wind solver.');
  }
  const safeSpan = positive(spanM, 2);
  const E = positive(elasticModulusMPa, 200000);
  const Fy = positive(yieldStrengthMPa, 250);
  const factor = Math.max(0, finite(loadFactor, 1));
  const axes = orientationAxes(preset, orientationDeg);
  const baseLoads = resolveRoofLineLoads({
    mode,
    slopeDeg,
    tributaryWidthM,
    deadLoadKPa,
    roofLiveLoadKPa,
    windPressureKPa,
    windSense,
    preset,
    densityKgM3
  });
  const normalKNM = baseLoads.normalKNM * factor;
  const parallelKNM = baseLoads.parallelKNM * factor;
  const momentNormalKNM = simplySupportedUdlMomentKNM(normalKNM, safeSpan);
  const momentParallelKNM = simplySupportedUdlMomentKNM(parallelKNM, safeSpan);
  const stressNormalMPa = Math.abs(momentNormalKNM) * 1e6 / axes.zNormalMm3;
  const stressParallelMPa = Math.abs(momentParallelKNM) * 1e6 / axes.zParallelMm3;
  const grossEnvelopeStressMPa = stressNormalMPa + stressParallelMPa;
  const utilization = grossEnvelopeStressMPa / Fy;
  const baseStress = factor > 0 ? grossEnvelopeStressMPa / factor : (() => {
    const baseNormalMoment = simplySupportedUdlMomentKNM(baseLoads.normalKNM, safeSpan);
    const baseParallelMoment = simplySupportedUdlMomentKNM(baseLoads.parallelKNM, safeSpan);
    return Math.abs(baseNormalMoment) * 1e6 / axes.zNormalMm3
      + Math.abs(baseParallelMoment) * 1e6 / axes.zParallelMm3;
  })();
  const yieldFactor = baseStress > 1e-12 ? Fy / baseStress : Infinity;
  const deltaNormalMm = simplySupportedUdlDeflectionMm(normalKNM, safeSpan, E, axes.iNormalMm4);
  const deltaParallelMm = simplySupportedUdlDeflectionMm(parallelKNM, safeSpan, E, axes.iParallelMm4);
  const resultantDeflectionMm = Math.hypot(deltaNormalMm, deltaParallelMm);

  return {
    presetId: preset.id,
    presetLabel: preset.label,
    axes,
    spanM: safeSpan,
    elasticModulusMPa: E,
    yieldStrengthMPa: Fy,
    loadFactor: factor,
    loads: {
      ...baseLoads,
      normalKNM,
      parallelKNM,
      resultantKNM: baseLoads.resultantKNM * factor
    },
    momentNormalKNM,
    momentParallelKNM,
    stressNormalMPa,
    stressParallelMPa,
    grossEnvelopeStressMPa,
    utilization,
    yieldFactor,
    yielded: utilization >= 1 - 1e-9,
    deltaNormalMm,
    deltaParallelMm,
    resultantDeflectionMm
  };
}

export function governingCommonWindSense({
  members = [],
  windPressureKPa = 0,
  windUpliftKPa = windPressureKPa,
  windDownwardKPa = windPressureKPa,
  ...input
} = {}) {
  if (!members.length) throw new Error('At least one active C-purlin member is required.');
  const candidates = [
    { windSense: 'uplift', windPressureKPa: Math.max(0, finite(windUpliftKPa, windPressureKPa)) },
    { windSense: 'downward', windPressureKPa: Math.max(0, finite(windDownwardKPa, windPressureKPa)) }
  ].map(({ windSense, windPressureKPa: pressure }) => {
    const results = members.map((member) => solveCPurlinLoadCase({ ...input, ...member, windPressureKPa: pressure, windSense, mode: 'combined', loadFactor: 1 }));
    return {
      windSense,
      windPressureKPa: pressure,
      results,
      maxUtilization: Math.max(...results.map((result) => result.utilization)),
      firstYieldFactor: Math.min(...results.map((result) => result.yieldFactor)),
      allYieldFactor: Math.max(...results.map((result) => result.yieldFactor))
    };
  });
  return candidates.sort((a, b) => b.maxUtilization - a.maxUtilization)[0];
}

export function yieldSequence({ members = [], maxFactor = 12, ...input } = {}) {
  const results = members.map((member) => solveCPurlinLoadCase({ ...input, ...member, loadFactor: 1 }));
  const sequence = results
    .map((result, index) => ({ index, label: members[index].label, yieldFactor: result.yieldFactor }))
    .filter((item) => Number.isFinite(item.yieldFactor))
    .sort((a, b) => a.yieldFactor - b.yieldFactor);
  const allYieldFactor = sequence.length === members.length
    ? Math.min(maxFactor, Math.max(...sequence.map((item) => item.yieldFactor)))
    : maxFactor;
  return {
    baseResults: results,
    sequence,
    firstYieldFactor: sequence[0]?.yieldFactor ?? Infinity,
    allYieldFactor,
    allYieldReachable: sequence.length === members.length && Math.max(...sequence.map((item) => item.yieldFactor)) <= maxFactor
  };
}

export const C_PURLIN_LOAD_CASE_CONSTANTS = Object.freeze({ STANDARD_GRAVITY });
