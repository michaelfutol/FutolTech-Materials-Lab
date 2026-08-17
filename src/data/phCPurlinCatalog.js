export const PH_C_PURLIN_SOURCES = {
  colorsteel: {
    id: 'colorsteel-c-purlins-2026',
    organization: 'Colorsteel Systems Corporation',
    standard: 'Manufacturer product profile listing',
    product: 'Galvanized C-sections / C-purlins',
    sourceStatus: 'official manufacturer product page',
    marketStatus: 'C100, C125, C150, C175, C200 and C240 source profiles; 0.80, 1.00 and 1.35 mm listed for all profiles; cut-to-size length',
    accessed: '2026-08-17',
    url: 'https://colorsteel.com.ph/products/'
  },
  tkl: {
    id: 'tkl-c-purlins-2026',
    organization: 'TKL Steel Corporation',
    standard: 'Philippine supplier product article',
    product: 'B.I. and G.I. C & Z purlins',
    sourceStatus: 'supplier-published market listing',
    marketStatus: '2x3, 2x4, 2x6 and 2x7; 0.6, 0.7, 0.8, 1.0, 1.2, 1.4, 1.5 and 1.8 mm listed',
    accessed: '2026-08-17',
    url: 'https://tkl.com.ph/all-about-z-and-c-purlins/'
  },
  alphaSteel: {
    id: 'alpha-steel-c-purlins-2026',
    organization: 'Alpha Pro Steel Makers Inc.',
    standard: 'Current Philippine retail product listing',
    product: 'Galvanized C-purlins',
    sourceStatus: 'current supplier/retail listing',
    marketStatus: '2x3, 2x4, 2x6, 2x8 and 2x10 current listings with size-specific thickness combinations',
    accessed: '2026-08-17',
    url: 'https://alphasteel.ph/products/c-purlins'
  },
  joyland: {
    id: 'joyland-c-purlins',
    organization: 'Joyland Industries Corporation',
    standard: 'Philippine supplier product listing',
    product: 'G.I. and B.I. C-purlins',
    sourceStatus: 'supplier-published market listing',
    marketStatus: '2x3, 2x4 and 2x6 with G.I./B.I. thickness combinations including 0.5 and 1.1 mm market variants',
    accessed: '2026-08-17',
    url: 'https://joylandindustriescorp.com.ph/c-purlins/'
  },
  unionGalvasteel: {
    id: 'ugc-c-purlins-2026',
    organization: 'Union Galvasteel Corporation',
    standard: 'Manufacturer product page',
    product: 'Galvanized C-purlins',
    sourceStatus: 'official manufacturer product page',
    marketStatus: 'nominal thicknesses 0.80, 1.00, 1.20, 1.40 and 1.80 mm; commercial length 6.00 m',
    accessed: '2026-08-17',
    url: 'https://www.ugc.ph/product/c-purlins/'
  },
  metalink: {
    id: 'metalink-c-purlins-2026',
    organization: 'Metalink Manufacturing Corporation',
    standard: 'Manufacturer product page',
    product: 'Galvanized C-purlins',
    sourceStatus: 'official manufacturer product page',
    marketStatus: 'overall listed thickness range 0.80-3.00 mm; length up to transportable length',
    accessed: '2026-08-17',
    url: 'https://metalink.com.ph/products/c-purlins/'
  },
  regan: {
    id: 'regan-c-purlins-2026',
    organization: 'Regan Industrial Sales, Inc.',
    standard: 'ASTM A653/A570M supplier range',
    product: 'C-purlins',
    sourceStatus: '2026 supplier product range',
    marketStatus: '3, 4, 6 and 7 inch heights; 0.65-2.0 mm range with over 12 thickness options per size; 6 m standard lengths; galvanized and bare options',
    accessed: '2026-08-17',
    url: 'https://reganindustrial.com/sections/steel-purlins/'
  }
};

function assertDimension(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

/**
 * Gross thin-wall lipped-C properties using flat plate centreline dimensions.
 * H = web depth, B = flange, A = return lip, t = thickness.
 * Bend radii and effective-width/local-buckling reductions are deliberately excluded.
 * The formulation reproduces the familiar Philippine C HxBxAxt gross-property
 * convention where A_g = t(H + 2B + 2A).
 */
export function idealizedLippedCProperties({ depthMm, flangeMm, lipMm, thicknessMm }) {
  assertDimension('C-purlin depth', depthMm);
  assertDimension('C-purlin flange', flangeMm);
  assertDimension('C-purlin lip', lipMm);
  assertDimension('C-purlin thickness', thicknessMm);
  if (lipMm >= depthMm / 2) throw new Error('C-purlin lip must be less than half the web depth.');

  const t = thicknessMm;
  const h = depthMm;
  const b = flangeMm;
  const a = lipMm;
  const parts = [
    { area: t * h, x: 0, y: 0, ix: t * h ** 3 / 12, iy: h * t ** 3 / 12 },
    { area: t * b, x: b / 2, y: h / 2, ix: b * t ** 3 / 12, iy: t * b ** 3 / 12 },
    { area: t * b, x: b / 2, y: -h / 2, ix: b * t ** 3 / 12, iy: t * b ** 3 / 12 },
    { area: t * a, x: b, y: h / 2 - a / 2, ix: t * a ** 3 / 12, iy: a * t ** 3 / 12 },
    { area: t * a, x: b, y: -h / 2 + a / 2, ix: t * a ** 3 / 12, iy: a * t ** 3 / 12 }
  ];

  const areaMm2 = parts.reduce((sum, part) => sum + part.area, 0);
  const centroidXmm = parts.reduce((sum, part) => sum + part.area * part.x, 0) / areaMm2;
  const centroidYmm = parts.reduce((sum, part) => sum + part.area * part.y, 0) / areaMm2;
  const ixMm4 = parts.reduce((sum, part) => sum + part.ix + part.area * (part.y - centroidYmm) ** 2, 0);
  const iyMm4 = parts.reduce((sum, part) => sum + part.iy + part.area * (part.x - centroidXmm) ** 2, 0);
  const xExtremeMm = Math.max(centroidXmm, b - centroidXmm);

  return {
    areaMm2,
    centroidXmm,
    centroidYmm,
    ixMm4,
    iyMm4,
    zxMm3: ixMm4 / (h / 2),
    zyMm3: iyMm4 / xExtremeMm
  };
}

function slug(value) {
  return String(value).toLowerCase().replaceAll('×', 'x').replaceAll('.', '_').replace(/[^a-z0-9_-]+/g, '-');
}

function cPurlinPreset({
  idPrefix,
  designation,
  depthMm,
  flangeMm,
  lipMm,
  thicknessMm,
  sourceId,
  marketStatus,
  maxLengthM = 6,
  geometryStatus = 'source-listed geometry',
  finish = 'GI'
}) {
  const properties = idealizedLippedCProperties({ depthMm, flangeMm, lipMm, thicknessMm });
  return {
    id: `${idPrefix}-${slug(designation)}-${String(thicknessMm).replace('.', '_')}`,
    label: `${designation} × ${thicknessMm.toFixed(2)} mm · ${finish}`,
    type: 'custom',
    productCategory: 'c-purlin',
    productLabel: 'Cold-formed C purlin / lipped channel',
    widthMm: flangeMm,
    depthMm,
    purlinDepthMm: depthMm,
    purlinFlangeMm: flangeMm,
    lipMm,
    thicknessMm,
    areaMm2: properties.areaMm2,
    ixMm4: properties.ixMm4,
    iyMm4: properties.iyMm4,
    zxMm3: properties.zxMm3,
    zyMm3: properties.zyMm3,
    centroidXmm: properties.centroidXmm,
    maxLengthM,
    marketStatus,
    geometryStatus,
    analysisStatus: 'gross-section elastic orientation screening only; flat-plate centreline idealization excludes bend radii, effective-width/local buckling, distortional buckling, lateral-torsional buckling, connection restraint and roof-diaphragm effects',
    sourceId
  };
}

const COLORSTEEL_PROFILES = [
  { designation: 'Colorsteel C100 H100×B38×A15', depthMm: 100, flangeMm: 38, lipMm: 15 },
  { designation: 'Colorsteel C125 H125×B50×A10', depthMm: 125, flangeMm: 50, lipMm: 10 },
  { designation: 'Colorsteel C150 H150×B50×A23', depthMm: 150, flangeMm: 50, lipMm: 23 },
  { designation: 'Colorsteel C175 H175×B50×A11', depthMm: 175, flangeMm: 50, lipMm: 11 },
  { designation: 'Colorsteel C200 H200×B75×A23', depthMm: 200, flangeMm: 75, lipMm: 23 },
  // The source labels this profile C240 while listing X = 250 mm. Preserve both facts rather than silently correcting it.
  { designation: 'Colorsteel C240 source-listed H250×B75×A23', depthMm: 250, flangeMm: 75, lipMm: 23 }
];

export const PH_COLORSTEEL_C_PURLINS = COLORSTEEL_PROFILES.flatMap((profile) => [0.8, 1.0, 1.35].map((thicknessMm) => cPurlinPreset({
  idPrefix: 'ph-cp-colorsteel',
  ...profile,
  thicknessMm,
  sourceId: PH_C_PURLIN_SOURCES.colorsteel.id,
  marketStatus: 'Colorsteel current profile: 0.80, 1.00 and 1.35 mm listed for all C profiles; cut-to-size length',
  maxLengthM: null,
  geometryStatus: 'source-listed H/B/A; gross properties calculated by FutolTech flat-plate centreline model',
  finish: 'GI'
})));

const NOMINAL_GEOMETRY = {
  '2x3': { depthMm: 75, flangeMm: 50, lipMm: 15 },
  '2x4': { depthMm: 100, flangeMm: 50, lipMm: 15 },
  '2x6': { depthMm: 150, flangeMm: 50, lipMm: 20 },
  '2x7': { depthMm: 175, flangeMm: 50, lipMm: 20 },
  '2x8': { depthMm: 200, flangeMm: 50, lipMm: 20 },
  '2x10': { depthMm: 250, flangeMm: 50, lipMm: 20 }
};

// Exact size/thickness combinations observed in current or supplier-published Philippine listings.
// Where a supplier gives only the trade size (e.g. 2x7), the H/B/A geometry below is an explicitly
// idealized nominal model for orientation sensitivity; users must verify delivered H/B/A and bend radii.
export const PH_C_PURLIN_MARKET_MATRIX = {
  '2x3': [0.5, 0.6, 0.7, 0.8, 1.0, 1.1, 1.2, 1.4, 1.5, 1.8],
  '2x4': [0.5, 0.6, 0.7, 0.8, 1.0, 1.1, 1.2, 1.4, 1.5, 1.8, 2.0],
  '2x6': [0.5, 0.6, 0.7, 0.8, 1.0, 1.1, 1.2, 1.4, 1.5, 1.8, 2.0],
  '2x7': [0.6, 0.7, 0.8, 1.0, 1.2, 1.4, 1.5, 1.8],
  '2x8': [1.0, 1.2],
  '2x10': [1.2]
};

function nominalSourceIds(size, thicknessMm) {
  const ids = [];
  if (['2x3', '2x4', '2x6', '2x7'].includes(size) && [0.6, 0.7, 0.8, 1.0, 1.2, 1.4, 1.5, 1.8].includes(thicknessMm)) {
    ids.push(PH_C_PURLIN_SOURCES.tkl.id);
  }
  if (size === '2x3' && [1.0, 1.2, 1.5].includes(thicknessMm)) ids.push(PH_C_PURLIN_SOURCES.alphaSteel.id);
  if (['2x4', '2x6'].includes(size) && [1.0, 1.2, 1.5, 2.0].includes(thicknessMm)) ids.push(PH_C_PURLIN_SOURCES.alphaSteel.id);
  if (size === '2x8' && [1.0, 1.2].includes(thicknessMm)) ids.push(PH_C_PURLIN_SOURCES.alphaSteel.id);
  if (size === '2x10' && thicknessMm === 1.2) ids.push(PH_C_PURLIN_SOURCES.alphaSteel.id);
  if (['2x3', '2x4', '2x6'].includes(size) && [0.5, 0.8, 1.0, 1.1, 1.2, 1.4, 1.5].includes(thicknessMm)) {
    ids.push(PH_C_PURLIN_SOURCES.joyland.id);
  }
  return [...new Set(ids)];
}

export const PH_NOMINAL_C_PURLINS = Object.entries(PH_C_PURLIN_MARKET_MATRIX).flatMap(([size, thicknesses]) => {
  const geometry = NOMINAL_GEOMETRY[size];
  const designation = `C-purlin ${size.replace('x', '×')} nominal`;
  return thicknesses.map((thicknessMm) => {
    const sourceIds = nominalSourceIds(size, thicknessMm);
    return {
      ...cPurlinPreset({
        idPrefix: 'ph-cp-nominal',
        designation,
        ...geometry,
        thicknessMm,
        sourceId: sourceIds[0] ?? PH_C_PURLIN_SOURCES.regan.id,
        marketStatus: `${size.replace('x', '×')} trade size × ${thicknessMm.toFixed(2)} mm observed in Philippine supplier listings; exact delivered H/B/A and finish vary by supplier`,
        maxLengthM: 6,
        geometryStatus: 'idealized nominal H/B/A for sensitivity only; supplier listing confirms trade size/thickness, not these exact lip/bend dimensions',
        finish: 'PH market'
      }),
      sourceIds
    };
  });
});

export const PH_C_PURLIN_SECTIONS = [
  ...PH_COLORSTEEL_C_PURLINS,
  ...PH_NOMINAL_C_PURLINS
];

export const PH_C_PURLIN_MARKET_ENVELOPE = {
  observedTradeSizes: ['2x3', '2x4', '2x6', '2x7', '2x8', '2x10'],
  observedExactThicknessesMm: [...new Set(Object.values(PH_C_PURLIN_MARKET_MATRIX).flat())].sort((a, b) => a - b),
  supplierRangeThicknessMm: { min: 0.5, max: 3.0 },
  notes: [
    'Metalink currently lists an overall galvanized C-purlin thickness range of 0.80-3.00 mm without enumerating every size/thickness combination on its product page.',
    'Regan currently lists 3, 4, 6 and 7 inch heights with a 0.65-2.0 mm range and over 12 thickness options per size; its landing page does not enumerate each thickness.',
    'Union Galvasteel currently lists 0.80, 1.00, 1.20, 1.40 and 1.80 mm nominal thicknesses and 6.00 m commercial length.'
  ]
};
