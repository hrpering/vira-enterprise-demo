import { searchFlights } from "@vira-enterprise-genui/mock-airline-domain";
import { parseDomainData, type JsonObject } from "@vira-enterprise-genui/protocol";
import type {
  RenderCapabilityBinding,
  RuntimeWebDomBeginContext,
  RuntimeWebDomPort,
  RuntimeWebDomRoot,
  ViraGenUIEventMap,
} from "@vira-enterprise-genui/runtime-web";
import {
  BAGGAGE_OPTIONS,
  baggageFeeForFare,
  EXTRA_OPTIONS,
  extraFeeForFare,
  FARE_OPTIONS,
  fareById,
  INSURANCE_OPTIONS,
  insuranceById,
  SEAT_OPTIONS,
  seatFeeForFare,
} from "./booking-catalog.js";

export interface AirlineFlightOffer {
  readonly id: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure: string;
  readonly arrival: string;
  readonly duration: string;
  readonly flightNumber: string;
  readonly price: number;
  readonly currency: string;
}

export interface AirlineFlightExperienceSeed {
  readonly input: {
    readonly origin: string;
    readonly destination: string;
    readonly departureDate: string;
    readonly passengers: number;
  };
  readonly data: {
    readonly offers: readonly AirlineFlightOffer[];
  };
}

export interface AirlineViraDomController {
  readonly port: RuntimeWebDomPort;
  bindDispatch(dispatch: (event: unknown) => void): void;
  renderState(state: ViraGenUIEventMap["statechange"]): void;
  showError(message: string): void;
}

type RuntimeState = ViraGenUIEventMap["statechange"];
type Dispatch = (event: { readonly event: string; readonly payload?: Readonly<Record<string, unknown>> }) => void;

export const AIRLINE_STUDIO_COMPONENTS = Object.freeze({
  flightSearch: "airline.component.flight-search",
  flightResults: "airline.component.flight-results",
  fareComparison: "airline.component.fare-comparison",
  travellerDetails: "airline.component.traveller-details",
  seatMap: "airline.component.seat-map",
  baggageSelector: "airline.component.baggage-selector",
  extrasSelector: "airline.component.extras-selector",
  bookingReview: "airline.component.booking-review",
} as const);

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function objects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.flatMap((entry) => {
    const item = object(entry);
    return item ? [item] : [];
  }) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function money(value: number, currency = "EUR"): string {
  return `${Math.round(value * 100) / 100} ${currency}`;
}

function passengerCount(state: RuntimeState, fallback: number): number {
  const raw = number(state.plan.state.passengers, fallback);
  return Number.isInteger(raw) ? Math.min(8, Math.max(1, raw)) : fallback;
}

function selectedOffer(offers: readonly JsonObject[], state: RuntimeState): JsonObject | undefined {
  const selected = text(state.plan.state["selected-offer"]);
  return selected ? offers.find((offer) => offer.id === selected) : undefined;
}

function totalPrice(state: RuntimeState): number {
  const fare = number(state.plan.state["fare-total"]);
  const seats = objects(state.plan.state["seat-selections"]).reduce((sum, entry) => sum + number(entry.fee), 0);
  const baggage = objects(state.plan.state["baggage-selections"]).reduce((sum, entry) => sum + number(entry.fee), 0);
  const insurance = number(state.plan.state["insurance-total"]);
  const extras = number(state.plan.state["extras-total"]);
  return Math.round((fare + seats + baggage + insurance + extras) * 100) / 100;
}

function normalizeCode(value: string): string {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : normalized.slice(0, 3);
}

function renderSearch(host: HTMLElement, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.replaceChildren();
  const form = element("form", "vira-search-card");
  const route = element("div", "vira-route-grid");
  const originLabel = element("label");
  const originCaption = element("span");
  originCaption.textContent = "From";
  const origin = element("input");
  origin.value = seed.data.offers[0]?.origin ?? normalizeCode(seed.input.origin);
  origin.maxLength = 3;
  originLabel.append(originCaption, origin);
  const arrow = element("div", "vira-route-arrow");
  arrow.textContent = "→";
  const destinationLabel = element("label");
  const destinationCaption = element("span");
  destinationCaption.textContent = "To";
  const destination = element("input");
  destination.value = seed.data.offers[0]?.destination ?? normalizeCode(seed.input.destination);
  destination.maxLength = 3;
  destinationLabel.append(destinationCaption, destination);
  route.append(originLabel, arrow, destinationLabel);

  const details = element("div", "vira-search-details");
  const dateLabel = element("label");
  const dateCaption = element("span");
  dateCaption.textContent = "Departure";
  const date = element("input");
  date.type = "date";
  date.value = seed.input.departureDate;
  dateLabel.append(dateCaption, date);
  const passengersLabel = element("label");
  const passengersCaption = element("span");
  passengersCaption.textContent = "Passengers";
  const passengers = element("input");
  passengers.type = "number";
  passengers.min = "1";
  passengers.max = "8";
  passengers.value = String(seed.input.passengers);
  passengersLabel.append(passengersCaption, passengers);
  details.append(dateLabel, passengersLabel);

  const button = element("button", "vira-primary-button");
  button.type = "submit";
  button.textContent = "Search flights";
  form.append(route, details, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const count = Number.parseInt(passengers.value, 10);
    dispatch({
      event: "search.submit",
      payload: {
        origin: normalizeCode(origin.value),
        destination: normalizeCode(destination.value),
        departureDate: date.value,
        passengers: Number.isSafeInteger(count) ? Math.min(8, Math.max(1, count)) : 1,
      },
    });
  });
  host.append(form);
}

function renderResults(host: HTMLElement, state: RuntimeState, offers: readonly JsonObject[], seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.replaceChildren();
  const card = element("section", "vira-results-card");
  const head = element("div", "vira-results-head");
  const title = element("strong");
  title.textContent = "Available flights";
  const status = element("span");
  status.textContent = `${offers.length} options · total trip prices`;
  head.append(title, status);
  const list = element("div", "vira-flight-list");
  const selected = text(state.plan.state["selected-offer"]);
  const count = passengerCount(state, seed.input.passengers);
  const cheapest = Math.min(...offers.map((offer) => number(offer.price, Number.POSITIVE_INFINITY)));
  for (const offer of offers) {
    if (typeof offer.id !== "string") continue;
    const row = element("article", `vira-flight-row${selected === offer.id ? " selected" : ""}`);
    const time = element("div", "vira-flight-time");
    const departure = element("strong");
    departure.textContent = text(offer.departure, "—");
    const route = element("span");
    route.textContent = `${text(offer.origin, "—")} → ${text(offer.destination, "—")}`;
    const arrival = element("strong");
    arrival.textContent = text(offer.arrival, "—");
    time.append(departure, route, arrival);
    const meta = element("div", "vira-flight-meta");
    const flight = element("strong");
    flight.textContent = text(offer.flightNumber, "Flight");
    const duration = element("span");
    duration.textContent = text(offer.duration, "Direct");
    meta.append(flight, duration);
    if (number(offer.price) === cheapest) {
      const badge = element("b", "vira-flight-badge");
      badge.textContent = "Cheapest";
      meta.append(badge);
    }
    const priceBox = element("div", "vira-flight-pricebox");
    const price = number(offer.price);
    const currency = text(offer.currency, "EUR");
    const perPerson = element("span");
    perPerson.textContent = `${Math.round((price / Math.max(1, count)) * 100) / 100} ${currency} / person`;
    const action = element("button", "vira-price-button");
    action.type = "button";
    action.textContent = selected === offer.id ? "Selected" : money(price, currency);
    action.addEventListener("click", () => dispatch({ event: "offer.select", payload: { offerId: offer.id } }));
    priceBox.append(perPerson, action);
    row.append(time, meta, priceBox);
    list.append(row);
  }
  card.append(head, list);
  host.append(card);
}

function flowHeader(state: RuntimeState, step: string, title: string, subtitle: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const top = element("div", "vira-flow-top");
  const copy = element("div", "vira-flow-copy");
  const eyebrow = element("span", "vira-flow-eyebrow");
  eyebrow.textContent = "Your trip, assembled live";
  const heading = element("strong");
  heading.textContent = title;
  const description = element("p");
  description.textContent = subtitle;
  copy.append(eyebrow, heading, description);
  const total = element("div", "vira-live-total");
  const label = element("span");
  label.textContent = "Current total";
  const value = element("strong");
  value.textContent = money(totalPrice(state));
  total.append(label, value);
  top.append(copy, total);

  const rail = element("div", "vira-journey-rail");
  const steps = [["fare", "Fare"], ["passengers", "Travellers"], ["seats", "Seats"], ["baggage", "Bags"], ["extras", "Extras"], ["review", "Review"]] as const;
  const active = Math.max(0, steps.findIndex(([id]) => id === step));
  steps.forEach(([id, labelText], index) => {
    const item = element("div", `vira-journey-step${index <= active ? " active" : ""}${id === step ? " current" : ""}`);
    const dot = element("span");
    dot.textContent = index < active ? "✓" : String(index + 1);
    const copyText = element("b");
    copyText.textContent = labelText;
    item.append(dot, copyText);
    rail.append(item);
  });
  fragment.append(top, rail);
  return fragment;
}

function renderFare(host: HTMLElement, state: RuntimeState, offer: JsonObject, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "fare", "Build the fare around your trip", "Compare what is included before adding extras later."));
  const count = passengerCount(state, seed.input.passengers);
  const base = number(offer.price);
  const currency = text(offer.currency, "EUR");
  const insight = element("div", "vira-insight-strip");
  const insightTitle = element("strong");
  insightTitle.textContent = "Smart comparison";
  const insightCopy = element("span");
  insightCopy.textContent = "Smart includes a cabin bag, 20kg checked baggage and a standard seat. Compare the full trip cost, not only the headline fare.";
  insight.append(insightTitle, insightCopy);
  host.append(insight);
  const grid = element("div", "vira-fare-grid rich");
  for (const fare of FARE_OPTIONS) {
    const card = element("button", `vira-fare-option${fare.id === "smart" ? " recommended" : ""}`);
    card.type = "button";
    const top = element("div", "vira-fare-option-top");
    const name = element("strong");
    name.textContent = fare.name;
    top.append(name);
    if (fare.badge) {
      const badge = element("span", "vira-option-badge");
      badge.textContent = fare.badge;
      top.append(badge);
    }
    const price = element("div", "vira-fare-price");
    const amount = element("strong");
    amount.textContent = money(base + fare.perPassengerExtra * count, currency);
    const small = element("span");
    small.textContent = fare.perPassengerExtra === 0 ? "base trip total" : `+${fare.perPassengerExtra} ${currency} / traveller`;
    price.append(amount, small);
    const list = element("ul", "vira-includes-list");
    fare.includes.forEach((included) => {
      const item = element("li");
      item.textContent = included;
      list.append(item);
    });
    const policy = element("p", "vira-fare-policy");
    policy.textContent = fare.changePolicy;
    card.append(top, price, list, policy);
    card.addEventListener("click", () => dispatch({ event: "fare.select", payload: { fareId: fare.id } }));
    grid.append(card);
  }
  host.append(grid);
}

function renderPassengers(host: HTMLElement, state: RuntimeState, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "passengers", "Who is travelling?", "Collect traveller and booking-contact details inside the active Vira experience."));
  const count = passengerCount(state, seed.input.passengers);
  const form = element("form", "vira-traveller-form");
  const travellers: Array<{ firstName: HTMLInputElement; lastName: HTMLInputElement; birthDate: HTMLInputElement }> = [];
  for (let index = 0; index < count; index += 1) {
    const card = element("section", "vira-traveller-card");
    const title = element("div", "vira-traveller-title");
    const badge = element("span");
    badge.textContent = String(index + 1);
    const heading = element("strong");
    heading.textContent = index === 0 ? "Lead traveller" : `Traveller ${index + 1}`;
    title.append(badge, heading);
    const grid = element("div", "vira-field-grid three");
    const firstName = element("input");
    firstName.placeholder = "First name";
    const lastName = element("input");
    lastName.placeholder = "Last name";
    const birthDate = element("input");
    birthDate.type = "date";
    grid.append(firstName, lastName, birthDate);
    travellers.push({ firstName, lastName, birthDate });
    card.append(title, grid);
    form.append(card);
  }
  const contact = element("section", "vira-contact-card");
  const contactTitle = element("strong");
  contactTitle.textContent = "Booking contact";
  const contactCopy = element("span");
  contactCopy.textContent = "Used for itinerary and disruption updates";
  const contactGrid = element("div", "vira-field-grid two");
  const email = element("input");
  email.type = "email";
  email.placeholder = "Email";
  const phone = element("input");
  phone.type = "tel";
  phone.placeholder = "Phone";
  contactGrid.append(email, phone);
  contact.append(contactTitle, contactCopy, contactGrid);
  form.append(contact);
  const submit = element("button", "vira-primary-button");
  submit.type = "submit";
  submit.textContent = `Continue with ${count} traveller${count === 1 ? "" : "s"}`;
  form.append(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    dispatch({
      event: "passenger.submit",
      payload: {
        passengers: travellers.map((traveller) => ({ firstName: traveller.firstName.value, lastName: traveller.lastName.value, birthDate: traveller.birthDate.value })),
        contact: { email: email.value, phone: phone.value },
      },
    });
  });
  host.append(form);
}

function renderSeats(host: HTMLElement, state: RuntimeState, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "seats", "Pick seats together", "Choose one seat per traveller. Prices reflect the selected fare."));
  const count = passengerCount(state, seed.input.passengers);
  const selections = objects(state.plan.state["seat-selections"]);
  const activePassenger = Math.min(count - 1, selections.length);
  const selected = new Set(selections.map((entry) => text(entry.seat)).filter(Boolean));
  const fareId = text(state.plan.state["fare-bundle"]);
  const bar = element("div", "vira-active-traveller");
  const avatar = element("span");
  avatar.textContent = `P${activePassenger + 1}`;
  const copy = element("div");
  const strong = element("strong");
  strong.textContent = selections.length >= count ? "All travellers have seats" : `Choose a seat for traveller ${activePassenger + 1}`;
  const small = element("span");
  small.textContent = `${selections.length}/${count} assigned`;
  copy.append(strong, small);
  bar.append(avatar, copy);
  host.append(bar);
  const legend = element("div", "vira-seat-legend");
  legend.innerHTML = "<span><i class='front'></i>Front</span><span><i class='legroom'></i>Extra legroom</span><span><i></i>Standard</span><span><i class='occupied'></i>Occupied</span>";
  host.append(legend);
  const plane = element("div", "vira-plane");
  const nose = element("div", "vira-plane-nose");
  nose.textContent = "FRONT";
  plane.append(nose);
  for (const rowNumber of Array.from(new Set(SEAT_OPTIONS.map((seat) => seat.row)))) {
    const row = element("div", "vira-seat-row");
    const rowLabel = element("span", "vira-seat-row-number");
    rowLabel.textContent = String(rowNumber);
    row.append(rowLabel);
    SEAT_OPTIONS.filter((seat) => seat.row === rowNumber).forEach((seat, index) => {
      if (index === 3) row.append(element("span", "vira-seat-aisle"));
      const button = element("button", `vira-seat ${seat.zone}${seat.occupied ? " occupied" : ""}${selected.has(seat.id) ? " selected" : ""}`);
      button.type = "button";
      button.disabled = Boolean(seat.occupied || selected.has(seat.id) || selections.length >= count);
      const code = element("strong");
      code.textContent = seat.id;
      const fee = element("span");
      const amount = seatFeeForFare(seat, fareId);
      fee.textContent = amount === 0 ? "incl." : `+${amount}`;
      button.append(code, fee);
      button.addEventListener("click", () => dispatch({ event: "seat.select", payload: { passengerIndex: activePassenger, seat: seat.id } }));
      row.append(button);
    });
    plane.append(row);
  }
  host.append(plane);
}

function renderBaggage(host: HTMLElement, state: RuntimeState, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "baggage", "Pack for the trip you are actually taking", "Choose checked baggage per traveller or apply one choice to everybody."));
  const count = passengerCount(state, seed.input.passengers);
  const selections = objects(state.plan.state["baggage-selections"]);
  const activePassenger = Math.min(count - 1, selections.length);
  const fareId = text(state.plan.state["fare-bundle"]);
  const banner = element("div", "vira-active-traveller baggage");
  const avatar = element("span");
  avatar.textContent = `P${activePassenger + 1}`;
  const copy = element("div");
  const strong = element("strong");
  strong.textContent = `Bag for traveller ${activePassenger + 1}`;
  const small = element("span");
  small.textContent = fareId === "smart" || fareId === "flex" ? "Up to 20kg is already included in your fare" : "No checked baggage is included in Light";
  copy.append(strong, small);
  banner.append(avatar, copy);
  host.append(banner);
  const grid = element("div", "vira-baggage-grid");
  for (const option of BAGGAGE_OPTIONS) {
    const card = element("div", "vira-bag-option");
    const kilo = element("strong");
    kilo.textContent = option.kilograms === 0 ? "Carry light" : `${option.kilograms} kg`;
    const label = element("span");
    label.textContent = option.label;
    const fee = element("b");
    const amount = baggageFeeForFare(option, fareId);
    fee.textContent = amount === 0 ? "Included" : `+${amount} EUR`;
    const actions = element("div", "vira-bag-actions");
    const one = element("button");
    one.type = "button";
    one.textContent = `P${activePassenger + 1}`;
    one.addEventListener("click", () => dispatch({ event: "baggage.select", payload: { passengerIndex: activePassenger, optionId: option.id } }));
    const all = element("button");
    all.type = "button";
    all.textContent = "All travellers";
    all.addEventListener("click", () => dispatch({ event: "baggage.select", payload: { applyToAll: true, optionId: option.id } }));
    actions.append(one, all);
    card.append(kilo, label, fee, actions);
    grid.append(card);
  }
  host.append(grid);
}

function renderExtras(host: HTMLElement, state: RuntimeState, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "extras", "Protection and trip extras", "Nothing is pre-selected. Add only what is useful for this journey."));
  const count = passengerCount(state, seed.input.passengers);
  const fareId = text(state.plan.state["fare-bundle"]);
  let insuranceId = text(state.plan.state["insurance-id"], "none");
  const selectedExtras = new Set(strings(state.plan.state.extras));
  const title = element("div", "vira-section-title");
  title.innerHTML = "<strong>Travel protection</strong><span>Per traveller</span>";
  host.append(title);
  const insuranceGrid = element("div", "vira-insurance-grid");
  const insuranceButtons = new Map<string, HTMLButtonElement>();
  const refreshInsurance = () => insuranceButtons.forEach((button, id) => button.classList.toggle("selected", id === insuranceId));
  for (const option of INSURANCE_OPTIONS) {
    const card = element("button", "vira-insurance-option");
    card.type = "button";
    const name = element("strong");
    name.textContent = option.name;
    const copy = element("span");
    copy.textContent = option.copy;
    const fee = element("b");
    fee.textContent = option.feePerPassenger === 0 ? "No charge" : `+${option.feePerPassenger * count} EUR`;
    card.append(name, copy, fee);
    card.addEventListener("click", () => { insuranceId = option.id; refreshInsurance(); });
    insuranceButtons.set(option.id, card);
    insuranceGrid.append(card);
  }
  refreshInsurance();
  host.append(insuranceGrid);
  const extraTitle = element("div", "vira-section-title");
  extraTitle.innerHTML = "<strong>Make the airport easier</strong><span>Toggle any extras</span>";
  host.append(extraTitle);
  const extraGrid = element("div", "vira-extra-grid");
  for (const option of EXTRA_OPTIONS) {
    const card = element("button", `vira-extra-option${selectedExtras.has(option.id) ? " selected" : ""}`);
    card.type = "button";
    const name = element("strong");
    name.textContent = option.name;
    const copy = element("span");
    copy.textContent = option.copy;
    const fee = element("b");
    const amount = extraFeeForFare(option, fareId) * count;
    fee.textContent = amount === 0 ? "Included" : `+${amount} EUR`;
    card.append(name, copy, fee);
    card.addEventListener("click", () => {
      if (selectedExtras.has(option.id)) selectedExtras.delete(option.id); else selectedExtras.add(option.id);
      card.classList.toggle("selected", selectedExtras.has(option.id));
    });
    extraGrid.append(card);
  }
  host.append(extraGrid);
  const continueButton = element("button", "vira-primary-button");
  continueButton.type = "button";
  continueButton.textContent = "Review the whole trip";
  continueButton.addEventListener("click", () => dispatch({ event: "extras.submit", payload: { insuranceId, extras: Array.from(selectedExtras) } }));
  host.append(continueButton);
}

function summaryRow(labelText: string, valueText: string): HTMLElement {
  const row = element("div", "vira-summary-row");
  const label = element("span");
  label.textContent = labelText;
  const value = element("strong");
  value.textContent = valueText;
  row.append(label, value);
  return row;
}

function renderReview(host: HTMLElement, state: RuntimeState, offer: JsonObject, seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.append(flowHeader(state, "review", "Everything in one place", "Review the complete trip before handing off to the airline checkout."));
  const currency = text(offer.currency, "EUR");
  const passengers = objects(state.plan.state["passenger-details"]);
  const seats = objects(state.plan.state["seat-selections"]);
  const baggage = objects(state.plan.state["baggage-selections"]);
  const insurance = insuranceById(state.plan.state["insurance-id"]);
  const extras = strings(state.plan.state.extras);
  const fare = fareById(state.plan.state["fare-bundle"]);
  const layout = element("div", "vira-review-layout");
  const main = element("div", "vira-review-main");
  const trip = element("section", "vira-review-section hero");
  const route = element("div", "vira-review-route");
  const routeText = element("div");
  const cities = element("strong");
  cities.textContent = `${text(offer.origin, "—")} → ${text(offer.destination, "—")}`;
  const flight = element("span");
  flight.textContent = `${text(offer.flightNumber, "Flight")} · ${text(offer.departure, "—")}–${text(offer.arrival, "—")} · ${text(offer.duration)}`;
  routeText.append(cities, flight);
  const farePill = element("span", "vira-fare-pill");
  farePill.textContent = fare?.name ?? "Fare";
  route.append(routeText, farePill);
  trip.append(route);
  main.append(trip);
  const travellers = element("section", "vira-review-section");
  const travellersTitle = element("strong");
  travellersTitle.textContent = "Travellers";
  travellers.append(travellersTitle);
  const count = passengerCount(state, seed.input.passengers);
  for (let index = 0; index < count; index += 1) {
    const person = passengers[index];
    const seat = seats.find((entry) => entry.passengerIndex === index);
    const bag = baggage.find((entry) => entry.passengerIndex === index);
    travellers.append(summaryRow(`${text(person?.firstName, "Traveller")} ${text(person?.lastName, String(index + 1))}`, `${text(seat?.seat, "No seat")} · ${number(bag?.kilograms)}kg bag`));
  }
  main.append(travellers);
  const services = element("section", "vira-review-section");
  const servicesTitle = element("strong");
  servicesTitle.textContent = "Protection & extras";
  services.append(servicesTitle, summaryRow("Insurance", insurance?.name ?? "None"), summaryRow("Extras", extras.length > 0 ? extras.join(", ") : "None"));
  main.append(services);
  const aside = element("aside", "vira-price-breakdown");
  const priceTitle = element("strong");
  priceTitle.textContent = "Price breakdown";
  aside.append(priceTitle);
  const fareTotal = number(state.plan.state["fare-total"], number(offer.price));
  const seatTotal = seats.reduce((sum, entry) => sum + number(entry.fee), 0);
  const baggageTotal = baggage.reduce((sum, entry) => sum + number(entry.fee), 0);
  const insuranceTotal = number(state.plan.state["insurance-total"]);
  const extrasTotal = number(state.plan.state["extras-total"]);
  aside.append(summaryRow("Flight + fare", money(fareTotal, currency)), summaryRow("Seats", money(seatTotal, currency)), summaryRow("Baggage", money(baggageTotal, currency)), summaryRow("Insurance", money(insuranceTotal, currency)), summaryRow("Extras", money(extrasTotal, currency)));
  const grand = element("div", "vira-grand-total");
  const grandLabel = element("span");
  grandLabel.textContent = `Total for ${count} traveller${count === 1 ? "" : "s"}`;
  const grandValue = element("strong");
  grandValue.textContent = money(totalPrice(state), currency);
  grand.append(grandLabel, grandValue);
  aside.append(grand);
  const button = element("button", "vira-primary-button");
  button.type = "button";
  button.textContent = "Continue to secure payment";
  button.addEventListener("click", () => dispatch({ event: "booking.handoff", payload: {} }));
  const note = element("p", "vira-payment-boundary-note");
  note.textContent = "This demo stops at the airline checkout boundary. It does not charge a card or create a booking reference.";
  aside.append(button, note);
  layout.append(main, aside);
  host.append(layout);
}

function renderHandoff(host: HTMLElement, state: RuntimeState): void {
  host.append(flowHeader(state, "review", "Ready for airline checkout", "Vira completed the reservation configuration and produced a secure handoff payload."));
  const card = element("div", "vira-handoff-card");
  const mark = element("div", "vira-handoff-mark");
  mark.textContent = "→";
  const copy = element("div");
  const title = element("strong");
  title.textContent = "Checkout handoff is ready";
  const detail = element("p");
  detail.textContent = `${money(totalPrice(state))} · passenger, fare, seat, baggage, insurance and extras are assembled in the active Vira state.`;
  const note = element("span");
  note.textContent = "A production airline integration would exchange this state for the airline checkout/session token. No payment or booking reference is fabricated here.";
  copy.append(title, detail, note);
  card.append(mark, copy);
  host.append(card);
}

function renderBookingFlow(host: HTMLElement, state: RuntimeState, offers: readonly JsonObject[], seed: AirlineFlightExperienceSeed, dispatch: Dispatch): void {
  host.replaceChildren();
  const offer = selectedOffer(offers, state);
  if (!offer) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const step = text(state.plan.state["booking-step"], "fare");
  if (step === "fare") renderFare(host, state, offer, seed, dispatch);
  else if (step === "passengers") renderPassengers(host, state, seed, dispatch);
  else if (step === "seats") renderSeats(host, state, seed, dispatch);
  else if (step === "baggage") renderBaggage(host, state, seed, dispatch);
  else if (step === "extras") renderExtras(host, state, seed, dispatch);
  else if (step === "review") renderReview(host, state, offer, seed, dispatch);
  else if (step === "handoff") renderHandoff(host, state);
}

function readOffers(state: RuntimeState): JsonObject[] {
  const raw = state.plan.state["flight-results"];
  if (raw === undefined) return [];
  const parsed = parseDomainData(raw);
  if (!parsed.ok) return [];
  const data = object(parsed.value.data);
  return data && Array.isArray(data.offers) ? objects(data.offers) : [];
}

export function createAirlineViraDomController(container: HTMLElement, seed: AirlineFlightExperienceSeed): AirlineViraDomController {
  let dispatch: Dispatch = () => undefined;
  let searchHost: HTMLElement | undefined;
  let resultsHost: HTMLElement | undefined;
  let bookingHost: HTMLElement | undefined;

  function mountBinding(parent: HTMLElement, binding: RenderCapabilityBinding): HTMLElement {
    if (binding.component === "pegasus.component.flight-search") {
      const host = element("div");
      searchHost = host;
      renderSearch(host, seed, dispatch);
      parent.append(host);
      return host;
    }
    if (binding.component === "pegasus.component.flight-results") {
      const host = element("div");
      resultsHost = host;
      parent.append(host);
      return host;
    }
    if (binding.component === "pegasus.component.booking-flow") {
      const host = element("section", "vira-booking-flow");
      host.hidden = true;
      bookingHost = host;
      parent.append(host);
      return host;
    }
    throw new Error(`Unsupported airline component mapping: ${binding.component}`);
  }

  const port: RuntimeWebDomPort = {
    measureContainerInlineSizePx() {
      return container.getBoundingClientRect().width || 680;
    },
    begin(context: RuntimeWebDomBeginContext): RuntimeWebDomRoot {
      const fragment = document.createDocumentFragment();
      const nodes: HTMLElement[] = [];
      let committed = false;
      return {
        createRegion(region) {
          const regionElement = element("div", `vira-region vira-region-${region.role}`);
          fragment.append(regionElement);
          return {
            mountComponent(binding) {
              const node = mountBinding(regionElement, binding);
              nodes.push(node);
              return { dispose() { node.remove(); } };
            },
          };
        },
        commit() {
          container.replaceChildren(fragment);
          container.dataset.mode = context.mode;
          committed = true;
        },
        dispose() {
          for (const node of [...nodes].reverse()) node.remove();
          if (committed) container.replaceChildren();
          searchHost = undefined;
          resultsHost = undefined;
          bookingHost = undefined;
        },
      };
    },
  };

  return {
    port,
    bindDispatch(next) {
      dispatch = (event) => next(event);
      if (searchHost) renderSearch(searchHost, seed, dispatch);
    },
    renderState(state) {
      const offers = readOffers(state);
      if (resultsHost) renderResults(resultsHost, state, offers, seed, dispatch);
      if (bookingHost) renderBookingFlow(bookingHost, state, offers, seed, dispatch);
    },
    showError(message) {
      const error = element("div", "flight-error");
      error.textContent = message;
      container.replaceChildren(error);
    },
  };
}

export const createPegasusViraDomController = createAirlineViraDomController;

function previewSeed(props: Readonly<Record<string, unknown>>): AirlineFlightExperienceSeed {
  const passengers = Math.min(8, Math.max(1, Math.round(number(props.passengers, 2))));
  const origin = text(props.origin, "SAW").toUpperCase();
  const destination = text(props.destination, "BER").toUpperCase();
  const departureDate = text(props.departure, text(props["departure-date"], "2026-09-15"));
  const result = searchFlights({ origin, destination, departureDate, passengers });
  return {
    input: {
      origin: result.origin,
      destination: result.destination,
      departureDate: result.departureDate,
      passengers: result.passengers,
    },
    data: { offers: result.offers },
  };
}

function previewState(step: string, seed: AirlineFlightExperienceSeed, props: Readonly<Record<string, unknown>>): RuntimeState {
  const fare = text(props.fare, "smart");
  const count = seed.input.passengers;
  const selected = seed.data.offers[0];
  const fareOption = fareById(fare) ?? FARE_OPTIONS[1];
  const base = selected?.price ?? 138;
  // Keep previews genuinely interactive: for multi-traveller examples show one
  // selected seat while leaving the next traveller available for selection.
  const previewSeatCount = count > 1 ? 1 : 0;
  const seatSelections = Array.from({ length: previewSeatCount }, (_, passengerIndex) => ({
    passengerIndex,
    seat: "4A",
    fee: 18,
  }));
  const baggageSelections = Array.from({ length: count }, (_, index) => ({ passengerIndex: index, optionId: "20kg", kilograms: 20, fee: baggageFeeForFare(BAGGAGE_OPTIONS[2], fare) }));
  const state = {
    passengers: count,
    "selected-offer": selected?.id,
    "booking-step": step,
    "fare-bundle": fare,
    "fare-total": base + (fareOption?.perPassengerExtra ?? 0) * count,
    "passenger-details": Array.from({ length: count }, (_, index) => ({ firstName: index === 0 ? "Alex" : "Sam", lastName: "Traveller" })),
    "seat-selections": seatSelections,
    "baggage-selections": baggageSelections,
    "insurance-id": "travel",
    "insurance-total": 12 * count,
    extras: ["priority"],
    "extras-total": 9 * count,
  };
  return { plan: { state } } as unknown as RuntimeState;
}

const studioEventByRuntimeEvent: Readonly<Record<string, string>> = Object.freeze({
  "search.submit": "submit",
  "offer.select": "select",
  "fare.select": "select",
  "passenger.submit": "submit",
  "seat.select": "select",
  "baggage.select": "select",
  "extras.submit": "submit",
  "booking.handoff": "continue",
});

export function mountAirlineStudioComponent(
  host: HTMLElement,
  component: string,
  props: Readonly<Record<string, unknown>>,
  emit: (event: string, payload?: unknown) => void = () => undefined,
): () => void {
  const seed = previewSeed(props);
  const runtimeDispatch: Dispatch = ({ event, payload }) => emit(studioEventByRuntimeEvent[event] ?? event, payload);
  host.replaceChildren();
  if (component === AIRLINE_STUDIO_COMPONENTS.flightSearch) {
    const shell = element("div", "vira-experience standalone-brand-component");
    renderSearch(shell, seed, runtimeDispatch);
    host.append(shell);
  } else if (component === AIRLINE_STUDIO_COMPONENTS.flightResults) {
    const shell = element("div", "vira-experience standalone-brand-component");
    renderResults(shell, previewState("search", seed, props), seed.data.offers as unknown as JsonObject[], seed, runtimeDispatch);
    host.append(shell);
  } else {
    const stepByComponent: Readonly<Record<string, string>> = {
      [AIRLINE_STUDIO_COMPONENTS.fareComparison]: "fare",
      [AIRLINE_STUDIO_COMPONENTS.travellerDetails]: "passengers",
      [AIRLINE_STUDIO_COMPONENTS.seatMap]: "seats",
      [AIRLINE_STUDIO_COMPONENTS.baggageSelector]: "baggage",
      [AIRLINE_STUDIO_COMPONENTS.extrasSelector]: "extras",
      [AIRLINE_STUDIO_COMPONENTS.bookingReview]: "review",
    };
    const step = stepByComponent[component];
    if (!step) throw new Error(`Unknown airline Studio component: ${component}`);
    const shell = element("section", "vira-booking-flow standalone-brand-component");
    const offers = seed.data.offers as unknown as JsonObject[];
    renderBookingFlow(shell, previewState(step, seed, props), offers, seed, runtimeDispatch);
    host.append(shell);
  }
  return () => host.replaceChildren();
}
