export const PH_STEEL_SOURCES = {
  supremePns26Light: {
    id: 'supreme-pns26-light-2026',
    organization: 'Supreme Steel Pipe Corporation',
    standard: 'PNS 26:2018',
    product: 'ERW galvanized steel light-gauge pipe',
    catalogNote: 'The official manufacturer catalog also covers black steel pipe; FutolNative uses GI pipe as the local-market display name.',
    market: 'Philippines',
    sourceStatus: 'official manufacturer catalog',
    accessed: '2026-07-30'
  },
  supremePns26Heavy: {
    id: 'supreme-pns26-heavy-2026',
    organization: 'Supreme Steel Pipe Corporation',
    standard: 'PNS 26:2018',
    product: 'ERW galvanized steel heavy-gauge / Schedule 40 pipe',
    catalogNote: 'The official manufacturer catalog also covers black steel pipe; FutolNative uses GI pipe as the local-market display name.',
    market: 'Philippines',
    sourceStatus: 'official manufacturer catalog',
    accessed: '2026-07-30'
  },
  supremeA53Heavy: {
    id: 'supreme-a53-heavy-2026',
    organization: 'Supreme Steel Pipe Corporation',
    standard: 'ASTM A53/A53M-2018',
    product: 'ERW galvanized steel heavy-gauge pipe',
    catalogNote: 'The official manufacturer catalog also covers black steel pipe; FutolNative uses GI pipe as the local-market display name.',
    market: 'Philippines',
    sourceStatus: 'official manufacturer catalog',
    accessed: '2026-07-30'
  }
};

const NOMINAL_INCH = new Map([
  [15, '½'], [20, '¾'], [25, '1'], [32, '1¼'], [40, '1½'], [50, '2'],
  [65, '2½'], [80, '3'], [100, '4'], [125, '5'], [150, '6'], [200, '8'],
  [250, '10'], [300, '12'], [350, '14'], [400, '16'], [450, '18'], [500, '20'],
  [600, '24'], [700, '28'], [750, '30'], [800, '32']
]);

const LIGHT = [
  [15, 21.3, 2.0, 0.952], [20, 26.7, 2.3, 1.384], [25, 33.4, 2.6, 1.875],
  [32, 42.2, 2.8, 2.539], [40, 48.3, 2.9, 3.247], [50, 60.3, 2.9, 4.105],
  [65, 73.0, 3.2, 5.508], [80, 88.9, 3.2, 6.763], [100, 114.3, 3.6, 9.828],
  [125, 141.3, 5.0, 16.806], [150, 168.3, 5.0, 20.135], [200, 219.1, 5.8, 30.508],
  [250, 273.0, 6.6, 43.358], [300, 323.8, 6.9, 53.922]
];

const HEAVY = [
  [15, 21.3, 2.8, 1.277], [20, 26.7, 2.9, 1.702], [25, 33.4, 3.4, 2.515],
  [32, 42.2, 3.6, 3.427], [40, 48.3, 3.7, 4.058], [50, 60.3, 4.0, 5.553],
  [65, 73.0, 5.2, 8.694], [80, 88.9, 5.5, 11.312], [100, 114.3, 6.0, 16.024],
  [125, 141.3, 6.6, 21.823], [150, 168.3, 7.1, 28.224], [200, 219.1, 8.2, 42.547],
  [250, 273.0, 9.3, 60.476], [300, 323.8, 10.3, 76.628]
];

const A53_HEAVY = [
  [350, 355.6, 11.13, 94.55], [400, 406.4, 12.70, 123.30],
  [450, 457.0, 14.27, 155.87], [500, 508.0, 15.09, 183.42],
  [600, 610.0, 17.48, 255.24], [700, 711.2, 12.70, 218.78],
  [750, 762.0, 12.70, 234.87], [800, 812.0, 12.70, 250.58]
];

function pipeRecord({ series, sourceId, designation, diameterMm, thicknessMm, publishedMassKgM }) {
  const nominalInchLabel = NOMINAL_INCH.get(designation) ?? null;
  const familiar = nominalInchLabel ? ` (${nominalInchLabel} in nominal)` : '';
  return {
    id: `ph-pipe-${series}-${designation}`,
    label: `GI pipe — ${series} N${designation}${familiar} · OD ${diameterMm} × t ${thicknessMm} mm`,
    type: 'chs',
    productCategory: 'steel-pipe',
    productLabel: 'GI pipe',
    designation,
    nominalInchLabel,
    diameterMm,
    thicknessMm,
    publishedMassKgM,
    finishOptions: ['GI'],
    marketStatus: 'confirmed Philippine manufacturer pipe catalog; local-market display uses GI pipe',
    analysisStatus: 'pipe geometry ready; steel grade certificate, coating condition, and structural-use checks required',
    sourceId
  };
}

export const PH_PIPE_SECTIONS = [
  ...LIGHT.map(([designation, diameterMm, thicknessMm, publishedMassKgM]) => pipeRecord({
    series: 'PNS26 light', sourceId: PH_STEEL_SOURCES.supremePns26Light.id,
    designation, diameterMm, thicknessMm, publishedMassKgM
  })),
  ...HEAVY.map(([designation, diameterMm, thicknessMm, publishedMassKgM]) => pipeRecord({
    series: 'PNS26 Sch40', sourceId: PH_STEEL_SOURCES.supremePns26Heavy.id,
    designation, diameterMm, thicknessMm, publishedMassKgM
  })),
  ...A53_HEAVY.map(([designation, diameterMm, thicknessMm, publishedMassKgM]) => pipeRecord({
    series: 'A53 heavy', sourceId: PH_STEEL_SOURCES.supremeA53Heavy.id,
    designation, diameterMm, thicknessMm, publishedMassKgM
  }))
];
