import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  zodSchema,
  type UIMessage,
} from "ai";
import {
  getMissedFlightGuidance,
  getSpecialAssistanceGuidance,
  getVisaGuidance,
  searchFlights,
} from "@vira-enterprise-genui/mock-airline-domain";
import { z } from "zod";

const flightSearchSchema = z.object({
  origin: z.string().min(3).max(64).describe("Origin airport code or city"),
  destination: z.string().min(3).max(64).describe("Destination airport code or city"),
  departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
  passengers: z.number().int().min(1).max(8).default(1),
});

const viraExperienceSchema = z.object({
  experience: z.literal("travel.flight.search"),
  input: flightSearchSchema,
});

const viraGuidanceSchema = z.object({
  experience: z.enum([
    "advisory.special-assistance",
    "policy.missed-flight",
    "compliance.visa-check",
  ]),
  input: z.object({
    originCountry: z.string().optional(),
    destinationCountry: z.string().optional(),
    nationality: z.string().optional(),
    passportIssuer: z.string().optional(),
    residence: z.string().optional(),
  }).default({}),
});

const viraCommandSchema = z.object({
  command: z.enum([
    "select-cheapest",
    "select-fare",
    "set-baggage-all",
    "set-insurance",
    "add-extra",
    "set-seat-zone",
  ]),
  value: z.string().optional().describe(
    "Command value when required: fare light|smart|flex, baggage none|15kg|20kg|25kg, insurance none|travel|flex-plus, extra priority|fast-track|meal|sms, or seat zone front|extra-legroom|standard",
  ),
});

type GuidanceExperience = z.infer<typeof viraGuidanceSchema>["experience"];
type GuidanceInput = z.infer<typeof viraGuidanceSchema>["input"];

function guidanceData(experience: GuidanceExperience, input: GuidanceInput): Readonly<Record<string, unknown>> {
  if (experience === "advisory.special-assistance") return getSpecialAssistanceGuidance();
  if (experience === "policy.missed-flight") return getMissedFlightGuidance();
  return getVisaGuidance(input);
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY is required for the real LLM demo." },
      { status: 500 },
    );
  }

  const body = await request.json() as { messages?: UIMessage[] };
  if (!Array.isArray(body.messages)) {
    return Response.json({ error: "messages must be an array" }, { status: 400 });
  }

  const provider = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
  });
  const model = provider(process.env.OPENAI_MODEL ?? "gpt-5.6-luna");

  const result = streamText({
    model,
    system: [
      "You are the customer-facing airline assistant in a real web chat.",
      "Be concise, warm, and transactional. Never mention implementation details, schemas, internal mocks, or developer concepts.",
      "Operational facts shown in interactive experiences must come from the airline domain tool result. Never invent flight numbers, schedules, prices, availability, fare options, seat inventory, baggage prices, extras, or policy facts.",
      "Use Vira interactive experiences when structured interaction is more useful than a long paragraph.",
      "For wheelchair, reduced-mobility, or airport special-assistance questions, call vira_present_guidance with experience advisory.special-assistance. Do not write the full policy as plain text.",
      "For missed-flight, no-show, missed connection, or what-happens-if-I-miss-my-flight questions, call vira_present_guidance with experience policy.missed-flight. Do not dump a long policy paragraph in chat.",
      "For visa, entry-requirement, or travel-document questions, call vira_present_guidance with experience compliance.visa-check. Pass originCountry and destinationCountry when the user supplied them. Pass nationality, passportIssuer, or residence only when the user explicitly supplied them; never guess those identity details.",
      "After presenting a guidance experience, add at most one short sentence telling the user to use the interactive card below.",
      "For other ordinary airline questions, answer naturally in chat unless another Vira experience is available.",
      "When the user wants to search or compare flights and you know origin, destination, departure date, and passenger count, call vira_present_experience with experience travel.flight.search.",
      "If a required flight-search field is missing, ask one short follow-up question instead of guessing.",
      "When an interactive flight booking experience is already present in the conversation and the user asks to act on it, call vira_interact instead of only describing what they should click.",
      "Map 'cheapest' to select-cheapest.",
      "Map Light, Smart, or Flex fare requests to select-fare with value light, smart, or flex.",
      "Map baggage requests for everyone to set-baggage-all with one of none, 15kg, 20kg, or 25kg.",
      "Map insurance requests to set-insurance with none, travel, or flex-plus.",
      "Map priority boarding, fast track, meal, or SMS requests to add-extra with priority, fast-track, meal, or sms.",
      "Map front, extra-legroom, or standard seat preferences to set-seat-zone with front, extra-legroom, or standard.",
      "After calling vira_interact, acknowledge the change briefly. Do not tell the user to click the option you just applied and do not guess or restate a price; the mounted Vira experience is the source of truth for the current total.",
      "After presenting a new booking experience, briefly tell the user that the interactive booking flow is available below.",
    ].join("\n"),
    messages: await convertToModelMessages(body.messages),
    stopWhen: stepCountIs(5),
    tools: {
      vira_present_experience: tool({
        description: "Search the airline domain and present a Vira interactive airline booking experience inside the chat.",
        inputSchema: zodSchema(viraExperienceSchema),
        execute: async ({ experience, input }) => {
          const result = searchFlights(input);
          return {
            version: "1" as const,
            kind: "vira.experience" as const,
            experience,
            input: {
              origin: result.origin,
              destination: result.destination,
              departureDate: result.departureDate,
              passengers: result.passengers,
            },
            data: { offers: result.offers },
          };
        },
      }),
      vira_present_guidance: tool({
        description: "Read the airline domain guidance data and present it as an interactive Vira experience.",
        inputSchema: zodSchema(viraGuidanceSchema),
        execute: async ({ experience, input }) => ({
          version: "1" as const,
          kind: "vira.experience" as const,
          experience,
          input: Object.fromEntries(
            Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
          ),
          data: guidanceData(experience, input),
        }),
      }),
      vira_interact: tool({
        description: "Send an action to the currently mounted Vira airline booking experience in the chat.",
        inputSchema: zodSchema(viraCommandSchema),
        execute: async ({ command, value }) => ({
          version: "1" as const,
          kind: "vira.command" as const,
          command,
          ...(value === undefined ? {} : { value }),
        }),
      }),
    },
  });

  return result.toUIMessageStreamResponse({ originalMessages: body.messages });
}
