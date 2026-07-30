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

function pendingTimber({ id, name, botanicalNote, traditionalUse, groupingNote, legalNote }) {
  return {
    id,
    name,
    family: 'wood',
    familyLabel: 'Wood',
    libraryOnly: true,
    activeInSolver: false,
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
    name: 'Apitong group (Dipterocarpus spp.) — verification pending',
    botanicalNote: 'Trade/group name covering several Dipterocarpus species; do not assume one species dataset for every board.',
    traditionalUse: 'Historically described as an important Philippine framework wood and a heavier structural dipterocarp.',
    groupingNote: 'DENR timber grouping and the delivered species must be recorded.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-yakal-pending',
    name: 'Yakal group — verification pending',
    botanicalNote: 'Trade/group name includes several Shorea and Hopea species producing hard yellowish-brown timber.',
    traditionalUse: 'Historically used for posts, beams, joists, rafters, bridge timbers and other demanding exposed construction.',
    groupingNote: 'Species-level identity matters; “yakal” cannot be treated as one uniform material without grading evidence.',
    legalNote: 'Require legal origin and current DENR documentation before procurement or structural promotion.'
  }),
  pendingTimber({
    id: 'timber-guijo-pending',
    name: 'Guijo group (Shorea spp.) — verification pending',
    botanicalNote: 'Guijo and related trade-group material require exact species and grade identification.',
    traditionalUse: 'Historically identified for beams, joists, framing and wear-resistant construction uses.',
    groupingNote: 'Drying and seasoning condition must be documented because movement during seasoning was historically noted.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-molave-pending',
    name: 'Molave / Tugas (Vitex parviflora) — verification pending',
    botanicalNote: 'Use the accepted botanical identity and do not substitute unrelated lumber sold under a local nickname.',
    traditionalUse: 'Traditional premium hardwood associated with durable posts, heavy construction and exposed service.',
    groupingNote: 'A modern structural dataset and graded lumber basis have not yet been attached.',
    legalNote: 'Treat as regulated/premium timber: verify legal source, cutting authority where applicable, and transport documents.'
  }),
  pendingTimber({
    id: 'timber-ipil-pending',
    name: 'Ipil (Intsia bijuga) — verification pending',
    botanicalNote: 'Exact species identity is required; do not confuse with locally named substitutes.',
    traditionalUse: 'Traditional durable heavy-construction timber associated with posts, bridges, marine or severe-service applications.',
    groupingNote: 'Durability reputation does not replace graded mechanical properties.',
    legalNote: 'Require legal origin and current DENR documentation; verify any species-specific restrictions.'
  }),
  pendingTimber({
    id: 'timber-tanguile-lauan-pending',
    name: 'Tanguile / red and white lauan groups — verification pending',
    botanicalNote: '“Philippine mahogany” and “lauan” cover multiple dipterocarp species and must not share one assumed strength value.',
    traditionalUse: 'Historically common for lighter house construction, siding, partitions, ceilings and protected interior uses.',
    groupingNote: 'Separate red lauan, white lauan, tanguile and other identified species before activation.',
    legalNote: 'Require legal-origin and transport documentation and verify current DENR requirements.'
  }),
  pendingTimber({
    id: 'timber-narra-pending',
    name: 'Narra (Pterocarpus indicus) — legal and engineering verification pending',
    botanicalNote: 'Exact identity and provenance are essential because premium native timber names are vulnerable to substitution.',
    traditionalUse: 'Primarily recognized as premium hardwood; structural recommendation is intentionally inactive until a defensible graded dataset is supplied.',
    groupingNote: 'Do not infer structural capacity from furniture reputation, density alone or historical prestige.',
    legalNote: 'Do not procure or promote without confirmed legal origin and all current DENR cutting, possession, processing and transport requirements.'
  }),
  pendingTimber({
    id: 'timber-philippine-mahogany-pending',
    name: '“Philippine mahogany” trade group — exact species required',
    botanicalNote: 'This trade term commonly covers several lauan/dipterocarp species and is not the same as big-leaf mahogany (Swietenia macrophylla).',
    traditionalUse: 'Historically used across protected light construction and interior applications depending on the actual species.',
    groupingNote: 'The active big-leaf mahogany research dataset must never be applied automatically to a board sold only as “Philippine mahogany.”',
    legalNote: 'Require botanical/trade identification, legal origin and current transport documentation.'
  })
];
