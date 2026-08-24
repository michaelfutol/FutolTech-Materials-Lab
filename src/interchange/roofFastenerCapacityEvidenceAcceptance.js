import { validateRoofSheetFastenerLayoutAcceptance } from './roofSheetFastenerLayoutAcceptance.js';

export const ROOF_FASTENER_CAPACITY_EVIDENCE_SCHEMA = 'futoltech.roof-fastener-capacity-evidence/1';

const STATUS = 'ROOF_FASTENER_ATTACHMENT_DETAIL_AND_CAPACITY_EVIDENCE_ACCEPTED_UTILIZATION_UNRESOLVED';
const EPS = 1e-9;
const MECHANISMS = Object.freeze(['pull-out', 'pull-over']);
const SOURCE_TYPES = Object.freeze(['manufacturer-published', 'laboratory-test', 'project-test', 'authorized-code-calculation']);
const CAPACITY_TYPES = Object.freeze(['nominal', 'allowable', 'design', 'test-ultimate-reference']);
const DESIGN_BASES = Object.freeze(['lrfd', 'asd', 'manufacturer-rated', 'test-reference', 'unclassified']);
const BEARING_COMPONENTS = Object.freeze(['head', 'washer']);
const DETAIL_RULE = 'The accepted roofing attachment detail must explicitly identify the roof sheet, purlin substrate and self-drilling screw geometry/material/installation state that later capacity evidence is intended to cover. Product identity, base-metal thickness, strengths and fastener bearing/penetration dimensions are never inferred from a generic screw label.';
const EVIDENCE_RULE = 'A capacity value may be stored only with explicit mechanism, value type, design basis, source and stated applicability. Applicability is checked against the accepted attachment detail. Missing applicability does not become a match: the evidence remains reference-only and cannot be used by a future utilization check until the required applicability fields are complete.';
const BASIS_RULE = 'Nominal, ASD allowable, LRFD design and ultimate-test reference values remain distinct. This acceptance layer performs no safety-factor, resistance-factor or demand-basis conversion and never compares capacity to the M4 screw demand route.';
const BOUNDARY = 'This record accepts an explicit roof-sheet/self-drilling-screw/purlin attachment detail and source-backed pull-out/pull-over capacity evidence. It does not derive a code capacity equation, select a governing capacity, align strength-vs-ASD demand bases, calculate utilization, model fastener tension/shear/group action, rate roof-sheet structural capacity, rate purlin local failure, or promote any connection/roof-system PASS.';

const REQUIRED_APPLICABILITY = Object.freeze({
  'pull-out': Object.freeze([
    'fastenerSystemIds',
    'fastenerDiameterMmRange',
    'substrateBaseMetalThicknessMmRange',
    'substrateUltimateStrengthMPaRange',
    'minimumThreadPenetrationMm'
  ]),
  'pull-over': Object.freeze([
    'fastenerSystemIds',
    'roofSheetProductIds',
    'roofSheetProfileIds',
    'attachmentPositions',
    'bearingDiameterMmRange',
    'roofSheetBaseMetalThicknessMmRange',
    'roofSheetUltimateStrengthMPaRange'
  ])
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
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
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}
function nullableText(value) {
  return value == null || String(value).trim() === '' ? null : String(value).trim();
}
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function enumValue(value, allowed, label) {
  const normalized = nonEmpty(value, label).toLowerCase();
  if (!allowed.includes(normalized)) throw new Error(`${label} must be one of: ${allowed.join(', ')}.`);
  return normalized;
}
function dateText(value, label) {
  const text = nonEmpty(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must use YYYY-MM-DD.`);
  return text;
}
function stringList(value, label) {
  if (value == null) return null;
  if (!Array.isArray(value) || !value.length) throw new Error(`${label} must be a non-empty array when supplied.`);
  const clean = value.map((item, index) => nonEmpty(item, `${label}[${index}]`));
  if (new Set(clean).size !== clean.length) throw new Error(`${label} must not contain duplicates.`);
  return clean;
}
function numericRange(value, label) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object with min/max.`);
  const min = positive(value.min, `${label}.min`);
  const max = positive(value.max, `${label}.max`);
  if (max + EPS < min) throw new Error(`${label}.max must be greater than or equal to min.`);
  return { min, max };
}
function rangeCovers(range, actual) { return range != null && actual >= range.min - EPS && actual <= range.max + EPS; }
function listCovers(values, actual) { return values != null && values.includes(actual); }

function normalizeMaterial({ grade, yieldStrengthMPa, ultimateStrengthMPa, sourceReference }, label) {
  const fy = positive(yieldStrengthMPa, `${label}.yieldStrengthMPa`);
  const fu = positive(ultimateStrengthMPa, `${label}.ultimateStrengthMPa`);
  if (fu + EPS < fy) throw new Error(`${label}.ultimateStrengthMPa must be greater than or equal to yield strength.`);
  return {
    grade: nonEmpty(grade, `${label}.grade`),
    yieldStrengthMPa: fy,
    ultimateStrengthMPa: fu,
    sourceReference: nonEmpty(sourceReference, `${label}.sourceReference`)
  };
}

function normalizeAttachmentDetail(layout, input = {}) {
  validateRoofSheetFastenerLayoutAcceptance(layout);
  const sheetMaterial = normalizeMaterial({
    grade: input.roofSheet?.materialGrade,
    yieldStrengthMPa: input.roofSheet?.yieldStrengthMPa,
    ultimateStrengthMPa: input.roofSheet?.ultimateStrengthMPa,
    sourceReference: input.roofSheet?.materialSourceReference
  }, 'roofSheet.material');
  const substrateMaterial = normalizeMaterial({
    grade: input.purlinSubstrate?.materialGrade,
    yieldStrengthMPa: input.purlinSubstrate?.yieldStrengthMPa,
    ultimateStrengthMPa: input.purlinSubstrate?.ultimateStrengthMPa,
    sourceReference: input.purlinSubstrate?.materialSourceReference
  }, 'purlinSubstrate.material');

  const substrateSectionId = nonEmpty(input.purlinSubstrate?.sectionId, 'purlinSubstrate.sectionId');
  if (substrateSectionId !== layout.projectBasis.purlinSectionId) throw new Error('Purlin substrate sectionId must match the accepted Roof Bay fastener-layout purlin section.');
  const fastenerSystemId = nonEmpty(input.fastener?.systemId, 'fastener.systemId');
  if (fastenerSystemId !== layout.fastenerSystem.id) throw new Error('Fastener systemId must match the accepted Roof Bay fastener-layout fastener system.');
  const attachmentPosition = nonEmpty(input.fastener?.attachmentPosition, 'fastener.attachmentPosition').toLowerCase();
  if (attachmentPosition !== layout.fastenerSystem.attachmentPosition) throw new Error('Fastener attachmentPosition must match the accepted Roof Bay fastener-layout attachment position.');

  const installedThreadPenetrationMm = positive(input.fastener?.installedThreadPenetrationMm, 'fastener.installedThreadPenetrationMm');
  const requiredMinimumThreadPenetrationMm = positive(input.fastener?.requiredMinimumThreadPenetrationMm, 'fastener.requiredMinimumThreadPenetrationMm');
  if (installedThreadPenetrationMm + EPS < requiredMinimumThreadPenetrationMm) throw new Error('Installed thread penetration is less than the explicitly sourced minimum thread penetration.');

  return {
    roofSheet: {
      productId: nonEmpty(input.roofSheet?.productId, 'roofSheet.productId'),
      description: nonEmpty(input.roofSheet?.description, 'roofSheet.description'),
      profileId: nonEmpty(input.roofSheet?.profileId, 'roofSheet.profileId'),
      baseMetalThicknessMm: positive(input.roofSheet?.baseMetalThicknessMm, 'roofSheet.baseMetalThicknessMm'),
      geometrySourceReference: nonEmpty(input.roofSheet?.geometrySourceReference, 'roofSheet.geometrySourceReference'),
      material: sheetMaterial
    },
    purlinSubstrate: {
      sectionId: substrateSectionId,
      baseMetalThicknessMm: positive(input.purlinSubstrate?.baseMetalThicknessMm, 'purlinSubstrate.baseMetalThicknessMm'),
      geometrySourceReference: nonEmpty(input.purlinSubstrate?.geometrySourceReference, 'purlinSubstrate.geometrySourceReference'),
      material: substrateMaterial
    },
    fastener: {
      systemId: fastenerSystemId,
      description: nonEmpty(input.fastener?.description, 'fastener.description'),
      diameterMm: positive(input.fastener?.diameterMm, 'fastener.diameterMm'),
      threadPitchDescription: nonEmpty(input.fastener?.threadPitchDescription, 'fastener.threadPitchDescription'),
      headStyle: nonEmpty(input.fastener?.headStyle, 'fastener.headStyle'),
      bearingComponent: enumValue(input.fastener?.bearingComponent, BEARING_COMPONENTS, 'fastener.bearingComponent'),
      bearingDiameterMm: positive(input.fastener?.bearingDiameterMm, 'fastener.bearingDiameterMm'),
      drillPoint: nonEmpty(input.fastener?.drillPoint, 'fastener.drillPoint'),
      materialDescription: nonEmpty(input.fastener?.materialDescription, 'fastener.materialDescription'),
      attachmentPosition,
      installedThreadPenetrationMm,
      requiredMinimumThreadPenetrationMm,
      specificationSourceReference: nonEmpty(input.fastener?.specificationSourceReference, 'fastener.specificationSourceReference'),
      installationSourceReference: nonEmpty(input.fastener?.installationSourceReference, 'fastener.installationSourceReference')
    },
    detailSourceReference: nonEmpty(input.detailSourceReference, 'detailSourceReference')
  };
}

function normalizeApplicability(value = {}) {
  return {
    fastenerSystemIds: stringList(value.fastenerSystemIds, 'sourceApplicability.fastenerSystemIds'),
    roofSheetProductIds: stringList(value.roofSheetProductIds, 'sourceApplicability.roofSheetProductIds'),
    roofSheetProfileIds: stringList(value.roofSheetProfileIds, 'sourceApplicability.roofSheetProfileIds'),
    attachmentPositions: value.attachmentPositions == null ? null : stringList(value.attachmentPositions, 'sourceApplicability.attachmentPositions').map((item) => item.toLowerCase()),
    fastenerDiameterMmRange: numericRange(value.fastenerDiameterMmRange, 'sourceApplicability.fastenerDiameterMmRange'),
    substrateBaseMetalThicknessMmRange: numericRange(value.substrateBaseMetalThicknessMmRange, 'sourceApplicability.substrateBaseMetalThicknessMmRange'),
    substrateUltimateStrengthMPaRange: numericRange(value.substrateUltimateStrengthMPaRange, 'sourceApplicability.substrateUltimateStrengthMPaRange'),
    minimumThreadPenetrationMm: value.minimumThreadPenetrationMm == null ? null : positive(value.minimumThreadPenetrationMm, 'sourceApplicability.minimumThreadPenetrationMm'),
    bearingDiameterMmRange: numericRange(value.bearingDiameterMmRange, 'sourceApplicability.bearingDiameterMmRange'),
    roofSheetBaseMetalThicknessMmRange: numericRange(value.roofSheetBaseMetalThicknessMmRange, 'sourceApplicability.roofSheetBaseMetalThicknessMmRange'),
    roofSheetUltimateStrengthMPaRange: numericRange(value.roofSheetUltimateStrengthMPaRange, 'sourceApplicability.roofSheetUltimateStrengthMPaRange')
  };
}

function coverageFor(mechanism, applicability, detail) {
  const actual = {
    fastenerSystemIds: detail.fastener.systemId,
    roofSheetProductIds: detail.roofSheet.productId,
    roofSheetProfileIds: detail.roofSheet.profileId,
    attachmentPositions: detail.fastener.attachmentPosition,
    fastenerDiameterMmRange: detail.fastener.diameterMm,
    substrateBaseMetalThicknessMmRange: detail.purlinSubstrate.baseMetalThicknessMm,
    substrateUltimateStrengthMPaRange: detail.purlinSubstrate.material.ultimateStrengthMPa,
    minimumThreadPenetrationMm: detail.fastener.installedThreadPenetrationMm,
    bearingDiameterMmRange: detail.fastener.bearingDiameterMm,
    roofSheetBaseMetalThicknessMmRange: detail.roofSheet.baseMetalThicknessMm,
    roofSheetUltimateStrengthMPaRange: detail.roofSheet.material.ultimateStrengthMPa
  };
  const missing = [];
  for (const field of REQUIRED_APPLICABILITY[mechanism]) {
    const supplied = applicability[field];
    if (supplied == null) {
      missing.push(field);
      continue;
    }
    let covered = false;
    if (field.endsWith('Ids') || field === 'attachmentPositions') covered = listCovers(supplied, actual[field]);
    else if (field.endsWith('Range')) covered = rangeCovers(supplied, actual[field]);
    else if (field === 'minimumThreadPenetrationMm') covered = actual[field] + EPS >= supplied;
    if (!covered) throw new Error(`Capacity evidence ${mechanism} applicability does not cover the accepted attachment detail field '${field}'.`);
  }
  return {
    requiredFields: [...REQUIRED_APPLICABILITY[mechanism]],
    missingRequiredFields: missing,
    status: missing.length ? 'REFERENCE_ONLY_INCOMPLETE_APPLICABILITY' : 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL'
  };
}

function normalizeEvidence(values, detail) {
  if (!Array.isArray(values) || values.length < 1) throw new Error('capacityEvidence must contain at least one source-backed pull-out or pull-over record.');
  const seenIds = new Set();
  const seenMechanisms = new Set();
  return values.map((item, index) => {
    const evidenceId = nonEmpty(item?.evidenceId, `capacityEvidence[${index}].evidenceId`);
    if (seenIds.has(evidenceId)) throw new Error(`Duplicate capacity evidenceId '${evidenceId}'.`);
    seenIds.add(evidenceId);
    const mechanism = enumValue(item?.mechanism, MECHANISMS, `capacityEvidence[${index}].mechanism`);
    if (seenMechanisms.has(mechanism)) throw new Error(`This acceptance slice allows only one selected evidence record for mechanism '${mechanism}'.`);
    seenMechanisms.add(mechanism);
    const sourceApplicability = normalizeApplicability(item?.sourceApplicability ?? {});
    const coverage = coverageFor(mechanism, sourceApplicability, detail);
    return {
      evidenceId,
      mechanism,
      sourceType: enumValue(item?.sourceType, SOURCE_TYPES, `capacityEvidence[${index}].sourceType`),
      sourceReference: nonEmpty(item?.sourceReference, `capacityEvidence[${index}].sourceReference`),
      sourceDocumentId: nonEmpty(item?.sourceDocumentId, `capacityEvidence[${index}].sourceDocumentId`),
      sourceCheckedDate: dateText(item?.sourceCheckedDate, `capacityEvidence[${index}].sourceCheckedDate`),
      capacity: {
        valueKN: positive(item?.capacity?.valueKN, `capacityEvidence[${index}].capacity.valueKN`),
        capacityType: enumValue(item?.capacity?.capacityType, CAPACITY_TYPES, `capacityEvidence[${index}].capacity.capacityType`),
        designBasis: enumValue(item?.capacity?.designBasis, DESIGN_BASES, `capacityEvidence[${index}].capacity.designBasis`),
        basisSourceReference: nonEmpty(item?.capacity?.basisSourceReference, `capacityEvidence[${index}].capacity.basisSourceReference`)
      },
      sourceApplicability,
      coverage,
      applicabilitySourceReference: nonEmpty(item?.applicabilitySourceReference, `capacityEvidence[${index}].applicabilitySourceReference`),
      note: nullableText(item?.note)
    };
  });
}

function buildRecord({ roofSheetFastenerLayoutAcceptance, attachmentDetail, capacityEvidence, note = null } = {}) {
  const upstream = clone(roofSheetFastenerLayoutAcceptance);
  validateRoofSheetFastenerLayoutAcceptance(upstream);
  const detail = normalizeAttachmentDetail(upstream, attachmentDetail);
  const evidence = normalizeEvidence(capacityEvidence, detail);
  const complete = evidence.filter((item) => item.coverage.status === 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL').map((item) => item.mechanism);
  const referenceOnly = evidence.filter((item) => item.coverage.status !== 'APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL').map((item) => item.mechanism);
  return {
    schemaVersion: ROOF_FASTENER_CAPACITY_EVIDENCE_SCHEMA,
    status: STATUS,
    upstreamRoofSheetFastenerLayoutAcceptance: upstream,
    attachmentDetail: detail,
    capacityEvidence: evidence,
    summary: {
      evidenceMechanisms: evidence.map((item) => item.mechanism),
      applicabilityCompleteMechanisms: complete,
      referenceOnlyMechanisms: referenceOnly,
      pullOutEvidenceApplicabilityComplete: complete.includes('pull-out'),
      pullOverEvidenceApplicabilityComplete: complete.includes('pull-over'),
      upliftPullOutAndPullOverEvidenceCoverageComplete: complete.includes('pull-out') && complete.includes('pull-over')
    },
    sourceBasis: {
      detailRule: DETAIL_RULE,
      evidenceRule: EVIDENCE_RULE,
      basisRule: BASIS_RULE
    },
    implementation: {
      attachmentDetailAccepted: true,
      sourceBackedCapacityEvidenceStored: true,
      evidenceApplicabilityCoverageChecked: true,
      demandCapacityBasisAlignmentImplemented: false,
      pullOutUtilizationImplemented: false,
      pullOverUtilizationImplemented: false,
      fastenerTensionCapacityImplemented: false,
      fastenerShearCapacityImplemented: false,
      fastenerGroupActionImplemented: false,
      roofSheetStructuralCapacityImplemented: false,
      purlinLocalConnectionCapacityImplemented: false,
      purlinToRafterConnectionCapacityImplemented: false,
      governingConnectionCapacityImplemented: false,
      roofSystemPassPromotionImplemented: false
    },
    note: nullableText(note),
    boundary: BOUNDARY
  };
}

function rebuildInput(record) {
  const detail = record.attachmentDetail;
  return {
    roofSheetFastenerLayoutAcceptance: record.upstreamRoofSheetFastenerLayoutAcceptance,
    attachmentDetail: {
      roofSheet: {
        productId: detail.roofSheet.productId,
        description: detail.roofSheet.description,
        profileId: detail.roofSheet.profileId,
        baseMetalThicknessMm: detail.roofSheet.baseMetalThicknessMm,
        geometrySourceReference: detail.roofSheet.geometrySourceReference,
        materialGrade: detail.roofSheet.material.grade,
        yieldStrengthMPa: detail.roofSheet.material.yieldStrengthMPa,
        ultimateStrengthMPa: detail.roofSheet.material.ultimateStrengthMPa,
        materialSourceReference: detail.roofSheet.material.sourceReference
      },
      purlinSubstrate: {
        sectionId: detail.purlinSubstrate.sectionId,
        baseMetalThicknessMm: detail.purlinSubstrate.baseMetalThicknessMm,
        geometrySourceReference: detail.purlinSubstrate.geometrySourceReference,
        materialGrade: detail.purlinSubstrate.material.grade,
        yieldStrengthMPa: detail.purlinSubstrate.material.yieldStrengthMPa,
        ultimateStrengthMPa: detail.purlinSubstrate.material.ultimateStrengthMPa,
        materialSourceReference: detail.purlinSubstrate.material.sourceReference
      },
      fastener: {
        systemId: detail.fastener.systemId,
        description: detail.fastener.description,
        diameterMm: detail.fastener.diameterMm,
        threadPitchDescription: detail.fastener.threadPitchDescription,
        headStyle: detail.fastener.headStyle,
        bearingComponent: detail.fastener.bearingComponent,
        bearingDiameterMm: detail.fastener.bearingDiameterMm,
        drillPoint: detail.fastener.drillPoint,
        materialDescription: detail.fastener.materialDescription,
        attachmentPosition: detail.fastener.attachmentPosition,
        installedThreadPenetrationMm: detail.fastener.installedThreadPenetrationMm,
        requiredMinimumThreadPenetrationMm: detail.fastener.requiredMinimumThreadPenetrationMm,
        specificationSourceReference: detail.fastener.specificationSourceReference,
        installationSourceReference: detail.fastener.installationSourceReference
      },
      detailSourceReference: detail.detailSourceReference
    },
    capacityEvidence: record.capacityEvidence.map((item) => ({
      evidenceId: item.evidenceId,
      mechanism: item.mechanism,
      sourceType: item.sourceType,
      sourceReference: item.sourceReference,
      sourceDocumentId: item.sourceDocumentId,
      sourceCheckedDate: item.sourceCheckedDate,
      capacity: clone(item.capacity),
      sourceApplicability: clone(item.sourceApplicability),
      applicabilitySourceReference: item.applicabilitySourceReference,
      note: item.note
    })),
    note: record.note
  };
}

export function createRoofFastenerCapacityEvidenceAcceptance(input = {}) {
  const record = buildRecord(input);
  validateRoofFastenerCapacityEvidenceAcceptance(record);
  return clone(record);
}

export function validateRoofFastenerCapacityEvidenceAcceptance(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Roof fastener capacity-evidence record must be an object.');
  if (record.schemaVersion !== ROOF_FASTENER_CAPACITY_EVIDENCE_SCHEMA) throw new Error(`Unsupported roof fastener capacity-evidence schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Roof fastener capacity-evidence status changed.');
  if (record.sourceBasis?.detailRule !== DETAIL_RULE || record.sourceBasis?.evidenceRule !== EVIDENCE_RULE || record.sourceBasis?.basisRule !== BASIS_RULE || record.boundary !== BOUNDARY) {
    throw new Error('Roof fastener capacity-evidence engineering boundary changed.');
  }
  const expectedImplementation = {
    attachmentDetailAccepted: true,
    sourceBackedCapacityEvidenceStored: true,
    evidenceApplicabilityCoverageChecked: true,
    demandCapacityBasisAlignmentImplemented: false,
    pullOutUtilizationImplemented: false,
    pullOverUtilizationImplemented: false,
    fastenerTensionCapacityImplemented: false,
    fastenerShearCapacityImplemented: false,
    fastenerGroupActionImplemented: false,
    roofSheetStructuralCapacityImplemented: false,
    purlinLocalConnectionCapacityImplemented: false,
    purlinToRafterConnectionCapacityImplemented: false,
    governingConnectionCapacityImplemented: false,
    roofSystemPassPromotionImplemented: false
  };
  if (!sameRecord(record.implementation, expectedImplementation)) throw new Error('Roof fastener capacity-evidence record was improperly promoted beyond evidence acceptance.');
  const rebuilt = buildRecord(rebuildInput(record));
  if (!sameRecord(record, rebuilt)) throw new Error('Roof fastener capacity-evidence record changed from its deterministic layout/detail/evidence inputs.');
  return true;
}

export function serializeRoofFastenerCapacityEvidenceAcceptance(record) {
  validateRoofFastenerCapacityEvidenceAcceptance(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseRoofFastenerCapacityEvidenceAcceptance(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateRoofFastenerCapacityEvidenceAcceptance(parsed);
  return clone(parsed);
}
