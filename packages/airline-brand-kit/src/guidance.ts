import {
  DEFAULT_MOCK_RUNTIME_INPUT,
  airportByCode,
  getMissedFlightGuidance,
  getSpecialAssistanceGuidance,
  getVisaGuidance,
} from "@vira-enterprise-genui/mock-airline-domain";
import type {
  RenderCapabilityBinding,
  RuntimeWebDomBeginContext,
  RuntimeWebDomPort,
  RuntimeWebDomRoot,
  ViraGenUIEventMap,
} from "@vira-enterprise-genui/runtime-web";

export type AirlineGuidanceExperience =
  | "advisory.special-assistance"
  | "policy.missed-flight"
  | "compliance.visa-check";

export interface AirlineGuidanceResult {
  readonly experience: AirlineGuidanceExperience;
  readonly input: Readonly<{
    originCountry?: string;
    destinationCountry?: string;
    nationality?: string;
    passportIssuer?: string;
    residence?: string;
  }>;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface AirlineGuidanceController {
  readonly port: RuntimeWebDomPort;
  bindDispatch(dispatch: (event: unknown) => void): void;
  renderState(state: ViraGenUIEventMap["statechange"]): void;
  showError(message: string): void;
}

type RuntimeState = ViraGenUIEventMap["statechange"];
type Dispatch = (event: { readonly event: string; readonly payload?: Readonly<Record<string, unknown>> }) => void;

export const AIRLINE_GUIDANCE_STUDIO_COMPONENTS = Object.freeze({
  specialAssistance: "airline.component.special-assistance",
  missedFlight: "airline.component.missed-flight",
  visaCheck: "airline.component.visa-check",
} as const);

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    return item ? [item] : [];
  });
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(tag: K, value: string, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

function createHeader(kicker: string, title: string, summary: string, chip: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const top = document.createElement("div");
  top.className = "guidance-top";
  const left = document.createElement("div");
  left.append(createTextElement("span", kicker, "guidance-kicker"), createTextElement("strong", title));
  top.append(left, createTextElement("span", chip, "guidance-chip"));
  fragment.append(top, createTextElement("p", summary, "guidance-summary"));
  return fragment;
}

function appendList(parent: HTMLElement, values: readonly string[]): void {
  const list = document.createElement("ul");
  for (const value of values) list.append(createTextElement("li", value));
  parent.append(list);
}

function renderAssistance(host: HTMLElement, result: AirlineGuidanceResult, state: RuntimeState, dispatch: Dispatch): void {
  host.append(createHeader(
    "Special assistance",
    "Travel with mobility support",
    text(result.data.summary) ?? "Choose the assistance level that best matches the passenger's mobility needs.",
    "Action recommended",
  ));

  const highlight = document.createElement("div");
  highlight.className = "guidance-highlight";
  highlight.append(
    createTextElement("span", "When to request"),
    createTextElement("strong", text(result.data.deadline) ?? "Request as early as possible before departure"),
  );
  host.append(highlight);

  const selected = text(state.plan.state["assistance-type"]);
  const grid = document.createElement("div");
  grid.className = "guidance-choice-grid assistance-grid";
  for (const item of records(result.data.types)) {
    const id = text(item.id);
    if (!id) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `guidance-choice${selected === id ? " selected" : ""}`;
    button.append(
      createTextElement("b", id),
      createTextElement("strong", text(item.title) ?? id),
      createTextElement("span", text(item.copy) ?? "Assistance option"),
    );
    button.addEventListener("click", () => dispatch({ event: "assistance.select", payload: { assistanceType: id } }));
    grid.append(button);
  }
  host.append(grid);

  const notes = document.createElement("div");
  notes.className = "guidance-notes";
  notes.append(createTextElement("strong", "Before you travel"));
  appendList(notes, strings(result.data.notes));
  host.append(notes);

  const action = createTextElement("button", selected ? `Continue with ${selected}` : "Choose an assistance type", "guidance-primary");
  action.type = "button";
  action.disabled = !selected;
  action.addEventListener("click", () => dispatch({ event: "guidance.handoff", payload: { kind: "special-assistance" } }));
  host.append(action);

  if (text(state.plan.state["guidance-handoff"]) === "special-assistance") {
    host.append(createTextElement("div", "Assistance details are ready for an airline support/booking integration. No request has been submitted in this demo.", "guidance-handoff"));
  }
}

function renderPolicy(host: HTMLElement, result: AirlineGuidanceResult, state: RuntimeState, dispatch: Dispatch): void {
  host.append(createHeader(
    "Travel policy",
    "If you miss your flight",
    text(result.data.summary) ?? "What happens depends on when and where the journey is interrupted.",
    "Scenario guide",
  ));

  const scenarios = records(result.data.scenarios);
  const selected = text(state.plan.state["policy-scenario"]) ?? text(scenarios[0]?.id) ?? "no-show";
  const tabs = document.createElement("div");
  tabs.className = "guidance-tabs";
  for (const scenario of scenarios) {
    const id = text(scenario.id);
    if (!id) continue;
    const button = createTextElement("button", text(scenario.label) ?? id);
    button.type = "button";
    button.className = selected === id ? "active" : "";
    button.addEventListener("click", () => dispatch({ event: "policy.select", payload: { scenario: id } }));
    tabs.append(button);
  }
  host.append(tabs);

  const scenario = scenarios.find((item) => item.id === selected) ?? scenarios[0];
  if (scenario) {
    const panel = document.createElement("div");
    panel.className = "guidance-policy-panel";
    panel.append(createTextElement("strong", text(scenario.title) ?? "What happens"));
    appendList(panel, strings(scenario.points));
    const next = document.createElement("div");
    next.className = "guidance-next";
    next.append(
      createTextElement("span", "Best next step"),
      createTextElement("strong", text(scenario.nextAction) ?? "Check your current fare rules and contact the airline if needed."),
    );
    panel.append(next);
    host.append(panel);
  }

  const actions = document.createElement("div");
  actions.className = "guidance-actions";
  const rules = createTextElement("button", "Check fare rules", "guidance-secondary");
  rules.type = "button";
  rules.addEventListener("click", () => dispatch({ event: "guidance.handoff", payload: { kind: "fare-rules" } }));
  const rebook = createTextElement("button", "Start a new flight search", "guidance-primary");
  rebook.type = "button";
  rebook.addEventListener("click", () => dispatch({ event: "guidance.handoff", payload: { kind: "new-search" } }));
  actions.append(rules, rebook);
  host.append(actions);

  const handoff = text(state.plan.state["guidance-handoff"]);
  if (handoff) {
    host.append(createTextElement("div", handoff === "new-search" ? "A production host would open a new-search flow from here." : "A production host would resolve the selected ticket's live fare rules here.", "guidance-handoff"));
  }
}

function renderVisa(host: HTMLElement, result: AirlineGuidanceResult, state: RuntimeState, dispatch: Dispatch): void {
  const destination = result.input.destinationCountry || "your destination";
  host.append(createHeader(
    "Entry requirements",
    `Check travel documents for ${destination}`,
    text(result.data.summary) ?? "Entry rules depend on the traveler's documents, not only the departure country.",
    "Official check required",
  ));

  if ((text(state.plan.state["visa-status"]) ?? "collecting") === "collecting") {
    const form = document.createElement("form");
    form.className = "guidance-visa-form";
    const route = document.createElement("div");
    route.className = "guidance-route";
    route.append(createTextElement("span", "Travel"), createTextElement("strong", `${result.input.originCountry || "Origin"} → ${destination}`));
    form.append(route);

    const definitions = [
      ["nationality", "Nationality", result.input.nationality ?? "", "e.g. TUR"],
      ["passportIssuer", "Passport issued by", result.input.passportIssuer ?? "", "e.g. TR"],
      ["residence", "Country of residence", result.input.residence ?? "", "e.g. TUR"],
    ] as const;
    const inputs = new Map<string, HTMLInputElement>();
    for (const [name, labelText, initial, placeholder] of definitions) {
      const label = document.createElement("label");
      label.append(createTextElement("span", labelText));
      const input = document.createElement("input");
      input.name = name;
      input.value = initial;
      input.placeholder = placeholder;
      input.required = true;
      label.append(input);
      inputs.set(name, input);
      form.append(label);
    }

    const submit = createTextElement("button", "Prepare official visa check", "guidance-primary");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      dispatch({
        event: "visa.submit",
        payload: {
          nationality: inputs.get("nationality")?.value.trim() ?? "",
          passportIssuer: inputs.get("passportIssuer")?.value.trim() ?? "",
          residence: inputs.get("residence")?.value.trim() ?? "",
        },
      });
    });
    host.append(form);
  } else {
    const profile = record(state.plan.state["visa-profile"]);
    const panel = document.createElement("div");
    panel.className = "guidance-visa-result";
    const status = document.createElement("div");
    status.className = "guidance-status-line";
    status.append(createTextElement("span", "Result"), createTextElement("strong", "Official verification required"));
    panel.append(
      status,
      createTextElement("p", "The demo collected the traveler context, but it has no authorized Timatic or immigration-rule API. It will not guess whether a visa is required."),
    );
    const facts = document.createElement("div");
    facts.className = "guidance-facts";
    const rows = [
      ["Nationality", text(profile?.nationality) ?? "—"],
      ["Passport issuer", text(profile?.passportIssuer) ?? "—"],
      ["Residence", text(profile?.residence) ?? "—"],
      ["Destination", destination],
    ] as const;
    for (const [labelText, valueText] of rows) {
      const row = document.createElement("div");
      row.append(createTextElement("span", labelText), createTextElement("strong", valueText));
      facts.append(row);
    }
    panel.append(facts);
    const verify = createTextElement("button", "Continue to official verification", "guidance-primary");
    verify.type = "button";
    verify.addEventListener("click", () => dispatch({ event: "guidance.handoff", payload: { kind: "visa-official" } }));
    panel.append(verify);
    host.append(panel);
  }

  if (text(state.plan.state["guidance-handoff"]) === "visa-official") {
    host.append(createTextElement("div", "Official verification handoff is ready. No external visa database is connected in this demo.", "guidance-handoff"));
  }
}

function renderGuidance(host: HTMLElement, result: AirlineGuidanceResult, state: RuntimeState, dispatch: Dispatch): void {
  host.replaceChildren();
  if (result.experience === "advisory.special-assistance") renderAssistance(host, result, state, dispatch);
  else if (result.experience === "policy.missed-flight") renderPolicy(host, result, state, dispatch);
  else renderVisa(host, result, state, dispatch);
}

export function createAirlineGuidanceController(container: HTMLElement, result: AirlineGuidanceResult): AirlineGuidanceController {
  let dispatch: Dispatch = () => undefined;
  let guidanceHost: HTMLElement | undefined;

  function mountBinding(parent: HTMLElement, binding: RenderCapabilityBinding): HTMLElement {
    if (binding.component !== "airline.component.guidance") throw new Error("Unsupported guidance component mapping");
    const host = document.createElement("section");
    host.className = "vira-guidance";
    guidanceHost = host;
    parent.append(host);
    return host;
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
          const regionElement = document.createElement("div");
          regionElement.className = `vira-region vira-region-${region.role}`;
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
          guidanceHost = undefined;
        },
      };
    },
  };

  return {
    port,
    bindDispatch(next) { dispatch = (event) => next(event); },
    renderState(state) {
      if (guidanceHost) renderGuidance(guidanceHost, result, state, dispatch);
    },
    showError(message) {
      container.replaceChildren(createTextElement("div", message, "flight-error"));
    },
  };
}

function previewResult(component: string, props: Readonly<Record<string, unknown>>): AirlineGuidanceResult {
  if (component === AIRLINE_GUIDANCE_STUDIO_COMPONENTS.specialAssistance) {
    const source = getSpecialAssistanceGuidance();
    return {
      experience: "advisory.special-assistance",
      input: {},
      data: {
        ...source,
        summary: text(props.summary) ?? source.summary,
        deadline: text(props.deadline) ?? source.deadline,
      },
    };
  }
  if (component === AIRLINE_GUIDANCE_STUDIO_COMPONENTS.missedFlight) {
    const source = getMissedFlightGuidance();
    const nextAction = text(props["next-action"]);
    const scenarios = records(source.scenarios).map((scenario, index) => (
      index === 0 && nextAction ? { ...scenario, nextAction } : scenario
    ));
    return {
      experience: "policy.missed-flight",
      input: {},
      data: {
        ...source,
        summary: text(props.summary) ?? source.summary,
        scenarios,
      },
    };
  }

  const defaultOrigin = airportByCode(DEFAULT_MOCK_RUNTIME_INPUT.origin)?.country;
  const defaultDestination = airportByCode(DEFAULT_MOCK_RUNTIME_INPUT.destination)?.country;
  const originCountry = text(props["origin-country"]) ?? defaultOrigin;
  const destinationCountry = text(props["destination-country"]) ?? defaultDestination;
  const source = getVisaGuidance({
    ...(originCountry ? { originCountry } : {}),
    ...(destinationCountry ? { destinationCountry } : {}),
  });
  return {
    experience: "compliance.visa-check",
    input: {
      ...(originCountry ? { originCountry } : {}),
      ...(destinationCountry ? { destinationCountry } : {}),
    },
    data: {
      ...source,
      summary: text(props.summary) ?? source.summary,
    },
  };
}

function previewState(result: AirlineGuidanceResult): RuntimeState {
  const firstScenario = records(result.data.scenarios)[0];
  return {
    plan: {
      state: {
        "guidance-type": result.experience,
        "assistance-type": "",
        "policy-scenario": result.experience === "policy.missed-flight" ? text(firstScenario?.id) ?? "" : "",
        "visa-status": "collecting",
        "guidance-handoff": "",
      },
    },
  } as unknown as RuntimeState;
}

const studioEventByRuntimeEvent: Readonly<Record<string, string>> = Object.freeze({
  "assistance.select": "select",
  "policy.select": "select",
  "visa.submit": "submit",
  "guidance.handoff": "continue",
});

export function mountAirlineGuidanceStudioComponent(
  host: HTMLElement,
  component: string,
  props: Readonly<Record<string, unknown>>,
  emit: (event: string, payload?: unknown) => void = () => undefined,
): () => void {
  const result = previewResult(component, props);
  const shell = document.createElement("section");
  shell.className = "vira-guidance";
  host.replaceChildren(shell);
  renderGuidance(shell, result, previewState(result), ({ event, payload }) => emit(studioEventByRuntimeEvent[event] ?? event, payload));
  return () => host.replaceChildren();
}
