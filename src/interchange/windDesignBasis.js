import { windCodeProfileById, WIND_CODE_PROFILE_STATUS } from '../data/windCodeProfiles.js';

export const WIND_DESIGN_BASIS_SCHEMA = 'futoltech.wind-design-basis/1';

const INPUT_KEYS = Object.freeze([
  'siteLocation',
  'basicWindSpeed',
  'riskImportance',
  'exposureTerrain',
  'topography',
  'enclosureInternalPressure',
  'buildingHeight',
  'roofGeometry'
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function unresolvedInput(label, unit = null) {
  return {
    label,
    status: 'UNRESOLVED',
    value: null,
    unit,
    sourceType: null,
    sourceReference: null,
    note: null
  };
}

function identifiedCode(profile) {
  return {
    profileId: profile.id,
    title: profile.title,
    volume: profile.volume,
    edition: profile.edition,
    year: profile.year,
    printing: profile.printing,
    publisher: profile.publisher,
    jurisdiction: profile.jurisdiction,
    profileStatus: profile.status,
    evidence: profile.evidence.map((item) => ({ ...item })),
    implementationBoundary: profile.implementationBoundary
  };
}

export function createWindDesignBasis({
  profileId = 'ph-nscp-2015-v1-7e-2p',
  projectMode = 'code-baseline',
  manualPressureFallback = true
} = {}) {
  const profile = windCodeProfileById(profileId);
  if (!profile) throw new Error(`Unknown wind code profile '${profileId}'.`);
  if (!['code-baseline', 'user-defined-research'].includes(projectMode)) throw new Error(`Unsupported wind projectMode '${projectMode}'.`);
  if (projectMode === 'code-baseline' && profile.status === WIND_CODE_PROFILE_STATUS.USER_DEFINED) {
    throw new Error('A user-defined wind basis cannot be labeled code-baseline.');
  }

  const basis = {
    schemaVersion: WIND_DESIGN_BASIS_SCHEMA,
    status: 'BASIS_IDENTIFIED_INPUTS_UNRESOLVED',
    calculationStatus: 'BLOCKED',
    projectMode,
    adoptedCode: identifiedCode(profile),
    inputs: {
      siteLocation: unresolvedInput('Site / location'),
      basicWindSpeed: unresolvedInput('Basic wind speed', 'kph'),
      riskImportance: unresolvedInput('Risk / importance category'),
      exposureTerrain: unresolvedInput('Exposure / terrain'),
      topography: unresolvedInput('Topographic factor / classification'),
      enclosureInternalPressure: unresolvedInput('Enclosure / internal pressure classification'),
      buildingHeight: unresolvedInput('Building mean roof / reference height', 'm'),
      roofGeometry: unresolvedInput('Roof geometry / slope / plan dimensions')
    },
    formulaImplementation: {
      velocityPressureChain: 'UNIMPLEMENTED',
      externalPressureCoefficients: 'UNIMPLEMENTED',
      internalPressureCoefficients: 'UNIMPLEMENTED',
      fieldEdgeCornerGeometry: 'UNIMPLEMENTED',
      loadCombinations: 'UNIMPLEMENTED'
    },
    manualPressureFallback: Boolean(manualPressureFallback),
    blockers: [
      'Resolve all required wind inputs with source references.',
      'Implement and independently benchmark the adopted code velocity-pressure chain.',
      'Implement code-specific external/internal pressure coefficients and zone geometry before code-derived roof pressures are enabled.'
    ],
    note: 'M3 provenance foundation only. Identifying a code edition does not mean its wind equations, maps, coefficients or roof zones have been implemented.'
  };
  validateWindDesignBasis(basis);
  return basis;
}

export function validateWindDesignBasis(basis) {
  if (!basis || typeof basis !== 'object' || Array.isArray(basis)) throw new Error('Wind design basis must be an object.');
  if (basis.schemaVersion !== WIND_DESIGN_BASIS_SCHEMA) throw new Error(`Unsupported wind design basis schema '${basis.schemaVersion}'.`);
  if (!['BASIS_IDENTIFIED_INPUTS_UNRESOLVED', 'USER_DEFINED_INPUTS_UNRESOLVED'].includes(basis.status)) throw new Error('Wind design basis status is unsupported.');
  if (basis.calculationStatus !== 'BLOCKED') throw new Error('M3 provenance-only wind calculationStatus must remain BLOCKED.');
  if (!['code-baseline', 'user-defined-research'].includes(basis.projectMode)) throw new Error('Wind design basis projectMode is unsupported.');

  const profile = windCodeProfileById(basis.adoptedCode?.profileId);
  if (!profile) throw new Error('Wind design basis adoptedCode.profileId is unknown.');
  if (basis.projectMode === 'code-baseline' && profile.status === WIND_CODE_PROFILE_STATUS.USER_DEFINED) throw new Error('User-defined profile cannot be code-baseline.');
  string(basis.adoptedCode?.title, 'adoptedCode.title');
  if (basis.adoptedCode.profileStatus !== profile.status) throw new Error('adoptedCode.profileStatus must match the registered profile.');
  if (JSON.stringify(basis.adoptedCode.evidence ?? []) !== JSON.stringify(profile.evidence)) throw new Error('adoptedCode evidence must match the registered source-backed profile.');

  if (!basis.inputs || typeof basis.inputs !== 'object' || Array.isArray(basis.inputs)) throw new Error('Wind design basis inputs must be explicit.');
  for (const key of INPUT_KEYS) {
    const input = basis.inputs[key];
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`inputs.${key} must be explicit.`);
    if (input.status !== 'UNRESOLVED') throw new Error(`inputs.${key}.status must remain UNRESOLVED in the M3 provenance slice.`);
    if (input.value !== null || input.sourceType !== null || input.sourceReference !== null) {
      throw new Error(`inputs.${key} cannot be populated until the corresponding code-input validation slice is implemented.`);
    }
  }

  const formulas = basis.formulaImplementation;
  if (!formulas || typeof formulas !== 'object' || Array.isArray(formulas)) throw new Error('formulaImplementation must be explicit.');
  for (const [key, value] of Object.entries(formulas)) {
    if (value !== 'UNIMPLEMENTED') throw new Error(`formulaImplementation.${key} must remain UNIMPLEMENTED in the provenance slice.`);
  }
  if (!Array.isArray(basis.blockers) || basis.blockers.length < 1) throw new Error('Wind design basis blockers must remain explicit.');
  return true;
}

export function serializeWindDesignBasis(basis) {
  validateWindDesignBasis(basis);
  return JSON.stringify(stable(clone(basis)), null, 2);
}

export function parseWindDesignBasis(text) {
  const parsed = JSON.parse(String(text));
  validateWindDesignBasis(parsed);
  return clone(parsed);
}
