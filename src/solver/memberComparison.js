import { evaluateMemberCandidate } from './sectionRecommender.js';

function rotatedSection(section) {
  if (section.type === 'rectangle' || section.type === 'rhs') {
    return { ...section, widthMm: section.depthMm, depthMm: section.widthMm };
  }
  if (section.type === 'custom') {
    return {
      ...section,
      widthMm: section.depthMm,
      depthMm: section.widthMm,
      ixMm4: section.iyMm4,
      iyMm4: section.ixMm4,
      zxMm3: section.zyMm3,
      zyMm3: section.zxMm3
    };
  }
  return { ...section };
}

function finiteMin(records, valueOf) {
  return records
    .filter((record) => Number.isFinite(valueOf(record)))
    .reduce((best, record) => (!best || valueOf(record) < valueOf(best) ? record : best), null);
}

function finiteMax(records, valueOf) {
  return records
    .filter((record) => Number.isFinite(valueOf(record)))
    .reduce((best, record) => (!best || valueOf(record) > valueOf(best) ? record : best), null);
}

export function compareMemberCandidates({
  selections,
  lengthM,
  loadKN,
  loadPositionM,
  boundary = 'simply-supported',
  deflectionDivisor = 360
}) {
  if (!Array.isArray(selections) || selections.length < 2 || selections.length > 3) {
    throw new Error('Select two or three members for comparison.');
  }

  const records = selections.map((selection, index) => {
    if (!selection?.material || !selection?.preset) {
      throw new Error(`Comparison member ${index + 1} is incomplete.`);
    }
    const section = selection.orientation === 'rotated'
      ? rotatedSection(selection.preset)
      : { ...selection.preset };
    const candidate = evaluateMemberCandidate({
      material: selection.material,
      preset: section,
      lengthM,
      loadKN,
      loadPositionM,
      boundary,
      deflectionDivisor
    });
    return {
      ...candidate,
      comparisonId: selection.id ?? `member-${index + 1}`,
      comparisonLabel: selection.label ?? `Member ${index + 1}`,
      orientation: selection.orientation === 'rotated' ? 'rotated 90°' : 'as listed',
      basePresetId: selection.preset.id
    };
  });

  const passing = records.filter((record) => record.pass);
  const winners = {
    lightestPassing: finiteMin(passing, (record) => record.totalMassKg)?.comparisonId ?? null,
    leastDeflection: finiteMin(records, (record) => record.result.maxDeflectionMm)?.comparisonId ?? null,
    lowestStrengthUse: finiteMin(records, (record) => record.strengthRatio)?.comparisonId ?? null,
    highestPhysicalThreshold: finiteMax(records, (record) => record.physicalThresholdLoadKN)?.comparisonId ?? null
  };

  return {
    records: records.map((record) => ({
      ...record,
      winnerFlags: Object.fromEntries(
        Object.entries(winners).map(([key, id]) => [key, id === record.comparisonId])
      )
    })),
    passingCount: passing.length,
    winners
  };
}
