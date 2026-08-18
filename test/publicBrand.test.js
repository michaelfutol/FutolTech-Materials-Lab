import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const PUBLIC_PAGES = [
  'index.html',
  'compare.html',
  'library.html',
  'recommend.html',
  'bamboo.html',
  'splice.html',
  'connections.html',
  'assembly.html',
  'calibration.html',
  'frame.html',
  'yield.html',
  'shoring.html'
];

const pages = await Promise.all(PUBLIC_PAGES.map(async (path) => ({
  path,
  html: await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
})));

const brandModule = await readFile(new URL('../src/publicBrand.js', import.meta.url), 'utf8');

test('all public pages use FutolTech Structural Lab and load the shared brand guard', () => {
  for (const { path, html } of pages) {
    assert.match(html, /FutolTech Structural Lab/, `${path} must expose the public product name`);
    assert.match(html, /publicBrand\.js\?v=20260818-sl1/, `${path} must load the shared brand guard`);
    assert.doesNotMatch(html, /FutolNative Structures|Native Structures/, `${path} must not expose the retired public name`);
  }
});

test('the shared brand module preserves company identity, dynamic print furniture, and lab navigation', () => {
  assert.match(brandModule, /PUBLIC_PRODUCT_NAME = 'FutolTech Structural Lab'/);
  assert.match(brandModule, /PUBLIC_PRODUCT_SUBTITLE = 'Virtual Materials, Members & Connection Testing'/);
  assert.match(brandModule, /COMPANY_NAME = 'FUTOLTECH ENGINEERING AND PROJECT SYSTEMS'/);
  assert.match(brandModule, /MutationObserver/);
  assert.match(brandModule, /applyPrintBrand/);
  assert.match(brandModule, /ensureStructuralLabNav/);
  assert.match(brandModule, /connections\.html/);
  assert.match(brandModule, /assembly\.html/);
  assert.match(brandModule, /calibration\.html/);
  assert.match(brandModule, /frame\.html/);
  assert.match(brandModule, /data-structural-lab-connections/);
  assert.match(brandModule, /data-structural-lab-assembly/);
  assert.match(brandModule, /data-structural-lab-calibration/);
  assert.match(brandModule, /data-structural-lab-frame/);
});
