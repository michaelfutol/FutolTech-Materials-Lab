import {
  createFailureLawObject,
  createInterchangePackage,
  createRpeComponentLaw,
  findPackageObjects,
  validateInterchangeObject,
  validateInterchangePackage
} from './structuralInterchange.js';

const SOURCE_SYSTEM = 'FutolTech Structural Lab';
const TARGET_SYSTEM = 'RPE';

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function timelineEvents(timeline) {
  if (!timeline || !Array.isArray(timeline.events) || timeline.events.length === 0) {
    throw new Error('A governing-limit timeline with stored events is required.');
  }
  const terminalCount = timeline.events.filter((event) => event.terminal).length;
  if (terminalCount !== 1) throw new Error('Governing-limit timeline must contain exactly one terminal event before RPE export.');
  return timeline.events.map((event) => ({
    id: requireText(event.id, 'Timeline event id'),
    label: requireText(event.label, 'Timeline event label'),
    loadKN: event.loadKN,
    type: requireText(event.type, 'Timeline event type'),
    terminal: Boolean(event.terminal),
    ...(event.status ? { status: event.status } : {}),
    ...(event.note ? { note: event.note } : {}),
    ...(event.sourceStatus ? { sourceStatus: event.sourceStatus } : {})
  }));
}

export function buildFailureLawFromTimeline({
  id,
  timeline,
  evidenceStatus = 'provisional',
  provenance,
  residualLaw = null
}) {
  const events = timelineEvents(timeline);
  const boundary = requireText(
    timeline.boundary || 'Stored governing-limit threshold events only; post-threshold behavior is unavailable.',
    'Timeline analysis boundary'
  );
  return createFailureLawObject({
    id,
    evidenceStatus,
    provenance,
    analysisBoundary: boundary,
    events,
    residualLaw: residualLaw ?? {
      status: 'UNAVAILABLE',
      reason: 'The source governing-limit timeline contains threshold events only and does not define validated post-threshold degradation, residual capacity, fracture, or post-buckling behavior.'
    }
  });
}

function uniqueById(objects) {
  const seen = new Set();
  const result = [];
  for (const object of objects) {
    validateInterchangeObject(object);
    if (seen.has(object.id)) continue;
    seen.add(object.id);
    result.push(object);
  }
  return result;
}

function validateRpeReferences(pkg) {
  const ids = new Set(pkg.objects.map((object) => object.id));
  const failureLaws = new Set(findPackageObjects(pkg, 'failure-law').map((object) => object.id));
  for (const law of findPackageObjects(pkg, 'rpe-component-law')) {
    if (!law.data.sourceFailureLawId || !failureLaws.has(law.data.sourceFailureLawId)) {
      throw new Error(`RPE component law ${law.id} must reference a failure-law object in the same package.`);
    }
    if (law.data.contextObjectId && !ids.has(law.data.contextObjectId)) {
      throw new Error(`RPE component law ${law.id} references missing context object ${law.data.contextObjectId}.`);
    }
  }
  return pkg;
}

export function buildRpeInterchangePackage({
  packageId,
  components,
  contextObjects = [],
  createdAt = new Date().toISOString(),
  note = 'Evidence-bounded Structural Lab component threshold laws for RPE resilience simulation.'
}) {
  if (!Array.isArray(components) || components.length === 0) throw new Error('RPE interchange requires at least one component law mapping.');
  if (!Array.isArray(contextObjects)) throw new Error('RPE contextObjects must be an array.');
  const output = [...contextObjects];
  const contextIds = new Set(contextObjects.map((object) => object.id));

  components.forEach((component, index) => {
    const componentId = requireText(component?.componentId, `RPE component ${index + 1} componentId`);
    const failureLaw = component.failureLaw;
    validateInterchangeObject(failureLaw);
    if (failureLaw.objectType !== 'failure-law') throw new Error(`RPE component ${componentId} requires a failure-law object.`);
    const contextObjectId = component.contextObjectId ?? (contextIds.has(componentId) ? componentId : null);
    if (contextObjectId && !contextIds.has(contextObjectId)) {
      throw new Error(`RPE component ${componentId} contextObjectId ${contextObjectId} is absent from contextObjects.`);
    }
    const rpe = createRpeComponentLaw({
      id: component.rpeLawId || `rpe-law:${componentId}`,
      componentId,
      failureLaw,
      evidenceStatus: component.evidenceStatus || failureLaw.evidenceStatus,
      provenance: [
        ...failureLaw.provenance,
        { kind: 'source-failure-law', ref: failureLaw.id }
      ],
      degradationLaw: component.degradationLaw ?? null
    });
    // Preserve explicit package cross-references without changing the generic RPE-law constructor.
    rpe.data.sourceFailureLawId = failureLaw.id;
    if (contextObjectId) rpe.data.contextObjectId = contextObjectId;
    output.push(failureLaw, rpe);
  });

  const pkg = createInterchangePackage({
    packageId,
    sourceSystem: SOURCE_SYSTEM,
    targetSystem: TARGET_SYSTEM,
    createdAt,
    note,
    objects: uniqueById(output)
  });
  validateInterchangePackage(pkg);
  return validateRpeReferences(pkg);
}

export function consumeRpeInterchangePackage(pkg) {
  validateInterchangePackage(pkg);
  if (pkg.sourceSystem !== SOURCE_SYSTEM || pkg.targetSystem !== TARGET_SYSTEM) {
    throw new Error(`RPE bridge requires ${SOURCE_SYSTEM} → ${TARGET_SYSTEM} package direction.`);
  }
  validateRpeReferences(pkg);
  const laws = findPackageObjects(pkg, 'rpe-component-law');
  if (laws.length === 0) throw new Error('RPE interchange package must contain rpe-component-law objects.');
  return {
    packageId: pkg.packageId,
    componentLaws: laws,
    unavailableDegradationCount: laws.filter((law) => law.data.degradationLaw.status === 'UNAVAILABLE').length,
    interpretationBoundary: 'Threshold events are transferable solver events. RPE may not synthesize post-threshold degradation, residual strength, fracture, local buckling or damage evolution when the exported law marks those behaviors UNAVAILABLE.'
  };
}
