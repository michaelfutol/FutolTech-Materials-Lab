import { windCodeProfileById, WIND_CODE_PROFILE_STATUS } from '../data/windCodeProfiles.js';
import { nscp2015BuildingVelocityPressure } from '../solver/windVelocityPressure.js';

export const WIND_DESIGN_BASIS_SCHEMA = 'futoltech.wind-design-basis/1';
export const VELOCITY_PRESSURE_IMPLEMENTATION_STATUS = 'IMPLEMENTED_BENCHMARKED';

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

const VELOCITY_PRESSURE_INPUT_KEYS = Object.freeze([
  'siteLocation',
  'basicWindSpeed',
  'riskImportance',
  'exposureTerrain',
  'topography',
  'buildingHeight'
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

function resolvedInput(label, value, unit, sourceType, sourceReference, note = null) {
  return {
    label,
    status: 'RESOLVED_FOR_VELOCITY_PRESSURE',
    value,
    unit,
    sourceType: string(sourceType, `${label}.sourceType`),
    sourceReference: string(sourceReference, `${label}.sourceReference`),
    note
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

function velocityPressureInputs(caseInput) {
  const siteLocation = string(caseInput.siteLocation, 'velocityPressureCase.siteLocation');
  const siteSourceReference = string(caseInput.siteSourceReference, 'velocityPressureCase.siteSourceReference');
  const occupancyCategory = string(caseInput.occupancyCategory, 'velocityPressureCase.occupancyCategory').toUpperCase();
  if (!['I', 'II', 'III', 'IV'].includes(occupancyCategory)) throw new Error('velocityPressureCase.occupancyCategory must be I, II, III or IV.');
  const occupancySourceReference = string(caseInput.occupancySourceReference, 'velocityPressureCase.occupancySourceReference');
  const basicWindSpeedSourceReference = string(caseInput.basicWindSpeedSourceReference, 'velocityPressureCase.basicWindSpeedSourceReference');
  const exposureSourceReference = string(caseInput.exposureSourceReference, 'velocityPressureCase.exposureSourceReference');
  const topographySourceReference = string(caseInput.topographySourceReference, 'velocityPressureCase.topographySourceReference');
  const heightSourceReference = string(caseInput.heightSourceReference, 'velocityPressureCase.heightSourceReference');

  const calculation = nscp2015BuildingVelocityPressure({
    heightM: caseInput.heightM,
    exposureCategory: caseInput.exposureCategory,
    basicWindSpeedKph: caseInput.basicWindSpeedKph,
    topographicFactorKzt: caseInput.topographicFactorKzt
  });

  return {
    inputs: {
      siteLocation: resolvedInput('Site / location', siteLocation, null, 'project-record', siteSourceReference),
      basicWindSpeed: resolvedInput('Basic wind speed', calculation.inputs.basicWindSpeedKph, 'kph', 'code-map-or-project-reference', basicWindSpeedSourceReference),
      riskImportance: resolvedInput('Occupancy / risk category used to select wind speed', occupancyCategory, null, 'project-classification', occupancySourceReference),
      exposureTerrain: resolvedInput('Exposure / terrain', calculation.inputs.exposureCategory, null, 'engineer-classification', exposureSourceReference),
      topography: resolvedInput('Topographic factor Kzt', calculation.inputs.topographicFactorKzt, null, 'code-factor-or-project-reference', topographySourceReference),
      enclosureInternalPressure: unresolvedInput('Enclosure / internal pressure classification'),
      buildingHeight: resolvedInput('Velocity-pressure evaluation height', calculation.inputs.heightM, 'm', 'project-geometry', heightSourceReference),
      roofGeometry: unresolvedInput('Roof geometry / slope / plan dimensions')
    },
    calculation,
    provenance: {
      siteSourceReference,
      occupancySourceReference,
      basicWindSpeedSourceReference,
      exposureSourceReference,
      topographySourceReference,
      heightSourceReference
    }
  };
}

export function createWindDesignBasis({
  profileId = 'ph-nscp-2015-v1-7e-2p',
  projectMode = 'code-baseline',
  manualPressureFallback = true,
  velocityPressureCase = null
} = {}) {
  const profile = windCodeProfileById(profileId);
  if (!profile) throw new Error(`Unknown wind code profile '${profileId}'.`);
  if (!['code-baseline', 'user-defined-research'].includes(projectMode)) throw new Error(`Unsupported wind projectMode '${projectMode}'.`);
  if (projectMode === 'code-baseline' && profile.status === WIND_CODE_PROFILE_STATUS.USER_DEFINED) {
    throw new Error('A user-defined wind basis cannot be labeled code-baseline.');
  }
  if (velocityPressureCase && profileId !== 'ph-nscp-2015-v1-7e-2p') {
    throw new Error('The implemented velocity-pressure chain is currently limited to the NSCP 2015 Philippine profile.');
  }
  if (velocityPressureCase && projectMode !== 'code-baseline') {
    throw new Error('The implemented NSCP velocity-pressure chain requires code-baseline projectMode.');
  }

  const resolvedVelocity = velocityPressureCase ? velocityPressureInputs(velocityPressureCase) : null;
  const basis = {
    schemaVersion: WIND_DESIGN_BASIS_SCHEMA,
    status: resolvedVelocity ? 'VELOCITY_PRESSURE_READY_REMAINING_INPUTS_UNRESOLVED' : 'BASIS_IDENTIFIED_INPUTS_UNRESOLVED',
    calculationStatus: resolvedVelocity ? 'VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED' : 'BLOCKED',
    projectMode,
    adoptedCode: identifiedCode(profile),
    inputs: resolvedVelocity?.inputs ?? {
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
      velocityPressureChain: resolvedVelocity ? VELOCITY_PRESSURE_IMPLEMENTATION_STATUS : 'UNIMPLEMENTED',
      externalPressureCoefficients: 'UNIMPLEMENTED',
      internalPressureCoefficients: 'UNIMPLEMENTED',
      fieldEdgeCornerGeometry: 'UNIMPLEMENTED',
      loadCombinations: 'UNIMPLEMENTED'
    },
    ...(resolvedVelocity ? {
      velocityPressure: {
        ...resolvedVelocity.calculation,
        provenance: resolvedVelocity.provenance
      }
    } : {}),
    manualPressureFallback: Boolean(manualPressureFallback),
    blockers: resolvedVelocity ? [
      'Validate enclosure/internal-pressure and roof geometry inputs before pressure coefficients are enabled.',
      'Implement code-specific external/internal pressure coefficients and field/edge/corner geometry before code-derived roof pressures are routed to Roof Bay.',
      'Keep manual pressure entry active until the full pressure/zoning chain is verified.'
    ] : [
      'Resolve the wind inputs required for the velocity-pressure chain with source references.',
      'Implement and independently benchmark the adopted code velocity-pressure chain.',
      'Implement code-specific external/internal pressure coefficients and zone geometry before code-derived roof pressures are enabled.'
    ],
    note: resolvedVelocity
      ? 'M3 velocity-pressure slice only. qz/qh may be calculated from explicit source-referenced inputs, but pressure coefficients, internal pressure, roof zoning and project load routing remain blocked.'
      : 'M3 provenance foundation only. Identifying a code edition does not mean its wind equations, maps, coefficients or roof zones have been implemented.'
  };
  validateWindDesignBasis(basis);
  return basis;
}

function validateResolvedVelocityPressure(basis) {
  if (basis.adoptedCode.profileId !== 'ph-nscp-2015-v1-7e-2p') throw new Error('Velocity-pressure implementation is currently limited to the NSCP 2015 Philippine profile.');
  if (basis.projectMode !== 'code-baseline') throw new Error('Velocity-pressure implementation requires code-baseline projectMode.');
  if (basis.status !== 'VELOCITY_PRESSURE_READY_REMAINING_INPUTS_UNRESOLVED') throw new Error('Velocity-pressure basis status is inconsistent.');
  if (basis.calculationStatus !== 'VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED') throw new Error('Velocity-pressure calculationStatus is inconsistent.');
  if (basis.formulaImplementation.velocityPressureChain !== VELOCITY_PRESSURE_IMPLEMENTATION_STATUS) throw new Error('velocityPressureChain implementation status is inconsistent.');

  for (const key of VELOCITY_PRESSURE_INPUT_KEYS) {
    const input = basis.inputs[key];
    if (input.status !== 'RESOLVED_FOR_VELOCITY_PRESSURE') throw new Error(`inputs.${key} must be RESOLVED_FOR_VELOCITY_PRESSURE.`);
    if (input.value === null || input.value === undefined) throw new Error(`inputs.${key}.value must be explicit.`);
    string(input.sourceType, `inputs.${key}.sourceType`);
    string(input.sourceReference, `inputs.${key}.sourceReference`);
  }
  for (const key of ['enclosureInternalPressure', 'roofGeometry']) {
    const input = basis.inputs[key];
    if (input.status !== 'UNRESOLVED' || input.value !== null || input.sourceType !== null || input.sourceReference !== null) {
      throw new Error(`inputs.${key} must remain UNRESOLVED in the velocity-pressure slice.`);
    }
  }

  if (!basis.velocityPressure || typeof basis.velocityPressure !== 'object' || Array.isArray(basis.velocityPressure)) throw new Error('velocityPressure result must be explicit.');
  const recalculated = nscp2015BuildingVelocityPressure({
    heightM: basis.inputs.buildingHeight.value,
    exposureCategory: basis.inputs.exposureTerrain.value,
    basicWindSpeedKph: basis.inputs.basicWindSpeed.value,
    topographicFactorKzt: basis.inputs.topography.value
  });
  const tolerance = 1e-9;
  if (Math.abs(recalculated.exposure.kz - Number(basis.velocityPressure.exposure?.kz)) > tolerance) throw new Error('velocityPressure Kz must match the deterministic solver.');
  if (Math.abs(recalculated.result.qPa - Number(basis.velocityPressure.result?.qPa)) > tolerance) throw new Error('velocityPressure qPa must match the deterministic solver.');
  if (Math.abs(recalculated.result.qKPa - Number(basis.velocityPressure.result?.qKPa)) > tolerance) throw new Error('velocityPressure qKPa must match the deterministic solver.');
  if (!basis.velocityPressure.provenance || typeof basis.velocityPressure.provenance !== 'object') throw new Error('velocityPressure provenance must remain explicit.');
  for (const value of Object.values(basis.velocityPressure.provenance)) string(value, 'velocityPressure.provenance reference');
}

export function validateWindDesignBasis(basis) {
  if (!basis || typeof basis !== 'object' || Array.isArray(basis)) throw new Error('Wind design basis must be an object.');
  if (basis.schemaVersion !== WIND_DESIGN_BASIS_SCHEMA) throw new Error(`Unsupported wind design basis schema '${basis.schemaVersion}'.`);
  if (!['BASIS_IDENTIFIED_INPUTS_UNRESOLVED', 'USER_DEFINED_INPUTS_UNRESOLVED', 'VELOCITY_PRESSURE_READY_REMAINING_INPUTS_UNRESOLVED'].includes(basis.status)) throw new Error('Wind design basis status is unsupported.');
  if (!['BLOCKED', 'VELOCITY_PRESSURE_AVAILABLE_ZONING_BLOCKED'].includes(basis.calculationStatus)) throw new Error('Wind design basis calculationStatus is unsupported.');
  if (!['code-baseline', 'user-defined-research'].includes(basis.projectMode)) throw new Error('Wind design basis projectMode is unsupported.');

  const profile = windCodeProfileById(basis.adoptedCode?.profileId);
  if (!profile) throw new Error('Wind design basis adoptedCode.profileId is unknown.');
  if (basis.projectMode === 'code-baseline' && profile.status === WIND_CODE_PROFILE_STATUS.USER_DEFINED) throw new Error('User-defined profile cannot be code-baseline.');
  string(basis.adoptedCode?.title, 'adoptedCode.title');
  if (basis.adoptedCode.profileStatus !== profile.status) throw new Error('adoptedCode.profileStatus must match the registered profile.');
  if (JSON.stringify(stable(basis.adoptedCode.evidence ?? [])) !== JSON.stringify(stable(profile.evidence))) throw new Error('adoptedCode evidence must match the registered source-backed profile.');

  if (!basis.inputs || typeof basis.inputs !== 'object' || Array.isArray(basis.inputs)) throw new Error('Wind design basis inputs must be explicit.');
  for (const key of INPUT_KEYS) {
    const input = basis.inputs[key];
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`inputs.${key} must be explicit.`);
  }

  const formulas = basis.formulaImplementation;
  if (!formulas || typeof formulas !== 'object' || Array.isArray(formulas)) throw new Error('formulaImplementation must be explicit.');
  for (const [key, value] of Object.entries(formulas)) {
    if (key === 'velocityPressureChain') continue;
    if (value !== 'UNIMPLEMENTED') throw new Error(`formulaImplementation.${key} must remain UNIMPLEMENTED in the velocity-pressure slice.`);
  }

  if (basis.velocityPressure != null) {
    validateResolvedVelocityPressure(basis);
  } else {
    if (basis.calculationStatus !== 'BLOCKED') throw new Error('Provenance-only wind calculationStatus must remain BLOCKED.');
    if (basis.formulaImplementation.velocityPressureChain !== 'UNIMPLEMENTED') throw new Error('velocityPressureChain must remain UNIMPLEMENTED without a resolved velocity-pressure case.');
    for (const key of INPUT_KEYS) {
      const input = basis.inputs[key];
      if (input.status !== 'UNRESOLVED') throw new Error(`inputs.${key}.status must remain UNRESOLVED in the provenance-only state.`);
      if (input.value !== null || input.sourceType !== null || input.sourceReference !== null) {
        throw new Error(`inputs.${key} cannot be populated until its validation slice is implemented.`);
      }
    }
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
