import { validateBaseInternalPressureCoefficient } from './windInternalPressureCoefficient.js';

export const WIND_LARGE_VOLUME_REDUCTION_SCHEMA = 'futoltech.wind-large-volume-reduction/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const APPLICATION_CHOICES = Object.freeze(['conservative-ri-1', 'equation-reduction']);
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

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

export function computeLargeVolumeReductionFactor({
  unpartitionedInternalVolumeM3,
  totalEnvelopeOpeningAreaM2
} = {}) {
  const vi = positive(unpartitionedInternalVolumeM3, 'unpartitionedInternalVolumeM3');
  const aog = positive(totalEnvelopeOpeningAreaM2, 'totalEnvelopeOpeningAreaM2');
  const ratio = vi / (6950 * aog);
  const equationRi = 0.5 * (1 + 1 / Math.sqrt(1 + ratio));
  if (!(equationRi > 0.5 && equationRi <= 1 + EPS)) {
    throw new Error('Computed Ri lies outside the expected NSCP large-volume equation range.');
  }
  return {
    unpartitionedInternalVolumeM3: vi,
    totalEnvelopeOpeningAreaM2: aog,
    dimensionlessRatioViOver6950Aog: ratio,
    equationRi: Math.min(1, equationRi)
  };
}

export function resolveLargeVolumeInternalPressureReduction({
  baseInternalPressureCoefficient,
  containsSingleUnpartitionedLargeVolume,
  applicabilitySourceReference,
  totalEnvelopeOpeningAreaM2 = null,
  openingAreaSourceReference = null,
  unpartitionedInternalVolumeM3 = null,
  internalVolumeSourceReference = null,
  applicationChoice = 'conservative-ri-1',
  note = null
} = {}) {
  validateBaseInternalPressureCoefficient(baseInternalPressureCoefficient);
  const base = clone(baseInternalPressureCoefficient);
  if (base.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) {
    throw new Error(`Ri implementation supports only '${SUPPORTED_CODE_PROFILE}'.`);
  }
  if (base.enclosureClassification !== 'partially-enclosed') {
    throw new Error('NSCP 2015 Section 207A.11.1.1 large-volume Ri applies only to a partially enclosed building in this implementation.');
  }
  if (typeof containsSingleUnpartitionedLargeVolume !== 'boolean') {
    throw new Error('containsSingleUnpartitionedLargeVolume must be explicitly true or false.');
  }
  const applicabilityRef = nonEmpty(applicabilitySourceReference, 'applicabilitySourceReference');

  let equation = null;
  let selectedRi = 1;
  let selectedChoice = 'not-applicable';
  let status = 'RI_NOT_APPLICABLE_ENGINEER_DECLARED';
  let applied = false;
  let facts = {
    containsSingleUnpartitionedLargeVolume: false,
    applicabilitySourceReference: applicabilityRef,
    totalEnvelopeOpeningAreaM2: null,
    openingAreaSourceReference: null,
    unpartitionedInternalVolumeM3: null,
    internalVolumeSourceReference: null
  };

  if (containsSingleUnpartitionedLargeVolume) {
    if (!APPLICATION_CHOICES.includes(applicationChoice)) {
      throw new Error(`applicationChoice must be one of: ${APPLICATION_CHOICES.join(', ')}.`);
    }
    const aogRef = nonEmpty(openingAreaSourceReference, 'openingAreaSourceReference');
    const viRef = nonEmpty(internalVolumeSourceReference, 'internalVolumeSourceReference');
    equation = computeLargeVolumeReductionFactor({
      unpartitionedInternalVolumeM3,
      totalEnvelopeOpeningAreaM2
    });
    selectedChoice = applicationChoice;
    selectedRi = applicationChoice === 'equation-reduction' ? equation.equationRi : 1;
    applied = applicationChoice === 'equation-reduction';
    status = applied ? 'RI_EQUATION_REDUCTION_SELECTED' : 'RI_1_CONSERVATIVE_SELECTED';
    facts = {
      containsSingleUnpartitionedLargeVolume: true,
      applicabilitySourceReference: applicabilityRef,
      totalEnvelopeOpeningAreaM2: equation.totalEnvelopeOpeningAreaM2,
      openingAreaSourceReference: aogRef,
      unpartitionedInternalVolumeM3: equation.unpartitionedInternalVolumeM3,
      internalVolumeSourceReference: viRef
    };
  }

  const adjustedGcpiCases = base.baseGcpiCases.map((value) => value * selectedRi);
  const record = {
    schemaVersion: WIND_LARGE_VOLUME_REDUCTION_SCHEMA,
    status,
    adoptedCodeProfileId: base.adoptedCodeProfileId,
    upstreamBaseInternalPressureCoefficient: base,
    enclosureClassification: base.enclosureClassification,
    projectFacts: facts,
    codeEquation: {
      ruleReference: 'NSCP 2015 Section 207A.11.1.1, Equation 207A.11-1. Verify against an authorized code copy before project use.',
      metricForm: 'Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0',
      conservativeAlternativePermitted: true,
      variables: {
        Aog: 'total area of openings in the building envelope (walls and roof), m2',
        Vi: 'unpartitioned internal volume, m3'
      },
      ...(equation ? {
        dimensionlessRatioViOver6950Aog: equation.dimensionlessRatioViOver6950Aog,
        equationRi: equation.equationRi
      } : {
        dimensionlessRatioViOver6950Aog: null,
        equationRi: null
      })
    },
    selection: {
      applicationChoice: selectedChoice,
      selectedRi,
      applied
    },
    baseGcpiCases: [...base.baseGcpiCases],
    adjustedGcpiCases,
    implementation: {
      baseInternalPressureCoefficientImplemented: true,
      largeVolumeReductionFactorImplemented: true,
      largeVolumeApplicabilityAutomaticallyDetermined: false,
      internalPressureVelocitySelectionImplemented: false,
      externalPressureCoefficientImplemented: false,
      effectiveWindAreaImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      finalRoofPressureImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'Ri applicability is an engineer-declared project fact in this slice. The software can preserve conservative Ri = 1.0 or calculate/select the verified large-volume equation for a qualifying partially enclosed single unpartitioned volume. It does not select internal-pressure velocity pressure, combine internal/external pressure, create roof zones, or calculate final roof pressure.'
  };

  validateLargeVolumeInternalPressureReduction(record);
  return clone(record);
}

export function validateLargeVolumeInternalPressureReduction(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Large-volume Ri record must be an object.');
  if (record.schemaVersion !== WIND_LARGE_VOLUME_REDUCTION_SCHEMA) throw new Error(`Unsupported large-volume Ri schema '${record.schemaVersion}'.`);
  validateBaseInternalPressureCoefficient(record.upstreamBaseInternalPressureCoefficient);
  const base = record.upstreamBaseInternalPressureCoefficient;
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE || record.adoptedCodeProfileId !== base.adoptedCodeProfileId) {
    throw new Error('Large-volume Ri code profile must match the supported upstream base-GCpi record.');
  }
  if (record.enclosureClassification !== 'partially-enclosed' || base.enclosureClassification !== 'partially-enclosed') {
    throw new Error('Large-volume Ri record must remain attached to a partially enclosed base-GCpi record.');
  }
  if (JSON.stringify(record.baseGcpiCases) !== JSON.stringify(base.baseGcpiCases)) {
    throw new Error('Large-volume Ri baseGcpiCases must match the upstream base-GCpi record exactly.');
  }
  nonEmpty(record.projectFacts?.applicabilitySourceReference, 'projectFacts.applicabilitySourceReference');
  if (typeof record.projectFacts?.containsSingleUnpartitionedLargeVolume !== 'boolean') {
    throw new Error('Large-volume Ri applicability project fact must be explicit.');
  }
  if (typeof record.codeEquation?.ruleReference !== 'string' || !record.codeEquation.ruleReference.includes('207A.11.1.1')) {
    throw new Error('Large-volume Ri rule reference is required.');
  }
  if (record.codeEquation?.metricForm !== 'Ri = 0.5 * (1 + 1 / sqrt(1 + Vi / (6950 * Aog))) <= 1.0') {
    throw new Error('Large-volume Ri metric equation changed.');
  }
  if (record.codeEquation?.conservativeAlternativePermitted !== true) throw new Error('Ri = 1.0 conservative alternative must remain explicit.');

  const qualifies = record.projectFacts.containsSingleUnpartitionedLargeVolume;
  let expectedRi = 1;
  let expectedChoice = 'not-applicable';
  let expectedStatus = 'RI_NOT_APPLICABLE_ENGINEER_DECLARED';
  let expectedApplied = false;

  if (qualifies) {
    const aogRef = nonEmpty(record.projectFacts.openingAreaSourceReference, 'projectFacts.openingAreaSourceReference');
    const viRef = nonEmpty(record.projectFacts.internalVolumeSourceReference, 'projectFacts.internalVolumeSourceReference');
    if (!aogRef || !viRef) throw new Error('Large-volume Ri quantitative source references are required.');
    const computed = computeLargeVolumeReductionFactor({
      unpartitionedInternalVolumeM3: record.projectFacts.unpartitionedInternalVolumeM3,
      totalEnvelopeOpeningAreaM2: record.projectFacts.totalEnvelopeOpeningAreaM2
    });
    if (!nearlyEqual(record.codeEquation.dimensionlessRatioViOver6950Aog, computed.dimensionlessRatioViOver6950Aog)) {
      throw new Error('Large-volume Ri dimensionless ratio must be deterministically derived from Vi and Aog.');
    }
    if (!nearlyEqual(record.codeEquation.equationRi, computed.equationRi)) {
      throw new Error('Large-volume Ri equation result must be deterministically derived from Vi and Aog.');
    }
    if (!APPLICATION_CHOICES.includes(record.selection?.applicationChoice)) throw new Error('Large-volume Ri applicationChoice is unsupported.');
    expectedChoice = record.selection.applicationChoice;
    expectedApplied = expectedChoice === 'equation-reduction';
    expectedRi = expectedApplied ? computed.equationRi : 1;
    expectedStatus = expectedApplied ? 'RI_EQUATION_REDUCTION_SELECTED' : 'RI_1_CONSERVATIVE_SELECTED';
  } else {
    if (record.projectFacts.totalEnvelopeOpeningAreaM2 !== null || record.projectFacts.openingAreaSourceReference !== null || record.projectFacts.unpartitionedInternalVolumeM3 !== null || record.projectFacts.internalVolumeSourceReference !== null) {
      throw new Error('Non-qualifying Ri record must not carry unused quantitative large-volume inputs.');
    }
    if (record.codeEquation.dimensionlessRatioViOver6950Aog !== null || record.codeEquation.equationRi !== null) {
      throw new Error('Non-qualifying Ri record must not claim an equation result.');
    }
  }

  if (record.status !== expectedStatus) throw new Error(`Large-volume Ri status must remain '${expectedStatus}'.`);
  if (record.selection?.applicationChoice !== expectedChoice) throw new Error('Large-volume Ri application choice does not match applicability.');
  if (!nearlyEqual(record.selection?.selectedRi, expectedRi)) throw new Error('Large-volume Ri selectedRi is not deterministic.');
  if (record.selection?.applied !== expectedApplied) throw new Error('Large-volume Ri applied flag is inconsistent.');
  if (record.adjustedGcpiCases?.length !== base.baseGcpiCases.length) throw new Error('adjustedGcpiCases length must match base GCpi cases.');
  base.baseGcpiCases.forEach((value, index) => {
    if (!nearlyEqual(record.adjustedGcpiCases[index], value * expectedRi)) throw new Error('adjustedGcpiCases must equal base GCpi multiplied by selected Ri.');
  });

  const implemented = record.implementation;
  if (implemented?.baseInternalPressureCoefficientImplemented !== true) throw new Error('baseInternalPressureCoefficientImplemented must remain true.');
  if (implemented?.largeVolumeReductionFactorImplemented !== true) throw new Error('largeVolumeReductionFactorImplemented must remain true.');
  if (implemented?.largeVolumeApplicabilityAutomaticallyDetermined !== false) throw new Error('largeVolumeApplicabilityAutomaticallyDetermined must remain false.');
  for (const key of ['internalPressureVelocitySelectionImplemented','externalPressureCoefficientImplemented','effectiveWindAreaImplemented','fieldEdgeCornerGeometryImplemented','finalRoofPressureImplemented']) {
    if (implemented?.[key] !== false) throw new Error(`${key} must remain false in the Ri slice.`);
  }
  if (typeof record.boundary !== 'string' || !record.boundary.trim()) throw new Error('Large-volume Ri boundary is required.');
  return true;
}

export function serializeLargeVolumeInternalPressureReduction(record) {
  validateLargeVolumeInternalPressureReduction(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseLargeVolumeInternalPressureReduction(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateLargeVolumeInternalPressureReduction(parsed);
  return clone(parsed);
}