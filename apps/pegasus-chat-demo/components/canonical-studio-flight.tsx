"use client";

import { AIRLINE_STARTER_TEMPLATES } from "@vira-enterprise-genui/airline-brand-kit/studio";
import { useEffect, useMemo, useState } from "react";
import type { ViraFlightExperienceResult } from "../lib/vira-chat-contract";
import { registerCanonicalChatCommandTarget } from "./canonical-chat-command";
import { CANONICAL_CHAT_RENDERERS } from "./canonical-chat-renderers";
import { createCanonicalChatRuntime } from "./canonical-chat-runtime";

export function CanonicalStudioFlightExperience({ result }: { readonly result: ViraFlightExperienceResult }) {
  const bundle = useMemo(() => createCanonicalChatRuntime(result), [result]);
  const [, setRevision] = useState(0);
  useEffect(() => {
    if (!bundle) return undefined;
    const unregisterCommandTarget = registerCanonicalChatCommandTarget({
      runtime: bundle.runtime,
      offers: bundle.offers,
    });
    const unsubscribe = bundle.runtime.subscribe(() => { setRevision((value) => value + 1); });
    return () => {
      unregisterCommandTarget();
      unsubscribe();
      bundle.runtime.dispose();
    };
  }, [bundle]);

  if (!bundle) return <div className="flight-error">Vira could not load the approved GenUI publication.</div>;
  const rendered = bundle.runtime.renderReact({ renderers: CANONICAL_CHAT_RENDERERS });
  if (!rendered.ok) return <div className="flight-error">Vira stopped this GenUI experience safely.</div>;
  return <div className="vira-experience" aria-label="Approved interactive flight booking">{rendered.value}</div>;
}

export const APPROVED_CHAT_EXPERIENCE_ID = "pegasus.chat.approved-booking" as const;
export const APPROVED_CHAT_STUDIO_TEMPLATES = AIRLINE_STARTER_TEMPLATES;
