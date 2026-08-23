import { validateWindRoofExternalPressureTerm } from './windRoofExternalPressureTerm.js';
import { validateBaseInternalPressureCoefficient } from './windInternalPressureCoefficient.js';
import { validateLargeVolumeInternalPressureReduction } from './windLargeVolumeReduction.js';

export const WIND_ROOF_NET_PRESSURE_SCHEMA = 'futoltech.wind-roof-net-pressure/1';

const CODE_PROFILE = 'ph-nscp-2015-v1-7e-2p';
const PROCEDURE = 'components-and-cladding';
const TARGET_CLASS = 'roof-purlin';
const STATUS = 'LOW_RISE_PART1_NET_PRESSURE_RESOLVED_ROOFBAY_ROUTING_BLOCKED';
const MINIMUM_CNC_PRESSURE_KPA = 0.77;
const EPS = 1e-9;
const EQUATION_RULE = 'For the current NSCP 2015 Part 1 roof-purlin Components & Cladding path with h <= 18 m, net pressure is p = qh[(GCp) - (GCpi)]. The internal velocity basis is qh; the Part 3 opening-height qi=qz option is not used.';
const MINIMUM_RULE = 'For Components & Cladding, use a minimum design wind pressure of 0.77 kPa acting in either direction normal to the surface. This implementation applies that floor to the governing toward-surface and away-from-surface net design envelopes, while preserving the unfloored calculated net cases.';
const SIGN_RULE = 'Positive net pressure acts toward the roof surface. Negative net pressure acts away from the roof surface (suction). These are roof-surface-normal directions, not global vertical directions.';
const BOUNDARY = 'This record resolves low-rise Part 1 net roof pressure and the 0.77 kPa minimum directional design envelopes for the supported roof-purlin C&C target. It does not create strength/service load combinations, route code pressure into Roof Bay, resolve roof-sheet/fastener capacity, or promote purlin capacity.';

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function sameRecord(left, right) { return JSON.stringify(stable(left)) === JSON.stringify(stable(right)); }
function nearlyEqual(left, right, tolerance = EPS) { return Math.abs(Number(left) - Number(right)) <= tolerance; }
function nonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function pressureContextFromExternal(externalTerm) {
  return externalTerm.upstreamWindRoofExternalGcp?.upstreamWindRoofZoneGeometry?.upstreamWindPressureContextAcceptance;
}

function resolveInternalCoefficientCases({ externalTerm, baseInternalPressureCoefficient, largeVolumeInternalPressureReduction }) {
  validateBaseInternalPressureCoefficient(baseInternalPressureCoefficient);
  const base = clone(baseInternalPressureCoefficient);
  const externalContext = pressureContextFromExternal(externalTerm);
  if (!externalContext) throw new Error('External pressure term does not carry the accepted pressure context required for net pressure.');
  if (!sameRecord(base.upstreamWindPressureContextAcceptance, externalContext)) {
    throw new Error('Base GCpi and external pressure term must reference the exact same accepted wind pressure context.');
  }
  if (base.enclosureClassification !== externalContext.enclosure?.classification) {
    throw new Error('Base GCpi enclosure classification must match the external pressure context.');
  }
  if (!['enclosed', 'partially-enclosed'].includes(base.enclosureClassification)) {
    throw new Error('The current Part 1 net-pressure path supports only enclosed or partially enclosed buildings.');
  }

  if (base.enclosureClassification === 'enclosed') {
    if (largeVolumeInternalPressureReduction != null) {
      throw new Error('Large-volume Ri record must not be supplied for an enclosed Part 1 net-pressure case.');
    }
    return {
      enclosureClassification: 'enclosed',
      selectedRi: 1,
      riApplied: false,
      coefficientSource: 'base-gcpi',
      coefficientCases: [...base.baseGcpiCases],
      upstreamLargeVolumeInternalPressureReduction: null
    };
  }

  if (!largeVolumeInternalPressureReduction) {
    throw new Error('Partially enclosed Part 1 net pressure requires an explicit large-volume Ri decision record, even when Ri = 1.0.');
  }
  validateLargeVolumeInternalPressureReduction(largeVolumeInternalPressureReduction);
  const ri = clone(largeVolumeInternalPressureReduction);
  if (!sameRecord(ri.upstreamBaseInternalPressureCoefficient, base)) {
    throw new Error('Large-volume Ri record must reference the exact supplied partially enclosed base-GCpi record.');
  }
  return {
    enclosureClassification: 'partially-enclosed',
    selectedRi: ri.selection.selectedRi,
    riApplied: ri.selection.applied,
    coefficientSource: 'ri-adjusted-gcpi',
    coefficientCases: [...ri.adjustedGcpiCases],
    upstreamLargeVolumeInternalPressureReduction: ri
  };
}

function envelopeForZone(rawCases) {
  const positive = rawCases.map((item) => item.rawNetPressureKPa).filter((value) => value > 0);
  const negative = rawCases.map((item) => item.rawNetPressureKPa).filter((value) => value < 0);
  const rawToward = positive.length ? Math.max(...positive) : 0;
  const rawAway = negative.length ? Math.min(...negative) : 0;
  const designToward = Math.max(rawToward, MINIMUM_CNC_PRESSURE_KPA);
  const designAway = Math.min(rawAway, -MINIMUM_CNC_PRESSURE_KPA);
  return {
    towardSurface: {
      rawGoverningPressureKPa: rawToward,
      designPressureKPa: designToward,
      minimumApplied: designToward > rawToward + EPS
    },
    awayFromSurface: {
      rawGoverningPressureKPa: rawAway,
      designPressureKPa: designAway,
      minimumApplied: designAway < rawAway - EPS
    }
  };
}

function buildRecord({
  windRoofExternalPressureTerm,
  baseInternalPressureCoefficient,
  largeVolumeInternalPressureReduction = null,
  netPressureEquationSourceReference,
  minimumPressureSourceReference,
  signConventionSourceReference,
  note = null
} = {}) {
  validateWindRoofExternalPressureTerm(windRoofExternalPressureTerm);
  const externalTerm = clone(windRoofExternalPressureTerm);
  if (externalTerm.adoptedCodeProfileId !== CODE_PROFILE) throw new Error(`Net pressure supports only '${CODE_PROFILE}'.`);
  if (externalTerm.designProcedure !== PROCEDURE || externalTerm.target?.class !== TARGET_CLASS) throw new Error('Net pressure requires the supported roof-purlin Components & Cladding external pressure term.');
  if (Number(externalTerm.upstreamWindRoofExternalGcp?.applicability?.meanRoofHeightM) > 18 + EPS) throw new Error('The current Part 1 net-pressure path is limited to h <= 18 m.');

  const internal = resolveInternalCoefficientCases({ externalTerm, baseInternalPressureCoefficient, largeVolumeInternalPressureReduction });
  const qhKPa = Number(externalTerm.qh?.qhKPa);
  if (!Number.isFinite(qhKPa) || !(qhKPa > 0)) throw new Error('External pressure term must carry a positive mean-roof-height qh.');

  const zoneCases = externalTerm.pressureCases.map((externalCase) => {
    const rawCases = [];
    const externalDirections = [
      { id: 'external-positive', gcP: externalCase.positiveGCp, externalPressureKPa: externalCase.towardSurfaceExternalPressureKPa },
      { id: 'external-negative', gcP: externalCase.negativeGCp, externalPressureKPa: externalCase.awayFromSurfaceExternalPressureKPa }
    ];
    for (const externalDirection of externalDirections) {
      internal.coefficientCases.forEach((gcpi, internalIndex) => {
        const internalPressureKPa = qhKPa * gcpi;
        rawCases.push({
          caseId: `${externalDirection.id}__internal-${gcpi >= 0 ? 'positive' : 'negative'}-${internalIndex + 1}`,
          externalCaseId: externalDirection.id,
          internalCaseIndex: internalIndex,
          GCp: externalDirection.gcP,
          GCpi: gcpi,
          qhKPa,
          externalPressureKPa: externalDirection.externalPressureKPa,
          internalPressureKPa,
          equation: 'p = qh[(GCp) - (GCpi)]',
          rawNetPressureKPa: externalDirection.externalPressureKPa - internalPressureKPa
        });
      });
    }
    return {
      zoneNumber: externalCase.zoneNumber,
      type: externalCase.type,
      actualZoneIntersectionAreaM2: externalCase.actualZoneIntersectionAreaM2,
      componentCoefficientSelectionEffectiveAreaM2: externalCase.componentCoefficientSelectionEffectiveAreaM2,
      rawCases,
      governingDesignEnvelope: envelopeForZone(rawCases)
    };
  });

  return {
    schemaVersion: WIND_ROOF_NET_PRESSURE_SCHEMA,
    status: STATUS,
    adoptedCodeProfileId: CODE_PROFILE,
    designProcedure: PROCEDURE,
    target: clone(externalTerm.target),
    upstreamWindRoofExternalPressureTerm: externalTerm,
    upstreamBaseInternalPressureCoefficient: clone(baseInternalPressureCoefficient),
    upstreamLargeVolumeInternalPressureReduction: internal.upstreamLargeVolumeInternalPressureReduction,
    internalPressureBasis: {
      velocityPressureBasis: 'qh',
      qhKPa,
      enclosureClassification: internal.enclosureClassification,
      coefficientSource: internal.coefficientSource,
      selectedRi: internal.selectedRi,
      riApplied: internal.riApplied,
      GCpiCases: [...internal.coefficientCases],
      part3OpeningHeightQiQzPermitted: false
    },
    zoneCases,
    sourceBasis: {
      netPressureEquationSourceReference: nonEmpty(netPressureEquationSourceReference, 'netPressureEquationSourceReference'),
      minimumPressureSourceReference: nonEmpty(minimumPressureSourceReference, 'minimumPressureSourceReference'),
      signConventionSourceReference: nonEmpty(signConventionSourceReference, 'signConventionSourceReference'),
      equationRule: EQUATION_RULE,
      minimumPressureRule: MINIMUM_RULE,
      signRule: SIGN_RULE
    },
    minimumDesignPressureKPa: MINIMUM_CNC_PRESSURE_KPA,
    implementation: {
      externalPressureCoefficientImplemented: true,
      externalPressureTermImplemented: true,
      internalPressureCoefficientImplemented: true,
      externalInternalPressureCombinationImplemented: true,
      minimumNetPressureApplied: true,
      governingDirectionalEnvelopeImplemented: true,
      loadCombinationsImplemented: false,
      codeDerivedRoofPressureImplemented: false,
      roofBayCodePressureRoutingImplemented: false,
      roofSheetEffectiveWindAreaImplemented: false,
      fastenerEffectiveWindAreaImplemented: false,
      purlinCapacityPromotionImplemented: false
    },
    note: note == null || String(note).trim() === '' ? null : String(note).trim(),
    boundary: BOUNDARY
  };
}

export function resolveWindRoofNetPressure(input = {}) {
  const record = buildRecord(input);
  validateWindRoofNetPressure(record);
  return clone(record);
}

export function validateWindRoofNetPressure(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Wind roof net-pressure record must be an object.');
  if (record.schemaVersion !== WIND_ROOF_NET_PRESSURE_SCHEMA) throw new Error(`Unsupported wind roof net-pressure schema '${record.schemaVersion}'.`);
  if (record.status !== STATUS) throw new Error('Wind roof net-pressure status changed.');
  if (record.adoptedCodeProfileId !== CODE_PROFILE || record.designProcedure !== PROCEDURE || record.target?.class !== TARGET_CLASS) throw new Error('Wind roof net-pressure profile/procedure/target changed.');
  if (record.internalPressureBasis?.velocityPressureBasis !== 'qh') throw new Error('Low-rise Part 1 internal pressure basis must remain qh.');
  if (record.internalPressureBasis?.part3OpeningHeightQiQzPermitted !== false) throw new Error('Part 3 opening-height qi=qz must remain blocked from the Part 1 net-pressure path.');
  if (!nearlyEqual(record.minimumDesignPressureKPa, MINIMUM_CNC_PRESSURE_KPA)) throw new Error('Minimum C&C design pressure changed.');
  nonEmpty(record.sourceBasis?.netPressureEquationSourceReference, 'sourceBasis.netPressureEquationSourceReference');
  nonEmpty(record.sourceBasis?.minimumPressureSourceReference, 'sourceBasis.minimumPressureSourceReference');
  nonEmpty(record.sourceBasis?.signConventionSourceReference, 'sourceBasis.signConventionSourceReference');
  if (record.sourceBasis?.equationRule !== EQUATION_RULE || record.sourceBasis?.minimumPressureRule !== MINIMUM_RULE || record.sourceBasis?.signRule !== SIGN_RULE) throw new Error('Net-pressure source rule text changed.');
  if (record.boundary !== BOUNDARY) throw new Error('Net-pressure engineering boundary changed.');

  const rebuilt = buildRecord({
    windRoofExternalPressureTerm: record.upstreamWindRoofExternalPressureTerm,
    baseInternalPressureCoefficient: record.upstreamBaseInternalPressureCoefficient,
    largeVolumeInternalPressureReduction: record.upstreamLargeVolumeInternalPressureReduction,
    netPressureEquationSourceReference: record.sourceBasis.netPressureEquationSourceReference,
    minimumPressureSourceReference: record.sourceBasis.minimumPressureSourceReference,
    signConventionSourceReference: record.sourceBasis.signConventionSourceReference,
    note: record.note
  });
  if (!sameRecord(record, rebuilt)) throw new Error('Wind roof net-pressure record changed from its deterministic upstream external/internal/source inputs.');
  return true;
}

export function serializeWindRoofNetPressure(record) {
  validateWindRoofNetPressure(record);
  return JSON.stringify(stable(clone(record)), null, 2);
}

export function parseWindRoofNetPressure(textValue) {
  const parsed = JSON.parse(String(textValue));
  validateWindRoofNetPressure(parsed);
  return clone(parsed);
}
