import { validateBaseInternalPressureCoefficient } from './windInternalPressureCoefficient.js';
import { validateLargeVolumeInternalPressureReduction } from './windLargeVolumeReduction.js';
import { nscp2015BuildingVelocityPressure } from './windVelocityPressure.js';

export const WIND_CANDC_INTERNAL_PRESSURE_VELOCITY_SCHEMA = 'futoltech.wind-candc-internal-pressure-velocity/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const POSITIVE_PARTIAL_CHOICES = Object.freeze(['highest-opening-qz', 'conservative-qh']);
const EPS = 1e-12;

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

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0)) throw new Error(`${label} must be greater than zero.`);
  return number;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function normalizedUpstream({ baseInternalPressureCoefficient = null, largeVolumeReduction = null } = {}) {
  if (largeVolumeReduction != null) {
    validateLargeVolumeInternalPressureReduction(largeVolumeReduction);
    const reduction = clone(largeVolumeReduction);
    return {
      sourceType: 'large-volume-ri-record',
      sourceRecord: reduction,
      baseRecord: reduction.upstreamBaseInternalPressureCoefficient,
      enclosureClassification: reduction.enclosureClassification,
      gcpiCases: [...reduction.adjustedGcpiCases]
    };
  }
  validateBaseInternalPressureCoefficient(baseInternalPressureCoefficient);
  const base = clone(baseInternalPressureCoefficient);
  if (base.enclosureClassification === 'partially-enclosed') {
    throw new Error('Partially enclosed C&C internal-pressure velocity selection requires a resolved largeVolumeReduction record so Ri cannot be skipped.');
  }
  return {
    sourceType: 'base-gcpi-record',
    sourceRecord: base,
    baseRecord: base,
    enclosureClassification: base.enclosureClassification,
    gcpiCases: [...base.baseGcpiCases]
  };
}

function windProjectInputFromBase(baseRecord) {
  return baseRecord.upstreamWindPressureContextAcceptance.upstreamWindProjectInputAcceptance;
}

function velocityAtHeight(baseRecord, heightM) {
  const wind = windProjectInputFromBase(baseRecord);
  return nscp2015BuildingVelocityPressure({
    heightM,
    exposureCategory: wind.exposure.category,
    basicWindSpeedKph: wind.basicWindSpeed.valueKph,
    topographicFactorKzt: wind.topography.kzt
  });
}

function expectedProcedure(meanRoofHeightM) {
  return meanRoofHeightM <= 18
    ? 'NSCP_207E_4_CANDC_H_LE_18M'
    : 'NSCP_207E_6_CANDC_H_GT_18M';
}

function caseLabel(gcpi) {
  if (gcpi > 0) return 'positive-internal-pressure';
  if (gcpi < 0) return 'negative-internal-pressure';
  return 'zero-internal-pressure';
}

export function resolveCandCInternalPressureVelocity({
  baseInternalPressureCoefficient = null,
  largeVolumeReduction = null,
  highestOpeningHeightM = null,
  highestOpeningHeightSourceReference = null,
  positivePartialSelection = 'highest-opening-qz',
  note = null
} = {}) {
  const upstream = normalizedUpstream({ baseInternalPressureCoefficient, largeVolumeReduction });
  const base = upstream.baseRecord;
  if (base.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) {
    throw new Error(`C&C internal-pressure velocity selection supports only '${SUPPORTED_CODE_PROFILE}'.`);
  }
  if (!['enclosed', 'partially-enclosed'].includes(upstream.enclosureClassification)) {
    throw new Error('This C&C internal-pressure velocity slice is limited to enclosed and partially enclosed buildings under NSCP 207E.4 / 207E.6.');
  }

  const context = base.upstreamWindPressureContextAcceptance;
  const meanRoofHeightM = positive(context.roofGeometry.meanRoofHeightM, 'meanRoofHeightM');
  const procedure = expectedProcedure(meanRoofHeightM);
  const qh = velocityAtHeight(base, meanRoofHeightM);
  const partial = upstream.enclosureClassification === 'partially-enclosed';

  let opening = {
    required: false,
    heightM: null,
    sourceReference: null,
    directVelocityPressure: null
  };

  if (partial && procedure === 'NSCP_207E_6_CANDC_H_GT_18M') {
    if (!POSITIVE_PARTIAL_CHOICES.includes(positivePartialSelection)) {
      throw new Error(`positivePartialSelection must be one of: ${POSITIVE_PARTIAL_CHOICES.join(', ')}.`);
    }
    const zOpening = positive(highestOpeningHeightM, 'highestOpeningHeightM');
    if (zOpening > meanRoofHeightM + EPS) {
      throw new Error('highestOpeningHeightM must not exceed mean roof height for the verified conservative-qh comparison in this slice.');
    }
    const sourceReference = nonEmpty(highestOpeningHeightSourceReference, 'highestOpeningHeightSourceReference');
    opening = {
      required: true,
      heightM: zOpening,
      sourceReference,
      directVelocityPressure: velocityAtHeight(base, zOpening)
    };
  }

  const cases = upstream.gcpiCases.map((gcpi) => {
    const signCase = caseLabel(gcpi);
    let qi = qh;
    let qiSelection = 'mean-roof-height-qh';
    let ruleReason = procedure === 'NSCP_207E_4_CANDC_H_LE_18M'
      ? 'NSCP 2015 Equation 207E.4-1 applies qh to the complete C&C pressure bracket for enclosed and partially enclosed buildings with h <= 18 m.'
      : 'NSCP 2015 Section 207E.6.2 uses qi = qh for enclosed buildings and for negative internal pressure in partially enclosed buildings.';

    if (partial && procedure === 'NSCP_207E_6_CANDC_H_GT_18M' && gcpi > 0) {
      if (positivePartialSelection === 'highest-opening-qz') {
        qi = opening.directVelocityPressure;
        qiSelection = 'highest-opening-qz';
        ruleReason = 'NSCP 2015 Section 207E.6.2 uses qi = qz at the level of the highest opening that can affect positive internal pressure in a partially enclosed building.';
      } else {
        qi = qh;
        qiSelection = 'conservative-qh';
        ruleReason = 'NSCP 2015 Section 207E.6.2 permits qi = qh as a conservative alternative for positive internal pressure in a partially enclosed building.';
      }
    }

    return {
      signCase,
      gcpi,
      qiSelection,
      qiHeightM: qi.inputs.heightM,
      qiKPa: qi.result.qKPa,
      internalPressureTermKPa: qi.result.qKPa * gcpi,
      velocityPressureRecord: qi,
      ruleReason
    };
  });

  const record = {
    schemaVersion: WIND_CANDC_INTERNAL_PRESSURE_VELOCITY_SCHEMA,
    status: 'CANDC_INTERNAL_PRESSURE_TERM_RESOLVED_EXTERNAL_PRESSURE_BLOCKED',
    adoptedCodeProfileId: base.adoptedCodeProfileId,
    upstreamCoefficientSourceType: upstream.sourceType,
    upstreamCoefficientRecord: upstream.sourceRecord,
    enclosureClassification: upstream.enclosureClassification,
    meanRoofHeight: {
      valueM: meanRoofHeightM,
      sourceReference: context.roofGeometry.meanRoofHeightSourceReference
    },
    procedure: {
      id: procedure,
      family: 'NSCP_207E_COMPONENTS_AND_CLADDING',
      lowRiseBoundaryM: 18,
      ruleReference: procedure === 'NSCP_207E_4_CANDC_H_LE_18M'
        ? 'NSCP 2015 Section 207E.4.2 / Equation 207E.4-1; verify against an authorized code copy before project use.'
        : 'NSCP 2015 Section 207E.6.2 / Equation 207E.6-1; verify against an authorized code copy before project use.'
    },
    qhVelocityPressure: qh,
    positivePartiallyEnclosedSelection: partial && procedure === 'NSCP_207E_6_CANDC_H_GT_18M'
      ? positivePartialSelection
      : 'NOT_APPLICABLE',
    highestOpening: opening,
    cases,
    implementation: {
      candcInternalPressureVelocitySelectionImplemented: true,
      candcInternalPressureTermImplemented: true,
      mwfrsInternalPressureVelocitySelectionImplemented: false,
      externalPressureCoefficientImplemented: false,
      effectiveWindAreaImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      internalExternalPressureCombinationImplemented: false,
      finalRoofPressureImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'This record resolves only the NSCP 2015 Components-and-Cladding internal-pressure velocity basis and qi*GCpi term for enclosed/partially enclosed buildings. It does not select external GCp, effective wind area, roof field/edge/corner zones, combine internal and external pressure, or calculate final Roof Bay code pressure.'
  };

  validateCandCInternalPressureVelocity(record);
  return clone(record);
}

export function validateCandCInternalPressureVelocity(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('C&C internal-pressure velocity record must be an object.');
  if (record.schemaVersion !== WIND_CANDC_INTERNAL_PRESSURE_VELOCITY_SCHEMA) throw new Error(`Unsupported C&C internal-pressure velocity schema '${record.schemaVersion}'.`);
  if (record.status !== 'CANDC_INTERNAL_PRESSURE_TERM_RESOLVED_EXTERNAL_PRESSURE_BLOCKED') throw new Error('C&C internal-pressure velocity status is unsupported.');
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) throw new Error('C&C internal-pressure velocity code profile is unsupported.');

  const sourceType = record.upstreamCoefficientSourceType;
  let normalized;
  if (sourceType === 'large-volume-ri-record') {
    normalized = normalizedUpstream({ largeVolumeReduction: record.upstreamCoefficientRecord });
  } else if (sourceType === 'base-gcpi-record') {
    normalized = normalizedUpstream({ baseInternalPressureCoefficient: record.upstreamCoefficientRecord });
  } else {
    throw new Error('C&C internal-pressure coefficient source type is unsupported.');
  }
  if (normalized.enclosureClassification !== record.enclosureClassification) throw new Error('C&C enclosure classification must match the upstream coefficient record.');

  const base = normalized.baseRecord;
  const context = base.upstreamWindPressureContextAcceptance;
  const meanRoofHeightM = positive(record.meanRoofHeight?.valueM, 'meanRoofHeight.valueM');
  if (!nearlyEqual(meanRoofHeightM, context.roofGeometry.meanRoofHeightM)) throw new Error('C&C mean roof height must match the accepted pressure-context record.');
  if (record.meanRoofHeight?.sourceReference !== context.roofGeometry.meanRoofHeightSourceReference) throw new Error('C&C mean roof height source must match the accepted pressure-context record.');
  const procedure = expectedProcedure(meanRoofHeightM);
  if (record.procedure?.id !== procedure) throw new Error('C&C procedure must be deterministically selected from mean roof height.');
  if (record.procedure?.family !== 'NSCP_207E_COMPONENTS_AND_CLADDING' || record.procedure?.lowRiseBoundaryM !== 18) throw new Error('C&C procedure family/boundary changed.');

  const expectedQh = velocityAtHeight(base, meanRoofHeightM);
  if (!nearlyEqual(record.qhVelocityPressure?.result?.qKPa, expectedQh.result.qKPa)) throw new Error('C&C qh must be deterministically derived from accepted wind inputs at mean roof height.');

  const partial = record.enclosureClassification === 'partially-enclosed';
  let directOpeningQ = null;
  if (partial && procedure === 'NSCP_207E_6_CANDC_H_GT_18M') {
    if (!POSITIVE_PARTIAL_CHOICES.includes(record.positivePartiallyEnclosedSelection)) throw new Error('Positive partially enclosed qi selection is unsupported.');
    if (record.highestOpening?.required !== true) throw new Error('Highest opening must be explicit for h > 18 m partially enclosed C&C.');
    const z = positive(record.highestOpening.heightM, 'highestOpening.heightM');
    if (z > meanRoofHeightM + EPS) throw new Error('highestOpening.heightM exceeds verified mean-roof-height comparison boundary.');
    nonEmpty(record.highestOpening.sourceReference, 'highestOpening.sourceReference');
    directOpeningQ = velocityAtHeight(base, z);
    if (!nearlyEqual(record.highestOpening.directVelocityPressure?.result?.qKPa, directOpeningQ.result.qKPa)) throw new Error('Highest-opening qz must be deterministically derived from accepted wind inputs.');
  } else {
    if (record.positivePartiallyEnclosedSelection !== 'NOT_APPLICABLE') throw new Error('Positive partially enclosed selection must be NOT_APPLICABLE for this procedure/classification.');
    if (record.highestOpening?.required !== false || record.highestOpening?.heightM !== null || record.highestOpening?.sourceReference !== null || record.highestOpening?.directVelocityPressure !== null) {
      throw new Error('Highest-opening data must remain empty when not required by this C&C slice.');
    }
  }

  if (!Array.isArray(record.cases) || record.cases.length !== normalized.gcpiCases.length) throw new Error('C&C internal-pressure cases must match the upstream GCpi case count.');
  normalized.gcpiCases.forEach((gcpi, index) => {
    const actual = record.cases[index];
    if (!nearlyEqual(actual.gcpi, gcpi)) throw new Error('C&C GCpi case detached from upstream coefficient record.');
    const expectedLabel = caseLabel(gcpi);
    if (actual.signCase !== expectedLabel) throw new Error('C&C internal-pressure sign case changed.');
    let expectedQi = expectedQh;
    let expectedSelection = 'mean-roof-height-qh';
    if (partial && procedure === 'NSCP_207E_6_CANDC_H_GT_18M' && gcpi > 0) {
      expectedSelection = record.positivePartiallyEnclosedSelection;
      expectedQi = expectedSelection === 'highest-opening-qz' ? directOpeningQ : expectedQh;
    }
    if (actual.qiSelection !== expectedSelection) throw new Error('C&C qi selection does not match the verified NSCP procedure rule.');
    if (!nearlyEqual(actual.qiHeightM, expectedQi.inputs.heightM)) throw new Error('C&C qi height is not deterministic.');
    if (!nearlyEqual(actual.qiKPa, expectedQi.result.qKPa)) throw new Error('C&C qi pressure is not deterministic.');
    if (!nearlyEqual(actual.internalPressureTermKPa, expectedQi.result.qKPa * gcpi)) throw new Error('C&C qi*GCpi internal pressure term is not deterministic.');
  });

  const implemented = record.implementation;
  if (implemented?.candcInternalPressureVelocitySelectionImplemented !== true || implemented?.candcInternalPressureTermImplemented !== true) throw new Error('C&C internal-pressure implementation flags must remain true.');
  for (const key of ['mwfrsInternalPressureVelocitySelectionImplemented','externalPressureCoefficientImplemented','effectiveWindAreaImplemented','fieldEdgeCornerGeometryImplemented','internalExternalPressureCombinationImplemented','finalRoofPressureImplemented']) {
    if (implemented?.[key] !== false) throw new Error(`${key} must remain false in this C&C internal-pressure slice.`);
  }
  if (typeof record.boundary !== 'string' || !record.boundary.trim()) throw new Error('C&C internal-pressure boundary is required.');
  return true;
}

export function serializeCandCInternalPressureVelocity(record) {
  validateCandCInternalPressureVelocity(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseCandCInternalPressureVelocity(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateCandCInternalPressureVelocity(parsed);
  return clone(parsed);
}