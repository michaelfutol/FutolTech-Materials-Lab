const historicalSource = {
  label: 'FAO Unasylva, Philippine forests and forestry — historical construction-use reference',
  year: 1948,
  status: 'historical use reference; not a modern design-property source',
  confidence: 'identity/use context only'
};

const legalSource = {
  label: 'DENR Forest Management Bureau — timber legal-origin and transport requirements',
  year: 2026,
  status: 'current legal-origin and transport-documentation reference',
  confidence: 'current administrative reference'
};

function pendingTimber({
  id,
  name,
  aliases = [],
  botanicalNote,
  traditionalUse,
  groupingNote,
  legalNote,
  priorityLocal = true
}) {
  return {
    id,
    name,
    aliases,
    family: 'wood',
    familyLabel: 'Wood',
    libraryOnly: true,
    activeInSolver: false,
    priorityLocal,
    elasticModulusMPa: null,
    densityKgM3: null,
    bendingReferenceMPa: null,
    ultimateBendingMPa: null,
    compressionParallelMPa: null,
    traditionalUse,
    botanicalNote,
    groupingNote,
    legalNote,
    activationRequirements: 'Exact botanical identity; legal origin; moisture and grade; accepted grading or structural-size data; density, E, bending, compression, shear and connection properties; actual dimensions and stock length.',
    source: {
      label: `${historicalSource.label}; ${legalSource.label}`,
      year: legalSource.year,
      status: 'pending engineering dataset',
      confidence: 'inactive until verified',
      note: `${traditionalUse} ${legalNote} No numerical strength or stiffness value is assigned in FutolNative yet.`
    }
  };
}

// Common woods with provisional structural working-stress records now live in
// phCommonTimberMaterials.js. Keep only still-unresolved local trade/species records here
// to avoid duplicate cards and misleading property borrowing.
export const PH_TRADITIONAL_TIMBER_LIBRARY = [
  pendingTimber({
    id: 'timber-ipil-pending',
    name: 'Ipil (Intsia bijuga) — property package pending',
    aliases: ['ipil wood', 'ipil timber'],
    botanicalNote: 'Exact species identity is required; do not confuse with locally named substitutes.',
    traditionalUse: 'Traditional durable heavy-construction timber associated with posts, bridges, marine or severe-service applications.',
    groupingNote: 'Durability reputation does not replace graded mechanical properties.',
    legalNote: 'Require legal origin and current DENR documentation; verify any species-specific restrictions.'
  }),
  pendingTimber({
    id: 'timber-philippine-mahogany-pending',
    name: '“Philippine mahogany” trade group — exact species required',
    aliases: ['philippine mahogany', 'lauan trade group'],
    botanicalNote: 'This trade term commonly covers several lauan/dipterocarp species and is not the same as big-leaf mahogany (Swietenia macrophylla).',
    traditionalUse: 'Historically used across protected light construction and interior applications depending on the actual species.',
    groupingNote: 'Never apply the active big-leaf-mahogany record automatically to a board sold only as “Philippine mahogany.”',
    legalNote: 'Require botanical/trade identification, legal origin and current transport documentation.'
  })
];
