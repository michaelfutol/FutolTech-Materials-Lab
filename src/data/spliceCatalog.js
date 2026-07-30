const baseSvg = (body, label) => `
  <svg viewBox="0 0 240 112" role="img" aria-label="${label}">
    <rect x="1" y="1" width="238" height="110" rx="10" class="splice-thumb-bg" />
    ${body}
  </svg>`;

const timberMember = (x, y, width, height) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3" class="splice-thumb-timber" />`;
const steelMember = (x, y, width, height) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" class="splice-thumb-steel" />`;
const bolt = (x, y) => `<circle cx="${x}" cy="${y}" r="5" class="splice-thumb-fastener" /><circle cx="${x}" cy="${y}" r="1.8" class="splice-thumb-fastener-core" />`;
const weld = (points) => `<polyline points="${points}" class="splice-thumb-weld" />`;

export const SPLICE_CATALOG = [
  {
    id: 'wood-double-scab',
    family: 'wood',
    title: 'Double timber scabs',
    subtitle: 'Butt joint with sister plates',
    description: 'Two side members bridge the butt joint and transfer force through nails, screws, or bolts.',
    tags: ['site-friendly', 'semi-rigid', 'fasteners'],
    caution: 'Check scab bending, fastener slip, end splitting, and group action.',
    svg: baseSvg(`
      ${timberMember(18, 45, 92, 24)}
      ${timberMember(130, 45, 92, 24)}
      ${timberMember(55, 25, 130, 16)}
      ${timberMember(55, 73, 130, 16)}
      ${bolt(78, 33)} ${bolt(101, 33)} ${bolt(139, 33)} ${bolt(162, 33)}
      ${bolt(78, 81)} ${bolt(101, 81)} ${bolt(139, 81)} ${bolt(162, 81)}
      <line x1="120" y1="42" x2="120" y2="72" class="splice-thumb-joint" />
    `, 'Double timber scab splice diagram')
  },
  {
    id: 'wood-steel-side-plates',
    family: 'wood',
    title: 'Steel side plates',
    subtitle: 'Butt joint with fishplates',
    description: 'Steel plates bridge both sides of a coco-lumber butt joint using bolts or structural screws.',
    tags: ['high-capacity', 'bolted', 'repairable'],
    caution: 'Check timber embedment, bolt-hole net section, splitting, and plate bearing.',
    svg: baseSvg(`
      ${timberMember(18, 44, 94, 28)}
      ${timberMember(128, 44, 94, 28)}
      ${steelMember(52, 28, 136, 12)}
      ${steelMember(52, 76, 136, 12)}
      ${bolt(76, 34)} ${bolt(100, 34)} ${bolt(140, 34)} ${bolt(164, 34)}
      ${bolt(76, 82)} ${bolt(100, 82)} ${bolt(140, 82)} ${bolt(164, 82)}
      <line x1="120" y1="42" x2="120" y2="74" class="splice-thumb-joint" />
    `, 'Steel side plate timber splice diagram')
  },
  {
    id: 'wood-half-lap',
    family: 'wood',
    title: 'Half-lap splice',
    subtitle: 'Overlapped reduced sections',
    description: 'Both members are notched so their reduced halves overlap along the splice length.',
    tags: ['overlap', 'compact', 'notched'],
    caution: 'The notch reduces net bending and shear section; avoid blindly placing it in a high-moment zone.',
    svg: baseSvg(`
      <path d="M18 43 H104 V56 H150 V69 H18 Z" class="splice-thumb-timber" />
      <path d="M222 43 H136 V56 H90 V69 H222 Z" class="splice-thumb-timber-alt" />
      ${bolt(105, 56)} ${bolt(135, 56)}
      <line x1="90" y1="76" x2="150" y2="76" class="splice-thumb-dimension" />
      <text x="120" y="94" class="splice-thumb-label">overlap</text>
    `, 'Half-lap timber splice diagram')
  },
  {
    id: 'wood-scarf',
    family: 'wood',
    title: 'Scarf splice',
    subtitle: 'Long tapered force path',
    description: 'A longer sloping or stepped interface transfers force through bearing, fasteners, or keys.',
    tags: ['traditional', 'long-overlap', 'craft-intensive'],
    caution: 'Geometry and grain-direction details strongly affect slip, splitting, and moment transfer.',
    svg: baseSvg(`
      <path d="M18 43 H104 L142 69 H18 Z" class="splice-thumb-timber" />
      <path d="M222 69 H136 L98 43 H222 Z" class="splice-thumb-timber-alt" />
      ${bolt(106, 52)} ${bolt(134, 61)}
      <line x1="97" y1="40" x2="143" y2="72" class="splice-thumb-joint" />
    `, 'Scarf timber splice diagram')
  },
  {
    id: 'steel-butt-weld',
    family: 'steel',
    title: 'Butt weld',
    subtitle: 'Direct welded continuity',
    description: 'Two steel tube ends meet directly and transfer force through a prepared weld around the section.',
    tags: ['welded', 'compact', 'fabrication-sensitive'],
    caution: 'Check weld throat, effective length, base metal, fit-up, access, and thin-wall distortion.',
    svg: baseSvg(`
      ${steelMember(18, 42, 96, 32)}
      ${steelMember(126, 42, 96, 32)}
      ${weld('116,38 120,46 124,38 120,54 116,62 120,70 124,62 120,78')}
      <line x1="120" y1="34" x2="120" y2="82" class="splice-thumb-joint" />
    `, 'Steel butt-weld splice diagram')
  },
  {
    id: 'steel-sleeve',
    family: 'steel',
    title: 'Sleeve splice',
    subtitle: 'Internal or external tube sleeve',
    description: 'A sleeve bridges the tube ends and transfers force through welds or bolts over a finite length.',
    tags: ['tube-friendly', 'alignment', 'semi-rigid'],
    caution: 'Check sleeve length, weld/bolt demand, local wall distortion, and fit tolerance.',
    svg: baseSvg(`
      ${steelMember(18, 44, 92, 28)}
      ${steelMember(130, 44, 92, 28)}
      <rect x="67" y="34" width="106" height="48" rx="4" class="splice-thumb-sleeve" />
      <line x1="120" y1="38" x2="120" y2="78" class="splice-thumb-joint" />
      ${bolt(82, 58)} ${bolt(158, 58)}
    `, 'Steel sleeve splice diagram')
  },
  {
    id: 'steel-cover-plates',
    family: 'steel',
    title: 'Cover plates',
    subtitle: 'Bolted or welded fishplates',
    description: 'External plates bridge a butt joint and transfer axial force, shear, and bending through fasteners or welds.',
    tags: ['inspectable', 'repairable', 'plate splice'],
    caution: 'Check plate yielding, bolt/weld groups, net section, tear-out, and tube-wall bearing.',
    svg: baseSvg(`
      ${steelMember(18, 45, 95, 26)}
      ${steelMember(127, 45, 95, 26)}
      ${steelMember(55, 27, 130, 12)}
      ${steelMember(55, 77, 130, 12)}
      ${bolt(78, 33)} ${bolt(101, 33)} ${bolt(139, 33)} ${bolt(162, 33)}
      ${bolt(78, 83)} ${bolt(101, 83)} ${bolt(139, 83)} ${bolt(162, 83)}
      <line x1="120" y1="42" x2="120" y2="74" class="splice-thumb-joint" />
    `, 'Steel cover-plate splice diagram')
  }
];

export function spliceCatalogForFamily(family) {
  return SPLICE_CATALOG.filter((item) => item.family === family);
}

export function getSpliceCatalogItem(id) {
  return SPLICE_CATALOG.find((item) => item.id === id) ?? null;
}
