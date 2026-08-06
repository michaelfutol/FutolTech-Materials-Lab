import { calculateSectionProperties } from './sections.js';
import { solveBeam } from './beamFem.js';
import { solveColumn } from './column.js';

export const KGF_TO_KN = 0.00980665;
const REACTION_TOLERANCE_KN = 1e-7;

function finitePositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
}

export function buildEvenPositions(lengthM, maximumSpacingM) {
  finitePositive(lengthM, 'Length');
  finitePositive(maximumSpacingM, 'Target spacing');
  const bayCount = Math.max(1, Math.ceil(lengthM / maximumSpacingM - 1e-10));
  const actualSpacingM = lengthM / bayCount;
  return {
    bayCount,
    actualSpacingM,
    positionsM: Array.from({ length: bayCount + 1 }, (_, index) => Number((index * actualSpacingM).toFixed(9)))
  };
}

export function tributaryWidths(positionsM, totalLengthM) {
  return positionsM.map((positionM, index) => {
    const left = index === 0 ? 0 : (positionsM[index - 1] + positionM) / 2;
    const right = index === positionsM.length - 1 ? totalLengthM : (positionM + positionsM[index + 1]) / 2;
    return right - left;
  });
}

export function calculateShoringAreaLoad({ slabThicknessMm, concreteUnitWeightKNM3, plywoodThicknessMm, plywoodDensityKgM3, rebarAllowanceKgfM2, constructionLiveLoadKgfM2, miscellaneousLoadKgfM2 = 0 }) {
  finitePositive(slabThicknessMm, 'Slab thickness');
  finitePositive(concreteUnitWeightKNM3, 'Concrete unit weight');
  finitePositive(plywoodThicknessMm, 'Plywood thickness');
  finitePositive(plywoodDensityKgM3, 'Plywood density');
  if (![rebarAllowanceKgfM2, constructionLiveLoadKgfM2, miscellaneousLoadKgfM2].every((value) => Number.isFinite(value) && value >= 0)) throw new Error('Area-load allowances must be finite and non-negative.');
  const freshConcreteKNM2 = slabThicknessMm / 1000 * concreteUnitWeightKNM3;
  const plywoodKNM2 = plywoodThicknessMm / 1000 * plywoodDensityKgM3 * 9.80665 / 1000;
  const rebarKNM2 = rebarAllowanceKgfM2 * KGF_TO_KN;
  const constructionKNM2 = constructionLiveLoadKgfM2 * KGF_TO_KN;
  const miscellaneousKNM2 = miscellaneousLoadKgfM2 * KGF_TO_KN;
  const totalKNM2 = freshConcreteKNM2 + plywoodKNM2 + rebarKNM2 + constructionKNM2 + miscellaneousKNM2;
  return { freshConcreteKNM2, plywoodKNM2, rebarKNM2, constructionKNM2, miscellaneousKNM2, totalKNM2, totalKgfM2: totalKNM2 / KGF_TO_KN };
}

function rotateSection(section) {
  if (section.type === 'rectangle' || section.type === 'rhs') return { ...section, widthMm: section.depthMm, depthMm: section.widthMm };
  if (section.type === 'custom') return { ...section, widthMm: section.depthMm, depthMm: section.widthMm, ixMm4: section.iyMm4, iyMm4: section.ixMm4, zxMm3: section.zyMm3, zyMm3: section.zxMm3 };
  return { ...section };
}
function selectedSection(preset, orientation) { return orientation === 'rotated' ? rotateSection(preset) : { ...preset }; }
function materialBendingReference(material) {
  return {
    valueMPa: material.family === 'steel' ? material.yieldStrengthMPa : material.bendingReferenceMPa ?? material.allowableBendingMPa,
    label: material.family === 'steel' ? 'first-yield screening reference' : material.strengthReferenceLabel ?? 'selected natural-material bending reference',
    screeningOnly: true
  };
}
function distributedPointLoads(lengthM, lineLoadKNM, targetSegmentM = 0.1) {
  const segmentCount = Math.max(4, Math.ceil(lengthM / targetSegmentM));
  const segmentM = lengthM / segmentCount;
  return Array.from({ length: segmentCount }, (_, index) => ({ xM: (index + 0.5) * segmentM, forceKN: lineLoadKNM * segmentM }));
}
function maximumGap(positionsM) {
  let maximum = 0;
  for (let index = 1; index < positionsM.length; index += 1) maximum = Math.max(maximum, positionsM[index] - positionsM[index - 1]);
  return maximum;
}

function evaluateFlexuralMember({ material, preset, orientation, lengthM, supportPositionsM, pointLoads, deflectionDivisor }) {
  const section = selectedSection(preset, orientation);
  const properties = calculateSectionProperties(section);
  const result = solveBeam({ lengthM, elasticModulusMPa: material.elasticModulusMPa, inertiaMm4: properties.ixMm4, sectionModulusMm3: properties.zxMm3, leftSupport: 'pin', rightSupport: 'roller', intermediateSupportsM: supportPositionsM.slice(1, -1), pointLoads });
  const reference = materialBendingReference(material);
  const strengthRatio = Number.isFinite(reference.valueMPa) && reference.valueMPa > 0 ? result.maxBendingStressMPa / reference.valueMPa : Number.POSITIVE_INFINITY;
  const governingSpanM = maximumGap(supportPositionsM);
  const deflectionLimitMm = governingSpanM * 1000 / deflectionDivisor;
  const deflectionRatio = result.maxDeflectionMm / deflectionLimitMm;
  const pass = strengthRatio <= 1 && deflectionRatio <= 1;
  return { material, preset, orientation, section, properties, result, reference, strengthRatio, governingSpanM, deflectionLimitMm, deflectionRatio, pass, status: pass ? 'SCREENING' : 'FAIL' };
}

function ensureCompressionOnlyReactions(reactions, memberLabel) {
  const negative = reactions.find((reaction) => reaction.reactionKN < -REACTION_TOLERANCE_KN);
  if (negative) throw new Error(`${memberLabel} develops uplift/contact loss at ${negative.xM.toFixed(2)} m. The current contact-only shoring model cannot redistribute that load safely.`);
  return reactions.map((reaction) => ({ ...reaction, reactionKN: Math.max(0, reaction.reactionKN) }));
}
function governingRecord(records, ratioSelector) {
  return records.reduce((governing, candidate) => {
    const ratio = ratioSelector(candidate);
    return !governing || ratio > governing.ratio ? { ...candidate, ratio } : governing;
  }, null);
}

export function normaliseBraceElevations(heightM, elevationsM = []) {
  finitePositive(heightM, 'Shore height');
  const values = [...new Set(elevationsM.map(Number).filter(Number.isFinite).map((value) => Number(value.toFixed(6))))].sort((a, b) => a - b);
  if (values.some((value) => value <= 0 || value >= heightM)) throw new Error('Every brace elevation must lie strictly between the shore base and top.');
  return values;
}
function braceSegments(heightM, braceElevationsM) {
  const boundariesM = [0, ...normaliseBraceElevations(heightM, braceElevationsM), heightM];
  const segmentsM = boundariesM.slice(1).map((value, index) => value - boundariesM[index]);
  return { boundariesM, segmentsM, longestUnbracedM: Math.max(...segmentsM) };
}
function evaluateShoreColumn({ material, preset, orientation, heightM, axialLoadKN, eccentricityMm, braceElevationsM }) {
  const section = selectedSection(preset, orientation);
  const properties = calculateSectionProperties(section);
  const brace = braceSegments(heightM, braceElevationsM);
  const result = solveColumn({ lengthM: brace.longestUnbracedM, elasticModulusMPa: material.elasticModulusMPa, areaMm2: properties.areaMm2, ixMm4: properties.ixMm4, iyMm4: properties.iyMm4, zxMm3: properties.zxMm3, zyMm3: properties.zyMm3, widthMm: section.widthMm ?? section.outsideDiameterMm ?? section.diameterMm, depthMm: section.depthMm ?? section.outsideDiameterMm ?? section.diameterMm, bottomSupport: 'pin', topSupport: 'pin', axialLoadKN, eccentricityMm, compressionStrengthMPa: material.compressionParallelMPa ?? material.yieldStrengthMPa, materialFamily: material.family, yieldStrengthMPa: material.yieldStrengthMPa, intermediateBracePoints: 0 });
  const utilization = axialLoadKN / result.comparisonCapacityKN;
  const compressionReferenceMPa = material.family === 'steel' ? material.yieldStrengthMPa : material.compressionParallelMPa;
  const stressUtilization = Number.isFinite(compressionReferenceMPa) && compressionReferenceMPa > 0 ? result.maxCompressionStressMPa / compressionReferenceMPa : Number.POSITIVE_INFINITY;
  const pass = utilization <= 1 && stressUtilization <= 1;
  return { material, preset, orientation, section, properties, brace, result, utilization, stressUtilization, pass, status: pass ? 'SCREENING' : 'FAIL' };
}

export function suggestBraceElevations({ material, preset, orientation = 'listed', heightM, axialLoadKN, eccentricityMm = 10, targetUtilization = 0.8, maximumBraceLevels = 4 }) {
  if (!Number.isInteger(maximumBraceLevels) || maximumBraceLevels < 0 || maximumBraceLevels > 8) throw new Error('Maximum brace levels must be a whole number from 0 to 8.');
  if (!Number.isFinite(targetUtilization) || targetUtilization <= 0 || targetUtilization > 1) throw new Error('Target utilization must be greater than zero and not more than 1.0.');
  const trials = [];
  for (let count = 0; count <= maximumBraceLevels; count += 1) {
    const elevationsM = Array.from({ length: count }, (_, index) => heightM * (index + 1) / (count + 1));
    const assessment = evaluateShoreColumn({ material, preset, orientation, heightM, axialLoadKN, eccentricityMm, braceElevationsM: elevationsM });
    trials.push({ count, elevationsM, assessment });
    if (assessment.utilization <= targetUtilization && assessment.stressUtilization <= targetUtilization) return { recommended: trials.at(-1), trials, targetMet: true, basis: 'individual-shore buckling screen only' };
  }
  return { recommended: trials.at(-1), trials, targetMet: false, basis: 'individual-shore buckling screen only' };
}

export function evaluateShoringSystem({ slabWidthM, slabLengthM, slabThicknessMm, concreteUnitWeightKNM3 = 24, plywoodThicknessMm = 12.7, plywoodDensityKgM3 = 600, rebarAllowanceKgfM2 = 20, constructionLiveLoadKgfM2 = 250, miscellaneousLoadKgfM2 = 0, joistTargetSpacingM = 0.3, bearerTargetSpacingM = 0.8, shoreTargetSpacingM = 0.8, joistSelfWeightKNM = 0, bearerSelfWeightKNM = 0, joistMaterial, joistPreset, joistOrientation = 'listed', bearerMaterial, bearerPreset, bearerOrientation = 'listed', shoreMaterial, shorePreset, shoreOrientation = 'listed', shoreHeightM = 3, shoreEccentricityMm = 10, braceMode = 'auto', manualBraceElevationsM = [], targetShoreUtilization = 0.8, maximumBraceLevels = 4, deflectionDivisor = 360 }) {
  [[slabWidthM, 'Slab width'], [slabLengthM, 'Slab length'], [joistTargetSpacingM, 'Joist spacing'], [bearerTargetSpacingM, 'Bearer spacing'], [shoreTargetSpacingM, 'Shore spacing'], [shoreHeightM, 'Shore height']].forEach(([value, label]) => finitePositive(value, label));
  if (![joistMaterial, joistPreset, bearerMaterial, bearerPreset, shoreMaterial, shorePreset].every(Boolean)) throw new Error('Select the joist, bearer and shore materials and sections.');
  const areaLoad = calculateShoringAreaLoad({ slabThicknessMm, concreteUnitWeightKNM3, plywoodThicknessMm, plywoodDensityKgM3, rebarAllowanceKgfM2, constructionLiveLoadKgfM2, miscellaneousLoadKgfM2 });
  const joistGrid = buildEvenPositions(slabLengthM, joistTargetSpacingM);
  const bearerGrid = buildEvenPositions(slabWidthM, bearerTargetSpacingM);
  const shoreGrid = buildEvenPositions(slabLengthM, shoreTargetSpacingM);
  const joistTributaryWidthsM = tributaryWidths(joistGrid.positionsM, slabLengthM);
  const bearerTributaryWidthsM = tributaryWidths(bearerGrid.positionsM, slabWidthM);
  const shoreTributaryWidthsM = tributaryWidths(shoreGrid.positionsM, slabLengthM);

  const joists = joistGrid.positionsM.map((yM, joistIndex) => {
    const tributaryWidthM = joistTributaryWidthsM[joistIndex];
    const lineLoadKNM = areaLoad.totalKNM2 * tributaryWidthM + joistSelfWeightKNM;
    const member = evaluateFlexuralMember({ material: joistMaterial, preset: joistPreset, orientation: joistOrientation, lengthM: slabWidthM, supportPositionsM: bearerGrid.positionsM, pointLoads: distributedPointLoads(slabWidthM, lineLoadKNM), deflectionDivisor });
    const supportReactionsKN = ensureCompressionOnlyReactions(member.result.supportReactionsKN, `Joist J${joistIndex + 1}`);
    return { id: `J${joistIndex + 1}`, joistIndex, yM, tributaryWidthM, lineLoadKNM, member, supportReactionsKN };
  });
  const joistGoverning = governingRecord(joists, (candidate) => Math.max(candidate.member.strengthRatio, candidate.member.deflectionRatio));

  const bearers = bearerGrid.positionsM.map((xM, bearerIndex) => {
    const tributaryWidthM = bearerTributaryWidthsM[bearerIndex];
    const pointLoads = joists.map((joist, joistIndex) => ({ xM: joist.yM, forceKN: joist.supportReactionsKN[bearerIndex].reactionKN + bearerSelfWeightKNM * joistTributaryWidthsM[joistIndex] }));
    const member = evaluateFlexuralMember({ material: bearerMaterial, preset: bearerPreset, orientation: bearerOrientation, lengthM: slabLengthM, supportPositionsM: shoreGrid.positionsM, pointLoads, deflectionDivisor });
    const supportReactionsKN = ensureCompressionOnlyReactions(member.result.supportReactionsKN, `Bearer B${bearerIndex + 1}`);
    return { id: `B${bearerIndex + 1}`, xM, bearerIndex, tributaryWidthM, pointLoads, member, supportReactionsKN };
  });
  const bearerGoverning = governingRecord(bearers, (candidate) => Math.max(candidate.member.strengthRatio, candidate.member.deflectionRatio));

  const shores = [];
  for (const bearer of bearers) {
    bearer.supportReactionsKN.forEach((support, shoreIndex) => shores.push({ id: `B${bearer.bearerIndex + 1}-S${shoreIndex + 1}`, bearerIndex: bearer.bearerIndex, shoreIndex, xM: bearer.xM, yM: support.xM, loadKN: support.reactionKN, tributaryAreaM2: bearer.tributaryWidthM * shoreTributaryWidthsM[shoreIndex], locationType: (bearer.bearerIndex === 0 || bearer.bearerIndex === bearerGrid.positionsM.length - 1) && (shoreIndex === 0 || shoreIndex === shoreGrid.positionsM.length - 1) ? 'corner' : (bearer.bearerIndex === 0 || bearer.bearerIndex === bearerGrid.positionsM.length - 1 || shoreIndex === 0 || shoreIndex === shoreGrid.positionsM.length - 1) ? 'edge' : 'interior' }));
  }

  const maximumShoreLoadKN = Math.max(...shores.map((shore) => shore.loadKN));
  let braceSuggestion = null;
  let braceElevationsM;
  if (braceMode === 'manual') braceElevationsM = normaliseBraceElevations(shoreHeightM, manualBraceElevationsM);
  else {
    braceSuggestion = suggestBraceElevations({ material: shoreMaterial, preset: shorePreset, orientation: shoreOrientation, heightM: shoreHeightM, axialLoadKN: maximumShoreLoadKN, eccentricityMm: shoreEccentricityMm, targetUtilization: targetShoreUtilization, maximumBraceLevels });
    braceElevationsM = braceSuggestion.recommended.elevationsM;
  }
  const shoreAssessment = evaluateShoreColumn({ material: shoreMaterial, preset: shorePreset, orientation: shoreOrientation, heightM: shoreHeightM, axialLoadKN: maximumShoreLoadKN, eccentricityMm: shoreEccentricityMm, braceElevationsM });
  const totalVerticalLoadKN = areaLoad.totalKNM2 * slabWidthM * slabLengthM + joistSelfWeightKNM * slabWidthM * joistGrid.positionsM.length + bearerSelfWeightKNM * slabLengthM * bearerGrid.positionsM.length;
  const totalShoreReactionKN = shores.reduce((sum, shore) => sum + shore.loadKN, 0);
  const reactionErrorRatio = totalVerticalLoadKN > 0 ? Math.abs(totalShoreReactionKN - totalVerticalLoadKN) / totalVerticalLoadKN : 0;

  return {
    areaLoad,
    grids: { joist: { ...joistGrid, tributaryWidthsM: joistTributaryWidthsM }, bearer: { ...bearerGrid, tributaryWidthsM: bearerTributaryWidthsM }, shore: { ...shoreGrid, tributaryWidthsM: shoreTributaryWidthsM } },
    framingAssumption: 'joists and bearers continuous over all shown supports',
    joists,
    joist: joistGoverning.member,
    joistGoverning,
    representativeJoistLineLoadKNM: joistGoverning.lineLoadKNM,
    bearers,
    bearerGoverning,
    shores,
    maximumShoreLoadKN,
    braceMode,
    braceElevationsM,
    braceSuggestion,
    shoreAssessment,
    totalVerticalLoadKN,
    totalShoreReactionKN,
    reactionErrorRatio,
    counts: { joists: joistGrid.positionsM.length, bearers: bearerGrid.positionsM.length, shores: shores.length },
    status: !joistGoverning.member.pass || !bearerGoverning.member.pass || !shoreAssessment.pass ? 'FAIL' : 'SCREENING'
  };
}
