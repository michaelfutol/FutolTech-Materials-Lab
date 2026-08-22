export const WIND_PROJECT_INPUT_ACCEPTANCE_SCHEMA = 'futoltech.wind-project-input-acceptance/1';

export const WIND_SPEED_SOURCE_TYPES = Object.freeze([
  'authorized-code-map',
  'project-design-criteria',
  'site-specific-study'
]);

export const WIND_SPEED_SELECTION_METHODS = Object.freeze([
  'direct-contour-read',
  'linear-interpolation',
  'project-specified',
  'site-specific-study'
]);

const OCCUPANCY_WIND_FIGURES = Object.freeze({
  I: Object.freeze({ figureId: '207A.5-1C', group: 'Occupancy Category I' }),
  II: Object.freeze({ figureId: '207A.5-1B', group: 'Occupancy Category II' }),
  III: Object.freeze({ figureId: '207A.5-1A', group: 'Occupancy Categories III, IV and V' }),
  IV: Object.freeze({ figureId: '207A.5-1A', group: 'Occupancy Categories III, IV and V' }),
  V: Object.freeze({ figureId: '207A.5-1A', group: 'Occupancy Categories III, IV and V' })
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function category(value, label, allowed) {
  const normalized = text(value, label).toUpperCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of ${allowed.join(', ')}.`);
  return normalized;
}

export function requiredWindSpeedFigureForOccupancy(occupancyCategory) {
  const normalized = category(occupancyCategory, 'occupancyCategory', Object.keys(OCCUPANCY_WIND_FIGURES));
  return clone(OCCUPANCY_WIND_FIGURES[normalized]);
}

export function createWindProjectInputAcceptance({
  siteLocation,
  siteSourceReference,
  occupancyCategory,
  occupancySourceReference,
  basicWindSpeedKph,
  windSpeedSourceType,
  windSpeedSourceReference,
  windSpeedSelectionMethod,
  windSpeedFigureId = null,
  exposureCategory,
  exposureSourceReference,
  topographicFactorKzt,
  topographySourceReference,
  heightM,
  heightSourceReference,
  note = null
} = {}) {
  const occupancy = category(occupancyCategory, 'occupancyCategory', ['I', 'II', 'III', 'IV', 'V']);
  const requiredFigure = requiredWindSpeedFigureForOccupancy(occupancy);
  const sourceType = category(windSpeedSourceType, 'windSpeedSourceType', WIND_SPEED_SOURCE_TYPES);
  const selectionMethod = text(windSpeedSelectionMethod, 'windSpeedSelectionMethod');
  if (!WIND_SPEED_SELECTION_METHODS.includes(selectionMethod)) {
    throw new Error(`windSpeedSelectionMethod must be one of ${WIND_SPEED_SELECTION_METHODS.join(', ')}.`);
  }

  let declaredFigureId = windSpeedFigureId == null || String(windSpeedFigureId).trim() === '' ? null : String(windSpeedFigureId).trim();
  let codeMapStatus = 'NOT_A_CODE_MAP_SOURCE';

  if (sourceType === 'authorized-code-map') {
    if (!declaredFigureId) throw new Error('windSpeedFigureId is required for authorized-code-map input.');
    if (declaredFigureId !== requiredFigure.figureId) {
      throw new Error(`windSpeedFigureId must be ${requiredFigure.figureId} for Occupancy Category ${occupancy}.`);
    }
    if (!['direct-contour-read', 'linear-interpolation'].includes(selectionMethod)) {
      throw new Error('authorized-code-map input requires direct-contour-read or linear-interpolation selection method.');
    }
    codeMapStatus = 'MATCHED_REQUIRED_OCCUPANCY_FIGURE';
  } else if (sourceType === 'project-design-criteria') {
    if (selectionMethod !== 'project-specified') throw new Error('project-design-criteria input requires project-specified selection method.');
    if (declaredFigureId && declaredFigureId !== requiredFigure.figureId) {
      throw new Error(`Any declared wind-speed figure must match ${requiredFigure.figureId} for Occupancy Category ${occupancy}.`);
    }
  } else if (sourceType === 'site-specific-study') {
    if (selectionMethod !== 'site-specific-study') throw new Error('site-specific-study input requires site-specific-study selection method.');
    if (declaredFigureId && declaredFigureId !== requiredFigure.figureId) {
      throw new Error(`Any declared wind-speed figure must match ${requiredFigure.figureId} for Occupancy Category ${occupancy}.`);
    }
  }

  const record = {
    schemaVersion: WIND_PROJECT_INPUT_ACCEPTANCE_SCHEMA,
    status: 'ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY',
    adoptedCodeProfileId: 'ph-nscp-2015-v1-7e-2p',
    site: {
      location: text(siteLocation, 'siteLocation'),
      sourceReference: text(siteSourceReference, 'siteSourceReference')
    },
    occupancy: {
      category: occupancy,
      sourceReference: text(occupancySourceReference, 'occupancySourceReference'),
      requiredWindSpeedFigure: {
        ...requiredFigure,
        ruleReference: 'NSCP 2015 Section 207A.5.1; verify against an authorized code copy before project use.'
      }
    },
    basicWindSpeed: {
      valueKph: positive(basicWindSpeedKph, 'basicWindSpeedKph'),
      sourceType,
      sourceReference: text(windSpeedSourceReference, 'windSpeedSourceReference'),
      selectionMethod,
      declaredFigureId,
      codeMapStatus
    },
    exposure: {
      category: category(exposureCategory, 'exposureCategory', ['B', 'C', 'D']),
      sourceReference: text(exposureSourceReference, 'exposureSourceReference')
    },
    topography: {
      kzt: positive(topographicFactorKzt, 'topographicFactorKzt'),
      sourceReference: text(topographySourceReference, 'topographySourceReference')
    },
    height: {
      valueM: positive(heightM, 'heightM'),
      sourceReference: text(heightSourceReference, 'heightSourceReference')
    },
    acceptance: {
      velocityPressureInputsTraceable: true,
      automaticWindMapLookupImplemented: false,
      exposureAutoClassificationImplemented: false,
      topographicFactorAutoDerivationImplemented: false,
      pressureCoefficientsImplemented: false,
      roofZoningImplemented: false
    },
    note: note == null ? null : String(note),
    boundary: 'This record accepts explicit, source-referenced project inputs for the implemented velocity-pressure equation only. It does not claim automatic NSCP wind-map lookup, automatic terrain/topography classification, pressure coefficients, roof zoning, or final roof pressure.'
  };

  validateWindProjectInputAcceptance(record);
  return clone(record);
}

export function validateWindProjectInputAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind project input acceptance must be an object.');
  if (record.schemaVersion !== WIND_PROJECT_INPUT_ACCEPTANCE_SCHEMA) throw new Error(`Unsupported wind project input acceptance schema '${record.schemaVersion}'.`);
  if (record.status !== 'ACCEPTED_FOR_VELOCITY_PRESSURE_ONLY') throw new Error('Wind project input acceptance status is unsupported.');
  if (record.adoptedCodeProfileId !== 'ph-nscp-2015-v1-7e-2p') throw new Error('Wind project input acceptance is currently limited to the NSCP 2015 Philippine profile.');

  text(record.site?.location, 'site.location');
  text(record.site?.sourceReference, 'site.sourceReference');

  const occupancy = category(record.occupancy?.category, 'occupancy.category', ['I', 'II', 'III', 'IV', 'V']);
  text(record.occupancy?.sourceReference, 'occupancy.sourceReference');
  const requiredFigure = requiredWindSpeedFigureForOccupancy(occupancy);
  if (record.occupancy?.requiredWindSpeedFigure?.figureId !== requiredFigure.figureId) throw new Error('requiredWindSpeedFigure.figureId does not match occupancy category.');
  if (record.occupancy?.requiredWindSpeedFigure?.group !== requiredFigure.group) throw new Error('requiredWindSpeedFigure.group does not match occupancy category.');
  text(record.occupancy?.requiredWindSpeedFigure?.ruleReference, 'requiredWindSpeedFigure.ruleReference');

  positive(record.basicWindSpeed?.valueKph, 'basicWindSpeed.valueKph');
  const sourceType = category(record.basicWindSpeed?.sourceType, 'basicWindSpeed.sourceType', WIND_SPEED_SOURCE_TYPES);
  text(record.basicWindSpeed?.sourceReference, 'basicWindSpeed.sourceReference');
  const selectionMethod = text(record.basicWindSpeed?.selectionMethod, 'basicWindSpeed.selectionMethod');
  if (!WIND_SPEED_SELECTION_METHODS.includes(selectionMethod)) throw new Error('basicWindSpeed.selectionMethod is unsupported.');

  if (sourceType === 'authorized-code-map') {
    if (record.basicWindSpeed.declaredFigureId !== requiredFigure.figureId) throw new Error('Authorized code-map input must declare the required occupancy wind-speed figure.');
    if (!['direct-contour-read', 'linear-interpolation'].includes(selectionMethod)) throw new Error('Authorized code-map input uses an unsupported selection method.');
    if (record.basicWindSpeed.codeMapStatus !== 'MATCHED_REQUIRED_OCCUPANCY_FIGURE') throw new Error('Authorized code-map input must preserve the matched figure status.');
  } else {
    if (record.basicWindSpeed.declaredFigureId != null && record.basicWindSpeed.declaredFigureId !== requiredFigure.figureId) throw new Error('Declared wind-speed figure does not match occupancy category.');
    if (record.basicWindSpeed.codeMapStatus !== 'NOT_A_CODE_MAP_SOURCE') throw new Error('Non-map wind-speed input cannot claim code-map verification.');
    if (sourceType === 'project-design-criteria' && selectionMethod !== 'project-specified') throw new Error('Project design criteria must retain project-specified selection method.');
    if (sourceType === 'site-specific-study' && selectionMethod !== 'site-specific-study') throw new Error('Site-specific study must retain site-specific-study selection method.');
  }

  category(record.exposure?.category, 'exposure.category', ['B', 'C', 'D']);
  text(record.exposure?.sourceReference, 'exposure.sourceReference');
  positive(record.topography?.kzt, 'topography.kzt');
  text(record.topography?.sourceReference, 'topography.sourceReference');
  positive(record.height?.valueM, 'height.valueM');
  text(record.height?.sourceReference, 'height.sourceReference');

  if (record.acceptance?.velocityPressureInputsTraceable !== true) throw new Error('velocityPressureInputsTraceable must remain true for an accepted record.');
  for (const key of ['automaticWindMapLookupImplemented', 'exposureAutoClassificationImplemented', 'topographicFactorAutoDerivationImplemented', 'pressureCoefficientsImplemented', 'roofZoningImplemented']) {
    if (record.acceptance?.[key] !== false) throw new Error(`${key} must remain false in this M3 input-acceptance slice.`);
  }
  text(record.boundary, 'boundary');
  return true;
}

export function windProjectInputAcceptanceToVelocityPressureCase(record) {
  validateWindProjectInputAcceptance(record);
  return {
    siteLocation: record.site.location,
    siteSourceReference: record.site.sourceReference,
    occupancyCategory: record.occupancy.category,
    occupancySourceReference: record.occupancy.sourceReference,
    basicWindSpeedKph: record.basicWindSpeed.valueKph,
    basicWindSpeedSourceReference: `${record.basicWindSpeed.sourceType} · ${record.basicWindSpeed.selectionMethod} · ${record.basicWindSpeed.sourceReference}`,
    exposureCategory: record.exposure.category,
    exposureSourceReference: record.exposure.sourceReference,
    topographicFactorKzt: record.topography.kzt,
    topographySourceReference: record.topography.sourceReference,
    heightM: record.height.valueM,
    heightSourceReference: record.height.sourceReference
  };
}
