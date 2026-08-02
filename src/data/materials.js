import { PH_COMMON_TIMBER_MATERIALS } from './phCommonTimberMaterials.js';

export const MATERIALS = [
  {
    id: 'coco-uh-2007-average',
    name: 'Coconut wood — UH 2007 published average',
    family: 'wood',
    maxLengthM: 3.6,
    showInPrimaryUi: true,
    elasticModulusMPa: 13_100,
    densityKgM3: 910,
    yieldStrengthMPa: null,
    ultimateBendingMPa: 72.9,
    allowableBendingMPa: 15.4,
    bendingReferenceMPa: 15.4,
    strengthReferenceLabel: 'published proposed allowable bending reference',
    compressionParallelMPa: 46.2,
    source: {
      label: 'Erickson & Robertson, UHM/CEE/07-02 (2007)',
      year: 2007,
      status: 'published',
      confidence: 'medium',
      note: 'E and bending strength are full-scale rectangular-member averages. Compression is a provisional average from short round-log specimens and is not a sawn 2×4 design value.'
    }
  },
  ...PH_COMMON_TIMBER_MATERIALS,
  {
    id: 'steel-generic-250',
    name: 'Structural steel — provisional Fy 250 MPa',
    family: 'steel',
    maxLengthM: 6,
    showInPrimaryUi: true,
    elasticModulusMPa: 200_000,
    densityKgM3: 7_850,
    yieldStrengthMPa: 250,
    ultimateBendingMPa: null,
    allowableBendingMPa: null,
    compressionParallelMPa: 250,
    source: {
      label: 'Generic engineering baseline — certificate required',
      year: null,
      status: 'assumed',
      confidence: 'low',
      note: 'This is a product-neutral steel sensitivity dataset. Galvanising is a coating, not a steel grade. Verify the exact pipe, hollow section, rolled section, standard, wall/thickness, and mill certificate before design use.'
    }
  },
  {
    id: 'steel-generic-345',
    name: 'Structural steel — provisional Fy 345 MPa',
    family: 'steel',
    maxLengthM: 6,
    showInPrimaryUi: true,
    elasticModulusMPa: 200_000,
    densityKgM3: 7_850,
    yieldStrengthMPa: 345,
    ultimateBendingMPa: null,
    allowableBendingMPa: null,
    compressionParallelMPa: 345,
    source: {
      label: 'Generic engineering baseline — certificate required',
      year: null,
      status: 'assumed',
      confidence: 'low',
      note: 'Use only as a sensitivity case. Verify the actual pipe, hollow section, or rolled-section grade, dimensions, manufacturing standard, and certificate.'
    }
  }
];

export function getMaterial(id) {
  const material = MATERIALS.find((candidate) => candidate.id === id);
  if (!material) throw new Error(`Unknown material dataset: ${id}`);
  return material;
}
