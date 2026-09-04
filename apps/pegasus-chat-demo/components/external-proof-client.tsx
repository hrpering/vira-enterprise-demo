"use client";

import { useState } from "react";
import type { ViraFlightExperienceResult } from "../lib/vira-chat-contract";
import { applyCanonicalViraCommand } from "./canonical-chat-command";
import { CanonicalStudioFlightExperience } from "./canonical-studio-flight";

export function ExternalProofClient({
  packId,
  packVersion,
  packDigest,
  result,
}: {
  readonly packId: string;
  readonly packVersion: string;
  readonly packDigest: string;
  readonly result: ViraFlightExperienceResult;
}) {
  const [actionStatus, setActionStatus] = useState<"idle" | "ok" | "failed">("idle");

  return (
    <main>
      <section
        aria-label="External airline Experience Pack proof"
        data-proof-surface="external-airline-pack"
        data-pack-id={packId}
        data-pack-version={packVersion}
        data-pack-digest={packDigest}
        lang="en-US"
      >
        <CanonicalStudioFlightExperience result={result} />
        <button
          type="button"
          data-proof-action="select-cheapest"
          onClick={async () => {
            const command = await applyCanonicalViraCommand({
              version: "1",
              kind: "vira.command",
              command: "select-cheapest",
            });
            setActionStatus(command.ok ? "ok" : "failed");
          }}
        >
          Select cheapest proof action
        </button>
        <output data-proof-action-status={actionStatus} aria-live="polite">
          {actionStatus}
        </output>
      </section>
    </main>
  );
}
