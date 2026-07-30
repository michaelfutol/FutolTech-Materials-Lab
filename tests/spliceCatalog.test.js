import test from 'node:test';
import assert from 'node:assert/strict';

import { SPLICE_CATALOG, getSpliceCatalogItem, spliceCatalogForFamily } from '../src/data/spliceCatalog.js';

const EXPECTED_IDS = [
  'wood-double-scab',
  'wood-steel-side-plates',
  'wood-half-lap',
  'wood-scarf',
  'steel-butt-weld',
  'steel-sleeve',
  'steel-cover-plates'
];

test('visual splice catalog covers every currently selectable splice type', () => {
  assert.deepEqual(SPLICE_CATALOG.map((item) => item.id), EXPECTED_IDS);
  assert.equal(spliceCatalogForFamily('wood').length, 4);
  assert.equal(spliceCatalogForFamily('steel').length, 3);
});

test('every visual splice card has accessible SVG and engineering guidance', () => {
  for (const item of SPLICE_CATALOG) {
    assert.match(item.svg, /<svg[^>]+role="img"/);
    assert.match(item.svg, /aria-label=/);
    assert.ok(item.description.length > 20);
    assert.ok(item.caution.length > 20);
    assert.ok(item.tags.length >= 3);
    assert.equal(getSpliceCatalogItem(item.id), item);
  }
});
