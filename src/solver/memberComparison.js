import { calculateSectionProperties } from './sections.js';
import { solveColumn } from './column.js';
import { evaluateMemberCandidate } from './sectionRecommender.js';
import { productMaterialName, sectionCategory, sectionCategoryLabel } from '../data/sectionTaxonomy.js';

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

function validateSelections(selections) {
  if (!Array.isArray(selections) || selections.length < 2 || selections.length > 3) {
    throw new Error('Select two or three members for comparison.');
  }
  selections.forEach((selection, index) => {
    if (!selection?.material || !selection?.preset) {
      throw new Error(`Comparison member ${index + 1} is incomplete.`);
    }
  });
}

function selectedSection(selection) {
  return selection.orientation === 'rotated'
    ? rotatedSection(selection.preset)
    : { ...selection.preset };
}

function comparisonIdentity(selection, index) {
  return {
    comparisonId: selection.id ?? `member-${index + 1}`,
    comparisonLabel: selection.label ?? `Member ${index + 1}`,
    orientation: selection.orientation === 'rotated' ? 'rotated 90°' : 'as listed',
    basePresetId: selection.preset.id
  };
}

export function compareMemberCandidates({
  selections,
  lengthM,
  loadKN,
  loadPositionM,
  boundary = 'simply-supported',
  deflectionDivisor = 360
}) {
  validateSelections(selections);

  const records = selections.map((selection, index) => {
    const section = selectedSection(selection);
    const candidate = evaluateMemberCandidate({
      material: selection.material,
      preset: section,
      lengthM,
      loadKN,
      loadPositionM,
      boundary,
      deflectionDivisor
    });
    return { ...candidate, ...comparisonIdentity(selection, index) };
  });

  const passing = records.filter((record) => record.pass);
  const winners = {
    lightestPassing: finiteMin(passing, (record) => record.totalMassKg)?.comparisonId ?? null,
    leastDeflection: finiteMin(records, (record) => record.result.maxDeflectionMm)?.comparisonId ?? null,
    lowestStrengthUse: finiteMin(records, (record) => record.strengthRatio)?.comparisonId ?? null,
    highestPhysicalThreshold: finiteMax(records, (record) => record.physicalThresholdLoadKN)?.comparisonId ?? null
  };

  return {
    mode: 'beam',
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

function columnSupports(boundary) {
  if (boundary === 'fixed-fixed') return { bottomSupport: 'fixed', topSupport: 'fixed' };
  if (boundary === 'fixed-pinned') return { bottomSupport: 'fixed', topSupport: 'pin' };
  if (boundary === 'fixed-free') return { bottomSupport: 'fixed', topSupport: 'free' };
  return { bottomSupport: 'pin', topSupport: 'pin' };
}

function evaluateCompressionCandidate({
  selection,
  index,
  lengthM,
  axialLoadKN,
  eccentricityMm,
  boundary
}) {
  const material = selection.material;
  const section = selectedSection(selection);
  const properties = calculateSectionProperties(section);
  const compressionStrengthMPa = material.compressionParallelMPa ?? material.yieldStrengthMPa;
  if (!Number.isFinite(compressionStrengthMPa) || compressionStrengthMPa <= 0) {
    throw new Error(`${material.name} does not yet have a usable compression reference.`);
  }

  const widthMm = section.widthMm ?? section.diameterMm ?? 1;
  const depthMm = section.depthMm ?? section.diameterMm ?? widthMm;
  const result = solveColumn({
    lengthM,
    elasticModulusMPa: material.elasticModulusMPa,
    areaMm2: properties.areaMm2,
    ixMm4: properties.ixMm4,
    iyMm4: properties.iyMm4,
    zxMm3: properties.zxMm3,
    zyMm3: properties.zyMm3,
    widthMm,
    depthMm,
    ...columnSupports(boundary),
    axialLoadKN,
    eccentricityMm,
    compressionStrengthMPa
  });

  const capacityRatio = result.predictedCapacityKN > 0
    ? axialLoadKN / result.predictedCapacityKN
    : Number.POSITIVE_INFINITY;
  const stressRatio = Number.isFinite(result.maxCompressionStressMPa)
    ? result.maxCompressionStressMPa / compressionStrengthMPa
    : Number.POSITIVE_INFINITY;
  const governingRatio = Math.max(capacityRatio, stressRatio);
  const calculatedMassKgM = properties.areaMm2 * 1e-6 * material.densityKgM3;
  const massPerM = selection.preset.publishedMassKgM ?? calculatedMassKgM;
  const stockBoundaryM = selection.preset.maxLengthM ?? material.maxLengthM ?? null;
  const stockPass = stockBoundaryM == null || lengthM <= stockBoundaryM + 1e-9;
  const capacityPass = capacityRatio <= 1;
  const stressPass = stressRatio <= 1;
  const pass = stockPass && capacityPass && stressPass;
  const reasons = [];
  if (!stockPass) reasons.push(`splice required above ${stockBoundaryM.toFixed(2)} m stock boundary`);
  if (!capacityPass) reasons.push(`${result.governingMode.toLowerCase()} capacity exceeded`);
  if (!stressPass) reasons.push('amplified compression-stress reference exceeded');
  if (pass) reasons.push('passes current idealised compression checks');

  return {
    ...comparisonIdentity(selection, index),
    materialId: material.id,
    materialName: material.name,
    displayMaterialName: productMaterialName(material, selection.preset),
    materialSource: material.source,
    family: material.family,
    productCategory: sectionCategory(selection.preset, material.family),
    productCategoryLabel: sectionCategoryLabel(selection.preset, material.family),
    sectionLabel: selection.preset.label,
    section,
    properties,
    result,
    compressionStrengthMPa,
    capacityRatio,
    stressRatio,
    governingRatio,
    physicalThresholdLoadKN: result.predictedCapacityKN,
    massPerM,
    totalMassKg: massPerM * lengthM,
    stockBoundaryM,
    stockPass,
    capacityPass,
    stressPass,
    pass,
    reasons
  };
}

export function compareCompressionCandidates({
  selections,
  lengthM,
  axialLoadKN,
  eccentricityMm = 0,
  boundary = 'pinned-pinned'
}) {
  validateSelections(selections);
  if (!Number.isFinite(lengthM) || lengthM <= 0) throw new Error('Member length must be greater than zero.');
  if (!Number.isFinite(axialLoadKN) || axialLoadKN <= 0) throw new Error('Axial compression load must be greater than zero.');
  if (!Number.isFinite(eccentricityMm) || eccentricityMm < 0) throw new Error('Eccentricity cannot be negative.');

  const records = selections.map((selection, index) => evaluateCompressionCandidate({
    selection,
    index,
    lengthM,
    axialLoadKN,
    eccentricityMm,
    boundary
  }));
  const passing = records.filter((record) => record.pass);
  const winners = {
    lightestPassing: finiteMin(passing, (record) => record.totalMassKg)?.comparisonId ?? null,
    leastShortening: finiteMin(records, (record) => record.result.shorteningMm)?.comparisonId ?? null,
    lowestCompressionUse: finiteMin(records, (record) => record.governingRatio)?.comparisonId ?? null,
    highestCompressionCapacity: finiteMax(records, (record) => record.result.predictedCapacityKN)?.comparisonId ?? null
  };

  return {
    mode: 'compression',
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
