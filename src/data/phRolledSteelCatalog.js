export const PH_ROLLED_STEEL_SOURCES = {
  jfeJisH: {
    id: 'jfe-jis-g3192-h-2026',
    organization: 'JFE Steel Corporation',
    standard: 'JIS G 3192 metric wide-flange series',
    product: 'Rolled H / wide-flange shapes',
    technicalStatus: 'official manufacturer catalog properties',
    marketStatus: 'H-beam family confirmed in Philippine supplier catalogs; exact size, grade and inventory must be verified',
    accessed: '2026-07-30'
  }
};

function hSection({ designation, h, b, areaCm2, massKgM, iyStrongCm4, izWeakCm4, welStrongCm3, welWeakCm3, tw, tf }) {
  return {
    id: `ph-jis-h-${designation.replaceAll('×', '-').replaceAll('.', '_')}`,
    label: `JIS H ${designation} mm`,
    type: 'custom',
    widthMm: b,
    depthMm: h,
    areaMm2: areaCm2 * 100,
    ixMm4: iyStrongCm4 * 10_000,
    iyMm4: izWeakCm4 * 10_000,
    zxMm3: welStrongCm3 * 1_000,
    zyMm3: welWeakCm3 * 1_000,
    publishedMassKgM: massKgM,
    webThicknessMm: tw,
    flangeThicknessMm: tf,
    maxLengthM: 12,
    marketStatus: PH_ROLLED_STEEL_SOURCES.jfeJisH.marketStatus,
    analysisStatus: 'elastic gross-section properties ready; grade certificate and lateral-torsional/local stability checks required',
    sourceId: PH_ROLLED_STEEL_SOURCES.jfeJisH.id
  };
}

export const PH_JIS_H_SECTIONS = [
  hSection({ designation: '194×150×6×9', h: 194, b: 150, tw: 6, tf: 9, areaCm2: 38.11, massKgM: 29.9, iyStrongCm4: 2630, izWeakCm4: 507, welStrongCm3: 271, welWeakCm3: 67.6 }),
  hSection({ designation: '244×175×7×11', h: 244, b: 175, tw: 7, tf: 11, areaCm2: 55.49, massKgM: 43.6, iyStrongCm4: 6040, izWeakCm4: 984, welStrongCm3: 495, welWeakCm3: 112 }),
  hSection({ designation: '294×200×8×12', h: 294, b: 200, tw: 8, tf: 12, areaCm2: 71.05, massKgM: 55.8, iyStrongCm4: 11100, izWeakCm4: 1600, welStrongCm3: 756, welWeakCm3: 160 }),
  hSection({ designation: '298×149×5.5×8', h: 298, b: 149, tw: 5.5, tf: 8, areaCm2: 40.80, massKgM: 32.0, iyStrongCm4: 6320, izWeakCm4: 442, welStrongCm3: 424, welWeakCm3: 59.3 }),
  hSection({ designation: '300×150×6.5×9', h: 300, b: 150, tw: 6.5, tf: 9, areaCm2: 46.78, massKgM: 36.7, iyStrongCm4: 7210, izWeakCm4: 508, welStrongCm3: 481, welWeakCm3: 67.7 }),
  hSection({ designation: '346×174×6×9', h: 346, b: 174, tw: 6, tf: 9, areaCm2: 52.45, massKgM: 41.2, iyStrongCm4: 11000, izWeakCm4: 791, welStrongCm3: 638, welWeakCm3: 91.0 }),
  hSection({ designation: '350×175×7×11', h: 350, b: 175, tw: 7, tf: 11, areaCm2: 62.91, massKgM: 49.4, iyStrongCm4: 13500, izWeakCm4: 984, welStrongCm3: 771, welWeakCm3: 112 }),
  hSection({ designation: '396×199×7×11', h: 396, b: 199, tw: 7, tf: 11, areaCm2: 71.41, massKgM: 56.1, iyStrongCm4: 19800, izWeakCm4: 1450, welStrongCm3: 999, welWeakCm3: 145 }),
  hSection({ designation: '400×200×8×13', h: 400, b: 200, tw: 8, tf: 13, areaCm2: 83.37, massKgM: 65.4, iyStrongCm4: 23500, izWeakCm4: 1740, welStrongCm3: 1170, welWeakCm3: 174 })
];
