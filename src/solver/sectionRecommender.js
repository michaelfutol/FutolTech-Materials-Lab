import { calculateSectionProperties } from './sections.js';
import { solveBeam } from './beamFem.js';
import { productMaterialName, sectionCategory, sectionCategoryLabel } from '../data/sectionTaxonomy.js';
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
  if (preset.type === 'rhs' || preset.type === 'rectangle' || preset.type === 'angle') {
    if (preset.widthMm === preset.depthMm && preset.type !== 'angle') return null;
    return {
      ...preset,
      widthMm: preset.depthMm,
      depthMm: preset.widthMm,
      displayRotationDeg: ((preset.displayRotationDeg ?? 0) + 90) % 360
    };
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
      zyMm3: preset.zxMm3,
      displayRotationDeg: ((preset.displayRotationDeg ?? 0) + 90) % 180
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

function massProperties(material, preset, properties, lengthM) {
  const calculatedMassKgM = Number.isFinite(material.densityKgM3)
    ? properties.areaMm2 * 1e-6 * material.densityKgM3
    : null;
  const massPerM = Number.isFinite(preset.publishedMassKgM)
    ? preset.publishedMassKgM
    : calculatedMassKgM;
  return {
    calculatedMassKgM,
    massPerM,
    totalMassKg: Number.isFinite(massPerM) ? massPerM * lengthM : null,
    massVerified: Number.isFinite(massPerM)
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
  const mass = massProperties(material, preset, properties, lengthM);
  const stockBoundaryM = preset.maxLengthM ?? material.maxLengthM ?? null;
  const stockPass = stockBoundaryM == null || lengthM <= stockBoundaryM + 1e-9;
  const stockVerified = stockBoundaryM != null;
  const strengthPass = strengthRatio != null && strengthRatio <= 1;
  const deflectionPass = deflectionRatio <= 1;
  const pass = stockPass && strengthPass && deflectionPass;
  const governingRatio = Math.max(strengthRatio ?? Infinity, deflectionRatio);
  const productCategory = sectionCategory(preset, material.family);
  const screeningOnly = productCategory === 'c-purlin' || productCategory === 'angle-bar';

  const reasons = [];
  if (!stockPass && stockBoundaryM != null) reasons.push(`splice required above ${stockBoundaryM.toFixed(2)} m stock boundary`);
  if (!stockVerified) reasons.push('usable straight member length must be verified');
  if (!mass.massVerified) reasons.push('mass ranking unavailable until density is verified');
  if (!strengthPass) reasons.push(`${strengthReferenceLabel} exceeded`);
  if (!deflectionPass) reasons.push(`L/${deflectionDivisor} exceeded`);
  if (productCategory === 'c-purlin') reasons.push('C-purlin is gross-section elastic screening only: local/distortional/lateral-torsional buckling, effective width, connection restraint and roof diaphragm action are not checked');
  if (productCategory === 'angle-bar') reasons.push('Angle bar is gross leg-axis elastic screening only: rolled radii, principal-axis unsymmetric bending, shear-centre/torsion, local instability and lateral-torsional/flexural-torsional buckling are not checked');
  if (pass && !screeningOnly) reasons.push('passes selected elastic checks');
  if (pass && productCategory === 'c-purlin') reasons.push('below the selected gross-section elastic limits; this is not a cold-formed design pass');
  if (pass && productCategory === 'angle-bar') reasons.push('below the selected gross leg-axis elastic limits; this is not a complete angle-member design pass');

  return {
    materialId: material.id,
    materialName: material.name,
    displayMaterialName: productMaterialName(material, preset),
    materialSource: material.source,
    family: material.family,
    productCategory,
    productCategoryLabel: sectionCategoryLabel(preset, material.family),
    librarySectionId: preset.id?.replace(/-(listed|rotated)$/, '') ?? preset.id,
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
    massPerM: mass.massPerM,
    calculatedMassKgM: mass.calculatedMassKgM,
    publishedMassKgM: preset.publishedMassKgM ?? null,
    totalMassKg: mass.totalMassKg,
    massVerified: mass.massVerified,
    stockBoundaryM,
    stockVerified,
    stockPass,
    strengthPass,
    deflectionPass,
    pass,
    screeningOnly,
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
      // Open/cold-formed and unsymmetric angle sections remain manual screening
      // candidates until their governing instability/torsion design layers exist.
      if (basePreset.productCategory === 'c-purlin' || basePreset.productCategory === 'angle-bar') continue;
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
        evaluated.librarySectionId = basePreset.id;
        candidates.push(evaluated);
      }
    }
  }

  const score = (candidate) => {
    if (objective === 'utilisation') return candidate.governingRatio;
    return Number.isFinite(candidate.totalMassKg) ? candidate.totalMassKg : Number.POSITIVE_INFINITY;
  };

  candidates.sort((a, b) => {
    if (a.pass !== b.pass) return a.pass ? -1 : 1;
    if (a.stockPass !== b.stockPass) return a.stockPass ? -1 : 1;
    const scoreA = score(a);
    const scoreB = score(b);
    if (scoreA !== scoreB) return scoreA < scoreB ? -1 : 1;
    return a.governingRatio - b.governingRatio;
  });

  return {
    objective,
    candidates,
    passing: candidates.filter((candidate) => candidate.pass),
    best: candidates.find((candidate) => candidate.pass) ?? null
  };
}
