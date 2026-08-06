const PIN_LIKE = new Set(['pin', 'roller']);
const STEEL_ASD_OMEGA = 1.67;

export function effectiveLengthFactor(bottomSupport, topSupport) {
  const bottomFixed = bottomSupport === 'fixed';
  const topFixed = topSupport === 'fixed';
  const bottomPinned = PIN_LIKE.has(bottomSupport);
  const topPinned = PIN_LIKE.has(topSupport);
  const bottomFree = bottomSupport === 'free';
  const topFree = topSupport === 'free';

  if ((bottomFixed && topFree) || (topFixed && bottomFree)) return 2.0;
  if (bottomFixed && topFixed) return 0.5;
  if ((bottomFixed && topPinned) || (topFixed && bottomPinned)) return 0.699;
  if (bottomPinned && topPinned) return 1.0;
  throw new Error('The selected column restraints are unstable or not represented by the current idealised K-factor library.');
}

export function steelFlexuralBucklingStrength({
  elasticModulusMPa,
  yieldStrengthMPa,
  areaMm2,
  slenderness,
  omega = STEEL_ASD_OMEGA
}) {
  if (![elasticModulusMPa, yieldStrengthMPa, areaMm2, slenderness, omega].every(Number.isFinite)) {
    throw new Error('Steel column-curve inputs must be finite.');
  }
  if (elasticModulusMPa <= 0 || yieldStrengthMPa <= 0 || areaMm2 <= 0 || slenderness <= 0 || omega <= 0) {
    throw new Error('Steel column-curve inputs must be greater than zero.');
  }

  const elasticBucklingStressMPa = Math.PI ** 2 * elasticModulusMPa / slenderness ** 2;
  const fyOverFe = yieldStrengthMPa / elasticBucklingStressMPa;
  const criticalStressMPa = fyOverFe <= 2.25
    ? 0.658 ** fyOverFe * yieldStrengthMPa
    : 0.877 * elasticBucklingStressMPa;
  const nominalCapacityN = criticalStressMPa * areaMm2;

  return {
    elasticBucklingStressMPa,
    fyOverFe,
    criticalStressMPa,
    nominalCapacityKN: nominalCapacityN / 1000,
    asdAvailableCapacityKN: nominalCapacityN / omega / 1000,
    omega
  };
}

function resolveBraceModel({ lengthM, bottomSupport, topSupport, intermediateBracePoints }) {
  if (!Number.isInteger(intermediateBracePoints) || intermediateBracePoints < 0 || intermediateBracePoints > 6) {
    throw new Error('Intermediate brace points must be a whole number from 0 to 6.');
  }
  const baseK = effectiveLengthFactor(bottomSupport, topSupport);
  if (intermediateBracePoints === 0) {
    return {
      intermediateBracePoints,
      segmentCount: 1,
      unbracedLengthM: lengthM,
      k: baseK,
      braceAssumption: 'No intermediate lateral brace'
    };
  }
  if (bottomSupport === 'free' || topSupport === 'free') {
    throw new Error('The simplified intermediate-brace model is not available for a fixed-free column. Model the actual frame or use no intermediate brace.');
  }

  return {
    intermediateBracePoints,
    segmentCount: intermediateBracePoints + 1,
    unbracedLengthM: lengthM / (intermediateBracePoints + 1),
    k: 1.0,
    braceAssumption: `${intermediateBracePoints} ideal lateral brace point${intermediateBracePoints === 1 ? '' : 's'}; translation restrained in the governing buckling direction, rotation free`
  };
}

export function solveColumn({
  lengthM,
  elasticModulusMPa,
  areaMm2,
  ixMm4,
  iyMm4,
  zxMm3,
  zyMm3,
  widthMm,
  depthMm,
  bottomSupport,
  topSupport,
  axialLoadKN,
  eccentricityMm,
  compressionStrengthMPa,
  materialFamily = 'generic',
  yieldStrengthMPa = null,
  intermediateBracePoints = 0
}) {
  if (!Number.isFinite(lengthM) || lengthM <= 0) throw new Error('Member length must be greater than zero.');
  if (![elasticModulusMPa, areaMm2, ixMm4, iyMm4, axialLoadKN, eccentricityMm].every(Number.isFinite)) {
    throw new Error('Column inputs must be finite.');
  }
  if (elasticModulusMPa <= 0 || areaMm2 <= 0 || ixMm4 <= 0 || iyMm4 <= 0 || axialLoadKN < 0) {
    throw new Error('Column stiffness, section properties, and load must be valid positive values.');
  }

  const braceModel = resolveBraceModel({ lengthM, bottomSupport, topSupport, intermediateBracePoints });
  const lengthMm = lengthM * 1000;
  const unbracedLengthMm = braceModel.unbracedLengthM * 1000;
  const weakAxisIsX = ixMm4 <= iyMm4;
  const governingI = weakAxisIsX ? ixMm4 : iyMm4;
  const fallbackSectionModulusMm3 = governingI / ((weakAxisIsX ? depthMm : widthMm) / 2);
  const suppliedSectionModulusMm3 = weakAxisIsX ? zxMm3 : zyMm3;
  const governingSectionModulusMm3 = Number.isFinite(suppliedSectionModulusMm3) && suppliedSectionModulusMm3 > 0
    ? suppliedSectionModulusMm3
    : fallbackSectionModulusMm3;
  const governingRadiusMm = Math.sqrt(governingI / areaMm2);
  const effectiveLengthMm = braceModel.k * unbracedLengthMm;
  const slenderness = effectiveLengthMm / governingRadiusMm;
  const eulerCriticalN = Math.PI ** 2 * elasticModulusMPa * governingI / effectiveLengthMm ** 2;
  const squashN = compressionStrengthMPa ? compressionStrengthMPa * areaMm2 : Number.POSITIVE_INFINITY;
  const screeningCapacityN = Math.min(eulerCriticalN, squashN);

  const steelCurve = materialFamily === 'steel' && Number.isFinite(yieldStrengthMPa) && yieldStrengthMPa > 0
    ? steelFlexuralBucklingStrength({
      elasticModulusMPa,
      yieldStrengthMPa,
      areaMm2,
      slenderness
    })
    : null;
  const comparisonCapacityKN = steelCurve
    ? steelCurve.asdAvailableCapacityKN
    : screeningCapacityN / 1000;
  const capacityBasis = steelCurve
    ? 'AISC-style ASD flexural-buckling curve; global buckling only'
    : 'Euler/material screening ceiling; not a code-rated natural-material column capacity';

  const axialLoadN = axialLoadKN * 1000;
  const axialStressMPa = axialLoadN / areaMm2;
  const eccentricityMagnitudeMm = Math.abs(eccentricityMm);
  const firstOrderMomentNmm = axialLoadN * eccentricityMagnitudeMm;
  const loadRatio = axialLoadN / eulerCriticalN;
  const amplification = loadRatio < 0.95 ? 1 / Math.max(1 - loadRatio, 0.05) : Number.POSITIVE_INFINITY;
  const amplifiedMomentNmm = firstOrderMomentNmm * amplification;
  const bendingStressMPa = Number.isFinite(amplification)
    ? amplifiedMomentNmm / governingSectionModulusMm3
    : Number.POSITIVE_INFINITY;
  const maxCompressionStressMPa = axialStressMPa + bendingStressMPa;
  const shorteningMm = axialLoadN * lengthMm / (areaMm2 * elasticModulusMPa);

  return {
    k: braceModel.k,
    baseK: effectiveLengthFactor(bottomSupport, topSupport),
    intermediateBracePoints: braceModel.intermediateBracePoints,
    segmentCount: braceModel.segmentCount,
    unbracedLengthM: braceModel.unbracedLengthM,
    braceAssumption: braceModel.braceAssumption,
    governingAxis: weakAxisIsX ? 'x' : 'y',
    governingI,
    governingSectionModulusMm3,
    governingRadiusMm,
    effectiveLengthMm,
    slenderness,
    eulerCriticalKN: eulerCriticalN / 1000,
    squashCapacityKN: squashN / 1000,
    screeningCapacityKN: screeningCapacityN / 1000,
    steelNominalCapacityKN: steelCurve?.nominalCapacityKN ?? null,
    steelAsdAvailableCapacityKN: steelCurve?.asdAvailableCapacityKN ?? null,
    steelCriticalStressMPa: steelCurve?.criticalStressMPa ?? null,
    steelOmega: steelCurve?.omega ?? null,
    comparisonCapacityKN,
    predictedCapacityKN: comparisonCapacityKN,
    capacityBasis,
    screeningOnly: !steelCurve,
    loadRatio,
    axialStressMPa,
    bendingStressMPa,
    maxCompressionStressMPa,
    amplification,
    shorteningMm,
    governingMode: steelCurve
      ? 'Steel flexural buckling — ASD available strength'
      : eulerCriticalN <= squashN ? 'Elastic global buckling screening' : 'Material compression screening'
  };
}
