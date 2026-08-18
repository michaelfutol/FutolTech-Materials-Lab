import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  builtUpTimberSectionBounds,
  effectiveAssemblyStiffness,
  evaluateBuiltUpTimberAssembly
} from '../src/solver/builtUpTimberAssembly.js';

const close = (actual, expected, rel = 1e-9) => assert.ok(Math.abs(actual - expected) <= rel * Math.max(1, Math.abs(expected)), `${actual} ≉ ${expected}`);

test('two stacked 50x100 plies have independent and full-composite stiffness bounds', () => {
  const s = builtUpTimberSectionBounds({ plyCount: 2, plyWidthMm: 50, plyDepthMm: 100, arrangement: 'stacked-depth' });
  close(s.independentIxMm4, 2 * 50 * 100 ** 3 / 12);
  close(s.fullCompositeIxMm4, 50 * 200 ** 3 / 12);
  assert.equal(s.fullCompositeIxMm4 / s.independentIxMm4, 4);
  assert.equal(s.compositeLeverageExists, true);
});

test('three stacked equal plies produce the expected n-squared stiffness leverage over independent plies', () => {
  const s = builtUpTimberSectionBounds({ plyCount: 3, plyWidthMm: 50, plyDepthMm: 100, arrangement: 'stacked-depth' });
  close(s.fullCompositeIxMm4 / s.independentIxMm4, 9);
});

test('side-by-side equal-depth plies have no major-axis EI gain from composite action in v1', () => {
  const s = builtUpTimberSectionBounds({ plyCount: 3, plyWidthMm: 50, plyDepthMm: 100, arrangement: 'side-by-side' });
  close(s.fullCompositeIxMm4, s.independentIxMm4);
  assert.equal(s.compositeLeverageExists, false);
});

test('eta interpolation hits exact independent and full-composite stiffness endpoints', () => {
  const independent = 100;
  const full = 400;
  assert.equal(effectiveAssemblyStiffness({ independentIxMm4: independent, fullCompositeIxMm4: full, eta: 0 }), 100);
  assert.equal(effectiveAssemblyStiffness({ independentIxMm4: independent, fullCompositeIxMm4: full, eta: 1 }), 400);
  assert.equal(effectiveAssemblyStiffness({ independentIxMm4: independent, fullCompositeIxMm4: full, eta: 0.5 }), 250);
});

test('effective deflection stays between independent and full-composite bounds for stacked plies', () => {
  const r = evaluateBuiltUpTimberAssembly({ plyCount: 2, plyWidthMm: 50, plyDepthMm: 100, arrangement: 'stacked-depth', eta: 0.4, elasticModulusMPa: 13100, loadKN: 1, spanM: 3 });
  assert.ok(r.independentDeflectionMm > r.effectiveDeflectionMm);
  assert.ok(r.effectiveDeflectionMm > r.fullCompositeDeflectionMm);
  assert.equal(r.status, 'SCREENING');
  assert.match(r.note, /not inferred from nail count/i);
});

test('Assembly Lab page exposes explicit eta evidence and no automatic nail-to-composite claim', async () => {
  const html = await readFile(new URL('../assembly.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/assemblyApp.js', import.meta.url), 'utf8');
  assert.match(html, /Composite-action degree η/);
  assert.match(html, /User-assumed sensitivity only/);
  assert.match(html, /does not automatically make stacked plies fully composite/i);
  assert.match(app, /I_eff = I_ind \+ η\(I_full − I_ind\)/);
  assert.doesNotMatch(app, /nail.*eta.*=/i);
});
