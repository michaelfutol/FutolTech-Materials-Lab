export const STANDARD_GRAVITY_M_S2 = 9.80665;
export const KGF_TO_KN = STANDARD_GRAVITY_M_S2 / 1000;
export const TONNE_FORCE_TO_KN = STANDARD_GRAVITY_M_S2;

export function convertLoadToKN(value, unit = 'kN') {
  if (!Number.isFinite(value) || value < 0) throw new Error('Load must be zero or greater.');
  if (unit === 'kgf') return value * KGF_TO_KN;
  if (unit === 'tf') return value * TONNE_FORCE_TO_KN;
  if (unit === 'kN') return value;
  throw new Error(`Unsupported load unit: ${unit}`);
}

export function loadEquivalentsFromKN(loadKN) {
  if (!Number.isFinite(loadKN)) return { kN: NaN, kgf: NaN, tf: NaN };
  return {
    kN: loadKN,
    kgf: loadKN / KGF_TO_KN,
    tf: loadKN / TONNE_FORCE_TO_KN
  };
}

function formatNumber(value, decimals) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatLoadEquivalents(loadKN, { includeKN = true } = {}) {
  const values = loadEquivalentsFromKN(loadKN);
  if (!Number.isFinite(values.kN)) return '—';
  const kgfDecimals = Math.abs(values.kgf) < 10 ? 2 : Math.abs(values.kgf) < 100 ? 1 : 0;
  const tfDecimals = Math.abs(values.tf) < 0.1 ? 4 : Math.abs(values.tf) < 10 ? 3 : 2;
  const parts = [];
  if (includeKN) parts.push(`${formatNumber(values.kN, Math.abs(values.kN) < 10 ? 3 : 2)} kN`);
  parts.push(`≈ ${formatNumber(values.kgf, kgfDecimals)} kgf`);
  parts.push(`${formatNumber(values.tf, tfDecimals)} tf`);
  return parts.join(' · ');
}

export function describeInputLoad(value, unit) {
  const loadKN = convertLoadToKN(value, unit);
  return `${formatLoadEquivalents(loadKN)} · kgf is the familiar weight-equivalent, not mass`;
}
