import { PH_BAMBOO_MATERIALS } from './phBambooMaterials.js';
import { PH_WOOD_RESEARCH_MATERIALS } from './phWoodMaterials.js';

export const MATERIALS = [
  {
    id: 'coco-uh-2007-average',
    name: 'Coconut wood — UH 2007 published average',
    family: 'wood',
    maxLengthM: 3.6,
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
  ...PH_WOOD_RESEARCH_MATERIALS,
  ...PH_BAMBOO_MATERIALS,
  {
    id: 'steel-generic-250',
    name: 'Structural steel tube — provisional Fy 250 MPa',
    family: 'steel',
    maxLengthM: 6,
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
      note: 'Galvanising is a coating, not a steel grade. Replace this dataset with a mill certificate or a verified product standard before design use.'
    }
  },
  {
    id: 'steel-generic-345',
    name: 'Structural steel tube — provisional Fy 345 MPa',
    family: 'steel',
    maxLengthM: 6,
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
      note: 'Use only as a sensitivity case. Actual tube grade, wall thickness, corner radius and weld-seam quality must be verified.'
    }
  }
];

export function getMaterial(id) {
  const material = MATERIALS.find((candidate) => candidate.id === id);
  if (!material) throw new Error(`Unknown material dataset: ${id}`);
  return material;
}
