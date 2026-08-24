import { validateWindRoofBayCodePressureRouting } from './windRoofBayCodePressureRouting.js';

export const WIND_ROOF_LOAD_CASE_COMBINATION_SCHEMA = 'futoltech.wind-roof-load-case-combination/1';

const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const STATUS = 'ROOF_WIND_CASES_AND_STRENGTH_COMBINATION_W_CONTRIBUTIONS_RESOLVED_FULL_COMBINATIONS_BLOCKED';
const DIRECTIONS = Object.freeze(['toward-surface', 'away-from-surface']);
const WIND_CASE_IDS = Object.freeze({
  'toward-surface': 'W-CNC-ROOF-TOWARD',
  'away-from-surface': 'W-CNC-ROOF-AWAY'
});
const EPS = 1e-9;

const STRENGTH_TEMPLATES = Object.freeze([
  Object.freeze({
    templateId: 'NSCP-203-3-W',
    parentEquationId: '203-3',
    windFactor: 0.5,
    equationDisplay: '1.2D + 1.6(Lr or R) + 0.5W [wind branch of (f1L or 0.5W)]',
    companionTerms: Object.freeze([
      Object.freeze({ action: 'D', factor: 1.2, required: true }),
      Object.freeze({ action: 'Lr-or-R', factor: 1.6, required: true }),
      Object.freeze({ action: 'L', factor: null, required: false, note: 'This record selects the 0.5W alternative branch rather than f1L.' })
    ]),
    boundary: 'This template represents only the wind-bearing alternative of NSCP 2015 Equation 203-3. The mutually exclusive f1L branch is not simultaneously added.'
  }),
  Object.freeze({
    templateId: 'NSCP-203-4',
    parentEquationId: '203-4',
    windFactor: 1.0,
    equationDisplay: '1.2D + 1.0W + f1L + 0.5(Lr or R)',
    companionTerms: Object.freeze([
      Object.freeze({ action: 'D', factor: 1.2, required: true }),
      Object.freeze({ action: 'L', factor: 'f1', required: true, note: 'f1 remains a separately resolved code/project input.' }),
      Object.freeze({ action: 'Lr-or-R', factor: 0.5, required: true })
    ]),
    boundary: 'The W contribution is resolved here. D, f1L and 0.5(Lr or R) are not evaluated until those actions and f1 are explicitly available.'
  }),
  Object.freeze({
    templateId: 'NSCP-203-6',
    parentEquationId: '203-6',
    windFactor: 1.0,
    equationDisplay: '0.9D + 1.0W + 1.6H',
    companionTerms: Object.freeze([
      Object.freeze({ action: 'D', factor: 0.9, required: true }),
      Object.freeze({ action: 'H', factor: 1.6, required: true })
    ]),
    boundary: 'The W contribution is resolved here. D and H are not assumed zero or otherwise evaluated in this wind-only identity slice.'
  })
]);

const CASE_RULE = 'The verified directional Roof Bay routing records become separate signed W actions. Toward-surface and away-from-surface cases remain independent and retain their complete physical purlin/zone-piece provenance.';
const COMBINATION_RULE = 'NSCP 2015 Section 203.3.1 strength/LRFD wind-bearing combinations are represented as source-backed templates. This slice evaluates only the W contribution by multiplying the already verified signed wind action by the template W factor; companion actions remain unresolved.';
const BOUNDARY = 'This record establishes wind load-case identity and the W contribution to supported NSCP 2015 strength/LRFD combination templates. It does not calculate complete combined demand, resolve D/L/Lr/R/H or f1, implement allowable-stress combinations, replace the manual-uniform Roof Bay UI path, solve piecewise purlin member response, or promote any member/connection capacity.';

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
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }

function routeMap(records) {
  if (!Array.isArray(records) || records.length !== 2) throw new Error('Exactly two Roof Bay routing records are required: toward-surface and away-from-surface.');
  records.forEach(validateWindRoofBayCodePressureRouting);
  const map = new Map();
  for (const record of records) {
    if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) throw new Error('Roof wind load-case identity requires the supported NSCP 2015 C&C routing records.');
    if (!DIRECTIONS.includes(record.designDirection)) throw new Error(`Unsupported routing direction '${record.designDirection}'.`);
    if (map.has(record.designDirection)) throw new Error(`Duplicate routing direction '${record.designDirection}'.`);
    if (record.equilibrium?.pass !== true) throw new Error(`Routing record '${record.designDirection}' must pass its equilibrium gate before load-case promotion.`);
    map.set(record.designDirection, record);
  }
  for (const direction of DIRECTIONS) if (!map.has(direction)) throw new Error(`Missing required routing direction '${direction}'.`);

  const toward = map.get('toward-surface');
  const away = map.get('away-from-surface');
  if (!sameRecord(toward.upstreamWindRoofZoneGeometry, away.upstreamWindRoofZoneGeometry)) throw new Error('Toward/away routing records must use the exact same Roof Bay zone geometry.');
  if (!sameRecord(toward.upstreamWindRoofNetPressureRecords, away.upstreamWindRoofNetPressureRecords)) throw new Error('Toward/away routing records must use the exact same upstream net-pressure record set.');
  if (!sameRecord(toward.geometry, away.geometry)) throw new Error('Toward/away routing records must use the exact same registered Roof Bay geometry.');
  return map;
}

function makeWindCase(route) {
  const caseId = WIND_CASE_IDS[route.designDirection];
  const pieces = route.purlins.flatMap((purlin) => purlin.pieceLoads.map((piece) => ({
    caseId,
    purlinBandLabel: purlin.label,
    zoneCellId: piece.zoneCellId,
    zoneNumber: piece.zoneNumber,
    type: piece.type,
    actualAreaM2: piece.actualAreaM2,
    designPressureKPa: piece.designPressureKPa,
    governingRawCase: clone(piece.governingRawCase),
    normalForceKN: piece.normalForceKN,
    leftRafterReactionKN: piece.leftRafterReactionKN,
    rightRafterReactionKN: piece.rightRafterReactionKN,
    appliedMomentAboutRafterAKNm: piece.appliedMomentAboutRafterAKNm
  })));
  return {
    caseId,
    actionSymbol: 'W',
    actionDefinition: 'load due to wind pressure',
    designDirection: route.designDirection,
    signConvention: route.sourceBasis.signRule,
    upstreamWindRoofBayCodePressureRouting: clone(route),
    total: {
      areaM2: route.appliedWind.areaM2,
      normalForceKN: route.appliedWind.normalKN,
      rafterAReactionKN: route.rafters.a.normalKN,
      rafterBReactionKN: route.rafters.b.normalKN,
      appliedMomentAboutRafterAKNm: route.appliedWind.appliedMomentAboutRafterAKNm
    },
    purlins: route.purlins.map((purlin) => ({
      label: purlin.label,
      stationM: purlin.stationM,
      normalForceKN: purlin.routed.normalForceKN,
      rafterAReactionKN: purlin.routed.leftRafterReactionKN,
      rafterBReactionKN: purlin.routed.rightRafterReactionKN,
      appliedMomentAboutRafterAKNm: purlin.routed.appliedMomentAboutRafterAKNm
    })),
    pieces
  };
}

function scalePiece(piece, factor) {
  return {
    caseId: piece.caseId,
    purlinBandLabel: piece.purlinBandLabel,
    zoneCellId: piece.zoneCellId,
    zoneNumber: piece.zoneNumber,
    type: piece.type,
    actualAreaM2: piece.actualAreaM2,
    governingRawCase: clone(piece.governingRawCase),
    sourceDesignPressureKPa: piece.designPressureKPa,
    combinationWindPressureContributionKPa: factor * piece.designPressureKPa,
    normalForceKN: factor * piece.normalForceKN,
    leftRafterReactionKN: factor * piece.leftRafterReactionKN,
    rightRafterReactionKN: factor * piece.rightRafterReactionKN,
    appliedMomentAboutRafterAKNm: factor * piece.appliedMomentAboutRafterAKNm
  };
}

function makeTemplateCase(template, windCase) {
  const factor = finite(template.windFactor, `${template.templateId}.windFactor`);
  const pieces = windCase.pieces.map((piece) => scalePiece(piece, factor));
  return {
    combinationCaseId: `${template.templateId}__${windCase.caseId}`,
    templateId: template.templateId,
    parentEquationId: template.parentEquationId,
    designMethod: 'strength-lrfd',
    equationDisplay: template.equationDisplay,
    windCaseId: windCase.caseId,
    windDirection: windCase.designDirection,
    windFactor: factor,
    companionTerms: clone(template.companionTerms),
    templateBoundary: template.boundary,
    status: 'WIND_CONTRIBUTION_ONLY_COMPANION_ACTIONS_UNRESOLVED',
    windContribution: {
      normalForceKN: factor * windCase.total.normalForceKN,
      rafterAReactionKN: factor * windCase.total.rafterAReactionKN,
      rafterBReactionKN: factor * windCase.total.rafterBReactionKN,
      appliedMomentAboutRafterAKNm: factor * windCase.total.appliedMomentAboutRafterAKNm,
      purlins: windCase.purlins.map((purlin) => ({
        label: purlin.label,
        normalForceKN: factor * purlin.normalForceKN,
        rafterAReactionKN: factor * purlin.rafterAReactionKN,
        rafterBReactionKN: factor * purlin.rafterBReactionKN,
        appliedMomentAboutRafterAKNm: factor * purlin.appliedMomentAboutRafterAKNm
      })),
      pieces
    },
    fullCombinationResult: null,
    unresolvedCompanionActions: template.companionTerms.filter((item) => item.required).map((item) => item.action)
  };
}

function buildRecord({
  windRoofBayCodePressureRoutingRecords,
  strengthCombinationSourceReference,
  windActionDefinitionSourceReference,
  publicCrossCheckReference = null,
  note = null
} = {}) {
  const routeRecords = clone(windRoofBayCodePressureRoutingRecords);
  const routes = routeMap(routeRecords);
  const windCases = DIRECTIONS.map((direction) => makeWindCase(routes.get(direction)));
  const strengthCombinationCases = STRENGTH_TEMPLATES.flatMap((template) => windCases.map((windCase) => makeTemplateCase(template, windCase)));

  return {
    schemaVersion: WIND_ROOF_LOAD_CASE_COMBINATION_SCHEMA,
    status: STATUS,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: {
      class: 'roof-bay-purlin-system',
      action: 'W',
      designMethodScope: 'strength-lrfd-wind-contribution-only'
    },
    upstreamWindRoofBayCodePressureRoutingRecords: routeRecords,
    windCases,
    strengthCombinationTemplates: clone(STRENGTH_TEMPLATES),
    strengthCombinationCases,
    sourceBasis: {
      windActionDefinitionSourceReference: nonEmpty(windActionDefinitionSourceReference, 'windActionDefinitionSourceReference'),
      strengthCombinationSourceReference: nonEmpty(strengthCombinationSourceReference, 'strengthCombinationSourceReference'),
      publicCrossCheckReference: publicCrossCheckReference == null || String(publicCrossCheckReference).trim() === '' ? null : String(publicCrossCheckReference).trim(),
      codeSection: 'NSCP 2015 Section 203.3.1',
      authorizedCopyReviewRequired: true,
      windActionRule: CASE_RULE,
      strengthCombinationRule: COMBINATION_RULE
    },
    implementation: {
      windLoadCaseIdentityImplemented: true,
      towardAwayCasesPreserved: true,
      strengthCombinationTemplateIdentityImplemented: true,
      strengthCombinationWindContributionImplemented: true,
      completeStrengthCombinationEvaluationImplemented: false,
      allowableStressCombinationTemplatesImplemented: false,
      gravityDeadLiveRoofLiveRainHydroActionsIntegrated: false,
      f1AutomaticallyResolved: false,
      roofBayManualUniformUiReplaced: false,
      codeDerivedRoofBayUiActivated: false,
      piecewisePurlinMemberResponseImplemented: false,
      purlinCapacityPromotionImplemented: false,
      connectionCapacityImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

export function resolveWindRoofLoadCaseCombination(input = {}) {
  const record = buildRecord(input);
  validateWindRoofLoadCaseCombination(record);
  return clone(record);
}

export function validateWindRoofLoadCaseCombination(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof wind load-case/combination record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_LOAD_CASE_COMBINATION_SCHEMA) throw new Error(`Unsupported Roof wind load-case/combination schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof wind load-case/combination status changed.');
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) throw new Error('Roof wind load-case/combination profile/procedure changed.');
  if (record.target?.class !== 'roof-bay-purlin-system' || record.target?.action !== 'W' || record.target?.designMethodScope !== 'strength-lrfd-wind-contribution-only') throw new Error('Roof wind load-case/combination target changed.');
  if (record.sourceBasis?.codeSection !== 'NSCP 2015 Section 203.3.1' || record.sourceBasis?.authorizedCopyReviewRequired !== true) throw new Error('NSCP strength-combination source boundary changed.');
  nonEmpty(record.sourceBasis?.windActionDefinitionSourceReference, 'sourceBasis.windActionDefinitionSourceReference');
  nonEmpty(record.sourceBasis?.strengthCombinationSourceReference, 'sourceBasis.strengthCombinationSourceReference');
  if (record.sourceBasis?.windActionRule !== CASE_RULE || record.sourceBasis?.strengthCombinationRule !== COMBINATION_RULE) throw new Error('Roof wind load-case/combination source rules changed.');
  if (record.boundary !== BOUNDARY) throw new Error('Roof wind load-case/combination engineering boundary changed.');

  const rebuilt = buildRecord({
    windRoofBayCodePressureRoutingRecords: record.upstreamWindRoofBayCodePressureRoutingRecords,
    strengthCombinationSourceReference: record.sourceBasis.strengthCombinationSourceReference,
    windActionDefinitionSourceReference: record.sourceBasis.windActionDefinitionSourceReference,
    publicCrossCheckReference: record.sourceBasis.publicCrossCheckReference,
    note: record.note
  });
  if (!sameRecord(record, rebuilt)) throw new Error('Roof wind load-case/combination record changed from its deterministic routing/source inputs.');

  for (const windCase of record.windCases) {
    const expectedId = WIND_CASE_IDS[windCase.designDirection];
    if (windCase.caseId !== expectedId || windCase.actionSymbol !== 'W') throw new Error('Wind load-case identity changed.');
    if (!nearlyEqual(windCase.total.rafterAReactionKN + windCase.total.rafterBReactionKN, windCase.total.normalForceKN)) throw new Error(`Wind case '${windCase.caseId}' reaction force does not conserve.`);
  }
  for (const combination of record.strengthCombinationCases) {
    if (combination.fullCombinationResult !== null) throw new Error('Full combination result must remain unresolved in this slice.');
    if (combination.status !== 'WIND_CONTRIBUTION_ONLY_COMPANION_ACTIONS_UNRESOLVED') throw new Error('Combination status changed.');
    if (!combination.unresolvedCompanionActions?.length) throw new Error('Companion actions must remain explicit and unresolved.');
  }
  return true;
}

export function serializeWindRoofLoadCaseCombination(record) {
  validateWindRoofLoadCaseCombination(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofLoadCaseCombination(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofLoadCaseCombination(parsed);
  return clone(parsed);
}
