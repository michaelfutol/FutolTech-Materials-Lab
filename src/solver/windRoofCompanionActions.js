import { validateWindRoofLoadCaseCombination } from './windRoofLoadCaseCombination.js';

export const WIND_ROOF_COMPANION_ACTIONS_SCHEMA = 'futoltech.wind-roof-companion-actions/1';

const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const STATUS = 'ROOF_COMPANION_ACTIONS_D_LR_ROUTED_L_H_ZERO_R_UNRESOLVED_FULL_COMBINATIONS_BLOCKED';
const EPS = 1e-9;
const ACTION_RULE = 'For the current roof-purlin target, D and Lr are accepted as explicit vertical gravity actions and routed through the exact same physical Roof Bay geometry used by W. D may include separately sourced purlin self-weight line loads. L is not roof live load; H is lateral soil/water pressure. L and H may therefore be carried only as explicit target-specific zero/not-applicable decisions in this slice. R remains unresolved until an actual rain action is supplied.';
const GEOMETRY_RULE = 'Uniform roof-area companion actions are partitioned over the same physical Roof Bay rectangles used by the verified code-wind route. Their vertical forces are resolved into roof-normal and roof-downslope components using the accepted roof slope. Purlin self-weight remains a distinct uniform line action and is not double-counted as roof-area pressure.';
const BOUNDARY = 'This record accepts and physically routes the current companion structural actions for the roof-purlin target. It does not assemble a complete NSCP strength combination, select the governing Lr-versus-R alternative, calculate rain load, infer ordinary floor live load on the roof, infer lateral soil/water pressure on the roof, replace the manual-uniform Roof Bay UI path, solve piecewise purlin response, or promote member/connection capacity.';

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
function finiteNonnegative(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be a finite number >= 0.`);
  return number;
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }

function routeAndGeometry(record) {
  validateWindRoofLoadCaseCombination(record);
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) {
    throw new Error('Roof companion actions require the supported NSCP 2015 roof-purlin C&C wind action record.');
  }
  const toward = record.windCases.find((item) => item.designDirection === 'toward-surface');
  const away = record.windCases.find((item) => item.designDirection === 'away-from-surface');
  if (!toward || !away) throw new Error('Roof companion actions require both toward-surface and away-from-surface W cases.');
  const route = toward.upstreamWindRoofBayCodePressureRouting;
  const otherRoute = away.upstreamWindRoofBayCodePressureRouting;
  if (!sameRecord(route.upstreamWindRoofZoneGeometry, otherRoute.upstreamWindRoofZoneGeometry) || !sameRecord(route.geometry, otherRoute.geometry)) {
    throw new Error('Toward/away W cases must share the exact same Roof Bay geometry before companion actions can be attached.');
  }
  return { route, zones: route.upstreamWindRoofZoneGeometry };
}

function normalizeSelfWeightEntries(entries, labels) {
  if (!Array.isArray(entries) || entries.length !== labels.length) {
    throw new Error('purlinSelfWeightLineLoads must contain exactly one entry for every physical purlin band.');
  }
  const map = new Map();
  for (const [index, item] of entries.entries()) {
    const label = nonEmpty(item?.label, `purlinSelfWeightLineLoads[${index}].label`);
    if (!labels.includes(label)) throw new Error(`Unknown purlinSelfWeightLineLoads label '${label}'.`);
    if (map.has(label)) throw new Error(`Duplicate purlin self-weight entry for '${label}'.`);
    map.set(label, {
      label,
      lineLoadKNM: finiteNonnegative(item?.lineLoadKNM, `purlinSelfWeightLineLoads[${index}].lineLoadKNM`),
      sourceReference: nonEmpty(item?.sourceReference, `purlinSelfWeightLineLoads[${index}].sourceReference`)
    });
  }
  const missing = labels.filter((label) => !map.has(label));
  if (missing.length) throw new Error(`Missing purlin self-weight entries for: ${missing.join(', ')}.`);
  return map;
}

function pieceGravityEffect(piece, pressureKPa, cosTheta, sinTheta, spanM) {
  const verticalForceKN = pressureKPa * piece.actualAreaM2;
  const normalForceKN = verticalForceKN * cosTheta;
  const parallelForceKN = verticalForceKN * sinTheta;
  const centroidM = Number(piece.spanwiseCentroidM);
  const rafterANormalKN = normalForceKN * (spanM - centroidM) / spanM;
  const rafterBNormalKN = normalForceKN * centroidM / spanM;
  const rafterAParallelKN = parallelForceKN * (spanM - centroidM) / spanM;
  const rafterBParallelKN = parallelForceKN * centroidM / spanM;
  return {
    purlinBandLabel: piece.purlinBandLabel,
    zoneCellId: piece.zoneCellId,
    zoneNumber: piece.zoneNumber,
    type: piece.type,
    actualAreaM2: piece.actualAreaM2,
    localSpanRangeM: clone(piece.localSpanRangeM),
    spanwiseCentroidM: centroidM,
    verticalPressureKPa: pressureKPa,
    verticalForceKN,
    normalForceKN,
    parallelForceKN,
    rafterANormalKN,
    rafterBNormalKN,
    rafterAParallelKN,
    rafterBParallelKN,
    normalMomentAboutRafterAKNm: normalForceKN * centroidM,
    parallelMomentAboutRafterAKNm: parallelForceKN * centroidM
  };
}

function areaAction({ symbol, definition, pressureKPa, sourceReference, route, cosTheta, sinTheta }) {
  const spanM = Number(route.geometry.spanM);
  const pieces = route.purlins.flatMap((purlin) => purlin.pieceLoads.map((piece) => pieceGravityEffect({
    ...piece,
    purlinBandLabel: purlin.label
  }, pressureKPa, cosTheta, sinTheta, spanM)));
  const purlins = route.purlins.map((purlin) => {
    const local = pieces.filter((piece) => piece.purlinBandLabel === purlin.label);
    return {
      label: purlin.label,
      stationM: purlin.stationM,
      areaM2: local.reduce((sum, item) => sum + item.actualAreaM2, 0),
      verticalForceKN: local.reduce((sum, item) => sum + item.verticalForceKN, 0),
      normalForceKN: local.reduce((sum, item) => sum + item.normalForceKN, 0),
      parallelForceKN: local.reduce((sum, item) => sum + item.parallelForceKN, 0),
      rafterANormalKN: local.reduce((sum, item) => sum + item.rafterANormalKN, 0),
      rafterBNormalKN: local.reduce((sum, item) => sum + item.rafterBNormalKN, 0),
      rafterAParallelKN: local.reduce((sum, item) => sum + item.rafterAParallelKN, 0),
      rafterBParallelKN: local.reduce((sum, item) => sum + item.rafterBParallelKN, 0)
    };
  });
  return {
    actionSymbol: symbol,
    actionDefinition: definition,
    status: 'ACCEPTED_AND_ROUTED',
    verticalRoofAreaPressureKPa: pressureKPa,
    sourceReference,
    pieces,
    purlins,
    total: {
      areaM2: pieces.reduce((sum, item) => sum + item.actualAreaM2, 0),
      verticalForceKN: pieces.reduce((sum, item) => sum + item.verticalForceKN, 0),
      normalForceKN: pieces.reduce((sum, item) => sum + item.normalForceKN, 0),
      parallelForceKN: pieces.reduce((sum, item) => sum + item.parallelForceKN, 0),
      rafterANormalKN: pieces.reduce((sum, item) => sum + item.rafterANormalKN, 0),
      rafterBNormalKN: pieces.reduce((sum, item) => sum + item.rafterBNormalKN, 0),
      rafterAParallelKN: pieces.reduce((sum, item) => sum + item.rafterAParallelKN, 0),
      rafterBParallelKN: pieces.reduce((sum, item) => sum + item.rafterBParallelKN, 0)
    }
  };
}

function addDeadSelfWeight(areaDead, selfWeightMap, route, cosTheta, sinTheta) {
  const spanM = Number(route.geometry.spanM);
  const purlins = areaDead.purlins.map((purlin) => {
    const sw = selfWeightMap.get(purlin.label);
    const verticalSelfWeightKN = sw.lineLoadKNM * spanM;
    const normalSelfWeightKN = verticalSelfWeightKN * cosTheta;
    const parallelSelfWeightKN = verticalSelfWeightKN * sinTheta;
    return {
      ...purlin,
      purlinSelfWeight: {
        lineLoadKNM: sw.lineLoadKNM,
        sourceReference: sw.sourceReference,
        verticalForceKN: verticalSelfWeightKN,
        normalForceKN: normalSelfWeightKN,
        parallelForceKN: parallelSelfWeightKN,
        rafterANormalKN: normalSelfWeightKN / 2,
        rafterBNormalKN: normalSelfWeightKN / 2,
        rafterAParallelKN: parallelSelfWeightKN / 2,
        rafterBParallelKN: parallelSelfWeightKN / 2
      },
      combined: {
        verticalForceKN: purlin.verticalForceKN + verticalSelfWeightKN,
        normalForceKN: purlin.normalForceKN + normalSelfWeightKN,
        parallelForceKN: purlin.parallelForceKN + parallelSelfWeightKN,
        rafterANormalKN: purlin.rafterANormalKN + normalSelfWeightKN / 2,
        rafterBNormalKN: purlin.rafterBNormalKN + normalSelfWeightKN / 2,
        rafterAParallelKN: purlin.rafterAParallelKN + parallelSelfWeightKN / 2,
        rafterBParallelKN: purlin.rafterBParallelKN + parallelSelfWeightKN / 2
      }
    };
  });
  const selfWeightVerticalKN = purlins.reduce((sum, item) => sum + item.purlinSelfWeight.verticalForceKN, 0);
  const selfWeightNormalKN = purlins.reduce((sum, item) => sum + item.purlinSelfWeight.normalForceKN, 0);
  const selfWeightParallelKN = purlins.reduce((sum, item) => sum + item.purlinSelfWeight.parallelForceKN, 0);
  return {
    ...areaDead,
    purlins,
    purlinSelfWeightTotal: {
      verticalForceKN: selfWeightVerticalKN,
      normalForceKN: selfWeightNormalKN,
      parallelForceKN: selfWeightParallelKN
    },
    total: {
      ...areaDead.total,
      verticalForceKN: areaDead.total.verticalForceKN + selfWeightVerticalKN,
      normalForceKN: areaDead.total.normalForceKN + selfWeightNormalKN,
      parallelForceKN: areaDead.total.parallelForceKN + selfWeightParallelKN,
      rafterANormalKN: purlins.reduce((sum, item) => sum + item.combined.rafterANormalKN, 0),
      rafterBNormalKN: purlins.reduce((sum, item) => sum + item.combined.rafterBNormalKN, 0),
      rafterAParallelKN: purlins.reduce((sum, item) => sum + item.combined.rafterAParallelKN, 0),
      rafterBParallelKN: purlins.reduce((sum, item) => sum + item.combined.rafterBParallelKN, 0)
    }
  };
}

function zeroAction(symbol, definition, decisionSourceReference) {
  return {
    actionSymbol: symbol,
    actionDefinition: definition,
    status: 'TARGET_SPECIFIC_NOT_APPLICABLE_ZERO',
    decisionSourceReference: nonEmpty(decisionSourceReference, `${symbol}.decisionSourceReference`),
    total: {
      verticalForceKN: 0,
      normalForceKN: 0,
      parallelForceKN: 0,
      rafterANormalKN: 0,
      rafterBNormalKN: 0,
      rafterAParallelKN: 0,
      rafterBParallelKN: 0
    }
  };
}

function buildRecord({
  windRoofLoadCaseCombination,
  codeLoadDefinitionsSourceReference,
  roofDeadLoadKPa,
  roofDeadLoadSourceReference,
  purlinSelfWeightLineLoads,
  roofLiveLoadKPa,
  roofLiveLoadSourceReference,
  ordinaryLiveLoadZeroDecisionSourceReference,
  hydrostaticSoilZeroDecisionSourceReference,
  rainActionDecisionSourceReference,
  note = null
} = {}) {
  const upstream = clone(windRoofLoadCaseCombination);
  const { route, zones } = routeAndGeometry(upstream);
  const slopeDeg = Number(zones.applicability?.roofSlopeDeg);
  const theta = slopeDeg * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const labels = route.purlins.map((item) => item.label);
  const selfWeightMap = normalizeSelfWeightEntries(clone(purlinSelfWeightLineLoads), labels);
  const deadArea = areaAction({
    symbol: 'D',
    definition: 'dead load: permanent construction/material weight acting on the roof-purlin target',
    pressureKPa: finiteNonnegative(roofDeadLoadKPa, 'roofDeadLoadKPa'),
    sourceReference: nonEmpty(roofDeadLoadSourceReference, 'roofDeadLoadSourceReference'),
    route,
    cosTheta,
    sinTheta
  });
  const dead = addDeadSelfWeight(deadArea, selfWeightMap, route, cosTheta, sinTheta);
  const roofLive = areaAction({
    symbol: 'Lr',
    definition: 'roof live load, distinct from ordinary live load L',
    pressureKPa: finiteNonnegative(roofLiveLoadKPa, 'roofLiveLoadKPa'),
    sourceReference: nonEmpty(roofLiveLoadSourceReference, 'roofLiveLoadSourceReference'),
    route,
    cosTheta,
    sinTheta
  });
  const ordinaryLive = zeroAction('L', 'ordinary live load except roof live load', ordinaryLiveLoadZeroDecisionSourceReference);
  const hydro = zeroAction('H', 'lateral pressure of soil and water in soil', hydrostaticSoilZeroDecisionSourceReference);
  const rainDecisionRef = nonEmpty(rainActionDecisionSourceReference, 'rainActionDecisionSourceReference');

  return {
    schemaVersion: WIND_ROOF_COMPANION_ACTIONS_SCHEMA,
    status: STATUS,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: {
      class: 'roof-bay-purlin-system',
      actionScope: ['D', 'L', 'Lr', 'R', 'H'],
      designMethodScope: 'strength-lrfd-companion-action-acceptance-only'
    },
    upstreamWindRoofLoadCaseCombination: upstream,
    geometry: {
      roofSlopeDeg: slopeDeg,
      baySpanM: route.geometry.spanM,
      roofSlopeLengthM: zones.roofPlaneRegistration.roofSlopeLengthM,
      roofBayAreaM2: zones.roofBayConservation.roofBayAreaM2,
      purlinLabels: labels
    },
    actions: {
      D: dead,
      L: ordinaryLive,
      Lr: roofLive,
      R: {
        actionSymbol: 'R',
        actionDefinition: 'rain load on the undeflected roof',
        status: 'UNRESOLVED',
        decisionSourceReference: rainDecisionRef,
        total: null
      },
      H: hydro
    },
    f1: {
      status: 'NOT_REQUIRED_WHILE_L_TARGET_ACTION_IS_ZERO',
      value: null,
      reason: 'For this accepted roof-purlin target record, L is explicitly zero/not-applicable. Therefore f1×L is zero regardless of whether f1 would otherwise be 0.5 or 1.0. A future nonzero L action must resolve f1 explicitly before combination assembly.'
    },
    combinationReadiness: {
      'NSCP-203-3-W': {
        lrBranch: 'READY_FOR_ASSEMBLY',
        rainAlternative: 'UNRESOLVED_R',
        governingLrOrRSelection: 'BLOCKED_UNTIL_R_RESOLVED_OR_EXPLICIT_PROJECT_APPLICABILITY_DECISION'
      },
      'NSCP-203-4': {
        lrBranch: 'READY_FOR_ASSEMBLY',
        f1LContribution: 'RESOLVED_ZERO_BECAUSE_L_TARGET_ACTION_IS_ZERO',
        rainAlternative: 'UNRESOLVED_R',
        governingLrOrRSelection: 'BLOCKED_UNTIL_R_RESOLVED_OR_EXPLICIT_PROJECT_APPLICABILITY_DECISION'
      },
      'NSCP-203-6': {
        status: 'READY_FOR_ASSEMBLY',
        hContribution: 'RESOLVED_ZERO_BY_TARGET_SPECIFIC_NOT_APPLICABLE_DECISION'
      }
    },
    sourceBasis: {
      codeLoadDefinitionsSourceReference: nonEmpty(codeLoadDefinitionsSourceReference, 'codeLoadDefinitionsSourceReference'),
      actionRule: ACTION_RULE,
      geometryRule: GEOMETRY_RULE,
      authorizedCopyReviewRequired: true
    },
    implementation: {
      deadActionAcceptedAndRouted: true,
      purlinSelfWeightSeparatedInsideDeadAction: true,
      roofLiveActionAcceptedAndRouted: true,
      ordinaryLiveTargetZeroDecisionImplemented: true,
      hydrostaticSoilTargetZeroDecisionImplemented: true,
      rainActionImplemented: false,
      f1AutomaticallyResolved: false,
      completeStrengthCombinationEvaluationImplemented: false,
      codeDerivedRoofBayUiActivated: false,
      piecewisePurlinMemberResponseImplemented: false,
      purlinCapacityPromotionImplemented: false,
      connectionCapacityImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

export function resolveWindRoofCompanionActions(input = {}) {
  const record = buildRecord(input);
  validateWindRoofCompanionActions(record);
  return clone(record);
}

export function validateWindRoofCompanionActions(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof companion-action record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_COMPANION_ACTIONS_SCHEMA) throw new Error(`Unsupported roof companion-action schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof companion-action status changed.');
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE) throw new Error('Roof companion-action profile/procedure changed.');
  if (record.target?.class !== 'roof-bay-purlin-system' || record.target?.designMethodScope !== 'strength-lrfd-companion-action-acceptance-only') throw new Error('Roof companion-action target changed.');
  if (record.sourceBasis?.authorizedCopyReviewRequired !== true || record.sourceBasis?.actionRule !== ACTION_RULE || record.sourceBasis?.geometryRule !== GEOMETRY_RULE) throw new Error('Roof companion-action source rules changed.');
  nonEmpty(record.sourceBasis?.codeLoadDefinitionsSourceReference, 'sourceBasis.codeLoadDefinitionsSourceReference');
  if (record.actions?.D?.status !== 'ACCEPTED_AND_ROUTED' || record.actions?.Lr?.status !== 'ACCEPTED_AND_ROUTED') throw new Error('D and Lr must remain accepted/routed actions.');
  if (record.actions?.L?.status !== 'TARGET_SPECIFIC_NOT_APPLICABLE_ZERO' || record.actions?.H?.status !== 'TARGET_SPECIFIC_NOT_APPLICABLE_ZERO') throw new Error('L and H must remain explicit target-specific zero decisions in this slice.');
  if (record.actions?.R?.status !== 'UNRESOLVED' || record.actions?.R?.total !== null) throw new Error('Rain action must remain unresolved in this slice.');
  if (record.f1?.status !== 'NOT_REQUIRED_WHILE_L_TARGET_ACTION_IS_ZERO' || record.f1?.value !== null) throw new Error('f1 boundary changed from the zero-L target decision.');
  if (record.boundary !== BOUNDARY) throw new Error('Roof companion-action engineering boundary changed.');

  const inputs = record._inputs;
  if (!inputs) {
    throw new Error('Roof companion-action deterministic input capsule is missing.');
  }
  const rebuilt = buildRecord(inputs);
  delete rebuilt._inputs;
  const comparable = clone(record);
  delete comparable._inputs;
  if (!sameRecord(comparable, rebuilt)) throw new Error('Roof companion-action record changed from its deterministic upstream/action/source inputs.');
  return true;
}

function withInputs(record, input) {
  return { ...record, _inputs: clone(input) };
}

export function createWindRoofCompanionActions(input = {}) {
  const record = buildRecord(input);
  const wrapped = withInputs(record, input);
  validateWindRoofCompanionActions(wrapped);
  return clone(wrapped);
}

export function serializeWindRoofCompanionActions(record) {
  validateWindRoofCompanionActions(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofCompanionActions(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofCompanionActions(parsed);
  return clone(parsed);
}
