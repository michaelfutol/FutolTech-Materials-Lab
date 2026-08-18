import { PH_BAMBOO_CULM_PRESETS } from './phBambooMaterials.js';
import { PH_PIPE_SECTIONS } from './phSteelCatalog.js?v=20260801-1545';
import { PH_JIS_H_SECTIONS } from './phRolledSteelCatalog.js';
import { PH_C_PURLIN_SECTIONS } from './phCPurlinCatalog.js';

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
    woodPreset('wood-2x2', '2×2 · 50×50 mm preset', 50, 50),
    woodPreset('wood-2x3', '2×3 · 50×75 mm preset', 50, 75),
    woodPreset('wood-2x4', '2×4 · 50×100 mm preset', 50, 100),
    woodPreset('wood-2x6', '2×6 · 50×150 mm preset', 50, 150),
    woodPreset('wood-3x3', '3×3 · 75×75 mm preset', 75, 75),
    woodPreset('wood-3x4', '3×4 · 75×100 mm preset', 75, 100),
    woodPreset('wood-4x4', '4×4 · 100×100 mm preset', 100, 100),
    woodPreset('wood-4x6', '4×6 · 100×150 mm preset', 100, 150),
    { id: 'custom', label: 'Custom measured wood section' }
  ],
  bamboo: PH_BAMBOO_CULM_PRESETS,
  steel: [
    tubePreset('shs-25-12', 'SHS 25×25×1.2 mm', 25, 25, 1.2),
    tubePreset('shs-38-12', 'SHS 38×38×1.2 mm', 38, 38, 1.2),
    tubePreset('shs-50-15', 'SHS 50×50×1.5 mm', 50, 50, 1.5),
    tubePreset('shs-50-20', 'SHS 50×50×2.0 mm', 50, 50, 2),
    {
      ...tubePreset('shs-100-20-user-observed', 'SHS 100×100×2.0 mm · user-observed PH market', 100, 100, 2),
      marketStatus: 'User-observed physical SHS size on 2026-08-18; supplier/brand and nominal-versus-measured wall thickness are not yet recorded.',
      analysisStatus: 'Active gross-section geometry preset. Solver uses idealized 100×100×2.0 mm SHS geometry; verify delivered dimensions, corner radii, steel grade and mill certificate before design use.',
      evidenceStatus: 'user-observed',
      observationDate: '2026-08-18'
    },
    tubePreset('rhs-75-50-15', 'RHS 75×50×1.5 mm', 50, 75, 1.5),
    tubePreset('rhs-75-50-20', 'RHS 75×50×2.0 mm', 50, 75, 2),
    tubePreset('rhs-100-50-20', 'RHS 100×50×2.0 mm', 50, 100, 2),
    ...PH_PIPE_SECTIONS,
    ...PH_JIS_H_SECTIONS,
    ...PH_C_PURLIN_SECTIONS,
    { id: 'custom', label: 'Custom measured / catalog steel section' }
  ]
};

export function presetsForFamily(family) {
  return SECTION_PRESETS[family] ?? [{ id: 'custom', label: 'Custom measured section' }];
}

export function findPreset(family, id) {
  return presetsForFamily(family).find((preset) => preset.id === id) ?? null;
}
