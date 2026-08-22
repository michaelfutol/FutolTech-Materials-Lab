import { validateWindPressureContextAcceptance } from '../interchange/windPressureContextAcceptance.js';

export const WIND_INTERNAL_PRESSURE_COEFFICIENT_SCHEMA = 'futoltech.wind-internal-pressure-coefficient/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';

const BASE_GCPI_CASES = Object.freeze({
  open: Object.freeze([0]),
  enclosed: Object.freeze([0.18, -0.18]),
  'partially-enclosed': Object.freeze([0.55, -0.55])
});

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

function stableEqual(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}

export function resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance } = {}) {
  validateWindPressureContextAcceptance(windPressureContextAcceptance);
  const context = clone(windPressureContextAcceptance);
  if (context.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) {
    throw new Error(`Base GCpi lookup is implemented only for '${SUPPORTED_CODE_PROFILE}' in this M3 slice.`);
  }

  const classification = context.enclosure.classification;
  const cases = BASE_GCPI_CASES[classification];
  if (!cases) throw new Error(`Unsupported enclosure classification '${classification}'.`);
  const partiallyEnclosed = classification === 'partially-enclosed';

  const result = {
    schemaVersion: WIND_INTERNAL_PRESSURE_COEFFICIENT_SCHEMA,
    status: partiallyEnclosed
      ? 'BASE_GCPI_RESOLVED_RI_APPLICABILITY_BLOCKED'
      : 'BASE_GCPI_RESOLVED',
    adoptedCodeProfileId: context.adoptedCodeProfileId,
    upstreamWindPressureContextAcceptance: context,
    enclosureClassification: classification,
    baseGcpiCases: [...cases],
    signConvention: {
      positive: 'pressure acting toward the internal surfaces',
      negative: 'pressure acting away from the internal surfaces'
    },
    basis: {
      ruleReference: 'NSCP 2015 Section 207A.11.1 and Table 207A.11-1. Verify against an authorized code copy before project use.',
      enclosureReference: 'NSCP 2015 Section 207A.10',
      largeVolumeReductionReference: 'NSCP 2015 Section 207A.11.1.1',
      sourceStatus: 'CODE_TABLE_BASE_VALUES_IMPLEMENTED_AUTHORIZED_COPY_REVIEW_REQUIRED'
    },
    largeVolumeReduction: partiallyEnclosed
      ? {
          applicability: 'UNRESOLVED',
          factorRi: null,
          applied: false,
          requiredProjectFacts: [
            'whether the building contains a single unpartitioned large volume',
            'total opening area in the building envelope',
            'unpartitioned internal volume'
          ],
          boundary: 'NSCP 2015 Section 207A.11.1.1 can modify GCpi for a qualifying partially enclosed large-volume building. This slice deliberately does not decide applicability or calculate Ri.'
        }
      : {
          applicability: 'NOT_APPLICABLE_TO_THIS_ENCLOSURE_CLASSIFICATION',
          factorRi: 1,
          applied: false,
          requiredProjectFacts: [],
          boundary: 'The large-volume Ri gate in this implementation is reserved for partially enclosed buildings.'
        },
    implementation: {
      baseInternalPressureCoefficientImplemented: true,
      largeVolumeReductionFactorImplemented: false,
      internalPressureVelocitySelectionImplemented: false,
      externalPressureCoefficientImplemented: false,
      effectiveWindAreaImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      finalRoofPressureImplemented: false
    },
    boundary: 'This record resolves only the NSCP 2015 Table 207A.11-1 base GCpi cases associated with the already accepted engineer-declared enclosure classification. It does not automatically classify enclosure, resolve or apply Ri, select qi/qh/qz, combine internal and external pressure, create roof zones, or calculate final roof pressure.'
  };

  validateBaseInternalPressureCoefficient(result);
  return clone(result);
}

export function validateBaseInternalPressureCoefficient(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Internal pressure coefficient record must be an object.');
  if (record.schemaVersion !== WIND_INTERNAL_PRESSURE_COEFFICIENT_SCHEMA) throw new Error(`Unsupported internal pressure coefficient schema '${record.schemaVersion}'.`);
  validateWindPressureContextAcceptance(record.upstreamWindPressureContextAcceptance);
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) throw new Error('Internal pressure coefficient code profile is unsupported.');
  if (record.adoptedCodeProfileId !== record.upstreamWindPressureContextAcceptance.adoptedCodeProfileId) {
    throw new Error('Internal pressure coefficient code profile must match the upstream pressure-context record.');
  }
  if (record.enclosureClassification !== record.upstreamWindPressureContextAcceptance.enclosure.classification) {
    throw new Error('Internal pressure coefficient enclosure classification must match the upstream pressure-context record.');
  }

  const expectedCases = BASE_GCPI_CASES[record.enclosureClassification];
  if (!expectedCases || !stableEqual(record.baseGcpiCases, [...expectedCases])) {
    throw new Error('baseGcpiCases do not match the implemented NSCP 2015 Table 207A.11-1 base values for this enclosure classification.');
  }
  for (let index = 0; index < record.baseGcpiCases.length; index += 1) finite(record.baseGcpiCases[index], `baseGcpiCases[${index}]`);

  if (record.signConvention?.positive !== 'pressure acting toward the internal surfaces') throw new Error('Positive GCpi sign convention changed.');
  if (record.signConvention?.negative !== 'pressure acting away from the internal surfaces') throw new Error('Negative GCpi sign convention changed.');
  if (typeof record.basis?.ruleReference !== 'string' || !record.basis.ruleReference.includes('207A.11.1')) throw new Error('GCpi rule reference is required.');
  if (typeof record.basis?.largeVolumeReductionReference !== 'string' || !record.basis.largeVolumeReductionReference.includes('207A.11.1.1')) throw new Error('Ri rule reference is required.');

  const partiallyEnclosed = record.enclosureClassification === 'partially-enclosed';
  const expectedStatus = partiallyEnclosed ? 'BASE_GCPI_RESOLVED_RI_APPLICABILITY_BLOCKED' : 'BASE_GCPI_RESOLVED';
  if (record.status !== expectedStatus) throw new Error(`Internal pressure coefficient status must remain '${expectedStatus}'.`);

  if (partiallyEnclosed) {
    if (record.largeVolumeReduction?.applicability !== 'UNRESOLVED') throw new Error('Partially enclosed Ri applicability must remain UNRESOLVED in this slice.');
    if (record.largeVolumeReduction?.factorRi !== null) throw new Error('Partially enclosed Ri factor must remain null in this slice.');
    if (record.largeVolumeReduction?.applied !== false) throw new Error('Partially enclosed Ri must not be applied in this slice.');
    if (!Array.isArray(record.largeVolumeReduction?.requiredProjectFacts) || record.largeVolumeReduction.requiredProjectFacts.length !== 3) {
      throw new Error('Partially enclosed Ri project-fact requirements must remain explicit.');
    }
  } else {
    if (record.largeVolumeReduction?.applicability !== 'NOT_APPLICABLE_TO_THIS_ENCLOSURE_CLASSIFICATION') {
      throw new Error('Ri applicability must remain not-applicable for open/enclosed base classifications in this slice.');
    }
    if (record.largeVolumeReduction?.factorRi !== 1 || record.largeVolumeReduction?.applied !== false) {
      throw new Error('Open/enclosed Ri placeholder must remain factor 1 and not applied.');
    }
  }

  const implemented = record.implementation;
  if (implemented?.baseInternalPressureCoefficientImplemented !== true) throw new Error('baseInternalPressureCoefficientImplemented must remain true.');
  for (const key of [
    'largeVolumeReductionFactorImplemented',
    'internalPressureVelocitySelectionImplemented',
    'externalPressureCoefficientImplemented',
    'effectiveWindAreaImplemented',
    'fieldEdgeCornerGeometryImplemented',
    'finalRoofPressureImplemented'
  ]) {
    if (implemented?.[key] !== false) throw new Error(`${key} must remain false in this M3 base-GCpi slice.`);
  }
  if (typeof record.boundary !== 'string' || !record.boundary.trim()) throw new Error('Internal pressure coefficient boundary is required.');
  return true;
}

export function serializeBaseInternalPressureCoefficient(record) {
  validateBaseInternalPressureCoefficient(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseBaseInternalPressureCoefficient(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateBaseInternalPressureCoefficient(parsed);
  return clone(parsed);
}