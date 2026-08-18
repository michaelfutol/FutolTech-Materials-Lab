import {
  createCriticalSpecimenRequest,
  createDemandEnvelopeObject,
  createInterchangePackage,
  findPackageObjects,
  validateInterchangePackage
} from './structuralInterchange.js';

const SOURCE_SYSTEM = 'FutolStructure';
const TARGET_SYSTEM = 'FutolTech Structural Lab';

function requireText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function demandMemberMap(envelope) {
  return new Map(envelope.data.members.map((member) => [member.memberId, member]));
}

function governingCase(cases, field) {
  const available = cases.filter((loadCase) => Number.isFinite(loadCase[field]));
  if (available.length === 0) return null;
  return available.reduce((best, current) => (
    Math.abs(current[field]) > Math.abs(best[field]) ? current : best
  ));
}

export function summarizeDemandMember(member) {
  if (!member || typeof member !== 'object') throw new Error('Demand member is required.');
  requireText(member.memberId, 'Demand memberId');
  if (!Array.isArray(member.cases) || member.cases.length === 0) throw new Error(`Demand member ${member.memberId} requires cases.`);
  const result = { memberId: member.memberId, caseCount: member.cases.length };
  for (const [field, label] of [
    ['axialKN', 'axial'],
    ['shearKN', 'shear'],
    ['momentKNm', 'moment']
  ]) {
    const loadCase = governingCase(member.cases, field);
    result[label] = loadCase ? {
      value: loadCase[field],
      absoluteValue: Math.abs(loadCase[field]),
      caseId: loadCase.caseId
    } : null;
  }
  return result;
}

export function summarizeDemandEnvelope(envelope) {
  if (!envelope || envelope.objectType !== 'demand-envelope') throw new Error('A demand-envelope interchange object is required.');
  if (envelope.sourceSystem !== SOURCE_SYSTEM) throw new Error('Demand envelope must originate from FutolStructure.');
  return {
    envelopeId: envelope.id,
    projectId: envelope.data.projectId,
    memberCount: envelope.data.members.length,
    members: envelope.data.members.map(summarizeDemandMember),
    interpretationBoundary: 'Absolute maxima identify governing imported actions only. They are not capacity checks, failure predictions, code combinations, or automatic design conclusions.'
  };
}

function validateCriticalRequestReferences(pkg) {
  const envelopes = findPackageObjects(pkg, 'demand-envelope');
  const envelopeById = new Map(envelopes.map((envelope) => [envelope.id, envelope]));
  for (const request of findPackageObjects(pkg, 'critical-specimen-request')) {
    const envelope = envelopeById.get(request.data.demandEnvelopeId);
    if (!envelope) throw new Error(`Critical specimen request ${request.id} references missing demand envelope ${request.data.demandEnvelopeId}.`);
    if (request.data.projectId !== envelope.data.projectId) {
      throw new Error(`Critical specimen request ${request.id} projectId does not match its demand envelope.`);
    }
    if (!demandMemberMap(envelope).has(request.data.memberId)) {
      throw new Error(`Critical specimen request ${request.id} references member ${request.data.memberId} that is absent from ${envelope.id}.`);
    }
  }
  return pkg;
}

export function buildFutolStructureDemandPackage({
  packageId,
  projectId,
  members,
  provenance,
  demandEnvelopeId = `demand:${projectId}`,
  criticalSelections = [],
  createdAt = new Date().toISOString(),
  note = 'FutolStructure demand package for deeper Structural Lab component testing.'
}) {
  const envelope = createDemandEnvelopeObject({
    id: demandEnvelopeId,
    projectId,
    members,
    provenance
  });
  if (!Array.isArray(criticalSelections)) throw new Error('criticalSelections must be an array.');
  const memberIds = demandMemberMap(envelope);
  const requests = criticalSelections.map((selection, index) => {
    const memberId = requireText(selection?.memberId, `Critical selection ${index + 1} memberId`);
    if (!memberIds.has(memberId)) throw new Error(`Critical selection member ${memberId} is absent from demand envelope ${envelope.id}.`);
    return createCriticalSpecimenRequest({
      id: selection.id || `critical:${projectId}:${memberId}`,
      projectId,
      memberId,
      reason: requireText(selection.reason, `Critical selection ${memberId} reason`),
      demandEnvelopeId: envelope.id,
      provenance: selection.provenance || [
        { kind: 'explicit-selection', ref: `FutolStructure/${projectId}/${memberId}`, note: 'Member explicitly selected for deeper Structural Lab testing; selection is not an automatic failure claim.' }
      ]
    });
  });
  const pkg = createInterchangePackage({
    packageId,
    sourceSystem: SOURCE_SYSTEM,
    targetSystem: TARGET_SYSTEM,
    createdAt,
    note,
    objects: [envelope, ...requests]
  });
  return validateCriticalRequestReferences(pkg);
}

export function consumeFutolStructureDemandPackage(pkg) {
  validateInterchangePackage(pkg);
  if (pkg.sourceSystem !== SOURCE_SYSTEM || pkg.targetSystem !== TARGET_SYSTEM) {
    throw new Error(`Demand bridge requires ${SOURCE_SYSTEM} → ${TARGET_SYSTEM} package direction.`);
  }
  validateCriticalRequestReferences(pkg);
  const envelopes = findPackageObjects(pkg, 'demand-envelope');
  if (envelopes.length === 0) throw new Error('FutolStructure demand package must contain at least one demand envelope.');
  return {
    packageId: pkg.packageId,
    envelopes: envelopes.map((envelope) => ({ object: envelope, summary: summarizeDemandEnvelope(envelope) })),
    criticalRequests: findPackageObjects(pkg, 'critical-specimen-request'),
    interpretationBoundary: 'Imported actions remain owned by the FutolStructure source model. Structural Lab may test referenced components against them but does not silently change load cases, combinations, geometry, supports, or source demand.'
  };
}
