import { validateWindProjectInputAcceptance } from './windProjectInputAcceptance.js';

export const WIND_PRESSURE_CONTEXT_ACCEPTANCE_SCHEMA = 'futoltech.wind-pressure-context-acceptance/1';

export const ENCLOSURE_CLASSIFICATIONS = Object.freeze([
  'enclosed',
  'partially-enclosed',
  'open'
]);

export const ROOF_FORMS = Object.freeze([
  'gable',
  'hip',
  'monoslope',
  'flat',
  'other'
]);

const EPS = 1e-9;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be a positive finite number.`);
  return number;
}

function bounded(value, label, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must lie from ${min} to ${max}.`);
  }
  return number;
}

function enumValue(value, label, allowed) {
  const normalized = text(value, label).toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of ${allowed.join(', ')}.`);
  return normalized;
}

export function createWindPressureContextAcceptance({
  windProjectInputAcceptance,
  enclosureClassification,
  enclosureClassificationSourceReference,
  openingsAssessmentSourceReference,
  roofForm,
  roofFormSourceReference,
  planLengthM,
  planWidthM,
  planDimensionSourceReference,
  meanRoofHeightM,
  meanRoofHeightSourceReference,
  roofSlopeDeg,
  roofSlopeSourceReference,
  note = null
} = {}) {
  validateWindProjectInputAcceptance(windProjectInputAcceptance);
  const upstream = clone(windProjectInputAcceptance);
  const meanHeight = positive(meanRoofHeightM, 'meanRoofHeightM');
  if (Math.abs(meanHeight - upstream.height.valueM) > EPS) {
    throw new Error('meanRoofHeightM must match the accepted wind-project evaluation/mean-roof height in this M3 pressure-context slice.');
  }

  const record = {
    schemaVersion: WIND_PRESSURE_CONTEXT_ACCEPTANCE_SCHEMA,
    status: 'ACCEPTED_FOR_PRESSURE_COEFFICIENT_INPUT_CONTEXT_ONLY',
    adoptedCodeProfileId: upstream.adoptedCodeProfileId,
    upstreamWindProjectInputAcceptance: upstream,
    enclosure: {
      classification: enumValue(enclosureClassification, 'enclosureClassification', ENCLOSURE_CLASSIFICATIONS),
      classificationStatus: 'ENGINEER_DECLARED_PROJECT_INPUT',
      classificationSourceReference: text(enclosureClassificationSourceReference, 'enclosureClassificationSourceReference'),
      openingsAssessmentSourceReference: text(openingsAssessmentSourceReference, 'openingsAssessmentSourceReference'),
      ruleReference: 'NSCP 2015 Sections 207A.10.1 and 207A.10.2; enclosure definitions are in Section 207A.2. Verify against an authorized code copy before project use.'
    },
    roofGeometry: {
      roofForm: enumValue(roofForm, 'roofForm', ROOF_FORMS),
      roofFormSourceReference: text(roofFormSourceReference, 'roofFormSourceReference'),
      planLengthM: positive(planLengthM, 'planLengthM'),
      planWidthM: positive(planWidthM, 'planWidthM'),
      planDimensionSourceReference: text(planDimensionSourceReference, 'planDimensionSourceReference'),
      meanRoofHeightM: meanHeight,
      meanRoofHeightSourceReference: text(meanRoofHeightSourceReference, 'meanRoofHeightSourceReference'),
      roofSlopeDeg: bounded(roofSlopeDeg, 'roofSlopeDeg', 0, 90),
      roofSlopeSourceReference: text(roofSlopeSourceReference, 'roofSlopeSourceReference')
    },
    acceptance: {
      enclosureClassificationTraceable: true,
      roofGeometryTraceable: true,
      automaticEnclosureClassificationImplemented: false,
      codeDefinitionThresholdEvaluationImplemented: false,
      internalPressureCoefficientImplemented: false,
      externalPressureCoefficientImplemented: false,
      effectiveWindAreaImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      finalRoofPressureImplemented: false
    },
    note: note == null ? null : String(note),
    boundary: 'This record accepts an engineer-declared enclosure classification plus source-referenced roof/building geometry for future pressure-coefficient and zoning work. It does not automatically classify enclosure from openings, evaluate code definition thresholds, select GCpi/Cp/GCp values, derive field/edge/corner zones, or calculate final roof pressure.'
  };

  validateWindPressureContextAcceptance(record);
  return clone(record);
}

export function validateWindPressureContextAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind pressure context acceptance must be an object.');
  if (record.schemaVersion !== WIND_PRESSURE_CONTEXT_ACCEPTANCE_SCHEMA) throw new Error(`Unsupported wind pressure context acceptance schema '${record.schemaVersion}'.`);
  if (record.status !== 'ACCEPTED_FOR_PRESSURE_COEFFICIENT_INPUT_CONTEXT_ONLY') throw new Error('Wind pressure context acceptance status is unsupported.');

  validateWindProjectInputAcceptance(record.upstreamWindProjectInputAcceptance);
  if (record.adoptedCodeProfileId !== record.upstreamWindProjectInputAcceptance.adoptedCodeProfileId) {
    throw new Error('Wind pressure context code profile must match its upstream accepted wind-project input record.');
  }

  enumValue(record.enclosure?.classification, 'enclosure.classification', ENCLOSURE_CLASSIFICATIONS);
  if (record.enclosure?.classificationStatus !== 'ENGINEER_DECLARED_PROJECT_INPUT') {
    throw new Error('enclosure.classificationStatus must remain ENGINEER_DECLARED_PROJECT_INPUT until automatic code-definition evaluation is implemented.');
  }
  text(record.enclosure?.classificationSourceReference, 'enclosure.classificationSourceReference');
  text(record.enclosure?.openingsAssessmentSourceReference, 'enclosure.openingsAssessmentSourceReference');
  text(record.enclosure?.ruleReference, 'enclosure.ruleReference');

  enumValue(record.roofGeometry?.roofForm, 'roofGeometry.roofForm', ROOF_FORMS);
  text(record.roofGeometry?.roofFormSourceReference, 'roofGeometry.roofFormSourceReference');
  positive(record.roofGeometry?.planLengthM, 'roofGeometry.planLengthM');
  positive(record.roofGeometry?.planWidthM, 'roofGeometry.planWidthM');
  text(record.roofGeometry?.planDimensionSourceReference, 'roofGeometry.planDimensionSourceReference');
  const meanHeight = positive(record.roofGeometry?.meanRoofHeightM, 'roofGeometry.meanRoofHeightM');
  text(record.roofGeometry?.meanRoofHeightSourceReference, 'roofGeometry.meanRoofHeightSourceReference');
  bounded(record.roofGeometry?.roofSlopeDeg, 'roofGeometry.roofSlopeDeg', 0, 90);
  text(record.roofGeometry?.roofSlopeSourceReference, 'roofGeometry.roofSlopeSourceReference');
  if (Math.abs(meanHeight - record.upstreamWindProjectInputAcceptance.height.valueM) > EPS) {
    throw new Error('roofGeometry.meanRoofHeightM must match the upstream accepted wind-project height.');
  }

  if (record.acceptance?.enclosureClassificationTraceable !== true) throw new Error('enclosureClassificationTraceable must remain true.');
  if (record.acceptance?.roofGeometryTraceable !== true) throw new Error('roofGeometryTraceable must remain true.');
  for (const key of [
    'automaticEnclosureClassificationImplemented',
    'codeDefinitionThresholdEvaluationImplemented',
    'internalPressureCoefficientImplemented',
    'externalPressureCoefficientImplemented',
    'effectiveWindAreaImplemented',
    'fieldEdgeCornerGeometryImplemented',
    'finalRoofPressureImplemented'
  ]) {
    if (record.acceptance?.[key] !== false) throw new Error(`${key} must remain false in this M3 pressure-context slice.`);
  }
  text(record.boundary, 'boundary');
  return true;
}

export function serializeWindPressureContextAcceptance(record) {
  validateWindPressureContextAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindPressureContextAcceptance(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindPressureContextAcceptance(parsed);
  return clone(parsed);
}
