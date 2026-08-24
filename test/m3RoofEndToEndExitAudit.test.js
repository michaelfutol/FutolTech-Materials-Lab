import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { resolveRoofBayCodeDerivedActivation } from '../src/interchange/roofBayCodeDerivedActivation.js';
import {
  ROOF_BAY_ACTIVATION_BENCHMARK,
  createRoofBayActivationBenchmark
} from '../scripts/fixtures/roofBayCodeDerivedActivationBenchmark.mjs';

const EPS = 1e-9;
const M2_TO_FT2 = 10.763910416709722;

function close(actual, expected, tolerance = 1e-9, label = 'value') {
  assert.ok(Number.isFinite(Number(actual)), `${label} must be finite; got ${actual}`);
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `${label}: expected ${actual} ≈ ${expected}`);
}

function projectFromBenchmark(benchmark) {
  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  return createRoofBayProject({
    projectId:'M3-EXIT-AUDIT',
    projectName:'M3 end-to-end exit audit benchmark',
    sectionId:b.sectionId,
    rafterSpacingM:b.spanM,
    roofSlopeLengthM:b.slopeLengthM,
    maxPurlinSpacingM:b.maxSpacingM,
    slopeDeg:b.slopeDeg,
    orientationDeg:0,
    elasticModulusMPa:200000,
    yieldStrengthMPa:250,
    densityKgM3:7850,
    mode:'combined',
    deadLoadKPa:b.deadLoadKPa,
    roofLiveLoadKPa:b.roofLiveLoadKPa,
    windPressureKPa:b.manualWindPressureKPa,
    windSense:'uplift',
    loadFactor:1,
    windProjectInputAcceptance:benchmark.windProjectInputAcceptance,
    windPressureContextAcceptance:benchmark.windPressureContextAcceptance
  });
}

function manualQhKPa() {
  const z = 8.82;
  const alpha = 9.5;
  const zgM = 274.32;
  const kz = 2.01 * Math.pow(z / zgM, 2 / alpha);
  const speedMps = 240 / 3.6;
  return 0.613 * kz * 1.0 * 0.85 * speedMps * speedMps / 1000;
}

function manual2BCoefficients(type, effectiveAreaM2) {
  const actualFt2 = effectiveAreaM2 * M2_TO_FT2;
  const usedFt2 = Math.max(10, Math.min(100, actualFt2));
  const logA = Math.log10(usedFt2);
  const low = actualFt2 <= 10 + EPS;
  const high = actualFt2 >= 100 - EPS;
  const positive = low ? 0.5 : high ? 0.3 : 0.7 - 0.2 * logA;
  let negative;
  if (type === 'field') negative = low ? -0.9 : high ? -0.8 : -1.0 + 0.1 * logA;
  else if (type === 'edge') negative = low ? -1.7 : high ? -1.2 : -2.2 + 0.5 * logA;
  else if (type === 'corner') negative = low ? -2.6 : high ? -2.0 : -3.2 + 0.6 * logA;
  else throw new Error(`unsupported audit zone type ${type}`);
  return { positive, negative };
}

function manualEnvelope(rawCases) {
  const positives = rawCases.filter((value) => value > 0);
  const negatives = rawCases.filter((value) => value < 0);
  const rawToward = positives.length ? Math.max(...positives) : 0;
  const rawAway = negatives.length ? Math.min(...negatives) : 0;
  return {
    toward: Math.max(rawToward, 0.77),
    away: Math.min(rawAway, -0.77),
    rawToward,
    rawAway
  };
}

function windCaseForDirection(companion, direction) {
  return companion.upstreamWindRoofLoadCaseCombination.windCases.find((item) => item.designDirection === direction);
}

test('M3 exit audit rejects a valid upstream assembly whose tributary boundaries changed while purlin stations stayed identical', () => {
  const baseline = createRoofBayActivationBenchmark();
  const shifted = createRoofBayActivationBenchmark({ firstBandBoundaryShiftM:0.05 });
  assert.deepEqual(shifted.stationsM, baseline.stationsM);
  assert.notDeepEqual(shifted.tributaryBands, baseline.tributaryBands);

  const project = projectFromBenchmark(baseline);
  assert.throws(() => resolveRoofBayCodeDerivedActivation({
    roofBayProject:project,
    windRoofStrengthCombinationAssembly:shifted.windRoofStrengthCombinationAssembly,
    selectedCombinationCaseId:shifted.selectedCombinationCaseId,
    engineerConfirmedPurlinSelfWeightMatchesProjectSection:true,
    purlinSelfWeightCompatibilitySourceReference:'Independent M3 exit audit self-weight compatibility check',
    activationSourceReference:'Independent M3 exit audit activation decision'
  }), /tributary-band boundaries do not match/);
});

test('M3 independent end-to-end benchmark reproduces qh, GCp, net pressure, physical routing, companion gravity, strength combination and activation', () => {
  const benchmark = createRoofBayActivationBenchmark({ rainResolved:true });
  const assembly = benchmark.windRoofStrengthCombinationAssembly;
  const companion = assembly.upstreamWindRoofCompanionActions;
  const qhManual = manualQhKPa();
  close(qhManual, 2.257467958862151, 1e-12, 'manual qh benchmark');

  for (const direction of ['toward-surface', 'away-from-surface']) {
    const windCase = windCaseForDirection(companion, direction);
    assert.ok(windCase, `missing ${direction} W case`);
    const route = windCase.upstreamWindRoofBayCodePressureRouting;
    assert.equal(route.equilibrium.pass, true);
    close(route.geometry.roofBayAreaM2, ROOF_BAY_ACTIVATION_BENCHMARK.spanM * ROOF_BAY_ACTIVATION_BENCHMARK.slopeLengthM, 1e-12, `${direction} roof area`);

    const netByLabel = new Map(route.upstreamWindRoofNetPressureRecords.map((record) => [record.target.purlinBandLabel, record]));
    for (const net of route.upstreamWindRoofNetPressureRecords) {
      close(net.internalPressureBasis.qhKPa, qhManual, 1e-12, `${net.target.purlinBandLabel} qh`);
      assert.deepEqual(net.internalPressureBasis.GCpiCases, [0.18, -0.18]);
      const gcp = net.upstreamWindRoofExternalPressureTerm.upstreamWindRoofExternalGcp;
      assert.equal(gcp.applicability.figureId, '207E.4-2B');
      for (const coefficientCase of gcp.coefficientCases) {
        const manual = manual2BCoefficients(coefficientCase.type, coefficientCase.componentCoefficientSelectionEffectiveAreaM2);
        close(coefficientCase.positiveGCp, manual.positive, 1e-12, `${net.target.purlinBandLabel}/${coefficientCase.type} +GCp`);
        close(coefficientCase.negativeGCp, manual.negative, 1e-12, `${net.target.purlinBandLabel}/${coefficientCase.type} -GCp`);
      }
      for (const zoneCase of net.zoneCases) {
        const manualRaw = zoneCase.rawCases.map((raw) => {
          const expected = qhManual * (raw.GCp - raw.GCpi);
          close(raw.rawNetPressureKPa, expected, 1e-12, `${net.target.purlinBandLabel}/${zoneCase.type}/${raw.caseId} raw pressure`);
          return expected;
        });
        const envelope = manualEnvelope(manualRaw);
        close(zoneCase.governingDesignEnvelope.towardSurface.rawGoverningPressureKPa, envelope.rawToward, 1e-12, `${zoneCase.type} raw toward`);
        close(zoneCase.governingDesignEnvelope.towardSurface.designPressureKPa, envelope.toward, 1e-12, `${zoneCase.type} design toward`);
        close(zoneCase.governingDesignEnvelope.awayFromSurface.rawGoverningPressureKPa, envelope.rawAway, 1e-12, `${zoneCase.type} raw away`);
        close(zoneCase.governingDesignEnvelope.awayFromSurface.designPressureKPa, envelope.away, 1e-12, `${zoneCase.type} design away`);
      }
    }

    let manualForce = 0;
    let manualLeft = 0;
    let manualRight = 0;
    let manualMoment = 0;
    for (const purlin of route.purlins) {
      const net = netByLabel.get(purlin.label);
      assert.ok(net, `missing net pressure for ${purlin.label}`);
      for (const piece of purlin.pieceLoads) {
        const zoneCase = net.zoneCases.find((item) => item.type === piece.type);
        const envelope = direction === 'toward-surface'
          ? zoneCase.governingDesignEnvelope.towardSurface
          : zoneCase.governingDesignEnvelope.awayFromSurface;
        close(piece.designPressureKPa, envelope.designPressureKPa, 1e-12, `${direction}/${purlin.label}/${piece.type} pressure`);
        const force = envelope.designPressureKPa * piece.actualAreaM2;
        const left = force * (route.geometry.spanM - piece.spanwiseCentroidM) / route.geometry.spanM;
        const right = force * piece.spanwiseCentroidM / route.geometry.spanM;
        const moment = force * piece.spanwiseCentroidM;
        close(piece.normalForceKN, force, 1e-12, `${direction}/${purlin.label}/${piece.type} force`);
        close(piece.leftRafterReactionKN, left, 1e-12, `${direction}/${purlin.label}/${piece.type} RA`);
        close(piece.rightRafterReactionKN, right, 1e-12, `${direction}/${purlin.label}/${piece.type} RB`);
        close(piece.appliedMomentAboutRafterAKNm, moment, 1e-12, `${direction}/${purlin.label}/${piece.type} moment`);
        manualForce += force;
        manualLeft += left;
        manualRight += right;
        manualMoment += moment;
      }
    }
    close(route.appliedWind.normalKN, manualForce, 1e-10, `${direction} routed total wind`);
    close(route.rafters.a.normalKN, manualLeft, 1e-10, `${direction} routed RA`);
    close(route.rafters.b.normalKN, manualRight, 1e-10, `${direction} routed RB`);
    close(route.appliedWind.appliedMomentAboutRafterAKNm, manualMoment, 1e-10, `${direction} routed moment`);
    close(windCase.total.normalForceKN, manualForce, 1e-10, `${direction} W identity total`);
  }

  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  const theta = b.slopeDeg * Math.PI / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const roofAreaM2 = b.spanM * b.slopeLengthM;
  const purlinCount = benchmark.stationsM.length;
  const deadVertical = b.deadLoadKPa * roofAreaM2 + purlinCount * 0.05 * b.spanM;
  const lrVertical = b.roofLiveLoadKPa * roofAreaM2;
  close(companion.actions.D.total.verticalForceKN, deadVertical, 1e-12, 'D vertical');
  close(companion.actions.D.total.normalForceKN, deadVertical * cosTheta, 1e-12, 'D normal');
  close(companion.actions.D.total.parallelForceKN, deadVertical * sinTheta, 1e-12, 'D downslope');
  close(companion.actions.Lr.total.verticalForceKN, lrVertical, 1e-12, 'Lr vertical');
  close(companion.actions.Lr.total.normalForceKN, lrVertical * cosTheta, 1e-12, 'Lr normal');
  close(companion.actions.Lr.total.parallelForceKN, lrVertical * sinTheta, 1e-12, 'Lr downslope');
  assert.equal(companion.actions.R.status, 'UNRESOLVED');
  assert.equal(assembly.lrOrRResolution.engineerConfirmedRainNotApplicable, true);

  const selected = assembly.cases.find((item) => item.combinationCaseId === benchmark.selectedCombinationCaseId);
  assert.ok(selected);
  assert.equal(selected.templateId, 'NSCP-203-4');
  assert.equal(selected.windDirection, 'away-from-surface');
  assert.equal(selected.selectedLrOrRAction, 'Lr');
  assert.equal(selected.equilibrium.pass, true);
  const awayWind = windCaseForDirection(companion, 'away-from-surface');
  const expectedNormal = 1.2 * companion.actions.D.total.normalForceKN + awayWind.total.normalForceKN + 0.5 * companion.actions.Lr.total.normalForceKN;
  const expectedParallel = 1.2 * companion.actions.D.total.parallelForceKN + 0.5 * companion.actions.Lr.total.parallelForceKN;
  const expectedRA = 1.2 * companion.actions.D.total.rafterANormalKN + awayWind.total.rafterAReactionKN + 0.5 * companion.actions.Lr.total.rafterANormalKN;
  const expectedRB = 1.2 * companion.actions.D.total.rafterBNormalKN + awayWind.total.rafterBReactionKN + 0.5 * companion.actions.Lr.total.rafterBNormalKN;
  close(selected.fullCombinationResult.roofNormalForceKN, expectedNormal, 1e-10, '203-4 away roof-normal combination');
  close(selected.fullCombinationResult.roofDownslopeForceKN, expectedParallel, 1e-10, '203-4 away downslope combination');
  close(selected.fullCombinationResult.rafterANormalReactionKN, expectedRA, 1e-10, '203-4 away RA');
  close(selected.fullCombinationResult.rafterBNormalReactionKN, expectedRB, 1e-10, '203-4 away RB');

  const project = projectFromBenchmark(benchmark);
  const activation = resolveRoofBayCodeDerivedActivation({
    roofBayProject:project,
    windRoofStrengthCombinationAssembly:assembly,
    selectedCombinationCaseId:benchmark.selectedCombinationCaseId,
    engineerConfirmedPurlinSelfWeightMatchesProjectSection:true,
    purlinSelfWeightCompatibilitySourceReference:'Independent M3 exit audit confirms benchmark self-weight basis matches active C-purlin section',
    activationSourceReference:'Independent M3 exit audit engineer-controlled activation record'
  });
  assert.equal(activation.compatibility.pressureContextExactMatch, true);
  assert.equal(activation.compatibility.purlinStationsMatch, true);
  assert.equal(activation.compatibility.purlinTributaryBandsMatch, true);
  assert.equal(activation.compatibility.deadLoadMatch, true);
  assert.equal(activation.compatibility.roofLiveLoadMatch, true);
  assert.deepEqual(activation.displayResult.fullCombinationResult, selected.fullCombinationResult);
  assert.equal(activation.displayResult.equilibrium.pass, true);
  assert.equal(activation.activeDemandModel, 'code-derived-strength-combination');
  assert.equal(activation.manualUniformFallbackRetained, true);
});
