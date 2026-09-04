export const PRICE_OBSERVATION_SCHEMA = 'futoltech.price-observation/1';

const CURRENT_OBSERVED_AT = '2026-09-04T15:20:00+08:00';
const SIX_METERS = 6;
const TEN_FEET_M = 3.048;
const TWELVE_FEET_M = 3.6576;
const EIGHT_FEET_M = 2.4384;

function priceObservation({
  id,
  sourceType,
  supplier,
  supplierProduct,
  supplierReference = null,
  sourceUrl,
  observedAt,
  unitPrice,
  stockLengthM,
  availability,
  locationScope,
  match,
  matchScope,
  evidenceStatus
}) {
  return {
    schemaVersion: PRICE_OBSERVATION_SCHEMA,
    id,
    sourceType,
    supplier,
    supplierProduct,
    supplierReference,
    sourceUrl,
    observedAt,
    currency: 'PHP',
    unit: 'stock-piece',
    unitPrice,
    stockLengthM,
    availability,
    locationScope,
    match,
    matchScope,
    engineeringEquivalence: false,
    evidenceStatus
  };
}

const CITI_C_PURLIN_OBSERVATIONS = [
  priceObservation({
    id: 'citihardware-dgp-cpurlin-2x3x6-1_2-20260903',
    sourceType: 'online-retail-listing',
    supplier: 'CitiHardware',
    supplierProduct: 'DGP C-Purlin 2x3x6m 1.2mm',
    supplierReference: '053595',
    sourceUrl: 'https://citihardware.com/products/dgp-c-purlin-2x3x6m-1-2mm-053595',
    observedAt: '2026-09-03T19:00:00+08:00',
    unitPrice: 445,
    stockLengthM: SIX_METERS,
    availability: 'out-of-stock',
    locationScope: 'Philippines online retail listing; store/location stock may vary',
    match: { productCategory: 'c-purlin', tradeSize: '2x3', thicknessMm: 1.2 },
    matchScope: 'nominal trade size + listed thickness + 6 m stock length only',
    evidenceStatus: 'web-observed-retail-price'
  }),
  priceObservation({
    id: 'citihardware-fleximetal-cpurlin-2x3x6-1_2-20260903',
    sourceType: 'online-retail-listing',
    supplier: 'CitiHardware',
    supplierProduct: 'Fleximetal C-Purlin 2x3x6m 1.2mm',
    supplierReference: '057234',
    sourceUrl: 'https://citihardware.com/products/fleximetal-c-purlin-2x3x6m-1-2mm-057234',
    observedAt: '2026-09-03T19:00:00+08:00',
    unitPrice: 595,
    stockLengthM: SIX_METERS,
    availability: 'low-stock',
    locationScope: 'Philippines online retail listing; store/location stock may vary',
    match: { productCategory: 'c-purlin', tradeSize: '2x3', thicknessMm: 1.2 },
    matchScope: 'nominal trade size + listed thickness + 6 m stock length only',
    evidenceStatus: 'web-observed-retail-price'
  }),
  priceObservation({
    id: 'citihardware-fleximetal-cpurlin-2x4x6-1_2-20260903',
    sourceType: 'online-retail-listing',
    supplier: 'CitiHardware',
    supplierProduct: 'Fleximetal C-Purlin 2x4x6m 1.2mm',
    supplierReference: '057235',
    sourceUrl: 'https://citihardware.com/products/fleximetal-c-purlin-2x4x6m-1-2mm-057235',
    observedAt: '2026-09-03T19:00:00+08:00',
    unitPrice: 675,
    stockLengthM: SIX_METERS,
    availability: 'available',
    locationScope: 'Philippines online retail listing; store/location stock may vary',
    match: { productCategory: 'c-purlin', tradeSize: '2x4', thicknessMm: 1.2 },
    matchScope: 'nominal trade size + listed thickness + 6 m stock length only',
    evidenceStatus: 'web-observed-retail-price'
  }),
  priceObservation({
    id: 'citihardware-dgp-cpurlin-2x6x6-1_2-20260903',
    sourceType: 'online-retail-listing',
    supplier: 'CitiHardware',
    supplierProduct: 'DGP C-Purlin 2x6x6m 1.2mm',
    supplierReference: '053596',
    sourceUrl: 'https://citihardware.com/products/dgp-c-purlin-2x6x6m-1-2mm-053596',
    observedAt: '2026-09-03T19:00:00+08:00',
    unitPrice: 665,
    stockLengthM: SIX_METERS,
    availability: 'available',
    locationScope: 'Philippines online retail listing; store/location stock may vary',
    match: { productCategory: 'c-purlin', tradeSize: '2x6', thicknessMm: 1.2 },
    matchScope: 'nominal trade size + listed thickness + 6 m stock length only',
    evidenceStatus: 'web-observed-retail-price'
  }),
  priceObservation({
    id: 'citihardware-fleximetal-cpurlin-2x6x6-1_2-20260903',
    sourceType: 'online-retail-listing',
    supplier: 'CitiHardware',
    supplierProduct: 'Fleximetal C-Purlin 2x6x6m 1.2mm',
    supplierReference: '057237',
    sourceUrl: 'https://citihardware.com/products/fleximetal-c-purlin-2x6x6m-1-2mm-057237',
    observedAt: '2026-09-03T19:00:00+08:00',
    unitPrice: 845,
    stockLengthM: SIX_METERS,
    availability: 'available',
    locationScope: 'Philippines online retail listing; store/location stock may vary',
    match: { productCategory: 'c-purlin', tradeSize: '2x6', thicknessMm: 1.2 },
    matchScope: 'nominal trade size + listed thickness + 6 m stock length only',
    evidenceStatus: 'web-observed-retail-price'
  })
];

const ALPHA_C_PURLIN_PRICES = [
  ['2x3', 1.0, 400], ['2x3', 1.2, 580], ['2x3', 1.5, 640],
  ['2x4', 1.0, 470], ['2x4', 1.2, 600], ['2x4', 1.5, 740], ['2x4', 2.0, 1100],
  ['2x6', 1.0, 600], ['2x6', 1.2, 760], ['2x6', 1.5, 1040], ['2x6', 2.0, 1370],
  ['2x8', 1.0, 810], ['2x8', 1.2, 1020],
  ['2x10', 1.2, 1210]
].map(([tradeSize, thicknessMm, unitPrice]) => priceObservation({
  id: `alphasteel-cpurlin-${tradeSize}-${String(thicknessMm).replace('.', '_')}-20260904`,
  sourceType: 'online-retail-listing',
  supplier: 'Alpha Pro Steel Makers Inc.',
  supplierProduct: `Galvanized C-Purlin ${tradeSize} × ${thicknessMm}mm; 6 m catalog basis`,
  supplierReference: `${tradeSize} / ${thicknessMm}mm`,
  sourceUrl: 'https://alphasteel.ph/products/c-purlins',
  observedAt: CURRENT_OBSERVED_AT,
  unitPrice,
  stockLengthM: SIX_METERS,
  availability: 'available online / verify live stock before PO',
  locationScope: 'Philippines online supplier catalog; delivery and stock vary by project location',
  match: { productCategory: 'c-purlin', tradeSize, thicknessMm },
  matchScope: 'supplier nominal trade size + thickness; 6 m stock basis from supplier C-purlin catalog convention',
  evidenceStatus: 'web-observed-retail-price'
}));

const ALPHA_H_BEAM_OBSERVATIONS = [
  ['ph-jis-h-298-149-5_5-8', '298×149', 19008],
  ['ph-jis-h-300-150-6_5-9', '300×150', 19629.5],
  ['ph-jis-h-346-174-6-9', '346×174', 24502.5],
  ['ph-jis-h-350-175-7-11', '350×175', 29353.5],
  ['ph-jis-h-396-199-7-11', '396×199', 33363],
  ['ph-jis-h-400-200-8-13', '400×200', 38857.5]
].map(([presetId, dimensions, unitPrice]) => priceObservation({
  id: `alphasteel-h-${presetId.replace('ph-jis-h-', '')}-12m-20260904`,
  sourceType: 'online-retail-listing',
  supplier: 'Alpha Pro Steel Makers Inc.',
  supplierProduct: `H Beam ${dimensions} × 12 m`,
  supplierReference: `${dimensions} / 12m`,
  sourceUrl: 'https://alphasteel.ph/products/h-beams',
  observedAt: CURRENT_OBSERVED_AT,
  unitPrice,
  stockLengthM: 12,
  availability: 'available online / verify live stock before PO',
  locationScope: 'Philippines online supplier catalog; delivery and stock vary by project location',
  match: { productCategory: 'rolled-h', presetId },
  matchScope: 'exact app H×B catalog preset mapping to supplier H×B and 12 m listing; supplier page does not restate web/flange thickness in the price table',
  evidenceStatus: 'web-observed-retail-price'
}));

const COCO_PRICE_OBSERVATIONS = [
  priceObservation({
    id: 'bfar7-coco-2x2x12-pras26-02-030',
    sourceType: 'historical-reference',
    supplier: 'BFAR Region VII procurement reference',
    supplierProduct: 'Coco Lumber 2×2×12 ft',
    supplierReference: 'PRAS26-02-030 Annex A',
    sourceUrl: 'https://r7.bfar.da.gov.ph/wp-content/uploads/2026/03/PRAS26-02-030.pdf',
    observedAt: '2026-03-01T00:00:00+08:00',
    unitPrice: 120,
    stockLengthM: TWELVE_FEET_M,
    availability: 'public procurement budget reference; verify supplier stock',
    locationScope: 'BFAR Region VII / Cebu procurement reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x2', materialId: 'coco-uh-2007-average' },
    matchScope: 'coco material + nominal 2×2 preset + 12 ft procurement reference',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'bfar7-coco-2x3x10-pras26-02-030',
    sourceType: 'historical-reference',
    supplier: 'BFAR Region VII procurement reference',
    supplierProduct: 'Coco Lumber 2×3×10 ft',
    supplierReference: 'PRAS26-02-030 Annex A',
    sourceUrl: 'https://r7.bfar.da.gov.ph/wp-content/uploads/2026/03/PRAS26-02-030.pdf',
    observedAt: '2026-03-01T00:00:00+08:00',
    unitPrice: 150,
    stockLengthM: TEN_FEET_M,
    availability: 'public procurement budget reference; verify supplier stock',
    locationScope: 'BFAR Region VII / Cebu procurement reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x3', materialId: 'coco-uh-2007-average' },
    matchScope: 'coco material + nominal 2×3 preset + 10 ft procurement reference',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'bfar7-coco-2x4x12-pras26-02-030',
    sourceType: 'historical-reference',
    supplier: 'BFAR Region VII procurement reference',
    supplierProduct: 'Coco Lumber 2×4×12 ft',
    supplierReference: 'PRAS26-02-030 Annex A',
    sourceUrl: 'https://r7.bfar.da.gov.ph/wp-content/uploads/2026/03/PRAS26-02-030.pdf',
    observedAt: '2026-03-01T00:00:00+08:00',
    unitPrice: 240,
    stockLengthM: TWELVE_FEET_M,
    availability: 'public procurement budget reference; verify supplier stock',
    locationScope: 'BFAR Region VII / Cebu procurement reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x4', materialId: 'coco-uh-2007-average' },
    matchScope: 'coco material + nominal 2×4 preset + 12 ft procurement reference',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'rica-coco-2x6x12-20260904',
    sourceType: 'online-retail-listing',
    supplier: 'Rica Hardware Supply and Trading Inc.',
    supplierProduct: 'Coco Lumber 2×6×12 ft',
    sourceUrl: 'https://www.ricahardware.com/products/coco-lumber-2x3x0',
    observedAt: CURRENT_OBSERVED_AT,
    unitPrice: 336,
    stockLengthM: TWELVE_FEET_M,
    availability: 'listed with quantity input / verify live stock before PO',
    locationScope: 'Philippines online hardware listing',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x6', materialId: 'coco-uh-2007-average' },
    matchScope: 'coco material + nominal 2×6 preset + listed 12 ft variant',
    evidenceStatus: 'web-observed-retail-price'
  }),
  priceObservation({
    id: 'bogo-po-coco-4x4x10-20230426',
    sourceType: 'purchase-order',
    supplier: 'Bogo Glass Center, Inc.',
    supplierProduct: 'Coco Lumber 4×4×10 ft',
    supplierReference: 'City of Bogo PO 2023-4-710',
    sourceUrl: 'https://cityofbogocebu.gov.ph/wp-content/uploads/2023/06/Repair-of-other-government-structure.pdf',
    observedAt: '2023-04-26T00:00:00+08:00',
    unitPrice: 470,
    stockLengthM: TEN_FEET_M,
    availability: 'historical completed purchase order; verify current stock and price',
    locationScope: 'Bogo City, Cebu historical purchase order',
    match: { productCategory: 'sawn-wood', presetId: 'wood-4x4', materialId: 'coco-uh-2007-average' },
    matchScope: 'coco material + nominal 4×4 preset + 10 ft historical PO',
    evidenceStatus: 'historical-purchase-order'
  })
];

const TANGUILE_PRICE_OBSERVATIONS = [
  priceObservation({
    id: 'batangas-app2026-tanguile-2x2x10',
    sourceType: 'historical-reference',
    supplier: 'Province of Batangas APP CY2026 reference',
    supplierProduct: 'Good Lumber (Tanguile) S4S 2×2×10 ft',
    supplierReference: 'APPCY2026-GPPB',
    sourceUrl: 'https://batangas.gov.ph/files/bac/APPCY2026-GPPB.pdf',
    observedAt: '2026-03-01T00:00:00+08:00',
    unitPrice: 360,
    stockLengthM: TEN_FEET_M,
    availability: 'annual procurement-plan budget reference; verify supplier quote',
    locationScope: 'Province of Batangas procurement planning reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x2', materialId: 'timber-tanguile-ph-80-provisional' },
    matchScope: 'Tanguile material + nominal 2×2 preset + 10 ft S4S budget reference',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'batangas-app2026-tanguile-2x3x10',
    sourceType: 'historical-reference',
    supplier: 'Province of Batangas APP CY2026 reference',
    supplierProduct: 'Good Lumber (Tanguile) S4S 2×3×10 ft',
    supplierReference: 'APPCY2026-GPPB',
    sourceUrl: 'https://batangas.gov.ph/files/bac/APPCY2026-GPPB.pdf',
    observedAt: '2026-03-01T00:00:00+08:00',
    unitPrice: 610,
    stockLengthM: TEN_FEET_M,
    availability: 'annual procurement-plan budget reference; verify supplier quote',
    locationScope: 'Province of Batangas procurement planning reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x3', materialId: 'timber-tanguile-ph-80-provisional' },
    matchScope: 'Tanguile material + nominal 2×3 preset + 10 ft S4S budget reference',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'ombudsman-tender2026-tanguile-2x6x8',
    sourceType: 'historical-reference',
    supplier: 'Office of the Ombudsman tender reference',
    supplierProduct: 'S4S KD Wood Lumber (Tanguile/Meranti or equivalent) 2×6×8 ft',
    supplierReference: 'QN 2026-009-APR (GAO)',
    sourceUrl: 'https://www.globaltenders.com/tender-detail/qn-2026-009-apr-gao-carpentry-supplies-YlH0lwkAPhR5Gyh5',
    observedAt: '2026-04-17T00:00:00+08:00',
    unitPrice: 784,
    stockLengthM: EIGHT_FEET_M,
    availability: 'tender budget reference; verify supplier quote and exact species',
    locationScope: 'Philippines Office of the Ombudsman procurement reference',
    match: { productCategory: 'sawn-wood', presetId: 'wood-2x6', materialId: 'timber-tanguile-ph-80-provisional' },
    matchScope: 'Tanguile/Meranti-or-equivalent economic reference + nominal 2×6 preset + 8 ft S4S KD stock',
    evidenceStatus: 'public-procurement-budget-reference'
  })
];

const BAMBOO_PRICE_OBSERVATIONS = [
  priceObservation({
    id: 'kawayan-collective-tinik-6m-floor-20260904',
    sourceType: 'online-retail-listing',
    supplier: 'Kawayan Collective',
    supplierProduct: 'Treated Kawayan Tinik, average 7–10 cm diameter, from ₱90/m; 6 m pole option',
    sourceUrl: 'https://sites.google.com/view/kawayancollective/products',
    observedAt: CURRENT_OBSERVED_AT,
    unitPrice: 540,
    stockLengthM: SIX_METERS,
    availability: 'quote-required; 2.4 m to 6 m lengths listed',
    locationScope: 'Philippines supplier listing',
    match: { productCategory: 'round-bamboo', materialId: 'bamboo-blumeana-ph-2018' },
    matchScope: 'species/trade-name + 7–10 cm diameter range; 6 m price floor derived directly from listed “from ₱90/m” rate',
    evidenceStatus: 'web-observed-supplier-price-floor'
  })
];

const TUBULAR_PRICE_OBSERVATIONS = [
  ['shs-25-12', 'SHS', '25×25×1.2 mm', 405],
  ['shs-50-15', 'SHS', '50×50×1.5 mm', 660],
  ['rhs-75-50-15', 'RHS', '75×50×1.5 mm', 850],
  ['shs-50-20', 'SHS', 'nominal 2×2×2.0 mm (≈50.8×50.8 mm)', 2625]
].map(([presetId, familyLabel, size, unitPrice]) => priceObservation({
  id: `ranflex-${presetId}-20260904`,
  sourceType: 'online-retail-listing',
  supplier: 'Ranflex Metals',
  supplierProduct: `B.I. ${familyLabel} tubular steel ${size} × 6 m`,
  sourceUrl: 'https://www.hollow-sections.net/tubular-steel-tube-price-list-in-philippines.html',
  observedAt: CURRENT_OBSERVED_AT,
  unitPrice,
  stockLengthM: SIX_METERS,
  availability: 'supplier price listing; quote and shipping verification required',
  locationScope: 'Supplier states delivery to Philippines; not a local-store shelf price',
  match: { productCategory: presetId.startsWith('rhs-') ? 'rhs' : 'shs', presetId },
  matchScope: presetId === 'shs-50-20'
    ? 'nominal 2×2 trade-size economic match to 50×50 app preset; not engineering-equivalent dimensions'
    : 'exact listed nominal metric section and thickness + 6 m stock length',
  evidenceStatus: 'web-observed-supplier-price'
}));

const ANGLE_PRICE_OBSERVATIONS = [
  priceObservation({
    id: 'napocor-angle-50x50x4-20ft-2026',
    sourceType: 'historical-reference',
    supplier: 'National Power Corporation procurement reference',
    supplierProduct: 'Angle Bar Steel 2×2 in × 20 ft, stated 4.0 mm',
    supplierReference: 'PR S3-BAI26-001',
    sourceUrl: 'https://www.napocor.gov.ph/BCSD/bid_files/S3-BAI26-001.pdf',
    observedAt: '2026-05-01T00:00:00+08:00',
    unitPrice: 1800,
    stockLengthM: 6.096,
    availability: 'public procurement budget reference; verify current supplier price',
    locationScope: 'Philippines National Power Corporation procurement reference',
    match: { productCategory: 'angle-bar', presetId: 'angle-eq-50-50-4' },
    matchScope: 'nominal 2×2 in and stated 4.0 mm economic match; 20 ft stock differs slightly from 6 m app catalog',
    evidenceStatus: 'public-procurement-budget-reference'
  }),
  priceObservation({
    id: 'projectestimate-angle-50x50x5-20200625',
    sourceType: 'historical-reference',
    supplier: 'TheProjectEstimate.com',
    supplierProduct: 'Mild Steel Angle Bar 50×50×5 mm × 6 m',
    sourceUrl: 'https://www.theprojectestimate.com/angle-bar-price-list/',
    observedAt: '2020-06-25T00:00:00+08:00',
    unitPrice: 1014,
    stockLengthM: SIX_METERS,
    availability: 'historical price-list reference only',
    locationScope: 'Philippines historical construction price guide',
    match: { productCategory: 'angle-bar', presetId: 'angle-eq-50-50-5' },
    matchScope: 'exact nominal section and 6 m length in historical price list',
    evidenceStatus: 'historical-web-price-reference'
  })
];

const GI_HEAVY_PRICES_2025 = [
  ['15', '1/2 in', 603.28], ['20', '3/4 in', 807.06], ['25', '1 in', 1243.13],
  ['32', '1-1/4 in', 1698.36], ['40', '1-1/2 in', 1962.65], ['50', '2 in', 2627.07],
  ['65', '2-1/2 in', 4373.68], ['80', '3 in', 5396.37], ['100', '4 in', 8359.55],
  ['125', '5 in', 11344.41], ['150', '6 in', 15718.29], ['200', '8 in', 24458.69],
  ['250', '10 in', 32355.38], ['300', '12 in', 44128.11]
].map(([designation, nominal, unitPrice]) => priceObservation({
  id: `projectestimate-gi-sch40-${designation}-20250713`,
  sourceType: 'historical-reference',
  supplier: 'TheProjectEstimate.com',
  supplierProduct: `ERW Welded GI Pipe ${nominal} Sch40 × 6 m`,
  sourceUrl: 'https://www.theprojectestimate.com/gi-pipe-price-list/',
  observedAt: '2025-07-13T00:00:00+08:00',
  unitPrice,
  stockLengthM: SIX_METERS,
  availability: 'published price-guide reference; verify current supplier quote',
  locationScope: 'Philippines construction price guide',
  match: { productCategory: 'steel-pipe', presetId: `ph-pipe-PNS26 heavy-${designation}` },
  matchScope: 'nominal pipe size + Sch40/heavy-gauge economic mapping to the app PNS26-heavy preset; product standard equivalence not asserted',
  evidenceStatus: 'historical-web-price-reference'
}));

export const PH_PRICE_OBSERVATIONS = Object.freeze([
  ...CITI_C_PURLIN_OBSERVATIONS,
  ...ALPHA_C_PURLIN_PRICES,
  ...ALPHA_H_BEAM_OBSERVATIONS,
  ...COCO_PRICE_OBSERVATIONS,
  ...TANGUILE_PRICE_OBSERVATIONS,
  ...BAMBOO_PRICE_OBSERVATIONS,
  ...TUBULAR_PRICE_OBSERVATIONS,
  ...ANGLE_PRICE_OBSERVATIONS,
  ...GI_HEAVY_PRICES_2025
].map(Object.freeze));

export const PRICE_SOURCE_POLICY = Object.freeze({
  staleAfterDays: 30,
  manualOverridePriority: true,
  priceIsEngineeringEvidence: false,
  note: 'Online prices, supplier price floors, public procurement budgets, historical purchase orders and published price guides are economic observations only. Verify exact product, live stock, location, taxes, delivery, MOQ and supplier quote before procurement. A user-entered project/supplier quote overrides web observations.'
});
