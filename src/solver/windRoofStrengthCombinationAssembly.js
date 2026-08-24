import { validateWindRoofCompanionActions } from './windRoofCompanionActions.js';

export const WIND_ROOF_STRENGTH_COMBINATION_ASSEMBLY_SCHEMA = 'futoltech.wind-roof-strength-combination-assembly/1';

const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const EPS = 1e-9;
const STATUS_BLOCKED = 'ROOF_STRENGTH_COMBINATION_2036_COMPLETE_2033_2034_BLOCKED_LR_OR_R';
const STATUS_LR = 'ROOF_STRENGTH_COMBINATIONS_COMPLETE_FOR_EXPLICIT_LR_PATH_R_NOT_APPLICABLE';
const RESOLUTION_MODES = Object.freeze(['unresolved', 'lr-selected-r-not-applicable']);
const TEMPLATES = Object.freeze([
  Object.freeze({ templateId: 'NSCP-203-3-W', deadFactor: 1.2, windFactor: 0.5, variableFactor: 1.6, requiresLrOrR: true, equationDisplay: '1.2D + 1.6(Lr or R) + 0.5W [wind branch of (f1L or 0.5W)]' }),
  Object.freeze({ templateId: 'NSCP-203-4', deadFactor: 1.2, windFactor: 1.0, variableFactor: 0.5, requiresLrOrR: true, equationDisplay: '1.2D + 1.0W + f1L + 0.5(Lr or R)' }),
  Object.freeze({ templateId: 'NSCP-203-6', deadFactor: 0.9, windFactor: 1.0, variableFactor: 0.0, requiresLrOrR: false, equationDisplay: '0.9D + 1.0W + 1.6H' })
]);

const ASSEMBLY_RULE = 'Strength-combination factors act only on accepted structural actions downstream of pressure/load physics. D includes its explicitly separated purlin self-weight. W remains a signed toward/away action. L and H remain their accepted target-specific zero decisions. The Lr-or-R term is never guessed: unresolved R blocks the parent 203-3/203-4 result unless an explicit engineer-sourced project decision states that R is not applicable and selects the accepted Lr path.';
const ALTERNATIVE_RULE = 'The supported current bridge does not calculate rain R and does not automatically choose a governing Lr-or-R alternative. A future nonzero R implementation must evaluate the source-backed alternatives without collapsing their case identity before governing selection.';
const PUBLIC_CROSSCHECK_NOTE = 'Public Philippine government structural documents are not perfectly consistent in their transcription of Equation 203-3: multiple DPWH plan sets show 1.6(Lr or R), while one BIR calculation shows 1.6(Lr + R). This implementation follows the existing source contract and multiple DPWH cross-checks, while requiring verification against an authorized NSCP 2015 copy before project use.';
const BOUNDARY = 'This record assembles the supported NSCP 2015 strength/LRFD roof-purlin wind combinations from already accepted D/L/Lr/W/L/H actions. It does not calculate rain R, infer R=0, auto-select a governing Lr-or-R alternative, activate the code-derived Roof Bay UI, solve piecewise member stress/deflection, or promote purlin/connection capacity.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function zeroIfTiny(value) { return Math.abs(value) < 1e-15 ? 0 : value; }

function normalizeResolution(value, companion) {
  const mode = value?.mode == null ? 'unresolved' : String(value.mode).trim().toLowerCase();
  if (!RESOLUTION_MODES.includes(mode)) throw new Error(`lrOrRResolution.mode must be one of ${RESOLUTION_MODES.join(', ')}.`);
  if (mode === 'unresolved') {
    return {
      mode,
      engineerConfirmedRainNotApplicable: false,
      decisionSourceReference: companion.actions.R.decisionSourceReference,
      rationale: 'Rain action R remains unresolved; 203-3/203-4 parent combinations stay blocked rather than assuming Lr governs or R=0.'
    };
  }
  if (value?.engineerConfirmedRainNotApplicable !== true) {
    throw new Error('lr-selected-r-not-applicable requires engineerConfirmedRainNotApplicable=true.');
  }
  return {
    mode,
    engineerConfirmedRainNotApplicable: true,
    decisionSourceReference: nonEmpty(value?.decisionSourceReference, 'lrOrRResolution.decisionSourceReference'),
    rationale: nonEmpty(value?.rationale, 'lrOrRResolution.rationale')
  };
}

function windCases(companion) {
  const upstream = companion.upstreamWindRoofLoadCaseCombination;
  const cases = upstream.windCases;
  if (!Array.isArray(cases) || cases.length !== 2) throw new Error('Strength assembly requires exactly two signed W cases.');
  const toward = cases.find((item) => item.designDirection === 'toward-surface');
  const away = cases.find((item) => item.designDirection === 'away-from-surface');
  if (!toward || !away) throw new Error('Strength assembly requires both toward-surface and away-from-surface W cases.');
  return [toward, away];
}

function pieceKey(item) { return `${item.purlinBandLabel}::${item.zoneCellId}`; }
function mapByPiece(items, label) {
  const map = new Map();
  for (const item of items) {
    const key = pieceKey(item);
    if (map.has(key)) throw new Error(`${label} contains duplicate physical piece '${key}'.`);
    map.set(key, item);
  }
  return map;
}
function mapByPurlin(items, label) {
  const map = new Map();
  for (const item of items) {
    if (map.has(item.label)) throw new Error(`${label} contains duplicate purlin '${item.label}'.`);
    map.set(item.label, item);
  }
  return map;
}

function scaledGravityPiece(piece, factor) {
  return {
    normalForceKN: factor * piece.normalForceKN,
    parallelForceKN: factor * piece.parallelForceKN,
    rafterANormalKN: factor * piece.rafterANormalKN,
    rafterBNormalKN: factor * piece.rafterBNormalKN,
    rafterAParallelKN: factor * piece.rafterAParallelKN,
    rafterBParallelKN: factor * piece.rafterBParallelKN,
    normalMomentAboutRafterAKNm: factor * piece.normalMomentAboutRafterAKNm,
    parallelMomentAboutRafterAKNm: factor * piece.parallelMomentAboutRafterAKNm
  };
}

function scaledWindPiece(piece, factor) {
  return {
    normalForceKN: factor * piece.normalForceKN,
    parallelForceKN: 0,
    rafterANormalKN: factor * piece.leftRafterReactionKN,
    rafterBNormalKN: factor * piece.rightRafterReactionKN,
    rafterAParallelKN: 0,
    rafterBParallelKN: 0,
    normalMomentAboutRafterAKNm: factor * piece.appliedMomentAboutRafterAKNm,
    parallelMomentAboutRafterAKNm: 0
  };
}

function sumEffects(...effects) {
  const fields = ['normalForceKN', 'parallelForceKN', 'rafterANormalKN', 'rafterBNormalKN', 'rafterAParallelKN', 'rafterBParallelKN', 'normalMomentAboutRafterAKNm', 'parallelMomentAboutRafterAKNm'];
  return Object.fromEntries(fields.map((field) => [field, zeroIfTiny(effects.reduce((sum, effect) => sum + Number(effect?.[field] ?? 0), 0))]));
}

function buildAreaPieces(companion, windCase, template, variableAction) {
  const deadPieces = mapByPiece(companion.actions.D.pieces, 'D');
  const variablePieces = variableAction ? mapByPiece(variableAction.pieces, variableAction.actionSymbol) : new Map();
  const windPieces = mapByPiece(windCase.pieces, windCase.caseId);
  if (deadPieces.size !== windPieces.size || (variableAction && variablePieces.size !== deadPieces.size)) {
    throw new Error('D/Lr/W physical piece counts must remain identical for strength assembly.');
  }
  return companion.actions.D.pieces.map((deadPiece) => {
    const key = pieceKey(deadPiece);
    const windPiece = windPieces.get(key);
    const variablePiece = variableAction ? variablePieces.get(key) : null;
    if (!windPiece || (variableAction && !variablePiece)) throw new Error(`Missing physical piece '${key}' in strength-combination action set.`);
    if (!nearlyEqual(deadPiece.actualAreaM2, windPiece.actualAreaM2) || (variablePiece && !nearlyEqual(deadPiece.actualAreaM2, variablePiece.actualAreaM2))) {
      throw new Error(`Physical piece area mismatch for '${key}'.`);
    }
    const d = scaledGravityPiece(deadPiece, template.deadFactor);
    const v = variablePiece ? scaledGravityPiece(variablePiece, template.variableFactor) : sumEffects();
    const w = scaledWindPiece(windPiece, template.windFactor);
    const combined = sumEffects(d, v, w);
    return {
      purlinBandLabel: deadPiece.purlinBandLabel,
      zoneCellId: deadPiece.zoneCellId,
      zoneNumber: deadPiece.zoneNumber,
      type: deadPiece.type,
      actualAreaM2: deadPiece.actualAreaM2,
      localSpanRangeM: clone(deadPiece.localSpanRangeM),
      spanwiseCentroidM: deadPiece.spanwiseCentroidM,
      windCaseId: windCase.caseId,
      governingWindRawCase: clone(windPiece.governingRawCase),
      contributions: {
        D: { factor: template.deadFactor, ...d },
        variable: variablePiece ? { actionSymbol: variableAction.actionSymbol, factor: template.variableFactor, ...v } : null,
        W: { factor: template.windFactor, ...w }
      },
      combined
    };
  });
}

function gravityPurlinEffect(item, factor, useCombined = false) {
  const source = useCombined ? item.combined : item;
  return {
    normalForceKN: factor * source.normalForceKN,
    parallelForceKN: factor * source.parallelForceKN,
    rafterANormalKN: factor * source.rafterANormalKN,
    rafterBNormalKN: factor * source.rafterBNormalKN,
    rafterAParallelKN: factor * source.rafterAParallelKN,
    rafterBParallelKN: factor * source.rafterBParallelKN
  };
}
function windPurlinEffect(item, factor) {
  return {
    normalForceKN: factor * item.normalForceKN,
    parallelForceKN: 0,
    rafterANormalKN: factor * item.rafterAReactionKN,
    rafterBNormalKN: factor * item.rafterBReactionKN,
    rafterAParallelKN: 0,
    rafterBParallelKN: 0
  };
}
function sumPurlinEffects(...effects) {
  const fields = ['normalForceKN', 'parallelForceKN', 'rafterANormalKN', 'rafterBNormalKN', 'rafterAParallelKN', 'rafterBParallelKN'];
  return Object.fromEntries(fields.map((field) => [field, zeroIfTiny(effects.reduce((sum, effect) => sum + Number(effect?.[field] ?? 0), 0))]));
}

function buildPurlins(companion, windCase, template, variableAction) {
  const deadMap = mapByPurlin(companion.actions.D.purlins, 'D purlins');
  const variableMap = variableAction ? mapByPurlin(variableAction.purlins, `${variableAction.actionSymbol} purlins`) : new Map();
  const windMap = mapByPurlin(windCase.purlins, `${windCase.caseId} purlins`);
  return companion.geometry.purlinLabels.map((label) => {
    const dead = deadMap.get(label);
    const wind = windMap.get(label);
    const variable = variableAction ? variableMap.get(label) : null;
    if (!dead || !wind || (variableAction && !variable)) throw new Error(`Missing purlin '${label}' in strength-combination action set.`);
    const d = gravityPurlinEffect(dead, template.deadFactor, true);
    const v = variable ? gravityPurlinEffect(variable, template.variableFactor, false) : sumPurlinEffects();
    const w = windPurlinEffect(wind, template.windFactor);
    const combined = sumPurlinEffects(d, v, w);
    return {
      label,
      stationM: dead.stationM,
      windCaseId: windCase.caseId,
      contributions: {
        D: { factor: template.deadFactor, includesPurlinSelfWeight: true, ...d },
        variable: variable ? { actionSymbol: variableAction.actionSymbol, factor: template.variableFactor, ...v } : null,
        W: { factor: template.windFactor, ...w }
      },
      purlinSelfWeightTrace: {
        sourceReference: dead.purlinSelfWeight.sourceReference,
        sourceLineLoadKNM: dead.purlinSelfWeight.lineLoadKNM,
        deadFactor: template.deadFactor,
        factoredNormalForceKN: template.deadFactor * dead.purlinSelfWeight.normalForceKN,
        factoredParallelForceKN: template.deadFactor * dead.purlinSelfWeight.parallelForceKN
      },
      combined
    };
  });
}

function actionTotalEffect(action, factor) {
  return {
    normalForceKN: factor * action.total.normalForceKN,
    parallelForceKN: factor * action.total.parallelForceKN,
    rafterANormalKN: factor * action.total.rafterANormalKN,
    rafterBNormalKN: factor * action.total.rafterBNormalKN,
    rafterAParallelKN: factor * action.total.rafterAParallelKN,
    rafterBParallelKN: factor * action.total.rafterBParallelKN
  };
}
function windTotalEffect(windCase, factor) {
  return {
    normalForceKN: factor * windCase.total.normalForceKN,
    parallelForceKN: 0,
    rafterANormalKN: factor * windCase.total.rafterAReactionKN,
    rafterBNormalKN: factor * windCase.total.rafterBReactionKN,
    rafterAParallelKN: 0,
    rafterBParallelKN: 0
  };
}

function totalMoments(companion, windCase, template, areaPieces) {
  const spanM = Number(companion.geometry.baySpanM);
  const deadSelfWeightNormalMoment = companion.actions.D.purlins.reduce((sum, item) => sum + template.deadFactor * item.purlinSelfWeight.normalForceKN * spanM / 2, 0);
  const deadSelfWeightParallelMoment = companion.actions.D.purlins.reduce((sum, item) => sum + template.deadFactor * item.purlinSelfWeight.parallelForceKN * spanM / 2, 0);
  return {
    normalMomentAboutRafterAKNm: zeroIfTiny(areaPieces.reduce((sum, item) => sum + item.combined.normalMomentAboutRafterAKNm, 0) + deadSelfWeightNormalMoment),
    parallelMomentAboutRafterAKNm: zeroIfTiny(areaPieces.reduce((sum, item) => sum + item.combined.parallelMomentAboutRafterAKNm, 0) + deadSelfWeightParallelMoment),
    deadSelfWeightNormalMomentAboutRafterAKNm: deadSelfWeightNormalMoment,
    deadSelfWeightParallelMomentAboutRafterAKNm: deadSelfWeightParallelMoment,
    windSourceMomentAboutRafterAKNm: template.windFactor * windCase.total.appliedMomentAboutRafterAKNm
  };
}

function completeCase(companion, windCase, template, variableAction) {
  const areaPieces = buildAreaPieces(companion, windCase, template, variableAction);
  const purlins = buildPurlins(companion, windCase, template, variableAction);
  const d = actionTotalEffect(companion.actions.D, template.deadFactor);
  const v = variableAction ? actionTotalEffect(variableAction, template.variableFactor) : sumPurlinEffects();
  const w = windTotalEffect(windCase, template.windFactor);
  const total = sumPurlinEffects(d, v, w);
  const purlinTotal = purlins.reduce((sum, item) => sumPurlinEffects(sum, item.combined), sumPurlinEffects());
  const moments = totalMoments(companion, windCase, template, areaPieces);
  const spanM = Number(companion.geometry.baySpanM);
  const normalForceResidualKN = total.rafterANormalKN + total.rafterBNormalKN - total.normalForceKN;
  const parallelForceResidualKN = total.rafterAParallelKN + total.rafterBParallelKN - total.parallelForceKN;
  const normalMomentResidualKNm = total.rafterBNormalKN * spanM - moments.normalMomentAboutRafterAKNm;
  const parallelMomentResidualKNm = total.rafterBParallelKN * spanM - moments.parallelMomentAboutRafterAKNm;
  const purlinNormalResidualKN = purlinTotal.normalForceKN - total.normalForceKN;
  const purlinParallelResidualKN = purlinTotal.parallelForceKN - total.parallelForceKN;
  const equilibrium = {
    tolerance: EPS,
    normalForceResidualKN: zeroIfTiny(normalForceResidualKN),
    parallelForceResidualKN: zeroIfTiny(parallelForceResidualKN),
    normalMomentResidualKNm: zeroIfTiny(normalMomentResidualKNm),
    parallelMomentResidualKNm: zeroIfTiny(parallelMomentResidualKNm),
    purlinNormalResidualKN: zeroIfTiny(purlinNormalResidualKN),
    purlinParallelResidualKN: zeroIfTiny(purlinParallelResidualKN),
    pass: [normalForceResidualKN, parallelForceResidualKN, normalMomentResidualKNm, parallelMomentResidualKNm, purlinNormalResidualKN, purlinParallelResidualKN].every((value) => Math.abs(value) <= EPS)
  };
  if (!equilibrium.pass) throw new Error(`${template.templateId}/${windCase.caseId} failed strength-combination force/moment conservation.`);
  return {
    combinationCaseId: `${template.templateId}__${windCase.caseId}__${variableAction ? variableAction.actionSymbol : 'NO-LR-R'}`,
    templateId: template.templateId,
    equationDisplay: template.equationDisplay,
    windCaseId: windCase.caseId,
    windDirection: windCase.designDirection,
    status: 'COMPLETE_STRENGTH_COMBINATION_ACTION_RESULT',
    selectedLrOrRAction: variableAction?.actionSymbol ?? null,
    factors: {
      D: template.deadFactor,
      W: template.windFactor,
      L: template.templateId === 'NSCP-203-4' ? 'f1 x 0 = 0' : null,
      LrOrR: variableAction ? template.variableFactor : null,
      H: template.templateId === 'NSCP-203-6' ? '1.6 x 0 = 0' : null
    },
    areaPieces,
    purlins,
    total: { ...total, ...moments },
    equilibrium,
    fullCombinationResult: {
      roofNormalForceKN: total.normalForceKN,
      roofDownslopeForceKN: total.parallelForceKN,
      rafterANormalReactionKN: total.rafterANormalKN,
      rafterBNormalReactionKN: total.rafterBNormalKN,
      rafterAParallelReactionKN: total.rafterAParallelKN,
      rafterBParallelReactionKN: total.rafterBParallelKN,
      normalMomentAboutRafterAKNm: moments.normalMomentAboutRafterAKNm,
      parallelMomentAboutRafterAKNm: moments.parallelMomentAboutRafterAKNm
    },
    unresolved: []
  };
}

function blockedCase(windCase, template) {
  return {
    combinationCaseId: `${template.templateId}__${windCase.caseId}__BLOCKED-LR-OR-R`,
    templateId: template.templateId,
    equationDisplay: template.equationDisplay,
    windCaseId: windCase.caseId,
    windDirection: windCase.designDirection,
    status: 'BLOCKED_LR_OR_R_DECISION_UNRESOLVED',
    selectedLrOrRAction: null,
    factors: { D: template.deadFactor, W: template.windFactor, LrOrR: template.variableFactor },
    areaPieces: null,
    purlins: null,
    total: null,
    equilibrium: null,
    fullCombinationResult: null,
    unresolved: ['R action/applicability and Lr-or-R alternative resolution']
  };
}

function buildRecord({
  windRoofCompanionActions,
  lrOrRResolution = { mode: 'unresolved' },
  strengthCombinationAssemblySourceReference,
  publicCrossCheckReference = null,
  note = null
} = {}) {
  const companion = clone(windRoofCompanionActions);
  validateWindRoofCompanionActions(companion);
  if (companion.adoptedCodeProfileId !== CODE_PROFILE || companion.designProcedure !== PROCEDURE) {
    throw new Error('Strength assembly requires the supported NSCP 2015 roof-purlin companion-action record.');
  }
  const resolution = normalizeResolution(lrOrRResolution, companion);
  const cases = [];
  for (const template of TEMPLATES) {
    for (const windCase of windCases(companion)) {
      if (template.requiresLrOrR && resolution.mode === 'unresolved') {
        cases.push(blockedCase(windCase, template));
      } else {
        const variableAction = template.requiresLrOrR ? companion.actions.Lr : null;
        cases.push(completeCase(companion, windCase, template, variableAction));
      }
    }
  }
  const completeCases = cases.filter((item) => item.fullCombinationResult != null);
  const blockedCases = cases.filter((item) => item.fullCombinationResult == null);
  const expectedStatus = resolution.mode === 'unresolved' ? STATUS_BLOCKED : STATUS_LR;
  return {
    schemaVersion: WIND_ROOF_STRENGTH_COMBINATION_ASSEMBLY_SCHEMA,
    status: expectedStatus,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: {
      class: 'roof-bay-purlin-system',
      designMethodScope: 'strength-lrfd-action-result-assembly'
    },
    upstreamWindRoofCompanionActions: companion,
    lrOrRResolution: resolution,
    templates: clone(TEMPLATES),
    cases,
    summary: {
      totalCaseCount: cases.length,
      completeCaseCount: completeCases.length,
      blockedCaseCount: blockedCases.length,
      completeCaseIds: completeCases.map((item) => item.combinationCaseId),
      blockedCaseIds: blockedCases.map((item) => item.combinationCaseId)
    },
    sourceBasis: {
      strengthCombinationAssemblySourceReference: nonEmpty(strengthCombinationAssemblySourceReference, 'strengthCombinationAssemblySourceReference'),
      publicCrossCheckReference: publicCrossCheckReference == null || String(publicCrossCheckReference).trim() === '' ? null : String(publicCrossCheckReference).trim(),
      codeSection: 'NSCP 2015 Section 203.3.1',
      authorizedCopyReviewRequired: true,
      assemblyRule: ASSEMBLY_RULE,
      alternativeRule: ALTERNATIVE_RULE,
      publicCrossCheckConflictNote: PUBLIC_CROSSCHECK_NOTE
    },
    implementation: {
      strengthCombinationActionAssemblyImplemented: true,
      signedTowardAwayWindCasesPreserved: true,
      deadPurlinSelfWeightRetainedInsideD: true,
      complete2036Implemented: true,
      lrAlternative2033And2034Implemented: resolution.mode === 'lr-selected-r-not-applicable',
      rainActionImplemented: false,
      automaticGoverningLrOrRSelectionImplemented: false,
      codeDerivedRoofBayUiActivated: false,
      piecewisePurlinMemberResponseImplemented: false,
      purlinCapacityPromotionImplemented: false,
      connectionCapacityImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    windRoofCompanionActions: record.upstreamWindRoofCompanionActions,
    lrOrRResolution: record.lrOrRResolution,
    strengthCombinationAssemblySourceReference: record.sourceBasis.strengthCombinationAssemblySourceReference,
    publicCrossCheckReference: record.sourceBasis.publicCrossCheckReference,
    note: record.note
  };
}

export function resolveWindRoofStrengthCombinationAssembly(input = {}) {
  const record = buildRecord(input);
  validateWindRoofStrengthCombinationAssembly(record);
  return clone(record);
}

export function validateWindRoofStrengthCombinationAssembly(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof strength-combination assembly record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_STRENGTH_COMBINATION_ASSEMBLY_SCHEMA) throw new Error(`Unsupported roof strength-combination assembly schema '${record.schemaVersion}'.`);
  validateWindRoofCompanionActions(record.upstreamWindRoofCompanionActions);
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) throw new Error('Roof strength-combination assembly profile/procedure changed.');
  if (record.target?.class !== 'roof-bay-purlin-system' || record.target?.designMethodScope !== 'strength-lrfd-action-result-assembly') throw new Error('Roof strength-combination assembly target changed.');
  if (record.sourceBasis?.codeSection !== 'NSCP 2015 Section 203.3.1' || record.sourceBasis?.authorizedCopyReviewRequired !== true) throw new Error('Roof strength-combination source boundary changed.');
  if (record.sourceBasis?.assemblyRule !== ASSEMBLY_RULE || record.sourceBasis?.alternativeRule !== ALTERNATIVE_RULE || record.sourceBasis?.publicCrossCheckConflictNote !== PUBLIC_CROSSCHECK_NOTE) throw new Error('Roof strength-combination source/alternative rules changed.');
  nonEmpty(record.sourceBasis?.strengthCombinationAssemblySourceReference, 'sourceBasis.strengthCombinationAssemblySourceReference');
  if (record.boundary !== BOUNDARY) throw new Error('Roof strength-combination engineering boundary changed.');
  if (!Array.isArray(record.cases) || record.cases.length !== 6) throw new Error('Roof strength-combination assembly must preserve six template/direction cases.');
  const mode = record.lrOrRResolution?.mode;
  const expectedStatus = mode === 'unresolved' ? STATUS_BLOCKED : mode === 'lr-selected-r-not-applicable' ? STATUS_LR : null;
  if (!expectedStatus || record.status !== expectedStatus) throw new Error('Roof strength-combination status changed from the Lr-or-R resolution state.');
  if (mode === 'unresolved') {
    if (record.summary?.completeCaseCount !== 2 || record.summary?.blockedCaseCount !== 4) throw new Error('Unresolved Lr-or-R state must leave only the two 203-6 wind-direction cases complete.');
  } else {
    if (record.summary?.completeCaseCount !== 6 || record.summary?.blockedCaseCount !== 0) throw new Error('Explicit Lr/R-not-applicable state must complete all six supported cases.');
  }
  for (const item of record.cases) {
    if (item.fullCombinationResult != null && item.equilibrium?.pass !== true) throw new Error(`Completed case '${item.combinationCaseId}' must pass equilibrium.`);
    if (item.fullCombinationResult == null && item.status !== 'BLOCKED_LR_OR_R_DECISION_UNRESOLVED') throw new Error(`Blocked case '${item.combinationCaseId}' has an invalid status.`);
  }
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof strength-combination assembly record changed from its deterministic public upstream/decision/source state.');
  return true;
}

export function serializeWindRoofStrengthCombinationAssembly(record) {
  validateWindRoofStrengthCombinationAssembly(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofStrengthCombinationAssembly(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofStrengthCombinationAssembly(parsed);
  return clone(parsed);
}
