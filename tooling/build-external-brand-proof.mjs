import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const releasePath = resolve(root, "vira-release.json");
const vendorDir = resolve(root, ".vendor/vira-enterprise-genui");
const generatedDir = resolve(root, "evidence/generated");
const finalPath = resolve(root, "evidence/external-brand-proof.json");
const platforms = ["web", "ios", "android"];
const contractGateKeys = [
  "actionBoundary",
  "governanceApproval",
  "observabilityLedger",
  "crossPlatformConformance",
  "accessibilityLocalization",
  "crossTenantDenied",
  "wrongPackVersionDenied",
  "unknownComponentDenied",
  "unknownActionDenied",
  "unsignedArtifactDenied",
  "staleRevisionDenied",
  "duplicateRetryDenied",
  "reconnectCacheVerified",
];
const traceAssertionKeys = ["packLoaded", "actionIntentPreserved", "accessibilityLocalization"];
const HEAD = /^[0-9a-f]{40}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,511}$/;

rmSync(finalPath, { force: true });

function fail(message) {
  throw new Error(`external brand proof build failed: ${message}`);
}

function plain(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exact(value, keys) {
  return plain(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function readJson(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function gitValue(args, label) {
  try {
    return execFileSync("git", ["-C", vendorDir, ...args], { encoding: "utf8" }).trim();
  } catch (error) {
    fail(`${label} could not be verified: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validatePack(pack, label) {
  if (!exact(pack, ["id", "version", "digest"])) fail(`${label} pack shape`);
  if (typeof pack.id !== "string" || !REF.test(pack.id)) fail(`${label} pack id`);
  if (typeof pack.version !== "string" || !REF.test(pack.version)) fail(`${label} pack version`);
  if (typeof pack.digest !== "string" || !DIGEST.test(pack.digest)) fail(`${label} pack digest`);
}

const release = readJson(releasePath, "Vira release pin");
if (!plain(release) || typeof release.sha !== "string" || typeof release.tree !== "string") fail("vira-release.json must expose sha and tree");
if (!HEAD.test(release.sha) || !HEAD.test(release.tree)) fail("Vira release sha/tree format");
if (!existsSync(vendorDir)) fail("exact Vira checkout is missing; run pnpm bootstrap:vira first");

const vendorHead = gitValue(["rev-parse", "HEAD"], "vendored Vira HEAD");
const vendorTree = gitValue(["rev-parse", "HEAD^{tree}"], "vendored Vira tree");
if (vendorHead !== release.sha) fail(`vendored Vira HEAD ${vendorHead} does not equal pinned ${release.sha}`);
if (vendorTree !== release.tree) fail(`vendored Vira tree ${vendorTree} does not equal pinned ${release.tree}`);

const dirty = gitValue(["status", "--porcelain"], "vendored Vira worktree status");
if (dirty !== "") fail("vendored Vira checkout is dirty");

const contract = readJson(resolve(generatedDir, "contract.json"), "contract proof");
if (!exact(contract, ["version", "viraHead", "pack", "gates"])) fail("contract proof root shape");
if (contract.version !== "1" || contract.viraHead !== release.sha) fail("contract proof Vira identity");
validatePack(contract.pack, "contract proof");
if (!exact(contract.gates, contractGateKeys)) fail("contract proof gate set");
for (const key of contractGateKeys) {
  if (contract.gates[key] !== true) fail(`contract gate ${key} did not pass`);
}

const platformEvidence = {};
for (const platform of platforms) {
  const path = resolve(generatedDir, `${platform}.json`);
  const trace = readJson(path, `${platform} platform trace`);
  if (!exact(trace, ["version", "platform", "viraHead", "pack", "passed", "traceRef", "assertions"])) fail(`${platform} trace root shape`);
  if (trace.version !== "1" || trace.platform !== platform || trace.viraHead !== release.sha) fail(`${platform} trace Vira identity`);
  validatePack(trace.pack, `${platform} trace`);
  if (trace.pack.id !== contract.pack.id || trace.pack.version !== contract.pack.version || trace.pack.digest !== contract.pack.digest) {
    fail(`${platform} trace does not use the exact contract Pack identity`);
  }
  if (trace.passed !== true) fail(`${platform} trace did not pass`);
  if (typeof trace.traceRef !== "string" || !REF.test(trace.traceRef)) fail(`${platform} traceRef`);
  if (!exact(trace.assertions, traceAssertionKeys)) fail(`${platform} trace assertion set`);
  for (const key of traceAssertionKeys) {
    if (trace.assertions[key] !== true) fail(`${platform} assertion ${key} did not pass`);
  }
  platformEvidence[platform] = { passed: true, traceRef: trace.traceRef };
}

const gates = {
  samePackIdentity: true,
  actionBoundary: contract.gates.actionBoundary,
  governanceApproval: contract.gates.governanceApproval,
  observabilityLedger: contract.gates.observabilityLedger,
  crossPlatformConformance: contract.gates.crossPlatformConformance,
  accessibilityLocalization: contract.gates.accessibilityLocalization,
  crossTenantDenied: contract.gates.crossTenantDenied,
  wrongPackVersionDenied: contract.gates.wrongPackVersionDenied,
  unknownComponentDenied: contract.gates.unknownComponentDenied,
  unknownActionDenied: contract.gates.unknownActionDenied,
  unsignedArtifactDenied: contract.gates.unsignedArtifactDenied,
  staleRevisionDenied: contract.gates.staleRevisionDenied,
  duplicateRetryDenied: contract.gates.duplicateRetryDenied,
  reconnectCacheVerified: contract.gates.reconnectCacheVerified,
};

const evidence = {
  version: "1",
  viraHead: release.sha,
  pack: contract.pack,
  platforms: platformEvidence,
  gates,
};

writeFileSync(finalPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`EXTERNAL_BRAND_PROOF_EVIDENCE_OK ${release.sha} ${contract.pack.id}@${contract.pack.version} ${contract.pack.digest}`);
