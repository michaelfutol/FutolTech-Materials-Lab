import { calculateSectionProperties } from './sections.js';
import { solveBeam } from './beamFem.js';
import {
  KGF_TO_KN,
  TONNE_FORCE_TO_KN,
  convertLoadToKN
} from '../utils/loadUnits.js';

export { KGF_TO_KN, TONNE_FORCE_TO_KN, convertLoadToKN };

function supportsForBoundary(boundary) {
  if (boundary === 'cantilever-left') return { leftSupport: 'fixed', rightSupport: 'free' };
  if (boundary === 'cantilever-right') return { leftSupport: 'free', rightSupport: 'fixed' };
  return { leftSupport: 'pin', rightSupport: 'roller' };
}

function rotatedSection(preset) {
  if (preset.type === 'rhs' || preset.type === 'rectangle') {
    if (preset.widthMm === preset.depthMm) return null;
    return { ...preset, widthMm: preset.depthMm, depthMm: preset.widthMm };
  }
  if (preset.type === 'custom') {
    if (preset.widthMm === preset.depthMm && preset.ixMm4 === preset.iyMm4) return null;
    return {
      ...preset,
      widthMm: preset.depthMm,
      depthMm: preset.widthMm,
      ixMm4: preset.iyMm4,
      iyMm4: preset.ixMm4,
      zxMm3: preset.zyMm3,
      zyMm3: preset.zxMm3
    };
  }
  return null;
}

function sectionVariants(preset) {
  if (!preset || preset.id === 'custom') return [];
  const cleanLabel = preset.label.replace(/ —.*/, '');
  const base = [{
    id: `${preset.id}-listed`,
    label: cleanLabel,
    orientation: 'as listed',
    section: { ...preset }
  }];
  const rotated = rotatedSection(preset);
  if (rotated) {
    base.push({
      id: `${preset.id}-rotated`,
      label: `${cleanLabel} rotated`,
      orientation: 'rotated 90°',
      section: rotated
    });
  }
  return base;
}

function materialStrengthReferences(material) {
  const naturalMaterial = material.family === 'wood' || material.family === 'bamboo';
  if (naturalMaterial) {
    return {
      strengthReferenceMPa: material.bendingReferenceMPa ?? material.allowableBendingMPa,
      strengthReferenceLabel: material.strengthReferenceLabel ?? 'selected natural-material bending reference',
      physicalReferenceMPa: material.ultimateBendingMPa
    };
  }
  return {
    strengthReferenceMPa: material.yieldStrengthMPa,
    strengthReferenceLabel: 'first-yield reference',
    physicalReferenceMPa: material.yieldStrengthMPa
  };
}

export function evaluateMemberCandidate({
  material,
  preset,
  lengthM,
  loadKN,
  loadPositionM,
  boundary = 'simply-supported',
  deflectionDivisor = 360
}) {
  const section = { ...preset };
  const properties = calculateSectionProperties(section);
  const supports = supportsForBoundary(boundary);
  const result = solveBeam({
    lengthM,
    elasticModulusMPa: material.elasticModulusMPa,
    inertiaMm4: properties.ixMm4,
    sectionModulusMm3: properties.zxMm3,
    ...supports,
    pointLoads: [{ xM: loadPositionM, forceKN: loadKN }]
  });

  const {
    strengthReferenceMPa,
    strengthReferenceLabel,
    physicalReferenceMPa
  } = materialStrengthReferences(material);
  const strengthRatio = strengthReferenceMPa
    ? result.maxBendingStressMPa / strengthReferenceMPa
    : null;
  const deflectionLimitMm = lengthM * 1000 / deflectionDivisor;
  const deflectionRatio = result.maxDeflectionMm / deflectionLimitMm;
  const physicalThresholdLoadKN = physicalReferenceMPa && result.maxBendingStressMPa > 0
    ? loadKN * physicalReferenceMPa / result.maxBendingStressMPa
    : null;
  const referenceThresholdLoadKN = strengthReferenceMPa && result.maxBendingStressMPa > 0
    ? loadKN * strengthReferenceMPa / result.maxBendingStressMPa
    : null;
  const calculatedMassKgM = properties.areaMm2 * 1e-6 * material.densityKgM3;
  const massPerM = preset.publishedMassKgM ?? calculatedMassKgM;
  const stockBoundaryM = preset.maxLengthM ?? material.maxLengthM ?? null;
  const stockPass = stockBoundaryM == null || lengthM <= stockBoundaryM + 1e-9;
  const stockVerified = stockBoundaryM != null;
  const strengthPass = strengthRatio != null && strengthRatio <= 1;
  const deflectionPass = deflectionRatio <= 1;
  const pass = stockPass && strengthPass && deflectionPass;
  const governingRatio = Math.max(strengthRatio ?? Infinity, deflectionRatio);

  const reasons = [];
  if (!stockPass && stockBoundaryM != null) reasons.push(`splice required above ${stockBoundaryM.toFixed(2)} m stock boundary`);
  if (!stockVerified) reasons.push('usable straight member length must be verified');
  if (!strengthPass) reasons.push(`${strengthReferenceLabel} exceeded`);
  if (!deflectionPass) reasons.push(`L/${deflectionDivisor} exceeded`);
  if (pass) reasons.push('passes selected elastic checks');

  return {
    materialId: material.id,
    materialName: material.name,
    materialSource: material.source,
    family: material.family,
    presetId: preset.id,
    sectionLabel: preset.label,
    section,
    properties,
    result,
    strengthReferenceMPa,
    strengthReferenceLabel,
    physicalReferenceMPa,
    strengthRatio,
    deflectionRatio,
    deflectionLimitMm,
    physicalThresholdLoadKN,
    allowableThresholdLoadKN: referenceThresholdLoadKN,
    referenceThresholdLoadKN,
    massPerM,
    calculatedMassKgM,
    publishedMassKgM: preset.publishedMassKgM ?? null,
    totalMassKg: massPerM * lengthM,
    stockBoundaryM,
    stockVerified,
    stockPass,
    strengthPass,
    deflectionPass,
    pass,
    governingRatio,
    marketStatus: preset.marketStatus ?? null,
    analysisStatus: preset.analysisStatus ?? null,
    sourceId: preset.sourceId ?? null,
    reasons
  };
}

export function recommendMemberSections({
  materials,
  presetsByFamily,
  familyFilter = 'all',
  lengthM,
  loadKN,
  loadPositionM,
  boundary = 'simply-supported',
  deflectionDivisor = 360,
  objective = 'mass'
}) {
  if (!Number.isFinite(lengthM) || lengthM <= 0) throw new Error('Member length must be greater than zero.');
  if (!Number.isFinite(loadKN) || loadKN <= 0) throw new Error('Required point load must be greater than zero.');
  if (!Number.isFinite(loadPositionM) || loadPositionM < 0 || loadPositionM > lengthM) {
    throw new Error('Point-load position must lie on the member.');
  }

  const candidates = [];
  for (const material of materials) {
    if (familyFilter !== 'all' && material.family !== familyFilter) continue;
    for (const basePreset of presetsByFamily[material.family] ?? []) {
      for (const variant of sectionVariants(basePreset)) {
        const evaluated = evaluateMemberCandidate({
          material,
          preset: { ...variant.section, id: variant.id, label: variant.label },
          lengthM,
          loadKN,
          loadPositionM,
          boundary,
          deflectionDivisor
        });
        evaluated.orientation = variant.orientation;
        candidates.push(evaluated);
      }
    }
  }

  const score = (candidate) => {
    if (objective === 'utilisation') return candidate.governingRatio;
    return candidate.totalMassKg;
  };

  candidates.sort((a, b) => {
    if (a.pass !== b.pass) return a.pass ? -1 : 1;
    if (a.stockPass !== b.stockPass) return a.stockPass ? -1 : 1;
    const primary = score(a) - score(b);
    if (Math.abs(primary) > 1e-12) return primary;
    return a.governingRatio - b.governingRatio;
  });

  return {
    objective,
    candidates,
    passing: candidates.filter((candidate) => candidate.pass),
    best: candidates.find((candidate) => candidate.pass) ?? null
  };
}
