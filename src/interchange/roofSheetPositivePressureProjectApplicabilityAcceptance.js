import { validateRoofSheetPanelSpanContinuityAcceptance } from './roofSheetPanelSpanContinuityAcceptance.js';

export const ROOF_SHEET_POSITIVE_PRESSURE_PROJECT_APPLICABILITY_SCHEMA = 'futoltech.roof-sheet-positive-pressure-project-applicability/1';

const STATUS = 'ROOF_SHEET_PROJECT_APPLICABILITY_ACCEPTED_UTILIZATION_UNRESOLVED';
const EPS = 1e-9;
const LOAD_DIRECTIONS = Object.freeze(['toward-support']);
const LOAD_CATEGORIES = Object.freeze(['live-load-deflection', 'positive-wind', 'uniform-pressure-other']);
const PROJECT_APPLICABILITY_FIELDS = Object.freeze(['spanTypes','supportSpacingMRange','overhangConditions','loadDirections','loadCategories']);
const APPLICABILITY_RULE = 'Project applicability is evaluated per physical sheet piece against explicit source applicability. Exact piece span type, every actual purlin-to-purlin support spacing, the piece-specific roof-edge overhang condition, load direction and explicitly accepted target load category must all be covered. Support spacings are never averaged and source-defined labels are never treated as wildcards.';
const PIECE_OVERHANG_RULE = 'Overhang applicability is piece-specific. A piece has with-overhang only when it reaches an eave or ridge roof boundary beyond its outermost purlin support. Interior end-lapped pieces are not assigned the whole-run roof-edge overhang by convenience.';
const SOURCE_CONSISTENCY_RULE = 'Whenever source applicability supplies a span, spacing, overhang, direction or category field, it must cover the source row condition it accompanies. Contradictory source-row applicability is rejected rather than widened.';
const LOAD_CATEGORY_RULE = 'The target load category is an explicit project-use input with provenance. A live-load/deflection row is not reused as positive-wind capacity unless the source applicability explicitly covers positive-wind.';
const BOUNDARY = 'This bridge decides only whether accepted source evidence explicitly covers the accepted project panel geometry and target load category. It does not select a governing capacity row, interpolate or extrapolate capacity, convert engineering bases, calculate panel demand or utilization, rate end-lap strength, resolve local sheet-to-purlin contact capacity, rate purlin local bearing/web crippling, rate screw compression/bearing/shear, or promote roof-system PASS.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function fingerprint(value) {
  const text = JSON.stringify(stable(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${label} must be finite.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function enumValue(value, allowed, label) {
  const normalized = nonEmpty(value, label).toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
  return normalized;
}
function nullableText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function rangeCovers(range, actual) { return range != null && Number(actual) >= Number(range.min) - EPS && Number(actual) <= Number(range.max) + EPS; }
function listCovers(values, actual) { return Array.isArray(values) && values.includes(actual); }

function sourceConditionConsistency(evidence) {
  const applicability = evidence.sourceApplicability ?? {};
  const condition = evidence.sourceCondition ?? {};
  const contradictions = [];
  if (applicability.spanTypes != null && !listCovers(applicability.spanTypes, condition.spanType)) contradictions.push('spanTypes');
  if (applicability.supportSpacingMRange != null && !rangeCovers(applicability.supportSpacingMRange, condition.supportSpacingM)) contradictions.push('supportSpacingMRange');
  if (applicability.overhangConditions != null && !listCovers(applicability.overhangConditions, condition.overhangCondition)) contradictions.push('overhangConditions');
  if (applicability.loadDirections != null && !listCovers(applicability.loadDirections, condition.loadDirection)) contradictions.push('loadDirections');
  if (applicability.loadCategories != null && !listCovers(applicability.loadCategories, condition.loadCategory)) contradictions.push('loadCategories');
  if (contradictions.length) {
    throw new Error(`Roof-sheet evidence '${evidence.evidenceId}' source applicability contradicts its own source row for: ${contradictions.join(', ')}.`);
  }
  return true;
}

function pieceOverhangCondition(piece, run, slopeLengthM) {
  const reachesEave = Math.abs(Number(piece.yRangeM?.y0M)) <= EPS;
  const reachesRidge = Math.abs(Number(piece.yRangeM?.y1M) - slopeLengthM) <= EPS;
  const eaveOverhang = reachesEave ? finite(run.roofEdgeSupportGeometry?.eaveOverhangM, `${run.runId}.roofEdgeSupportGeometry.eaveOverhangM`) : 0;
  const ridgeOverhang = reachesRidge ? finite(run.roofEdgeSupportGeometry?.ridgeOverhangM, `${run.runId}.roofEdgeSupportGeometry.ridgeOverhangM`) : 0;
  return {
    condition:(eaveOverhang > EPS || ridgeOverhang > EPS) ? 'with-overhang' : 'no-overhang',
    reachesEave,
    reachesRidge,
    eaveOverhangM:eaveOverhang,
    ridgeOverhangM:ridgeOverhang
  };
}

function evaluatePiece(evidence, run, piece, slopeLengthM, targetLoadCategory) {
  const applicability = evidence.sourceApplicability ?? {};
  const productStatus = evidence.coverage?.productApplicabilityStatus;
  const missingProjectFields = PROJECT_APPLICABILITY_FIELDS.filter((field) => applicability[field] == null);
  const overhang = pieceOverhangCondition(piece, run, slopeLengthM);
  const actualSpanLengthsM = piece.spans.map((span, index) => finite(span.spanLengthM, `${run.runId}.${piece.pieceId}.spans[${index}].spanLengthM`));
  const mismatches = [];

  if (applicability.spanTypes != null && !listCovers(applicability.spanTypes, piece.spanType)) mismatches.push('spanType');
  if (applicability.supportSpacingMRange != null) {
    const uncovered = actualSpanLengthsM.filter((spacing) => !rangeCovers(applicability.supportSpacingMRange, spacing));
    if (uncovered.length) mismatches.push('supportSpacingMRange');
  }
  if (applicability.overhangConditions != null && !listCovers(applicability.overhangConditions, overhang.condition)) mismatches.push('overhangCondition');
  if (applicability.loadDirections != null && !listCovers(applicability.loadDirections, 'toward-support')) mismatches.push('loadDirection');
  if (applicability.loadCategories != null && !listCovers(applicability.loadCategories, targetLoadCategory)) mismatches.push('loadCategory');

  let status = 'PROJECT_APPLICABILITY_COMPLETE';
  if (productStatus !== 'PRODUCT_APPLICABILITY_COMPLETE') status = 'REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY';
  else if (missingProjectFields.length) status = 'REFERENCE_ONLY_INCOMPLETE_PROJECT_APPLICABILITY';
  else if (mismatches.length) status = 'PROJECT_APPLICABILITY_EXCLUDED';

  return {
    runId:run.runId,
    pieceId:piece.pieceId,
    pieceSpanType:piece.spanType,
    actualSupportSpacingsM:actualSpanLengthsM,
    pieceOverhang:overhang,
    targetLoadDirection:'toward-support',
    targetLoadCategory,
    missingRequiredProjectApplicabilityFields:missingProjectFields,
    mismatchReasons:mismatches,
    status
  };
}

function normalizeEvidenceApplicability(upstream, targetLoadCategory) {
  const evidenceRows = upstream.upstreamRoofSheetPositivePressureCapacityEvidenceAcceptance?.capacityEvidence;
  if (!Array.isArray(evidenceRows) || !evidenceRows.length) throw new Error('Panel span/continuity acceptance must preserve at least one positive-pressure capacity-evidence row.');
  const slopeLengthM = finite(upstream.projectBasis?.roofSlopeLengthM, 'projectBasis.roofSlopeLengthM');
  const allPieces = upstream.panelRuns.flatMap((run) => run.panelPieces.map((piece) => ({run,piece})));
  const pieceKeys = allPieces.map(({run,piece}) => `${run.runId}/${piece.pieceId}`);

  const evaluations = evidenceRows.map((evidence) => {
    sourceConditionConsistency(evidence);
    const pieceApplicability = allPieces.map(({run,piece}) => evaluatePiece(evidence, run, piece, slopeLengthM, targetLoadCategory));
    const completePieceKeys = pieceApplicability.filter((item) => item.status === 'PROJECT_APPLICABILITY_COMPLETE').map((item) => `${item.runId}/${item.pieceId}`);
    const referenceOnlyPieceKeys = pieceApplicability.filter((item) => item.status.startsWith('REFERENCE_ONLY_')).map((item) => `${item.runId}/${item.pieceId}`);
    const excludedPieceKeys = pieceApplicability.filter((item) => item.status === 'PROJECT_APPLICABILITY_EXCLUDED').map((item) => `${item.runId}/${item.pieceId}`);
    let projectApplicabilityStatus = 'PROJECT_APPLICABILITY_COMPLETE';
    if (pieceApplicability.some((item) => item.status === 'REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY')) projectApplicabilityStatus = 'REFERENCE_ONLY_INCOMPLETE_PRODUCT_APPLICABILITY';
    else if (pieceApplicability.some((item) => item.status === 'REFERENCE_ONLY_INCOMPLETE_PROJECT_APPLICABILITY')) projectApplicabilityStatus = 'REFERENCE_ONLY_INCOMPLETE_PROJECT_APPLICABILITY';
    else if (excludedPieceKeys.length) projectApplicabilityStatus = 'PROJECT_APPLICABILITY_EXCLUDED';
    return {
      evidenceId:evidence.evidenceId,
      productApplicabilityStatus:evidence.coverage?.productApplicabilityStatus ?? 'UNKNOWN',
      sourceCondition:clone(evidence.sourceCondition),
      sourceApplicability:clone(evidence.sourceApplicability),
      applicabilitySourceReference:evidence.applicabilitySourceReference,
      pieceApplicability,
      completePieceKeys,
      referenceOnlyPieceKeys,
      excludedPieceKeys,
      projectApplicabilityStatus
    };
  });

  const coveredPieceKeys = new Set();
  for (const evaluation of evaluations) {
    for (const piece of evaluation.pieceApplicability) {
      if (piece.status === 'PROJECT_APPLICABILITY_COMPLETE') coveredPieceKeys.add(`${piece.runId}/${piece.pieceId}`);
    }
  }
  return {
    evaluations,
    pieceKeys,
    coveredPieceKeys:[...coveredPieceKeys],
    uncoveredPieceKeys:pieceKeys.filter((key) => !coveredPieceKeys.has(key))
  };
}

function buildRecord({ roofSheetPanelSpanContinuityAcceptance, targetLoadCategory, targetLoadCategorySourceReference, note = null } = {}) {
  const upstream = clone(roofSheetPanelSpanContinuityAcceptance);
  validateRoofSheetPanelSpanContinuityAcceptance(upstream);
  const category = enumValue(targetLoadCategory, LOAD_CATEGORIES, 'targetLoadCategory');
  const categorySource = nonEmpty(targetLoadCategorySourceReference, 'targetLoadCategorySourceReference');
  const result = normalizeEvidenceApplicability(upstream, category);
  const projectApplicableEvidenceIds = result.evaluations.filter((item) => item.projectApplicabilityStatus === 'PROJECT_APPLICABILITY_COMPLETE').map((item) => item.evidenceId);
  const referenceOnlyEvidenceIds = result.evaluations.filter((item) => item.projectApplicabilityStatus.startsWith('REFERENCE_ONLY_')).map((item) => item.evidenceId);
  const excludedEvidenceIds = result.evaluations.filter((item) => item.projectApplicabilityStatus === 'PROJECT_APPLICABILITY_EXCLUDED').map((item) => item.evidenceId);
  const allPiecesCovered = result.uncoveredPieceKeys.length === 0;

  return {
    schemaVersion:ROOF_SHEET_POSITIVE_PRESSURE_PROJECT_APPLICABILITY_SCHEMA,
    status:STATUS,
    upstreamRoofSheetPanelSpanContinuityAcceptance:upstream,
    targetProjectUse:{
      loadDirection:'toward-support',
      loadCategory:category,
      sourceReference:categorySource
    },
    evidenceApplicability:result.evaluations,
    integrity:{
      panelSpanContinuityFingerprint:fingerprint(upstream),
      targetProjectUseFingerprint:fingerprint({loadDirection:'toward-support',loadCategory:category,sourceReference:categorySource}),
      evidenceApplicabilityFingerprint:fingerprint(result.evaluations)
    },
    summary:{
      evidenceCount:result.evaluations.length,
      physicalSheetPieceCount:result.pieceKeys.length,
      projectApplicableEvidenceIds,
      referenceOnlyEvidenceIds,
      excludedEvidenceIds,
      coveredPieceKeys:result.coveredPieceKeys,
      uncoveredPieceKeys:result.uncoveredPieceKeys,
      anyProjectApplicableEvidence:projectApplicableEvidenceIds.length > 0,
      allPhysicalSheetPiecesCoveredByAtLeastOneApplicableEvidence:allPiecesCovered,
      projectCapacityEvidenceApplicabilityStatus:allPiecesCovered ? 'EXPLICIT_PROJECT_APPLICABILITY_AVAILABLE' : 'INCOMPLETE_OR_EXCLUDED',
      capacityRowSelectionStatus:'UNRESOLVED',
      demandCapacityBasisAlignmentStatus:'UNRESOLVED',
      positivePressurePanelUtilizationStatus:'UNRESOLVED',
      endLapCapacityStatus:'UNRESOLVED',
      localSupportContactCapacityStatus:'UNRESOLVED',
      roofSystemPass:null
    },
    sourceBasis:{
      applicabilityRule:APPLICABILITY_RULE,
      pieceOverhangRule:PIECE_OVERHANG_RULE,
      sourceConsistencyRule:SOURCE_CONSISTENCY_RULE,
      loadCategoryRule:LOAD_CATEGORY_RULE
    },
    implementation:{
      exactPanelSpanContinuityReused:true,
      sourceRowConsistencyChecked:true,
      pieceSpecificSpanTypeChecked:true,
      everyActualSupportSpacingChecked:true,
      pieceSpecificOverhangChecked:true,
      explicitTargetLoadCategoryChecked:true,
      sourceDefinedWildcardAssumed:false,
      capacityRowSelectionImplemented:false,
      demandCapacityBasisAlignmentImplemented:false,
      positivePressurePanelUtilizationImplemented:false,
      endLapCapacityImplemented:false,
      localSheetToPurlinContactCapacityImplemented:false,
      purlinLocalBearingWebCripplingCapacityImplemented:false,
      screwCompressionBearingShearCapacityImplemented:false,
      roofSystemPassPromotionImplemented:false
    },
    note:nullableText(note),
    boundary:BOUNDARY
  };
}

function rebuildInput(record) {
  return {
    roofSheetPanelSpanContinuityAcceptance:record.upstreamRoofSheetPanelSpanContinuityAcceptance,
    targetLoadCategory:record.targetProjectUse?.loadCategory,
    targetLoadCategorySourceReference:record.targetProjectUse?.sourceReference,
    note:record.note
  };
}

export function createRoofSheetPositivePressureProjectApplicabilityAcceptance(input = {}) {
  const record = buildRecord(input);
  validateRoofSheetPositivePressureProjectApplicabilityAcceptance(record);
  return clone(record);
}

export function validateRoofSheetPositivePressureProjectApplicabilityAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof-sheet project-applicability record must be an object.');
  if (record.schemaVersion !== ROOF_SHEET_POSITIVE_PRESSURE_PROJECT_APPLICABILITY_SCHEMA) throw new Error(`Unsupported roof-sheet project-applicability schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof-sheet project-applicability status changed.');
  if (record.sourceBasis?.applicabilityRule !== APPLICABILITY_RULE || record.sourceBasis?.pieceOverhangRule !== PIECE_OVERHANG_RULE || record.sourceBasis?.sourceConsistencyRule !== SOURCE_CONSISTENCY_RULE || record.sourceBasis?.loadCategoryRule !== LOAD_CATEGORY_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof-sheet project-applicability engineering boundary changed.');
  }
  const expected = buildRecord(rebuildInput(record));
  if (!sameRecord(record, expected)) throw new Error('Roof-sheet project-applicability record changed from its deterministic accepted result.');
  if (record.summary?.capacityRowSelectionStatus !== 'UNRESOLVED' || record.summary?.demandCapacityBasisAlignmentStatus !== 'UNRESOLVED' || record.summary?.positivePressurePanelUtilizationStatus !== 'UNRESOLVED' || record.summary?.endLapCapacityStatus !== 'UNRESOLVED' || record.summary?.localSupportContactCapacityStatus !== 'UNRESOLVED') {
    throw new Error('Roof-sheet project-applicability record was improperly promoted beyond applicability screening.');
  }
  if (record.summary?.roofSystemPass !== null) throw new Error('Roof-sheet project applicability must not promote roofSystemPass.');
  return true;
}

export function serializeRoofSheetPositivePressureProjectApplicabilityAcceptance(record) {
  validateRoofSheetPositivePressureProjectApplicabilityAcceptance(record);
  return JSON.stringify(stable(record), null, 2);
}

export function parseRoofSheetPositivePressureProjectApplicabilityAcceptance(text) {
  const record = JSON.parse(text);
  validateRoofSheetPositivePressureProjectApplicabilityAcceptance(record);
  return clone(record);
}
