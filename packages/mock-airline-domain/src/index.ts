export const MOCK_AIRLINE_DATASET_VERSION = "2026-08-30.1" as const;

export interface MockAirport {
  readonly code: string;
  readonly city: string;
  readonly country: string;
  readonly countryCode: string;
}

export interface MockFlightSearchInput {
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly passengers: number;
}

export interface MockFlightOffer {
  readonly id: string;
  readonly carrier: string;
  readonly flightNumber: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure: string;
  readonly arrival: string;
  readonly duration: string;
  readonly price: number;
  readonly currency: string;
  readonly remainingSeats: number;
}

interface MockRouteFlight {
  readonly flightNumber: string;
  readonly departure: string;
  readonly arrival: string;
  readonly baseFare: number;
  readonly remainingSeats: number;
}

interface MockRoute {
  readonly origin: string;
  readonly destination: string;
  readonly duration: string;
  readonly currency: string;
  readonly flights: readonly MockRouteFlight[];
}

export interface FareOption {
  readonly id: "light" | "smart" | "flex";
  readonly name: string;
  readonly perPassengerExtra: number;
  readonly badge?: string;
  readonly includes: readonly string[];
  readonly changePolicy: string;
}

export interface SeatOption {
  readonly id: string;
  readonly row: number;
  readonly letter: "A" | "B" | "C" | "D" | "E" | "F";
  readonly zone: "front" | "extra-legroom" | "standard";
  readonly fee: number;
  readonly occupied?: boolean;
}

export interface BaggageOption {
  readonly id: "none" | "15kg" | "20kg" | "25kg";
  readonly label: string;
  readonly kilograms: number;
  readonly feePerPassenger: number;
}

export interface InsuranceOption {
  readonly id: "none" | "travel" | "flex-plus";
  readonly name: string;
  readonly feePerPassenger: number;
  readonly copy: string;
}

export interface ExtraOption {
  readonly id: "priority" | "fast-track" | "meal" | "sms";
  readonly name: string;
  readonly feePerPassenger: number;
  readonly copy: string;
}

export type MockFareId = FareOption["id"];

export interface MockAirlineRuntimeInput extends MockFlightSearchInput {
  readonly fare: MockFareId;
}

export const MOCK_AIRPORTS: readonly MockAirport[] = Object.freeze([
  Object.freeze({ code: "SAW", city: "Istanbul", country: "Türkiye", countryCode: "TR" }),
  Object.freeze({ code: "BER", city: "Berlin", country: "Germany", countryCode: "DE" }),
  Object.freeze({ code: "FCO", city: "Rome", country: "Italy", countryCode: "IT" }),
  Object.freeze({ code: "STN", city: "London", country: "United Kingdom", countryCode: "GB" }),
  Object.freeze({ code: "ORY", city: "Paris", country: "France", countryCode: "FR" }),
  Object.freeze({ code: "AMS", city: "Amsterdam", country: "Netherlands", countryCode: "NL" }),
  Object.freeze({ code: "AYT", city: "Antalya", country: "Türkiye", countryCode: "TR" }),
  Object.freeze({ code: "ADB", city: "Izmir", country: "Türkiye", countryCode: "TR" }),
]);

const AIRPORT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  ISTANBUL: "SAW",
  "SABIHA GOKCEN": "SAW",
  "SABIHA GÖKÇEN": "SAW",
  BERLIN: "BER",
  ROME: "FCO",
  ROMA: "FCO",
  LONDON: "STN",
  PARIS: "ORY",
  AMSTERDAM: "AMS",
  ANTALYA: "AYT",
  IZMIR: "ADB",
  İZMIR: "ADB",
  IZMİR: "ADB",
});

function freezeRoute(route: MockRoute): MockRoute {
  return Object.freeze({
    ...route,
    flights: Object.freeze(route.flights.map((flight) => Object.freeze(flight))),
  });
}

const MOCK_ROUTES: readonly MockRoute[] = Object.freeze([
  freezeRoute({
    origin: "SAW", destination: "BER", duration: "3h 05m", currency: "EUR",
    flights: [
      { flightNumber: "VX 979", departure: "09:10", arrival: "11:15", baseFare: 69, remainingSeats: 7 },
      { flightNumber: "VX 977", departure: "12:35", arrival: "14:40", baseFare: 76, remainingSeats: 4 },
      { flightNumber: "VX 981", departure: "18:20", arrival: "20:25", baseFare: 83, remainingSeats: 11 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "FCO", duration: "2h 45m", currency: "EUR",
    flights: [
      { flightNumber: "VX 711", departure: "07:40", arrival: "09:25", baseFare: 62, remainingSeats: 9 },
      { flightNumber: "VX 713", departure: "14:10", arrival: "15:55", baseFare: 71, remainingSeats: 5 },
      { flightNumber: "VX 715", departure: "20:05", arrival: "21:50", baseFare: 79, remainingSeats: 13 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "STN", duration: "4h 05m", currency: "EUR",
    flights: [
      { flightNumber: "VX 117", departure: "08:15", arrival: "10:20", baseFare: 88, remainingSeats: 6 },
      { flightNumber: "VX 119", departure: "13:30", arrival: "15:35", baseFare: 96, remainingSeats: 10 },
      { flightNumber: "VX 121", departure: "19:00", arrival: "21:05", baseFare: 109, remainingSeats: 3 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "ORY", duration: "3h 45m", currency: "EUR",
    flights: [
      { flightNumber: "VX 541", departure: "06:55", arrival: "09:40", baseFare: 81, remainingSeats: 8 },
      { flightNumber: "VX 543", departure: "12:20", arrival: "15:05", baseFare: 90, remainingSeats: 12 },
      { flightNumber: "VX 545", departure: "17:45", arrival: "20:30", baseFare: 101, remainingSeats: 4 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "AMS", duration: "3h 35m", currency: "EUR",
    flights: [
      { flightNumber: "VX 631", departure: "09:35", arrival: "12:10", baseFare: 84, remainingSeats: 9 },
      { flightNumber: "VX 633", departure: "15:05", arrival: "17:40", baseFare: 93, remainingSeats: 6 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "AYT", duration: "1h 10m", currency: "EUR",
    flights: [
      { flightNumber: "VX 301", departure: "08:00", arrival: "09:10", baseFare: 31, remainingSeats: 15 },
      { flightNumber: "VX 303", departure: "13:25", arrival: "14:35", baseFare: 36, remainingSeats: 12 },
      { flightNumber: "VX 305", departure: "20:30", arrival: "21:40", baseFare: 42, remainingSeats: 18 },
    ],
  }),
  freezeRoute({
    origin: "SAW", destination: "ADB", duration: "1h 05m", currency: "EUR",
    flights: [
      { flightNumber: "VX 211", departure: "07:20", arrival: "08:25", baseFare: 29, remainingSeats: 14 },
      { flightNumber: "VX 213", departure: "16:10", arrival: "17:15", baseFare: 35, remainingSeats: 8 },
    ],
  }),
  freezeRoute({
    origin: "BER", destination: "FCO", duration: "2h 05m", currency: "EUR",
    flights: [
      { flightNumber: "VX 821", departure: "10:05", arrival: "12:10", baseFare: 58, remainingSeats: 9 },
      { flightNumber: "VX 823", departure: "18:25", arrival: "20:30", baseFare: 67, remainingSeats: 6 },
    ],
  }),
]);

function normalize(value: string): string {
  return value.trim().normalize("NFKD").replace(/\p{Diacritic}/gu, "").toUpperCase();
}

export function resolveAirportCode(value: string): string | undefined {
  const normalized = normalize(value);
  if (/^[A-Z]{3}$/.test(normalized) && MOCK_AIRPORTS.some((airport) => airport.code === normalized)) return normalized;
  return AIRPORT_ALIASES[normalized] ?? MOCK_AIRPORTS.find((airport) => normalize(airport.city) === normalized)?.code;
}

export function airportByCode(code: string): MockAirport | undefined {
  const normalized = code.trim().toUpperCase();
  return MOCK_AIRPORTS.find((airport) => airport.code === normalized);
}

function reverseClock(value: string): string {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number.parseInt(hoursText ?? "0", 10);
  const minutes = Number.parseInt(minutesText ?? "0", 10);
  const shifted = (hours * 60 + minutes + 35) % (24 * 60);
  return `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(shifted % 60).padStart(2, "0")}`;
}

function resolveRoute(origin: string, destination: string): MockRoute | undefined {
  const direct = MOCK_ROUTES.find((route) => route.origin === origin && route.destination === destination);
  if (direct) return direct;
  const reverse = MOCK_ROUTES.find((route) => route.origin === destination && route.destination === origin);
  if (!reverse) return undefined;
  return freezeRoute({
    origin,
    destination,
    duration: reverse.duration,
    currency: reverse.currency,
    flights: reverse.flights.map((flight, index) => ({
      flightNumber: `VX ${Number.parseInt(flight.flightNumber.replace(/\D/g, ""), 10) + 40 + index}`,
      departure: reverseClock(flight.departure),
      arrival: reverseClock(flight.arrival),
      baseFare: flight.baseFare + 4,
      remainingSeats: Math.max(2, flight.remainingSeats - 1),
    })),
  });
}

export function listMockDestinations(originValue: string): readonly MockAirport[] {
  const origin = resolveAirportCode(originValue);
  if (!origin) return [];
  const codes = new Set<string>();
  for (const route of MOCK_ROUTES) {
    if (route.origin === origin) codes.add(route.destination);
    if (route.destination === origin) codes.add(route.origin);
  }
  return Object.freeze([...codes].flatMap((code) => {
    const airport = airportByCode(code);
    return airport ? [airport] : [];
  }));
}

function safePassengers(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(8, Math.max(1, Math.round(value)));
}

function dateToken(value: string): string {
  return value.replaceAll("-", "").slice(-6) || "000000";
}

export function searchFlights(input: MockFlightSearchInput): {
  readonly version: typeof MOCK_AIRLINE_DATASET_VERSION;
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: string;
  readonly passengers: number;
  readonly offers: readonly MockFlightOffer[];
} {
  const origin = resolveAirportCode(input.origin);
  const destination = resolveAirportCode(input.destination);
  const passengers = safePassengers(input.passengers);
  if (!origin || !destination || origin === destination) {
    return Object.freeze({
      version: MOCK_AIRLINE_DATASET_VERSION,
      origin: origin ?? input.origin.trim().toUpperCase(),
      destination: destination ?? input.destination.trim().toUpperCase(),
      departureDate: input.departureDate,
      passengers,
      offers: Object.freeze([]),
    });
  }
  const route = resolveRoute(origin, destination);
  if (!route) {
    return Object.freeze({
      version: MOCK_AIRLINE_DATASET_VERSION,
      origin,
      destination,
      departureDate: input.departureDate,
      passengers,
      offers: Object.freeze([]),
    });
  }
  const token = dateToken(input.departureDate);
  const offers = route.flights.map((flight, index): MockFlightOffer => Object.freeze({
    id: `${flight.flightNumber.replaceAll(" ", "-").toLowerCase()}-${token}-${index + 1}`,
    carrier: "Vira Demo Air",
    flightNumber: flight.flightNumber,
    origin,
    destination,
    departure: flight.departure,
    arrival: flight.arrival,
    duration: route.duration,
    price: flight.baseFare * passengers,
    currency: route.currency,
    remainingSeats: flight.remainingSeats,
  }));
  return Object.freeze({
    version: MOCK_AIRLINE_DATASET_VERSION,
    origin,
    destination,
    departureDate: input.departureDate,
    passengers,
    offers: Object.freeze(offers),
  });
}

export const FARE_OPTIONS: readonly FareOption[] = Object.freeze([
  Object.freeze({ id: "light", name: "Light", perPassengerExtra: 0, includes: Object.freeze(["Personal item", "Online check-in"]), changePolicy: "Changes available for a fee" }),
  Object.freeze({ id: "smart", name: "Smart", perPassengerExtra: 35, badge: "Best value", includes: Object.freeze(["Personal item", "Cabin bag", "20kg checked bag", "Standard seat"]), changePolicy: "Lower change fee" }),
  Object.freeze({ id: "flex", name: "Flex", perPassengerExtra: 70, badge: "Most flexible", includes: Object.freeze(["Personal item", "Cabin bag", "20kg checked bag", "Standard seat", "Priority boarding"]), changePolicy: "Flexible changes before departure" }),
]);

export const BAGGAGE_OPTIONS: readonly BaggageOption[] = Object.freeze([
  Object.freeze({ id: "none", label: "No checked bag", kilograms: 0, feePerPassenger: 0 }),
  Object.freeze({ id: "15kg", label: "15 kg", kilograms: 15, feePerPassenger: 18 }),
  Object.freeze({ id: "20kg", label: "20 kg", kilograms: 20, feePerPassenger: 25 }),
  Object.freeze({ id: "25kg", label: "25 kg", kilograms: 25, feePerPassenger: 34 }),
]);

export const INSURANCE_OPTIONS: readonly InsuranceOption[] = Object.freeze([
  Object.freeze({ id: "none", name: "No insurance", feePerPassenger: 0, copy: "Continue without travel cover" }),
  Object.freeze({ id: "travel", name: "Travel Protect", feePerPassenger: 12, copy: "Trip interruption and travel assistance" }),
  Object.freeze({ id: "flex-plus", name: "Flex Protect", feePerPassenger: 22, copy: "Broader cancellation flexibility and assistance" }),
]);

export const EXTRA_OPTIONS: readonly ExtraOption[] = Object.freeze([
  Object.freeze({ id: "priority", name: "Priority boarding", feePerPassenger: 9, copy: "Board earlier and settle in sooner" }),
  Object.freeze({ id: "fast-track", name: "Fast track", feePerPassenger: 13, copy: "Priority security lane where available" }),
  Object.freeze({ id: "meal", name: "Meal", feePerPassenger: 11, copy: "Pre-order a meal for the flight" }),
  Object.freeze({ id: "sms", name: "SMS updates", feePerPassenger: 3, copy: "Flight status notifications by SMS" }),
]);

const occupied = new Set(["4B", "5E", "8A", "9D", "11C", "12F"]);
const seatRows = [4, 5, 6, 8, 9, 10, 11, 12] as const;
const letters = ["A", "B", "C", "D", "E", "F"] as const;

export const SEAT_OPTIONS: readonly SeatOption[] = Object.freeze(
  seatRows.flatMap((row): readonly SeatOption[] => letters.map((letter): SeatOption => {
    const id = `${row}${letter}`;
    const zone: SeatOption["zone"] = row <= 5 ? "front" : row === 6 ? "extra-legroom" : "standard";
    const fee = zone === "front" ? 18 : zone === "extra-legroom" ? 24 : 7;
    return Object.freeze({ id, row, letter, zone, fee, ...(occupied.has(id) ? { occupied: true } : {}) });
  })),
);

export function fareById(value: unknown): FareOption | undefined {
  return typeof value === "string" ? FARE_OPTIONS.find((option) => option.id === value) : undefined;
}

export function baggageById(value: unknown): BaggageOption | undefined {
  return typeof value === "string" ? BAGGAGE_OPTIONS.find((option) => option.id === value) : undefined;
}

export function insuranceById(value: unknown): InsuranceOption | undefined {
  return typeof value === "string" ? INSURANCE_OPTIONS.find((option) => option.id === value) : undefined;
}

export function extraById(value: unknown): ExtraOption | undefined {
  return typeof value === "string" ? EXTRA_OPTIONS.find((option) => option.id === value) : undefined;
}

export function seatById(value: unknown): SeatOption | undefined {
  return typeof value === "string" ? SEAT_OPTIONS.find((option) => option.id === value) : undefined;
}

export function baggageFeeForFare(option: BaggageOption | undefined, fareId: string | undefined): number {
  if (!option) return 0;
  if ((fareId === "smart" || fareId === "flex") && option.kilograms <= 20) return 0;
  if ((fareId === "smart" || fareId === "flex") && option.id === "25kg") return 9;
  return option.feePerPassenger;
}

export function seatFeeForFare(option: SeatOption, fareId: string | undefined): number {
  if ((fareId === "smart" || fareId === "flex") && option.zone === "standard") return 0;
  return option.fee;
}

export function extraFeeForFare(option: ExtraOption, fareId: string | undefined): number {
  if (fareId === "flex" && option.id === "priority") return 0;
  return option.feePerPassenger;
}

export function getSpecialAssistanceGuidance(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    summary: "Choose the assistance level that best matches the passenger's mobility needs.",
    deadline: "At booking or at least 48 hours before departure",
    types: Object.freeze([
      Object.freeze({ id: "WCHR", title: "Ramp assistance", copy: "Passenger can use stairs but needs help reaching the aircraft." }),
      Object.freeze({ id: "WCHS", title: "Aircraft-door assistance", copy: "Passenger cannot use stairs and needs assistance to the aircraft door." }),
      Object.freeze({ id: "WCHC", title: "Cabin-seat assistance", copy: "Passenger cannot walk inside the aircraft and needs assistance to the seat." }),
    ]),
    notes: Object.freeze([
      "Requests made with less lead time may not be fulfilled on time.",
      "Wheelchair or battery/device details may be required before travel.",
      "Operational capacity limits can apply on a flight.",
    ]),
  });
}

export function getMissedFlightGuidance(): Readonly<Record<string, unknown>> {
  return Object.freeze({
    summary: "Missing a flight can trigger different rules depending on timing and itinerary. Use the scenarios instead of reading one long policy paragraph.",
    scenarios: Object.freeze([
      Object.freeze({
        id: "before-departure",
        label: "Before departure",
        title: "You still have time to act",
        points: Object.freeze([
          "Check whether your fare allows a change before the scheduled departure.",
          "Fees and fare differences depend on the ticket conditions.",
          "Acting before the no-show window is usually better than waiting until after departure.",
        ]),
        nextAction: "Check the selected fare rules or contact airline support before departure.",
      }),
      Object.freeze({
        id: "no-show",
        label: "No-show",
        title: "The ticket may be treated as a no-show",
        points: Object.freeze([
          "Requests made after the no-show window may lose change eligibility.",
          "Refundability depends on the fare conditions attached to the booking.",
          "Airport taxes can follow different refund rules from the base fare.",
        ]),
        nextAction: "Check the live rules attached to the actual ticket before taking action.",
      }),
      Object.freeze({
        id: "connection",
        label: "Connection",
        title: "A later sector may still be available",
        points: Object.freeze([
          "Connection handling depends on whether the itinerary was ticketed together.",
          "A protected connection can follow different recovery rules from separate tickets.",
        ]),
        nextAction: "Check the actual itinerary status and connection conditions with the airline.",
      }),
    ]),
  });
}

export function getVisaGuidance(input: Readonly<{
  originCountry?: string;
  destinationCountry?: string;
  nationality?: string;
  passportIssuer?: string;
  residence?: string;
}> = {}): Readonly<Record<string, unknown>> {
  const originCountry = input.originCountry ?? "Türkiye";
  const destinationCountry = input.destinationCountry ?? "Germany";
  return Object.freeze({
    summary: `Entry requirements for travel from ${originCountry} to ${destinationCountry} depend on nationality, passport issuer and residence status.`,
    officialCheck: "Timatic or an authorized immigration/airline source",
  });
}

export const DEFAULT_MOCK_SEARCH_INPUT: MockFlightSearchInput = Object.freeze({
  origin: "SAW",
  destination: "BER",
  departureDate: "2026-09-15",
  passengers: 2,
});

export const DEFAULT_MOCK_RUNTIME_INPUT: MockAirlineRuntimeInput = Object.freeze({
  ...DEFAULT_MOCK_SEARCH_INPUT,
  fare: "smart",
});

function requireOffer(input: MockFlightSearchInput): MockFlightOffer {
  const result = searchFlights(input);
  const offer = result.offers[0];
  if (!offer) throw new Error(`Mock airline repository has no route for ${result.origin} → ${result.destination}`);
  return offer;
}

export function createMockAirlineRuntimeData(input: MockAirlineRuntimeInput = DEFAULT_MOCK_RUNTIME_INPUT): Readonly<Record<string, string | number>> {
  const result = searchFlights(input);
  const offer = requireOffer(input);
  const originAirport = airportByCode(result.origin);
  const destinationAirport = airportByCode(result.destination);
  const assistance = getSpecialAssistanceGuidance();
  const missedFlight = getMissedFlightGuidance();
  const visa = getVisaGuidance({
    ...(originAirport ? { originCountry: originAirport.country } : {}),
    ...(destinationAirport ? { destinationCountry: destinationAirport.country } : {}),
  });
  const scenarios = missedFlight.scenarios;
  const firstScenario = Array.isArray(scenarios) && scenarios[0] && typeof scenarios[0] === "object"
    ? scenarios[0] as Readonly<Record<string, unknown>>
    : undefined;
  return Object.freeze({
    "search.origin": result.origin,
    "search.destination": result.destination,
    "search.departure": result.departureDate,
    "search.passengers": result.passengers,
    "results.origin": result.origin,
    "results.destination": result.destination,
    "results.passengers": result.passengers,
    "results.base-price": offer.price,
    "results.currency": offer.currency,
    "booking.passengers": result.passengers,
    "booking.fare": input.fare,
    "review.origin": result.origin,
    "review.destination": result.destination,
    "review.passengers": result.passengers,
    "review.fare": input.fare,
    "review.base-price": offer.price,
    "review.currency": offer.currency,
    "guidance.special-assistance.summary": String(assistance.summary ?? ""),
    "guidance.special-assistance.deadline": String(assistance.deadline ?? ""),
    "guidance.missed-flight.summary": String(missedFlight.summary ?? ""),
    "guidance.missed-flight.next-action": String(firstScenario?.nextAction ?? "Check the current booking conditions."),
    "guidance.visa.origin-country": originAirport?.country ?? "Türkiye",
    "guidance.visa.destination-country": destinationAirport?.country ?? "Germany",
    "guidance.visa.summary": String(visa.summary ?? ""),
  });
}
