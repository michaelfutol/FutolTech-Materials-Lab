import { validateRoofFastenerCapacityEvidenceAcceptance } from './roofFastenerCapacityEvidenceAcceptance.js';

export const ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_SCHEMA = 'futoltech.roof-sheet-positive-pressure-capacity-evidence/1';

const STATUS = 'ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_ACCEPTED_PROJECT_SPAN_APPLICABILITY_UNRESOLVED';
const EPS = 1e-9;
const SOURCE_TYPES = Object.freeze(['manufacturer-published', 'laboratory-test', 'project-test', 'authorized-code-calculation']);
const CAPACITY_TYPES = Object.freeze(['nominal', 'allowable', 'design', 'test-ultimate-reference']);
const DESIGN_BASES = Object.freeze(['lrfd', 'asd', 'manufacturer-rated', 'test-reference', 'unclassified']);
const LOAD_DIRECTIONS = Object.freeze(['toward-support']);
const LOAD_CATEGORIES = Object.freeze(['live-load-deflection', 'positive-wind', 'uniform-pressure-other']);
const SPAN_TYPES = Object.freeze(['1-span', '2-span', '3-span', '4-span', 'source-defined']);
const OVERHANG_CONDITIONS = Object.freeze(['no-overhang', 'with-overhang', 'source-defined']);
const LIMIT_STATES = Object.freeze(['flexure', 'shear', 'combined-shear-flexure', 'web-crippling', 'deflection', 'other-source-defined']);
const PRODUCT_APPLICABILITY_FIELDS = Object.freeze([
  'roofSheetProductIds',
  'roofSheetProfileIds',
  'roofSheetBaseMetalThicknessMmRange',
  'roofSheetYieldStrengthMPaRange',
  'roofSheetUltimateStrengthMPaRange'
]);
const EVIDENCE_RULE = 'Positive-pressure roof-sheet capacity evidence must preserve the source row exactly enough to identify panel product/profile, base-metal thickness/material applicability, load direction/category, span type, support spacing, overhang condition, capacity basis and source-covered limit states. A generic sheet thickness or generic panel label is not capacity evidence.';
const SPAN_RULE = 'This acceptance slice stores source span/support applicability but does not infer the project panel continuity, end laps, overhangs or governing support spacing from purlin geometry. Project span applicability remains unresolved until a later explicit panel-span configuration bridge is implemented.';
const DIRECTION_RULE = 'Only source evidence for load pushing the roof sheet toward its supports is accepted by this record. Uplift/pull-away evidence remains in the separate fastener/pull-over path and must not be reused as positive-pressure panel capacity.';
const BASIS_RULE = 'Nominal, allowable/ASD, LRFD design, manufacturer-rated and ultimate/test-reference values remain distinct. This evidence layer performs no factor conversion and no demand/capacity utilization.';
const BOUNDARY = 'This record accepts source-backed roof-sheet positive-pressure panel capacity evidence against the exact already-accepted roof-sheet product detail. It does not establish project panel span/continuity applicability, derive panel demand, calculate utilization, resolve exact local sheet-to-purlin contact footprint/stress, rate purlin local bearing/web crippling, rate screw compression/bearing/shear, or promote any roof-system PASS.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function fingerprint(value) {
  const text = JSON.stringify(stable(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function positive(value, label) {
  const number = finite(value, label);
  if (!(number > 0)) throw new Error(`${label} must be greater than zero.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nullableText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function enumValue(value, allowed, label) {
  const normalized = nonEmpty(value, label).toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
  return normalized;
}
function dateText(value, label) {
  const text = nonEmpty(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must use YYYY-MM-DD.`);
  return text;
}
function stringList(value, label) {
  if (value == null) return null;
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a non-empty array when supplied.`);
  const clean = value.map((item, index) => nonEmpty(item, `${label}[${index}]`));
  if (new Set(clean).size !== clean.length) throw new Error(`${label} must not contain duplicates.`);
  return clean;
}
function enumList(value, allowed, label) {
  if (value == null) return null;
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a non-empty array when supplied.`);
  const clean = value.map((item, index) => enumValue(item, allowed, `${label}[${index}]`));
  if (new Set(clean).size !== clean.length) throw new Error(`${label} must not contain duplicates.`);
  return clean;
}
function numericRange(value, label) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object with min/max.`);
  const min = positive(value.min, `${label}.min`);
  const max = positive(value.max, `${label}.max`);
  if (max + EPS < min) throw new Error(`${label}.max must be greater than or equal to min.`);
  return { min, max };
}
function rangeCovers(range, actual) { return range != null && actual >= range.min - EPS && actual <= range.max + EPS; }
function listCovers(values, actual) { return values != null && values.includes(actual); }

function normalizeSourceApplicability(value = {}) {
  return {
    roofSheetProductIds: stringList(value.roofSheetProductIds, 'sourceApplicability.roofSheetProductIds'),
    roofSheetProfileIds: stringList(value.roofSheetProfileIds, 'sourceApplicability.roofSheetProfileIds'),
    roofSheetBaseMetalThicknessMmRange: numericRange(value.roofSheetBaseMetalThicknessMmRange, 'sourceApplicability.roofSheetBaseMetalThicknessMmRange'),
    roofSheetYieldStrengthMPaRange: numericRange(value.roofSheetYieldStrengthMPaRange, 'sourceApplicability.roofSheetYieldStrengthMPaRange'),
    roofSheetUltimateStrengthMPaRange: numericRange(value.roofSheetUltimateStrengthMPaRange, 'sourceApplicability.roofSheetUltimateStrengthMPaRange'),
    spanTypes: enumList(value.spanTypes, SPAN_TYPES, 'sourceApplicability.spanTypes'),
    supportSpacingMRange: numericRange(value.supportSpacingMRange, 'sourceApplicability.supportSpacingMRange'),
    overhangConditions: enumList(value.overhangConditions, OVERHANG_CONDITIONS, 'sourceApplicability.overhangConditions'),
    loadDirections: enumList(value.loadDirections, LOAD_DIRECTIONS, 'sourceApplicability.loadDirections'),
    loadCategories: enumList(value.loadCategories, LOAD_CATEGORIES, 'sourceApplicability.loadCategories')
  };
}

function productCoverage(applicability, detail) {
  const actual = {
    roofSheetProductIds: detail.roofSheet.productId,
    roofSheetProfileIds: detail.roofSheet.profileId,
    roofSheetBaseMetalThicknessMmRange: detail.roofSheet.baseMetalThicknessMm,
    roofSheetYieldStrengthMPaRange: detail.roofSheet.material.yieldStrengthMPa,
    roofSheetUltimateStrengthMPaRange: detail.roofSheet.material.ultimateStrengthMPa
  };
  const missing = [];
  for (const field of PRODUCT_APPLICABILITY_FIELDS) {
    const supplied = applicability[field];
    if (supplied == null) {
      missing.push(field);
      continue;
    }
    const covered = field.endsWith('Ids') ? listCovers(supplied, actual[field]) : rangeCovers(supplied, actual[field]);
    if (!covered) throw new Error(`Roof-sheet positive-pressure evidence applicability does not cover accepted detail field '${field}'.`);
  }
  return {
    requiredProductFields:[...PRODUCT_APPLICABILITY_FIELDS],
    missingRequiredProductFields:missing,
    productApplicabilityStatus:missing.length ? 'REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY' : 'PRODUCT_APPLICABILITY_COMPLETE',
    projectSpanApplicabilityStatus:'UNRESOLVED_REQUIRES_EXPLICIT_PANEL_SPAN_CONFIGURATION'
  };
}

function normalizeEvidence(values, detail) {
  if (!Array.isArray(values) || !values.length) throw new Error('capacityEvidence must contain at least one source-backed positive-pressure panel capacity record.');
  const seenIds = new Set();
  return values.map((item, index) => {
    const evidenceId = nonEmpty(item?.evidenceId, `capacityEvidence[${index}].evidenceId`);
    if (seenIds.has(evidenceId)) throw new Error(`Duplicate capacity evidenceId '${evidenceId}'.`);
    seenIds.add(evidenceId);
    const loadDirection = enumValue(item?.sourceCondition?.loadDirection, LOAD_DIRECTIONS, `capacityEvidence[${index}].sourceCondition.loadDirection`);
    const loadCategory = enumValue(item?.sourceCondition?.loadCategory, LOAD_CATEGORIES, `capacityEvidence[${index}].sourceCondition.loadCategory`);
    const spanType = enumValue(item?.sourceCondition?.spanType, SPAN_TYPES, `capacityEvidence[${index}].sourceCondition.spanType`);
    const supportSpacingM = positive(item?.sourceCondition?.supportSpacingM, `capacityEvidence[${index}].sourceCondition.supportSpacingM`);
    const overhangCondition = enumValue(item?.sourceCondition?.overhangCondition, OVERHANG_CONDITIONS, `capacityEvidence[${index}].sourceCondition.overhangCondition`);
    const sourceApplicability = normalizeSourceApplicability(item?.sourceApplicability ?? {});
    const coverage = productCoverage(sourceApplicability, detail);
    const applicableLimitStates = enumList(item?.applicableLimitStates, LIMIT_STATES, `capacityEvidence[${index}].applicableLimitStates`);
    if (!applicableLimitStates || !applicableLimitStates.length) throw new Error(`capacityEvidence[${index}].applicableLimitStates must identify at least one source-covered limit state.`);
    return {
      evidenceId,
      sourceType:enumValue(item?.sourceType, SOURCE_TYPES, `capacityEvidence[${index}].sourceType`),
      sourceReference:nonEmpty(item?.sourceReference, `capacityEvidence[${index}].sourceReference`),
      sourceDocumentId:nonEmpty(item?.sourceDocumentId, `capacityEvidence[${index}].sourceDocumentId`),
      sourceCheckedDate:dateText(item?.sourceCheckedDate, `capacityEvidence[${index}].sourceCheckedDate`),
      sourceCondition:{
        loadDirection,
        loadCategory,
        sourceLoadCategoryLabel:nonEmpty(item?.sourceCondition?.sourceLoadCategoryLabel, `capacityEvidence[${index}].sourceCondition.sourceLoadCategoryLabel`),
        spanType,
        supportSpacingM,
        overhangCondition,
        sourceConditionReference:nonEmpty(item?.sourceCondition?.sourceConditionReference, `capacityEvidence[${index}].sourceCondition.sourceConditionReference`)
      },
      capacity:{
        valueKPa:positive(item?.capacity?.valueKPa, `capacityEvidence[${index}].capacity.valueKPa`),
        capacityType:enumValue(item?.capacity?.capacityType, CAPACITY_TYPES, `capacityEvidence[${index}].capacity.capacityType`),
        designBasis:enumValue(item?.capacity?.designBasis, DESIGN_BASES, `capacityEvidence[${index}].capacity.designBasis`),
        deflectionLimitRatio:item?.capacity?.deflectionLimitRatio == null ? null : positive(item.capacity.deflectionLimitRatio, `capacityEvidence[${index}].capacity.deflectionLimitRatio`),
        basisSourceReference:nonEmpty(item?.capacity?.basisSourceReference, `capacityEvidence[${index}].capacity.basisSourceReference`)
      },
      applicableLimitStates,
      limitStatesSourceReference:nonEmpty(item?.limitStatesSourceReference, `capacityEvidence[${index}].limitStatesSourceReference`),
      sourceApplicability,
      coverage,
      applicabilitySourceReference:nonEmpty(item?.applicabilitySourceReference, `capacityEvidence[${index}].applicabilitySourceReference`),
      note:nullableText(item?.note)
    };
  });
}

function buildRecord({ roofFastenerCapacityEvidenceAcceptance, capacityEvidence, note = null } = {}) {
  const upstream = clone(roofFastenerCapacityEvidenceAcceptance);
  validateRoofFastenerCapacityEvidenceAcceptance(upstream);
  const detail = clone(upstream.attachmentDetail);
  const evidence = normalizeEvidence(capacityEvidence, detail);
  const productComplete = evidence.filter((item) => item.coverage.productApplicabilityStatus === 'PRODUCT_APPLICABILITY_COMPLETE').map((item) => item.evidenceId);
  const referenceOnly = evidence.filter((item) => item.coverage.productApplicabilityStatus !== 'PRODUCT_APPLICABILITY_COMPLETE').map((item) => item.evidenceId);
  return {
    schemaVersion:ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_SCHEMA,
    status:STATUS,
    upstreamRoofFastenerCapacityEvidenceAcceptance:upstream,
    acceptedRoofSheetDetail:detail.roofSheet,
    capacityEvidence:evidence,
    integrity:{
      acceptedRoofSheetDetailFingerprint:fingerprint(detail.roofSheet),
      capacityEvidenceFingerprint:fingerprint(evidence)
    },
    summary:{
      evidenceCount:evidence.length,
      productApplicabilityCompleteEvidenceIds:productComplete,
      referenceOnlyEvidenceIds:referenceOnly,
      anyProductApplicableEvidence:productComplete.length > 0,
      projectPanelSpanConfigurationStatus:'UNRESOLVED',
      projectDemandCapacityUtilizationStatus:'UNRESOLVED',
      localSupportContactCapacityStatus:'UNRESOLVED',
      roofSystemPass:null
    },
    sourceBasis:{ evidenceRule:EVIDENCE_RULE, spanRule:SPAN_RULE, directionRule:DIRECTION_RULE, basisRule:BASIS_RULE },
    implementation:{
      exactRoofSheetProductDetailReused:true,
      sourceBackedPositivePressureCapacityEvidenceStored:true,
      productApplicabilityCoverageChecked:true,
      sourceSpanSupportConditionsPreserved:true,
      projectPanelSpanConfigurationImplemented:false,
      projectSpanApplicabilityImplemented:false,
      positivePressurePanelDemandImplemented:false,
      demandCapacityBasisAlignmentImplemented:false,
      positivePressurePanelUtilizationImplemented:false,
      localSheetToPurlinContactFootprintImplemented:false,
      localSheetContactCapacityImplemented:false,
      purlinLocalBearingWebCripplingCapacityImplemented:false,
      screwCompressionBearingShearCapacityImplemented:false,
      roofSystemPassPromotionImplemented:false
    },
    note:nullableText(note),
    boundary:BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    roofFastenerCapacityEvidenceAcceptance:record.upstreamRoofFastenerCapacityEvidenceAcceptance,
    capacityEvidence:record.capacityEvidence.map((item) => ({
      evidenceId:item.evidenceId,
      sourceType:item.sourceType,
      sourceReference:item.sourceReference,
      sourceDocumentId:item.sourceDocumentId,
      sourceCheckedDate:item.sourceCheckedDate,
      sourceCondition:clone(item.sourceCondition),
      capacity:clone(item.capacity),
      applicableLimitStates:clone(item.applicableLimitStates),
      limitStatesSourceReference:item.limitStatesSourceReference,
      sourceApplicability:clone(item.sourceApplicability),
      applicabilitySourceReference:item.applicabilitySourceReference,
      note:item.note
    })),
    note:record.note
  };
}

export function createRoofSheetPositivePressureCapacityEvidenceAcceptance(input = {}) {
  const record = buildRecord(input);
  validateRoofSheetPositivePressureCapacityEvidenceAcceptance(record);
  return clone(record);
}

export function validateRoofSheetPositivePressureCapacityEvidenceAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof-sheet positive-pressure capacity-evidence record must be an object.');
  if (record.schemaVersion !== ROOF_SHEET_POSITIVE_PRESSURE_CAPACITY_EVIDENCE_SCHEMA) throw new Error(`Unsupported roof-sheet positive-pressure capacity-evidence schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof-sheet positive-pressure capacity-evidence status changed.');
  if (record.sourceBasis?.evidenceRule !== EVIDENCE_RULE || record.sourceBasis?.spanRule !== SPAN_RULE || record.sourceBasis?.directionRule !== DIRECTION_RULE || record.sourceBasis?.basisRule !== BASIS_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof-sheet positive-pressure capacity-evidence engineering boundary changed.');
  }
  if (record.integrity?.acceptedRoofSheetDetailFingerprint !== fingerprint(record.acceptedRoofSheetDetail)
    || record.integrity?.capacityEvidenceFingerprint !== fingerprint(record.capacityEvidence)) {
    throw new Error('Roof-sheet positive-pressure capacity-evidence record changed from its deterministic accepted evidence/detail integrity.');
  }
  if (record.summary?.projectPanelSpanConfigurationStatus !== 'UNRESOLVED'
    || record.summary?.projectDemandCapacityUtilizationStatus !== 'UNRESOLVED'
    || record.summary?.localSupportContactCapacityStatus !== 'UNRESOLVED'
    || record.summary?.roofSystemPass !== null) {
    throw new Error('Roof-sheet positive-pressure evidence acceptance must not promote project span applicability, utilization, local contact capacity or roof-system PASS.');
  }
  const expectedImplementation = {
    exactRoofSheetProductDetailReused:true,
    sourceBackedPositivePressureCapacityEvidenceStored:true,
    productApplicabilityCoverageChecked:true,
    sourceSpanSupportConditionsPreserved:true,
    projectPanelSpanConfigurationImplemented:false,
    projectSpanApplicabilityImplemented:false,
    positivePressurePanelDemandImplemented:false,
    demandCapacityBasisAlignmentImplemented:false,
    positivePressurePanelUtilizationImplemented:false,
    localSheetToPurlinContactFootprintImplemented:false,
    localSheetContactCapacityImplemented:false,
    purlinLocalBearingWebCripplingCapacityImplemented:false,
    screwCompressionBearingShearCapacityImplemented:false,
    roofSystemPassPromotionImplemented:false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof-sheet positive-pressure capacity-evidence record was improperly promoted beyond evidence acceptance.');
  validateRoofFastenerCapacityEvidenceAcceptance(record.upstreamRoofFastenerCapacityEvidenceAcceptance);
  if (!sameRecord(record.acceptedRoofSheetDetail, record.upstreamRoofFastenerCapacityEvidenceAcceptance.attachmentDetail.roofSheet)) {
    throw new Error('Accepted roof-sheet detail no longer matches the upstream attachment-detail evidence record.');
  }
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof-sheet positive-pressure capacity-evidence record changed from its deterministic detail/evidence inputs.');
  return true;
}

export function serializeRoofSheetPositivePressureCapacityEvidenceAcceptance(record) {
  validateRoofSheetPositivePressureCapacityEvidenceAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofSheetPositivePressureCapacityEvidenceAcceptance(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofSheetPositivePressureCapacityEvidenceAcceptance(parsed);
  return clone(parsed);
}
