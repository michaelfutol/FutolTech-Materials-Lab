import { validateRoofSheetPositivePressureCapacityEvidenceAcceptance } from './roofSheetPositivePressureCapacityEvidenceAcceptance.js';

export const ROOF_SHEET_PANEL_SPAN_CONTINUITY_SCHEMA = 'futoltech.roof-sheet-panel-span-continuity/1';

const STATUS = 'ROOF_SHEET_PANEL_SPAN_CONTINUITY_ACCEPTED_CAPACITY_APPLICABILITY_UNRESOLVED';
const EPS = 1e-9;
const AXIS_RULE = 'Roof-sheet structural spans are measured upslope between successive physical purlin support lines in the accepted Roof Bay roof-local frame. Rafter-to-rafter x distance is not the roof-sheet panel span for this record.';
const CONTINUITY_RULE = 'Continuity is accepted only from explicit physical sheet-piece geometry. A sheet piece crossing successive purlins is continuous across those supports for span-configuration identity; an end lap between separate physical pieces is a continuity break and is never promoted to monolithic panel continuity.';
const LAP_RULE = 'Adjacent physical sheet pieces in one run must overlap explicitly. The overlap geometry is the end lap. A purlin support may be identified inside that overlap, but no structural capacity of the lap or moment transfer through the lap is inferred.';
const COVERAGE_RULE = 'Panel runs must partition the full Roof Bay width without gaps or overlaps, and the physical pieces within each run must cover the full eave-to-ridge slope length without gaps. This acceptance describes geometry only; it does not select a manufacturer capacity row.';
const BOUNDARY = 'This record accepts explicit roof-sheet run, physical piece, support-span and end-lap geometry tied to the exact accepted Roof Bay purlin stations. It does not decide whether any positive-pressure capacity-evidence row applies to the project, align demand/capacity bases, calculate panel utilization, rate end-lap capacity, resolve local sheet-to-purlin contact stress, rate purlin local bearing/web crippling, rate screw compression/bearing/shear, or promote roof-system PASS.';

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
function nonNegative(value, label) {
  const number = finite(value, label);
  if (number < 0) throw new Error(`${label} must be zero or greater.`);
  return number;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nullableText(value) { return value == null || String(value).trim() === '' ? null : String(value).trim(); }
function nearlyEqual(left, right) { return Math.abs(Number(left) - Number(right)) <= EPS; }
function sameNumber(left, right, label) {
  if (!nearlyEqual(left, right)) throw new Error(`${label} changed from the accepted panel-span geometry.`);
}
function spanTypeFromCount(count) {
  if (count >= 1 && count <= 4) return `${count}-span`;
  return 'source-defined';
}

function projectBasisFromUpstream(upstream) {
  const fastenerEvidence = upstream.upstreamRoofFastenerCapacityEvidenceAcceptance;
  const layout = fastenerEvidence?.upstreamRoofSheetFastenerLayoutAcceptance;
  const basis = layout?.projectBasis;
  if (!basis?.geometry?.coordinateFrame || !Array.isArray(basis?.geometry?.purlinTributaryBands)) {
    throw new Error('Positive-pressure evidence must preserve the exact accepted Roof Bay fastener-layout project basis.');
  }
  const purlins = basis.geometry.purlinTributaryBands.map((band, index) => ({
    purlinLabel:nonEmpty(band.purlinLabel, `projectBasis.purlinTributaryBands[${index}].purlinLabel`),
    stationM:finite(band.stationM, `projectBasis.purlinTributaryBands[${index}].stationM`)
  }));
  for (let index = 1; index < purlins.length; index += 1) {
    if (!(purlins[index].stationM > purlins[index - 1].stationM + EPS)) throw new Error('Accepted Roof Bay purlin stations must be strictly increasing upslope.');
  }
  return {
    projectId:nonEmpty(basis.projectId, 'projectBasis.projectId'),
    coordinateFrame:clone(basis.geometry.coordinateFrame),
    rafterSpacingM:finite(basis.geometry.rafterSpacingM, 'projectBasis.geometry.rafterSpacingM'),
    roofSlopeLengthM:finite(basis.geometry.roofSlopeLengthM, 'projectBasis.geometry.roofSlopeLengthM'),
    purlins,
    purlinSectionId:nonEmpty(basis.purlinSectionId, 'projectBasis.purlinSectionId')
  };
}

function supportLinesInsidePiece(piece, purlins) {
  return purlins.filter((purlin) => purlin.stationM >= piece.y0M - EPS && purlin.stationM <= piece.y1M + EPS);
}

function normalizePieces(values, runId, slopeLengthM, purlins) {
  if (!Array.isArray(values) || !values.length) throw new Error(`${runId}.panelPieces must contain at least one physical sheet piece.`);
  const ids = new Set();
  const pieces = values.map((item, index) => {
    const pieceId = nonEmpty(item?.pieceId, `${runId}.panelPieces[${index}].pieceId`);
    if (ids.has(pieceId)) throw new Error(`Duplicate panel pieceId '${pieceId}' in run '${runId}'.`);
    ids.add(pieceId);
    const y0M = nonNegative(item?.y0M, `${pieceId}.y0M`);
    const y1M = finite(item?.y1M, `${pieceId}.y1M`);
    if (!(y1M > y0M + EPS)) throw new Error(`${pieceId}.y1M must be greater than y0M.`);
    if (y1M > slopeLengthM + EPS) throw new Error(`${pieceId} must remain within the Roof Bay slope length.`);
    const supports = supportLinesInsidePiece({y0M,y1M}, purlins);
    if (supports.length < 2) throw new Error(`${pieceId} must cross at least two physical purlin supports to define a supported roof-sheet span.`);
    const spans = [];
    for (let supportIndex = 0; supportIndex < supports.length - 1; supportIndex += 1) {
      const from = supports[supportIndex];
      const to = supports[supportIndex + 1];
      spans.push({
        spanId:`${pieceId}:S${supportIndex + 1}`,
        fromPurlinLabel:from.purlinLabel,
        toPurlinLabel:to.purlinLabel,
        y0M:from.stationM,
        y1M:to.stationM,
        spanLengthM:to.stationM - from.stationM
      });
    }
    return {
      pieceId,
      yRangeM:{y0M,y1M},
      pieceSourceReference:nonEmpty(item?.pieceSourceReference, `${pieceId}.pieceSourceReference`),
      supportSequence:supports.map((support) => ({...support})),
      spans,
      spanCount:spans.length,
      spanType:spanTypeFromCount(spans.length),
      continuityInterpretation:'ONE_PHYSICAL_SHEET_PIECE_CONTINUOUS_ACROSS_LISTED_INTERNAL_SUPPORTS_ONLY'
    };
  }).sort((left, right) => left.yRangeM.y0M - right.yRangeM.y0M || left.yRangeM.y1M - right.yRangeM.y1M);

  if (!nearlyEqual(pieces[0].yRangeM.y0M, 0)) throw new Error(`${runId} physical sheet pieces must start at the eave boundary y=0.`);
  if (!nearlyEqual(pieces[pieces.length - 1].yRangeM.y1M, slopeLengthM)) throw new Error(`${runId} physical sheet pieces must reach the ridge boundary at the full roof slope length.`);
  for (let index = 1; index < pieces.length; index += 1) {
    const lower = pieces[index - 1];
    const upper = pieces[index];
    if (!(lower.yRangeM.y1M > upper.yRangeM.y0M + EPS)) {
      throw new Error(`${runId} adjacent physical sheet pieces '${lower.pieceId}' and '${upper.pieceId}' must have an explicit positive end-lap overlap; gaps or zero-overlap butt joints are unsupported.`);
    }
  }
  return pieces;
}

function normalizeEndLaps(values, runId, pieces, purlins) {
  const requiredPairs = pieces.slice(0, -1).map((lower, index) => ({lower, upper:pieces[index + 1]}));
  if (requiredPairs.length === 0) {
    if (values != null && (!Array.isArray(values) || values.length !== 0)) throw new Error(`${runId}.endLaps must be empty for a single-piece panel run.`);
    return [];
  }
  if (!Array.isArray(values) || values.length !== requiredPairs.length) throw new Error(`${runId}.endLaps must contain exactly one record for every adjacent physical sheet-piece pair.`);
  const supplied = new Map();
  for (const [index, item] of values.entries()) {
    const lowerPieceId = nonEmpty(item?.lowerPieceId, `${runId}.endLaps[${index}].lowerPieceId`);
    const upperPieceId = nonEmpty(item?.upperPieceId, `${runId}.endLaps[${index}].upperPieceId`);
    const key = `${lowerPieceId}->${upperPieceId}`;
    if (supplied.has(key)) throw new Error(`Duplicate end-lap pair '${key}' in run '${runId}'.`);
    supplied.set(key, item);
  }
  return requiredPairs.map(({lower, upper}, index) => {
    const key = `${lower.pieceId}->${upper.pieceId}`;
    const item = supplied.get(key);
    if (!item) throw new Error(`${runId} is missing end-lap evidence for '${key}'.`);
    const y0M = upper.yRangeM.y0M;
    const y1M = lower.yRangeM.y1M;
    const lapLengthM = y1M - y0M;
    const statedLapLengthM = finite(item?.lapLengthM, `${runId}.endLaps[${index}].lapLengthM`);
    if (!(statedLapLengthM > EPS)) throw new Error(`${runId}.endLaps[${index}].lapLengthM must be greater than zero.`);
    sameNumber(statedLapLengthM, lapLengthM, `${runId}.endLaps[${index}].lapLengthM`);
    const lapSupportLabel = nullableText(item?.lapSupportLabel);
    let supportStatus = 'NO_PURLIN_SUPPORT_IDENTIFIED_IN_END_LAP';
    let supportStationM = null;
    if (lapSupportLabel != null) {
      const support = purlins.find((purlin) => purlin.purlinLabel === lapSupportLabel);
      if (!support) throw new Error(`${runId} end lap '${key}' references unknown purlin '${lapSupportLabel}'.`);
      if (support.stationM < y0M - EPS || support.stationM > y1M + EPS) throw new Error(`${runId} end lap '${key}' purlin '${lapSupportLabel}' is outside the physical overlap interval.`);
      supportStatus = 'PURLIN_SUPPORT_IDENTIFIED_WITHIN_END_LAP';
      supportStationM = support.stationM;
    }
    return {
      lapId:`${runId}:LAP${index + 1}`,
      lowerPieceId:lower.pieceId,
      upperPieceId:upper.pieceId,
      overlapRangeM:{y0M,y1M},
      lapLengthM,
      lapSupportLabel,
      supportStationM,
      supportStatus,
      lapDetailSourceReference:nonEmpty(item?.lapDetailSourceReference, `${runId}.endLaps[${index}].lapDetailSourceReference`),
      structuralContinuityAcrossLap:'NOT_INFERRED'
    };
  });
}

function normalizeRuns(values, basis) {
  if (!Array.isArray(values) || !values.length) throw new Error('panelRuns must contain at least one explicit roof-sheet run configuration.');
  const ids = new Set();
  const runs = values.map((item, index) => {
    const runId = nonEmpty(item?.runId, `panelRuns[${index}].runId`);
    if (ids.has(runId)) throw new Error(`Duplicate panel runId '${runId}'.`);
    ids.add(runId);
    const x0M = nonNegative(item?.x0M, `${runId}.x0M`);
    const x1M = finite(item?.x1M, `${runId}.x1M`);
    if (!(x1M > x0M + EPS)) throw new Error(`${runId}.x1M must be greater than x0M.`);
    if (x1M > basis.rafterSpacingM + EPS) throw new Error(`${runId} must remain within the Roof Bay rafter-to-rafter width.`);
    const pieces = normalizePieces(item?.panelPieces, runId, basis.roofSlopeLengthM, basis.purlins);
    const endLaps = normalizeEndLaps(item?.endLaps, runId, pieces, basis.purlins);
    const firstSupport = basis.purlins[0];
    const lastSupport = basis.purlins[basis.purlins.length - 1];
    return {
      runId,
      xRangeM:{x0M,x1M},
      widthM:x1M - x0M,
      runSourceReference:nonEmpty(item?.runSourceReference, `${runId}.runSourceReference`),
      panelPieces:pieces,
      endLaps,
      roofEdgeSupportGeometry:{
        eaveBoundaryM:0,
        firstPurlinLabel:firstSupport.purlinLabel,
        firstPurlinStationM:firstSupport.stationM,
        eaveOverhangM:firstSupport.stationM,
        lastPurlinLabel:lastSupport.purlinLabel,
        lastPurlinStationM:lastSupport.stationM,
        ridgeBoundaryM:basis.roofSlopeLengthM,
        ridgeOverhangM:basis.roofSlopeLengthM - lastSupport.stationM,
        overhangCondition:(firstSupport.stationM > EPS || basis.roofSlopeLengthM - lastSupport.stationM > EPS) ? 'with-overhang' : 'no-overhang'
      },
      continuityBreaks:endLaps.map((lap) => ({
        lapId:lap.lapId,
        lowerPieceId:lap.lowerPieceId,
        upperPieceId:lap.upperPieceId,
        lapSupportLabel:lap.lapSupportLabel,
        interpretation:'END_LAP_BETWEEN_SEPARATE_PHYSICAL_SHEET_PIECES_BREAKS_MONOLITHIC_CONTINUITY'
      }))
    };
  }).sort((left, right) => left.xRangeM.x0M - right.xRangeM.x0M || left.xRangeM.x1M - right.xRangeM.x1M);

  if (!nearlyEqual(runs[0].xRangeM.x0M, 0)) throw new Error('Panel-run coverage must start at Rafter A, x=0.');
  if (!nearlyEqual(runs[runs.length - 1].xRangeM.x1M, basis.rafterSpacingM)) throw new Error('Panel-run coverage must reach Rafter B at the full Roof Bay width.');
  for (let index = 1; index < runs.length; index += 1) {
    const previous = runs[index - 1];
    const current = runs[index];
    if (!nearlyEqual(previous.xRangeM.x1M, current.xRangeM.x0M)) {
      throw new Error('Panel runs must partition the Roof Bay width exactly with no x-direction gaps or overlaps.');
    }
  }
  return runs;
}

function rawRunInput(run) {
  return {
    runId:run.runId,
    x0M:run.xRangeM.x0M,
    x1M:run.xRangeM.x1M,
    runSourceReference:run.runSourceReference,
    panelPieces:run.panelPieces.map((piece) => ({
      pieceId:piece.pieceId,
      y0M:piece.yRangeM.y0M,
      y1M:piece.yRangeM.y1M,
      pieceSourceReference:piece.pieceSourceReference
    })),
    endLaps:run.endLaps.map((lap) => ({
      lowerPieceId:lap.lowerPieceId,
      upperPieceId:lap.upperPieceId,
      lapLengthM:lap.lapLengthM,
      lapSupportLabel:lap.lapSupportLabel,
      lapDetailSourceReference:lap.lapDetailSourceReference
    }))
  };
}

function buildRecord({ roofSheetPositivePressureCapacityEvidenceAcceptance, panelRuns, configurationSourceReference, note = null } = {}) {
  const upstream = clone(roofSheetPositivePressureCapacityEvidenceAcceptance);
  validateRoofSheetPositivePressureCapacityEvidenceAcceptance(upstream);
  const basis = projectBasisFromUpstream(upstream);
  const runs = normalizeRuns(panelRuns, basis);
  const pieceCount = runs.reduce((sum, run) => sum + run.panelPieces.length, 0);
  const spanCount = runs.reduce((sum, run) => sum + run.panelPieces.reduce((pieceSum, piece) => pieceSum + piece.spanCount, 0), 0);
  const endLapCount = runs.reduce((sum, run) => sum + run.endLaps.length, 0);
  const unsupportedEndLapCount = runs.reduce((sum, run) => sum + run.endLaps.filter((lap) => lap.lapSupportLabel == null).length, 0);
  return {
    schemaVersion:ROOF_SHEET_PANEL_SPAN_CONTINUITY_SCHEMA,
    status:STATUS,
    upstreamRoofSheetPositivePressureCapacityEvidenceAcceptance:upstream,
    projectBasis:basis,
    panelRuns:runs,
    integrity:{
      projectBasisFingerprint:fingerprint(basis),
      panelRunsFingerprint:fingerprint(runs)
    },
    summary:{
      panelRunCount:runs.length,
      physicalSheetPieceCount:pieceCount,
      supportedSpanCount:spanCount,
      endLapCount,
      unsupportedEndLapCount,
      fullRoofBayWidthCoverage:true,
      fullEaveToRidgeCoverage:true,
      projectPanelSpanConfigurationStatus:'EXPLICIT_GEOMETRY_ACCEPTED',
      capacityEvidenceProjectApplicabilityStatus:'UNRESOLVED',
      positivePressurePanelUtilizationStatus:'UNRESOLVED',
      endLapCapacityStatus:'UNRESOLVED',
      localSupportContactCapacityStatus:'UNRESOLVED',
      roofSystemPass:null
    },
    sourceBasis:{
      configurationSourceReference:nonEmpty(configurationSourceReference, 'configurationSourceReference'),
      axisRule:AXIS_RULE,
      continuityRule:CONTINUITY_RULE,
      lapRule:LAP_RULE,
      coverageRule:COVERAGE_RULE
    },
    implementation:{
      explicitPanelRunGeometryAccepted:true,
      exactPurlinSupportSequenceDerived:true,
      physicalSheetPieceContinuityDerived:true,
      endLapGeometryAccepted:true,
      endLapMonolithicContinuityAssumed:false,
      projectCapacityEvidenceApplicabilityImplemented:false,
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
    roofSheetPositivePressureCapacityEvidenceAcceptance:record.upstreamRoofSheetPositivePressureCapacityEvidenceAcceptance,
    panelRuns:record.panelRuns.map(rawRunInput),
    configurationSourceReference:record.sourceBasis?.configurationSourceReference,
    note:record.note
  };
}

export function createRoofSheetPanelSpanContinuityAcceptance(input = {}) {
  const record = buildRecord(input);
  validateRoofSheetPanelSpanContinuityAcceptance(record);
  return clone(record);
}

export function validateRoofSheetPanelSpanContinuityAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof-sheet panel span/continuity record must be an object.');
  if (record.schemaVersion !== ROOF_SHEET_PANEL_SPAN_CONTINUITY_SCHEMA) throw new Error(`Unsupported roof-sheet panel span/continuity schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof-sheet panel span/continuity status changed.');
  if (record.sourceBasis?.axisRule !== AXIS_RULE || record.sourceBasis?.continuityRule !== CONTINUITY_RULE || record.sourceBasis?.lapRule !== LAP_RULE || record.sourceBasis?.coverageRule !== COVERAGE_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof-sheet panel span/continuity engineering boundary changed.');
  }
  if (record.integrity?.projectBasisFingerprint !== fingerprint(record.projectBasis) || record.integrity?.panelRunsFingerprint !== fingerprint(record.panelRuns)) {
    throw new Error('Roof-sheet panel span/continuity record changed from its deterministic accepted geometry.');
  }
  const expectedImplementation = {
    explicitPanelRunGeometryAccepted:true,
    exactPurlinSupportSequenceDerived:true,
    physicalSheetPieceContinuityDerived:true,
    endLapGeometryAccepted:true,
    endLapMonolithicContinuityAssumed:false,
    projectCapacityEvidenceApplicabilityImplemented:false,
    demandCapacityBasisAlignmentImplemented:false,
    positivePressurePanelUtilizationImplemented:false,
    endLapCapacityImplemented:false,
    localSheetToPurlinContactCapacityImplemented:false,
    purlinLocalBearingWebCripplingCapacityImplemented:false,
    screwCompressionBearingShearCapacityImplemented:false,
    roofSystemPassPromotionImplemented:false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof-sheet panel span/continuity record was improperly promoted beyond geometry acceptance.');
  if (record.summary?.projectPanelSpanConfigurationStatus !== 'EXPLICIT_GEOMETRY_ACCEPTED'
    || record.summary?.capacityEvidenceProjectApplicabilityStatus !== 'UNRESOLVED'
    || record.summary?.positivePressurePanelUtilizationStatus !== 'UNRESOLVED'
    || record.summary?.endLapCapacityStatus !== 'UNRESOLVED'
    || record.summary?.localSupportContactCapacityStatus !== 'UNRESOLVED'
    || record.summary?.roofSystemPass !== null) {
    throw new Error('Roof-sheet panel span/continuity acceptance must not promote evidence applicability, utilization, local capacity or roof-system PASS.');
  }
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof-sheet panel span/continuity record no longer matches deterministic upstream evidence and explicit project geometry inputs.');
  return true;
}

export function serializeRoofSheetPanelSpanContinuityAcceptance(record) {
  validateRoofSheetPanelSpanContinuityAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofSheetPanelSpanContinuityAcceptance(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofSheetPanelSpanContinuityAcceptance(parsed);
  return clone(parsed);
}
