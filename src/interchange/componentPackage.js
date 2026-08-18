import { getMaterial } from '../data/materials.js';
import { findPreset } from '../data/sectionPresets.js';
import { calculateSectionProperties } from '../solver/sections.js';
import {
  createInterchangeObject,
  createInterchangePackage,
  validateInterchangePackage
} from './structuralInterchange.js';

const SOURCE_SYSTEM = 'FutolTech Structural Lab';
const TARGET_SYSTEM = 'FutolStructure';

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function compactObject(entries) {
  return Object.fromEntries(Object.entries(entries).filter(([, value]) => value != null));
}

function materialEvidenceStatus(material) {
  const status = String(material?.source?.status ?? '').toLowerCase();
  if (status.includes('standard')) return 'standard';
  if (status.includes('manufacturer')) return 'manufacturer-published';
  if (status.includes('assumed')) return 'assumed-sensitivity';
  if (status.includes('published')) return 'provisional';
  return 'unknown';
}

function materialProvenance(material) {
  const source = material.source ?? {};
  const detail = [
    source.year ? `year ${source.year}` : null,
    source.status ? `status: ${source.status}` : null,
    source.confidence ? `confidence: ${source.confidence}` : null,
    source.note ?? null
  ].filter(Boolean).join('; ');
  return [{
    kind: 'material-source',
    ref: source.label || `Structural Lab material dataset/${material.id}`,
    ...(detail ? { note: detail } : {})
  }];
}

function sectionEvidenceStatus(preset) {
  if (preset.sourceId) return 'provisional';
  if (preset.id === 'custom') return 'user-supplied';
  return 'provisional';
}

function sectionProvenance(preset) {
  const notes = [preset.marketStatus, preset.geometryStatus, preset.analysisStatus].filter(Boolean).join('; ');
  return [{
    kind: preset.sourceId ? 'product-source' : 'section-preset',
    ref: preset.sourceId || `Structural Lab section preset/${preset.id}`,
    ...(notes ? { note: notes } : {})
  }];
}

function sectionGeometry(preset) {
  return compactObject({
    widthMm: finiteOrNull(preset.widthMm),
    depthMm: finiteOrNull(preset.depthMm),
    thicknessMm: finiteOrNull(preset.thicknessMm),
    diameterMm: finiteOrNull(preset.diameterMm),
    flangeMm: finiteOrNull(preset.flangeMm),
    lipMm: finiteOrNull(preset.lipMm),
    purlinDepthMm: finiteOrNull(preset.purlinDepthMm),
    purlinFlangeMm: finiteOrNull(preset.purlinFlangeMm),
    centroidXmm: finiteOrNull(preset.centroidXmm),
    centroidYmm: finiteOrNull(preset.centroidYmm)
  });
}

function sectionProperties(preset) {
  const properties = calculateSectionProperties(preset);
  return compactObject({
    areaMm2: finiteOrNull(properties.areaMm2),
    ixMm4: finiteOrNull(properties.ixMm4),
    iyMm4: finiteOrNull(properties.iyMm4),
    zxMm3: finiteOrNull(properties.zxMm3),
    zyMm3: finiteOrNull(properties.zyMm3),
    radiusXmm: finiteOrNull(properties.radiusXmm),
    radiusYmm: finiteOrNull(properties.radiusYmm),
    propertyBasis: properties.propertyBasis ?? preset.geometryStatus ?? null
  });
}

export function buildMaterialInterchangeObject(material) {
  if (!material?.id) throw new Error('Material dataset with id is required.');
  return createInterchangeObject({
    objectType: 'material',
    id: `material:${material.id}`,
    sourceSystem: SOURCE_SYSTEM,
    evidenceStatus: materialEvidenceStatus(material),
    provenance: materialProvenance(material),
    units: {
      elasticModulusMPa: 'MPa',
      densityKgM3: 'kg/m³',
      yieldStrengthMPa: 'MPa',
      ultimateBendingMPa: 'MPa',
      bendingReferenceMPa: 'MPa',
      compressionParallelMPa: 'MPa',
      maxLengthM: 'm'
    },
    analysisBoundary: material.source?.note || 'Material properties are transferred with their Structural Lab evidence status; project-specific grading, certificates and applicability remain external verification requirements.',
    data: compactObject({
      datasetId: material.id,
      name: material.name,
      family: material.family,
      elasticModulusMPa: finiteOrNull(material.elasticModulusMPa),
      densityKgM3: finiteOrNull(material.densityKgM3),
      yieldStrengthMPa: finiteOrNull(material.yieldStrengthMPa),
      ultimateBendingMPa: finiteOrNull(material.ultimateBendingMPa),
      allowableBendingMPa: finiteOrNull(material.allowableBendingMPa),
      bendingReferenceMPa: finiteOrNull(material.bendingReferenceMPa),
      compressionParallelMPa: finiteOrNull(material.compressionParallelMPa),
      maxLengthM: finiteOrNull(material.maxLengthM),
      strengthReferenceLabel: material.strengthReferenceLabel ?? null
    })
  });
}

export function buildSectionInterchangeObject(preset) {
  if (!preset?.id || preset.id === 'custom') throw new Error('A concrete non-custom section preset is required for automatic interchange export.');
  const properties = sectionProperties(preset);
  return createInterchangeObject({
    objectType: 'section',
    id: `section:${preset.id}`,
    sourceSystem: SOURCE_SYSTEM,
    evidenceStatus: sectionEvidenceStatus(preset),
    provenance: sectionProvenance(preset),
    units: {
      geometry: 'mm',
      areaMm2: 'mm²',
      inertiaMm4: 'mm⁴',
      sectionModulusMm3: 'mm³',
      radiusMm: 'mm',
      massKgM: 'kg/m',
      stockLengthM: 'm'
    },
    analysisBoundary: preset.analysisStatus || 'Gross section geometry/properties only. Product grade, tolerances, local buckling, connections and code design checks remain separate unless explicitly included elsewhere.',
    data: {
      presetId: preset.id,
      label: preset.label,
      shape: preset.type,
      productCategory: preset.productCategory ?? null,
      productLabel: preset.productLabel ?? null,
      geometry: sectionGeometry(preset),
      ...properties,
      publishedMassKgM: finiteOrNull(preset.publishedMassKgM),
      stockLengthM: finiteOrNull(preset.maxLengthM),
      sourceId: preset.sourceId ?? null,
      marketStatus: preset.marketStatus ?? null,
      geometryStatus: preset.geometryStatus ?? null,
      analysisStatus: preset.analysisStatus ?? null
    }
  });
}

export function buildMemberInterchangeObject({
  memberId,
  materialObject,
  sectionObject,
  lengthM,
  orientationDeg = 0,
  role = 'structural-member',
  connectionLawIds = [],
  assemblyId = null,
  failureLawId = null
}) {
  if (!materialObject || materialObject.objectType !== 'material') throw new Error('Member export requires a material interchange object.');
  if (!sectionObject || sectionObject.objectType !== 'section') throw new Error('Member export requires a section interchange object.');
  if (!Number.isFinite(lengthM) || lengthM <= 0) throw new Error('Member lengthM must be greater than zero.');
  if (!Number.isFinite(orientationDeg)) throw new Error('Member orientationDeg must be finite.');
  const normalizedDeg = ((orientationDeg % 360) + 360) % 360;
  if (!Array.isArray(connectionLawIds)) throw new Error('Member connectionLawIds must be an array.');
  connectionLawIds.forEach((id, index) => {
    if (typeof id !== 'string' || !id.trim()) throw new Error(`Member connectionLawIds ${index + 1} must be a non-empty string.`);
  });
  return createInterchangeObject({
    objectType: 'member',
    id: `member:${memberId}`,
    sourceSystem: SOURCE_SYSTEM,
    evidenceStatus: materialObject.evidenceStatus === 'assumed-sensitivity' ? 'assumed-sensitivity' : sectionObject.evidenceStatus,
    provenance: [
      { kind: 'material-object', ref: materialObject.id },
      { kind: 'section-object', ref: sectionObject.id }
    ],
    units: { lengthM: 'm', orientationDeg: 'deg' },
    analysisBoundary: 'Member identity/geometry bridge only. Receiving systems must respect the referenced material and section analysis boundaries and must not upgrade SCREENING or sensitivity data into design capacity.',
    data: {
      materialId: materialObject.id,
      sectionId: sectionObject.id,
      lengthM,
      orientationDeg: normalizedDeg,
      role,
      connectionLawIds: [...connectionLawIds],
      ...(assemblyId ? { assemblyId } : {}),
      ...(failureLawId ? { failureLawId } : {})
    }
  });
}

function assertPackageReferences(pkg) {
  const ids = new Set(pkg.objects.map((object) => object.id));
  const members = pkg.objects.filter((object) => object.objectType === 'member');
  for (const member of members) {
    if (!ids.has(member.data.materialId)) throw new Error(`Member ${member.id} references missing material ${member.data.materialId}.`);
    if (!ids.has(member.data.sectionId)) throw new Error(`Member ${member.id} references missing section ${member.data.sectionId}.`);
    for (const connectionId of member.data.connectionLawIds ?? []) {
      if (!ids.has(connectionId)) throw new Error(`Member ${member.id} references missing connection law ${connectionId}.`);
    }
    if (member.data.assemblyId && !ids.has(member.data.assemblyId)) throw new Error(`Member ${member.id} references missing assembly ${member.data.assemblyId}.`);
    if (member.data.failureLawId && !ids.has(member.data.failureLawId)) throw new Error(`Member ${member.id} references missing failure law ${member.data.failureLawId}.`);
  }
  return pkg;
}

export function buildStructuralLabComponentPackage({
  packageId,
  memberId,
  materialId,
  sectionPresetId,
  lengthM,
  orientationDeg = 0,
  role = 'structural-member',
  extraObjects = [],
  createdAt = new Date().toISOString(),
  note = 'Structural Lab component package for FutolStructure.'
}) {
  const material = getMaterial(materialId);
  const preset = findPreset(material.family, sectionPresetId);
  if (!preset) throw new Error(`Unknown ${material.family} section preset: ${sectionPresetId}`);
  const materialObject = buildMaterialInterchangeObject(material);
  const sectionObject = buildSectionInterchangeObject(preset);
  const memberObject = buildMemberInterchangeObject({
    memberId,
    materialObject,
    sectionObject,
    lengthM,
    orientationDeg,
    role,
    connectionLawIds: extraObjects.filter((object) => object.objectType === 'connection-law').map((object) => object.id),
    assemblyId: extraObjects.find((object) => object.objectType === 'assembly')?.id ?? null,
    failureLawId: extraObjects.find((object) => object.objectType === 'failure-law')?.id ?? null
  });
  const pkg = createInterchangePackage({
    packageId,
    sourceSystem: SOURCE_SYSTEM,
    targetSystem: TARGET_SYSTEM,
    createdAt,
    note,
    objects: [materialObject, sectionObject, memberObject, ...extraObjects]
  });
  validateInterchangePackage(pkg);
  return assertPackageReferences(pkg);
}
