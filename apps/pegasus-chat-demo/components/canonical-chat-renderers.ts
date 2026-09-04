"use client";

import {
  AIRLINE_STUDIO_COMPONENTS,
  BAGGAGE_OPTIONS,
  EXTRA_OPTIONS,
  FARE_OPTIONS,
  INSURANCE_OPTIONS,
  SEAT_OPTIONS,
  baggageFeeForFare,
  extraFeeForFare,
  mountAirlineStudioComponent,
  seatFeeForFare,
} from "@vira-enterprise-genui/airline-brand-kit";
import type { StudioRuntimeReactRenderer } from "@vira-enterprise-genui/genui";
import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

type RendererContext = Parameters<StudioRuntimeReactRenderer>[0];

function text(props: Readonly<Record<string, unknown>>, key: string, fallback = ""): string {
  const value = props[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function number(props: Readonly<Record<string, unknown>>, key: string, fallback = 0): number {
  const value = props[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function money(amount: number, currency: string): string {
  return `${Math.round(amount * 100) / 100} ${currency}`;
}

function SharedAirlineWidget({ component, props, emit }: {
  readonly component: string;
  readonly props: Readonly<Record<string, unknown>>;
  readonly emit: (event: string, payload?: unknown) => unknown;
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    return mountAirlineStudioComponent(ref.current, component, props, (event, payload) => { emit(event, payload); });
  }, [component, props, emit]);
  return createElement("div", { ref, className: "shared-brand-runtime" });
}

function Shell({ children }: { readonly children: ReactNode }): ReactElement {
  return createElement("section", { className: "vira-booking-flow standalone-brand-component" }, children);
}

function FareRenderer({ props, emit }: RendererContext): ReactElement {
  const base = number(props, "base-price");
  const passengers = Math.max(1, Math.round(number(props, "passengers", 1)));
  const currency = text(props, "currency", "EUR");
  return createElement(Shell, null,
    createElement("div", { className: "vira-flow-copy" },
      createElement("span", { className: "vira-flow-eyebrow" }, "Your trip, assembled live"),
      createElement("strong", null, "Build the fare around your selected flight"),
      createElement("p", null, `Selected flight total starts at ${money(base, currency)}.`),
    ),
    createElement("div", { className: "vira-fare-grid rich" },
      ...FARE_OPTIONS.map((fare) => createElement("button", {
        key: fare.id,
        type: "button",
        className: `vira-fare-option${fare.id === "smart" ? " recommended" : ""}`,
        onClick: () => { emit("select", { fareId: fare.id }); },
      },
      createElement("div", { className: "vira-fare-option-top" },
        createElement("strong", null, fare.name),
        fare.badge ? createElement("span", { className: "vira-option-badge" }, fare.badge) : null,
      ),
      createElement("div", { className: "vira-fare-price" },
        createElement("strong", null, money(base + fare.perPassengerExtra * passengers, currency)),
        createElement("span", null, fare.perPassengerExtra === 0 ? "base trip total" : `+${fare.perPassengerExtra} ${currency} / traveller`),
      ),
      createElement("ul", { className: "vira-includes-list" },
        ...fare.includes.map((item) => createElement("li", { key: item }, item)),
      ),
      createElement("p", { className: "vira-fare-policy" }, fare.changePolicy),
      )),
    ),
  );
}

function SeatComponent({ props, emit }: Pick<RendererContext, "props" | "emit">): ReactElement {
  const passengers = Math.max(1, Math.min(8, Math.round(number(props, "passengers", 1))));
  const fare = text(props, "fare", "smart");
  const [selected, setSelected] = useState<readonly string[]>([]);
  const activePassenger = Math.min(passengers - 1, selected.length);
  const selectedSet = new Set(selected);

  return createElement(Shell, null,
    createElement("div", { className: "vira-active-traveller" },
      createElement("span", null, `P${activePassenger + 1}`),
      createElement("div", null,
        createElement("strong", null, selected.length >= passengers ? "All travellers have seats" : `Choose a seat for traveller ${activePassenger + 1}`),
        createElement("span", null, `${selected.length}/${passengers} assigned`),
      ),
    ),
    createElement("div", { className: "vira-plane" },
      ...Array.from(new Set(SEAT_OPTIONS.map((seat) => seat.row))).map((rowNumber) =>
        createElement("div", { key: rowNumber, className: "vira-seat-row" },
          createElement("span", { className: "vira-seat-row-number" }, String(rowNumber)),
          ...SEAT_OPTIONS.filter((seat) => seat.row === rowNumber).map((seat) => {
            const disabled = seat.occupied === true || selectedSet.has(seat.id) || selected.length >= passengers;
            return createElement("button", {
              key: seat.id,
              type: "button",
              disabled,
              className: `vira-seat ${seat.zone}${seat.occupied ? " occupied" : ""}${selectedSet.has(seat.id) ? " selected" : ""}`,
              onClick: () => {
                if (disabled) return;
                const passengerIndex = selected.length;
                setSelected((current) => [...current, seat.id]);
                emit("select", { passengerIndex, seat: seat.id });
              },
            },
            createElement("strong", null, seat.id),
            createElement("span", null, seatFeeForFare(seat, fare) === 0 ? "incl." : `+${seatFeeForFare(seat, fare)}`),
            );
          }),
        )),
    ),
  );
}

const SeatRenderer: StudioRuntimeReactRenderer = ({ props, emit }) =>
  createElement(SeatComponent, { props, emit });

function BaggageComponent({ props, emit }: Pick<RendererContext, "props" | "emit">): ReactElement {
  const passengers = Math.max(1, Math.min(8, Math.round(number(props, "passengers", 1))));
  const fare = text(props, "fare", "smart");
  const [selected, setSelected] = useState<ReadonlyMap<number, string>>(() => new Map());
  const activePassenger = Math.min(passengers - 1, selected.size);

  return createElement(Shell, null,
    createElement("div", { className: "vira-active-traveller baggage" },
      createElement("span", null, `P${activePassenger + 1}`),
      createElement("strong", null, selected.size >= passengers ? "Baggage ready" : `Bag for traveller ${activePassenger + 1}`),
    ),
    createElement("div", { className: "vira-baggage-grid" },
      ...BAGGAGE_OPTIONS.map((option) => createElement("div", { key: option.id, className: "vira-bag-option" },
        createElement("strong", null, option.kilograms === 0 ? "Carry light" : `${option.kilograms} kg`),
        createElement("span", null, option.label),
        createElement("b", null, baggageFeeForFare(option, fare) === 0 ? "Included" : `+${baggageFeeForFare(option, fare)} EUR`),
        createElement("div", { className: "vira-bag-actions" },
          createElement("button", {
            type: "button",
            disabled: selected.size >= passengers,
            onClick: () => {
              const index = activePassenger;
              setSelected((current) => new Map(current).set(index, option.id));
              emit("select", { passengerIndex: index, optionId: option.id });
            },
          }, `P${activePassenger + 1}`),
          createElement("button", {
            type: "button",
            onClick: () => {
              setSelected(new Map(Array.from({ length: passengers }, (_, index) => [index, option.id] as const)));
              emit("select", { applyToAll: true, optionId: option.id });
            },
          }, "All travellers"),
        ),
      )),
    ),
  );
}

const BaggageRenderer: StudioRuntimeReactRenderer = ({ props, emit }) =>
  createElement(BaggageComponent, { props, emit });

function selectedExtrasFrom(props: Readonly<Record<string, unknown>>): readonly string[] {
  return text(props, "selected-extras")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function ExtrasComponent({ props, emit }: Pick<RendererContext, "props" | "emit">): ReactElement {
  const passengers = Math.max(1, Math.min(8, Math.round(number(props, "passengers", 1))));
  const fare = text(props, "fare", "smart");
  const externalInsurance = text(props, "insurance-id", "none");
  const externalExtrasText = text(props, "selected-extras");
  const externalExtras = selectedExtrasFrom(props);
  const [insurance, setInsurance] = useState(externalInsurance);
  const [extras, setExtras] = useState<readonly string[]>(externalExtras);

  useEffect(() => { setInsurance(externalInsurance); }, [externalInsurance]);
  useEffect(() => { setExtras(externalExtras); }, [externalExtrasText]);
  const selected = new Set(extras);

  return createElement(Shell, null,
    createElement("div", { className: "vira-section-title" }, createElement("strong", null, "Travel protection")),
    createElement("div", { className: "vira-insurance-grid" },
      ...INSURANCE_OPTIONS.map((option) => createElement("button", {
        key: option.id,
        type: "button",
        className: `vira-insurance-option${insurance === option.id ? " selected" : ""}`,
        onClick: () => { setInsurance(option.id); },
      },
      createElement("strong", null, option.name),
      createElement("span", null, option.copy),
      createElement("b", null, option.feePerPassenger === 0 ? "No charge" : `+${option.feePerPassenger * passengers} EUR`),
      )),
    ),
    createElement("div", { className: "vira-section-title" }, createElement("strong", null, "Make the airport easier")),
    createElement("div", { className: "vira-extra-grid" },
      ...EXTRA_OPTIONS.map((option) => createElement("button", {
        key: option.id,
        type: "button",
        className: `vira-extra-option${selected.has(option.id) ? " selected" : ""}`,
        onClick: () => {
          setExtras((current) => current.includes(option.id)
            ? current.filter((id) => id !== option.id)
            : [...current, option.id]);
        },
      },
      createElement("strong", null, option.name),
      createElement("span", null, option.copy),
      createElement("b", null, extraFeeForFare(option, fare) * passengers === 0 ? "Included" : `+${extraFeeForFare(option, fare) * passengers} EUR`),
      )),
    ),
    createElement("button", {
      type: "button",
      className: "vira-primary-button",
      onClick: () => { emit("submit", { insuranceId: insurance, extras }); },
    }, "Review the whole trip"),
  );
}

const ExtrasRenderer: StudioRuntimeReactRenderer = ({ props, emit }) =>
  createElement(ExtrasComponent, { props, emit });

function ReviewRenderer({ nodeId, props, emit }: RendererContext): ReactElement {
  const currency = text(props, "currency", "EUR");
  const total = number(props, "total", number(props, "base-price"));
  const confirmation = nodeId === "confirmation-root";

  return createElement(Shell, null,
    createElement("div", { className: confirmation ? "vira-handoff-card" : "vira-review-layout" },
      createElement("section", { className: "vira-review-section hero" },
        createElement("strong", null, confirmation ? "Ready for airline checkout" : `${text(props, "origin", "—")} → ${text(props, "destination", "—")}`),
        createElement("span", null, `${text(props, "flight-number", "Flight")} · ${text(props, "schedule", "—")}`),
        createElement("span", { className: "vira-fare-pill" }, text(props, "fare", "Fare")),
      ),
      createElement("section", { className: "vira-review-section" },
        createElement("strong", null, "Trip selections"),
        createElement("p", null, text(props, "seat-summary", "Seats not selected")),
        createElement("p", null, text(props, "baggage-summary", "Baggage not selected")),
        createElement("p", null, `Insurance: ${text(props, "insurance-label", "None")}`),
        createElement("p", null, `Extras: ${text(props, "extras-summary", "None")}`),
      ),
      createElement("aside", { className: "vira-price-breakdown" },
        createElement("span", null, `Total for ${Math.max(1, Math.round(number(props, "passengers", 1)))} traveller(s)`),
        createElement("strong", { className: "vira-grand-total" }, money(total, currency)),
        confirmation
          ? createElement("p", { className: "vira-payment-boundary-note" }, "The approved GenUI flow is complete. The demo stops at the airline checkout boundary.")
          : createElement("button", {
              type: "button",
              className: "vira-primary-button",
              onClick: () => { emit("continue", {}); },
            }, "Continue to secure payment"),
      ),
    ),
  );
}

const sharedComponents = new Set<string>([
  AIRLINE_STUDIO_COMPONENTS.flightSearch,
  AIRLINE_STUDIO_COMPONENTS.flightResults,
  AIRLINE_STUDIO_COMPONENTS.travellerDetails,
]);

export const CANONICAL_CHAT_RENDERERS: Readonly<Record<string, StudioRuntimeReactRenderer>> = Object.freeze(Object.fromEntries(
  Object.values(AIRLINE_STUDIO_COMPONENTS).map((component) => {
    if (sharedComponents.has(component)) {
      return [component, ({ props, emit }: RendererContext) =>
        createElement(SharedAirlineWidget, { component, props, emit })] as const;
    }
    if (component === AIRLINE_STUDIO_COMPONENTS.fareComparison) return [component, FareRenderer] as const;
    if (component === AIRLINE_STUDIO_COMPONENTS.seatMap) return [component, SeatRenderer] as const;
    if (component === AIRLINE_STUDIO_COMPONENTS.baggageSelector) return [component, BaggageRenderer] as const;
    if (component === AIRLINE_STUDIO_COMPONENTS.extrasSelector) return [component, ExtrasRenderer] as const;
    return [component, ReviewRenderer] as const;
  }),
));
