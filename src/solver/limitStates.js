function safeRatio(demand, limit) {
  if (!Number.isFinite(demand) || !Number.isFinite(limit) || limit <= 0) return null;
  return demand / limit;
}

function estimatedLoad(loadKN, ratio) {
  if (!Number.isFinite(loadKN) || !Number.isFinite(ratio) || ratio <= 0) return null;
  return loadKN / ratio;
}

function threshold(label, loadKN, ratio, basis) {
  const estimatedLoadKN = estimatedLoad(loadKN, ratio);
  return estimatedLoadKN == null ? null : { label, estimatedLoadKN, basis };
}

export function evaluateBeamLimitState({
  family,
  loadKN,
  maxDeflectionMm,
  deflectionLimitMm,
  maxBendingStressMPa,
  allowableBendingMPa = null,
  yieldStrengthMPa = null,
  ultimateBendingMPa = null
}) {
  const serviceRatio = safeRatio(maxDeflectionMm, deflectionLimitMm);
  const allowableRatio = safeRatio(maxBendingStressMPa, allowableBendingMPa);
  const yieldRatio = safeRatio(maxBendingStressMPa, yieldStrengthMPa);
  const ruptureRatio = safeRatio(maxBendingStressMPa, ultimateBendingMPa);

  const thresholds = [
    threshold('L/360 serviceability', loadKN, serviceRatio, `${deflectionLimitMm.toFixed(2)} mm`),
    threshold('allowable bending reference', loadKN, allowableRatio, `${allowableBendingMPa ?? '—'} MPa`),
    threshold('first-yield reference', loadKN, yieldRatio, `${yieldStrengthMPa ?? '—'} MPa`),
    threshold('published average rupture reference', loadKN, ruptureRatio, `${ultimateBendingMPa ?? '—'} MPa`)
  ].filter(Boolean);

  if (family === 'wood' && ruptureRatio != null && ruptureRatio >= 1) {
    return {
      severity: 'danger',
      code: 'wood-rupture-threshold-exceeded',
      title: 'SNAP / RUPTURE WARNING',
      message: 'The calculated bending stress has reached or exceeded the selected published average rupture reference. A brittle split or snap is possible. The displayed elastic curve is no longer physically valid beyond this point; actual fracture animation awaits the nonlinear timber model.',
      serviceRatio,
      allowableRatio,
      yieldRatio,
      ruptureRatio,
      thresholds
    };
  }

  if (family === 'steel' && yieldRatio != null && yieldRatio >= 1) {
    return {
      severity: 'danger',
      code: 'steel-yield-threshold-exceeded',
      title: 'YIELD WARNING',
      message: 'The calculated bending stress has reached or exceeded the selected steel yield reference. Permanent deformation is expected and the linear-elastic result is no longer valid. Thin-wall local buckling may occur earlier and is not yet represented.',
      serviceRatio,
      allowableRatio,
      yieldRatio,
      ruptureRatio,
      thresholds
    };
  }

  if (allowableRatio != null && allowableRatio >= 1) {
    return {
      severity: 'warning',
      code: 'allowable-reference-exceeded',
      title: 'ALLOWABLE LIMIT EXCEEDED',
      message: 'The selected allowable bending reference has been exceeded. This is not yet a prediction of physical snapping, but the member should not be treated as acceptable at this load.',
      serviceRatio,
      allowableRatio,
      yieldRatio,
      ruptureRatio,
      thresholds
    };
  }

  if (serviceRatio != null && serviceRatio >= 1) {
    return {
      severity: 'warning',
      code: 'serviceability-exceeded',
      title: 'SERVICEABILITY LIMIT EXCEEDED',
      message: 'The member exceeds the selected L/360 deflection limit even though the available material-strength reference has not yet been reached.',
      serviceRatio,
      allowableRatio,
      yieldRatio,
      ruptureRatio,
      thresholds
    };
  }

  const controllingRatio = Math.max(
    serviceRatio ?? 0,
    allowableRatio ?? 0,
    yieldRatio ?? 0,
    ruptureRatio ?? 0
  );

  if (controllingRatio >= 0.8) {
    return {
      severity: 'warning',
      code: 'approaching-limit',
      title: 'APPROACHING FIRST LIMIT',
      message: 'At least one checked elastic limit is above 80% utilisation. Increase the load carefully; the warning will change immediately when a limit is crossed.',
      serviceRatio,
      allowableRatio,
      yieldRatio,
      ruptureRatio,
      thresholds
    };
  }

  return {
    severity: 'safe',
    code: 'elastic-range',
    title: 'ELASTIC CHECK RANGE',
    message: 'No selected serviceability, allowable, yield, or published rupture reference has been exceeded. Connection and local-instability limits are not yet included.',
    serviceRatio,
    allowableRatio,
    yieldRatio,
    ruptureRatio,
    thresholds
  };
}

export function evaluateColumnLimitState({
  family,
  loadKN,
  predictedCapacityKN,
  maxCompressionStressMPa,
  compressionStrengthMPa
}) {
  const capacityRatio = safeRatio(loadKN, predictedCapacityKN);
  const stressRatio = safeRatio(maxCompressionStressMPa, compressionStrengthMPa);
  const thresholds = [
    threshold('predicted governing column capacity', loadKN, capacityRatio, `${predictedCapacityKN.toFixed(2)} kN`),
    threshold('compression-strength reference', loadKN, stressRatio, `${compressionStrengthMPa.toFixed(2)} MPa`)
  ].filter(Boolean);

  if ((capacityRatio != null && capacityRatio >= 1) || (stressRatio != null && stressRatio >= 1)) {
    return {
      severity: 'danger',
      code: 'column-capacity-exceeded',
      title: family === 'steel' ? 'YIELD / BUCKLING WARNING' : 'CRUSHING / BUCKLING WARNING',
      message: 'The applied compression has reached or exceeded an idealised governing capacity or material reference. The elastic column plot is no longer a valid post-failure prediction; physical buckling, crushing, splitting, or local tube failure requires the nonlinear model.',
      capacityRatio,
      stressRatio,
      thresholds
    };
  }

  const controllingRatio = Math.max(capacityRatio ?? 0, stressRatio ?? 0);
  if (controllingRatio >= 0.8) {
    return {
      severity: 'warning',
      code: 'column-approaching-limit',
      title: 'APPROACHING COLUMN CAPACITY',
      message: 'The idealised column demand is above 80% of at least one checked capacity. Real imperfections or connection flexibility can reduce the available capacity.',
      capacityRatio,
      stressRatio,
      thresholds
    };
  }

  return {
    severity: 'safe',
    code: 'column-elastic-range',
    title: 'ELASTIC COLUMN CHECK RANGE',
    message: 'The applied load remains below the selected idealised buckling and compression references. Local and connection failure modes are not yet included.',
    capacityRatio,
    stressRatio,
    thresholds
  };
}
