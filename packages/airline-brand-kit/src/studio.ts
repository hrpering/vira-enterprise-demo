import {
  DEFAULT_MOCK_RUNTIME_INPUT,
  createMockAirlineRuntimeData,
} from "@vira-enterprise-genui/mock-airline-domain";
import type { StudioExperienceDocument, StudioNode } from "@vira-enterprise-genui/studio-schema";
import { AIRLINE_STUDIO_COMPONENTS } from "./runtime.js";

export const AIRLINE_STUDIO_CATALOG_INPUT = {
  version: "1",
  id: "airline.brand.components",
  brandId: "airline.brand",
  components: [
    {
      ref: AIRLINE_STUDIO_COMPONENTS.flightSearch,
      label: "Flight search",
      category: "flight",
      kind: "input",
      props: [
        { key: "origin", type: "string", required: true, bindable: true },
        { key: "destination", type: "string", required: true, bindable: true },
        { key: "departure", type: "string", required: true, bindable: true },
        { key: "passengers", type: "number", required: true, bindable: true },
      ],
      slots: [],
      events: [{ name: "submit", label: "Search submitted" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.flightResults,
      label: "Flight results",
      category: "flight",
      kind: "content",
      props: [
        { key: "origin", type: "string", required: true, bindable: true },
        { key: "destination", type: "string", required: true, bindable: true },
        { key: "passengers", type: "number", required: true, bindable: true },
        { key: "base-price", type: "number", required: true, bindable: true },
        { key: "currency", type: "string", required: true, bindable: true },
      ],
      slots: [],
      events: [{ name: "select", label: "Flight selected" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.fareComparison,
      label: "Fare comparison",
      category: "fare",
      kind: "input",
      props: [
        { key: "base-price", type: "number", required: true, bindable: true },
        { key: "currency", type: "string", required: true, bindable: true },
        { key: "passengers", type: "number", required: true, bindable: true },
      ],
      slots: [],
      events: [{ name: "select", label: "Fare selected" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.travellerDetails,
      label: "Traveller details",
      category: "traveller",
      kind: "input",
      props: [{ key: "passengers", type: "number", required: true, bindable: true }],
      slots: [],
      events: [{ name: "submit", label: "Travellers submitted" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.seatMap,
      label: "Seat map",
      category: "seat",
      kind: "input",
      props: [
        { key: "passengers", type: "number", required: true, bindable: true },
        { key: "fare", type: "enum", required: true, bindable: true, options: ["light", "smart", "flex"] },
      ],
      slots: [],
      events: [{ name: "select", label: "Seat selected" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.baggageSelector,
      label: "Baggage selector",
      category: "baggage",
      kind: "input",
      props: [
        { key: "passengers", type: "number", required: true, bindable: true },
        { key: "fare", type: "enum", required: true, bindable: true, options: ["light", "smart", "flex"] },
      ],
      slots: [],
      events: [{ name: "select", label: "Baggage selected" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.extrasSelector,
      label: "Insurance & extras",
      category: "extras",
      kind: "input",
      props: [
        { key: "passengers", type: "number", required: true, bindable: true },
        { key: "fare", type: "enum", required: true, bindable: true, options: ["light", "smart", "flex"] },
      ],
      slots: [],
      events: [{ name: "submit", label: "Extras submitted" }],
    },
    {
      ref: AIRLINE_STUDIO_COMPONENTS.bookingReview,
      label: "Booking review",
      category: "summary",
      kind: "action",
      props: [
        { key: "origin", type: "string", required: true, bindable: true },
        { key: "destination", type: "string", required: true, bindable: true },
        { key: "passengers", type: "number", required: true, bindable: true },
        { key: "fare", type: "enum", required: true, bindable: true, options: ["light", "smart", "flex"] },
        { key: "base-price", type: "number", required: true, bindable: true },
        { key: "currency", type: "string", required: true, bindable: true },
      ],
      slots: [],
      events: [{ name: "continue", label: "Continue to checkout" }],
    },
  ],
} as const;

export const AIRLINE_STARTER_TEMPLATES = Object.freeze([
  { id: "flight-search", label: "Flight search", description: "Route, date and passenger search surface.", component: AIRLINE_STUDIO_COMPONENTS.flightSearch },
  { id: "flight-results", label: "Flight results", description: "Interactive flight offers with price comparison.", component: AIRLINE_STUDIO_COMPONENTS.flightResults },
  { id: "fare-comparison", label: "Fare comparison", description: "Light, Smart and Flex fare-family comparison.", component: AIRLINE_STUDIO_COMPONENTS.fareComparison },
  { id: "traveller-details", label: "Traveller details", description: "Passenger and booking-contact collection.", component: AIRLINE_STUDIO_COMPONENTS.travellerDetails },
  { id: "seat-selection", label: "Seat selection", description: "Interactive aircraft seat map with fare-aware prices.", component: AIRLINE_STUDIO_COMPONENTS.seatMap },
  { id: "baggage", label: "Baggage", description: "Per-traveller checked-baggage selection.", component: AIRLINE_STUDIO_COMPONENTS.baggageSelector },
  { id: "extras", label: "Insurance & extras", description: "Insurance, priority, fast track, meal and SMS extras.", component: AIRLINE_STUDIO_COMPONENTS.extrasSelector },
  { id: "booking-review", label: "Booking review", description: "Full trip review and secure-checkout handoff.", component: AIRLINE_STUDIO_COMPONENTS.bookingReview },
] as const);

export type AirlineStarterTemplateId = (typeof AIRLINE_STARTER_TEMPLATES)[number]["id"];

const defaultRuntimeData = createMockAirlineRuntimeData(DEFAULT_MOCK_RUNTIME_INPUT);

function defaultString(path: string): string {
  const value = defaultRuntimeData[path];
  if (typeof value !== "string") throw new Error(`Mock airline Studio default ${path} must be a string`);
  return value;
}

function defaultNumber(path: string): number {
  const value = defaultRuntimeData[path];
  if (typeof value !== "number") throw new Error(`Mock airline Studio default ${path} must be a number`);
  return value;
}

const defaultPropsByTemplate: Readonly<Record<AirlineStarterTemplateId, Readonly<Record<string, string | number>>>> = Object.freeze({
  "flight-search": {
    origin: defaultString("search.origin"),
    destination: defaultString("search.destination"),
    departure: defaultString("search.departure"),
    passengers: defaultNumber("search.passengers"),
  },
  "flight-results": {
    origin: defaultString("results.origin"),
    destination: defaultString("results.destination"),
    passengers: defaultNumber("results.passengers"),
    "base-price": defaultNumber("results.base-price"),
    currency: defaultString("results.currency"),
  },
  "fare-comparison": {
    passengers: defaultNumber("booking.passengers"),
    "base-price": defaultNumber("results.base-price"),
    currency: defaultString("results.currency"),
  },
  "traveller-details": { passengers: defaultNumber("booking.passengers") },
  "seat-selection": {
    passengers: defaultNumber("booking.passengers"),
    fare: defaultString("booking.fare"),
  },
  baggage: {
    passengers: defaultNumber("booking.passengers"),
    fare: defaultString("booking.fare"),
  },
  extras: {
    passengers: defaultNumber("booking.passengers"),
    fare: defaultString("booking.fare"),
  },
  "booking-review": {
    origin: defaultString("review.origin"),
    destination: defaultString("review.destination"),
    passengers: defaultNumber("review.passengers"),
    fare: defaultString("review.fare"),
    "base-price": defaultNumber("review.base-price"),
    currency: defaultString("review.currency"),
  },
});

const starterInteractionByTemplate: Readonly<Record<AirlineStarterTemplateId, Readonly<{ event: string; actionEvent: string }>>> = Object.freeze({
  "flight-search": { event: "submit", actionEvent: "flight.search.submit" },
  "flight-results": { event: "select", actionEvent: "flight.offer.select" },
  "fare-comparison": { event: "select", actionEvent: "flight.fare.select" },
  "traveller-details": { event: "submit", actionEvent: "flight.passenger.submit" },
  "seat-selection": { event: "select", actionEvent: "flight.seat.select" },
  baggage: { event: "select", actionEvent: "flight.baggage.select" },
  extras: { event: "submit", actionEvent: "flight.extras.submit" },
  "booking-review": { event: "continue", actionEvent: "flight.booking.handoff" },
});

export function airlineStarterProps(template: AirlineStarterTemplateId): Readonly<Record<string, string | number>> {
  return defaultPropsByTemplate[template];
}

export function createAirlineStarterDocument(experienceId: string, template: AirlineStarterTemplateId): StudioExperienceDocument {
  const definition = AIRLINE_STARTER_TEMPLATES.find((candidate) => candidate.id === template);
  if (!definition) throw new Error(`Unknown airline starter template: ${template}`);
  const node: StudioNode = {
    id: "root",
    component: definition.component,
    order: 0,
    props: { ...defaultPropsByTemplate[template] },
  };
  const interaction = starterInteractionByTemplate[template];
  return {
    version: "1",
    id: experienceId,
    recipeId: `studio.airline.${experienceId.replaceAll(".", "-")}`,
    entryView: "main",
    views: [{ id: "main", nodes: [node] }],
    bindings: [],
    interactions: [{
      viewId: "main",
      nodeId: "root",
      event: interaction.event,
      actionEvent: interaction.actionEvent,
      routes: [],
    }],
  };
}
