export const INTERCHANGE_SCHEMA_VERSION = 'futoltech.structural-interchange/1';

export const SOURCE_SYSTEMS = Object.freeze([
  'FutolTech Structural Lab',
  'FutolStructure',
  'RPE'
]);

export const OBJECT_TYPES = Object.freeze([
  'material',
  'section',
  'member',
  'connection-law',
  'assembly',
  'failure-law',
  'demand-envelope',
  'critical-specimen-request',
  'rpe-component-law'
]);

export const EVIDENCE_STATUSES = Object.freeze([
  'measured',
  'manufacturer-published',
  'standard',
  'peer-reviewed',
  'calibrated',
  'provisional',
  'user-supplied',
  'assumed-sensitivity',
  'unknown'
]);

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function requireFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function requirePositive(value, label) {
  requireFinite(value, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
  return value;
}

function assertAllowed(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`${label} '${value}' is unsupported.`);
  return value;
}

function plainClone(value) {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(plainClone);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainClone(item)]));
}

function normalizedProvenance(provenance) {
  if (!Array.isArray(provenance) || provenance.length === 0) throw new Error('Interchange provenance must contain at least one source record.');
  return provenance.map((item, index) => ({
    kind: requireNonEmptyString(item?.kind, `Provenance ${index + 1} kind`),
    ref: requireNonEmptyString(item?.ref, `Provenance ${index + 1} ref`),
    ...(item?.note ? { note: requireNonEmptyString(item.note, `Provenance ${index + 1} note`) } : {})
  }));
}

function normalizedUnits(units) {
  if (!units || typeof units !== 'object' || Array.isArray(units) || Object.keys(units).length === 0) {
    throw new Error('Interchange units must be an explicit non-empty object.');
  }
  return Object.fromEntries(Object.entries(units).map(([key, value]) => [
    requireNonEmptyString(key, 'Unit field name'),
    requireNonEmptyString(value, `Unit '${key}'`)
  ]));
}

export function createInterchangeObject({
  objectType,
  id,
  sourceSystem,
  evidenceStatus,
  provenance,
  units,
  analysisBoundary,
  data
}) {
  assertAllowed(objectType, OBJECT_TYPES, 'Interchange object type');
  assertAllowed(sourceSystem, SOURCE_SYSTEMS, 'Source system');
  assertAllowed(evidenceStatus, EVIDENCE_STATUSES, 'Evidence status');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Interchange object data must be a JSON object.');
  const object = {
    schemaVersion: INTERCHANGE_SCHEMA_VERSION,
    objectType,
    id: requireNonEmptyString(id, 'Interchange object id'),
    sourceSystem,
    evidenceStatus,
    provenance: normalizedProvenance(provenance),
    units: normalizedUnits(units),
    analysisBoundary: requireNonEmptyString(analysisBoundary, 'Analysis boundary'),
    data: plainClone(data)
  };
  validateInterchangeObject(object);
  return object;
}

function validateThresholdEvent(event, index) {
  if (!event || typeof event !== 'object') throw new Error(`Failure event ${index + 1} must be an object.`);
  requireNonEmptyString(event.id, `Failure event ${index + 1} id`);
  requireNonEmptyString(event.label, `Failure event ${index + 1} label`);
  requirePositive(Number(event.loadKN), `Failure event ${index + 1} loadKN`);
  requireNonEmptyString(event.type, `Failure event ${index + 1} type`);
  if (event.terminal != null && typeof event.terminal !== 'boolean') throw new Error(`Failure event ${index + 1} terminal must be boolean.`);
}

function validateObjectSpecific(object) {
  const d = object.data;
  if (object.objectType === 'material') {
    requireNonEmptyString(d.name, 'Material name');
    requireNonEmptyString(d.family, 'Material family');
    if (d.elasticModulusMPa != null) requirePositive(Number(d.elasticModulusMPa), 'Material elasticModulusMPa');
  }
  if (object.objectType === 'section') {
    requireNonEmptyString(d.shape, 'Section shape');
    if (d.areaMm2 != null) requirePositive(Number(d.areaMm2), 'Section areaMm2');
  }
  if (object.objectType === 'member') {
    requireNonEmptyString(d.materialId, 'Member materialId');
    requireNonEmptyString(d.sectionId, 'Member sectionId');
    requirePositive(Number(d.lengthM), 'Member lengthM');
  }
  if (object.objectType === 'connection-law') {
    const k = d.rotationalStiffnessKNmPerRad;
    if (k != null) requirePositive(Number(k), 'Connection rotationalStiffnessKNmPerRad');
    if (d.momentLimitKNm != null) requirePositive(Number(d.momentLimitKNm), 'Connection momentLimitKNm');
    const stiffnessStatus = requireNonEmptyString(d.stiffnessStatus, 'Connection stiffnessStatus');
    if (!['AVAILABLE', 'UNAVAILABLE'].includes(stiffnessStatus)) throw new Error(`Connection stiffnessStatus '${stiffnessStatus}' is unsupported.`);
    if (stiffnessStatus === 'AVAILABLE' && k == null) throw new Error('Connection stiffnessStatus AVAILABLE requires an explicit rotational stiffness.');
    if (stiffnessStatus === 'UNAVAILABLE' && k != null) throw new Error('Connection stiffnessStatus UNAVAILABLE cannot carry a rotational stiffness value.');
  }
  if (object.objectType === 'assembly') {
    if (!Array.isArray(d.componentIds) || d.componentIds.length < 2) throw new Error('Assembly requires at least two componentIds.');
    d.componentIds.forEach((id, index) => requireNonEmptyString(id, `Assembly component ${index + 1}`));
    if (d.compositeActionEta != null) {
      requireFinite(Number(d.compositeActionEta), 'Assembly compositeActionEta');
      if (d.compositeActionEta < 0 || d.compositeActionEta > 1) throw new Error('Assembly compositeActionEta must lie from 0 to 1.');
    }
  }
  if (object.objectType === 'failure-law') {
    if (!Array.isArray(d.events) || d.events.length === 0) throw new Error('Failure law requires at least one threshold event.');
    d.events.forEach(validateThresholdEvent);
    const terminal = d.events.filter((event) => event.terminal);
    if (terminal.length !== 1) throw new Error('Failure law must identify exactly one terminal event.');
    if (!d.residualLaw || typeof d.residualLaw !== 'object') throw new Error('Failure law requires an explicit residualLaw status object.');
    if (!['AVAILABLE', 'UNAVAILABLE'].includes(d.residualLaw.status)) throw new Error('Failure residualLaw status must be AVAILABLE or UNAVAILABLE.');
    if (d.residualLaw.status === 'UNAVAILABLE' && Object.keys(d.residualLaw).some((key) => !['status', 'reason'].includes(key))) {
      throw new Error('An UNAVAILABLE residual law cannot contain invented degradation parameters.');
    }
  }
  if (object.objectType === 'demand-envelope') {
    requireNonEmptyString(d.projectId, 'Demand envelope projectId');
    if (!Array.isArray(d.members) || d.members.length === 0) throw new Error('Demand envelope requires at least one member demand.');
    for (const [index, member] of d.members.entries()) {
      requireNonEmptyString(member.memberId, `Demand member ${index + 1} memberId`);
      if (!Array.isArray(member.cases) || member.cases.length === 0) throw new Error(`Demand member ${member.memberId} requires load cases.`);
      for (const loadCase of member.cases) {
        requireNonEmptyString(loadCase.caseId, `Demand member ${member.memberId} caseId`);
        for (const field of ['axialKN', 'shearKN', 'momentKNm']) {
          if (loadCase[field] != null) requireFinite(Number(loadCase[field]), `Demand ${member.memberId} ${field}`);
        }
      }
    }
  }
  if (object.objectType === 'critical-specimen-request') {
    requireNonEmptyString(d.projectId, 'Critical specimen projectId');
    requireNonEmptyString(d.memberId, 'Critical specimen memberId');
    requireNonEmptyString(d.reason, 'Critical specimen reason');
  }
  if (object.objectType === 'rpe-component-law') {
    requireNonEmptyString(d.componentId, 'RPE componentId');
    if (!Array.isArray(d.thresholdEvents) || d.thresholdEvents.length === 0) throw new Error('RPE component law requires thresholdEvents.');
    d.thresholdEvents.forEach(validateThresholdEvent);
    if (!d.degradationLaw || !['AVAILABLE', 'UNAVAILABLE'].includes(d.degradationLaw.status)) {
      throw new Error('RPE degradationLaw must explicitly state AVAILABLE or UNAVAILABLE.');
    }
    if (d.degradationLaw.status === 'UNAVAILABLE' && Object.keys(d.degradationLaw).some((key) => !['status', 'reason'].includes(key))) {
      throw new Error('An UNAVAILABLE RPE degradation law cannot contain invented degradation parameters.');
    }
  }
}

export function validateInterchangeObject(object) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error('Interchange object must be a JSON object.');
  if (object.schemaVersion !== INTERCHANGE_SCHEMA_VERSION) throw new Error(`Unsupported interchange schemaVersion '${object.schemaVersion ?? ''}'.`);
  assertAllowed(object.objectType, OBJECT_TYPES, 'Interchange object type');
  requireNonEmptyString(object.id, 'Interchange object id');
  assertAllowed(object.sourceSystem, SOURCE_SYSTEMS, 'Source system');
  assertAllowed(object.evidenceStatus, EVIDENCE_STATUSES, 'Evidence status');
  normalizedProvenance(object.provenance);
  normalizedUnits(object.units);
  requireNonEmptyString(object.analysisBoundary, 'Analysis boundary');
  if (!object.data || typeof object.data !== 'object' || Array.isArray(object.data)) throw new Error('Interchange object data must be a JSON object.');
  validateObjectSpecific(object);
  return object;
}

export function createInterchangePackage({
  packageId,
  sourceSystem,
  targetSystem,
  objects,
  createdAt = new Date().toISOString(),
  note = ''
}) {
  assertAllowed(sourceSystem, SOURCE_SYSTEMS, 'Package source system');
  assertAllowed(targetSystem, SOURCE_SYSTEMS, 'Package target system');
  if (!Array.isArray(objects) || objects.length === 0) throw new Error('Interchange package requires at least one object.');
  const seen = new Set();
  for (const object of objects) {
    validateInterchangeObject(object);
    if (seen.has(object.id)) throw new Error(`Duplicate interchange object id '${object.id}'.`);
    seen.add(object.id);
  }
  const pkg = {
    schemaVersion: INTERCHANGE_SCHEMA_VERSION,
    packageId: requireNonEmptyString(packageId, 'Package id'),
    sourceSystem,
    targetSystem,
    createdAt: requireNonEmptyString(createdAt, 'Package createdAt'),
    ...(note ? { note: requireNonEmptyString(note, 'Package note') } : {}),
    objects: objects.map(plainClone)
  };
  validateInterchangePackage(pkg);
  return pkg;
}

export function validateInterchangePackage(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Interchange package must be a JSON object.');
  if (pkg.schemaVersion !== INTERCHANGE_SCHEMA_VERSION) throw new Error(`Unsupported interchange package schemaVersion '${pkg.schemaVersion ?? ''}'.`);
  requireNonEmptyString(pkg.packageId, 'Package id');
  assertAllowed(pkg.sourceSystem, SOURCE_SYSTEMS, 'Package source system');
  assertAllowed(pkg.targetSystem, SOURCE_SYSTEMS, 'Package target system');
  requireNonEmptyString(pkg.createdAt, 'Package createdAt');
  if (!Array.isArray(pkg.objects) || pkg.objects.length === 0) throw new Error('Interchange package requires objects.');
  const ids = new Set();
  for (const object of pkg.objects) {
    validateInterchangeObject(object);
    if (ids.has(object.id)) throw new Error(`Duplicate interchange object id '${object.id}'.`);
    ids.add(object.id);
  }
  return pkg;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function serializeInterchange(value, spaces = 2) {
  if (value?.objects) validateInterchangePackage(value);
  else validateInterchangeObject(value);
  return JSON.stringify(stableValue(value), null, spaces);
}

export function parseInterchange(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Interchange JSON must be non-empty.');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (error) { throw new Error(`Invalid interchange JSON: ${error instanceof Error ? error.message : String(error)}`); }
  if (Array.isArray(parsed?.objects)) validateInterchangePackage(parsed);
  else validateInterchangeObject(parsed);
  return parsed;
}

export function roundTripInterchange(value) {
  const serialized = serializeInterchange(value);
  const parsed = parseInterchange(serialized);
  const reserialized = serializeInterchange(parsed);
  return { serialized, parsed, reserialized, stable: serialized === reserialized };
}

export function createFailureLawObject({
  id,
  sourceSystem = 'FutolTech Structural Lab',
  evidenceStatus,
  provenance,
  analysisBoundary,
  events,
  residualLaw = { status: 'UNAVAILABLE', reason: 'No validated residual/degradation law is available for this failure-law object.' }
}) {
  return createInterchangeObject({
    objectType: 'failure-law',
    id,
    sourceSystem,
    evidenceStatus,
    provenance,
    units: { loadKN: 'kN' },
    analysisBoundary,
    data: { events: plainClone(events), residualLaw: plainClone(residualLaw) }
  });
}

export function createRpeComponentLaw({
  id,
  componentId,
  failureLaw,
  evidenceStatus = failureLaw.evidenceStatus,
  provenance = failureLaw.provenance,
  degradationLaw = null
}) {
  validateInterchangeObject(failureLaw);
  if (failureLaw.objectType !== 'failure-law') throw new Error('RPE component law requires a failure-law interchange object.');
  const sourceResidual = failureLaw.data.residualLaw;
  const effectiveDegradation = degradationLaw == null
    ? sourceResidual.status === 'AVAILABLE'
      ? plainClone(sourceResidual)
      : { status: 'UNAVAILABLE', reason: sourceResidual.reason || 'Failure law has no validated residual/degradation behavior.' }
    : plainClone(degradationLaw);
  return createInterchangeObject({
    objectType: 'rpe-component-law',
    id,
    sourceSystem: 'FutolTech Structural Lab',
    evidenceStatus,
    provenance,
    units: { loadKN: 'kN' },
    analysisBoundary: 'Threshold-event interchange for RPE. Damage evolution, post-threshold degradation, residual capacity and fracture are exported only when explicitly available in the source law.',
    data: {
      componentId: requireNonEmptyString(componentId, 'RPE componentId'),
      thresholdEvents: plainClone(failureLaw.data.events),
      degradationLaw: effectiveDegradation
    }
  });
}

export function createDemandEnvelopeObject({
  id,
  projectId,
  members,
  provenance,
  analysisBoundary = 'Demand envelope supplied by FutolStructure. Structural Lab consumes these actions as demand; it does not silently alter the source structural model.'
}) {
  return createInterchangeObject({
    objectType: 'demand-envelope',
    id,
    sourceSystem: 'FutolStructure',
    evidenceStatus: 'user-supplied',
    provenance,
    units: { axialKN: 'kN', shearKN: 'kN', momentKNm: 'kN·m' },
    analysisBoundary,
    data: { projectId, members: plainClone(members) }
  });
}

export function createCriticalSpecimenRequest({
  id,
  projectId,
  memberId,
  reason,
  demandEnvelopeId,
  provenance
}) {
  return createInterchangeObject({
    objectType: 'critical-specimen-request',
    id,
    sourceSystem: 'FutolStructure',
    evidenceStatus: 'user-supplied',
    provenance,
    units: { reference: 'source-model-units' },
    analysisBoundary: 'Requests deeper component testing in Structural Lab. It is not itself a strength or failure result.',
    data: { projectId, memberId, reason, demandEnvelopeId: requireNonEmptyString(demandEnvelopeId, 'Demand envelope id') }
  });
}

export function findPackageObjects(pkg, objectType) {
  validateInterchangePackage(pkg);
  assertAllowed(objectType, OBJECT_TYPES, 'Interchange object type');
  return pkg.objects.filter((object) => object.objectType === objectType);
}
