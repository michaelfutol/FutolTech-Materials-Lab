export const NSCP2015_VELOCITY_PRESSURE_COEFFICIENT = 0.613;
export const NSCP2015_BUILDING_DIRECTIONALITY_KD = 0.85;
export const NSCP2015_MIN_KZ_HEIGHT_M = 4.57;

export const NSCP2015_EXPOSURE_CONSTANTS = Object.freeze({
  B: Object.freeze({ alpha: 7.0, zgM: 365.76 }),
  C: Object.freeze({ alpha: 9.5, zgM: 274.32 }),
  D: Object.freeze({ alpha: 11.5, zgM: 213.36 })
});

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}

function positive(value, label) {
  const number = finite(value, label);
  if (!(number > 0)) throw new Error(`${label} must be greater than zero.`);
  return number;
}

export function basicWindSpeedKphToMps(speedKph) {
  return positive(speedKph, 'basicWindSpeedKph') / 3.6;
}

export function nscp2015VelocityPressureExposureCoefficient({ heightM, exposureCategory } = {}) {
  const z = positive(heightM, 'heightM');
  const exposure = String(exposureCategory ?? '').trim().toUpperCase();
  const constants = NSCP2015_EXPOSURE_CONSTANTS[exposure];
  if (!constants) throw new Error("exposureCategory must be 'B', 'C' or 'D'.");
  if (z > constants.zgM) {
    throw new Error(`heightM exceeds zg=${constants.zgM} m for Exposure ${exposure}; this verified slice does not extrapolate beyond the adopted expression domain.`);
  }
  const effectiveHeightM = Math.max(z, NSCP2015_MIN_KZ_HEIGHT_M);
  const kz = 2.01 * Math.pow(effectiveHeightM / constants.zgM, 2 / constants.alpha);
  return {
    exposureCategory: exposure,
    heightM: z,
    effectiveHeightM,
    minimumHeightApplied: effectiveHeightM !== z,
    alpha: constants.alpha,
    zgM: constants.zgM,
    kz
  };
}

export function nscp2015BuildingVelocityPressure({
  heightM,
  exposureCategory,
  basicWindSpeedKph,
  topographicFactorKzt
} = {}) {
  const kzt = positive(topographicFactorKzt, 'topographicFactorKzt');
  const speedKph = positive(basicWindSpeedKph, 'basicWindSpeedKph');
  const speedMps = basicWindSpeedKphToMps(speedKph);
  const exposure = nscp2015VelocityPressureExposureCoefficient({ heightM, exposureCategory });
  const kd = NSCP2015_BUILDING_DIRECTIONALITY_KD;
  const coefficient = NSCP2015_VELOCITY_PRESSURE_COEFFICIENT;
  const qPa = coefficient * exposure.kz * kzt * kd * speedMps * speedMps;
  const qKPa = qPa / 1000;

  return {
    method: 'NSCP-2015-207B-velocity-pressure',
    applicability: 'Building velocity-pressure chain only. Wind-speed map selection, topographic-factor derivation, pressure coefficients, internal pressure, roof zoning and load combinations are outside this solver slice.',
    equation: 'qz = 0.613 Kz Kzt Kd V^2',
    inputs: {
      heightM: exposure.heightM,
      exposureCategory: exposure.exposureCategory,
      basicWindSpeedKph: speedKph,
      basicWindSpeedMps: speedMps,
      topographicFactorKzt: kzt
    },
    constants: {
      coefficient,
      directionalityFactorKd: kd,
      alpha: exposure.alpha,
      zgM: exposure.zgM,
      minimumKzHeightM: NSCP2015_MIN_KZ_HEIGHT_M
    },
    exposure: {
      effectiveHeightM: exposure.effectiveHeightM,
      minimumHeightApplied: exposure.minimumHeightApplied,
      kz: exposure.kz
    },
    result: {
      qPa,
      qKPa
    },
    substitutions: {
      speed: `V = ${speedKph} / 3.6 = ${speedMps.toFixed(6)} m/s`,
      kz: `Kz = 2.01(${exposure.effectiveHeightM.toFixed(3)} / ${exposure.zgM.toFixed(2)})^(2 / ${exposure.alpha}) = ${exposure.kz.toFixed(6)}`,
      q: `qz = 0.613(${exposure.kz.toFixed(6)})(${kzt.toFixed(4)})(0.85)(${speedMps.toFixed(6)})^2 = ${qPa.toFixed(3)} Pa = ${qKPa.toFixed(6)} kPa`
    },
    sourceBasis: [
      'NSCP 2015 Section 207B.3.1 — velocity pressure exposure coefficient Kz',
      'NSCP 2015 Section 207B.3.2 / Equation 207B.3-1 — velocity pressure qz',
      'NSCP 2015 Table 207A.6-1 — building directionality factor Kd = 0.85',
      'NSCP 2015 Table 207A.9-1 — Exposure B/C/D alpha and zg constants'
    ]
  };
}
