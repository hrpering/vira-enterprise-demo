import {
  SEAT_OPTIONS,
  baggageById,
  extraById,
  fareById,
  insuranceById,
} from "@vira-enterprise-genui/airline-brand-kit";
import type { ViraExperienceRuntime } from "@vira-enterprise-genui/genui";
import type {
  FlightOffer,
  ViraCommandResult,
} from "../lib/vira-chat-contract.js";

export type CanonicalChatCommandResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "NO_ACTIVE_EXPERIENCE" | "WRONG_STEP" | "INVALID_VALUE" | "DISPATCH_REJECTED" };

interface CanonicalChatCommandTarget {
  readonly runtime: ViraExperienceRuntime;
  readonly offers: () => readonly FlightOffer[];
}

let nextTargetId = 0;
const targets = new Map<number, CanonicalChatCommandTarget>();

function activeTarget(): CanonicalChatCommandTarget | undefined {
  const ids = [...targets.keys()];
  const id = ids.at(-1);
  return id === undefined ? undefined : targets.get(id);
}

export function registerCanonicalChatCommandTarget(
  target: CanonicalChatCommandTarget,
): () => void {
  const id = ++nextTargetId;
  targets.set(id, target);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    targets.delete(id);
  };
}

async function dispatch(
  target: CanonicalChatCommandTarget,
  nodeId: string,
  event: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<CanonicalChatCommandResult> {
  const result = await target.runtime.controller.dispatch({ nodeId, event, payload });
  return result.ok
    ? { ok: true }
    : { ok: false, reason: "DISPATCH_REJECTED" };
}

function activePassengerCount(target: CanonicalChatCommandTarget): number | undefined {
  const current = target.runtime.controller.currentView();
  if (!current.ok) return undefined;
  const root = current.value.nodes.find((node) => node.sourceNodeId === "seat-selection-root");
  const passengers = root?.props.passengers;
  return typeof passengers === "number"
    && Number.isInteger(passengers)
    && passengers >= 1
    && passengers <= 8
    ? passengers
    : undefined;
}

export async function applyCanonicalViraCommand(
  command: ViraCommandResult,
): Promise<CanonicalChatCommandResult> {
  const target = activeTarget();
  if (!target) return { ok: false, reason: "NO_ACTIVE_EXPERIENCE" };

  const view = target.runtime.controller.currentViewId();

  if (command.command === "select-cheapest") {
    if (view !== "flight-results") return { ok: false, reason: "WRONG_STEP" };
    const cheapest = [...target.offers()]
      .filter((offer) => Number.isFinite(offer.price))
      .sort((left, right) => left.price - right.price)[0];
    if (!cheapest) return { ok: false, reason: "INVALID_VALUE" };
    return dispatch(target, "flight-results-root", "select", { offerId: cheapest.id });
  }

  if (command.command === "select-fare") {
    if (view !== "fare-comparison") return { ok: false, reason: "WRONG_STEP" };
    const fare = fareById(command.value);
    if (!fare) return { ok: false, reason: "INVALID_VALUE" };
    return dispatch(target, "fare-comparison-root", "select", { fareId: fare.id });
  }

  if (command.command === "set-seat-zone") {
    if (view !== "seat-selection") return { ok: false, reason: "WRONG_STEP" };
    const zone = command.value;
    if (zone !== "front" && zone !== "extra-legroom" && zone !== "standard") {
      return { ok: false, reason: "INVALID_VALUE" };
    }
    const passengerCount = activePassengerCount(target);
    if (passengerCount === undefined) return { ok: false, reason: "INVALID_VALUE" };
    const seats = SEAT_OPTIONS
      .filter((candidate) => candidate.zone === zone && candidate.occupied !== true)
      .slice(0, passengerCount);
    if (seats.length !== passengerCount) return { ok: false, reason: "INVALID_VALUE" };

    for (let passengerIndex = 0; passengerIndex < seats.length; passengerIndex += 1) {
      const seat = seats[passengerIndex];
      if (!seat) return { ok: false, reason: "INVALID_VALUE" };
      const result = await target.runtime.controller.dispatch({
        nodeId: "seat-selection-root",
        event: "select",
        payload: { passengerIndex, seat: seat.id },
      });
      if (!result.ok) return { ok: false, reason: "DISPATCH_REJECTED" };
    }
    return { ok: true };
  }

  if (command.command === "set-baggage-all") {
    if (view !== "baggage") return { ok: false, reason: "WRONG_STEP" };
    const baggage = baggageById(command.value);
    if (!baggage) return { ok: false, reason: "INVALID_VALUE" };
    return dispatch(target, "baggage-root", "select", { applyToAll: true, optionId: baggage.id });
  }

  if (command.command === "set-insurance") {
    if (view !== "extras" && view !== "booking-review") return { ok: false, reason: "WRONG_STEP" };
    const insurance = insuranceById(command.value);
    if (!insurance) return { ok: false, reason: "INVALID_VALUE" };
    return dispatch(target, `${view}-root`, "assistant-command", {
      command: "set-insurance",
      value: insurance.id,
    });
  }

  if (command.command === "add-extra") {
    if (view !== "extras" && view !== "booking-review") return { ok: false, reason: "WRONG_STEP" };
    const extra = extraById(command.value);
    if (!extra) return { ok: false, reason: "INVALID_VALUE" };
    return dispatch(target, `${view}-root`, "assistant-command", {
      command: "add-extra",
      value: extra.id,
    });
  }

  return { ok: false, reason: "INVALID_VALUE" };
}
