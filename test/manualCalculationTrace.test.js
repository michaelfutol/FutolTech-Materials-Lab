import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const trace = await readFile(new URL('../src/manualCalculationTrace.js', import.meta.url), 'utf8');
const printScript = await readFile(new URL('../src/comparePrintDocument.js', import.meta.url), 'utf8');
const manualCss = await readFile(new URL('../src/compareManualCalculation.css', import.meta.url), 'utf8');
const loader = await readFile(new URL('../src/printCompanyIdentity.js', import.meta.url), 'utf8');

test('manual calculation trace derives lipped-C gross properties and selected orientation axis', () => {
  assert.match(trace, /A<sub>g<\/sub> = t\(H \+ 2B \+ 2A\)/);
  assert.match(trace, /Σ\[I<sub>x,i<\/sub> \+ A<sub>i<\/sub>/);
  assert.match(trace, /major-axis gross screening/);
  assert.match(trace, /minor-axis gross screening/);
  assert.match(trace, /displayDegrees/);
});

test('manual calculation trace independently checks beam moment stress and deflection', () => {
  assert.match(trace, /M<sub>max<\/sub>=Pab\/L/);
  assert.match(trace, /σ = M\/Z/);
  assert.match(trace, /Pa²\(3L−a\)\/\(6EI\)/);
  assert.match(trace, /FEM =/);
  assert.match(trace, /difference =/);
  assert.match(trace, /Serviceability limit = L\//);
});

test('FT-CS-01 includes two dedicated calculation pages followed by a verification-notes page', () => {
  assert.match(printScript, /const PAGE_COUNT = 9/);
  assert.match(printScript, /createPage\(7, true\)/);
  assert.match(printScript, /createPage\(8, true\)/);
  assert.match(printScript, /createPage\(9, true\)/);
  assert.match(printScript, /buildManualCalculationTrace/);
  assert.match(printScript, /Calculation boundary & verification/);
  assert.match(loader, /compareManualCalculation\.css\?v=20260818-manual1/);
  assert.match(loader, /comparePrintDocument\.js\?v=20260818-manual1/);
  assert.match(manualCss, /\.ft-calc-grid/);
  assert.match(manualCss, /\.ft-calc-response-grid/);
});
