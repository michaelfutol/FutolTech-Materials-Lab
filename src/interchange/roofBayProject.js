import { createWindDesignBasis, validateWindDesignBasis } from './windDesignBasis.js';
import {
  validateWindProjectInputAcceptance,
  windProjectInputAcceptanceToVelocityPressureCase
} from './windProjectInputAcceptance.js';

export const ROOF_BAY_PROJECT_SCHEMA = 'futoltech.roof-bay-project/1';
export const ROOF_PRESSURE_ZONE_SCHEMA = 'futoltech.roof-pressure-zones/1';

const MODES = Object.freeze(['gravity', 'wind', 'combined']);
const WIND_SENSES = Object.freeze(['uplift', 'downward']);
const ORIENTATIONS = Object.freeze([0, 90, 180, 270]);
const LAYOUT_MODES = Object.freeze(['equal-max-spacing', 'custom-stations']);
const PRESSURE_ZONE_TYPES = Object.freeze(['field', 'edge', 'corner']);
const EPS = 1e-9;

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

function nonNegative(value, label) {
  const number = finite(value, label);
  if (number < 0) throw new Error(`${label} must be zero or greater.`);
  return number;
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

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

function validatedCustomStations(stations, roofSlopeLengthM, label = 'geometry.purlinStationsM') {
  if (!Array.isArray(stations) || stations.length < 2) throw new Error(`${label} requires at least two stations.`);
  const clean = stations.map((value, index) => finite(value, `${label}[${index}]`));
  for (let index = 1; index < clean.length; index += 1) {
    if (!(clean[index] > clean[index - 1])) throw new Error(`${label} must be strictly increasing.`);
  }
  if (clean[0] < -EPS || clean[clean.length - 1] > roofSlopeLengthM + EPS) {
    throw new Error(`${label} must stay within the roof slope length.`);
  }
  return clean.map((station) => Math.min(roofSlopeLengthM, Math.max(0, station)));
}

function roofPlaneFrame(rafterSpacingM, roofSlopeLengthM) {
  return {
    system: 'roof-local-xy-m',
    origin: 'rafter-a-eave',
    xAxis: 'toward-rafter-b',
    yAxis: 'upslope',
    xExtentM: rafterSpacingM,
    yExtentM: roofSlopeLengthM
  };
}

function pressureZoningPlaceholder(rafterSpacingM, roofSlopeLengthM, windPressureKPa, windSense) {
  return {
    schemaVersion: ROOF_PRESSURE_ZONE_SCHEMA,
    status: 'UNRESOLVED',
    activePressureModel: 'manual-uniform',
    coordinateFrame: roofPlaneFrame(rafterSpacingM, roofSlopeLengthM),
    supportedRegionTypes: [...PRESSURE_ZONE_TYPES],
    regions: [],
    codeBasis: null,
    manualUniformWind: {
      pressureKPa: windPressureKPa,
      sense: windSense
    },
    note: 'M2 reserves the field/edge/corner region schema and roof-local coordinate frame only. No code-derived zone dimensions, coefficients or zone pressures are assigned until M3.'
  };
}

function validateRoofPlaneFrame(frame, rafterSpacingM, roofSlopeLengthM, label = 'geometry.roofPlaneFrame') {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) throw new Error(`${label} must be an object.`);
  if (frame.system !== 'roof-local-xy-m') throw new Error(`${label}.system must be roof-local-xy-m.`);
  if (frame.origin !== 'rafter-a-eave') throw new Error(`${label}.origin must be rafter-a-eave.`);
  if (frame.xAxis !== 'toward-rafter-b' || frame.yAxis !== 'upslope') throw new Error(`${label} axes are unsupported.`);
  if (Math.abs(finite(frame.xExtentM, `${label}.xExtentM`) - rafterSpacingM) > EPS) throw new Error(`${label}.xExtentM must match rafter spacing.`);
  if (Math.abs(finite(frame.yExtentM, `${label}.yExtentM`) - roofSlopeLengthM) > EPS) throw new Error(`${label}.yExtentM must match roof slope length.`);
  return true;
}

function validatePressureZoningPlaceholder(zoning, project) {
  if (!zoning || typeof zoning !== 'object' || Array.isArray(zoning)) throw new Error('pressureZoning must be an object when present.');
  if (zoning.schemaVersion !== ROOF_PRESSURE_ZONE_SCHEMA) throw new Error('pressureZoning.schemaVersion is unsupported.');
  if (zoning.status !== 'UNRESOLVED') throw new Error('pressureZoning.status must remain UNRESOLVED until M3 code zoning is implemented.');
  if (zoning.activePressureModel !== 'manual-uniform') throw new Error('pressureZoning.activePressureModel must remain manual-uniform until the code-wind solver is implemented.');
  if (zoning.codeBasis !== null) throw new Error('pressureZoning.codeBasis must remain null until code-wind calculation is implemented.');
  if (!Array.isArray(zoning.supportedRegionTypes) || JSON.stringify(zoning.supportedRegionTypes) !== JSON.stringify(PRESSURE_ZONE_TYPES)) {
    throw new Error('pressureZoning.supportedRegionTypes must reserve field, edge and corner in that order.');
  }
  if (!Array.isArray(zoning.regions) || zoning.regions.length !== 0) throw new Error('pressureZoning.regions must remain empty until M3 code zoning is implemented.');
  validateRoofPlaneFrame(zoning.coordinateFrame, project.geometry.rafterSpacingM, project.geometry.roofSlopeLengthM, 'pressureZoning.coordinateFrame');
  if (Math.abs(nonNegative(zoning.manualUniformWind?.pressureKPa, 'pressureZoning.manualUniformWind.pressureKPa') - project.loading.windPressureKPa) > EPS) {
    throw new Error('pressureZoning manual uniform pressure must match loading.windPressureKPa.');
  }
  if (zoning.manualUniformWind?.sense !== project.loading.windSense) throw new Error('pressureZoning manual uniform wind sense must match loading.windSense.');
  return true;
}

function acceptedWindDesignBasis(record, profileId, projectMode) {
  validateWindProjectInputAcceptance(record);
  if (record.adoptedCodeProfileId !== profileId) throw new Error('windProjectInputAcceptance code profile must match windCodeProfileId.');
  return createWindDesignBasis({
    profileId,
    projectMode,
    manualPressureFallback: true,
    velocityPressureCase: windProjectInputAcceptanceToVelocityPressureCase(record)
  });
}

export function createRoofBayProject({
  projectId = `roof-bay-${Date.now()}`,
  projectName = 'Untitled roof bay',
  sectionId,
  rafterSpacingM,
  roofSlopeLengthM,
  maxPurlinSpacingM,
  layoutMode = 'equal-max-spacing',
  purlinStationsM = null,
  slopeDeg,
  orientationDeg,
  elasticModulusMPa = 200000,
  yieldStrengthMPa,
  densityKgM3 = 7850,
  mode,
  deadLoadKPa,
  roofLiveLoadKPa,
  windPressureKPa,
  windSense,
  loadFactor = 1,
  windCodeProfileId = 'ph-nscp-2015-v1-7e-2p',
  windProjectMode = 'code-baseline',
  windProjectInputAcceptance = null,
  source = 'FutolTech Structural Lab · Roof Bay Physics M2/M3 bridge'
} = {}) {
  const orientation = finite(orientationDeg, 'orientationDeg');
  if (!ORIENTATIONS.includes(orientation)) throw new Error('orientationDeg must be 0, 90, 180 or 270 degrees.');
  if (!MODES.includes(mode)) throw new Error(`mode '${mode}' is unsupported.`);
  if (!WIND_SENSES.includes(windSense)) throw new Error(`windSense '${windSense}' is unsupported.`);
  if (!LAYOUT_MODES.includes(layoutMode)) throw new Error(`layoutMode '${layoutMode}' is unsupported.`);
  const slope = finite(slopeDeg, 'slopeDeg');
  if (slope < 0 || slope > 60) throw new Error('slopeDeg must lie from 0 to 60 degrees in Roof Bay M2.');
  const span = positive(rafterSpacingM, 'rafterSpacingM');
  const slopeLength = positive(roofSlopeLengthM, 'roofSlopeLengthM');
  const windPressure = nonNegative(windPressureKPa, 'windPressureKPa');
  const customStations = layoutMode === 'custom-stations'
    ? validatedCustomStations(purlinStationsM, slopeLength, 'purlinStationsM')
    : null;
  const acceptedWindInputs = windProjectInputAcceptance == null ? null : clone(windProjectInputAcceptance);
  const windDesignBasis = acceptedWindInputs
    ? acceptedWindDesignBasis(acceptedWindInputs, windCodeProfileId, windProjectMode)
    : createWindDesignBasis({
      profileId: windCodeProfileId,
      projectMode: windProjectMode,
      manualPressureFallback: true
    });

  const project = {
    schemaVersion: ROOF_BAY_PROJECT_SCHEMA,
    projectId: string(projectId, 'projectId'),
    projectName: string(projectName, 'projectName'),
    source: string(source, 'source'),
    geometry: {
      rafterSpacingM: span,
      roofSlopeLengthM: slopeLength,
      maxPurlinSpacingM: positive(maxPurlinSpacingM, 'maxPurlinSpacingM'),
      slopeDeg: slope,
      layoutMode,
      roofPlaneFrame: roofPlaneFrame(span, slopeLength),
      ...(customStations ? { purlinStationsM: customStations } : {})
    },
    purlin: {
      sectionId: string(sectionId, 'sectionId'),
      orientationDeg: orientation,
      elasticModulusMPa: positive(elasticModulusMPa, 'elasticModulusMPa'),
      yieldStrengthMPa: positive(yieldStrengthMPa, 'yieldStrengthMPa'),
      densityKgM3: positive(densityKgM3, 'densityKgM3')
    },
    loading: {
      mode,
      deadLoadKPa: nonNegative(deadLoadKPa, 'deadLoadKPa'),
      roofLiveLoadKPa: nonNegative(roofLiveLoadKPa, 'roofLiveLoadKPa'),
      windPressureKPa: windPressure,
      windSense,
      loadFactor: nonNegative(loadFactor, 'loadFactor')
    },
    pressureZoning: pressureZoningPlaceholder(span, slopeLength, windPressure, windSense),
    ...(acceptedWindInputs ? { windProjectInputAcceptance: acceptedWindInputs } : {}),
    windDesignBasis,
    analysisBoundary: {
      roofBaySolver: 'M2 two-rafter load-routing model',
      purlinModel: 'gross-section elastic C-purlin screening',
      roofSheetCapacity: 'UNRESOLVED',
      fastenerCapacity: 'UNRESOLVED',
      purlinToRafterConnectionCapacity: 'UNRESOLVED',
      rafterOrTrussMemberCapacity: 'UNRESOLVED',
      coldFormedLocalDistortionalLTB: 'UNRESOLVED',
      codeWindZoning: 'UNRESOLVED'
    }
  };
  validateRoofBayProject(project);
  return project;
}

export function validateRoofBayProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Roof Bay project must be a JSON object.');
  if (project.schemaVersion !== ROOF_BAY_PROJECT_SCHEMA) throw new Error(`Unsupported Roof Bay project schema '${project.schemaVersion}'.`);
  string(project.projectId, 'projectId');
  string(project.projectName, 'projectName');
  string(project.source, 'source');
  const rafterSpacingM = positive(project.geometry?.rafterSpacingM, 'geometry.rafterSpacingM');
  const roofSlopeLengthM = positive(project.geometry?.roofSlopeLengthM, 'geometry.roofSlopeLengthM');
  positive(project.geometry?.maxPurlinSpacingM, 'geometry.maxPurlinSpacingM');
  const slope = finite(project.geometry?.slopeDeg, 'geometry.slopeDeg');
  if (slope < 0 || slope > 60) throw new Error('geometry.slopeDeg must lie from 0 to 60 degrees.');
  const layoutMode = project.geometry?.layoutMode ?? 'equal-max-spacing';
  if (!LAYOUT_MODES.includes(layoutMode)) throw new Error('geometry.layoutMode is unsupported.');
  if (layoutMode === 'custom-stations') validatedCustomStations(project.geometry?.purlinStationsM, roofSlopeLengthM);
  if (layoutMode === 'equal-max-spacing' && project.geometry?.purlinStationsM != null) {
    throw new Error('geometry.purlinStationsM is only valid for custom-stations layout mode.');
  }
  if (project.geometry?.roofPlaneFrame != null) validateRoofPlaneFrame(project.geometry.roofPlaneFrame, rafterSpacingM, roofSlopeLengthM);
  string(project.purlin?.sectionId, 'purlin.sectionId');
  const orientation = finite(project.purlin?.orientationDeg, 'purlin.orientationDeg');
  if (!ORIENTATIONS.includes(orientation)) throw new Error('purlin.orientationDeg must be 0, 90, 180 or 270 degrees.');
  positive(project.purlin?.elasticModulusMPa, 'purlin.elasticModulusMPa');
  positive(project.purlin?.yieldStrengthMPa, 'purlin.yieldStrengthMPa');
  positive(project.purlin?.densityKgM3, 'purlin.densityKgM3');
  if (!MODES.includes(project.loading?.mode)) throw new Error('loading.mode is unsupported.');
  nonNegative(project.loading?.deadLoadKPa, 'loading.deadLoadKPa');
  nonNegative(project.loading?.roofLiveLoadKPa, 'loading.roofLiveLoadKPa');
  nonNegative(project.loading?.windPressureKPa, 'loading.windPressureKPa');
  if (!WIND_SENSES.includes(project.loading?.windSense)) throw new Error('loading.windSense is unsupported.');
  nonNegative(project.loading?.loadFactor, 'loading.loadFactor');
  if (project.pressureZoning != null) validatePressureZoningPlaceholder(project.pressureZoning, project);

  if (project.windProjectInputAcceptance != null) {
    validateWindProjectInputAcceptance(project.windProjectInputAcceptance);
    if (project.windDesignBasis == null) throw new Error('windDesignBasis is required when windProjectInputAcceptance is present.');
    const expected = acceptedWindDesignBasis(
      project.windProjectInputAcceptance,
      project.windProjectInputAcceptance.adoptedCodeProfileId,
      'code-baseline'
    );
    if (JSON.stringify(stable(project.windDesignBasis)) !== JSON.stringify(stable(expected))) {
      throw new Error('windDesignBasis must remain deterministically derived from windProjectInputAcceptance.');
    }
  } else if (project.windDesignBasis != null) {
    validateWindDesignBasis(project.windDesignBasis);
  }

  const boundary = project.analysisBoundary;
  if (!boundary || typeof boundary !== 'object' || Array.isArray(boundary)) throw new Error('analysisBoundary must be explicit.');
  for (const unresolved of ['roofSheetCapacity', 'fastenerCapacity', 'purlinToRafterConnectionCapacity', 'rafterOrTrussMemberCapacity', 'coldFormedLocalDistortionalLTB', 'codeWindZoning']) {
    if (boundary[unresolved] !== 'UNRESOLVED') throw new Error(`${unresolved} must remain UNRESOLVED until its physics/design layer is implemented.`);
  }
  return true;
}

export function serializeRoofBayProject(project) {
  validateRoofBayProject(project);
  return JSON.stringify(stable(clone(project)), null, 2);
}

export function parseRoofBayProject(text) {
  const parsed = JSON.parse(String(text));
  validateRoofBayProject(parsed);
  return clone(parsed);
}
