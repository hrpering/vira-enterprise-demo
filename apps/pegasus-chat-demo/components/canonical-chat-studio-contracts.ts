import { AIRLINE_STUDIO_COMPONENTS } from "@vira-enterprise-genui/airline-brand-kit";
import {
  AIRLINE_STUDIO_CATALOG_INPUT,
  createAirlineStarterDocument,
} from "@vira-enterprise-genui/airline-brand-kit/studio";
import type { StudioAuthoringDocumentInput } from "@vira-enterprise-genui/genui";
import type { JsonValue } from "@vira-enterprise-genui/protocol";
import type { ViraFlightExperienceResult } from "../lib/vira-chat-contract.js";

const STEPS = [
  "flight-search",
  "flight-results",
  "fare-comparison",
  "traveller-details",
  "seat-selection",
  "baggage",
  "extras",
  "booking-review",
] as const;

const assistantCommandEvent = Object.freeze({
  name: "assistant-command",
  label: "Assistant booking update",
  payload: [
    {
      key: "command",
      type: "enum",
      required: false,
      options: ["set-insurance", "add-extra"],
    },
    { key: "value", type: "string", required: false },
  ],
} as const);

function extendComponent(component: (typeof AIRLINE_STUDIO_CATALOG_INPUT.components)[number]) {
  const extraProps = component.ref === AIRLINE_STUDIO_COMPONENTS.flightResults
    ? [{ key: "departure", type: "string", required: false, bindable: true }] as const
    : component.ref === AIRLINE_STUDIO_COMPONENTS.extrasSelector
      ? [
          { key: "insurance-id", type: "string", required: false, bindable: true },
          { key: "selected-extras", type: "string", required: false, bindable: true },
        ] as const
      : component.ref === AIRLINE_STUDIO_COMPONENTS.bookingReview
        ? [
            { key: "flight-number", type: "string", required: false, bindable: true },
            { key: "schedule", type: "string", required: false, bindable: true },
            { key: "seat-summary", type: "string", required: false, bindable: true },
            { key: "baggage-summary", type: "string", required: false, bindable: true },
            { key: "insurance-label", type: "string", required: false, bindable: true },
            { key: "extras-summary", type: "string", required: false, bindable: true },
            { key: "total", type: "number", required: false, bindable: true },
          ] as const
        : [] as const;
  const events = component.ref === AIRLINE_STUDIO_COMPONENTS.extrasSelector
    || component.ref === AIRLINE_STUDIO_COMPONENTS.bookingReview
    ? Object.freeze([...component.events, assistantCommandEvent])
    : component.events;
  return Object.freeze({
    ...component,
    props: Object.freeze([...component.props, ...extraProps]),
    events,
  });
}

export const CANONICAL_CHAT_COMPONENT_CATALOG = Object.freeze({
  ...AIRLINE_STUDIO_CATALOG_INPUT,
  id: "airline.chat.studio.components",
  components: Object.freeze(AIRLINE_STUDIO_CATALOG_INPUT.components.map(extendComponent)),
});

export const CANONICAL_CHAT_ACTION_ADAPTER = Object.freeze({
  version: "1" as const,
  id: "airline.chat.studio.actions",
  mappings: Object.freeze([
    { event: "flight.search.submit", actionType: "travel.flight.search.submit" },
    { event: "flight.offer.select", actionType: "travel.flight.offer.select" },
    { event: "flight.fare.select", actionType: "travel.flight.fare.select" },
    { event: "flight.passenger.submit", actionType: "travel.flight.passenger.submit" },
    { event: "flight.seat.select", actionType: "travel.flight.seat.select" },
    { event: "flight.baggage.select", actionType: "travel.flight.baggage.select" },
    { event: "flight.extras.submit", actionType: "travel.flight.extras.submit" },
    { event: "flight.booking.handoff", actionType: "travel.flight.booking.handoff" },
    { event: "flight.assistant.command", actionType: "travel.flight.assistant.command" },
  ]),
});

export const CANONICAL_CHAT_BINDING_SOURCE_CATALOG = Object.freeze({
  version: "1" as const,
  id: "airline.chat.studio.data",
  sources: Object.freeze([
    { kind: "domain" as const, path: "results.origin", label: "Results origin", valueType: "string" as const },
    { kind: "domain" as const, path: "results.destination", label: "Results destination", valueType: "string" as const },
    { kind: "domain" as const, path: "results.departure", label: "Results departure", valueType: "string" as const },
    { kind: "domain" as const, path: "results.passengers", label: "Results passengers", valueType: "number" as const },
    { kind: "domain" as const, path: "results.base-price", label: "Results base price", valueType: "number" as const },
    { kind: "domain" as const, path: "results.currency", label: "Results currency", valueType: "string" as const },
    { kind: "domain" as const, path: "booking.passengers", label: "Booking passengers", valueType: "number" as const },
    { kind: "domain" as const, path: "booking.fare", label: "Booking fare", valueType: "enum" as const },
    { kind: "domain" as const, path: "extras.insurance-id", label: "Selected insurance", valueType: "string" as const },
    { kind: "domain" as const, path: "extras.selected", label: "Selected extras", valueType: "string" as const },
    { kind: "domain" as const, path: "review.origin", label: "Review origin", valueType: "string" as const },
    { kind: "domain" as const, path: "review.destination", label: "Review destination", valueType: "string" as const },
    { kind: "domain" as const, path: "review.passengers", label: "Review passengers", valueType: "number" as const },
    { kind: "domain" as const, path: "review.fare", label: "Review fare", valueType: "enum" as const },
    { kind: "domain" as const, path: "review.base-price", label: "Review base price", valueType: "number" as const },
    { kind: "domain" as const, path: "review.currency", label: "Review currency", valueType: "string" as const },
    { kind: "domain" as const, path: "review.flight-number", label: "Review flight number", valueType: "string" as const },
    { kind: "domain" as const, path: "review.schedule", label: "Review schedule", valueType: "string" as const },
    { kind: "domain" as const, path: "review.seat-summary", label: "Review seats", valueType: "string" as const },
    { kind: "domain" as const, path: "review.baggage-summary", label: "Review baggage", valueType: "string" as const },
    { kind: "domain" as const, path: "review.insurance-label", label: "Review insurance", valueType: "string" as const },
    { kind: "domain" as const, path: "review.extras-summary", label: "Review extras", valueType: "string" as const },
    { kind: "domain" as const, path: "review.total", label: "Review total", valueType: "number" as const },
  ]),
});

export const CANONICAL_CHAT_PERMISSION_POLICY = Object.freeze({
  version: "1" as const,
  rules: Object.freeze(CANONICAL_CHAT_ACTION_ADAPTER.mappings.map((mapping) => ({
    subject: "action" as const,
    id: mapping.actionType,
    effect: "allow" as const,
  }))),
});

type AuthoredView = StudioAuthoringDocumentInput["views"][number];
type AuthoredBinding = NonNullable<StudioAuthoringDocumentInput["bindings"]>[number];
type AuthoredInteraction = NonNullable<StudioAuthoringDocumentInput["interactions"]>[number];

const bindingsByStep: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  "flight-results": Object.freeze({
    origin: "results.origin",
    destination: "results.destination",
    departure: "results.departure",
    passengers: "results.passengers",
    "base-price": "results.base-price",
    currency: "results.currency",
  }),
  "fare-comparison": Object.freeze({
    "base-price": "results.base-price",
    currency: "results.currency",
    passengers: "booking.passengers",
  }),
  "traveller-details": Object.freeze({ passengers: "booking.passengers" }),
  "seat-selection": Object.freeze({ passengers: "booking.passengers", fare: "booking.fare" }),
  baggage: Object.freeze({ passengers: "booking.passengers", fare: "booking.fare" }),
  extras: Object.freeze({
    passengers: "booking.passengers",
    fare: "booking.fare",
    "insurance-id": "extras.insurance-id",
    "selected-extras": "extras.selected",
  }),
  "booking-review": Object.freeze({
    origin: "review.origin",
    destination: "review.destination",
    passengers: "review.passengers",
    fare: "review.fare",
    "base-price": "review.base-price",
    currency: "review.currency",
    "flight-number": "review.flight-number",
    schedule: "review.schedule",
    "seat-summary": "review.seat-summary",
    "baggage-summary": "review.baggage-summary",
    "insurance-label": "review.insurance-label",
    "extras-summary": "review.extras-summary",
    total: "review.total",
  }),
});

function addBindings(
  bindings: AuthoredBinding[],
  viewId: string,
  nodeId: string,
  mapping: Readonly<Record<string, string>>,
): void {
  for (const [prop, path] of Object.entries(mapping)) {
    bindings.push({
      viewId,
      nodeId,
      prop,
      source: { kind: "domain", path },
    });
  }
}

export function createCanonicalChatDocument(
  result: ViraFlightExperienceResult,
): StudioAuthoringDocumentInput {
  const views: AuthoredView[] = [];
  const bindings: AuthoredBinding[] = [];
  const interactions: AuthoredInteraction[] = [];

  for (const [index, step] of STEPS.entries()) {
    const source = createAirlineStarterDocument(`chat.segment.${step}`, step);
    const view = source.views[0];
    const node = view?.nodes[0];
    if (!view || !node) throw new Error(`Missing airline Studio starter: ${step}`);
    const next = STEPS[index + 1] ?? "confirmation";
    const id = `${step}-root`;
    const props: Record<string, JsonValue> = { ...node.props };
    if (step === "flight-search") {
      props.origin = result.input.origin;
      props.destination = result.input.destination;
      props.departure = result.input.departureDate;
      props.passengers = result.input.passengers;
    } else if (step === "flight-results") {
      const first = result.data.offers[0];
      props.origin = result.input.origin;
      props.destination = result.input.destination;
      props.departure = result.input.departureDate;
      props.passengers = result.input.passengers;
      props["base-price"] = first?.price ?? 0;
      props.currency = first?.currency ?? "EUR";
    }

    const stepBindings = bindingsByStep[step] ?? {};
    for (const prop of Object.keys(stepBindings)) delete props[prop];
    addBindings(bindings, step, id, stepBindings);

    views.push({ id: step, nodes: [{ ...node, id, props }] });
    for (const interaction of source.interactions) {
      const routes = step === "seat-selection" || step === "baggage"
        ? [
            { outcome: "success" as const, viewId: next },
            { outcome: "empty" as const, viewId: step },
          ]
        : [{ outcome: "success" as const, viewId: next }];
      interactions.push({
        ...interaction,
        viewId: step,
        nodeId: id,
        routes,
      });
    }
    if (step === "extras" || step === "booking-review") {
      interactions.push({
        viewId: step,
        nodeId: id,
        event: "assistant-command",
        actionEvent: "flight.assistant.command",
        routes: [{ outcome: "success", viewId: step }],
      });
    }
  }

  const confirmationSource = createAirlineStarterDocument("chat.segment.confirmation", "booking-review");
  const confirmationNode = confirmationSource.views[0]?.nodes[0];
  if (!confirmationNode) throw new Error("Missing booking review confirmation node");
  const confirmationProps: Record<string, JsonValue> = { ...confirmationNode.props };
  for (const prop of Object.keys(bindingsByStep["booking-review"] ?? {})) delete confirmationProps[prop];
  views.push({ id: "confirmation", nodes: [{ ...confirmationNode, id: "confirmation-root", props: confirmationProps }] });
  addBindings(bindings, "confirmation", "confirmation-root", bindingsByStep["booking-review"] ?? {});

  return {
    id: "pegasus.chat.approved-booking",
    recipeId: "studio.airline.chat-approved-booking",
    entryView: "flight-search",
    views,
    bindings,
    interactions,
  };
}
