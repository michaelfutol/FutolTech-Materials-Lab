import { nscp2015BuildingVelocityPressure } from './windVelocityPressure.js';
import { validateBaseInternalPressureCoefficient } from './windInternalPressureCoefficient.js';
import { validateLargeVolumeInternalPressureReduction } from './windLargeVolumeReduction.js';

export const WIND_INTERNAL_PRESSURE_TERM_SCHEMA = 'futoltech.wind-internal-pressure-term/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const POSITIVE_PARTIAL_SELECTIONS = Object.freeze(['conservative-qh', 'highest-opening-qz']);
const EPS = 1e-10;

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

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0)) throw new Error(`${label} must be a positive finite number.`);
  return number;
}

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function upstreamWindProject(base) {
  return base.upstreamWindPressureContextAcceptance.upstreamWindProjectInputAcceptance;
}

function velocityPressureAtHeight(windProject, heightM) {
  return nscp2015BuildingVelocityPressure({
    heightM,
    exposureCategory: windProject.exposure.category,
    basicWindSpeedKph: windProject.basicWindSpeed.valueKph,
    topographicFactorKzt: windProject.topography.kzt
  });
}

function adjustedGcpiCases(base, largeVolumeReduction) {
  if (base.enclosureClassification !== 'partially-enclosed') return [...base.baseGcpiCases];
  if (!largeVolumeReduction) throw new Error('partially-enclosed internal pressure term requires a resolved largeVolumeReduction record, including the explicit Ri=1 conservative/non-applicable path.');
  validateLargeVolumeInternalPressureReduction(largeVolumeReduction);
  if (JSON.stringify(stable(largeVolumeReduction.upstreamBaseInternalPressureCoefficient)) !== JSON.stringify(stable(base))) {
    throw new Error('largeVolumeReduction must reference the exact supplied baseInternalPressureCoefficient record.');
  }
  return [...largeVolumeReduction.adjustedGcpiCases];
}

export function resolveInternalPressureTerm({
  baseInternalPressureCoefficient,
  largeVolumeReduction = null,
  positivePartiallyEnclosedVelocitySelection = 'conservative-qh',
  highestOpeningHeightM = null,
  highestOpeningHeightSourceReference = null,
  note = null
} = {}) {
  validateBaseInternalPressureCoefficient(baseInternalPressureCoefficient);
  const base = clone(baseInternalPressureCoefficient);
  if (base.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) throw new Error(`Internal pressure term supports only '${SUPPORTED_CODE_PROFILE}'.`);

  const windProject = upstreamWindProject(base);
  const classification = base.enclosureClassification;
  const gcpiCases = adjustedGcpiCases(base, largeVolumeReduction);
  const qh = velocityPressureAtHeight(windProject, windProject.height.valueM);

  let openingHeight = null;
  let openingHeightRef = null;
  let qPositive = qh;
  let positiveVelocityBasis = 'qh-at-mean-roof-height';

  if (classification === 'partially-enclosed') {
    if (!POSITIVE_PARTIAL_SELECTIONS.includes(positivePartiallyEnclosedVelocitySelection)) {
      throw new Error(`positivePartiallyEnclosedVelocitySelection must be one of ${POSITIVE_PARTIAL_SELECTIONS.join(', ')}.`);
    }
    if (positivePartiallyEnclosedVelocitySelection === 'highest-opening-qz') {
      openingHeight = positive(highestOpeningHeightM, 'highestOpeningHeightM');
      openingHeightRef = nonEmpty(highestOpeningHeightSourceReference, 'highestOpeningHeightSourceReference');
      qPositive = velocityPressureAtHeight(windProject, openingHeight);
      positiveVelocityBasis = 'qz-at-highest-opening';
    } else if (highestOpeningHeightM != null || highestOpeningHeightSourceReference != null) {
      throw new Error('Conservative qh selection must not carry unused highest-opening inputs.');
    }
  } else if (highestOpeningHeightM != null || highestOpeningHeightSourceReference != null) {
    throw new Error('Highest-opening inputs are only applicable to partially enclosed positive internal pressure evaluation.');
  }

  const cases = gcpiCases.map((gcpi) => {
    const positiveInternal = gcpi > 0;
    const qi = classification === 'open'
      ? qh
      : (classification === 'partially-enclosed' && positiveInternal ? qPositive : qh);
    return {
      gcpi,
      internalPressureSense: gcpi > 0 ? 'positive' : gcpi < 0 ? 'negative' : 'zero',
      velocityPressureBasis: classification === 'partially-enclosed' && positiveInternal ? positiveVelocityBasis : 'qh-at-mean-roof-height',
      qiKPa: qi.result.qKPa,
      internalPressureTermKPa: qi.result.qKPa * gcpi
    };
  });

  const record = {
    schemaVersion: WIND_INTERNAL_PRESSURE_TERM_SCHEMA,
    status: 'INTERNAL_PRESSURE_TERM_RESOLVED_EXTERNAL_PRESSURE_BLOCKED',
    adoptedCodeProfileId: base.adoptedCodeProfileId,
    upstreamBaseInternalPressureCoefficient: base,
    upstreamLargeVolumeReduction: classification === 'partially-enclosed' ? clone(largeVolumeReduction) : null,
    enclosureClassification: classification,
    velocityPressureInputs: {
      basicWindSpeedKph: windProject.basicWindSpeed.valueKph,
      exposureCategory: windProject.exposure.category,
      topographicFactorKzt: windProject.topography.kzt,
      meanRoofHeightM: windProject.height.valueM,
      meanRoofHeightSourceReference: windProject.height.sourceReference,
      highestOpeningHeightM: openingHeight,
      highestOpeningHeightSourceReference: openingHeightRef
    },
    selection: {
      positivePartiallyEnclosedVelocitySelection: classification === 'partially-enclosed'
        ? positivePartiallyEnclosedVelocitySelection
        : 'not-applicable'
    },
    qh: {
      heightM: qh.inputs.heightM,
      kz: qh.exposure.kz,
      qKPa: qh.result.qKPa
    },
    positivePartiallyEnclosedQz: classification === 'partially-enclosed' && positivePartiallyEnclosedVelocitySelection === 'highest-opening-qz'
      ? {
          heightM: qPositive.inputs.heightM,
          kz: qPositive.exposure.kz,
          qKPa: qPositive.result.qKPa
        }
      : null,
    gcpiCases,
    cases,
    basis: {
      ruleReference: 'NSCP 2015 directional-procedure internal-pressure velocity-pressure rules associated with the design wind-pressure equations; verify exact applicable procedure/section against an authorized code copy before project use.',
      selectionRule: 'qi = qh for enclosed buildings and for negative internal pressure in partially enclosed buildings; for positive internal pressure in partially enclosed buildings, qi = qz at the highest opening that can affect positive internal pressure, with qi = qh permitted as a conservative evaluation.',
      sourceStatus: 'SOURCE_REFERENCED_RULE_IMPLEMENTED_AUTHORIZED_COPY_REVIEW_REQUIRED'
    },
    implementation: {
      baseInternalPressureCoefficientImplemented: true,
      largeVolumeReductionFactorImplemented: classification === 'partially-enclosed',
      internalPressureVelocitySelectionImplemented: true,
      internalPressureTermImplemented: true,
      externalPressureCoefficientImplemented: false,
      effectiveWindAreaImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      finalRoofPressureImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'This record resolves qi and the signed internal-pressure term qi(GCpi) only. It does not select external pressure coefficients, combine external and internal pressure, determine effective wind area, create field/edge/corner zones, apply load combinations, or route code-derived pressure into Roof Bay.'
  };

  validateInternalPressureTerm(record);
  return clone(record);
}

export function validateInternalPressureTerm(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Internal pressure term record must be an object.');
  if (record.schemaVersion !== WIND_INTERNAL_PRESSURE_TERM_SCHEMA) throw new Error(`Unsupported internal pressure term schema '${record.schemaVersion}'.`);
  validateBaseInternalPressureCoefficient(record.upstreamBaseInternalPressureCoefficient);
  const base = record.upstreamBaseInternalPressureCoefficient;
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE || record.adoptedCodeProfileId !== base.adoptedCodeProfileId) throw new Error('Internal pressure term code profile is unsupported or mismatched.');
  if (record.enclosureClassification !== base.enclosureClassification) throw new Error('Internal pressure term enclosure classification must match upstream base GCpi.');
  if (record.status !== 'INTERNAL_PRESSURE_TERM_RESOLVED_EXTERNAL_PRESSURE_BLOCKED') throw new Error('Internal pressure term status changed.');

  const windProject = upstreamWindProject(base);
  const expectedGcpi = adjustedGcpiCases(base, record.upstreamLargeVolumeReduction);
  if (JSON.stringify(record.gcpiCases) !== JSON.stringify(expectedGcpi)) throw new Error('Internal pressure term GCpi cases do not match the validated upstream coefficient chain.');

  const qh = velocityPressureAtHeight(windProject, windProject.height.valueM);
  if (!nearlyEqual(record.qh?.heightM, qh.inputs.heightM) || !nearlyEqual(record.qh?.kz, qh.exposure.kz) || !nearlyEqual(record.qh?.qKPa, qh.result.qKPa)) {
    throw new Error('Internal pressure qh must be deterministically derived from the accepted wind project inputs.');
  }

  const classification = base.enclosureClassification;
  let qPositive = qh;
  let expectedPositiveBasis = 'qh-at-mean-roof-height';
  if (classification === 'partially-enclosed') {
    const selection = record.selection?.positivePartiallyEnclosedVelocitySelection;
    if (!POSITIVE_PARTIAL_SELECTIONS.includes(selection)) throw new Error('Partially enclosed positive internal-pressure velocity selection is unsupported.');
    if (selection === 'highest-opening-qz') {
      const z = positive(record.velocityPressureInputs?.highestOpeningHeightM, 'velocityPressureInputs.highestOpeningHeightM');
      nonEmpty(record.velocityPressureInputs?.highestOpeningHeightSourceReference, 'velocityPressureInputs.highestOpeningHeightSourceReference');
      qPositive = velocityPressureAtHeight(windProject, z);
      expectedPositiveBasis = 'qz-at-highest-opening';
      if (!record.positivePartiallyEnclosedQz || !nearlyEqual(record.positivePartiallyEnclosedQz.heightM, qPositive.inputs.heightM) || !nearlyEqual(record.positivePartiallyEnclosedQz.kz, qPositive.exposure.kz) || !nearlyEqual(record.positivePartiallyEnclosedQz.qKPa, qPositive.result.qKPa)) {
        throw new Error('Positive partially enclosed qz result must be deterministically derived from the highest-opening height.');
      }
    } else {
      if (record.velocityPressureInputs?.highestOpeningHeightM !== null || record.velocityPressureInputs?.highestOpeningHeightSourceReference !== null || record.positivePartiallyEnclosedQz !== null) {
        throw new Error('Conservative qh selection must not retain a highest-opening qz result.');
      }
    }
  } else {
    if (record.selection?.positivePartiallyEnclosedVelocitySelection !== 'not-applicable') throw new Error('Positive partially enclosed velocity selection must be not-applicable for this enclosure classification.');
    if (record.velocityPressureInputs?.highestOpeningHeightM !== null || record.velocityPressureInputs?.highestOpeningHeightSourceReference !== null || record.positivePartiallyEnclosedQz !== null) {
      throw new Error('Non-partially-enclosed records must not carry highest-opening qz data.');
    }
  }

  if (!Array.isArray(record.cases) || record.cases.length !== expectedGcpi.length) throw new Error('Internal pressure term cases must match the coefficient case count.');
  expectedGcpi.forEach((gcpi, index) => {
    const item = record.cases[index];
    if (!nearlyEqual(item?.gcpi, gcpi)) throw new Error('Internal pressure term case GCpi changed.');
    const expectedQi = classification === 'partially-enclosed' && gcpi > 0 ? qPositive.result.qKPa : qh.result.qKPa;
    const expectedBasis = classification === 'partially-enclosed' && gcpi > 0 ? expectedPositiveBasis : 'qh-at-mean-roof-height';
    if (item?.velocityPressureBasis !== expectedBasis) throw new Error('Internal pressure term velocity-pressure basis is inconsistent with the code selection rule.');
    if (!nearlyEqual(item?.qiKPa, expectedQi)) throw new Error('Internal pressure qi changed from the deterministic velocity-pressure result.');
    if (!nearlyEqual(item?.internalPressureTermKPa, expectedQi * gcpi)) throw new Error('Internal pressure term must equal qi multiplied by GCpi.');
  });

  const impl = record.implementation;
  if (impl?.baseInternalPressureCoefficientImplemented !== true || impl?.internalPressureVelocitySelectionImplemented !== true || impl?.internalPressureTermImplemented !== true) throw new Error('Implemented internal-pressure flags must remain true.');
  if (impl?.largeVolumeReductionFactorImplemented !== (classification === 'partially-enclosed')) throw new Error('Large-volume reduction implementation flag is inconsistent with enclosure classification.');
  for (const key of ['externalPressureCoefficientImplemented','effectiveWindAreaImplemented','fieldEdgeCornerGeometryImplemented','finalRoofPressureImplemented']) {
    if (impl?.[key] !== false) throw new Error(`${key} must remain false in the internal-pressure-term slice.`);
  }
  if (typeof record.basis?.selectionRule !== 'string' || !record.basis.selectionRule.includes('qi = qh')) throw new Error('Internal pressure velocity selection rule reference is required.');
  if (typeof record.boundary !== 'string' || !record.boundary.trim()) throw new Error('Internal pressure term boundary is required.');
  return true;
}

export function serializeInternalPressureTerm(record) {
  validateInternalPressureTerm(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseInternalPressureTerm(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateInternalPressureTerm(parsed);
  return clone(parsed);
}
