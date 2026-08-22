import { nscp2015BuildingVelocityPressure } from '../solver/windVelocityPressure.js';
import {
  validateWindProjectInputAcceptance,
  windProjectInputAcceptanceToVelocityPressureCase
} from './windProjectInputAcceptance.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function calculateAcceptedWindProjectVelocityPressure(record) {
  validateWindProjectInputAcceptance(record);
  const input = windProjectInputAcceptanceToVelocityPressureCase(record);
  const calculation = nscp2015BuildingVelocityPressure({
    heightM: input.heightM,
    exposureCategory: input.exposureCategory,
    basicWindSpeedKph: input.basicWindSpeedKph,
    topographicFactorKzt: input.topographicFactorKzt
  });

  return {
    status: 'VELOCITY_PRESSURE_AVAILABLE_FROM_ACCEPTED_PROJECT_INPUTS',
    adoptedCodeProfileId: record.adoptedCodeProfileId,
    inputAcceptanceSchema: record.schemaVersion,
    occupancyCategory: record.occupancy.category,
    requiredWindSpeedFigure: clone(record.occupancy.requiredWindSpeedFigure),
    windSpeedSelection: clone(record.basicWindSpeed),
    calculation,
    boundary: 'Velocity pressure is calculated only from the accepted project input record. This result is not a final roof pressure and is not routed into Roof Bay until pressure coefficients and roof zoning are independently implemented and verified.'
  };
}
