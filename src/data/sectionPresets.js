export const SECTION_PRESETS = {
  wood: [
    { id: 'wood-2x2', label: 'Nominal 2×2 — enter/verify actual', type: 'rectangle', widthMm: 50, depthMm: 50 },
    { id: 'wood-2x3', label: 'Nominal 2×3 — enter/verify actual', type: 'rectangle', widthMm: 50, depthMm: 75 },
    { id: 'wood-2x4', label: 'Nominal 2×4 — enter/verify actual', type: 'rectangle', widthMm: 50, depthMm: 100 },
    { id: 'wood-2x6', label: 'Nominal 2×6 — enter/verify actual', type: 'rectangle', widthMm: 50, depthMm: 150 },
    { id: 'custom', label: 'Custom measured wood section' }
  ],
  steel: [
    { id: 'shs-25-12', label: 'SHS 25×25×1.2 mm — verify actual', type: 'rhs', widthMm: 25, depthMm: 25, thicknessMm: 1.2 },
    { id: 'shs-38-12', label: 'SHS 38×38×1.2 mm — verify actual', type: 'rhs', widthMm: 38, depthMm: 38, thicknessMm: 1.2 },
    { id: 'shs-50-15', label: 'SHS 50×50×1.5 mm — verify actual', type: 'rhs', widthMm: 50, depthMm: 50, thicknessMm: 1.5 },
    { id: 'shs-50-20', label: 'SHS 50×50×2.0 mm — verify actual', type: 'rhs', widthMm: 50, depthMm: 50, thicknessMm: 2 },
    { id: 'rhs-75-50-15', label: 'RHS 75×50×1.5 mm — verify actual', type: 'rhs', widthMm: 50, depthMm: 75, thicknessMm: 1.5 },
    { id: 'rhs-75-50-20', label: 'RHS 75×50×2.0 mm — verify actual', type: 'rhs', widthMm: 50, depthMm: 75, thicknessMm: 2 },
    { id: 'rhs-100-50-20', label: 'RHS 100×50×2.0 mm — verify actual', type: 'rhs', widthMm: 50, depthMm: 100, thicknessMm: 2 },
    { id: 'custom', label: 'Custom measured / catalog steel section' }
  ]
};

export function presetsForFamily(family) {
  return SECTION_PRESETS[family] ?? [{ id: 'custom', label: 'Custom measured section' }];
}

export function findPreset(family, id) {
  return presetsForFamily(family).find((preset) => preset.id === id) ?? null;
}
