const PIN_LIKE = new Set(['pin', 'roller']);

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

export function solveColumn({
  lengthM,
  elasticModulusMPa,
  areaMm2,
  ixMm4,
  iyMm4,
  widthMm,
  depthMm,
  bottomSupport,
  topSupport,
  axialLoadKN,
  eccentricityMm,
  compressionStrengthMPa
}) {
  if (lengthM <= 0) throw new Error('Member length must be greater than zero.');
  const k = effectiveLengthFactor(bottomSupport, topSupport);
  const lengthMm = lengthM * 1000;
  const weakAxisIsX = ixMm4 <= iyMm4;
  const governingI = weakAxisIsX ? ixMm4 : iyMm4;
  const governingRadiusMm = Math.sqrt(governingI / areaMm2);
  const effectiveLengthMm = k * lengthMm;
  const slenderness = effectiveLengthMm / governingRadiusMm;
  const eulerCriticalN = Math.PI ** 2 * elasticModulusMPa * governingI / effectiveLengthMm ** 2;
  const squashN = compressionStrengthMPa ? compressionStrengthMPa * areaMm2 : Number.POSITIVE_INFINITY;
  const predictedCapacityN = Math.min(eulerCriticalN, squashN);
  const axialLoadN = axialLoadKN * 1000;
  const axialStressMPa = axialLoadN / areaMm2;
  const cMm = weakAxisIsX ? depthMm / 2 : widthMm / 2;
  const firstOrderMomentNmm = axialLoadN * eccentricityMm;
  const loadRatio = axialLoadN / eulerCriticalN;
  const amplification = loadRatio < 0.95 ? 1 / Math.max(1 - loadRatio, 0.05) : Number.POSITIVE_INFINITY;
  const amplifiedMomentNmm = firstOrderMomentNmm * amplification;
  const bendingStressMPa = Number.isFinite(amplification) ? amplifiedMomentNmm * cMm / governingI : Number.POSITIVE_INFINITY;
  const maxCompressionStressMPa = axialStressMPa + bendingStressMPa;
  const shorteningMm = axialLoadN * lengthMm / (areaMm2 * elasticModulusMPa);

  return {
    k,
    governingAxis: weakAxisIsX ? 'x' : 'y',
    governingI,
    governingRadiusMm,
    effectiveLengthMm,
    slenderness,
    eulerCriticalKN: eulerCriticalN / 1000,
    squashCapacityKN: squashN / 1000,
    predictedCapacityKN: predictedCapacityN / 1000,
    loadRatio,
    axialStressMPa,
    bendingStressMPa,
    maxCompressionStressMPa,
    amplification,
    shorteningMm,
    governingMode: eulerCriticalN <= squashN ? 'Elastic global buckling' : 'Material compression'
  };
}
