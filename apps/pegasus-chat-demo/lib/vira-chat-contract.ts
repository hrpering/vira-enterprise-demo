export interface FlightOffer {
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
}

export interface ViraFlightExperienceResult {
  readonly version: "1";
  readonly kind: "vira.experience";
  readonly experience: "travel.flight.search";
  readonly input: {
    readonly origin: string;
    readonly destination: string;
    readonly departureDate: string;
    readonly passengers: number;
  };
  readonly data: {
    readonly offers: readonly FlightOffer[];
  };
}

export type ViraChatCommand =
  | "select-cheapest"
  | "select-fare"
  | "set-baggage-all"
  | "set-insurance"
  | "add-extra"
  | "set-seat-zone";

export interface ViraCommandResult {
  readonly version: "1";
  readonly kind: "vira.command";
  readonly command: ViraChatCommand;
  readonly value?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFlightOffer(value: unknown): value is FlightOffer {
  if (!isRecord(value)) return false;
  return typeof value.id === "string"
    && typeof value.carrier === "string"
    && typeof value.flightNumber === "string"
    && typeof value.origin === "string"
    && typeof value.destination === "string"
    && typeof value.departure === "string"
    && typeof value.arrival === "string"
    && typeof value.duration === "string"
    && typeof value.price === "number"
    && Number.isFinite(value.price)
    && typeof value.currency === "string";
}

export function isViraFlightExperienceResult(value: unknown): value is ViraFlightExperienceResult {
  if (!isRecord(value)) return false;
  if (value.version !== "1" || value.kind !== "vira.experience") return false;
  if (value.experience !== "travel.flight.search") return false;

  const input = value.input;
  const data = value.data;
  if (!isRecord(input) || !isRecord(data)) return false;
  if (typeof input.origin !== "string") return false;
  if (typeof input.destination !== "string") return false;
  if (typeof input.departureDate !== "string") return false;
  if (typeof input.passengers !== "number" || !Number.isInteger(input.passengers)) return false;

  const offers = data.offers;
  if (!Array.isArray(offers)) return false;
  return offers.every(isFlightOffer);
}

const commands = new Set<ViraChatCommand>([
  "select-cheapest",
  "select-fare",
  "set-baggage-all",
  "set-insurance",
  "add-extra",
  "set-seat-zone",
]);

export function isViraCommandResult(value: unknown): value is ViraCommandResult {
  if (!isRecord(value)) return false;
  if (value.version !== "1" || value.kind !== "vira.command") return false;

  const command = value.command;
  const commandValue = value.value;
  if (typeof command !== "string" || !commands.has(command as ViraChatCommand)) return false;
  return commandValue === undefined || typeof commandValue === "string";
}
