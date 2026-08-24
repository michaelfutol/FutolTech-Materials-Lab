import { validateWindRoofStrengthCombinationAssembly } from '../solver/windRoofStrengthCombinationAssembly.js';
import { roofBayPurlinStations } from '../solver/roofBay.js';

export const ROOF_BAY_CODE_DERIVED_ACTIVATION_SCHEMA = 'futoltech.roof-bay-code-derived-activation/1';

const STATUS = 'CODE_DERIVED_STRENGTH_CASE_ACTIVATED_MANUAL_UNIFORM_RETAINED';
const ACTIVE_DEMAND_MODEL = 'code-derived-strength-combination';
const MANUAL_FALLBACK = 'manual-uniform';
const EPS = 1e-9;
const ACTIVATION_RULE = 'A complete verified M3 strength-combination case may be activated only when its accepted pressure-context chain, Roof Bay span/slope geometry, purlin stations, D and Lr inputs match the active Roof Bay project. The existing manual-uniform M2 solver is retained as a separate fallback and is not overwritten.';
const SELF_WEIGHT_RULE = 'PR #132 preserves purlin self-weight as sourced line actions inside D but does not encode the selected Roof Bay section ID. Controlled activation therefore requires an explicit engineer confirmation and source reference that the imported self-weight basis matches the active project purlin section before the complete combination result may be displayed as active.';
const BOUNDARY = 'This activation record selects and exposes one already-complete PR #133 strength-combination action result. It does not recompute wind pressure, coefficients, zoning, companion actions or combinations; it does not replace the manual-uniform M2 solver; it does not calculate purlin stress/deflection under the code-derived piecewise demand or promote any member/connection capacity.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function arrayNearlyEqual(left, right, tolerance = EPS) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => nearlyEqual(value, right[index], tolerance));
}

function selectedCase(assembly, selectedCombinationCaseId) {
  validateWindRoofStrengthCombinationAssembly(assembly);
  const id = nonEmpty(selectedCombinationCaseId, 'selectedCombinationCaseId');
  const item = assembly.cases.find((candidate) => candidate.combinationCaseId === id);
  if (!item) throw new Error(`Selected strength-combination case '${id}' was not found in the verified assembly.`);
  if (item.fullCombinationResult == null || item.status !== 'COMPLETE_STRENGTH_COMBINATION_ACTION_RESULT' || item.equilibrium?.pass !== true) {
    throw new Error(`Selected strength-combination case '${id}' is not complete and equilibrium-verified.`);
  }
  return item;
}

function assemblyContext(assembly) {
  const companion = assembly.upstreamWindRoofCompanionActions;
  const windRecord = companion.upstreamWindRoofLoadCaseCombination;
  const toward = windRecord.windCases.find((item) => item.designDirection === 'toward-surface');
  if (!toward) throw new Error('Verified strength assembly is missing the toward-surface route needed for project compatibility checks.');
  const route = toward.upstreamWindRoofBayCodePressureRouting;
  const zoneGeometry = route.upstreamWindRoofZoneGeometry;
  return {
    companion,
    route,
    zoneGeometry,
    pressureContext: zoneGeometry.upstreamWindPressureContextAcceptance
  };
}

function projectStations(project) {
  const geometry = project?.geometry;
  if (!geometry || typeof geometry !== 'object') throw new Error('Roof Bay project geometry is required for code-derived activation.');
  if (geometry.layoutMode === 'custom-stations') {
    if (!Array.isArray(geometry.purlinStationsM) || geometry.purlinStationsM.length < 2) throw new Error('Custom Roof Bay activation requires explicit purlinStationsM.');
    return geometry.purlinStationsM.map((value, index) => finite(value, `geometry.purlinStationsM[${index}]`));
  }
  if ((geometry.layoutMode ?? 'equal-max-spacing') !== 'equal-max-spacing') throw new Error(`Unsupported Roof Bay layout mode '${geometry.layoutMode}'.`);
  return roofBayPurlinStations(
    finite(geometry.roofSlopeLengthM, 'geometry.roofSlopeLengthM'),
    finite(geometry.maxPurlinSpacingM, 'geometry.maxPurlinSpacingM')
  ).stationsM;
}

function projectBasis(project) {
  const context = project?.windPressureContextAcceptance;
  if (!context) throw new Error('Accepted windPressureContextAcceptance is required before code-derived activation.');
  const stationsM = projectStations(project);
  return {
    geometry: {
      rafterSpacingM: finite(project.geometry?.rafterSpacingM, 'geometry.rafterSpacingM'),
      roofSlopeLengthM: finite(project.geometry?.roofSlopeLengthM, 'geometry.roofSlopeLengthM'),
      maxPurlinSpacingM: finite(project.geometry?.maxPurlinSpacingM, 'geometry.maxPurlinSpacingM'),
      layoutMode: project.geometry?.layoutMode ?? 'equal-max-spacing',
      purlinStationsM: stationsM,
      slopeDeg: finite(project.geometry?.slopeDeg, 'geometry.slopeDeg')
    },
    purlin: {
      sectionId: nonEmpty(project.purlin?.sectionId, 'purlin.sectionId')
    },
    loading: {
      deadLoadKPa: finite(project.loading?.deadLoadKPa, 'loading.deadLoadKPa'),
      roofLiveLoadKPa: finite(project.loading?.roofLiveLoadKPa, 'loading.roofLiveLoadKPa'),
      manualWindPressureKPa: finite(project.loading?.windPressureKPa, 'loading.windPressureKPa'),
      manualWindSense: nonEmpty(project.loading?.windSense, 'loading.windSense')
    },
    windPressureContextAcceptance: clone(context)
  };
}

function validateCompatibility(basis, assembly) {
  const { companion, route, zoneGeometry, pressureContext } = assemblyContext(assembly);
  if (!sameRecord(basis.windPressureContextAcceptance, pressureContext)) {
    throw new Error('Imported strength assembly pressure context does not match the active Roof Bay accepted pressure context.');
  }
  if (!nearlyEqual(basis.geometry.rafterSpacingM, companion.geometry.baySpanM) || !nearlyEqual(basis.geometry.rafterSpacingM, route.geometry.spanM)) {
    throw new Error('Imported strength assembly Roof Bay span does not match the active project rafter spacing.');
  }
  if (!nearlyEqual(basis.geometry.roofSlopeLengthM, companion.geometry.roofSlopeLengthM) || !nearlyEqual(basis.geometry.roofSlopeLengthM, zoneGeometry.roofPlaneRegistration.roofSlopeLengthM)) {
    throw new Error('Imported strength assembly roof slope length does not match the active project.');
  }
  if (!nearlyEqual(basis.geometry.slopeDeg, companion.geometry.roofSlopeDeg) || !nearlyEqual(basis.geometry.slopeDeg, zoneGeometry.applicability.roofSlopeDeg)) {
    throw new Error('Imported strength assembly roof slope angle does not match the active project.');
  }
  const assemblyStations = route.purlins.map((item) => Number(item.stationM));
  if (!arrayNearlyEqual(basis.geometry.purlinStationsM, assemblyStations)) {
    throw new Error('Imported strength assembly purlin stations do not match the active Roof Bay layout.');
  }
  if (!nearlyEqual(basis.loading.deadLoadKPa, companion.actions.D.verticalRoofAreaPressureKPa)) {
    throw new Error('Imported strength assembly D roof-area pressure does not match the active Roof Bay dead load input.');
  }
  if (!nearlyEqual(basis.loading.roofLiveLoadKPa, companion.actions.Lr.verticalRoofAreaPressureKPa)) {
    throw new Error('Imported strength assembly Lr pressure does not match the active Roof Bay roof-live input.');
  }
  return true;
}

function buildRecord({
  roofBayProject,
  windRoofStrengthCombinationAssembly,
  selectedCombinationCaseId,
  engineerConfirmedPurlinSelfWeightMatchesProjectSection,
  purlinSelfWeightCompatibilitySourceReference,
  activationSourceReference,
  note = null
} = {}) {
  const assembly = clone(windRoofStrengthCombinationAssembly);
  const item = selectedCase(assembly, selectedCombinationCaseId);
  const basis = projectBasis(roofBayProject);
  validateCompatibility(basis, assembly);
  if (engineerConfirmedPurlinSelfWeightMatchesProjectSection !== true) {
    throw new Error('Code-derived activation requires engineer confirmation that PR #132 purlin self-weight matches the active project section.');
  }
  const selfWeightRef = nonEmpty(purlinSelfWeightCompatibilitySourceReference, 'purlinSelfWeightCompatibilitySourceReference');
  const activationRef = nonEmpty(activationSourceReference, 'activationSourceReference');
  return {
    schemaVersion: ROOF_BAY_CODE_DERIVED_ACTIVATION_SCHEMA,
    status: STATUS,
    activeDemandModel: ACTIVE_DEMAND_MODEL,
    manualFallbackPressureModel: MANUAL_FALLBACK,
    manualUniformFallbackRetained: true,
    selectedCombinationCaseId: item.combinationCaseId,
    selectedCase: clone(item),
    upstreamWindRoofStrengthCombinationAssembly: assembly,
    projectBasis: basis,
    compatibility: {
      pressureContextExactMatch: true,
      roofBayGeometryMatch: true,
      purlinStationsMatch: true,
      deadLoadMatch: true,
      roofLiveLoadMatch: true,
      projectPurlinSectionId: basis.purlin.sectionId,
      engineerConfirmedPurlinSelfWeightMatchesProjectSection: true,
      purlinSelfWeightCompatibilitySourceReference: selfWeightRef
    },
    sourceBasis: {
      activationSourceReference: activationRef,
      activationRule: ACTIVATION_RULE,
      selfWeightRule: SELF_WEIGHT_RULE
    },
    displayResult: {
      templateId: item.templateId,
      equationDisplay: item.equationDisplay,
      windCaseId: item.windCaseId,
      windDirection: item.windDirection,
      selectedLrOrRAction: item.selectedLrOrRAction,
      fullCombinationResult: clone(item.fullCombinationResult),
      equilibrium: clone(item.equilibrium)
    },
    implementation: {
      codeDerivedStrengthCaseActivated: true,
      manualUniformFallbackRetained: true,
      projectJsonAttachmentImplemented: true,
      duplicatePressureCalculationInUiImplemented: false,
      piecewisePurlinMemberResponseImplemented: false,
      purlinCapacityPromotionImplemented: false,
      connectionCapacityImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    roofBayProject: {
      geometry: clone(record.projectBasis.geometry),
      purlin: clone(record.projectBasis.purlin),
      loading: clone(record.projectBasis.loading),
      windPressureContextAcceptance: clone(record.projectBasis.windPressureContextAcceptance)
    },
    windRoofStrengthCombinationAssembly: record.upstreamWindRoofStrengthCombinationAssembly,
    selectedCombinationCaseId: record.selectedCombinationCaseId,
    engineerConfirmedPurlinSelfWeightMatchesProjectSection: record.compatibility.engineerConfirmedPurlinSelfWeightMatchesProjectSection,
    purlinSelfWeightCompatibilitySourceReference: record.compatibility.purlinSelfWeightCompatibilitySourceReference,
    activationSourceReference: record.sourceBasis.activationSourceReference,
    note: record.note
  };
}

export function resolveRoofBayCodeDerivedActivation(input = {}) {
  const record = buildRecord(input);
  validateRoofBayCodeDerivedActivation(record);
  return clone(record);
}

export function validateRoofBayCodeDerivedActivation(record, roofBayProject = null) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof Bay code-derived activation record must be an object.');
  if (record.schemaVersion !== ROOF_BAY_CODE_DERIVED_ACTIVATION_SCHEMA) throw new Error(`Unsupported Roof Bay code-derived activation schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS || record.activeDemandModel !== ACTIVE_DEMAND_MODEL || record.manualFallbackPressureModel !== MANUAL_FALLBACK || record.manualUniformFallbackRetained !== true) {
    throw new Error('Roof Bay code-derived activation status/model boundary changed.');
  }
  validateWindRoofStrengthCombinationAssembly(record.upstreamWindRoofStrengthCombinationAssembly);
  const item = selectedCase(record.upstreamWindRoofStrengthCombinationAssembly, record.selectedCombinationCaseId);
  if (!sameRecord(record.selectedCase, item)) throw new Error('Selected activation case changed from the verified strength assembly.');
  if (record.compatibility?.engineerConfirmedPurlinSelfWeightMatchesProjectSection !== true) throw new Error('Purlin self-weight compatibility confirmation changed.');
  nonEmpty(record.compatibility?.purlinSelfWeightCompatibilitySourceReference, 'compatibility.purlinSelfWeightCompatibilitySourceReference');
  nonEmpty(record.compatibility?.projectPurlinSectionId, 'compatibility.projectPurlinSectionId');
  nonEmpty(record.sourceBasis?.activationSourceReference, 'sourceBasis.activationSourceReference');
  if (record.sourceBasis?.activationRule !== ACTIVATION_RULE || record.sourceBasis?.selfWeightRule !== SELF_WEIGHT_RULE) throw new Error('Roof Bay activation source rules changed.');
  if (record.boundary !== BOUNDARY) throw new Error('Roof Bay activation engineering boundary changed.');
  for (const flag of ['pressureContextExactMatch','roofBayGeometryMatch','purlinStationsMatch','deadLoadMatch','roofLiveLoadMatch']) {
    if (record.compatibility?.[flag] !== true) throw new Error(`Roof Bay activation compatibility flag '${flag}' changed.`);
  }
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof Bay code-derived activation record changed from its deterministic public project/assembly/source state.');
  if (roofBayProject != null) {
    const currentBasis = projectBasis(roofBayProject);
    if (!sameRecord(currentBasis, record.projectBasis)) throw new Error('Roof Bay project changed after the code-derived activation record was created.');
    validateCompatibility(currentBasis, record.upstreamWindRoofStrengthCombinationAssembly);
  }
  return true;
}

export function serializeRoofBayCodeDerivedActivation(record) {
  validateRoofBayCodeDerivedActivation(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofBayCodeDerivedActivation(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofBayCodeDerivedActivation(parsed);
  return clone(parsed);
}
