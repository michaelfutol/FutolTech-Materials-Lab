import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARISON_SIMULATION_SCHEMA,
  COMPARISON_SIMULATION_VERSION,
  currentComparisonEvent,
  comparisonSimulationFrame,
  comparisonSimulationPackage
} from '../src/solver/comparisonSimulation.js';

function beamRecord(overrides = {}) {
  return {
    comparisonId: 'member-a',
    comparisonLabel: 'Member A',
    materialId: 'steel-generic-250',
    basePresetId: 'demo-section',
    productCategory: 'rhs-shs',
    family: 'steel',
    orientation: 'as listed',
    pass: true,
    screeningOnly: false,
    deflectionRatio: 0.5,
    strengthRatio: 0.4,
    governingRatio: 0.5,
    referenceThresholdLoadKN: 5,
    physicalThresholdLoadKN: 5,
    result: {
      maxMomentKNm: 1.2,
      maxDeflectionMm: 4,
      maxBendingStressMPa: 100
    },
    ...overrides
  };
}

test('steel event chronology reaches serviceability then first yield without calling yield fracture', () => {
  const low = beamRecord({ deflectionRatio: 0.5, referenceThresholdLoadKN: 5, physicalThresholdLoadKN: 5 });
  const service = beamRecord({ deflectionRatio: 1.2, referenceThresholdLoadKN: 5, physicalThresholdLoadKN: 5 });
  const yieldState = beamRecord({ deflectionRatio: 5, referenceThresholdLoadKN: 5, physicalThresholdLoadKN: 5 });
  assert.equal(currentComparisonEvent(low, 0.5, 'beam').label, 'ELASTIC RESPONSE');
  assert.equal(currentComparisonEvent(service, 1.2, 'beam').label, 'SERVICEABILITY LIMIT');
  assert.equal(currentComparisonEvent(yieldState, 5, 'beam').label, 'FIRST YIELD');
  assert.doesNotMatch(currentComparisonEvent(yieldState, 5, 'beam').label, /fracture|rupture/i);
});

test('C-purlin terminal gross reference stays a screening event, not a cold-formed design pass', () => {
  const record = beamRecord({
    productCategory: 'c-purlin',
    screeningOnly: true,
    referenceThresholdLoadKN: 3,
    physicalThresholdLoadKN: 3
  });
  const event = currentComparisonEvent(record, 3, 'beam');
  assert.equal(event.label, 'GROSS FIRST-YIELD SCREEN');
  assert.equal(event.kind, 'physical-reference');
});

test('one comparison frame gives every member the exact same synchronized load and time', () => {
  const result = {
    records: [
      beamRecord(),
      beamRecord({ comparisonId: 'member-b', comparisonLabel: 'Member B', orientation: 'rotated 90°', result: { maxMomentKNm: 1.2, maxDeflectionMm: 12, maxBendingStressMPa: 150 } })
    ]
  };
  const frame = comparisonSimulationFrame({
    index: 25,
    progress: 0.5,
    timeS: 2,
    loadKN: 1,
    mode: 'beam',
    result,
    orientationDegreesById: { 'member-a': 0, 'member-b': 90 }
  });
  assert.equal(frame.loadKN, 1);
  assert.equal(frame.timeS, 2);
  assert.deepEqual(frame.members.map((m) => m.orientationDeg), [0, 90]);
  assert.deepEqual(frame.members.map((m) => m.response.maxDeflectionMm), [4, 12]);
});

test('versioned export duration is target divided by rate and contains no invented degradation law', () => {
  const frames = [
    comparisonSimulationFrame({ index: 0, progress: 0, timeS: 0, loadKN: 0, mode: 'beam', result: { records: [beamRecord(), beamRecord({ comparisonId: 'member-b' })] } }),
    comparisonSimulationFrame({ index: 1, progress: 1, timeS: 4, loadKN: 2, mode: 'beam', result: { records: [beamRecord(), beamRecord({ comparisonId: 'member-b' })] } })
  ];
  const pkg = comparisonSimulationPackage({
    loadingRateKNPerS: 0.5,
    targetLoadKN: 2,
    mode: 'beam',
    conditions: { lengthM: 3 },
    frames
  });
  assert.equal(pkg.schema, COMPARISON_SIMULATION_SCHEMA);
  assert.equal(pkg.version, COMPARISON_SIMULATION_VERSION);
  assert.equal(pkg.virtualDurationS, 4);
  assert.match(pkg.analysisBoundary, /not dynamic time integration/i);
  const json = JSON.stringify(pkg);
  assert.doesNotMatch(json, /residualStiffness|degradationLaw|fractureLaw/i);
  assert.equal(JSON.stringify(pkg), JSON.stringify(comparisonSimulationPackage({ loadingRateKNPerS: 0.5, targetLoadKN: 2, mode: 'beam', conditions: { lengthM: 3 }, frames })));
});
