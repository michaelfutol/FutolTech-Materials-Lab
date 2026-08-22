export const ROOF_BAY_PROJECT_SCHEMA = 'futoltech.roof-bay-project/1';

const MODES = Object.freeze(['gravity', 'wind', 'combined']);
const WIND_SENSES = Object.freeze(['uplift', 'downward']);
const ORIENTATIONS = Object.freeze([0, 90, 180, 270]);

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

export function createRoofBayProject({
  projectId = `roof-bay-${Date.now()}`,
  projectName = 'Untitled roof bay',
  sectionId,
  rafterSpacingM,
  roofSlopeLengthM,
  maxPurlinSpacingM,
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
  source = 'FutolTech Structural Lab · Roof Bay Physics M2'
} = {}) {
  const orientation = finite(orientationDeg, 'orientationDeg');
  if (!ORIENTATIONS.includes(orientation)) throw new Error('orientationDeg must be 0, 90, 180 or 270 degrees.');
  if (!MODES.includes(mode)) throw new Error(`mode '${mode}' is unsupported.`);
  if (!WIND_SENSES.includes(windSense)) throw new Error(`windSense '${windSense}' is unsupported.`);
  const slope = finite(slopeDeg, 'slopeDeg');
  if (slope < 0 || slope > 60) throw new Error('slopeDeg must lie from 0 to 60 degrees in Roof Bay M2.');

  const project = {
    schemaVersion: ROOF_BAY_PROJECT_SCHEMA,
    projectId: string(projectId, 'projectId'),
    projectName: string(projectName, 'projectName'),
    source: string(source, 'source'),
    geometry: {
      rafterSpacingM: positive(rafterSpacingM, 'rafterSpacingM'),
      roofSlopeLengthM: positive(roofSlopeLengthM, 'roofSlopeLengthM'),
      maxPurlinSpacingM: positive(maxPurlinSpacingM, 'maxPurlinSpacingM'),
      slopeDeg: slope
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
      windPressureKPa: nonNegative(windPressureKPa, 'windPressureKPa'),
      windSense,
      loadFactor: nonNegative(loadFactor, 'loadFactor')
    },
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
  positive(project.geometry?.rafterSpacingM, 'geometry.rafterSpacingM');
  positive(project.geometry?.roofSlopeLengthM, 'geometry.roofSlopeLengthM');
  positive(project.geometry?.maxPurlinSpacingM, 'geometry.maxPurlinSpacingM');
  const slope = finite(project.geometry?.slopeDeg, 'geometry.slopeDeg');
  if (slope < 0 || slope > 60) throw new Error('geometry.slopeDeg must lie from 0 to 60 degrees.');
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
  const boundary = project.analysisBoundary;
  if (!boundary || typeof boundary !== 'object' || Array.isArray(boundary)) throw new Error('analysisBoundary must be explicit.');
  for (const unresolved of ['roofSheetCapacity', 'fastenerCapacity', 'purlinToRafterConnectionCapacity', 'rafterOrTrussMemberCapacity', 'coldFormedLocalDistortionalLTB', 'codeWindZoning']) {
    if (boundary[unresolved] !== 'UNRESOLVED') throw new Error(`${unresolved} must remain UNRESOLVED in Roof Bay M2.`);
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
