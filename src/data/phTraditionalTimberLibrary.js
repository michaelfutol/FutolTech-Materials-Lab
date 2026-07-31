const historicalSource = {
  label: 'FAO Unasylva, Philippine forests and forestry — historical construction-use reference',
  year: 1948,
  status: 'historical use reference; not a modern design-property source',
  confidence: 'identity/use context only'
};

const legalSource = {
  label: 'DENR Forest Management Bureau — Timber Harvesting and Transport',
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
  priorityLocal = false
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
    activationRequirements: 'Exact botanical identity; legal origin; moisture and grade; structural-size or accepted grading data; density, E, bending, compression, shear and connection properties; actual dimensions and stock length.',
    source: {
      label: `${historicalSource.label}; ${legalSource.label}`,
      year: legalSource.year,
      status: 'pending engineering dataset',
      confidence: 'inactive until verified',
      note: `${traditionalUse} ${legalNote} No numerical strength or stiffness value is assigned in FutolNative yet.`
    }
  };
}

export const PH_TRADITIONAL_TIMBER_LIBRARY = [
  pendingTimber({
    id: 'timber-apitong-pending',
    name: 'Apitong (Dipterocarpus spp.)',
    aliases: ['apitong wood', 'keruing', 'framework wood'],
    priorityLocal: true,
    botanicalNote: 'Apitong is a trade/group name covering several Dipterocarpus species; do not assume one species dataset for every board.',
    traditionalUse: 'Historically described as an important Philippine framework wood and a heavier structural dipterocarp.',
    groupingNote: 'Record the delivered species, grade, moisture condition and actual dimensions before analysis.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-yakal-pending',
    name: 'Yakal (Shorea / Hopea group)',
    aliases: ['yakal wood', 'yakal timber', 'heavy structural timber'],
    priorityLocal: true,
    botanicalNote: 'The trade name includes several Shorea and Hopea species producing hard yellowish-brown timber.',
    traditionalUse: 'Historically used for posts, beams, joists, rafters, bridge timbers and other demanding exposed construction.',
    groupingNote: 'Species-level identity matters; “yakal” cannot be treated as one uniform material without grading evidence.',
    legalNote: 'Require legal origin and current DENR documentation before procurement or structural promotion.'
  }),
  pendingTimber({
    id: 'timber-red-lauan-pending',
    name: 'Red Lauan / Red Lawaan (Shorea group)',
    aliases: ['red lauan', 'red lawan', 'red lawaan', 'red lauwan', 'philippine mahogany red'],
    priorityLocal: true,
    botanicalNote: 'Red lauan is a trade group, not one guaranteed species. Exact botanical identity and grade are required.',
    traditionalUse: 'Historically common in general house construction, joinery, framing, siding, partitions and protected work depending on species and grade.',
    groupingNote: 'Keep separate from white lauan, tanguile and generic “Philippine mahogany” records.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-white-lauan-pending',
    name: 'White Lauan / White Lawaan (Pentacme / Shorea group)',
    aliases: ['white lauan', 'white lawan', 'white lawaan', 'white lauwan', 'philippine mahogany white'],
    priorityLocal: true,
    botanicalNote: 'White lauan is a trade group covering more than one possible species; exact identification is required.',
    traditionalUse: 'Historically used for lighter protected construction, siding, partitions, ceilings, joinery and interior work.',
    groupingNote: 'Keep separate from red lauan, tanguile and generic “Philippine mahogany” records.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-tanguile-pending',
    name: 'Tanguile / Tangile (Shorea polysperma and trade variants)',
    aliases: ['tanguile', 'tangile', 'tangili', 'lauan family'],
    priorityLocal: true,
    botanicalNote: 'Confirm the exact delivered species and avoid merging all tanguile/lauan trade names into one property set.',
    traditionalUse: 'Historically used in Philippine house construction and protected framing, joinery and interior applications.',
    groupingNote: 'A species-specific graded structural dataset is required before solver activation.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-narra-pending',
    name: 'Narra (Pterocarpus indicus)',
    aliases: ['narra wood', 'narra timber', 'rosewood Philippines'],
    priorityLocal: true,
    botanicalNote: 'Exact identity and provenance are essential because premium native timber names are vulnerable to substitution.',
    traditionalUse: 'Primarily recognized as premium hardwood; structural recommendation remains inactive until a defensible graded dataset is supplied.',
    groupingNote: 'Do not infer structural capacity from furniture reputation, density alone or historical prestige.',
    legalNote: 'Do not procure or promote without confirmed legal origin and all current DENR cutting, possession, processing and transport requirements.'
  }),
  pendingTimber({
    id: 'timber-guijo-pending',
    name: 'Guijo (Shorea spp.)',
    aliases: ['guijo wood', 'guijo timber'],
    botanicalNote: 'Guijo and related trade-group material require exact species and grade identification.',
    traditionalUse: 'Historically identified for beams, joists, framing and wear-resistant construction uses.',
    groupingNote: 'Drying and seasoning condition must be documented because movement during seasoning was historically noted.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-molave-pending',
    name: 'Molave / Tugas (Vitex parviflora)',
    aliases: ['molave', 'tugas', 'molave wood'],
    botanicalNote: 'Use the accepted botanical identity and do not substitute unrelated lumber sold under a local nickname.',
    traditionalUse: 'Traditional premium hardwood associated with durable posts, heavy construction and exposed service.',
    groupingNote: 'A modern structural dataset and graded lumber basis have not yet been attached.',
    legalNote: 'Treat as regulated/premium timber: verify legal source, cutting authority where applicable, and transport documents.'
  }),
  pendingTimber({
    id: 'timber-ipil-pending',
    name: 'Ipil (Intsia bijuga)',
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
    groupingNote: 'The active big-leaf mahogany research dataset must never be applied automatically to a board sold only as “Philippine mahogany.”',
    legalNote: 'Require botanical/trade identification, legal origin and current transport documentation.'
  })
];
