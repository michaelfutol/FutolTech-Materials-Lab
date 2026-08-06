import { calculateSectionProperties } from './sections.js';
import { solveBeam } from './beamFem.js';

export const KGF_M2_TO_KN_M2 = 0.00980665;

export function convertAreaLoadToKNM2(value, unit) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Roof area load must be non-negative.');
  if (unit === 'kgf-m2') return value * KGF_M2_TO_KN_M2;
  if (unit === 'kPa' || unit === 'kN-m2') return value;
  throw new Error(`Unsupported area-load unit: ${unit}`);
}

function uniqueSorted(values, tolerance = 1e-8) {
  return [...values]
    .sort((a, b) => a - b)
    .filter((value, index, array) => index === 0 || Math.abs(value - array[index - 1]) > tolerance);
}

export function buildJoistPositions(rafterLengthM, joistSpacingM) {
  if (!Number.isFinite(rafterLengthM) || rafterLengthM <= 0) throw new Error('Rafter length must be greater than zero.');
  if (!Number.isFinite(joistSpacingM) || joistSpacingM <= 0) throw new Error('Joist spacing must be greater than zero.');
  if (joistSpacingM > rafterLengthM) return [0, rafterLengthM];

  const positions = [0];
  for (let xM = joistSpacingM; xM < rafterLengthM - 1e-8; xM += joistSpacingM) {
    positions.push(Number(xM.toFixed(9)));
  }
  positions.push(rafterLengthM);
  return uniqueSorted(positions);
}

export function generateRoofJoistReactions({
  rafterLengthM,
  joistSpanM,
  joistSpacingM,
  areaLoadKNM2,
  supportedSides = 1,
  joistSelfWeightKNM = 0
}) {
  if (!Number.isFinite(joistSpanM) || joistSpanM <= 0) throw new Error('Joist span must be greater than zero.');
  if (!Number.isFinite(areaLoadKNM2) || areaLoadKNM2 < 0) throw new Error('Area load must be non-negative.');
  if (![1, 2].includes(supportedSides)) throw new Error('Supported roof sides must be one or two.');
  if (!Number.isFinite(joistSelfWeightKNM) || joistSelfWeightKNM < 0) throw new Error('Joist self-weight must be non-negative.');

  const positionsM = buildJoistPositions(rafterLengthM, joistSpacingM);
  const reactions = positionsM.map((xM, index) => {
    const leftBoundaryM = index === 0 ? 0 : (positionsM[index - 1] + xM) / 2;
    const rightBoundaryM = index === positionsM.length - 1 ? rafterLengthM : (xM + positionsM[index + 1]) / 2;
    const tributaryWidthM = rightBoundaryM - leftBoundaryM;
    const areaComponentKN = areaLoadKNM2 * tributaryWidthM * joistSpanM;
    const selfWeightComponentKN = joistSelfWeightKNM * joistSpanM;
    const reactionKN = 0.5 * supportedSides * (areaComponentKN + selfWeightComponentKN);
    return {
      index: index + 1,
      xM,
      tributaryWidthM,
      joistLineLoadKNM: areaLoadKNM2 * tributaryWidthM + joistSelfWeightKNM,
      totalJoistLoadKN: supportedSides * (areaComponentKN + selfWeightComponentKN),
      reactionKN
    };
  });

  return {
    positionsM,
    reactions,
    pointLoads: reactions.map((reaction) => ({ xM: reaction.xM, forceKN: reaction.reactionKN })),
    totalAppliedToRafterKN: reactions.reduce((sum, reaction) => sum + reaction.reactionKN, 0),
    representedRoofAreaM2: rafterLengthM * joistSpanM * supportedSides,
    selectedRafterTributaryAreaM2: rafterLengthM * joistSpanM * supportedSides / 2
  };
}

function rotateSection(section) {
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

function materialReferences(material) {
  if (material.family === 'steel') {
    return {
      bendingReferenceMPa: material.yieldStrengthMPa,
      label: 'first-yield reference',
      screeningOnly: material.source?.status === 'assumed'
    };
  }
  return {
    bendingReferenceMPa: material.bendingReferenceMPa ?? material.allowableBendingMPa,
    label: material.strengthReferenceLabel ?? 'selected natural-material bending reference',
    screeningOnly: material.source?.status !== 'published'
  };
}

function analyseSpliceOnSupport({
  lengthM,
  supportXM,
  pointLoads,
  elasticModulusMPa,
  inertiaMm4,
  sectionModulusMm3
}) {
  const supportsM = [0, supportXM, lengthM];
  const supportReactionMap = new Map(supportsM.map((xM) => [xM, 0]));
  const directSupportLoads = [];
  const tolerance = 1e-8;

  for (const load of pointLoads) {
    const support = supportsM.find((xM) => Math.abs(load.xM - xM) < tolerance);
    if (support != null) {
      supportReactionMap.set(support, supportReactionMap.get(support) + load.forceKN);
      directSupportLoads.push(load);
    }
  }

  const spanResults = [];
  for (let index = 0; index < supportsM.length - 1; index += 1) {
    const startM = supportsM[index];
    const endM = supportsM[index + 1];
    const spanLengthM = endM - startM;
    const spanLoads = pointLoads
      .filter((load) => load.xM > startM + tolerance && load.xM < endM - tolerance)
      .map((load) => ({ xM: load.xM - startM, forceKN: load.forceKN }));
    const result = solveBeam({
      lengthM: spanLengthM,
      elasticModulusMPa,
      inertiaMm4,
      sectionModulusMm3,
      leftSupport: 'pin',
      rightSupport: 'roller',
      pointLoads: spanLoads
    });
    supportReactionMap.set(startM, supportReactionMap.get(startM) + result.leftReactionKN);
    supportReactionMap.set(endM, supportReactionMap.get(endM) + result.rightReactionKN);
    spanResults.push({ startM, endM, spanLengthM, result });
  }

  return {
    structuralSystem: 'splice-on-support',
    maxDeflectionMm: Math.max(...spanResults.map((span) => span.result.maxDeflectionMm)),
    maxMomentKNm: Math.max(...spanResults.map((span) => span.result.maxMomentKNm)),
    maxBendingStressMPa: Math.max(...spanResults.map((span) => span.result.maxBendingStressMPa)),
    deflectionSeries: spanResults.flatMap((span, spanIndex) => span.result.deflectionSeries
      .filter((_, pointIndex) => spanIndex === 0 || pointIndex > 0)
      .map((point) => ({ ...point, xM: point.xM + span.startM }))),
    supportReactionsKN: [...supportReactionMap.entries()].map(([xM, reactionKN]) => ({ xM, reactionKN })),
    spanResults,
    directSupportLoads,
    governingClearSpanM: Math.max(...spanResults.map((span) => span.spanLengthM))
  };
}

export function evaluateRoofRafter({
  material,
  preset,
  orientation = 'listed',
  rafterLengthM,
  joistSpanM,
  joistSpacingM,
  areaLoadKNM2,
  supportedSides = 1,
  joistSelfWeightKNM = 0,
  extraSupportM = null,
  spliceOnExtraSupport = false,
  deflectionDivisor = 240
}) {
  if (!material || !preset) throw new Error('Select a rafter material and section.');
  if (!Number.isFinite(deflectionDivisor) || deflectionDivisor <= 0) throw new Error('Deflection divisor must be greater than zero.');
  const hasExtraSupport = Number.isFinite(extraSupportM);
  if (hasExtraSupport && (extraSupportM <= 0 || extraSupportM >= rafterLengthM)) {
    throw new Error('Extra support must lie strictly inside the rafter length.');
  }
  if (spliceOnExtraSupport && !hasExtraSupport) {
    throw new Error('A splice-on-support model requires a real extra support location.');
  }

  const section = orientation === 'rotated' ? rotateSection(preset) : { ...preset };
  const properties = calculateSectionProperties(section);
  const loadPath = generateRoofJoistReactions({
    rafterLengthM,
    joistSpanM,
    joistSpacingM,
    areaLoadKNM2,
    supportedSides,
    joistSelfWeightKNM
  });

  const result = spliceOnExtraSupport
    ? analyseSpliceOnSupport({
      lengthM: rafterLengthM,
      supportXM: extraSupportM,
      pointLoads: loadPath.pointLoads,
      elasticModulusMPa: material.elasticModulusMPa,
      inertiaMm4: properties.ixMm4,
      sectionModulusMm3: properties.zxMm3
    })
    : {
      structuralSystem: hasExtraSupport ? 'continuous-over-support' : 'single-span',
      ...solveBeam({
        lengthM: rafterLengthM,
        elasticModulusMPa: material.elasticModulusMPa,
        inertiaMm4: properties.ixMm4,
        sectionModulusMm3: properties.zxMm3,
        leftSupport: 'pin',
        rightSupport: 'roller',
        pointLoads: loadPath.pointLoads,
        intermediateSupportsM: hasExtraSupport ? [extraSupportM] : []
      }),
      governingClearSpanM: hasExtraSupport
        ? Math.max(extraSupportM, rafterLengthM - extraSupportM)
        : rafterLengthM
    };

  const references = materialReferences(material);
  const strengthRatio = Number.isFinite(references.bendingReferenceMPa) && references.bendingReferenceMPa > 0
    ? result.maxBendingStressMPa / references.bendingReferenceMPa
    : null;
  const deflectionLimitMm = result.governingClearSpanM * 1000 / deflectionDivisor;
  const deflectionRatio = result.maxDeflectionMm / deflectionLimitMm;
  const segmentLengthsM = hasExtraSupport
    ? [extraSupportM, rafterLengthM - extraSupportM]
    : [rafterLengthM];
  const stockBoundaryM = preset.maxLengthM ?? material.maxLengthM ?? null;
  const stockPass = stockBoundaryM == null || (spliceOnExtraSupport
    ? segmentLengthsM.every((segmentM) => segmentM <= stockBoundaryM + 1e-8)
    : rafterLengthM <= stockBoundaryM + 1e-8);
  const strengthPass = strengthRatio != null && strengthRatio <= 1;
  const deflectionPass = deflectionRatio <= 1;
  const pass = stockPass && strengthPass && deflectionPass;
  const status = pass ? (references.screeningOnly ? 'SCREENING' : 'PRELIM PASS') : 'FAIL';
  const reasons = [];
  if (!stockPass) reasons.push(spliceOnExtraSupport ? 'one or more splice-supported pieces exceed the verified stock length' : 'member length exceeds the verified stock boundary');
  if (!strengthPass) reasons.push(`${references.label} exceeded`);
  if (!deflectionPass) reasons.push(`L/${deflectionDivisor} deflection criterion exceeded`);
  if (spliceOnExtraSupport) reasons.push('splice capacity is not checked; splice is assumed directly over a real support');
  if (hasExtraSupport && !spliceOnExtraSupport) reasons.push('member is analysed as continuous over the extra support');
  if (pass && references.screeningOnly) reasons.push('below current research/provisional screening limits; not a final design approval');
  if (pass && !references.screeningOnly) reasons.push('passes current preliminary member checks');

  return {
    material,
    preset,
    section,
    properties,
    loadPath,
    result,
    strengthReferenceMPa: references.bendingReferenceMPa,
    strengthReferenceLabel: references.label,
    strengthRatio,
    deflectionLimitMm,
    deflectionRatio,
    stockBoundaryM,
    stockPass,
    strengthPass,
    deflectionPass,
    pass,
    status,
    reasons,
    extraSupportM: hasExtraSupport ? extraSupportM : null,
    spliceOnExtraSupport,
    segmentLengthsM
  };
}
