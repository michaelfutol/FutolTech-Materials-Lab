export const PH_BAMBOO_MATERIALS = [
  {
    id: 'bamboo-blumeana-ph-2018',
    name: 'Kawayan-tinik (Bambusa blumeana) — PH permissible-stress dataset',
    family: 'bamboo',
    maxLengthM: null,
    elasticModulusMPa: 13_100,
    minimumElasticModulusMPa: 7_400,
    densityKgM3: 570,
    yieldStrengthMPa: null,
    ultimateBendingMPa: 34.6,
    allowableBendingMPa: 7.7,
    bendingReferenceMPa: 7.7,
    strengthReferenceLabel: 'suggested permissible bending stress for quality-controlled mature culms',
    compressionParallelMPa: 8.0,
    shearParallelMPa: 1.1,
    tensionParallelMPa: 21,
    source: {
      label: 'Salzer, Wallbaum, Alipon & Lopez, BioResources 13(1), 2018',
      year: 2018,
      status: 'peer-reviewed Philippine full-culm study',
      confidence: 'medium',
      note: 'Values apply to quality-controlled, mature Bambusa blumeana culms from the Philippine study and a suitable low-rise building method. Mean E = 13.1 GPa; reported minimum E = 7.4 GPa. Geometry, taper, nodes, moisture, treatment, durability, splitting, and connection shear must be verified for each culm.'
    }
  }
];

export const PH_BAMBOO_CULM_PRESETS = [
  {
    id: 'bamboo-blumeana-butt-mean',
    label: 'Kawayan-tinik mean butt culm · OD 94 × wall 24 mm — study geometry',
    type: 'chs',
    productCategory: 'round-bamboo',
    productLabel: 'Round bamboo culm',
    diameterMm: 94,
    thicknessMm: 24,
    marketStatus: 'Philippine study mean geometry; measure every actual culm',
    analysisStatus: 'round-culm elastic comparison; taper, nodes and connections pending',
    sourceId: 'salzer-bioresources-2018'
  },
  {
    id: 'bamboo-blumeana-middle-mean',
    label: 'Kawayan-tinik mean middle culm · OD 91.2 × wall 10 mm — study geometry',
    type: 'chs',
    productCategory: 'round-bamboo',
    productLabel: 'Round bamboo culm',
    diameterMm: 91.2,
    thicknessMm: 10,
    marketStatus: 'Philippine study mean geometry; measure every actual culm',
    analysisStatus: 'round-culm elastic comparison; taper, nodes and connections pending',
    sourceId: 'salzer-bioresources-2018'
  },
  {
    id: 'bamboo-blumeana-top-mean',
    label: 'Kawayan-tinik mean top culm · OD 80.9 × wall 7 mm — study geometry',
    type: 'chs',
    productCategory: 'round-bamboo',
    productLabel: 'Round bamboo culm',
    diameterMm: 80.9,
    thicknessMm: 7,
    marketStatus: 'Philippine study mean geometry; measure every actual culm',
    analysisStatus: 'round-culm elastic comparison; taper, nodes and connections pending',
    sourceId: 'salzer-bioresources-2018'
  },
  { id: 'custom', label: 'Custom measured bamboo culm' }
];
