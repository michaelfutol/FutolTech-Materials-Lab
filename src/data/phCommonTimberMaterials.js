const provisionalStructuralSource = {
  label: 'Philippine structural-timber working-stress table — 80% stress-grade transcription pending book reconciliation',
  year: null,
  status: 'provisional transcription; verify against the user-supplied timber reference before design use',
  confidence: 'medium-low',
  note: 'Values are treated as historical working-stress references for visually stress-graded unseasoned timber, not species-average rupture strengths. Exact species identity, visual grade, moisture condition, defects, size effects, duration, treatment, legal origin, and current code applicability remain mandatory. Density is intentionally left unset until a verified source is attached, so these records are excluded from mass-based optimization.'
};

function commonTimber({
  id,
  name,
  aliases = [],
  elasticModulusMPa,
  bendingReferenceMPa,
  compressionParallelMPa,
  groupingNote
}) {
  return {
    id,
    name,
    aliases,
    family: 'wood',
    maxLengthM: 3.6,
    showInPrimaryUi: true,
    priorityLocal: true,
    elasticModulusMPa,
    densityKgM3: null,
    densityBasis: 'pending verified species/grade density source',
    yieldStrengthMPa: null,
    ultimateBendingMPa: null,
    allowableBendingMPa: bendingReferenceMPa,
    bendingReferenceMPa,
    strengthReferenceLabel: 'provisional 80% stress-grade bending working stress',
    compressionParallelMPa,
    groupingNote,
    source: {
      ...provisionalStructuralSource,
      note: `${provisionalStructuralSource.note} ${groupingNote}`
    }
  };
}

export const PH_COMMON_TIMBER_MATERIALS = [
  commonTimber({
    id: 'timber-yakal-ph-80-provisional',
    name: 'Yakal',
    aliases: ['yakal wood', 'heavy structural hardwood'],
    elasticModulusMPa: 9_180,
    bendingReferenceMPa: 24.5,
    compressionParallelMPa: 15.8,
    groupingNote: 'The local trade name can cover more than one Shorea/Hopea species; identify and grade the delivered lumber.'
  }),
  commonTimber({
    id: 'timber-guijo-ph-80-provisional',
    name: 'Guijo',
    aliases: ['guijo wood'],
    elasticModulusMPa: 8_470,
    bendingReferenceMPa: 21.8,
    compressionParallelMPa: 13.2,
    groupingNote: 'Confirm species, seasoning and visual stress grade before structural use.'
  }),
  commonTimber({
    id: 'timber-molave-ph-80-provisional',
    name: 'Molave / Tugas',
    aliases: ['molave', 'tugas'],
    elasticModulusMPa: 6_540,
    bendingReferenceMPa: 24.0,
    compressionParallelMPa: 15.4,
    groupingNote: 'Premium durability reputation does not replace legal-origin, grading and moisture verification.'
  }),
  commonTimber({
    id: 'timber-narra-ph-80-provisional',
    name: 'Narra',
    aliases: ['narra wood', 'Pterocarpus indicus'],
    elasticModulusMPa: 5_940,
    bendingReferenceMPa: 18.0,
    compressionParallelMPa: 11.4,
    groupingNote: 'Use only with confirmed legal origin, exact identity and grading; the record is not a blanket approval of narra procurement.'
  }),
  commonTimber({
    id: 'timber-apitong-ph-80-provisional',
    name: 'Apitong',
    aliases: ['apitong wood', 'keruing'],
    elasticModulusMPa: 7_310,
    bendingReferenceMPa: 16.5,
    compressionParallelMPa: 9.56,
    groupingNote: 'Apitong is a trade group; exact Dipterocarpus species and delivered grade must be confirmed.'
  }),
  commonTimber({
    id: 'timber-red-lauan-ph-80-provisional',
    name: 'Red Lauan',
    aliases: ['red lauan', 'red lawaan', 'red lauwan'],
    elasticModulusMPa: 5_830,
    bendingReferenceMPa: 13.9,
    compressionParallelMPa: 8.18,
    groupingNote: 'This temporarily uses the historical generic Lauan-group working-stress row; replace with species-specific red-lauan data when verified.'
  }),
  commonTimber({
    id: 'timber-white-lauan-ph-80-provisional',
    name: 'White Lauan',
    aliases: ['white lauan', 'white lawaan', 'white lauwan'],
    elasticModulusMPa: 5_830,
    bendingReferenceMPa: 13.9,
    compressionParallelMPa: 8.18,
    groupingNote: 'This temporarily uses the historical generic Lauan-group working-stress row; replace with species-specific white-lauan data when verified.'
  }),
  commonTimber({
    id: 'timber-tanguile-ph-80-provisional',
    name: 'Tanguile',
    aliases: ['tanguile', 'tangile', 'Shorea polysperma'],
    elasticModulusMPa: 5_830,
    bendingReferenceMPa: 13.9,
    compressionParallelMPa: 8.18,
    groupingNote: 'This temporarily uses the historical generic Lauan-group row; a Tanguile-specific graded dataset is still required.'
  }),
  commonTimber({
    id: 'timber-mahogany-ph-80-provisional',
    name: 'Mahogany',
    aliases: ['mahogany', 'Swietenia macrophylla'],
    elasticModulusMPa: 4_660,
    bendingReferenceMPa: 16.5,
    compressionParallelMPa: 10.5,
    groupingNote: 'This record is for big-leaf mahogany and must not be applied to lumber sold only under the ambiguous trade name “Philippine mahogany”.'
  })
];
