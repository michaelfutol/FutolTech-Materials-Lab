import { validateRoofPurlinEffectiveWindArea } from './windRoofPurlinEffectiveArea.js';
import { validateWindRoofZoneGeometry } from './windRoofZoneGeometry.js';

export const WIND_ROOF_EXTERNAL_GCP_SCHEMA = 'futoltech.wind-roof-external-gcp/1';

const SUPPORTED_CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const DESIGN_PROCEDURE = 'components-and-cladding';
const TARGET_CLASS = 'roof-purlin';
const M2_TO_FT2 = 10.763910416709722;
const MIN_CURVE_AREA_FT2 = 10;
const MAX_CURVE_AREA_FT2 = 100;
const EPS = 1e-9;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function nearlyEqual(left, right, tolerance = EPS) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function sameRecord(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function curveArea(effectiveWindAreaM2) {
  const actualFt2 = Number(effectiveWindAreaM2) * M2_TO_FT2;
  if (!Number.isFinite(actualFt2) || !(actualFt2 > 0)) throw new Error('Coefficient-selection effective wind area must be positive.');
  const usedFt2 = clamp(actualFt2, MIN_CURVE_AREA_FT2, MAX_CURVE_AREA_FT2);
  const regime = actualFt2 <= MIN_CURVE_AREA_FT2 + EPS
    ? 'LOW_AREA_PLATEAU'
    : actualFt2 >= MAX_CURVE_AREA_FT2 - EPS
      ? 'HIGH_AREA_PLATEAU'
      : 'LOG10_INTERPOLATION';
  return {
    effectiveWindAreaM2: Number(effectiveWindAreaM2),
    effectiveWindAreaFt2: actualFt2,
    curveEvaluationAreaFt2: usedFt2,
    log10CurveArea: Math.log10(usedFt2),
    regime
  };
}

function coefficients2B(zoneType, logA, regime) {
  const positive = regime === 'LOW_AREA_PLATEAU' ? 0.5 : regime === 'HIGH_AREA_PLATEAU' ? 0.3 : 0.7 - 0.2 * logA;
  if (zoneType === 'field') {
    return {
      positive,
      negative: regime === 'LOW_AREA_PLATEAU' ? -0.9 : regime === 'HIGH_AREA_PLATEAU' ? -0.8 : -1.0 + 0.1 * logA,
      negativeCurveId: '2B-Z1-negative'
    };
  }
  if (zoneType === 'edge') {
    return {
      positive,
      negative: regime === 'LOW_AREA_PLATEAU' ? -1.7 : regime === 'HIGH_AREA_PLATEAU' ? -1.2 : -2.2 + 0.5 * logA,
      negativeCurveId: '2B-Z2-negative'
    };
  }
  if (zoneType === 'corner') {
    return {
      positive,
      negative: regime === 'LOW_AREA_PLATEAU' ? -2.6 : regime === 'HIGH_AREA_PLATEAU' ? -2.0 : -3.2 + 0.6 * logA,
      negativeCurveId: '2B-Z3-negative'
    };
  }
  throw new Error(`Unsupported roof zone type '${zoneType}'.`);
}

function coefficients2C(zoneType, logA, regime) {
  const positive = regime === 'LOW_AREA_PLATEAU' ? 0.9 : regime === 'HIGH_AREA_PLATEAU' ? 0.8 : 1.0 - 0.1 * logA;
  if (zoneType === 'field') {
    return {
      positive,
      negative: regime === 'LOW_AREA_PLATEAU' ? -1.0 : regime === 'HIGH_AREA_PLATEAU' ? -0.8 : -1.2 + 0.2 * logA,
      negativeCurveId: '2C-Z1-negative'
    };
  }
  if (zoneType === 'edge' || zoneType === 'corner') {
    return {
      positive,
      negative: regime === 'LOW_AREA_PLATEAU' ? -1.2 : regime === 'HIGH_AREA_PLATEAU' ? -1.0 : -1.4 + 0.2 * logA,
      negativeCurveId: '2C-Z2-Z3-negative'
    };
  }
  throw new Error(`Unsupported roof zone type '${zoneType}'.`);
}

function coefficientsForFigure(figureId, zoneType, area) {
  if (figureId === '207E.4-2B') return coefficients2B(zoneType, area.log10CurveArea, area.regime);
  if (figureId === '207E.4-2C') return coefficients2C(zoneType, area.log10CurveArea, area.regime);
  throw new Error(`Unsupported external roof GCp figure '${figureId}'.`);
}

function targetBand(zoneGeometry, label) {
  const band = zoneGeometry.purlinTributaryBandIntersections.find((item) => item.label === label);
  if (!band) throw new Error(`Target purlin tributary band '${label}' was not found in the resolved roof-zone geometry.`);
  return band;
}

function activeZoneTypes(band) {
  return ['field', 'edge', 'corner'].filter((type) => Number(band.zoneAreasM2?.[type]) > EPS);
}

export function resolveWindRoofExternalGcp({
  windRoofZoneGeometry,
  roofPurlinEffectiveWindArea,
  targetPurlinBandLabel,
  codeFigureSourceReference,
  curveEquationSourceReference,
  note = null
} = {}) {
  validateWindRoofZoneGeometry(windRoofZoneGeometry);
  validateRoofPurlinEffectiveWindArea(roofPurlinEffectiveWindArea);

  const zones = clone(windRoofZoneGeometry);
  const effectiveArea = clone(roofPurlinEffectiveWindArea);
  if (zones.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE || effectiveArea.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) {
    throw new Error(`External roof GCp selection supports only '${SUPPORTED_CODE_PROFILE}'.`);
  }
  if (zones.designProcedure !== DESIGN_PROCEDURE || effectiveArea.designProcedure !== DESIGN_PROCEDURE) {
    throw new Error('External roof GCp selection requires matching Components & Cladding upstream records.');
  }
  if (effectiveArea.target?.class !== TARGET_CLASS) throw new Error('External roof GCp selection currently supports only the roof-purlin target.');
  if (!sameRecord(zones.upstreamWindPressureContextAcceptance, effectiveArea.upstreamWindPressureContextAcceptance)) {
    throw new Error('Roof-zone geometry and purlin effective-area records must reference the exact same accepted wind pressure context.');
  }

  const heightM = Number(zones.upstreamWindPressureContextAcceptance.roofGeometry?.meanRoofHeightM);
  if (!Number.isFinite(heightM) || heightM > 18 + EPS) {
    throw new Error('This external roof GCp slice supports only buildings with mean roof height h <= 18 m.');
  }
  if (zones.applicability?.overhangGeometryImplemented !== false) {
    throw new Error('This external roof GCp slice does not support roof-overhang coefficient selection.');
  }

  const label = nonEmpty(targetPurlinBandLabel, 'targetPurlinBandLabel');
  const band = targetBand(zones, label);
  const spanM = Number(zones.roofPlaneRegistration?.baySpanM);
  const areaSpanM = Number(effectiveArea.geometry?.purlinSpanM);
  const bandWidthM = Number(band.widthM);
  const areaWidthM = Number(effectiveArea.geometry?.actualTributaryWidthM);
  if (!nearlyEqual(spanM, areaSpanM)) throw new Error('Purlin effective-area span must match the registered Roof Bay span.');
  if (!nearlyEqual(bandWidthM, areaWidthM)) throw new Error('Purlin effective-area actual tributary width must match the selected roof-zone tributary band width.');
  if (!nearlyEqual(band.actualLoadApplicationAreaM2, effectiveArea.geometry?.actualLoadApplicationAreaM2)) {
    throw new Error('Purlin effective-area actual load area must match the selected roof-zone tributary-band area.');
  }

  const figureId = zones.applicability.figureId;
  const coefficientArea = curveArea(effectiveArea.coefficientSelection.effectiveWindAreaM2);
  const zoneTypes = activeZoneTypes(band);
  if (!zoneTypes.length) throw new Error('Target purlin tributary band has no resolved field/edge/corner area.');

  const coefficientCases = zoneTypes.map((type) => {
    const values = coefficientsForFigure(figureId, type, coefficientArea);
    const zoneNumber = type === 'field' ? 1 : type === 'edge' ? 2 : 3;
    return {
      zoneNumber,
      type,
      actualZoneIntersectionAreaM2: band.zoneAreasM2[type],
      componentCoefficientSelectionEffectiveAreaM2: coefficientArea.effectiveWindAreaM2,
      positiveGCp: values.positive,
      negativeGCp: values.negative,
      positiveCurveId: figureId === '207E.4-2B' ? '2B-all-zones-positive' : '2C-all-zones-positive',
      negativeCurveId: values.negativeCurveId
    };
  });

  const record = {
    schemaVersion: WIND_ROOF_EXTERNAL_GCP_SCHEMA,
    status: 'PURLIN_EXTERNAL_GCP_RESOLVED_EXTERNAL_PRESSURE_BLOCKED',
    adoptedCodeProfileId: SUPPORTED_CODE_PROFILE,
    designProcedure: DESIGN_PROCEDURE,
    target: {
      class: TARGET_CLASS,
      purlinBandLabel: label,
      roofPlane: zones.roofPlaneRegistration.roofPlane
    },
    upstreamWindRoofZoneGeometry: zones,
    upstreamRoofPurlinEffectiveWindArea: effectiveArea,
    applicability: {
      roofForm: 'gable',
      symmetricGableConfirmed: true,
      roofSlopeDeg: zones.applicability.roofSlopeDeg,
      meanRoofHeightM: heightM,
      maxSupportedMeanRoofHeightM: 18,
      roofOverhangTargetSupported: false,
      figureId
    },
    coefficientArea: {
      ...coefficientArea,
      curveAreaUnit: 'ft2',
      interpolationAxis: 'log10-effective-wind-area',
      lowPlateauLimitFt2: MIN_CURVE_AREA_FT2,
      highPlateauLimitFt2: MAX_CURVE_AREA_FT2,
      metricToImperialAreaFactor: M2_TO_FT2
    },
    coefficientCases,
    sourceBasis: {
      codeFigureSourceReference: nonEmpty(codeFigureSourceReference, 'codeFigureSourceReference'),
      curveEquationSourceReference: nonEmpty(curveEquationSourceReference, 'curveEquationSourceReference'),
      codeFigureRule: 'Use the applicable NSCP 2015 Figure 207E.4-2B or 207E.4-2C external roof GCp curve for the resolved gable-roof zone and the purlin coefficient-selection effective wind area.',
      curveEquationRule: 'The implemented log10 interpolation equations reproduce the corresponding ASCE 7-10 Guide Tables G2-3/G2-4 curve segments between 10 ft² and 100 ft²; endpoint coefficients are held on the graph plateaus outside that interval.',
      verificationBoundary: 'Verify the applicable NSCP figure and coefficients against an authorized code copy before project use.'
    },
    implementation: {
      externalPressureCoefficientImplemented: true,
      positiveAndNegativeCasesImplemented: true,
      multiZonePurlinBandImplemented: true,
      externalPressureTermImplemented: false,
      externalInternalPressureCombinationImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      codeDerivedRoofPressureImplemented: false,
      roofBayCodePressureRoutingImplemented: false,
      purlinCapacityPromotionImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: 'This record resolves external GCp only for a supported non-overhang symmetric-gable roof purlin and preserves separate positive/negative coefficients for every resolved zone portion of the selected tributary band. It does not multiply by qh, combine internal pressure, create load combinations, resolve roof-sheet/fastener effective area, rate purlin capacity, or activate code-derived Roof Bay pressure.'
  };

  validateWindRoofExternalGcp(record);
  return clone(record);
}

export function validateWindRoofExternalGcp(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind roof external GCp record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_EXTERNAL_GCP_SCHEMA) throw new Error(`Unsupported wind roof external GCp schema '${record.schemaVersion}'.`);
  if (record.status !== 'PURLIN_EXTERNAL_GCP_RESOLVED_EXTERNAL_PRESSURE_BLOCKED') throw new Error('Wind roof external GCp status changed.');
  validateWindRoofZoneGeometry(record.upstreamWindRoofZoneGeometry);
  validateRoofPurlinEffectiveWindArea(record.upstreamRoofPurlinEffectiveWindArea);
  if (record.adoptedCodeProfileId !== SUPPORTED_CODE_PROFILE) throw new Error('Wind roof external GCp code profile changed.');
  if (record.designProcedure !== DESIGN_PROCEDURE) throw new Error('Wind roof external GCp procedure must remain Components & Cladding.');
  if (record.target?.class !== TARGET_CLASS) throw new Error('Wind roof external GCp target must remain roof-purlin.');

  const rebuilt = resolveForValidation(record);
  if (!sameRecord(record, rebuilt)) throw new Error('Wind roof external GCp record changed from its deterministic upstream geometry/effective-area/source inputs.');
  return true;
}

function resolveForValidation(record) {
  const zones = record.upstreamWindRoofZoneGeometry;
  const effectiveArea = record.upstreamRoofPurlinEffectiveWindArea;
  const label = record.target?.purlinBandLabel;
  validateWindRoofZoneGeometry(zones);
  validateRoofPurlinEffectiveWindArea(effectiveArea);
  if (!sameRecord(zones.upstreamWindPressureContextAcceptance, effectiveArea.upstreamWindPressureContextAcceptance)) {
    throw new Error('Roof-zone geometry and purlin effective-area records must reference the exact same accepted wind pressure context.');
  }
  const band = targetBand(zones, label);
  if (!nearlyEqual(zones.roofPlaneRegistration?.baySpanM, effectiveArea.geometry?.purlinSpanM)) throw new Error('Purlin effective-area span must match the registered Roof Bay span.');
  if (!nearlyEqual(band.widthM, effectiveArea.geometry?.actualTributaryWidthM)) throw new Error('Purlin effective-area actual tributary width must match the selected roof-zone tributary band width.');
  if (!nearlyEqual(band.actualLoadApplicationAreaM2, effectiveArea.geometry?.actualLoadApplicationAreaM2)) throw new Error('Purlin actual load areas do not match.');

  const heightM = Number(zones.upstreamWindPressureContextAcceptance.roofGeometry?.meanRoofHeightM);
  if (!Number.isFinite(heightM) || heightM > 18 + EPS) throw new Error('External roof GCp record exceeds the supported h <= 18 m scope.');
  const coefficientArea = curveArea(effectiveArea.coefficientSelection.effectiveWindAreaM2);
  const zoneTypes = activeZoneTypes(band);
  const figureId = zones.applicability.figureId;
  const coefficientCases = zoneTypes.map((type) => {
    const values = coefficientsForFigure(figureId, type, coefficientArea);
    return {
      zoneNumber: type === 'field' ? 1 : type === 'edge' ? 2 : 3,
      type,
      actualZoneIntersectionAreaM2: band.zoneAreasM2[type],
      componentCoefficientSelectionEffectiveAreaM2: coefficientArea.effectiveWindAreaM2,
      positiveGCp: values.positive,
      negativeGCp: values.negative,
      positiveCurveId: figureId === '207E.4-2B' ? '2B-all-zones-positive' : '2C-all-zones-positive',
      negativeCurveId: values.negativeCurveId
    };
  });

  return {
    schemaVersion: WIND_ROOF_EXTERNAL_GCP_SCHEMA,
    status: 'PURLIN_EXTERNAL_GCP_RESOLVED_EXTERNAL_PRESSURE_BLOCKED',
    adoptedCodeProfileId: SUPPORTED_CODE_PROFILE,
    designProcedure: DESIGN_PROCEDURE,
    target: { class: TARGET_CLASS, purlinBandLabel: label, roofPlane: zones.roofPlaneRegistration.roofPlane },
    upstreamWindRoofZoneGeometry: clone(zones),
    upstreamRoofPurlinEffectiveWindArea: clone(effectiveArea),
    applicability: {
      roofForm: 'gable',
      symmetricGableConfirmed: true,
      roofSlopeDeg: zones.applicability.roofSlopeDeg,
      meanRoofHeightM: heightM,
      maxSupportedMeanRoofHeightM: 18,
      roofOverhangTargetSupported: false,
      figureId
    },
    coefficientArea: {
      ...coefficientArea,
      curveAreaUnit: 'ft2',
      interpolationAxis: 'log10-effective-wind-area',
      lowPlateauLimitFt2: MIN_CURVE_AREA_FT2,
      highPlateauLimitFt2: MAX_CURVE_AREA_FT2,
      metricToImperialAreaFactor: M2_TO_FT2
    },
    coefficientCases,
    sourceBasis: clone(record.sourceBasis),
    implementation: {
      externalPressureCoefficientImplemented: true,
      positiveAndNegativeCasesImplemented: true,
      multiZonePurlinBandImplemented: true,
      externalPressureTermImplemented: false,
      externalInternalPressureCombinationImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      codeDerivedRoofPressureImplemented: false,
      roofBayCodePressureRoutingImplemented: false,
      purlinCapacityPromotionImplemented: false
    },
    note: record.note == null || String(record.note).trim() === '' ? null : String(record.note).trim(),
    boundary: record.boundary
  };
}

export function serializeWindRoofExternalGcp(record) {
  validateWindRoofExternalGcp(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofExternalGcp(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofExternalGcp(parsed);
  return clone(parsed);
}
