const N_PER_KN = 1000;

function positive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
}

function validSpecificGravity(g) {
  if (!Number.isFinite(g) || g <= 0 || g > 1.5) throw new Error('Specific gravity G must be greater than zero and plausible for wood.');
}

export const FPL_CONNECTION_SOURCE = {
  id: 'usfs-fpl-gtr-282-ch8-2021',
  title: 'Wood Handbook — Chapter 8: Fastenings',
  organization: 'USDA Forest Service, Forest Products Laboratory',
  year: 2021,
  citation: 'Rammer, D.R. 2021. Chapter 8: Fastenings. FPL-GTR-282.',
  url: 'https://research.fs.usda.gov/download/treesearch/62253.pdf',
  boundary: 'Research/reference equations and historic empirical design guidance. Current code design must be verified against the governing standard; this module does not reproduce the full 2024 NDS dowel-yield procedure.'
};

export function smoothNailWithdrawalReference({ specificGravity, diameterMm, penetrationMm, duration = 'long-term' }) {
  validSpecificGravity(specificGravity);
  positive(diameterMm, 'Nail diameter');
  positive(penetrationMm, 'Nail penetration');
  const maximumN = 54.12 * (specificGravity ** 2.5) * diameterMm * penetrationMm;
  const longTermN = maximumN / 6;
  const normalDurationN = longTermN * 1.1;
  return {
    maximumKN: maximumN / N_PER_KN,
    longTermReferenceKN: longTermN / N_PER_KN,
    normalDurationReferenceKN: normalDurationN / N_PER_KN,
    selectedReferenceKN: (duration === 'normal' ? normalDurationN : longTermN) / N_PER_KN,
    equation: 'p = 54.12 G^2.5 D L',
    reference: 'FPL-GTR-282 Eq. 8-1a; handbook text notes long-time allowable practice of one-sixth average maximum, with +10% for normal duration.'
  };
}

export function annularNailWithdrawalReference({ specificGravity, diameterMm, penetrationMm }) {
  validSpecificGravity(specificGravity);
  positive(diameterMm, 'Nail diameter');
  positive(penetrationMm, 'Threaded penetration');
  const maximumN = 77.57 * (specificGravity ** 2) * diameterMm * penetrationMm;
  return {
    maximumKN: maximumN / N_PER_KN,
    equation: 'p = 77.57 G^2 D L',
    reference: 'FPL-GTR-282 Eq. 8-2a; applies to the threaded portion and specified annular-thread geometry in the handbook.'
  };
}

const NAIL_LATERAL_K = {
  hardwood: [
    { min: 0.33, max: 0.47, k: 50.04 },
    { min: 0.48, max: 0.56, k: 69.50 },
    { min: 0.57, max: 0.74, k: 94.52 }
  ],
  softwood: [
    { min: 0.29, max: 0.42, k: 50.04 },
    { min: 0.43, max: 0.47, k: 62.55 },
    { min: 0.48, max: 0.52, k: 76.45 }
  ]
};

export function recommendedNailPenetrationMm(specificGravity, diameterMm) {
  validSpecificGravity(specificGravity);
  positive(diameterMm, 'Nail diameter');
  let multiplier;
  if (specificGravity >= 0.61) multiplier = 10;
  else if (specificGravity <= 0.42) multiplier = 14;
  else multiplier = 14 - ((specificGravity - 0.42) / (0.61 - 0.42)) * 4;
  return { multiplier, minimumPenetrationMm: multiplier * diameterMm };
}

export function nailLateralProportionalLimit({ woodClass, specificGravity, diameterMm, penetrationMm }) {
  validSpecificGravity(specificGravity);
  positive(diameterMm, 'Nail diameter');
  positive(penetrationMm, 'Nail penetration');
  const rows = NAIL_LATERAL_K[woodClass] ?? [];
  const row = rows.find(({ min, max }) => specificGravity >= min - 1e-9 && specificGravity <= max + 1e-9);
  const penetration = recommendedNailPenetrationMm(specificGravity, diameterMm);
  if (!row) {
    return {
      available: false,
      proportionalLimitKN: null,
      penetration,
      reason: `No FPL pre-1991 K row is assigned for ${woodClass || 'unclassified wood'} at G=${specificGravity}. Do not interpolate across a missing table range or classify coconut palm as hardwood/softwood without evidence.`
    };
  }
  const loadN = row.k * (diameterMm ** 1.5);
  return {
    available: true,
    proportionalLimitKN: loadN / N_PER_KN,
    k: row.k,
    penetration,
    penetrationPass: penetrationMm + 1e-9 >= penetration.minimumPenetrationMm,
    equation: 'p = K D^1.5',
    reference: 'FPL-GTR-282 Eq. 8-2 and Table 8-4; approximately 0.38 mm joint-slip proportional-limit reference for seasoned wood.'
  };
}

export function hankinson({ parallel, perpendicular, angleDeg }) {
  positive(parallel, 'Parallel reference');
  positive(perpendicular, 'Perpendicular reference');
  if (!Number.isFinite(angleDeg) || angleDeg < 0 || angleDeg > 90) throw new Error('Load-to-grain angle must be from 0° to 90°.');
  const theta = angleDeg * Math.PI / 180;
  const denominator = parallel * (Math.sin(theta) ** 2) + perpendicular * (Math.cos(theta) ** 2);
  return parallel * perpendicular / denominator;
}

export function boltDowelBearingReference({ specificGravity, diameterMm, loadToGrainDeg = 0, memberThicknessMm }) {
  validSpecificGravity(specificGravity);
  positive(diameterMm, 'Bolt diameter');
  positive(memberThicknessMm, 'Wood bearing thickness');
  if (!Number.isFinite(loadToGrainDeg) || loadToGrainDeg < 0 || loadToGrainDeg > 90) throw new Error('Load-to-grain angle must be from 0° to 90°.');

  const parallelMPa = 77.2 * specificGravity;
  const perpendicularMPa = 212.0 * (specificGravity ** 1.45) * (diameterMm ** -0.5);
  const bearingMPa = hankinson({ parallel: parallelMPa, perpendicular: perpendicularMPa, angleDeg: loadToGrainDeg });
  const projectedAreaMm2 = memberThicknessMm * diameterMm;
  const bearingCeilingKN = bearingMPa * projectedAreaMm2 / N_PER_KN;
  return {
    parallelMPa,
    perpendicularMPa,
    bearingMPa,
    projectedAreaMm2,
    bearingCeilingKN,
    equationParallel: 'Fe = 77.2 G',
    equationPerpendicular: 'Fe = 212 G^1.45 D^-0.5',
    equationAngle: 'Hankinson: N = P Q / (P sin²θ + Q cos²θ)',
    reference: 'FPL-GTR-282 Eqs. 8-17a, 8-18a and 8-16.',
    boundary: 'This is the wood dowel-bearing component only, not the full bolt connection yield value. Fastener bending/yield modes, plate bearing, net section and group effects still govern the complete connection.'
  };
}

export function boltSpacingScreen({
  woodClass,
  diameterMm,
  spacingAlongGrainMm,
  loadedEndDistanceMm,
  edgeDistanceMm,
  loadCase = 'tension',
  loadToGrainDeg = 0
}) {
  positive(diameterMm, 'Bolt diameter');
  positive(spacingAlongGrainMm, 'Bolt spacing');
  positive(loadedEndDistanceMm, 'Loaded end distance');
  positive(edgeDistanceMm, 'Edge distance');
  const minimumSpacingMm = 4 * diameterMm;
  const endMultiplier = loadCase === 'compression' ? 4 : woodClass === 'hardwood' ? 5 : woodClass === 'softwood' ? 7 : null;
  const minimumEndDistanceMm = endMultiplier == null ? null : endMultiplier * diameterMm;
  const minimumEdgeDistanceMm = loadToGrainDeg >= 89.999 ? 4 * diameterMm : 1.5 * diameterMm;
  return {
    minimumSpacingMm,
    minimumEndDistanceMm,
    minimumEdgeDistanceMm,
    spacingPass: spacingAlongGrainMm + 1e-9 >= minimumSpacingMm,
    endDistancePass: minimumEndDistanceMm == null ? null : loadedEndDistanceMm + 1e-9 >= minimumEndDistanceMm,
    edgeDistancePass: edgeDistanceMm + 1e-9 >= minimumEdgeDistanceMm,
    reference: 'FPL-GTR-282 pp. 8-16 to 8-17 prescriptive bolt spacing/end/edge-distance research guidance.',
    boundary: endMultiplier == null ? 'End-distance status is unavailable for unclassified/palm material; do not map coconut palm to hardwood/softwood without evidence.' : null
  };
}

export function arithmeticFastenerGroupUpperBound(singleFastenerKN, count) {
  positive(singleFastenerKN, 'Single-fastener reference');
  if (!Number.isInteger(count) || count < 1) throw new Error('Fastener count must be a positive whole number.');
  return {
    arithmeticSumKN: singleFastenerKN * count,
    boundary: 'Arithmetic n×single-fastener sum only. It is not a design group capacity; load distribution, spacing, splitting, row/group action and deformation compatibility must be checked.'
  };
}
