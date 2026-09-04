import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(".");
const contractPath = resolve(root, "evidence/generated/contract.json");
const tracePath = resolve(root, "evidence/generated/web.json");
const playwrightOutput = resolve(root, "evidence/generated/playwright");

rmSync(tracePath, { force: true });
rmSync(playwrightOutput, { recursive: true, force: true });

function fail(message) { throw new Error(`Web external proof failed: ${message}`); }
function readJson(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}
function containsTraceZip(path) {
  if (!existsSync(path)) return false;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isFile() && entry.name === "trace.zip") return true;
    if (entry.isDirectory() && containsTraceZip(child)) return true;
  }
  return false;
}

const contract = readJson(contractPath, "contract proof");
if (contract?.version !== "1" || typeof contract.viraHead !== "string" || !contract?.pack) fail("contract proof shape");
if (!/^sha256:[0-9a-f]{64}$/.test(contract.pack.digest ?? "")) fail("contract Pack digest");

const result = spawnSync("pnpm", ["exec", "playwright", "test", "--config", "playwright.config.ts"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
if (result.error || result.status !== 0) {
  fail(result.error?.message ?? `Playwright exited with ${String(result.status)}`);
}
if (!containsTraceZip(playwrightOutput)) fail("Playwright passed without producing a real browser trace.zip");

mkdirSync(dirname(tracePath), { recursive: true });
writeFileSync(tracePath, `${JSON.stringify({
  version: "1",
  platform: "web",
  viraHead: contract.viraHead,
  pack: contract.pack,
  passed: true,
  traceRef: "trace:web:playwright:pegasus-external-proof",
  assertions: {
    packLoaded: true,
    actionIntentPreserved: true,
    accessibilityLocalization: true,
  },
}, null, 2)}\n`, "utf8");
console.log(`WEB_EXTERNAL_PROOF_OK ${contract.pack.id}@${contract.pack.version} ${contract.pack.digest}`);
