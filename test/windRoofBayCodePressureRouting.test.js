import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveBaseInternalPressureCoefficient } from '../src/solver/windInternalPressureCoefficient.js';
import { resolveLargeVolumeInternalPressureReduction } from '../src/solver/windLargeVolumeReduction.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';
import { resolveWindRoofExternalPressureTerm } from '../src/solver/windRoofExternalPressureTerm.js';
import { resolveWindRoofNetPressure } from '../src/solver/windRoofNetPressure.js';
import {
  resolveWindRoofBayCodePressureRouting,
  serializeWindRoofBayCodePressureRouting,
  parseWindRoofBayCodePressureRouting
} from '../src/solver/windRoofBayCodePressureRouting.js';

function makeContext({ basicWindSpeedKph = 240, enclosureClassification = 'enclosed', slopeDeg = 25 } = {}) {
  const heightM = 8.82;
  const wind = createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines',
    siteSourceReference: 'Project site record / survey reference',
    occupancyCategory: 'III',
    occupancySourceReference: 'Project occupancy classification record',
    basicWindSpeedKph,
    windSpeedSourceType: 'authorized-code-map',
    windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map',
    windSpeedSelectionMethod: 'direct-contour-read',
    windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C',
    exposureSourceReference: 'Engineer terrain/exposure classification record',
    topographicFactorKzt: 1,
    topographySourceReference: 'Engineer topographic-factor project record',
    heightM,
    heightSourceReference: 'Project mean-roof-height record'
  });
  return createWindPressureContextAcceptance({
    windProjectInputAcceptance: wind,
    enclosureClassification,
    enclosureClassificationSourceReference: 'Engineer enclosure classification record',
    openingsAssessmentSourceReference: 'Project openings assessment',
    roofForm: 'gable',
    roofFormSourceReference: 'Architectural roof plan',
    planLengthM: 12,
    planWidthM: 8,
    planDimensionSourceReference: 'Dimensioned architectural plan',
    meanRoofHeightM: heightM,
    meanRoofHeightSourceReference: 'Project mean-roof-height record',
    roofSlopeDeg: slopeDeg,
    roofSlopeSourceReference: 'Architectural roof section'
  });
}

function makeRoutingInputs({ basicWindSpeedKph = 240, enclosureClassification = 'enclosed', riMode = 'none', slopeDeg = 25 } = {}) {
  const context = makeContext({ basicWindSpeedKph, enclosureClassification, slopeDeg });
  const spanM = 4;
  const slopeLengthM = 4 / Math.cos(slopeDeg * Math.PI / 180);
  const bands = [
    { label: 'P1', stationM: 0.5, startM: 0, endM: 1 },
    { label: 'P2', stationM: 2.7, startM: 1, endM: slopeLengthM }
  ];
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context,
    ridgeParallelPlanDimension: 'plan-length',
    ridgeDirectionSourceReference: 'Roof plan confirms ridge parallel to plan length',
    symmetricGableConfirmed: true,
    symmetricGableSourceReference: 'Roof section confirms symmetric gable',
    roofPlane: 'slope-a',
    roofBayStartAlongRidgeM: 0.4,
    roofBaySpanM: spanM,
    roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: bands,
    edgeDimensionHeightType: 'mean-roof-height',
    edgeDimensionHeightM: context.roofGeometry.meanRoofHeightM,
    edgeDimensionHeightSourceReference: 'Accepted mean-roof-height record'
  });
  const base = resolveBaseInternalPressureCoefficient({ windPressureContextAcceptance: context });
  let ri = null;
  if (enclosureClassification === 'partially-enclosed') {
    ri = resolveLargeVolumeInternalPressureReduction({
      baseInternalPressureCoefficient: base,
      containsSingleUnpartitionedLargeVolume: true,
      applicabilitySourceReference: 'Engineer large-volume applicability record',
      totalEnvelopeOpeningAreaM2: 1,
      openingAreaSourceReference: 'Project opening-area schedule',
      unpartitionedInternalVolumeM3: 6950,
      internalVolumeSourceReference: 'Project volume takeoff',
      applicationChoice: riMode === 'equation' ? 'equation-reduction' : 'conservative-ri-1'
    });
  }

  const records = bands.map((band) => {
    const area = resolveRoofPurlinEffectiveWindArea({
      windPressureContextAcceptance: context,
      purlinSpanM: spanM,
      actualTributaryWidthM: band.endM - band.startM,
      purlinGeometrySourceReference: `${band.label} physical Roof Bay geometry`,
      effectiveWidthSelection: 'actual-tributary-width',
      effectiveWidthSelectionSourceReference: 'Engineer-selected NSCP C&C effective-area rule path'
    });
    const gcp = resolveWindRoofExternalGcp({
      windRoofZoneGeometry: zones,
      roofPurlinEffectiveWindArea: area,
      targetPurlinBandLabel: band.label,
      codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B/2C project check',
      curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide Table G2-3/G2-4 equation cross-check'
    });
    const external = resolveWindRoofExternalPressureTerm({
      windRoofExternalGcp: gcp,
      equationSourceReference: 'NSCP 2015 Part 1 C&C external pressure equation',
      signConventionSourceReference: 'NSCP roof C&C figure sign convention'
    });
    return resolveWindRoofNetPressure({
      windRoofExternalPressureTerm: external,
      baseInternalPressureCoefficient: base,
      largeVolumeInternalPressureReduction: ri,
      netPressureEquationSourceReference: 'NSCP 2015 Part 1 roof C&C equation qh[(GCp)-(GCpi)]',
      minimumPressureSourceReference: 'NSCP 2015 Components & Cladding minimum 0.77 kPa in either direction',
      signConventionSourceReference: 'NSCP roof C&C figure sign convention'
    });
  });
  return { context, zones, records, spanM, slopeLengthM };
}

function route(options = {}, designDirection = 'away-from-surface') {
  const inputs = makeRoutingInputs(options);
  const record = resolveWindRoofBayCodePressureRouting({
    windRoofNetPressureRecords: inputs.records,
    designDirection,
    routingMethodSourceReference: 'Classical simply-supported beam statics using exact physical zone-piece rectangles and resultants'
  });
  return { ...inputs, record };
}

function purlin(record, label) {
  return record.purlins.find((item) => item.label === label);
}

test('away-from-surface benchmark routes actual gable-end pieces and produces asymmetric rafter reactions with exact conservation', () => {
  const { record } = route();
  const p1 = purlin(record, 'P1');
  const p2 = purlin(record, 'P2');

  assert.equal(record.designDirection, 'away-from-surface');
  assert.equal(p1.pieceLoads.length, 4);
  assert.equal(p2.pieceLoads.length, 2);
  assert.ok(Math.abs(p1.routed.normalForceKN - (-15.021230835055837)) < 1e-12);
  assert.ok(Math.abs(p1.routed.leftRafterReactionKN - (-7.922747249721724)) < 1e-12);
  assert.ok(Math.abs(p1.routed.rightRafterReactionKN - (-7.0984835853341135)) < 1e-12);
  assert.ok(Math.abs(p2.routed.normalForceKN - (-31.74828012998456)) < 1e-12);
  assert.ok(Math.abs(p2.routed.leftRafterReactionKN - (-16.548405723092678)) < 1e-12);
  assert.ok(Math.abs(p2.routed.rightRafterReactionKN - (-15.199874406891883)) < 1e-12);

  assert.ok(Math.abs(record.appliedWind.normalKN - (-46.769510965040396)) < 1e-12);
  assert.ok(Math.abs(record.rafters.a.normalKN - (-24.4711529728144)) < 1e-12);
  assert.ok(Math.abs(record.rafters.b.normalKN - (-22.298357992225995)) < 1e-12);
  assert.ok(Math.abs(record.appliedWind.appliedMomentAboutRafterAKNm - (-89.19343196890398)) < 1e-12);
  assert.ok(Math.abs(record.equilibrium.reactionMomentAboutRafterAKNm - (-89.19343196890398)) < 1e-12);
  assert.ok(Math.abs(record.rafters.a.normalKN) > Math.abs(record.rafters.b.normalKN));
  assert.equal(record.equilibrium.pass, true);
  assert.equal(record.equilibrium.allPurlinsPass, true);
});

test('toward-surface benchmark preserves purlin-specific coefficient areas while symmetric span pressure gives equal A/B reactions', () => {
  const { record } = route({}, 'toward-surface');
  const p1 = purlin(record, 'P1');
  const p2 = purlin(record, 'P2');
  assert.ok(Math.abs(p1.routed.normalForceKN - 4.995270800957784) < 1e-12);
  assert.ok(Math.abs(p2.routed.normalForceKN - 14.795315012031637) < 1e-12);
  assert.ok(Math.abs(record.appliedWind.normalKN - 19.79058581298942) < 1e-12);
  assert.ok(Math.abs(record.rafters.a.normalKN - 9.895292906494708) < 1e-12);
  assert.ok(Math.abs(record.rafters.b.normalKN - 9.895292906494712) < 1e-12);
  assert.equal(record.equilibrium.pass, true);
});

test('low-wind routing uses the net-design 0.77 kPa floor, not the smaller raw pressures', () => {
  const { record, slopeLengthM } = route({ basicWindSpeedKph: 60 }, 'away-from-surface');
  const expectedAreaM2 = 4 * slopeLengthM;
  const expectedForceKN = -0.77 * expectedAreaM2;
  assert.ok(Math.abs(record.appliedWind.areaM2 - expectedAreaM2) < 1e-12);
  assert.ok(Math.abs(record.appliedWind.normalKN - expectedForceKN) < 1e-12);
  assert.ok(Math.abs(record.rafters.a.normalKN - expectedForceKN / 2) < 1e-12);
  assert.ok(Math.abs(record.rafters.b.normalKN - expectedForceKN / 2) < 1e-12);
  assert.ok(record.purlins.flatMap((item) => item.pieceLoads).every((piece) => piece.minimumPressureApplied === true));
  assert.ok(record.purlins.flatMap((item) => item.pieceLoads).every((piece) => piece.designPressureKPa === -0.77));
  assert.equal(record.equilibrium.pass, true);
});

test('every routed piece retains governing raw case identity and exact pressure-area force trace', () => {
  const { record } = route();
  for (const member of record.purlins) {
    for (const piece of member.pieceLoads) {
      assert.ok(piece.governingRawCase.caseId);
      assert.ok(Number.isFinite(piece.governingRawCase.GCp));
      assert.ok(Number.isFinite(piece.governingRawCase.GCpi));
      assert.ok(Math.abs(piece.normalForceKN - piece.designPressureKPa * piece.actualAreaM2) < 1e-12);
      assert.ok(Math.abs(piece.leftRafterReactionKN + piece.rightRafterReactionKN - piece.normalForceKN) < 1e-12);
      assert.ok(Math.abs(piece.rightRafterReactionKN * record.geometry.spanM - piece.appliedMomentAboutRafterAKNm) < Math.abs(piece.leftRafterReactionKN * record.geometry.spanM) + 1000);
    }
  }
  assert.equal(record.implementation.governingCaseIdentityPreserved, true);
});

test('routing requires exactly one matching net-pressure record for every physical purlin band', () => {
  const { records } = makeRoutingInputs();
  assert.throws(() => resolveWindRoofBayCodePressureRouting({
    windRoofNetPressureRecords: [records[0]],
    designDirection: 'away-from-surface',
    routingMethodSourceReference: 'Classical statics'
  }), /exactly one net-pressure record for every physical purlin tributary band/);

  assert.throws(() => resolveWindRoofBayCodePressureRouting({
    windRoofNetPressureRecords: [records[0], records[0], records[1]],
    designDirection: 'away-from-surface',
    routingMethodSourceReference: 'Classical statics'
  }), /Duplicate net-pressure record/);
});

test('routing rejects a net-pressure record from different Roof Bay geometry', () => {
  const first = makeRoutingInputs();
  const second = makeRoutingInputs({ slopeDeg: 30 });
  assert.throws(() => resolveWindRoofBayCodePressureRouting({
    windRoofNetPressureRecords: [first.records[0], second.records[1]],
    designDirection: 'away-from-surface',
    routingMethodSourceReference: 'Classical statics'
  }), /exact same roof-zone geometry record/);
});

test('routing record round-trips deterministically and rejects force/reaction mutation', () => {
  const { record } = route();
  const first = serializeWindRoofBayCodePressureRouting(record);
  const second = serializeWindRoofBayCodePressureRouting(parseWindRoofBayCodePressureRouting(first));
  assert.equal(second, first);

  const forceMutation = structuredClone(record);
  forceMutation.purlins[0].pieceLoads[0].normalForceKN += 0.01;
  assert.throws(() => serializeWindRoofBayCodePressureRouting(forceMutation), /changed from its deterministic upstream/);

  const reactionMutation = structuredClone(record);
  reactionMutation.rafters.a.normalKN += 0.01;
  assert.throws(() => serializeWindRoofBayCodePressureRouting(reactionMutation), /changed from its deterministic upstream/);
});

test('routing does not silently promote load combinations, member response, capacities or live Roof Bay UI activation', () => {
  for (const flag of ['loadCombinationsImplemented','roofBayManualUniformUiReplaced','piecewisePurlinMemberResponseImplemented','roofSheetEffectiveWindAreaImplemented','fastenerEffectiveWindAreaImplemented','purlinCapacityPromotionImplemented','rafterCapacityImplemented','connectionCapacityImplemented']) {
    const { record } = route();
    record.implementation[flag] = true;
    assert.throws(() => serializeWindRoofBayCodePressureRouting(record), /changed from its deterministic upstream/);
  }
});
