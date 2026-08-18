import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MATERIALS } from '../src/data/materials.js';
import { PH_ANGLE_SECTIONS } from '../src/data/phAngleCatalog.js';
import { SECTION_PRESETS } from '../src/data/sectionPresets.js';
import { SECTION_LIBRARY } from '../src/data/libraryCatalog.js';
import { calculateSectionProperties } from '../src/solver/sections.js';
import { compareCompressionCandidates, compareMemberCandidates } from '../src/solver/memberComparison.js';
import { recommendMemberSections } from '../src/solver/sectionRecommender.js';

const steel250 = MATERIALS.find((material) => material.id === 'steel-generic-250');
const angle = (id) => PH_ANGLE_SECTIONS.find((section) => section.id === id);

test('PH angle starter catalog keeps only explicit exact rows with unique ids and 6 m stock', () => {
  assert.equal(PH_ANGLE_SECTIONS.length, 38);
  assert.equal(new Set(PH_ANGLE_SECTIONS.map((section) => section.id)).size, PH_ANGLE_SECTIONS.length);
  assert.ok(PH_ANGLE_SECTIONS.every((section) => section.type === 'angle'));
  assert.ok(PH_ANGLE_SECTIONS.every((section) => section.productCategory === 'angle-bar'));
  assert.ok(PH_ANGLE_SECTIONS.every((section) => section.maxLengthM === 6));
  assert.ok(PH_ANGLE_SECTIONS.every((section) => section.sourceId === 'regan-angle-handbook-2026'));
});

test('known Regan/PNS and JIS angle rows preserve their transcribed kg/m values', () => {
  assert.equal(angle('angle-eq-50-50-5').publishedMassKgM, 3.77);
  assert.equal(angle('angle-eq-125-125-10').publishedMassKgM, 18.96);
  assert.equal(angle('angle-eq-250-250-35').publishedMassKgM, 128.03);
  assert.equal(angle('angle-uneq-75-50-5').publishedMassKgM, 4.67);
  assert.equal(angle('angle-uneq-100-75-10').publishedMassKgM, 13.00);
  assert.equal(angle('angle-uneq-150-90-12').publishedMassKgM, 21.60);
});

test('idealized sharp-corner angle geometry remains close to handbook mass without pretending to include rolled radii', () => {
  for (const id of ['angle-eq-50-50-5', 'angle-eq-125-125-10', 'angle-uneq-100-75-10']) {
    const record = angle(id);
    const properties = calculateSectionProperties(record);
    const idealizedMassKgM = properties.areaMm2 * 1e-6 * 7850;
    const relativeDifference = Math.abs(idealizedMassKgM - record.publishedMassKgM) / record.publishedMassKgM;
    assert.ok(relativeDifference < 0.05, `${id} idealized mass should stay within 5% of handbook mass`);
    assert.ok(properties.ixMm4 > 0);
    assert.ok(properties.iyMm4 > 0);
    assert.ok(properties.zxMm3 > 0);
    assert.ok(properties.zyMm3 > 0);
  }
});

test('angle catalog is selectable through the steel presets and visible in the Section Library', () => {
  for (const id of ['angle-eq-50-50-5', 'angle-uneq-100-75-10']) {
    assert.ok(SECTION_PRESETS.steel.some((preset) => preset.id === id));
    const library = SECTION_LIBRARY.find((record) => record.id === id);
    assert.ok(library);
    assert.equal(library.category, 'angle-bar');
    assert.equal(library.source?.id, 'regan-angle-handbook-2026');
    assert.ok(library.properties?.areaMm2 > 0);
  }
});

test('angle beam comparison remains SCREENING-only and supports 90-degree leg-axis rotation', () => {
  const preset = angle('angle-uneq-100-75-10');
  const result = compareMemberCandidates({
    selections: [
      { id: 'a', label: 'A', material: steel250, preset, orientation: 'listed' },
      { id: 'b', label: 'B', material: steel250, preset, orientation: 'rotated' }
    ],
    lengthM: 2,
    loadKN: 1,
    loadPositionM: 1,
    boundary: 'simply-supported',
    deflectionDivisor: 360
  });
  assert.equal(result.records.length, 2);
  assert.ok(result.records.every((record) => record.screeningOnly));
  assert.notEqual(result.records[0].properties.ixMm4, result.records[1].properties.ixMm4);
  assert.equal(result.records[1].section.displayRotationDeg, 90);
});

test('angle column compression is rejected until principal-axis and flexural-torsional buckling exist', () => {
  const preset = angle('angle-eq-50-50-5');
  assert.throws(() => compareCompressionCandidates({
    selections: [
      { id: 'a', label: 'A', material: steel250, preset, orientation: 'listed' },
      { id: 'b', label: 'B', material: steel250, preset, orientation: 'listed' }
    ],
    lengthM: 2.4,
    axialLoadKN: 10,
    eccentricityMm: 0,
    boundary: 'pinned-pinned',
    intermediateBracePoints: 0
  }), /Angle-bar column compression is intentionally unavailable/);
});

test('automatic design recommender does not promote incomplete angle screening as a design option', () => {
  const result = recommendMemberSections({
    materials: [steel250],
    presetsByFamily: { steel: SECTION_PRESETS.steel },
    familyFilter: 'steel',
    lengthM: 2,
    loadKN: 1,
    loadPositionM: 1,
    boundary: 'simply-supported',
    deflectionDivisor: 360,
    objective: 'mass'
  });
  assert.ok(!result.candidates.some((candidate) => candidate.productCategory === 'angle-bar'));
});

test('Direct Compare loads the dedicated angle screening UX', async () => {
  const [html, ui] = await Promise.all([
    readFile(new URL('../compare.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/angleCompareUi.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /angleCompareUi\.js\?v=20260818-angle2/);
  assert.match(html, /Build 2026-08-18\.SL2/);
  assert.match(ui, /SCREENING/);
  assert.match(ui, /Orientation 90°/);
  assert.match(ui, /angleFigureKey/);
});
