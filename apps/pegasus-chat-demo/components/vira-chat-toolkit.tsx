"use client";

import { defineToolkit } from "@assistant-ui/react";
import { useEffect, useRef, useState } from "react";
import {
  isViraCommandResult,
  isViraFlightExperienceResult,
  type ViraCommandResult,
} from "../lib/vira-chat-contract";
import { applyCanonicalViraCommand } from "./canonical-chat-command";
import { CanonicalStudioFlightExperience } from "./canonical-studio-flight";
import guidanceToolkit from "./vira-guidance-toolkit";

function CanonicalViraCommandEffect({ result }: { readonly result: ViraCommandResult }) {
  const dispatched = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (dispatched.current) return undefined;
    dispatched.current = true;
    let active = true;
    void applyCanonicalViraCommand(result).then(
      (outcome) => {
        if (active && !outcome.ok) setFailed(true);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [result]);

  return failed
    ? <div className="flight-error">This booking change could not be applied to the active GenUI step.</div>
    : null;
}

export const viraChatToolkit = defineToolkit({
  ...guidanceToolkit,
  vira_present_experience: {
    type: "backend",
    display: "standalone",
    render: ({ result, status }) => {
      if (status.type === "running" || result === undefined) {
        return (
          <div className="flight-loading" aria-live="polite">
            <span className="flight-loading-dot" />
            Preparing your approved GenUI experience…
          </div>
        );
      }
      if (!isViraFlightExperienceResult(result)) {
        return <div className="flight-error">This Vira experience could not be displayed.</div>;
      }
      return <CanonicalStudioFlightExperience result={result} />;
    },
  },
  vira_interact: {
    type: "backend",
    display: "standalone",
    render: ({ result }) => {
      if (!isViraCommandResult(result)) return null;
      return <CanonicalViraCommandEffect result={result} />;
    },
  },
});
