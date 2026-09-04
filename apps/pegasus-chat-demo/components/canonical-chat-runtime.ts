import {
  baggageById,
  baggageFeeForFare,
  extraById,
  extraFeeForFare,
  fareById,
  insuranceById,
  seatById,
  seatFeeForFare,
} from "@vira-enterprise-genui/airline-brand-kit";
import {
  createViraExperienceRuntime,
  prepareAuthoredStudioPublication,
  type ViraExperienceRuntime,
} from "@vira-enterprise-genui/genui";
import { searchFlights } from "@vira-enterprise-genui/mock-airline-domain";
import { createRuntimeState } from "@vira-enterprise-genui/runtime-core";
import type { FlightOffer, ViraFlightExperienceResult } from "../lib/vira-chat-contract.js";
import {
  CANONICAL_CHAT_ACTION_ADAPTER,
  CANONICAL_CHAT_BINDING_SOURCE_CATALOG,
  CANONICAL_CHAT_COMPONENT_CATALOG,
  CANONICAL_CHAT_PERMISSION_POLICY,
  createCanonicalChatDocument,
} from "./canonical-chat-studio-contracts.js";

function runtimeState() {
  const result = createRuntimeState("pegasus-chat-studio", {
    version: "1",
    id: "pegasus-chat-studio-plan",
    intent: { version: "1", namespace: "travel.flight", name: "search" },
    state: {},
    capabilities: { required: [], available: [], future: [] },
  });
  return result.ok ? result.value : undefined;
}

function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined;
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return undefined;
    if (Object.getOwnPropertySymbols(value).length > 0
      || Object.getOwnPropertyNames(value).length !== Object.keys(value).length) return undefined;
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) return undefined;
      output[key] = descriptor.value;
    }
    return output;
  } catch {
    return undefined;
  }
}

function requiredText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function passengerIndex(value: unknown, passengers: number): number | undefined {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 0
    && value < passengers
    ? value
    : undefined;
}

export interface CanonicalChatRuntimeBundle {
  readonly runtime: ViraExperienceRuntime;
  readonly offers: () => readonly FlightOffer[];
}

export function createCanonicalChatRuntime(
  result: ViraFlightExperienceResult,
): CanonicalChatRuntimeBundle | undefined {
  const state = runtimeState();
  if (!state) return undefined;

  const publication = prepareAuthoredStudioPublication({
    document: createCanonicalChatDocument(result),
    componentCatalog: CANONICAL_CHAT_COMPONENT_CATALOG,
    bindingSourceCatalog: CANONICAL_CHAT_BINDING_SOURCE_CATALOG,
    actionAdapter: CANONICAL_CHAT_ACTION_ADAPTER,
  });
  if (!publication.ok) return undefined;

  let revision = 1;
  let searchInput = { ...result.input };
  let offers: readonly FlightOffer[] = [...result.data.offers];
  let selectedOfferId: string | undefined;
  let selectedFare = "smart";
  let selectedInsurance = "none";
  let passengerDetails: readonly Readonly<Record<string, string>>[] = [];
  let bookingContact: Readonly<Record<string, string>> | undefined;
  const seatSelections = new Map<number, string>();
  const baggageSelections = new Map<number, string>();
  const selectedExtras = new Set<string>();

  const selectedOffer = (): FlightOffer | undefined =>
    offers.find((offer) => offer.id === selectedOfferId) ?? offers[0];

  const resetDownstream = (): void => {
    passengerDetails = [];
    bookingContact = undefined;
    seatSelections.clear();
    baggageSelections.clear();
    selectedInsurance = "none";
    selectedExtras.clear();
  };

  const fareTotal = (): number => {
    const offer = selectedOffer();
    const fare = fareById(selectedFare);
    return (offer?.price ?? 0) + (fare?.perPassengerExtra ?? 0) * searchInput.passengers;
  };

  const seatTotal = (): number => [...seatSelections.values()].reduce((sum, seatId) => {
    const seat = seatById(seatId);
    return sum + (seat ? seatFeeForFare(seat, selectedFare) : 0);
  }, 0);

  const baggageTotal = (): number => [...baggageSelections.values()].reduce((sum, optionId) => {
    const baggage = baggageById(optionId);
    return sum + (baggage ? baggageFeeForFare(baggage, selectedFare) : 0);
  }, 0);

  const insuranceTotal = (): number => {
    const insurance = insuranceById(selectedInsurance);
    return (insurance?.feePerPassenger ?? 0) * searchInput.passengers;
  };

  const extrasTotal = (): number => [...selectedExtras].reduce((sum, id) => {
    const extra = extraById(id);
    return sum + (extra ? extraFeeForFare(extra, selectedFare) * searchInput.passengers : 0);
  }, 0);

  const total = (): number => Math.round((fareTotal() + seatTotal() + baggageTotal() + insuranceTotal() + extrasTotal()) * 100) / 100;

  const seatSummary = (): string => Array.from({ length: searchInput.passengers }, (_, index) =>
    `P${index + 1}: ${seatSelections.get(index) ?? "—"}`).join(" · ");

  const baggageSummary = (): string => Array.from({ length: searchInput.passengers }, (_, index) => {
    const baggage = baggageById(baggageSelections.get(index));
    return `P${index + 1}: ${baggage?.label ?? "—"}`;
  }).join(" · ");

  const snapshot = () => {
    const offer = selectedOffer();
    const price = offer?.price ?? 0;
    const currency = offer?.currency ?? "EUR";
    const insurance = insuranceById(selectedInsurance);
    const extraNames = [...selectedExtras].flatMap((id) => {
      const option = extraById(id);
      return option ? [option.name] : [];
    });
    return {
      version: "1" as const,
      revision,
      state: {
        "selected-offer": selectedOfferId ?? null,
        "fare-bundle": selectedFare,
        "passenger-details": passengerDetails,
        contact: bookingContact ?? null,
        "seat-selections": [...seatSelections.entries()].map(([index, seat]) => ({ passengerIndex: index, seat })),
        "baggage-selections": [...baggageSelections.entries()].map(([index, optionId]) => ({ passengerIndex: index, optionId })),
        "insurance-id": selectedInsurance,
        extras: [...selectedExtras],
      },
      domain: {
        results: {
          origin: searchInput.origin,
          destination: searchInput.destination,
          departure: searchInput.departureDate,
          passengers: searchInput.passengers,
          "base-price": price,
          currency,
        },
        booking: {
          passengers: searchInput.passengers,
          fare: selectedFare,
        },
        extras: {
          "insurance-id": selectedInsurance,
          selected: [...selectedExtras].join(","),
        },
        review: {
          origin: searchInput.origin,
          destination: searchInput.destination,
          passengers: searchInput.passengers,
          fare: selectedFare,
          "base-price": price,
          currency,
          "flight-number": offer?.flightNumber ?? "Flight",
          schedule: offer ? `${offer.departure}–${offer.arrival} · ${offer.duration}` : "—",
          "seat-summary": seatSummary(),
          "baggage-summary": baggageSummary(),
          "insurance-label": insurance?.name ?? "None",
          "extras-summary": extraNames.length > 0 ? extraNames.join(", ") : "None",
          total: total(),
        },
      },
    };
  };

  const outcome = (value: "success" | "empty") => {
    revision += 1;
    return { outcome: value, snapshot: snapshot() };
  };
  const error = () => ({ outcome: "error" as const });

  const host = {
    version: "1",
    id: "pegasus.chat.approved-host",
    snapshot,
    dispatch: async (action: unknown) => {
      const actionRecord = record(action);
      const type = actionRecord?.type;
      const payload = record(actionRecord?.payload) ?? {};

      if (type === "travel.flight.search.submit") {
        if (typeof payload.origin !== "string"
          || typeof payload.destination !== "string"
          || typeof payload.departureDate !== "string"
          || typeof payload.passengers !== "number"
          || !Number.isInteger(payload.passengers)
          || payload.passengers < 1
          || payload.passengers > 8) return error();
        try {
          const searched = searchFlights({
            origin: payload.origin,
            destination: payload.destination,
            departureDate: payload.departureDate,
            passengers: payload.passengers,
          });
          searchInput = {
            origin: searched.origin,
            destination: searched.destination,
            departureDate: searched.departureDate,
            passengers: searched.passengers,
          };
          offers = searched.offers;
          selectedOfferId = undefined;
          selectedFare = "smart";
          resetDownstream();
          return outcome("success");
        } catch {
          return error();
        }
      }

      if (type === "travel.flight.offer.select") {
        const offerId = requiredText(payload.offerId);
        if (!offerId || !offers.some((offer) => offer.id === offerId)) return error();
        selectedOfferId = offerId;
        selectedFare = "smart";
        resetDownstream();
        return outcome("success");
      }

      if (type === "travel.flight.fare.select") {
        const fare = fareById(payload.fareId);
        if (!fare) return error();
        selectedFare = fare.id;
        resetDownstream();
        return outcome("success");
      }

      if (type === "travel.flight.passenger.submit") {
        if (!Array.isArray(payload.passengers) || payload.passengers.length !== searchInput.passengers) return error();
        const parsedPassengers = payload.passengers.flatMap((entry) => {
          const person = record(entry);
          const firstName = requiredText(person?.firstName);
          const lastName = requiredText(person?.lastName);
          const birthDate = requiredText(person?.birthDate);
          return firstName && lastName && birthDate ? [{ firstName, lastName, birthDate }] : [];
        });
        const contact = record(payload.contact);
        const email = requiredText(contact?.email);
        const phone = requiredText(contact?.phone);
        if (parsedPassengers.length !== searchInput.passengers || !email || !phone) return error();
        passengerDetails = parsedPassengers;
        bookingContact = { email, phone };
        seatSelections.clear();
        baggageSelections.clear();
        selectedInsurance = "none";
        selectedExtras.clear();
        return outcome("success");
      }

      if (type === "travel.flight.seat.select") {
        const index = passengerIndex(payload.passengerIndex, searchInput.passengers);
        const seat = seatById(payload.seat);
        if (index === undefined || !seat || seat.occupied === true) return error();
        if ([...seatSelections.entries()].some(([otherIndex, seatId]) => otherIndex !== index && seatId === seat.id)) return error();
        seatSelections.set(index, seat.id);
        return outcome(seatSelections.size >= searchInput.passengers ? "success" : "empty");
      }

      if (type === "travel.flight.baggage.select") {
        const baggage = baggageById(payload.optionId);
        if (!baggage) return error();
        if (payload.applyToAll === true) {
          baggageSelections.clear();
          for (let index = 0; index < searchInput.passengers; index += 1) baggageSelections.set(index, baggage.id);
          return outcome("success");
        }
        const index = passengerIndex(payload.passengerIndex, searchInput.passengers);
        if (index === undefined) return error();
        baggageSelections.set(index, baggage.id);
        return outcome(baggageSelections.size >= searchInput.passengers ? "success" : "empty");
      }

      if (type === "travel.flight.extras.submit") {
        const insurance = insuranceById(payload.insuranceId);
        const extras = Array.isArray(payload.extras)
          ? payload.extras.filter((entry): entry is string => typeof entry === "string")
          : undefined;
        if (!insurance || !extras || extras.some((id) => !extraById(id))) return error();
        selectedInsurance = insurance.id;
        selectedExtras.clear();
        for (const id of extras) selectedExtras.add(id);
        return outcome("success");
      }

      if (type === "travel.flight.assistant.command") {
        if (payload.command === "set-insurance") {
          const insurance = insuranceById(payload.value);
          if (!insurance) return error();
          selectedInsurance = insurance.id;
          return outcome("success");
        }
        if (payload.command === "add-extra") {
          const extra = extraById(payload.value);
          if (!extra) return error();
          selectedExtras.add(extra.id);
          return outcome("success");
        }
        return error();
      }

      if (type === "travel.flight.booking.handoff") return outcome("success");
      return error();
    },
    subscribe: () => () => {},
  };

  const runtime = createViraExperienceRuntime({
    publication: publication.value,
    componentCatalog: CANONICAL_CHAT_COMPONENT_CATALOG,
    bindingSourceCatalog: CANONICAL_CHAT_BINDING_SOURCE_CATALOG,
    actionAdapter: CANONICAL_CHAT_ACTION_ADAPTER,
    runtimeState: state,
    permissionPolicy: CANONICAL_CHAT_PERMISSION_POLICY,
    host,
  });

  return runtime.ok
    ? Object.freeze({ runtime: runtime.value, offers: () => offers })
    : undefined;
}
