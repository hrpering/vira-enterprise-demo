import type { JsonObject, JsonValue } from "@vira-enterprise-genui/protocol";
import {
  DEFAULT_MOCK_RUNTIME_INPUT,
  searchFlights,
} from "./index.js";
import type { MockAirlineRuntimeInput, MockFlightOffer } from "./index.js";

export interface MockStudioFlightOffer extends JsonObject {
  readonly id: string;
  readonly carrier: string;
  readonly "flight-number": string;
  readonly route: string;
  readonly schedule: string;
  readonly "duration-label": string;
  readonly price: number;
  readonly currency: string;
  readonly "remaining-seats": number;
  readonly "remaining-seats-label": string;
}

function toStudioOffer(offer: MockFlightOffer): MockStudioFlightOffer {
  return Object.freeze({
    id: offer.id,
    carrier: offer.carrier,
    "flight-number": offer.flightNumber,
    route: `${offer.origin} → ${offer.destination}`,
    schedule: `${offer.departure} → ${offer.arrival}`,
    "duration-label": offer.duration,
    price: offer.price,
    currency: offer.currency,
    "remaining-seats": offer.remainingSeats,
    "remaining-seats-label": `${offer.remainingSeats} seats left`,
  });
}

export function createMockAirlineStudioCollectionData(
  input: MockAirlineRuntimeInput = DEFAULT_MOCK_RUNTIME_INPUT,
): Readonly<Record<string, JsonValue>> {
  const result = searchFlights(input);
  const offers = Object.freeze(result.offers.map(toStudioOffer));
  return Object.freeze({
    "results.offers": offers,
  });
}
