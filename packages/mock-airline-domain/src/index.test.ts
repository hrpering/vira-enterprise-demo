import { describe, expect, it } from "vitest";
import {
  BAGGAGE_OPTIONS,
  createMockAirlineRuntimeData,
  getMissedFlightGuidance,
  listMockDestinations,
  searchFlights,
} from "./index.js";

describe("mock airline domain", () => {
  it("resolves city names and prices the total trip for the requested passenger count", () => {
    const result = searchFlights({
      origin: "Istanbul",
      destination: "Rome",
      departureDate: "2026-09-15",
      passengers: 3,
    });

    expect(result.origin).toBe("SAW");
    expect(result.destination).toBe("FCO");
    expect(result.passengers).toBe(3);
    expect(result.offers).toHaveLength(3);
    expect(result.offers[0]?.price).toBe(186);
    expect(result.offers[0]?.currency).toBe("EUR");
  });

  it("exposes the same scalar paths consumed by Studio domain bindings", () => {
    const data = createMockAirlineRuntimeData({
      origin: "SAW",
      destination: "BER",
      departureDate: "2026-10-02",
      passengers: 4,
      fare: "flex",
    });

    expect(data["search.origin"]).toBe("SAW");
    expect(data["search.destination"]).toBe("BER");
    expect(data["search.passengers"]).toBe(4);
    expect(data["booking.fare"]).toBe("flex");
    expect(data["results.base-price"]).toBe(276);
    expect(data["review.base-price"]).toBe(276);
  });

  it("owns the option and policy fixtures instead of leaving them in UI renderers", () => {
    expect(BAGGAGE_OPTIONS.some((option) => option.id === "20kg")).toBe(true);
    expect(Array.isArray(getMissedFlightGuidance().scenarios)).toBe(true);
    expect(listMockDestinations("SAW").some((airport) => airport.code === "FCO")).toBe(true);
  });

  it("returns an empty result for a route that the repository does not contain", () => {
    const result = searchFlights({
      origin: "AMS",
      destination: "FCO",
      departureDate: "2026-09-15",
      passengers: 2,
    });
    expect(result.offers).toEqual([]);
  });
});
