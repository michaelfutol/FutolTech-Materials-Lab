const commonSource = {
  label: 'Marasigan, Daguinod & Villareal, ENNRJ 23(4), 2025',
  year: 2025,
  status: 'published research average',
  confidence: 'research-only',
  note: 'ASTM D143 small-clear-specimen averages conditioned to 12% moisture content. Stress at proportional limit is used only as an elastic research reference, not as a code design allowable. Actual structural lumber requires grading, defect, size, moisture, duration, treatment, and reliability adjustments.'
};

function woodResearchMaterial({ id, name, densityKgM3, elasticModulusMPa, proportionalLimitMPa, ultimateBendingMPa, compressionParallelMPa }) {
  return {
    id,
    name: `${name} — PH 2025 research average at 12% MC`,
    family: 'wood',
    maxLengthM: 3.6,
    elasticModulusMPa,
    densityKgM3,
    densityBasis: 'basic relative-density proxy for comparison mass',
    yieldStrengthMPa: null,
    ultimateBendingMPa,
    allowableBendingMPa: null,
    bendingReferenceMPa: proportionalLimitMPa,
    strengthReferenceLabel: 'stress at proportional limit — research reference, not allowable',
    compressionParallelMPa,
    source: { ...commonSource }
  };
}

export const PH_WOOD_RESEARCH_MATERIALS = [
  woodResearchMaterial({ id: 'wood-bagalunga-ph-2025', name: 'Bagalunga (Melia azedarach)', densityKgM3: 430, elasticModulusMPa: 7_340, proportionalLimitMPa: 21.23, ultimateBendingMPa: 65.36, compressionParallelMPa: 21.65 }),
  woodResearchMaterial({ id: 'wood-falcata-ph-2025', name: 'Falcata (Falcataria falcata)', densityKgM3: 290, elasticModulusMPa: 4_820, proportionalLimitMPa: 13.94, ultimateBendingMPa: 35.46, compressionParallelMPa: 21.56 }),
  woodResearchMaterial({ id: 'wood-gmelina-ph-2025', name: 'Gmelina (Gmelina arborea)', densityKgM3: 440, elasticModulusMPa: 6_970, proportionalLimitMPa: 28.05, ultimateBendingMPa: 64.72, compressionParallelMPa: 34.80 }),
  woodResearchMaterial({ id: 'wood-kalumpit-ph-2025', name: 'Kalumpit (Terminalia microcarpa)', densityKgM3: 420, elasticModulusMPa: 8_580, proportionalLimitMPa: 33.42, ultimateBendingMPa: 64.30, compressionParallelMPa: 29.62 }),
  woodResearchMaterial({ id: 'wood-mahogany-ph-2025', name: 'Mahogany (Swietenia macrophylla)', densityKgM3: 520, elasticModulusMPa: 7_110, proportionalLimitMPa: 29.69, ultimateBendingMPa: 66.96, compressionParallelMPa: 35.62 })
];
