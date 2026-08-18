import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSectionProperties } from '../src/solver/sections.js';
import {
  PH_LIGHT_STEEL_FRAME_MARKET_RECORDS,
  PH_LIGHT_STEEL_FRAME_SOURCES
} from '../src/data/phLightSteelFrameCatalog.js';
import { SECTION_LIBRARY } from '../src/data/libraryCatalog.js';

test('50x50x5 sharp-corner equal angle has correct gross area centroid and leg-axis properties', () => {
  const p = calculateSectionProperties({ type: 'angle', widthMm: 50, depthMm: 50, thicknessMm: 5 });
  assert.equal(p.areaMm2, 475);
  assert.ok(Math.abs(p.centroidXmm - 14.3421052632) < 1e-8);
  assert.ok(Math.abs(p.centroidYmm - 14.3421052632) < 1e-8);
  assert.ok(Math.abs(p.ixMm4 - 112502.741228) < 1e-6);
  assert.ok(Math.abs(p.iyMm4 - 112502.741228) < 1e-6);
  assert.ok(Math.abs(p.zxMm3 - 3155.058426) < 1e-6);
  assert.match(p.propertyBasis, /sharp-corner gross L-section/);
});

test('unequal angle retains distinct x and y gross properties', () => {
  const p = calculateSectionProperties({ type: 'angle', widthMm: 75, depthMm: 50, thicknessMm: 5 });
  assert.ok(p.areaMm2 > 0);
  assert.notEqual(Math.round(p.ixMm4), Math.round(p.iyMm4));
  assert.notEqual(Math.round(p.zxMm3), Math.round(p.zyMm3));
});

test('angle geometry rejects impossible thickness', () => {
  assert.throws(() => calculateSectionProperties({ type: 'angle', widthMm: 50, depthMm: 50, thicknessMm: 50 }), /smaller than both leg dimensions/);
});

test('PH light-steel market records include angle, studs and double furring without invented section properties', () => {
  const categories = new Set(PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.map((record) => record.category));
  assert.ok(categories.has('angle-bar'));
  assert.ok(categories.has('metal-stud'));
  assert.ok(categories.has('double-furring'));
  assert.ok(PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.filter((record) => record.category === 'metal-stud').length >= 7);
  assert.ok(PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.every((record) => record.libraryOnly === true && record.activeInSolver === false));
  assert.ok(PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.every((record) => record.properties === null));
  assert.ok(PH_LIGHT_STEEL_FRAME_MARKET_RECORDS.every((record) => !Object.hasOwn(record, 'yieldStrengthMPa')));
});

test('current manufacturer/source boundaries are preserved in the market catalog', () => {
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.reganAngleBars.note, /20×20 to 250×250/);
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.ugcStuds.note, /0\.40–0\.80 mm/);
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.ugcStuds.note, /Tensile strength is not silently treated as yield strength/);
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.knaufDrywallStuds.note, /non-load-bearing/);
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.ugcDoubleFurring.note, /0\.30–0\.80 mm/);
  assert.match(PH_LIGHT_STEEL_FRAME_SOURCES.ugcDoubleFurring.note, /does not publish enough fold dimensions/);
});

test('Section Library exposes the new PH market records as library-only products', () => {
  for (const id of ['ph-angle-regan-market-range', 'ph-ugc-stud-30x50', 'ph-knauf-stud-64x33_5x0_5', 'ph-ugc-double-furring-range']) {
    const record = SECTION_LIBRARY.find((candidate) => candidate.id === id);
    assert.ok(record, `${id} should be visible in the Section Library`);
    assert.equal(record.properties, null);
    assert.equal(record.libraryOnly, true);
    assert.ok(record.source?.url);
  }
});
