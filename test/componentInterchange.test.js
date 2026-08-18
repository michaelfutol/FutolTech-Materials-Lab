import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaterial } from '../src/data/materials.js';
import { findPreset } from '../src/data/sectionPresets.js';
import {
  buildMaterialInterchangeObject,
  buildMemberInterchangeObject,
  buildSectionInterchangeObject,
  buildStructuralLabComponentPackage
} from '../src/interchange/componentPackage.js';
import { createFailureLawObject, roundTripInterchange } from '../src/interchange/structuralInterchange.js';

test('coco 2x4 exports material, exact rectangle section and member references for FutolStructure', () => {
  const pkg = buildStructuralLabComponentPackage({
    packageId: 'pkg-coco-2x4-qa',
    memberId: 'B1',
    materialId: 'coco-uh-2007-average',
    sectionPresetId: 'wood-2x4',
    lengthM: 3,
    orientationDeg: 0,
    createdAt: '2026-08-18T12:30:00.000Z'
  });
  assert.equal(pkg.sourceSystem, 'FutolTech Structural Lab');
  assert.equal(pkg.targetSystem, 'FutolStructure');
  assert.equal(pkg.objects.length, 3);
  const material = pkg.objects.find((o) => o.objectType === 'material');
  const section = pkg.objects.find((o) => o.objectType === 'section');
  const member = pkg.objects.find((o) => o.objectType === 'member');
  assert.equal(material.data.datasetId, 'coco-uh-2007-average');
  assert.equal(material.data.elasticModulusMPa, 13100);
  assert.equal(section.data.shape, 'rectangle');
  assert.equal(section.data.geometry.widthMm, 50);
  assert.equal(section.data.geometry.depthMm, 100);
  assert.equal(section.data.areaMm2, 5000);
  assert.equal(member.data.materialId, material.id);
  assert.equal(member.data.sectionId, section.id);
  assert.equal(member.data.lengthM, 3);
  assert.equal(roundTripInterchange(pkg).stable, true);
});

test('generic Fy 250 remains assumed-sensitivity and C-purlin remains gross-section screening in export', () => {
  const pkg = buildStructuralLabComponentPackage({
    packageId: 'pkg-cpurlin-qa',
    memberId: 'P1',
    materialId: 'steel-generic-250',
    sectionPresetId: 'ph-cp-colorsteel-colorsteel-c100-h100xb38xa15-0_8',
    lengthM: 4.5,
    orientationDeg: 90,
    createdAt: '2026-08-18T12:31:00.000Z'
  });
  const material = pkg.objects.find((o) => o.objectType === 'material');
  const section = pkg.objects.find((o) => o.objectType === 'section');
  const member = pkg.objects.find((o) => o.objectType === 'member');
  assert.equal(material.evidenceStatus, 'assumed-sensitivity');
  assert.match(material.analysisBoundary, /certificate|required|verify/i);
  assert.equal(section.data.productCategory, 'c-purlin');
  assert.match(section.analysisBoundary, /screening/i);
  assert.match(section.data.analysisStatus, /local buckling|distortional buckling|lateral-torsional buckling/i);
  assert.equal(member.evidenceStatus, 'assumed-sensitivity');
  assert.equal(member.data.orientationDeg, 90);
  assert.match(member.analysisBoundary, /must not upgrade screening|sensitivity/i);
});

test('member orientation is normalized to 0-359 degrees without changing section properties', () => {
  const material = buildMaterialInterchangeObject(getMaterial('coco-uh-2007-average'));
  const section = buildSectionInterchangeObject(findPreset('wood', 'wood-2x4'));
  const member = buildMemberInterchangeObject({ memberId: 'B2', materialObject: material, sectionObject: section, lengthM: 2.5, orientationDeg: -90 });
  assert.equal(member.data.orientationDeg, 270);
  assert.equal(section.data.areaMm2, 5000);
});

test('component package may reference an explicit evidence-bounded failure law and preserves it by id', () => {
  const failureLaw = createFailureLawObject({
    id: 'failure:B3-yield',
    evidenceStatus: 'standard',
    provenance: [{ kind: 'qa', ref: 'B3-first-yield' }],
    analysisBoundary: 'QA first-yield threshold only; no fracture law.',
    events: [{ id: 'first-yield', label: 'First yield', loadKN: 12, type: 'yield', terminal: true }]
  });
  const pkg = buildStructuralLabComponentPackage({
    packageId: 'pkg-steel-b3', memberId: 'B3', materialId: 'steel-generic-250', sectionPresetId: 'shs-50-20',
    lengthM: 3, createdAt: '2026-08-18T12:32:00.000Z', extraObjects: [failureLaw]
  });
  const member = pkg.objects.find((o) => o.objectType === 'member');
  assert.equal(member.data.failureLawId, failureLaw.id);
  assert.equal(pkg.objects.find((o) => o.id === failureLaw.id).data.residualLaw.status, 'UNAVAILABLE');
});

test('automatic component export rejects custom/unresolved section ids instead of inventing geometry', () => {
  assert.throws(() => buildStructuralLabComponentPackage({
    packageId: 'bad-custom', memberId: 'X1', materialId: 'coco-uh-2007-average', sectionPresetId: 'custom', lengthM: 2
  }), /non-custom section preset/i);
  assert.throws(() => buildStructuralLabComponentPackage({
    packageId: 'bad-missing', memberId: 'X2', materialId: 'coco-uh-2007-average', sectionPresetId: 'does-not-exist', lengthM: 2
  }), /unknown wood section preset/i);
});
