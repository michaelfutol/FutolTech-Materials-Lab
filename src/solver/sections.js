function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

function finishProperties({ areaMm2, ixMm4, iyMm4, zxMm3, zyMm3, ...extra }) {
  return {
    areaMm2,
    ixMm4,
    iyMm4,
    zxMm3,
    zyMm3,
    radiusXmm: Math.sqrt(ixMm4 / areaMm2),
    radiusYmm: Math.sqrt(iyMm4 / areaMm2),
    ...extra
  };
}

function calculateSharpCornerAngle(section) {
  assertPositive('Horizontal leg B', section.widthMm);
  assertPositive('Vertical leg A', section.depthMm);
  assertPositive('Angle thickness', section.thicknessMm);
  const b = section.widthMm;
  const d = section.depthMm;
  const t = section.thicknessMm;
  if (t >= Math.min(b, d)) throw new Error('Angle thickness must be smaller than both leg dimensions.');

  // Idealized L-section made from vertical and horizontal rectangles minus the
  // overlapping t×t corner square. Axes remain parallel to the physical legs.
  // Rolled root/toe radii are intentionally not invented; use published catalog
  // properties when those radii matter or exact standard properties are known.
  const av = t * d;
  const ah = b * t;
  const ao = t * t;
  const areaMm2 = av + ah - ao;

  const xv = t / 2;
  const yv = d / 2;
  const xh = b / 2;
  const yh = t / 2;
  const xo = t / 2;
  const yo = t / 2;
  const centroidXmm = (av * xv + ah * xh - ao * xo) / areaMm2;
  const centroidYmm = (av * yv + ah * yh - ao * yo) / areaMm2;

  const ixV = (t * d ** 3) / 12 + av * (yv - centroidYmm) ** 2;
  const ixH = (b * t ** 3) / 12 + ah * (yh - centroidYmm) ** 2;
  const ixO = (t * t ** 3) / 12 + ao * (yo - centroidYmm) ** 2;
  const iyV = (d * t ** 3) / 12 + av * (xv - centroidXmm) ** 2;
  const iyH = (t * b ** 3) / 12 + ah * (xh - centroidXmm) ** 2;
  const iyO = (t * t ** 3) / 12 + ao * (xo - centroidXmm) ** 2;
  const ixMm4 = ixV + ixH - ixO;
  const iyMm4 = iyV + iyH - iyO;

  const extremeYmm = Math.max(centroidYmm, d - centroidYmm);
  const extremeXmm = Math.max(centroidXmm, b - centroidXmm);
  return finishProperties({
    areaMm2,
    ixMm4,
    iyMm4,
    zxMm3: ixMm4 / extremeYmm,
    zyMm3: iyMm4 / extremeXmm,
    centroidXmm,
    centroidYmm,
    propertyBasis: 'idealized sharp-corner gross L-section; centroidal axes parallel to legs'
  });
}

export function calculateSectionProperties(section) {
  if (section.type === 'rectangle') {
    assertPositive('Width', section.widthMm);
    assertPositive('Depth', section.depthMm);
    const areaMm2 = section.widthMm * section.depthMm;
    const ixMm4 = (section.widthMm * section.depthMm ** 3) / 12;
    const iyMm4 = (section.depthMm * section.widthMm ** 3) / 12;
    return finishProperties({
      areaMm2,
      ixMm4,
      iyMm4,
      zxMm3: ixMm4 / (section.depthMm / 2),
      zyMm3: iyMm4 / (section.widthMm / 2)
    });
  }

  if (section.type === 'angle') return calculateSharpCornerAngle(section);

  if (section.type === 'rhs') {
    assertPositive('Outside width', section.widthMm);
    assertPositive('Outside depth', section.depthMm);
    assertPositive('Wall thickness', section.thicknessMm);
    if (section.thicknessMm * 2 >= Math.min(section.widthMm, section.depthMm)) {
      throw new Error('Tube wall thickness must be less than half the smallest outside dimension.');
    }
    const innerWidth = section.widthMm - 2 * section.thicknessMm;
    const innerDepth = section.depthMm - 2 * section.thicknessMm;
    const areaMm2 = section.widthMm * section.depthMm - innerWidth * innerDepth;
    const ixMm4 = (section.widthMm * section.depthMm ** 3 - innerWidth * innerDepth ** 3) / 12;
    const iyMm4 = (section.depthMm * section.widthMm ** 3 - innerDepth * innerWidth ** 3) / 12;
    return finishProperties({
      areaMm2,
      ixMm4,
      iyMm4,
      zxMm3: ixMm4 / (section.depthMm / 2),
      zyMm3: iyMm4 / (section.widthMm / 2)
    });
  }

  if (section.type === 'chs') {
    assertPositive('Outside diameter', section.diameterMm);
    assertPositive('Wall thickness', section.thicknessMm);
    if (section.thicknessMm * 2 >= section.diameterMm) {
      throw new Error('Pipe wall thickness must be less than half the outside diameter.');
    }
    const innerDiameter = section.diameterMm - 2 * section.thicknessMm;
    const areaMm2 = (Math.PI / 4) * (section.diameterMm ** 2 - innerDiameter ** 2);
    const inertiaMm4 = (Math.PI / 64) * (section.diameterMm ** 4 - innerDiameter ** 4);
    return finishProperties({
      areaMm2,
      ixMm4: inertiaMm4,
      iyMm4: inertiaMm4,
      zxMm3: inertiaMm4 / (section.diameterMm / 2),
      zyMm3: inertiaMm4 / (section.diameterMm / 2)
    });
  }

  if (section.type === 'round') {
    assertPositive('Diameter', section.diameterMm);
    const areaMm2 = (Math.PI / 4) * section.diameterMm ** 2;
    const inertiaMm4 = (Math.PI / 64) * section.diameterMm ** 4;
    return finishProperties({
      areaMm2,
      ixMm4: inertiaMm4,
      iyMm4: inertiaMm4,
      zxMm3: inertiaMm4 / (section.diameterMm / 2),
      zyMm3: inertiaMm4 / (section.diameterMm / 2)
    });
  }

  if (section.type === 'custom') {
    assertPositive('Overall width', section.widthMm);
    assertPositive('Overall depth', section.depthMm);
    assertPositive('Area', section.areaMm2);
    assertPositive('Iₓ', section.ixMm4);
    assertPositive('Iᵧ', section.iyMm4);
    assertPositive('Zₓ', section.zxMm3);
    assertPositive('Zᵧ', section.zyMm3);
    return finishProperties({
      areaMm2: section.areaMm2,
      ixMm4: section.ixMm4,
      iyMm4: section.iyMm4,
      zxMm3: section.zxMm3,
      zyMm3: section.zyMm3
    });
  }

  throw new Error(`Unsupported section type: ${section.type}`);
}
