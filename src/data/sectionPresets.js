import { PH_BAMBOO_CULM_PRESETS } from './phBambooMaterials.js';
import { PH_PIPE_SECTIONS } from './phSteelCatalog.js';
import { PH_JIS_H_SECTIONS } from './phRolledSteelCatalog.js';

const woodPreset = (id, label, widthMm, depthMm) => ({
  id, label, type: 'rectangle', productCategory: 'sawn-wood', productLabel: 'Sawn wood', widthMm, depthMm
});

const tubePreset = (id, label, widthMm, depthMm, thicknessMm) => ({
  id,
  label,
  type: 'rhs',
  productCategory: widthMm === depthMm ? 'shs' : 'rhs',
  productLabel: widthMm === depthMm ? 'Square hollow section (SHS)' : 'Rectangular hollow section (RHS)',
  widthMm,
  depthMm,
  thicknessMm
});

export const SECTION_PRESETS = {
  wood: [
    woodPreset('wood-2x2', 'Nominal 2×2 — enter/verify actual', 50, 50),
    woodPreset('wood-2x3', 'Nominal 2×3 — enter/verify actual', 50, 75),
    woodPreset('wood-2x4', 'Nominal 2×4 — enter/verify actual', 50, 100),
    woodPreset('wood-2x6', 'Nominal 2×6 — enter/verify actual', 50, 150),
    woodPreset('wood-3x3', 'Nominal 3×3 — enter/verify actual', 75, 75),
    woodPreset('wood-3x4', 'Nominal 3×4 — enter/verify actual', 75, 100),
    woodPreset('wood-4x4', 'Nominal 4×4 — enter/verify actual', 100, 100),
    woodPreset('wood-4x6', 'Nominal 4×6 — enter/verify actual', 100, 150),
    { id: 'custom', label: 'Custom measured wood section' }
  ],
  bamboo: PH_BAMBOO_CULM_PRESETS,
  steel: [
    tubePreset('shs-25-12', 'SHS 25×25×1.2 mm — verify actual', 25, 25, 1.2),
    tubePreset('shs-38-12', 'SHS 38×38×1.2 mm — verify actual', 38, 38, 1.2),
    tubePreset('shs-50-15', 'SHS 50×50×1.5 mm — verify actual', 50, 50, 1.5),
    tubePreset('shs-50-20', 'SHS 50×50×2.0 mm — verify actual', 50, 50, 2),
    tubePreset('rhs-75-50-15', 'RHS 75×50×1.5 mm — verify actual', 50, 75, 1.5),
    tubePreset('rhs-75-50-20', 'RHS 75×50×2.0 mm — verify actual', 50, 75, 2),
    tubePreset('rhs-100-50-20', 'RHS 100×50×2.0 mm — verify actual', 50, 100, 2),
    ...PH_PIPE_SECTIONS,
    ...PH_JIS_H_SECTIONS,
    { id: 'custom', label: 'Custom measured / catalog steel section' }
  ]
};

export function presetsForFamily(family) {
  return SECTION_PRESETS[family] ?? [{ id: 'custom', label: 'Custom measured section' }];
}

export function findPreset(family, id) {
  return presetsForFamily(family).find((preset) => preset.id === id) ?? null;
}
