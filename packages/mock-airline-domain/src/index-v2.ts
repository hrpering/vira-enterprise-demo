export {
  BAGGAGE_OPTIONS,
  DEFAULT_MOCK_RUNTIME_INPUT,
  DEFAULT_MOCK_SEARCH_INPUT,
  EXTRA_OPTIONS,
  FARE_OPTIONS,
  INSURANCE_OPTIONS,
  MOCK_AIRLINE_DATASET_VERSION,
  MOCK_AIRPORTS,
  SEAT_OPTIONS,
  airportByCode,
  baggageById,
  baggageFeeForFare,
  extraById,
  extraFeeForFare,
  fareById,
  getMissedFlightGuidance,
  getSpecialAssistanceGuidance,
  getVisaGuidance,
  insuranceById,
  listMockDestinations,
  resolveAirportCode,
  searchFlights,
  seatById,
  seatFeeForFare,
} from "./index.js";
export type {
  BaggageOption,
  ExtraOption,
  FareOption,
  InsuranceOption,
  MockAirlineRuntimeInput,
  MockAirport,
  MockFareId,
  MockFlightOffer,
  MockFlightSearchInput,
  SeatOption,
} from "./index.js";

import {
  DEFAULT_MOCK_RUNTIME_INPUT,
  createMockAirlineRuntimeData as createScalarRuntimeData,
} from "./index.js";
import type { MockAirlineRuntimeInput } from "./index.js";
import { createMockAirlineStudioCollectionData } from "./studio-collections.js";

/**
 * Backward-compatible runtime snapshot for Studio and demo hosts.
 * Existing scalar paths are preserved exactly; Canvas v2 collection paths are
 * additive and continue to come from the same deterministic repository.
 */
export function createMockAirlineRuntimeData(
  input: MockAirlineRuntimeInput = DEFAULT_MOCK_RUNTIME_INPUT,
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    ...createScalarRuntimeData(input),
    ...createMockAirlineStudioCollectionData(input),
  });
}
