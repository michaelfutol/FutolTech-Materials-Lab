import { validateRoofFastenerCodePressureDemandRouting } from './roofFastenerCodePressureDemandRouting.js';
import { validateRoofFastenerCapacityEvidenceAcceptance } from '../interchange/roofFastenerCapacityEvidenceAcceptance.js';

export const ROOF_FASTENER_CAPACITY_UTILIZATION_SCHEMA = 'futoltech.roof-fastener-capacity-utilization/1';

const STATUS = 'ROOF_FASTENER_UPLIFT_UTILIZATION_EVALUATED_ROOF_SYSTEM_UNRESOLVED';
const AWAY_DIRECTION = 'away-from-surface';
const TOWARD_DIRECTION = 'toward-surface';
const MECHANISMS = Object.freeze(['pull-out', 'pull-over']);
const EPS = 1e-9;
const DEMAND_BASIS = 'lrfd';
const SCOPE = 'single-fastener';
const ELIGIBLE = 'ELIGIBLE_SINGLE_FASTENER_LRFD_UTILIZATION';
const RULE = 'Individual screw uplift utilization is calculated only from the accepted away-from-surface M4 code-pressure demand magnitude and an applicability-complete capacity evidence record whose source scope is explicitly accepted as single-fastener and whose capacity is an LRFD design value compatible with the explicitly source-accepted LRFD demand basis.';
const BASIS_RULE = 'This v1 slice implements no ASD conversion, nominal-to-design resistance-factor conversion, manufacturer-rating reinterpretation or test-ultimate reduction. Only capacityType=design with designBasis=lrfd may be compared after an explicit source-referenced LRFD demand-basis acceptance. All other bases remain visible but utilization is blocked.';
const SCOPE_RULE = 'A kN capacity is never assumed to belong to one screw. Each evidence record used for individual-screw utilization requires an explicit source-referenced capacityScopeAcceptance with scope=single-fastener. Assembly, panel, group or unspecified capacity scope remains ineligible.';
const BOUNDARY = 'This record evaluates only individual-fastener roof-normal uplift demand against eligible pull-out and pull-over single-fastener LRFD design capacities. Toward-surface pressure is retained as an unresolved compression/bearing path. Fastener tension/shear interaction, group action, load redistribution after local failure, roof-sheet structural capacity, bearing, purlin local failure, purlin-to-rafter cleat/bolt/weld capacity and roof-system PASS remain unresolved.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nullableText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }

function normalizeDemandBasis(input = {}) {
  const designDirection = nonEmpty(input.designDirection, 'demandBasisAcceptance.designDirection').toLowerCase();
  if (designDirection !== AWAY_DIRECTION) throw new Error(`demandBasisAcceptance.designDirection must be '${AWAY_DIRECTION}' for this uplift-utilization slice.`);
  const designBasis = nonEmpty(input.designBasis, 'demandBasisAcceptance.designBasis').toLowerCase();
  if (designBasis !== DEMAND_BASIS) throw new Error(`This utilization slice currently accepts only an explicitly source-backed '${DEMAND_BASIS}' demand basis.`);
  return {
    designDirection,
    designBasis,
    demandSourceReference: nonEmpty(input.demandSourceReference, 'demandBasisAcceptance.demandSourceReference'),
    basisCompatibilitySourceReference: nonEmpty(input.basisCompatibilitySourceReference, 'demandBasisAcceptance.basisCompatibilitySourceReference')
  };
}

function normalizeScopeAcceptances(values) {
  if (values == null) return [];
  if (!Array.isArray(values)) throw new Error('capacityScopeAcceptances must be an array when supplied.');
  const seen = new Set();
  return values.map((item, index) => {
    const evidenceId = nonEmpty(item?.evidenceId, `capacityScopeAcceptances[${index}].evidenceId`);
    if (seen.has(evidenceId)) throw new Error(`Duplicate capacity scope acceptance for evidenceId '${evidenceId}'.`);
    seen.add(evidenceId);
    const scope = nonEmpty(item?.scope, `capacityScopeAcceptances[${index}].scope`).toLowerCase();
    if (scope !== SCOPE) throw new Error(`This utilization slice accepts only capacity scope '${SCOPE}'.`);
    return {
      evidenceId,
      scope,
      sourceReference: nonEmpty(item?.sourceReference, `capacityScopeAcceptances[${index}].sourceReference`)
    };
  });
}

function validateUpstreamCompatibility(demand, evidence) {
  const demandLayout = demand.upstreamRoofSheetFastenerLayoutAcceptance;
  const evidenceLayout = evidence.upstreamRoofSheetFastenerLayoutAcceptance;
  if (!sameRecord(demandLayout, evidenceLayout)) throw new Error('Fastener demand routing and capacity evidence do not reference the exact same accepted roof-sheet fastener layout.');
  if (evidence.attachmentDetail.fastener.systemId !== demand.fastenerSystem.id) throw new Error('Capacity evidence fastener system does not match the demand-routing fastener system.');
}

function evidenceEligibility(evidenceRecord, scopeByEvidenceId, demandBasis) {
  const coverageComplete = evidenceRecord.coverage?.status === 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL';
  const scope = scopeByEvidenceId.get(evidenceRecord.evidenceId) ?? null;
  const scopeComplete = scope?.scope === SCOPE;
  const lrfdCapacity = evidenceRecord.capacity?.capacityType === 'design' && evidenceRecord.capacity?.designBasis === DEMAND_BASIS;
  const basisCompatible = demandBasis.designBasis === DEMAND_BASIS && lrfdCapacity;
  const reasons = [];
  if (!coverageComplete) reasons.push('EVIDENCE_APPLICABILITY_INCOMPLETE');
  if (!scopeComplete) reasons.push('SINGLE_FASTENER_CAPACITY_SCOPE_NOT_SOURCE_ACCEPTED');
  if (!basisCompatible) reasons.push('DEMAND_CAPACITY_BASIS_INCOMPATIBLE');
  return {
    evidenceId:evidenceRecord.evidenceId,
    mechanism:evidenceRecord.mechanism,
    capacity:clone(evidenceRecord.capacity),
    applicabilityStatus:evidenceRecord.coverage?.status ?? null,
    capacityScope:scope ? clone(scope) : null,
    demandDesignBasis:demandBasis.designBasis,
    status:reasons.length ? 'BLOCKED' : ELIGIBLE,
    blockedReasons:reasons,
    capacityValueKN:reasons.length ? null : finite(evidenceRecord.capacity.valueKN, `${evidenceRecord.evidenceId}.capacity.valueKN`)
  };
}

function mechanismMap(evidenceAcceptance, scopeAcceptances, demandBasis) {
  const scopeByEvidenceId = new Map(scopeAcceptances.map((item) => [item.evidenceId, item]));
  const map = new Map();
  for (const evidence of evidenceAcceptance.capacityEvidence) {
    const eligibility = evidenceEligibility(evidence, scopeByEvidenceId, demandBasis);
    map.set(evidence.mechanism, eligibility);
  }
  return map;
}

function evaluateAwayDirection(direction, eligibilityByMechanism) {
  if (direction.designDirection !== AWAY_DIRECTION) throw new Error('Away-direction evaluator received the wrong wind direction.');
  const mechanismEligibility = MECHANISMS.map((mechanism) => eligibilityByMechanism.get(mechanism) ?? {
    evidenceId:null,
    mechanism,
    capacity:null,
    applicabilityStatus:null,
    capacityScope:null,
    demandDesignBasis:DEMAND_BASIS,
    status:'BLOCKED',
    blockedReasons:['NO_ACCEPTED_CAPACITY_EVIDENCE_FOR_MECHANISM'],
    capacityValueKN:null
  });
  const eligibleByMechanism = new Map(mechanismEligibility.map((item) => [item.mechanism, item]));
  const bothMechanismsEligible = MECHANISMS.every((mechanism) => eligibleByMechanism.get(mechanism)?.status === ELIGIBLE);

  const rows = direction.rows.map((row) => ({
    purlinLabel:row.purlinLabel,
    fasteners:row.fasteners.map((fastener) => {
      const signedDemandKN = finite(fastener.demand.normalForceKN, `${fastener.fastenerId}.demand.normalForceKN`);
      if (signedDemandKN > EPS) throw new Error(`Away-from-surface fastener '${fastener.fastenerId}' demand must not be positive.`);
      const upliftDemandKN = Math.abs(signedDemandKN);
      const mechanisms = MECHANISMS.map((mechanism) => {
        const eligibility = eligibleByMechanism.get(mechanism);
        if (eligibility.status !== ELIGIBLE) {
          return {
            mechanism,
            evidenceId:eligibility.evidenceId,
            eligibilityStatus:eligibility.status,
            blockedReasons:[...eligibility.blockedReasons],
            upliftDemandKN,
            designCapacityKN:null,
            utilization:null,
            localStatus:'UNRESOLVED'
          };
        }
        const designCapacityKN = eligibility.capacityValueKN;
        const utilization = upliftDemandKN / designCapacityKN;
        return {
          mechanism,
          evidenceId:eligibility.evidenceId,
          eligibilityStatus:eligibility.status,
          blockedReasons:[],
          upliftDemandKN,
          designCapacityKN,
          utilization,
          localStatus:utilization <= 1 + EPS ? 'PASS' : 'FAIL'
        };
      });
      const resolved = mechanisms.filter((item) => item.utilization != null);
      const governing = resolved.length
        ? resolved.reduce((best, item) => item.utilization > best.utilization ? item : best)
        : null;
      const connectionLocalStatus = bothMechanismsEligible
        ? (governing && governing.utilization <= 1 + EPS ? 'PASS' : 'FAIL')
        : 'INCOMPLETE';
      return {
        fastenerId:fastener.fastenerId,
        purlinLabel:fastener.purlinLabel,
        xM:fastener.xM,
        yM:fastener.yM,
        signedNormalDemandKN:signedDemandKN,
        upliftDemandKN,
        mechanisms,
        governingMechanism:governing?.mechanism ?? null,
        governingUtilization:governing?.utilization ?? null,
        connectionLocalStatus
      };
    })
  }));

  const fasteners = rows.flatMap((row) => row.fasteners);
  const resolved = fasteners.filter((item) => item.governingUtilization != null);
  const governingFastener = resolved.length
    ? resolved.reduce((best, item) => item.governingUtilization > best.governingUtilization ? item : best)
    : null;
  const allFastenersPass = bothMechanismsEligible && fasteners.every((item) => item.connectionLocalStatus === 'PASS');
  const anyFastenerFail = bothMechanismsEligible && fasteners.some((item) => item.connectionLocalStatus === 'FAIL');
  return {
    designDirection:AWAY_DIRECTION,
    mechanismEligibility,
    bothMechanismsEligible,
    rows,
    summary:{
      fastenerCount:fasteners.length,
      resolvedFastenerCount:resolved.length,
      governingFastenerId:governingFastener?.fastenerId ?? null,
      governingMechanism:governingFastener?.governingMechanism ?? null,
      governingUtilization:governingFastener?.governingUtilization ?? null,
      localUpliftConnectionState:bothMechanismsEligible ? (anyFastenerFail ? 'FAIL' : allFastenersPass ? 'PASS' : 'INCOMPLETE') : 'INCOMPLETE',
      roofSystemPass:null
    }
  };
}

function buildRecord({ roofFastenerCodePressureDemandRouting, roofFastenerCapacityEvidenceAcceptance, demandBasisAcceptance, capacityScopeAcceptances = [], note = null } = {}) {
  const demand = clone(roofFastenerCodePressureDemandRouting);
  const evidence = clone(roofFastenerCapacityEvidenceAcceptance);
  validateRoofFastenerCodePressureDemandRouting(demand);
  validateRoofFastenerCapacityEvidenceAcceptance(evidence);
  validateUpstreamCompatibility(demand, evidence);
  const demandBasis = normalizeDemandBasis(demandBasisAcceptance);
  const scopes = normalizeScopeAcceptances(capacityScopeAcceptances);
  const evidenceIds = new Set(evidence.capacityEvidence.map((item) => item.evidenceId));
  for (const scope of scopes) {
    if (!evidenceIds.has(scope.evidenceId)) throw new Error(`capacityScopeAcceptance references unknown evidenceId '${scope.evidenceId}'.`);
  }
  const eligibilityByMechanism = mechanismMap(evidence, scopes, demandBasis);
  const away = demand.directions.find((item) => item.designDirection === AWAY_DIRECTION);
  const toward = demand.directions.find((item) => item.designDirection === TOWARD_DIRECTION);
  if (!away || !toward) throw new Error('Fastener demand routing must preserve both toward-surface and away-from-surface directions.');
  const uplift = evaluateAwayDirection(away, eligibilityByMechanism);
  return {
    schemaVersion:ROOF_FASTENER_CAPACITY_UTILIZATION_SCHEMA,
    status:STATUS,
    upstreamRoofFastenerCodePressureDemandRouting:demand,
    upstreamRoofFastenerCapacityEvidenceAcceptance:evidence,
    demandBasisAcceptance:demandBasis,
    capacityScopeAcceptances:scopes,
    uplift,
    towardSurfaceBoundary:{
      designDirection:TOWARD_DIRECTION,
      sourceNormalForceKN:toward.routed.normalForceKN,
      utilization:null,
      status:'UNRESOLVED_COMPRESSION_BEARING_PATH'
    },
    implementation:{
      singleFastenerScopeAcceptanceRequired:true,
      lrfdBasisCompatibilityRequired:true,
      pullOutUtilizationImplemented:true,
      pullOverUtilizationImplemented:true,
      towardSurfaceBearingImplemented:false,
      fastenerTensionShearInteractionImplemented:false,
      fastenerGroupActionImplemented:false,
      roofSheetStructuralCapacityImplemented:false,
      purlinLocalConnectionCapacityImplemented:false,
      purlinToRafterConnectionCapacityImplemented:false,
      roofSystemPassPromotionImplemented:false
    },
    sourceBasis:{ rule:RULE, basisRule:BASIS_RULE, scopeRule:SCOPE_RULE },
    note:nullableText(note),
    boundary:BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    roofFastenerCodePressureDemandRouting:record.upstreamRoofFastenerCodePressureDemandRouting,
    roofFastenerCapacityEvidenceAcceptance:record.upstreamRoofFastenerCapacityEvidenceAcceptance,
    demandBasisAcceptance:record.demandBasisAcceptance,
    capacityScopeAcceptances:record.capacityScopeAcceptances,
    note:record.note
  };
}

export function resolveRoofFastenerCapacityUtilization(input = {}) {
  const record = buildRecord(input);
  validateRoofFastenerCapacityUtilization(record);
  return clone(record);
}

export function validateRoofFastenerCapacityUtilization(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof fastener capacity-utilization record must be an object.');
  if (record.schemaVersion !== ROOF_FASTENER_CAPACITY_UTILIZATION_SCHEMA) throw new Error(`Unsupported roof fastener capacity-utilization schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof fastener capacity-utilization status changed.');
  if (record.sourceBasis?.rule !== RULE || record.sourceBasis?.basisRule !== BASIS_RULE || record.sourceBasis?.scopeRule !== SCOPE_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof fastener capacity-utilization engineering boundary changed.');
  }
  const expectedImplementation = {
    singleFastenerScopeAcceptanceRequired:true,
    lrfdBasisCompatibilityRequired:true,
    pullOutUtilizationImplemented:true,
    pullOverUtilizationImplemented:true,
    towardSurfaceBearingImplemented:false,
    fastenerTensionShearInteractionImplemented:false,
    fastenerGroupActionImplemented:false,
    roofSheetStructuralCapacityImplemented:false,
    purlinLocalConnectionCapacityImplemented:false,
    purlinToRafterConnectionCapacityImplemented:false,
    roofSystemPassPromotionImplemented:false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof fastener capacity-utilization record was improperly promoted beyond its implemented scope.');
  if (record.uplift?.summary?.roofSystemPass !== null) throw new Error('Roof fastener capacity-utilization must not promote a roof-system PASS.');
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof fastener capacity-utilization record changed from its deterministic accepted demand/evidence/scope/basis inputs.');
  return true;
}

export function serializeRoofFastenerCapacityUtilization(record) {
  validateRoofFastenerCapacityUtilization(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofFastenerCapacityUtilization(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofFastenerCapacityUtilization(parsed);
  return clone(parsed);
}
