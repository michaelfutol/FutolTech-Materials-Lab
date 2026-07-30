function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

export function calculateSectionProperties(section) {
  assertPositive('Width', section.widthMm);
  assertPositive('Depth', section.depthMm);

  if (section.type === 'rectangle') {
    const areaMm2 = section.widthMm * section.depthMm;
    const ixMm4 = (section.widthMm * section.depthMm ** 3) / 12;
    const iyMm4 = (section.depthMm * section.widthMm ** 3) / 12;
    return {
      areaMm2,
      ixMm4,
      iyMm4,
      zxMm3: ixMm4 / (section.depthMm / 2),
      zyMm3: iyMm4 / (section.widthMm / 2),
      radiusXmm: Math.sqrt(ixMm4 / areaMm2),
      radiusYmm: Math.sqrt(iyMm4 / areaMm2)
    };
  }

  if (section.type === 'rhs') {
    assertPositive('Wall thickness', section.thicknessMm);
    if (section.thicknessMm * 2 >= Math.min(section.widthMm, section.depthMm)) {
      throw new Error('Tube wall thickness must be less than half the smallest outside dimension.');
    }
    const innerWidth = section.widthMm - 2 * section.thicknessMm;
    const innerDepth = section.depthMm - 2 * section.thicknessMm;
    const areaMm2 = section.widthMm * section.depthMm - innerWidth * innerDepth;
    const ixMm4 = (section.widthMm * section.depthMm ** 3 - innerWidth * innerDepth ** 3) / 12;
    const iyMm4 = (section.depthMm * section.widthMm ** 3 - innerDepth * innerWidth ** 3) / 12;
    return {
      areaMm2,
      ixMm4,
      iyMm4,
      zxMm3: ixMm4 / (section.depthMm / 2),
      zyMm3: iyMm4 / (section.widthMm / 2),
      radiusXmm: Math.sqrt(ixMm4 / areaMm2),
      radiusYmm: Math.sqrt(iyMm4 / areaMm2)
    };
  }

  throw new Error(`Unsupported section type: ${section.type}`);
}
