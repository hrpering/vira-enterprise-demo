"use client";

import {
  createActionAdapterContract,
  createComponentAdapterContract,
} from "@vira-enterprise-genui/adapter-sdk";
import { createAirlineGuidanceController } from "@vira-enterprise-genui/airline-brand-kit";
import { composeExperience } from "@vira-enterprise-genui/composer";
import { planExperience } from "@vira-enterprise-genui/planner";
import {
  ViraExperience,
  type ViraExperienceHandle,
} from "@vira-enterprise-genui/react";
import type {
  ViraGenUI,
  ViraGenUIEventMap,
} from "@vira-enterprise-genui/runtime-web";
import { defineToolkit } from "@assistant-ui/react";
import { useMemo, useRef, useState } from "react";
import {
  isViraGuidanceResult,
  type ViraGuidanceExperience,
  type ViraGuidanceResult,
} from "../lib/vira-guidance-contract";

const capability = (id: string) => ({ version: "1" as const, id });

const componentAdapterResult = createComponentAdapterContract({
  version: "1",
  id: "airline.guidance.components",
  mappings: [
    { capability: capability("display-airline-guidance"), component: "airline.component.guidance" },
  ],
});
if (!componentAdapterResult.ok) throw new Error("Invalid airline guidance component adapter");
const componentAdapter = componentAdapterResult.value;

const actionAdapterResult = createActionAdapterContract({
  version: "1",
  id: "airline.guidance.actions",
  mappings: [
    { event: "assistance.select", actionType: "travel.guidance.assistance.select" },
    { event: "policy.select", actionType: "travel.guidance.policy.select" },
    { event: "visa.submit", actionType: "travel.guidance.visa.submit" },
    { event: "guidance.handoff", actionType: "travel.guidance.handoff" },
  ],
});
if (!actionAdapterResult.ok) throw new Error("Invalid airline guidance action adapter");
const actionAdapter = actionAdapterResult.value;

const permissionPolicy = {
  version: "1",
  rules: [
    { subject: "action", id: "travel.guidance.assistance.select", effect: "allow" },
    { subject: "action", id: "travel.guidance.policy.select", effect: "allow" },
    { subject: "action", id: "travel.guidance.visa.submit", effect: "allow" },
    { subject: "action", id: "travel.guidance.handoff", effect: "allow" },
    { subject: "action", id: "runtime.patch.apply", effect: "allow" },
  ],
} as const;

const capabilityAllowlist = {
  version: "1",
  allowed: ["display-airline-guidance"],
} as const;

const componentAllowlist = {
  version: "1",
  allowed: ["airline.component.guidance"],
} as const;

const accessibility = {
  version: "1",
  focusOnMount: "first-primary",
  focusOnUpdate: "primary-if-lost",
  statusAnnouncements: "polite",
  errorAnnouncements: "assertive",
} as const;

const responsive = {
  version: "1",
  strategy: "container",
  bands: [
    { id: "compact", minInlineSizePx: 0 },
    { id: "regular", minInlineSizePx: 560 },
  ],
} as const;

const intentNameByExperience: Readonly<Record<ViraGuidanceExperience, string>> = Object.freeze({
  "advisory.special-assistance": "special-assistance",
  "policy.missed-flight": "missed-flight",
  "compliance.visa-check": "visa-check",
});

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function buildGuidanceExperience(result: ViraGuidanceResult) {
  const name = intentNameByExperience[result.experience];
  const planned = planExperience({
    id: `airline-guidance-${name}`,
    intent: { version: "1", namespace: "travel.guidance", name },
    state: {
      "guidance-type": result.experience,
      "assistance-type": "",
      "policy-scenario": result.experience === "policy.missed-flight" ? "no-show" : "",
      "visa-status": "collecting",
      "guidance-handoff": "",
    },
    requiredState: ["guidance-type"],
    capabilityRequirements: [],
    availableCapabilities: [capability("display-airline-guidance")],
    futureCapabilities: [],
  });
  if (!planned.ok) return undefined;

  const composed = composeExperience({
    plan: planned.value,
    layout: { family: "flow" },
    disclosure: {
      primary: "immediate",
      supporting: "progressive",
      deferred: "on-demand",
    },
  });
  if (!composed.ok) return undefined;

  return {
    experienceId: `airline-guidance-${name}`,
    plan: planned.value,
    composition: composed.value,
  };
}

function queuePatch(sdk: ViraGenUI, operations: readonly unknown[]): void {
  queueMicrotask(() => sdk.patch({ version: "1", operations }));
}

function GuidanceExperience({ result }: { result: ViraGuidanceResult }) {
  const handleRef = useRef<ViraExperienceHandle | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const controller = useMemo(
    () => container ? createAirlineGuidanceController(container, result) : undefined,
    [container, result],
  );
  const experience = useMemo(() => buildGuidanceExperience(result), [result]);
  const configuration = useMemo(() => {
    if (!controller) return undefined;
    let id = 0;
    return {
      componentAdapter,
      actionAdapter,
      permissionPolicy,
      capabilityAllowlist,
      componentAllowlist,
      accessibility,
      responsive,
      domPort: controller.port,
      idFactory: {
        nextId() {
          id += 1;
          return `airline-guidance-action-${id}`;
        },
      },
    };
  }, [controller]);

  if (!experience) return <div className="flight-error">Vira could not build this guidance experience.</div>;

  const handleEffect = (effect: ViraGenUIEventMap["effect"]) => {
    if (effect.type !== "host-action") return;
    const sdk = handleRef.current?.getSdk();
    if (!sdk) return;

    if (effect.action.type === "travel.guidance.assistance.select") {
      const assistanceType = text(effect.action.payload.assistanceType);
      if (!assistanceType) return;
      queuePatch(sdk, [
        { op: "set", path: "/state/assistance-type", value: assistanceType },
        { op: "set", path: "/state/guidance-handoff", value: "" },
      ]);
      return;
    }

    if (effect.action.type === "travel.guidance.policy.select") {
      const scenario = text(effect.action.payload.scenario);
      if (!scenario) return;
      queuePatch(sdk, [
        { op: "set", path: "/state/policy-scenario", value: scenario },
        { op: "set", path: "/state/guidance-handoff", value: "" },
      ]);
      return;
    }

    if (effect.action.type === "travel.guidance.visa.submit") {
      const nationality = text(effect.action.payload.nationality);
      const passportIssuer = text(effect.action.payload.passportIssuer);
      const residence = text(effect.action.payload.residence);
      if (!nationality || !passportIssuer || !residence) return;
      queuePatch(sdk, [
        { op: "set", path: "/state/visa-profile", value: { nationality, passportIssuer, residence } },
        { op: "set", path: "/state/visa-status", value: "official-check-required" },
        { op: "set", path: "/state/guidance-handoff", value: "" },
      ]);
      return;
    }

    if (effect.action.type === "travel.guidance.handoff") {
      const kind = text(effect.action.payload.kind);
      if (!kind) return;
      queuePatch(sdk, [{ op: "set", path: "/state/guidance-handoff", value: kind }]);
    }
  };

  return (
    <>
      <div
        ref={setContainer}
        className="vira-experience guidance-experience"
        aria-label="Interactive airline guidance"
      />
      {controller && configuration ? (
        <ViraExperience
          ref={handleRef}
          configuration={configuration}
          experience={experience}
          onReady={(sdk) => {
            controller.bindDispatch((event) => { sdk.dispatch(event); });
            const state = sdk.currentState();
            if (state) controller.renderState(state);
          }}
          onEffect={handleEffect}
          onStateChange={(state) => controller.renderState(state)}
          onConfigurationError={() => controller.showError("Vira guidance configuration could not be loaded.")}
          onMountResult={(mount) => {
            if (!mount.ok) controller.showError("Vira guidance could not be mounted.");
          }}
          onWrapperError={() => controller.showError("Vira guidance integration could not start.")}
          onError={() => controller.showError("Vira stopped this guidance experience safely.")}
        />
      ) : null}
    </>
  );
}

const guidanceToolkit = defineToolkit({
  vira_present_guidance: {
    type: "backend",
    display: "standalone",
    render: ({ result, status }) => {
      if (status.type === "running" || result === undefined) {
        return <div className="flight-loading">Preparing interactive guidance…</div>;
      }
      if (!isViraGuidanceResult(result)) {
        return <div className="flight-error">This Vira guidance experience could not be displayed.</div>;
      }
      return <GuidanceExperience result={result} />;
    },
  },
});

export default guidanceToolkit;
