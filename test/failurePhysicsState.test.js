import test from 'node:test';
import assert from 'node:assert/strict';
import {
  currentFailurePhysicsState,
  failurePhysicsStateForEvent,
  failureVisualDefinition
} from '../src/solver/failurePhysicsState.js';

test('first yield remains an onset state and never becomes fracture', () => {
  const state = failurePhysicsStateForEvent('first-yield');
  assert.equal(state.phase, 'FIRST YIELD');
  assert.equal(state.mode, 'steel-first-yield');
  assert.match(state.boundary, /not fracture/i);
  assert.doesNotMatch(state.physicalMeaning, /fracture/i);
});

test('published timber rupture is explicitly a reference rather than a crack prediction', () => {
  const state = failurePhysicsStateForEvent('rupture-reference');
  assert.equal(state.mode, 'timber-rupture-reference');
  assert.match(state.boundary, /does not predict/i);
  const visual = failureVisualDefinition(state, { mode: 'beam' });
  assert.equal(visual.kind, 'beam-rupture-reference');
  assert.match(visual.disclaimer, /no crack path predicted/i);
});

test('current state follows the latest crossed stored solver event', () => {
  const events = [
    { id: 'serviceability', loadKN: 2 },
    { id: 'working-reference', loadKN: 4 },
    { id: 'rupture-reference', loadKN: 9 }
  ];
  assert.equal(currentFailurePhysicsState(events, 1).phase, 'ELASTIC RESPONSE');
  assert.equal(currentFailurePhysicsState(events, 3).phase, 'SERVICEABILITY LIMIT');
  assert.equal(currentFailurePhysicsState(events, 5).phase, 'WORKING / ALLOWABLE REFERENCE');
  assert.equal(currentFailurePhysicsState(events, 10).phase, 'PUBLISHED RUPTURE REFERENCE');
});

test('column mode stays straight until an instability event is actually crossed', () => {
  const elastic = failureVisualDefinition(failurePhysicsStateForEvent(null), { mode: 'column' });
  assert.equal(elastic.kind, 'column-elastic');
  assert.equal(elastic.path, 'M 160 250 L 160 70');
  assert.match(elastic.disclaimer, /no instability event crossed/i);

  const buckling = failureVisualDefinition(failurePhysicsStateForEvent('euler-reference'), { mode: 'column' });
  assert.equal(buckling.kind, 'column-mode');
  assert.notEqual(buckling.path, elastic.path);
  assert.match(buckling.disclaimer, /not a post-buckling prediction/i);
});

test('compression reference is not promoted to crushing or splitting', () => {
  const state = failurePhysicsStateForEvent('compression-reference');
  assert.match(state.boundary, /Crushing, splitting.*not inferred/i);
  const visual = failureVisualDefinition(state, { mode: 'column' });
  assert.equal(visual.kind, 'column-compression-reference');
  assert.match(visual.disclaimer, /no crushing or splitting inferred/i);
});
