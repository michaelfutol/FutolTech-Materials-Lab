import { MATERIALS } from './materials.js';
import { PH_BAMBOO_MATERIALS } from './phBambooMaterials.js';
import { PH_TRADITIONAL_TIMBER_LIBRARY } from './phTraditionalTimberLibrary.js';
import { PH_STEEL_SOURCES } from './phSteelCatalog.js?v=20260801-1545';
import { PH_ROLLED_STEEL_SOURCES } from './phRolledSteelCatalog.js';
import { PH_C_PURLIN_SOURCES } from './phCPurlinCatalog.js';
import { PH_LIGHT_STEEL_FRAME_MARKET_RECORDS, PH_LIGHT_STEEL_FRAME_SOURCES } from './phLightSteelFrameCatalog.js';
import { SECTION_PRESETS } from './sectionPresets.js?v=20260801-1545';
import { calculateSectionProperties } from '../solver/sections.js';
import { sectionCategory, sectionCategoryLabel, sectionShapeKind } from './sectionTaxonomy.js?v=20260801-1545';

const SOURCE_LOOKUP = new Map([
  ...Object.values(PH_STEEL_SOURCES).map((source) => [source.id, source]),
  ...Object.values(PH_ROLLED_STEEL_SOURCES).map((source) => [source.id, source]),
  ...Object.values(PH_C_PURLIN_SOURCES).map((source) => [source.id, source]),
  ...Object.values(PH_LIGHT_STEEL_FRAME_SOURCES).map((source) => [source.id, source]),
  ['salzer-bioresources-2018', {
    id: 'salzer-bioresources-2018',
    organization: 'Salzer, Wallbaum, Alipon & Lopez',
    standard: 'BioResources 13(1), 2018 Philippine full-culm study',
    product: 'Bambusa blumeana full culms',
    sourceStatus: 'peer-reviewed research'
  }]
]);

function cleanLabel(label) {
  return String(label ?? '').replace(/ — (verify|enter|study|measure).*/i, '').trim();
}

function dimensionsText(section) {
  if (section.productCategory === 'c-purlin') {
    const h = section.purlinDepthMm ?? section.depthMm;
    const b = section.purlinFlangeMm ?? section.widthMm;
    return `H ${h} × B ${b} × A ${section.lipMm} × t ${section.thicknessMm} mm`;
  }
  if (section.type === 'angle') return `A ${section.depthMm} × B ${section.widthMm} × t ${section.thicknessMm} mm`;
  if (section.type === 'rectangle') return `${section.widthMm} × ${section.depthMm} mm`;
  if (section.type === 'rhs') return `${section.depthMm} × ${section.widthMm} × ${section.thicknessMm} mm`;
  if (section.type === 'chs') return `OD ${section.diameterMm} × t ${section.thicknessMm} mm`;
  if (section.type === 'round') return `Ø${section.diameterMm} mm`;
  if (section.type === 'custom') {
    const web = section.webThicknessMm ? ` × tw ${section.webThicknessMm}` : '';
    const flange = section.flangeThicknessMm ? ` × tf ${section.flangeThicknessMm}` : '';
    return `${section.depthMm} × ${section.widthMm} mm${web}${flange}`;
  }
  return 'Dimensions unavailable';
}

function propertiesOrNull(section) {
  try {
    return calculateSectionProperties(section);
  } catch {
    return null;
  }
}

const PRESET_SECTION_LIBRARY = Object.entries(SECTION_PRESETS).flatMap(([family, presets]) => (
  presets
    .filter((section) => section.id !== 'custom')
    .map((section) => {
      const category = sectionCategory(section, family);
      const source = section.sourceId ? SOURCE_LOOKUP.get(section.sourceId) ?? null : null;
      return {
        id: section.id,
        family,
        category,
        categoryLabel: sectionCategoryLabel(section, family),
        shapeKind: sectionShapeKind(section, family),
        label: cleanLabel(section.label),
        fullLabel: section.label,
        dimensions: dimensionsText(section),
        section,
        properties: propertiesOrNull(section),
        publishedMassKgM: section.publishedMassKgM ?? null,
        maxLengthM: section.maxLengthM ?? null,
        marketStatus: section.marketStatus ?? (family === 'wood' ? 'nominal convenience size; actual local stock must be measured' : 'source/market status not yet assigned'),
        analysisStatus: section.analysisStatus ?? (family === 'wood' ? 'geometry preset only; capacity depends on selected species dataset and grading' : null),
        source
      };
    })
));

const LIGHT_STEEL_MARKET_LIBRARY = PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.map((record) => ({
  ...record,
  source: record.sourceId ? SOURCE_LOOKUP.get(record.sourceId) ?? null : null
}));

export const SECTION_LIBRARY = [
  ...PRESET_SECTION_LIBRARY,
  ...LIGHT_STEEL_MARKET_LIBRARY
];

export const MATERIAL_LIBRARY = [
  ...MATERIALS,
  ...PH_BAMBOO_MATERIALS,
  ...PH_TRADITIONAL_TIMBER_LIBRARY
].map((material) => ({
  ...material,
  familyLabel: material.familyLabel ?? (material.family === 'wood' ? 'Wood' : material.family === 'bamboo' ? 'Bamboo' : 'Steel')
}));

export function findSectionLibraryRecord(id) {
  return SECTION_LIBRARY.find((record) => record.id === id) ?? null;
}

export function sectionLibraryCategories() {
  return [...new Set(SECTION_LIBRARY.map((record) => record.category))];
}
