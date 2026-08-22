import { validateWindPressureContextAcceptance } from '../interchange/windPressureContextAcceptance.js';

export const WIND_ROOF_PURLIN_EFFECTIVE_AREA_SCHEMA = 'futoltech.wind-roof-purlin-effective-area/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const DESIGN_PROCEDURE = 'components-and-cladding';
const TARGET_CLASS = 'roof-purlin';
const EFFECTIVE_WIDTH_SELECTIONS = Object.freeze([
  'actual-tributary-width',
  'one-third-span-minimum'
]);
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

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || !(number > 0)) throw new Error(`${label} must be a positive finite number.`);
  return number;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function selectedEffectiveWidth(spanM, tributaryWidthM, selection) {
  if (selection === 'actual-tributary-width') return tributaryWidthM;
  if (selection === 'one-third-span-minimum') return Math.max(tributaryWidthM, spanM / 3);
  throw new Error(`effectiveWidthSelection must be one of ${EFFECTIVE_WIDTH_SELECTIONS.join(', ')}.`);
}

export function resolveRoofPurlinEffectiveWindArea({
  windPressureContextAcceptance,
  purlinSpanM,
  actualTributaryWidthM,
  purlinGeometrySourceReference,
  effectiveWidthSelection,
  effectiveWidthSelectionSourceReference,
  note = null
} = {}) {
  validateWindPressureContextAcceptance(windPressureContextAcceptance);
  const upstream = clone(windPressureContextAcceptance);
  if (upstream.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) {
    throw new Error(`Roof purlin effective wind area supports only '${SUPPORTED_CODE_PROFILE}'.`);
  }

  const spanM = positive(purlinSpanM, 'purlinSpanM');
  const tributaryWidthM = positive(actualTributaryWidthM, 'actualTributaryWidthM');
  const geometryRef = nonEmpty(purlinGeometrySourceReference, 'purlinGeometrySourceReference');
  const selection = nonEmpty(effectiveWidthSelection, 'effectiveWidthSelection').toLowerCase();
  if (!EFFECTIVE_WIDTH_SELECTIONS.includes(selection)) {
    throw new Error(`effectiveWidthSelection must be one of ${EFFECTIVE_WIDTH_SELECTIONS.join(', ')}.`);
  }
  const selectionRef = nonEmpty(effectiveWidthSelectionSourceReference, 'effectiveWidthSelectionSourceReference');

  const oneThirdSpanWidthM = spanM / 3;
  const effectiveWidthM = selectedEffectiveWidth(spanM, tributaryWidthM, selection);
  const actualLoadApplicationAreaM2 = spanM * tributaryWidthM;
  const coefficientSelectionEffectiveAreaM2 = spanM * effectiveWidthM;

  const record = {
    schemaVersion: WIND_ROOF_PURLIN_EFFECTIVE_AREA_SCHEMA,
    status: 'PURLIN_CNC_EFFECTIVE_AREA_RESOLVED_EXTERNAL_GCP_BLOCKED',
    adoptedCodeProfileId: upstream.adoptedCodeProfileId,
    upstreamWindPressureContextAcceptance: upstream,
    designProcedure: DESIGN_PROCEDURE,
    target: {
      class: TARGET_CLASS,
      capacityStatus: 'UNRESOLVED_BY_THIS_WIND_AREA_RECORD'
    },
    geometry: {
      purlinSpanM: spanM,
      actualTributaryWidthM: tributaryWidthM,
      actualLoadApplicationAreaM2,
      sourceReference: geometryRef
    },
    coefficientSelection: {
      effectiveWidthSelection: selection,
      selectionSourceReference: selectionRef,
      oneThirdSpanWidthM,
      effectiveWidthM,
      effectiveWindAreaM2: coefficientSelectionEffectiveAreaM2,
      enlargedBeyondActualTributaryArea: coefficientSelectionEffectiveAreaM2 > actualLoadApplicationAreaM2 + EPS
    },
    basis: {
      ruleReference: 'NSCP 2015 Components & Cladding effective-wind-area definition associated with the roof GCp figures; verify the exact applicable figure/procedure against an authorized code copy before project use.',
      effectiveAreaRule: 'For the supported closely spaced roof-purlin target, coefficient-selection effective area is span length times an effective width. The effective width may use a one-third-span minimum when explicitly selected; the actual induced wind load remains applied over the actual tributary area.',
      separationRule: 'Coefficient-selection effective wind area is not the same quantity as the physical tributary/load-application area.',
      sourceStatus: 'SOURCE_REFERENCED_RULE_IMPLEMENTED_AUTHORIZED_COPY_REVIEW_REQUIRED'
    },
    implementation: {
      componentsAndCladdingTargetImplemented: true,
      purlinEffectiveWindAreaImplemented: true,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      externalPressureCoefficientImplemented: false,
      fieldEdgeCornerGeometryImplemented: false,
      externalInternalPressureCombinationImplemented: false,
      finalRoofPressureImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'This record resolves only the Components & Cladding target and coefficient-selection effective wind area for a roof purlin. It does not select roof GCp, create field/edge/corner zones, resolve roof-sheet or fastener effective area, combine external and internal pressure, apply load combinations, rate purlin capacity, or route code-derived pressure into Roof Bay.'
  };

  validateRoofPurlinEffectiveWindArea(record);
  return clone(record);
}

export function validateRoofPurlinEffectiveWindArea(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof purlin effective wind area record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_PURLIN_EFFECTIVE_AREA_SCHEMA) throw new Error(`Unsupported roof purlin effective wind area schema '${record.schemaVersion}'.`);
  if (record.status !== 'PURLIN_CNC_EFFECTIVE_AREA_RESOLVED_EXTERNAL_GCP_BLOCKED') throw new Error('Roof purlin effective wind area status changed.');

  validateWindPressureContextAcceptance(record.upstreamWindPressureContextAcceptance);
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE || record.adoptedCodeProfileId !== record.upstreamWindPressureContextAcceptance.adoptedCodeProfileId) {
    throw new Error('Roof purlin effective wind area code profile is unsupported or mismatched.');
  }
  if (record.designProcedure !== DESIGN_PROCEDURE) throw new Error('Roof purlin effective wind area must remain a Components & Cladding procedure record.');
  if (record.target?.class !== TARGET_CLASS) throw new Error('Roof purlin effective wind area target must remain roof-purlin.');
  if (record.target?.capacityStatus !== 'UNRESOLVED_BY_THIS_WIND_AREA_RECORD') throw new Error('Effective-area resolution must not promote purlin capacity status.');

  const spanM = positive(record.geometry?.purlinSpanM, 'geometry.purlinSpanM');
  const tributaryWidthM = positive(record.geometry?.actualTributaryWidthM, 'geometry.actualTributaryWidthM');
  nonEmpty(record.geometry?.sourceReference, 'geometry.sourceReference');
  const actualArea = spanM * tributaryWidthM;
  if (!nearlyEqual(record.geometry?.actualLoadApplicationAreaM2, actualArea)) {
    throw new Error('Actual load-application area must equal purlin span times actual tributary width.');
  }

  const selection = nonEmpty(record.coefficientSelection?.effectiveWidthSelection, 'coefficientSelection.effectiveWidthSelection').toLowerCase();
  if (!EFFECTIVE_WIDTH_SELECTIONS.includes(selection)) throw new Error('Roof purlin effective-width selection is unsupported.');
  nonEmpty(record.coefficientSelection?.selectionSourceReference, 'coefficientSelection.selectionSourceReference');
  const oneThirdSpanWidthM = spanM / 3;
  const expectedEffectiveWidthM = selectedEffectiveWidth(spanM, tributaryWidthM, selection);
  const expectedEffectiveAreaM2 = spanM * expectedEffectiveWidthM;
  if (!nearlyEqual(record.coefficientSelection?.oneThirdSpanWidthM, oneThirdSpanWidthM)) {
    throw new Error('One-third-span effective-width reference changed from the deterministic geometry result.');
  }
  if (!nearlyEqual(record.coefficientSelection?.effectiveWidthM, expectedEffectiveWidthM)) {
    throw new Error('Selected effective width changed from the deterministic selection rule.');
  }
  if (!nearlyEqual(record.coefficientSelection?.effectiveWindAreaM2, expectedEffectiveAreaM2)) {
    throw new Error('Coefficient-selection effective wind area must equal span times selected effective width.');
  }
  const expectedEnlargement = expectedEffectiveAreaM2 > actualArea + EPS;
  if (record.coefficientSelection?.enlargedBeyondActualTributaryArea !== expectedEnlargement) {
    throw new Error('Effective-area enlargement flag is inconsistent with the deterministic areas.');
  }

  if (typeof record.basis?.effectiveAreaRule !== 'string' || !record.basis.effectiveAreaRule.includes('one-third-span')) {
    throw new Error('Effective wind area rule reference is required.');
  }
  if (typeof record.basis?.separationRule !== 'string' || !record.basis.separationRule.includes('not the same')) {
    throw new Error('Effective-area versus tributary-area separation rule is required.');
  }

  const impl = record.implementation;
  if (impl?.componentsAndCladdingTargetImplemented !== true || impl?.purlinEffectiveWindAreaImplemented !== true) {
    throw new Error('Implemented purlin C&C effective-area flags must remain true.');
  }
  for (const key of [
    'roofSheetEffectiveWindAreaImplemented',
    'fastenerEffectiveWindAreaImplemented',
    'externalPressureCoefficientImplemented',
    'fieldEdgeCornerGeometryImplemented',
    'externalInternalPressureCombinationImplemented',
    'finalRoofPressureImplemented'
  ]) {
    if (impl?.[key] !== false) throw new Error(`${key} must remain false in the purlin effective-area slice.`);
  }
  if (typeof record.boundary !== 'string' || !record.boundary.trim()) throw new Error('Roof purlin effective wind area boundary is required.');
  return true;
}

export function serializeRoofPurlinEffectiveWindArea(record) {
  validateRoofPurlinEffectiveWindArea(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofPurlinEffectiveWindArea(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofPurlinEffectiveWindArea(parsed);
  return clone(parsed);
}
