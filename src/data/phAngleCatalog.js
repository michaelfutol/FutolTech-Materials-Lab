const REGAN_2026_HANDBOOK_URL = 'https://reganindustrial.com/wp-content/uploads/2026/07/2026-Product-Handbook.pdf';

export const PH_ANGLE_SOURCES = {
  reganAngle2026: {
    id: 'regan-angle-handbook-2026',
    organization: 'Regan Industrial Sales, Inc.',
    standard: 'Equal angles: PNS 657:2008; unequal angles: JIS G3192:2008',
    product: 'Hot-rolled angle bars',
    url: REGAN_2026_HANDBOOK_URL,
    productPageUrl: 'https://reganindustrial.com/sections/angle-bars/',
    sourceStatus: 'official supplier product page and 2026 product handbook, checked 2026-08-18',
    note: 'Regan states equal-leg sizes 20×20 to 250×250 mm, unequal-leg sizes 75×50 to 150×100 mm, multiple thicknesses from 2 to 35 mm and standard 6 m lengths. The rows below are a deliberately curated transcription of combinations whose size, thickness and kg/m values were independently legibility-checked; unclear OCR rows are omitted rather than guessed.'
  },
  dtiPns657: {
    id: 'dti-bps-pns657-current',
    organization: 'DTI Bureau of Philippine Standards',
    standard: 'PNS 657:2008',
    product: 'Hot-rolled equal-leg steel angle bars',
    url: 'https://bps.dti.gov.ph/component/content/article?Itemid=111&id=85',
    sourceStatus: 'current official BPS mandatory-certification coverage, checked 2026-08-18',
    note: 'Equal-leg steel angle bars covered by PNS 657:2008 are under the Philippine mandatory product-certification framework. Product certification does not remove the need to verify the delivered grade/certificate for design.'
  }
};

function anglePreset({ legs, thicknessMm, massKgM, standard, sourceTable = 'Regan 2026 handbook' }) {
  const [depthMm, widthMm] = legs;
  const equal = Math.abs(depthMm - widthMm) < 1e-9;
  const sizeText = `${depthMm}×${widthMm}×${thicknessMm}`;
  return {
    id: `angle-${equal ? 'eq' : 'uneq'}-${depthMm}-${widthMm}-${String(thicknessMm).replace('.', '_')}`,
    label: `Angle ${sizeText} mm · ${equal ? 'PNS 657' : 'JIS G3192'} · Regan handbook`,
    type: 'angle',
    productCategory: 'angle-bar',
    productLabel: equal ? 'Equal-leg angle bar' : 'Unequal-leg angle bar',
    widthMm,
    depthMm,
    thicknessMm,
    publishedMassKgM: massKgM,
    publishedWeight6mKg: Number((massKgM * 6).toFixed(3)),
    maxLengthM: 6,
    sourceId: 'regan-angle-handbook-2026',
    standard,
    marketStatus: `Exact ${sizeText} mm size/thickness pairing transcribed from ${sourceTable}; standard commercial length 6 m. Confirm current stock and delivered certification before procurement.`,
    analysisStatus: 'Active gross-section bending SCREENING. Geometry uses the idealized sharp-corner A×B×t L-section model; rolled root/toe radii, principal-axis unsymmetric bending, shear-centre/torsion, local instability and lateral-torsional/flexural-torsional buckling are not yet design-checked.',
    evidenceStatus: 'supplier-handbook-transcription',
    catalogMassBasis: 'published kg/m; 6 m weight calculated from kg/m for internal consistency'
  };
}

// Curated exact rows only. Rows that were ambiguous in the accessible handbook text
// are intentionally omitted rather than reconstructed from range statements.
const EQUAL_ROWS = [
  [[20, 20], 3, 0.88],
  [[30, 30], 4, 1.78],
  [[35, 35], 5, 2.57],
  [[50, 50], 4, 3.08],
  [[50, 50], 5, 3.77],
  [[63.5, 63.5], 7, 6.64],
  [[90, 90], 9, 12.18],
  [[100, 100], 8, 12.18],
  [[125, 125], 8, 15.34],
  [[125, 125], 10, 18.96],
  [[125, 125], 12, 22.56],
  [[150, 150], 10, 22.88],
  [[150, 150], 12, 27.35],
  [[150, 150], 15, 33.77],
  [[200, 200], 20, 59.03],
  [[200, 200], 24, 71.11],
  [[250, 250], 35, 128.03]
];

const UNEQUAL_ROWS = [
  [[75, 50], 5, 4.67],
  [[75, 50], 6, 5.65],
  [[75, 50], 8, 7.39],
  [[100, 75], 6, 7.95],
  [[100, 75], 7, 9.23],
  [[100, 75], 8, 10.60],
  [[100, 75], 9, 11.73],
  [[100, 75], 10, 13.00],
  [[100, 75], 12, 15.40],
  [[125, 75], 7, 10.60],
  [[125, 75], 8, 12.20],
  [[125, 75], 9, 13.50],
  [[125, 75], 10, 15.00],
  [[125, 75], 12, 17.80],
  [[150, 75], 9, 15.40],
  [[150, 75], 10, 17.00],
  [[150, 75], 12, 20.20],
  [[150, 90], 9, 16.32],
  [[150, 90], 10, 18.20],
  [[150, 90], 12, 21.60],
  [[150, 90], 15, 26.60]
];

export const PH_ANGLE_SECTIONS = [
  ...EQUAL_ROWS.map(([legs, thicknessMm, massKgM]) => anglePreset({
    legs,
    thicknessMm,
    massKgM,
    standard: 'PNS 657:2008'
  })),
  ...UNEQUAL_ROWS.map(([legs, thicknessMm, massKgM]) => anglePreset({
    legs,
    thicknessMm,
    massKgM,
    standard: 'JIS G3192:2008'
  }))
];

export function findPhAngleSection(id) {
  return PH_ANGLE_SECTIONS.find((section) => section.id === id) ?? null;
}
