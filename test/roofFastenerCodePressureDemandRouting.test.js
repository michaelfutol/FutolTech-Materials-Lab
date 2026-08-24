import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoofBayProject } from '../src/interchange/roofBayProject.js';
import { roofBayPurlinStations } from '../src/solver/roofBay.js';
import { createRoofSheetFastenerLayoutAcceptance } from '../src/interchange/roofSheetFastenerLayoutAcceptance.js';
import {
  resolveRoofFastenerCodePressureDemandRouting,
  validateRoofFastenerCodePressureDemandRouting,
  serializeRoofFastenerCodePressureDemandRouting,
  parseRoofFastenerCodePressureDemandRouting
} from '../src/solver/roofFastenerCodePressureDemandRouting.js';
import {
  createRoofBayActivationBenchmark,
  ROOF_BAY_ACTIVATION_BENCHMARK
} from '../scripts/fixtures/roofBayCodeDerivedActivationBenchmark.mjs';

const EPS = 1e-9;
function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(Number(actual) - Number(expected)) <= tolerance, `expected ${actual} ≈ ${expected}`);
}

function makeProject(overrides = {}) {
  const b = ROOF_BAY_ACTIVATION_BENCHMARK;
  return createRoofBayProject({
    projectId:'M4-FASTENER-DEMAND-001',
    projectName:'M4 fastener demand benchmark',
    sectionId:b.sectionId,
    rafterSpacingM:b.spanM,
    roofSlopeLengthM:b.slopeLengthM,
    maxPurlinSpacingM:b.maxSpacingM,
    slopeDeg:b.slopeDeg,
    orientationDeg:0,
    yieldStrengthMPa:250,
    mode:'combined',
    deadLoadKPa:b.deadLoadKPa,
    roofLiveLoadKPa:b.roofLiveLoadKPa,
    windPressureKPa:b.manualWindPressureKPa,
    windSense:'uplift',
    loadFactor:1,
    ...overrides
  });
}

function rowsFor(project, positionsByRow = null) {
  const stations = project.geometry.layoutMode === 'custom-stations'
    ? project.geometry.purlinStationsM
    : roofBayPurlinStations(project.geometry.roofSlopeLengthM, project.geometry.maxPurlinSpacingM).stationsM;
  return stations.map((_, index) => ({
    purlinLabel:`P${index + 1}`,
    fastenerStationsAlongSpanM:positionsByRow?.[index] ?? [0.15,0.75,1.35,1.95,2.55],
    rowSourceReference:`Fastener row P${index + 1}`
  }));
}

function makeLayout(project = makeProject(), rows = rowsFor(project)) {
  return createRoofSheetFastenerLayoutAcceptance({
    roofBayProject:project,
    fastenerSystemId:'TEK-ROOF-DEMAND-BENCHMARK',
    fastenerDescription:'Project roofing self-drilling screw; demand only',
    attachmentPosition:'crest',
    fastenerSpecificationSourceReference:'Project roofing screw schedule',
    layoutSourceReference:'Dimensioned roof fastening plan',
    areaShareRoutingAssumptionSourceReference:'Engineer-approved midpoint tributary-strip routing assumption',
    fastenerRows:rows
  });
}

function sourceRoutes() {
  const benchmark = createRoofBayActivationBenchmark({ rainResolved:true });
  return benchmark.windRoofStrengthCombinationAssembly
    .upstreamWindRoofCompanionActions
    .upstreamWindRoofLoadCaseCombination
    .upstreamWindRoofBayCodePressureRoutingRecords;
}

function resolve(layout = makeLayout(), routes = sourceRoutes()) {
  return resolveRoofFastenerCodePressureDemandRouting({
    roofSheetFastenerLayoutAcceptance:layout,
    windRoofBayCodePressureRoutingRecords:routes,
    pressureToFastenerRoutingSourceReference:'Verified M3 physical pressure pieces intersected with accepted M4 fastener tributary rectangles'
  });
}

function independentIntersection(left, right) {
  const x0 = Math.max(left.x0M, right.x0M);
  const x1 = Math.min(left.x1M, right.x1M);
  const y0 = Math.max(left.y0M, right.y0M);
  const y1 = Math.min(left.y1M, right.y1M);
  return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
}

test('routes both signed M3 directions to every explicit fastener with exact row and bay conservation', () => {
  const record = resolve();
  assert.equal(record.schemaVersion, 'futoltech.roof-fastener-code-pressure-demand-routing/1');
  assert.equal(record.status, 'FASTENER_CODE_PRESSURE_DEMAND_ROUTED_CAPACITY_UNRESOLVED');
  assert.deepEqual(record.directions.map((item) => item.designDirection), ['toward-surface','away-from-surface']);
  for (const direction of record.directions) {
    assert.equal(direction.rows.length, 6);
    assert.equal(direction.conservation.pass, true);
    close(direction.routed.areaM2, 12);
    close(direction.routed.normalForceKN, direction.sourceM3.normalForceKN);
    for (const row of direction.rows) {
      assert.equal(row.conservation.pass, true);
      for (const fastener of row.fasteners) {
        assert.equal(fastener.conservation.areaPass, true);
        assert.equal(fastener.demand.capacityStatus, 'UNRESOLVED');
        assert.equal(fastener.demand.utilization, null);
        close(fastener.demand.routedAreaM2, fastener.tributaryRectangle.areaM2);
      }
    }
  }
  assert.ok(record.directions[0].routed.normalForceKN > 0);
  assert.ok(record.directions[1].routed.normalForceKN < 0);
});

test('a fastener crossing pressure zones keeps every contribution and independently reproduces p times overlap area', () => {
  const routes = sourceRoutes();
  const layout = makeLayout();
  const record = resolve(layout, routes);
  const direction = record.directions.find((item) => item.designDirection === 'toward-surface');
  const multi = direction.rows.flatMap((row) => row.fasteners).find((fastener) => fastener.contributions.length > 1);
  assert.ok(multi, 'expected at least one fastener tributary rectangle to cross multiple M3 pressure pieces');
  const sourceRoute = routes.find((item) => item.designDirection === 'toward-surface');
  const sourcePurlin = sourceRoute.purlins.find((item) => item.label === multi.purlinLabel);
  let independentArea = 0;
  let independentForce = 0;
  for (const piece of sourcePurlin.pieceLoads) {
    const pieceRect = {
      x0M:piece.localSpanRangeM.x0M,
      x1M:piece.localSpanRangeM.x1M,
      y0M:piece.globalRectangle.y0M,
      y1M:piece.globalRectangle.y1M
    };
    const area = independentIntersection(multi.tributaryRectangle, pieceRect);
    independentArea += area;
    independentForce += area * piece.designPressureKPa;
  }
  close(multi.demand.routedAreaM2, independentArea);
  close(multi.demand.normalForceKN, independentForce);
  assert.equal(new Set(multi.contributions.map((item) => item.type)).size >= 2, true);
});

test('irregular screw spacing preserves supplied stations while conserving each M3 direction', () => {
  const project = makeProject();
  const patterns = [
    [0.05,0.42,1.1,2.2,2.92],
    [0.12,0.66,1.48,2.35],
    [0.2,0.95,1.7,2.8],
    [0.08,0.55,1.05,1.9,2.7],
    [0.18,0.9,2.1,2.88],
    [0.1,0.6,1.3,2.0,2.6]
  ];
  const layout = makeLayout(project, rowsFor(project, patterns));
  const record = resolve(layout);
  assert.deepEqual(record.directions[0].rows[1].fasteners.map((item) => item.xM), patterns[1]);
  for (const direction of record.directions) {
    assert.equal(direction.conservation.pass, true);
    close(direction.routed.areaM2, 12);
    close(direction.routed.normalForceKN, direction.sourceM3.normalForceKN);
  }
});

test('rejects incomplete direction sets and a valid fastener layout whose purlin geometry differs from the M3 route', () => {
  const routes = sourceRoutes();
  assert.throws(() => resolve(makeLayout(), [routes[0]]), /exactly the toward-surface and away-from-surface/);

  const differentProject = makeProject({ layoutMode:'custom-stations', purlinStationsM:[0.2,1.0,2.4,3.8] });
  const differentLayout = makeLayout(differentProject, rowsFor(differentProject));
  assert.throws(() => resolve(differentLayout, routes), /purlin-row count|does not match|no matching M3 pressure route/);
});

test('round-trips deterministically and rejects routed-force mutation or capacity promotion', () => {
  const record = resolve();
  const first = serializeRoofFastenerCodePressureDemandRouting(record);
  const parsed = parseRoofFastenerCodePressureDemandRouting(first);
  const second = serializeRoofFastenerCodePressureDemandRouting(parsed);
  assert.equal(second, first);
  assert.equal(validateRoofFastenerCodePressureDemandRouting(record), true);

  const changedDemand = structuredClone(record);
  changedDemand.directions[0].rows[0].fasteners[0].demand.normalForceKN += 0.01;
  assert.throws(() => validateRoofFastenerCodePressureDemandRouting(changedDemand), /deterministic upstream geometry\/pressure inputs/);

  const promoted = structuredClone(record);
  promoted.implementation.screwPullOutCapacityImplemented = true;
  assert.throws(() => validateRoofFastenerCodePressureDemandRouting(promoted), /improperly promoted/);

  const fakeCapacity = structuredClone(record);
  fakeCapacity.fastenerSystem.capacityStatus = 'AVAILABLE';
  assert.throws(() => validateRoofFastenerCodePressureDemandRouting(fakeCapacity), /UNRESOLVED/);
});

test('zone totals independently reconcile to the source M3 field edge corner totals in both directions', () => {
  const routes = sourceRoutes();
  const record = resolve(makeLayout(), routes);
  for (const result of record.directions) {
    const source = routes.find((item) => item.designDirection === result.designDirection);
    for (const zone of result.zoneTotals) {
      const expected = source.zoneTotals.find((item) => item.type === zone.type);
      assert.ok(expected);
      close(zone.routedAreaM2, expected.areaM2, EPS);
      close(zone.routedNormalForceKN, expected.normalForceKN, EPS);
      assert.equal(zone.pass, true);
    }
  }
});
