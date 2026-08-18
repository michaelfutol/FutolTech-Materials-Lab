const EPS = 1e-12;

function assertPositive(name, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
}

export function builtUpTimberSectionBounds({
  plyCount,
  plyWidthMm,
  plyDepthMm,
  arrangement = 'stacked-depth'
}) {
  const n = Number(plyCount);
  const b = Number(plyWidthMm);
  const h = Number(plyDepthMm);
  if (!Number.isInteger(n) || n < 2 || n > 3) throw new Error('Ply count must be 2 or 3 for Assembly Lab v1.');
  assertPositive('Ply width', b);
  assertPositive('Ply depth', h);

  const singleAreaMm2 = b * h;
  const singleIxMm4 = (b * h ** 3) / 12;
  const singleZxMm3 = (b * h ** 2) / 6;
  const independentIxMm4 = n * singleIxMm4;

  if (arrangement === 'side-by-side') {
    const fullWidthMm = n * b;
    const fullDepthMm = h;
    const fullIxMm4 = (fullWidthMm * fullDepthMm ** 3) / 12;
    return {
      plyCount: n,
      arrangement,
      singleAreaMm2,
      totalAreaMm2: n * singleAreaMm2,
      singleIxMm4,
      singleZxMm3,
      independentIxMm4,
      fullCompositeIxMm4: fullIxMm4,
      independentDepthMm: h,
      fullCompositeDepthMm: h,
      fullCompositeWidthMm: fullWidthMm,
      compositeLeverageExists: Math.abs(fullIxMm4 - independentIxMm4) > EPS
    };
  }

  if (arrangement !== 'stacked-depth') throw new Error('Unsupported assembly arrangement.');
  const fullWidthMm = b;
  const fullDepthMm = n * h;
  const fullIxMm4 = (fullWidthMm * fullDepthMm ** 3) / 12;
  return {
    plyCount: n,
    arrangement,
    singleAreaMm2,
    totalAreaMm2: n * singleAreaMm2,
    singleIxMm4,
    singleZxMm3,
    independentIxMm4,
    fullCompositeIxMm4: fullIxMm4,
    independentDepthMm: h,
    fullCompositeDepthMm: fullDepthMm,
    fullCompositeWidthMm: fullWidthMm,
    compositeLeverageExists: fullIxMm4 > independentIxMm4 + EPS
  };
}

export function effectiveAssemblyStiffness({ independentIxMm4, fullCompositeIxMm4, eta }) {
  assertPositive('Independent I', independentIxMm4);
  assertPositive('Full-composite I', fullCompositeIxMm4);
  const degree = Number(eta);
  if (!Number.isFinite(degree) || degree < 0 || degree > 1) throw new Error('Composite-action degree η must be between 0 and 1.');
  return independentIxMm4 + degree * (fullCompositeIxMm4 - independentIxMm4);
}

export function simplySupportedCenterPointDeflectionMm({ loadKN, spanM, elasticModulusMPa, ixMm4 }) {
  assertPositive('Load', loadKN);
  assertPositive('Span', spanM);
  assertPositive('Elastic modulus', elasticModulusMPa);
  assertPositive('I', ixMm4);
  const pN = loadKN * 1000;
  const lMm = spanM * 1000;
  return (pN * lMm ** 3) / (48 * elasticModulusMPa * ixMm4);
}

export function simplySupportedCenterMomentNmm({ loadKN, spanM }) {
  assertPositive('Load', loadKN);
  assertPositive('Span', spanM);
  return loadKN * 1000 * spanM * 1000 / 4;
}

export function evaluateBuiltUpTimberAssembly({
  plyCount = 2,
  plyWidthMm = 50,
  plyDepthMm = 100,
  arrangement = 'stacked-depth',
  eta = 0,
  elasticModulusMPa = 8000,
  loadKN = 1,
  spanM = 3
}) {
  assertPositive('Elastic modulus', elasticModulusMPa);
  const section = builtUpTimberSectionBounds({ plyCount, plyWidthMm, plyDepthMm, arrangement });
  const effectiveIxMm4 = effectiveAssemblyStiffness({
    independentIxMm4: section.independentIxMm4,
    fullCompositeIxMm4: section.fullCompositeIxMm4,
    eta
  });
  const independentDeflectionMm = simplySupportedCenterPointDeflectionMm({ loadKN, spanM, elasticModulusMPa, ixMm4: section.independentIxMm4 });
  const fullCompositeDeflectionMm = simplySupportedCenterPointDeflectionMm({ loadKN, spanM, elasticModulusMPa, ixMm4: section.fullCompositeIxMm4 });
  const effectiveDeflectionMm = simplySupportedCenterPointDeflectionMm({ loadKN, spanM, elasticModulusMPa, ixMm4: effectiveIxMm4 });
  const momentNmm = simplySupportedCenterMomentNmm({ loadKN, spanM });
  const independentPlyStressMPa = (momentNmm / section.plyCount) / section.singleZxMm3;
  const fullCompositeZxMm3 = section.fullCompositeIxMm4 / (section.fullCompositeDepthMm / 2);
  const fullCompositeStressMPa = momentNmm / fullCompositeZxMm3;
  const effectiveOuterFiberStressIndicatorMPa = elasticModulusMPa * (momentNmm / (elasticModulusMPa * effectiveIxMm4)) * (section.fullCompositeDepthMm / 2);

  return {
    section,
    eta: Number(eta),
    elasticModulusMPa,
    loadKN,
    spanM,
    effectiveIxMm4,
    independentDeflectionMm,
    fullCompositeDeflectionMm,
    effectiveDeflectionMm,
    momentNmm,
    independentPlyStressMPa,
    fullCompositeStressMPa,
    effectiveOuterFiberStressIndicatorMPa,
    status: 'SCREENING',
    note: section.compositeLeverageExists
      ? 'η interpolates flexural stiffness only between independent-ply and fully bonded bounds. It is not inferred from nail count or spacing in v1.'
      : 'For side-by-side equal-depth plies, the current gross major-axis stiffness bounds coincide; η does not increase EI in this idealized arrangement.'
  };
}
