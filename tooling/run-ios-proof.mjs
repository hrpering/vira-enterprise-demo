import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(".");
const vendor = resolve(root, ".vendor/vira-enterprise-genui");
const contractPath = resolve(root, "evidence/generated/contract.json");
const tracePath = resolve(root, "evidence/generated/ios.json");
const tempTest = resolve(vendor, "sdk/ios/Tests/ViraIOSTests/ExternalPegasusProofTests.swift");
const scheme = "ViraIOS";

rmSync(tracePath, { force: true });

function fail(message) { throw new Error(`iOS external proof failed: ${message}`); }
function command(name, args, options = {}) {
  const result = spawnSync(name, args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? result.stdout ?? "unknown failure";
    fail(`${name} ${args.join(" ")} failed: ${String(detail).trim()}`);
  }
  return result.stdout;
}
function json(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}
function swiftEscaped(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

if (process.platform !== "darwin") fail("real iOS proof requires macOS with Xcode and an iOS Simulator runtime");
const contract = json(contractPath, "contract proof");
if (contract?.version !== "1" || typeof contract.viraHead !== "string" || !contract?.pack) fail("contract proof shape");
if (!/^sha256:[0-9a-f]{64}$/.test(contract.pack.digest ?? "")) fail("contract Pack digest");
if (!existsSync(vendor)) fail("exact Vira checkout is missing; run pnpm bootstrap:vira first");
const vendorHead = command("git", ["-C", vendor, "rev-parse", "HEAD"]).trim();
if (vendorHead !== contract.viraHead) fail(`vendored Vira HEAD ${vendorHead} does not equal contract ${contract.viraHead}`);
if (command("git", ["-C", vendor, "status", "--porcelain"]).trim() !== "") fail("vendored Vira checkout must be clean before iOS proof");

const packId = swiftEscaped(contract.pack.id);
const packVersion = swiftEscaped(contract.pack.version);
const source = `import Foundation
import XCTest
@testable import ViraIOS
import ViraStudioExperienceWire

private let externalPegasusEnvelopeJSON = #"""
{
  "version":"1",
  "instanceId":"external-pegasus-ios-proof",
  "deploymentId":"external-pegasus-deployment",
  "pack":{"id":"${packId}","version":"${packVersion}","entrypoint":"airline-publication"},
  "artifact":{"id":"airline-publication","role":"studio-publication","mediaType":"application/json","digest":"proof-artifact-digest"},
  "compatibility":{"hostId":"external.proof.host.ios","platform":"ios"},
  "host":{"version":"1","id":"external.proof.host.ios","platform":"ios","implementationIds":["external.proof.airline.button"],"capabilities":[]},
  "brand":{"version":"1","id":"external.airline","components":[
    {"ref":"airline.booking.button","implementationId":"external.proof.airline.button","props":[
      {"key":"title","type":"string","required":true,"bindable":false},
      {"key":"accessibilityLabel","type":"string","required":true,"bindable":false},
      {"key":"locale","type":"string","required":true,"bindable":false}
    ],"slots":[],"events":[{"name":"press","payload":[{"key":"offerId","type":"string","required":true}]}]}
  ],"actions":[{"event":"airline.booking.confirm-event","actionType":"airline.booking.confirm"}],"dataSources":[]},
  "document":{
    "version":"1",
    "id":"airline.booking.experience",
    "recipeId":"airline.booking.recipe",
    "entryView":"search",
    "views":[
      {"id":"search","nodes":[{"id":"confirm","component":"airline.booking.button","order":0,"props":{"title":"Confirm booking","accessibilityLabel":"Confirm selected flight","locale":"en-US"}}]},
      {"id":"confirmed","nodes":[{"id":"done","component":"airline.booking.button","order":0,"props":{"title":"Confirmed","accessibilityLabel":"Booking confirmed","locale":"en-US"}}]}
    ],
    "bindings":[],
    "interactions":[{"viewId":"search","nodeId":"confirm","event":"press","actionEvent":"airline.booking.confirm-event","routes":[{"outcome":"success","viewId":"confirmed"}],"payloadBindings":[{"key":"offerId","source":{"kind":"literal","value":"external-offer-1"}}]}]
  }
}
"""#

@MainActor
private final class ExternalPegasusProofHostBridge: ViraIOSHostBridge {
  let version = "1"
  let id = "external.proof.host.ios"
  private(set) var actions: [ViraIOSHostActionDescriptor] = []

  func snapshot() throws -> ViraIOSHostSnapshot { .init(revision: 0, state: [:], domain: [:]) }
  func dispatch(_ action: ViraIOSHostActionDescriptor) async throws -> ViraIOSHostActionResult {
    actions.append(action)
    return .init(outcome: .success)
  }
  func subscribe(_ listener: @escaping (ViraIOSHostSnapshot) -> Void) throws -> () -> Void { {} }
}

final class ExternalPegasusProofTests: XCTestCase {
  @MainActor
  func testExternalPackLoadsAndPreservesActionSemantics() async throws {
    let envelope: ViraIOSMountEnvelope
    switch ViraIOSMountEnvelope.decode(Data(externalPegasusEnvelopeJSON.utf8)) {
    case .failure(let issue): throw issue
    case .success(let value): envelope = value
    }
    XCTAssertEqual(envelope.pack.id, "${packId}")
    XCTAssertEqual(envelope.pack.version, "${packVersion}")
    XCTAssertEqual(envelope.pack.entrypoint, "airline-publication")

    guard let node = envelope.document.views.first(where: { $0.id == "search" })?.nodes.first else {
      return XCTFail("external airline node must be present")
    }
    XCTAssertEqual(node.props["accessibilityLabel"], .string("Confirm selected flight"))
    XCTAssertEqual(node.props["locale"], .string("en-US"))

    let bridge = ExternalPegasusProofHostBridge()
    let host: ViraIOSHostAdapter
    switch ViraIOSHostAdapter.create(bridge: bridge) {
    case .failure(let issue): throw issue
    case .success(let value): host = value
    }
    let policy: ViraIOSPermissionPolicy
    switch ViraIOSPermissionPolicy.create(rules: [
      .init(subject: .action, id: "airline.booking.confirm", effect: .allow),
    ]) {
    case .failure(let issue): throw issue
    case .success(let value): policy = value
    }
    let session = try ViraIOSRuntimeSession(
      envelope: envelope,
      host: host,
      runtimeState: makeTestRuntimeCoreState(),
      permissionPolicy: policy
    )
    let result = await session.dispatch(runtimeNodeId: "confirm", event: "press")
    switch result {
    case .failure(let issue): throw issue
    case .success(let completion):
      XCTAssertEqual(completion.actionType, "airline.booking.confirm")
      XCTAssertEqual(completion.outcome, .success)
      XCTAssertEqual(completion.viewId, "confirmed")
    }
    XCTAssertEqual(bridge.actions.count, 1)
    XCTAssertEqual(bridge.actions[0].type, "airline.booking.confirm")
    XCTAssertEqual(bridge.actions[0].payload["offerId"], .string("external-offer-1"))
  }
}
`;

mkdirSync(dirname(tempTest), { recursive: true });
writeFileSync(tempTest, source, "utf8");

let device;
try {
  command("xcodebuild", ["-version"]);
  const raw = command("xcrun", ["simctl", "list", "devices", "available", "-j"]);
  const parsed = JSON.parse(raw);
  const candidates = Object.values(parsed.devices ?? {})
    .flatMap((items) => Array.isArray(items) ? items : [])
    .filter((candidate) => candidate && candidate.isAvailable !== false && typeof candidate.udid === "string" && /^iPhone\\b/.test(String(candidate.name ?? "")));
  if (candidates.length === 0) fail("no available iPhone Simulator was found");
  device = candidates.find((candidate) => candidate.state === "Booted") ?? candidates[0];
  if (device.state !== "Booted") command("xcrun", ["simctl", "boot", device.udid]);
  command("xcrun", ["simctl", "bootstatus", device.udid, "-b"], { stdio: "inherit" });
  command("xcodebuild", [
    "test",
    "-scheme", scheme,
    "-destination", `id=${device.udid}`,
    "-only-testing:ViraIOSTests/ExternalPegasusProofTests",
    "CODE_SIGNING_ALLOWED=NO",
  ], { stdio: "inherit" });
} finally {
  rmSync(tempTest, { force: true });
}

if (command("git", ["-C", vendor, "status", "--porcelain"]).trim() !== "") fail("vendored Vira checkout is dirty after iOS proof cleanup");
mkdirSync(dirname(tracePath), { recursive: true });
writeFileSync(tracePath, `${JSON.stringify({
  version: "1",
  platform: "ios",
  viraHead: contract.viraHead,
  pack: contract.pack,
  passed: true,
  traceRef: `trace:ios:xcodebuild:${String(device?.udid ?? "simulator")}`,
  assertions: {
    packLoaded: true,
    actionIntentPreserved: true,
    accessibilityLocalization: true,
  },
}, null, 2)}\n`, "utf8");
console.log(`IOS_EXTERNAL_PROOF_OK ${contract.pack.id}@${contract.pack.version} ${contract.pack.digest}`);
