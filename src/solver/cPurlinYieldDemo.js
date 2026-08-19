export const KGF_PER_KN = 101.9716212978;

export function firstYieldTarget(records) {
  if (!Array.isArray(records) || records.length < 1) {
    throw new Error('At least one C-purlin result is required to determine first yield.');
  }
  const candidates = records
    .map((record) => ({
      id: record.comparisonId,
      label: record.comparisonLabel,
      thresholdKN: Number(record.physicalThresholdLoadKN)
    }))
    .filter((item) => Number.isFinite(item.thresholdKN) && item.thresholdKN > 0)
    .sort((a, b) => a.thresholdKN - b.thresholdKN);
  if (!candidates.length) {
    throw new Error('No finite first-yield threshold is available for the selected C-purlins.');
  }
  return {
    targetLoadKN: candidates[0].thresholdKN,
    targetLoadKgf: candidates[0].thresholdKN * KGF_PER_KN,
    governingMemberId: candidates[0].id,
    governingMemberLabel: candidates[0].label,
    members: candidates
  };
}

export function dramaticProgress(linearProgress) {
  const x = Math.max(0, Math.min(1, Number(linearProgress) || 0));
  // Smoothstep: gentle start and approach to yield without changing the
  // quasi-static load path. This is visual playback timing only.
  return x * x * (3 - 2 * x);
}

export function centerPointFormulaSnapshot({ loadKN, lengthM, record }) {
  const P = Number(loadKN);
  const L = Number(lengthM);
  if (!Number.isFinite(P) || P < 0 || !Number.isFinite(L) || L <= 0 || !record) {
    throw new Error('A valid load, span and member record are required.');
  }
  const result = record.result ?? {};
  const slope = Number(record.roofSlopeDeg) || 0;
  const components = result.loadComponents ?? record.loadComponents ?? null;
  return {
    loadKN: P,
    loadKgf: P * KGF_PER_KN,
    spanM: L,
    roofSlopeDeg: slope,
    roofNormalKN: components?.roofNormalKN ?? P,
    roofParallelKN: components?.roofParallelKN ?? 0,
    maxMomentKNm: Number(result.maxMomentKNm) || 0,
    stressMPa: Number(result.maxBendingStressMPa) || 0,
    deflectionMm: Number(result.maxDeflectionMm) || 0,
    strengthUse: Number(record.strengthRatio) || 0,
    deflectionUse: Number(record.deflectionRatio) || 0,
    physicalThresholdLoadKN: Number(record.physicalThresholdLoadKN) || null
  };
}
