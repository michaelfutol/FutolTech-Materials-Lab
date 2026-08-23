import { windProjectInputAcceptanceToVelocityPressureCase } from '../interchange/windProjectInputAcceptance.js';
import { nscp2015BuildingVelocityPressure } from './windVelocityPressure.js';
import { validateWindRoofExternalGcp } from './windRoofExternalGcp.js';

export const WIND_ROOF_EXTERNAL_PRESSURE_TERM_SCHEMA = 'futoltech.wind-roof-external-pressure-term/1';

const STATUS = 'PURLIN_EXTERNAL_PRESSURE_TERM_RESOLVED_NET_PRESSURE_BLOCKED';
const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const TARGET_CLASS = 'roof-purlin';
const EPS = 1e-9;
const EQUATION_RULE = 'For the current NSCP 2015 Part 1 low-rise roof-purlin Components & Cladding path, evaluate the external-only pressure term for each resolved zone case as p_external = qh(GCp), using the mean-roof-height velocity pressure qh.';
const SIGN_RULE = 'Positive GCp and positive p_external act toward the roof surface. Negative GCp and negative p_external act away from the roof surface (suction). These are roof-surface-normal signs, not global vertical directions.';
const MINIMUM_RULE = 'The 0.77 kPa minimum Components & Cladding design pressure is a later net-design-pressure requirement and is not applied to this external-only term.';
const BOUNDARY = 'This record resolves only qh(GCp) for each supported roof-purlin zone-intersection case. It does not subtract internal pressure, apply the minimum net design pressure, create load combinations, route code pressure into Roof Bay, resolve roof-sheet/fastener capacity, or promote purlin design capacity.';

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

function resolveQh(externalGcp) {
  const pressureContext = externalGcp.upstreamWindRoofZoneGeometry?.upstreamWindPressureContextAcceptance;
  const projectInputs = pressureContext?.upstreamWindProjectInputAcceptance;
  if (!projectInputs) throw new Error('External GCp record does not carry the accepted project wind inputs required for qh.');
  const velocityCase = windProjectInputAcceptanceToVelocityPressureCase(projectInputs);
  const meanRoofHeightM = Number(pressureContext?.roofGeometry?.meanRoofHeightM);
  if (!Number.isFinite(meanRoofHeightM) || !nearlyEqual(meanRoofHeightM, velocityCase.heightM)) {
    throw new Error('Accepted pressure-context mean roof height must match the project-input qh evaluation height.');
  }
  const result = nscp2015BuildingVelocityPressure({
    heightM: velocityCase.heightM,
    exposureCategory: velocityCase.exposureCategory,
    basicWindSpeedKph: velocityCase.basicWindSpeedKph,
    topographicFactorKzt: velocityCase.topographicFactorKzt
  });
  return {
    basis: 'mean-roof-height-qh',
    heightM: velocityCase.heightM,
    exposureCategory: velocityCase.exposureCategory,
    basicWindSpeedKph: velocityCase.basicWindSpeedKph,
    topographicFactorKzt: velocityCase.topographicFactorKzt,
    qhKPa: result.result.qKPa,
    velocityPressureEquation: result.equation,
    substitutions: clone(result.substitutions),
    projectInputSourceReferences: {
      height: projectInputs.height.sourceReference,
      exposure: projectInputs.exposure.sourceReference,
      windSpeed: projectInputs.basicWindSpeed.sourceReference,
      topography: projectInputs.topography.sourceReference
    }
  };
}

function buildRecord({ windRoofExternalGcp, equationSourceReference, signConventionSourceReference, note = null } = {}) {
  validateWindRoofExternalGcp(windRoofExternalGcp);
  const externalGcp = clone(windRoofExternalGcp);
  if (externalGcp.adoptedCodeProfileId !== CODE_PROFILE) throw new Error(`External pressure term supports only '${CODE_PROFILE}'.`);
  if (externalGcp.designProcedure !== PROCEDURE || externalGcp.target?.class !== TARGET_CLASS) throw new Error('External pressure term requires the supported roof-purlin Components & Cladding GCp record.');
  if (!['enclosed', 'partially-enclosed'].includes(externalGcp.applicability?.enclosureClassification)) throw new Error('External pressure term requires the Part 1 enclosed or partially-enclosed GCp path.');
  if (Number(externalGcp.applicability?.meanRoofHeightM) > 18 + EPS) throw new Error('External pressure term is currently limited to h <= 18 m.');

  const qh = resolveQh(externalGcp);
  const pressureCases = externalGcp.coefficientCases.map((coefficientCase) => ({
    zoneNumber: coefficientCase.zoneNumber,
    type: coefficientCase.type,
    actualZoneIntersectionAreaM2: coefficientCase.actualZoneIntersectionAreaM2,
    componentCoefficientSelectionEffectiveAreaM2: coefficientCase.componentCoefficientSelectionEffectiveAreaM2,
    positiveGCp: coefficientCase.positiveGCp,
    negativeGCp: coefficientCase.negativeGCp,
    towardSurfaceExternalPressureKPa: qh.qhKPa * coefficientCase.positiveGCp,
    awayFromSurfaceExternalPressureKPa: qh.qhKPa * coefficientCase.negativeGCp
  }));

  return {
    schemaVersion: WIND_ROOF_EXTERNAL_PRESSURE_TERM_SCHEMA,
    status: STATUS,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: clone(externalGcp.target),
    upstreamWindRoofExternalGcp: externalGcp,
    qh,
    pressureCases,
    sourceBasis: {
      equationSourceReference: nonEmpty(equationSourceReference, 'equationSourceReference'),
      signConventionSourceReference: nonEmpty(signConventionSourceReference, 'signConventionSourceReference'),
      equationRule: EQUATION_RULE,
      signRule: SIGN_RULE,
      minimumNetPressureRule: MINIMUM_RULE
    },
    implementation: {
      externalPressureCoefficientImplemented: true,
      externalPressureTermImplemented: true,
      externalInternalPressureCombinationImplemented: false,
      minimumNetPressureApplied: false,
      loadCombinationsImplemented: false,
      codeDerivedRoofPressureImplemented: false,
      roofBayCodePressureRoutingImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      purlinCapacityPromotionImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

export function resolveWindRoofExternalPressureTerm(input = {}) {
  const record = buildRecord(input);
  validateWindRoofExternalPressureTerm(record);
  return clone(record);
}

export function validateWindRoofExternalPressureTerm(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind roof external pressure-term record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_EXTERNAL_PRESSURE_TERM_SCHEMA) throw new Error(`Unsupported wind roof external pressure-term schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Wind roof external pressure-term status changed.');
  if (record.adoptedCodeProfileId !== CODE_PROFILE) throw new Error('Wind roof external pressure-term code profile changed.');
  if (record.designProcedure !== PROCEDURE || record.target?.class !== TARGET_CLASS) throw new Error('Wind roof external pressure-term target/procedure changed.');
  nonEmpty(record.sourceBasis?.equationSourceReference, 'sourceBasis.equationSourceReference');
  nonEmpty(record.sourceBasis?.signConventionSourceReference, 'sourceBasis.signConventionSourceReference');
  if (record.sourceBasis?.equationRule !== EQUATION_RULE) throw new Error('External pressure-term equation rule changed.');
  if (record.sourceBasis?.signRule !== SIGN_RULE) throw new Error('External pressure-term sign rule changed.');
  if (record.sourceBasis?.minimumNetPressureRule !== MINIMUM_RULE) throw new Error('External pressure-term minimum-pressure boundary changed.');
  if (record.boundary !== BOUNDARY) throw new Error('External pressure-term engineering boundary changed.');

  const rebuilt = buildRecord({
    windRoofExternalGcp: record.upstreamWindRoofExternalGcp,
    equationSourceReference: record.sourceBasis.equationSourceReference,
    signConventionSourceReference: record.sourceBasis.signConventionSourceReference,
    note: record.note
  });
  if (!sameRecord(record, rebuilt)) throw new Error('Wind roof external pressure-term record changed from its deterministic upstream GCp/qh/source inputs.');
  return true;
}

export function serializeWindRoofExternalPressureTerm(record) {
  validateWindRoofExternalPressureTerm(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofExternalPressureTerm(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofExternalPressureTerm(parsed);
  return clone(parsed);
}
