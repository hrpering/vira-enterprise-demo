import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(".");
const vendor = resolve(root, ".vendor/vira-enterprise-genui");
const contractPath = resolve(root, "evidence/generated/contract.json");
const tracePath = resolve(root, "evidence/generated/android.json");
const tempTest = resolve(vendor, "sdk/android/vira-android/src/androidTest/kotlin/xyz/tryvira/android/ExternalPegasusProofInstrumentedTest.kt");
const MIN_GRADLE = [9, 6, 0];

rmSync(tracePath, { force: true });

function fail(message) { throw new Error(`Android external proof failed: ${message}`); }
function command(name, args, options = {}) {
  const result = spawnSync(name, args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? result.stdout ?? "unknown failure";
    fail(`${name} ${args.join(" ")} failed: ${String(detail).trim()}`);
  }
  return result.stdout;
}
function readJson(path, label) {
  if (!existsSync(path)) fail(`${label} is missing: ${path}`);
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { fail(`${label} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}
function parseGradleVersion(text) {
  const match = /Gradle\s+(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : undefined;
}
function versionAtLeast(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}
function kotlinEscaped(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("$", "\\$");
}

const contract = readJson(contractPath, "contract proof");
if (contract?.version !== "1" || typeof contract.viraHead !== "string" || !contract?.pack) fail("contract proof shape");
if (!/^sha256:[0-9a-f]{64}$/.test(contract.pack.digest ?? "")) fail("contract Pack digest");
if (!existsSync(vendor)) fail("exact Vira checkout is missing; run pnpm bootstrap:vira first");
const vendorHead = command("git", ["-C", vendor, "rev-parse", "HEAD"]).trim();
if (vendorHead !== contract.viraHead) fail(`vendored Vira HEAD ${vendorHead} does not equal contract ${contract.viraHead}`);
if (command("git", ["-C", vendor, "status", "--porcelain"]).trim() !== "") fail("vendored Vira checkout must be clean before Android proof");

const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (!androidHome) fail("ANDROID_HOME or ANDROID_SDK_ROOT is required");
if (!existsSync(join(androidHome, "platforms", "android-36", "android.jar"))) fail("Android API 36 is required");
if (!existsSync(join(androidHome, "build-tools", "36.0.0"))) fail("Android Build Tools 36.0.0 are required");
const adb = existsSync(join(androidHome, "platform-tools", "adb")) ? join(androidHome, "platform-tools", "adb") : "adb";
const devices = command(adb, ["devices"]);
const emulator = devices.split(/\r?\n/).map((line) => line.trim().split(/\s+/)).find(([serial, state]) => serial?.startsWith("emulator-") && state === "device")?.[0];
if (!emulator) fail("no connected Android Emulator was found; boot an AVD first");
if (command(adb, ["-s", emulator, "shell", "getprop", "sys.boot_completed"]).trim() !== "1") fail(`Android Emulator ${emulator} has not completed boot`);
const gradleOutput = command("gradle", ["--version"]);
const gradleVersion = parseGradleVersion(gradleOutput);
if (!gradleVersion || !versionAtLeast(gradleVersion, MIN_GRADLE)) fail(`Gradle 9.6+ is required; observed ${gradleVersion?.join(".") ?? "unknown"}`);

const packId = kotlinEscaped(contract.pack.id);
const packVersion = kotlinEscaped(contract.pack.version);
const source = `package xyz.tryvira.android

import android.test.AndroidTestCase
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.Continuation
import kotlin.coroutines.EmptyCoroutineContext
import kotlin.coroutines.startCoroutine

private const val externalPegasusEnvelopeJSON = """
{
  "version":"1",
  "instanceId":"external-pegasus-android-proof",
  "deploymentId":"external-pegasus-deployment",
  "pack":{"id":"${packId}","version":"${packVersion}","entrypoint":"airline-publication"},
  "artifact":{"id":"airline-publication","role":"studio-publication","mediaType":"application/json","digest":"proof-artifact-digest"},
  "compatibility":{"hostId":"external.proof.host.android","platform":"android"},
  "host":{"version":"1","id":"external.proof.host.android","platform":"android","implementationIds":["external.proof.airline.button"],"capabilities":[]},
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
"""

private fun externalRuntimeState(): ViraAndroidRuntimeCoreState =
  ViraAndroidRuntimeCoreState.decode(
    """
    {
      "experienceId":"external-airline-runtime",
      "revision":0,
      "lifecycle":"active",
      "plan":{
        "version":"1",
        "id":"external-airline-plan",
        "intent":{"version":"1","namespace":"airline","name":"booking"},
        "state":{"counter":0,"items":[]},
        "capabilities":{"required":[],"available":[],"future":[]}
      }
    }
    """.trimIndent()
  ).getOrThrow()

private class ExternalPegasusProofBridge : ViraAndroidHostBridge {
  override val version = "1"
  override val id = "external.proof.host.android"
  val actions = mutableListOf<ViraAndroidHostActionDescriptor>()
  override fun snapshot() = ViraAndroidHostSnapshot(0, emptyMap(), emptyMap())
  override suspend fun dispatch(action: ViraAndroidHostActionDescriptor): ViraAndroidHostActionResult {
    actions += action
    return ViraAndroidHostActionResult(ViraAndroidHostActionOutcome.SUCCESS)
  }
  override fun subscribe(listener: (ViraAndroidHostSnapshot) -> Unit): () -> Unit = {}
}

class ExternalPegasusProofInstrumentedTest : AndroidTestCase() {
  fun testExternalPackLoadsAndPreservesActionSemantics() {
    assertNotNull(context)
    assertNotNull(ViraAndroidPlatform.create(context))

    val envelope = ViraAndroidMountEnvelope.decode(externalPegasusEnvelopeJSON.trimIndent()).getOrThrow()
    assertEquals("${packId}", envelope.pack.id)
    assertEquals("${packVersion}", envelope.pack.version)
    assertEquals("airline-publication", envelope.pack.entrypoint)
    val node = envelope.document.views.first { it.id == "search" }.nodes.first()
    assertEquals(ViraJson.Str("Confirm selected flight"), node.props["accessibilityLabel"])
    assertEquals(ViraJson.Str("en-US"), node.props["locale"])

    val bridge = ExternalPegasusProofBridge()
    val host = ViraAndroidHostAdapter.create(bridge).getOrThrow()
    val policy = ViraAndroidPermissionPolicy.create(listOf(
      ViraAndroidPermissionRule(
        ViraAndroidPermissionSubject.ACTION,
        "airline.booking.confirm",
        ViraAndroidPermissionEffect.ALLOW,
      ),
    )).getOrThrow()
    val session = ViraAndroidRuntimeSession(envelope, host, externalRuntimeState(), policy)
    val completion = runExternalSuspend {
      session.dispatch("confirm", "press").getOrThrow()
    }
    assertEquals("airline.booking.confirm", completion.actionType)
    assertEquals(ViraAndroidHostActionOutcome.SUCCESS, completion.outcome)
    assertEquals("confirmed", completion.viewId)
    assertEquals(1, bridge.actions.size)
    assertEquals("airline.booking.confirm", bridge.actions.single().type)
    assertEquals(ViraJson.Str("external-offer-1"), bridge.actions.single().payload["offerId"])
  }
}

private fun <T> runExternalSuspend(block: suspend () -> T): T {
  val latch = CountDownLatch(1)
  var result: Result<T>? = null
  block.startCoroutine(object : Continuation<T> {
    override val context = EmptyCoroutineContext
    override fun resumeWith(value: Result<T>) {
      result = value
      latch.countDown()
    }
  })
  if (!latch.await(10, TimeUnit.SECONDS)) throw AssertionError("external suspend proof timed out")
  return result!!.getOrThrow()
}
`;

mkdirSync(dirname(tempTest), { recursive: true });
writeFileSync(tempTest, source, "utf8");
try {
  command("gradle", [
    "--no-daemon",
    "-p", resolve(vendor, "sdk/android"),
    ":vira-android:assembleDebug",
    ":vira-android:connectedDebugAndroidTest",
  ], { stdio: "inherit", env: process.env });
} finally {
  rmSync(tempTest, { force: true });
}

if (command("git", ["-C", vendor, "status", "--porcelain"]).trim() !== "") fail("vendored Vira checkout is dirty after Android proof cleanup");
mkdirSync(dirname(tracePath), { recursive: true });
writeFileSync(tracePath, `${JSON.stringify({
  version: "1",
  platform: "android",
  viraHead: contract.viraHead,
  pack: contract.pack,
  passed: true,
  traceRef: `trace:android:gradle:${emulator}`,
  assertions: {
    packLoaded: true,
    actionIntentPreserved: true,
    accessibilityLocalization: true,
  },
}, null, 2)}\n`, "utf8");
console.log(`ANDROID_EXTERNAL_PROOF_OK ${contract.pack.id}@${contract.pack.version} ${contract.pack.digest}`);
