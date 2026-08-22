import test from 'node:test';
import assert from 'node:assert/strict';
import { createWindProjectInputAcceptance } from '../src/interchange/windProjectInputAcceptance.js';
import { createWindPressureContextAcceptance } from '../src/interchange/windPressureContextAcceptance.js';
import { resolveRoofPurlinEffectiveWindArea } from '../src/solver/windRoofPurlinEffectiveArea.js';
import { resolveWindRoofZoneGeometry } from '../src/solver/windRoofZoneGeometry.js';
import { resolveWindRoofExternalGcp, serializeWindRoofExternalGcp } from '../src/solver/windRoofExternalGcp.js';

function fixture() {
  const wind = createWindProjectInputAcceptance({
    siteLocation: 'Sta. Magdalena, Sorsogon, Philippines', siteSourceReference: 'Project site record', occupancyCategory: 'III', occupancySourceReference: 'Project occupancy record',
    basicWindSpeedKph: 240, windSpeedSourceType: 'authorized-code-map', windSpeedSourceReference: 'Engineer transcription from authorized NSCP 2015 wind map', windSpeedSelectionMethod: 'direct-contour-read', windSpeedFigureId: '207A.5-1A',
    exposureCategory: 'C', exposureSourceReference: 'Engineer exposure record', topographicFactorKzt: 1, topographySourceReference: 'Engineer topography record', heightM: 8.82, heightSourceReference: 'Mean roof height record'
  });
  const context = createWindPressureContextAcceptance({
    windProjectInputAcceptance: wind, enclosureClassification: 'enclosed', enclosureClassificationSourceReference: 'Engineer enclosure record', openingsAssessmentSourceReference: 'Openings assessment',
    roofForm: 'gable', roofFormSourceReference: 'Roof plan', planLengthM: 12, planWidthM: 8, planDimensionSourceReference: 'Dimensioned plan', meanRoofHeightM: 8.82, meanRoofHeightSourceReference: 'Mean roof height record', roofSlopeDeg: 25, roofSlopeSourceReference: 'Roof section'
  });
  const slopeLengthM = 4 / Math.cos(25 * Math.PI / 180);
  const zones = resolveWindRoofZoneGeometry({
    windPressureContextAcceptance: context, ridgeParallelPlanDimension: 'plan-length', ridgeDirectionSourceReference: 'Roof plan ridge direction', symmetricGableConfirmed: true, symmetricGableSourceReference: 'Roof section symmetry check',
    roofPlane: 'slope-a', roofBayStartAlongRidgeM: 0.4, roofBaySpanM: 4, roofBayGeometrySourceReference: 'Accepted Roof Bay geometry',
    purlinTributaryBands: [{ label: 'P1', startM: 0, endM: 1 }, { label: 'P2', startM: 1, endM: slopeLengthM }], edgeDimensionHeightType: 'mean-roof-height', edgeDimensionHeightM: 8.82, edgeDimensionHeightSourceReference: 'Accepted mean roof height'
  });
  const area = resolveRoofPurlinEffectiveWindArea({ windPressureContextAcceptance: context, purlinSpanM: 4, actualTributaryWidthM: 1, purlinGeometrySourceReference: 'P1 geometry', effectiveWidthSelection: 'actual-tributary-width', effectiveWidthSelectionSourceReference: 'Engineer effective-area selection' });
  return resolveWindRoofExternalGcp({ windRoofZoneGeometry: zones, roofPurlinEffectiveWindArea: area, targetPurlinBandLabel: 'P1', codeFigureSourceReference: 'Authorized NSCP 2015 Figure 207E.4-2B project check', curveEquationSourceReference: 'ASCE 7-10 Wind Loads Guide Table G2-3 cross-check' });
}

test('external GCp provenance references cannot be erased', () => {
  const record = fixture(); record.sourceBasis.codeFigureSourceReference = '';
  assert.throws(() => serializeWindRoofExternalGcp(record), /codeFigureSourceReference must be a non-empty string/);
});

test('external GCp fixed rule text cannot be rewritten in serialized evidence', () => {
  const record = fixture(); record.sourceBasis.curveEquationRule = 'trust the chart';
  assert.throws(() => serializeWindRoofExternalGcp(record), /curve-equation rule text changed/);
});

test('external GCp engineering boundary cannot be promoted or removed', () => {
  const record = fixture(); record.boundary = 'Final roof pressure is ready.';
  assert.throws(() => serializeWindRoofExternalGcp(record), /engineering boundary changed/);
});
