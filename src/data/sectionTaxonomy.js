export const SECTION_CATEGORY_LABELS = {
  'sawn-wood': 'Sawn wood',
  'round-bamboo': 'Round bamboo culm',
  shs: 'Square hollow section (SHS)',
  rhs: 'Rectangular hollow section (RHS)',
  'steel-pipe': 'GI pipe',
  'rolled-h': 'Rolled H / wide-flange section',
  'c-purlin': 'C purlin / lipped channel',
  'catalog-other': 'Catalog / built-up section'
};

export function sectionCategory(preset, family) {
  if (preset?.productCategory) return preset.productCategory;
  if (family === 'wood') return 'sawn-wood';
  if (family === 'bamboo') return 'round-bamboo';
  if (preset?.id?.startsWith('ph-pipe-')) return 'steel-pipe';
  if (preset?.id?.startsWith('ph-jis-h-')) return 'rolled-h';
  if (preset?.id?.startsWith('ph-cp-')) return 'c-purlin';
  if (preset?.type === 'rhs') return preset.widthMm === preset.depthMm ? 'shs' : 'rhs';
  return 'catalog-other';
}

export function sectionCategoryLabel(preset, family) {
  return SECTION_CATEGORY_LABELS[sectionCategory(preset, family)] ?? 'Section';
}

export function sectionShapeKind(preset, family) {
  const category = sectionCategory(preset, family);
  if (category === 'sawn-wood') return 'solid-rectangle';
  if (category === 'round-bamboo') return 'bamboo-ring';
  if (category === 'steel-pipe') return 'pipe-ring';
  if (category === 'shs' || category === 'rhs') return 'rectangular-hollow';
  if (category === 'rolled-h') return 'h-section';
  if (category === 'c-purlin') return 'lipped-c';
  return preset?.type === 'chs' ? 'pipe-ring' : preset?.type === 'rectangle' ? 'solid-rectangle' : 'catalog';
}

function steelGradeText(material) {
  return Number.isFinite(material?.yieldStrengthMPa)
    ? `provisional Fy ${material.yieldStrengthMPa} MPa`
    : 'grade to verify';
}

export function productMaterialName(material, preset) {
  const category = sectionCategory(preset, material?.family);
  if (material?.family !== 'steel') return material?.name ?? 'Material';
  if (category === 'steel-pipe') return `GI pipe — ${steelGradeText(material)}`;
  if (category === 'rolled-h') return `Rolled structural steel — ${steelGradeText(material)}`;
  if (category === 'c-purlin') return `Cold-formed C purlin — ${steelGradeText(material)}`;
  if (category === 'shs' || category === 'rhs') return `Structural steel hollow section — ${steelGradeText(material)}`;
  return `Structural steel — ${steelGradeText(material)}`;
}
