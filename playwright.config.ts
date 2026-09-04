import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const contract = JSON.parse(readFileSync(resolve("evidence/generated/contract.json"), "utf8")) as {
  readonly pack: { readonly id: string; readonly version: string; readonly digest: string };
};

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "pegasus-external-proof.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "evidence/generated/playwright",
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "on",
  },
  webServer: {
    command: "pnpm --filter @vira-enterprise-genui/pegasus-chat-demo dev",
    url: "http://127.0.0.1:4180/proof",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      VIRA_PROOF_PACK_ID: contract.pack.id,
      VIRA_PROOF_PACK_VERSION: contract.pack.version,
      VIRA_PROOF_PACK_DIGEST: contract.pack.digest,
    },
  },
});
