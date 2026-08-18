export const PH_LIGHT_STEEL_FRAME_SOURCES = {
  reganAngleBars: {
    id: 'regan-angle-bars-2026',
    organization: 'Regan Industrial Sales, Inc.',
    standard: 'Equal angles: PNS 657:2008; unequal angles: JIS G3192:2008',
    product: 'Hot-rolled mild-carbon steel angle bars',
    sourceStatus: 'official Philippine supplier product page, checked 2026-08-18',
    url: 'https://reganindustrial.com/sections/angle-bars/',
    note: 'Supplier page states equal legs 20×20 to 250×250 mm, unequal legs 75×50 to 150×100 mm, thickness 2.0 to 35 mm, and standard 6 m length. Exact size/thickness pairings and mill grade must be verified before design use.'
  },
  powerSteelAngleBars: {
    id: 'powersteel-angle-bars-2026',
    organization: 'Power Steel Specialist Trading Corporation',
    standard: 'ASTM A36 stated by supplier',
    product: 'Equal and unequal steel angle bars',
    sourceStatus: 'official Philippine supplier product page, checked 2026-08-18',
    url: 'https://powersteel.com.ph/product/angle-bar/',
    note: 'Supplier states ASTM A36 conformity for its angle bars. The delivered mill certificate remains the governing grade evidence for an actual specimen.'
  },
  ugcStuds: {
    id: 'ugc-studs-2026',
    organization: 'Union Galvasteel Corporation',
    standard: 'UGC published product dimensions',
    product: 'Galvanized studs',
    sourceStatus: 'official Philippine manufacturer product page, checked 2026-08-18',
    url: 'https://www.ugc.ph/product/studs/',
    note: 'Published range: 30×50, 30×65, 30×75 and 30×90 mm; nominal thickness 0.40–0.80 mm; commercial length 3.00 m; Z40 coating; minimum tensile strength 275 MPa. Tensile strength is not silently treated as yield strength.'
  },
  knaufDrywallStuds: {
    id: 'knauf-ph-drywall-studs-2026',
    organization: 'Knauf Philippines',
    standard: 'Knauf Philippines drywall system recommendations',
    product: 'Galvanized steel drywall studs',
    sourceStatus: 'official manufacturer system page, checked 2026-08-18',
    url: 'https://knauf.com/en-PH/systems/drywall-systems',
    note: 'Published system studs include 64×33.5×0.50 mm BMT, 76×33.5×0.50 mm BMT, and 92×33.5×0.55 mm BMT. Knauf identifies the standard wall partition as non-load-bearing.'
  },
  ugcDoubleFurring: {
    id: 'ugc-double-furring-2026',
    organization: 'Union Galvasteel Corporation',
    standard: 'UGC published product range',
    product: 'Galvanized double furring',
    sourceStatus: 'official Philippine manufacturer product page, checked 2026-08-18',
    url: 'https://www.ugc.ph/product/double-furring/',
    note: 'Published nominal thickness range is 0.30–0.80 mm and commercial length is 5.00 m. The current public product page does not publish enough fold dimensions to derive a unique gross section-property set.'
  }
};

function libraryOnlyRecord({
  id,
  category,
  label,
  dimensions,
  sectionWidthMm,
  sectionDepthMm,
  thicknessMm = null,
  maxLengthM = null,
  sourceId,
  marketStatus,
  analysisStatus,
  aliases = []
}) {
  return {
    id,
    family: 'steel',
    category,
    categoryLabel: category === 'angle-bar'
      ? 'Angle bar / L-section'
      : category === 'metal-stud'
        ? 'Metal stud / drywall stud'
        : 'Double metal furring',
    shapeKind: category === 'angle-bar' ? 'angle' : 'catalog',
    label,
    fullLabel: label,
    dimensions,
    section: {
      id,
      label,
      type: category === 'angle-bar' ? 'angle' : 'custom',
      productCategory: category,
      widthMm: sectionWidthMm,
      depthMm: sectionDepthMm,
      ...(Number.isFinite(thicknessMm) ? { thicknessMm } : {})
    },
    properties: null,
    publishedMassKgM: null,
    maxLengthM,
    marketStatus,
    analysisStatus,
    activeInSolver: false,
    libraryOnly: true,
    sourceId,
    aliases
  };
}

export const PH_LIGHT_STEEL_FRAME_MARKET_RECORDS = [
  libraryOnlyRecord({
    id: 'ph-angle-regan-market-range',
    category: 'angle-bar',
    label: 'PH hot-rolled angle-bar market range · Regan',
    dimensions: 'Equal 20×20–250×250 mm; unequal 75×50–150×100 mm; t 2.0–35 mm; standard 6 m',
    sectionWidthMm: 50,
    sectionDepthMm: 50,
    thicknessMm: 3,
    maxLengthM: 6,
    sourceId: 'regan-angle-bars-2026',
    marketStatus: 'Official supplier range; exact leg/thickness pairing and delivered grade require product/mill verification.',
    analysisStatus: 'Range record only. Use the Materials Lab Angle bar geometry with actual measured A×B×t, or use verified catalog A/I/Z values. Sharp-corner angle properties are a gross-section approximation; rolled root/toe radii are not inferred.',
    aliases: ['L angle', 'angle iron', 'equal angle', 'unequal angle']
  }),
  ...[
    [50, '0.40–0.80'],
    [65, '0.40–0.80'],
    [75, '0.40–0.80'],
    [90, '0.40–0.80']
  ].map(([webMm, thicknessRange]) => libraryOnlyRecord({
    id: `ph-ugc-stud-30x${webMm}`,
    category: 'metal-stud',
    label: `UGC galvanized stud 30×${webMm} mm`,
    dimensions: `30×${webMm} mm · t ${thicknessRange} mm · 3.00 m`,
    sectionWidthMm: 30,
    sectionDepthMm: webMm,
    maxLengthM: 3,
    sourceId: 'ugc-studs-2026',
    marketStatus: 'Current UGC market profile range; thickness is a published range rather than one exact section.',
    analysisStatus: 'Library/product record only. Full folded profile/return dimensions are not published on the cited page, so Ix/Iy/Z are intentionally not invented.',
    aliases: ['drywall stud', 'C stud', 'metal stud']
  })),
  ...[
    [64, 33.5, 0.50],
    [76, 33.5, 0.50],
    [92, 33.5, 0.55]
  ].map(([webMm, flangeMm, thicknessMm]) => libraryOnlyRecord({
    id: `ph-knauf-stud-${webMm}x${String(flangeMm).replace('.', '_')}x${String(thicknessMm).replace('.', '_')}`,
    category: 'metal-stud',
    label: `Knauf PH drywall stud ${webMm}×${flangeMm}×${thicknessMm.toFixed(2)} mm BMT`,
    dimensions: `${webMm}×${flangeMm}×${thicknessMm.toFixed(2)} mm BMT`,
    sectionWidthMm: flangeMm,
    sectionDepthMm: webMm,
    thicknessMm,
    sourceId: 'knauf-ph-drywall-studs-2026',
    marketStatus: 'Exact member size listed in a current Knauf Philippines drywall system.',
    analysisStatus: 'System/product record only. The cited system is non-load-bearing and the page does not provide the complete cold-formed fold geometry needed for independent member Ix/Iy/Z derivation.',
    aliases: ['drywall stud', 'C stud', 'partition stud']
  })),
  libraryOnlyRecord({
    id: 'ph-ugc-double-furring-range',
    category: 'double-furring',
    label: 'UGC galvanized double furring · market range',
    dimensions: 't 0.30–0.80 mm · commercial length 5.00 m · profile dimensions to verify',
    sectionWidthMm: 50,
    sectionDepthMm: 19,
    maxLengthM: 5,
    sourceId: 'ugc-double-furring-2026',
    marketStatus: 'Current UGC thickness and commercial-length range.',
    analysisStatus: 'Library/product record only. Overall/fold dimensions sufficient for a unique hat-channel section-property calculation are not stated on the current cited product page; do not infer them.',
    aliases: ['double metal furring', 'double furring channel', 'ceiling furring']
  })
];
