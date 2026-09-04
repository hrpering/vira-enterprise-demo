import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { searchFlights } from "../../packages/mock-airline-domain/src/index.js";
import { createViraActionBoundary, type ViraActionIntent } from "../../.vendor/vira-enterprise-genui/packages/action-boundary/src/index.js";
import { createViraActionLedger } from "../../.vendor/vira-enterprise-genui/packages/action-ledger/src/index.js";
import { evaluateViraCrossPlatformConformance } from "../../.vendor/vira-enterprise-genui/packages/cross-platform-conformance/src/index.js";
import { createViraDeploymentPlane } from "../../.vendor/vira-enterprise-genui/packages/deployment-plane/src/index.js";
import { createViraEnterpriseContext } from "../../.vendor/vira-enterprise-genui/packages/enterprise-context/src/index.js";
import { createViraPrivateEnterpriseRegistry } from "../../.vendor/vira-enterprise-genui/packages/enterprise-registry/src/index.js";
import { parseViraExperiencePackComposition } from "../../.vendor/vira-enterprise-genui/packages/experience-pack-compositions/src/index.js";
import { parseExperiencePackManifest, serializeExperiencePackManifest } from "../../.vendor/vira-enterprise-genui/packages/experience-packs/src/index.js";
import { parseExperienceRegistrySnapshot } from "../../.vendor/vira-enterprise-genui/packages/experience-registry/src/index.js";
import { createViraGovernancePipeline } from "../../.vendor/vira-enterprise-genui/packages/governance/src/index.js";
import { createStudioComponentCatalog, validateStudioDocumentAgainstCatalog } from "../../.vendor/vira-enterprise-genui/packages/studio-catalog/src/index.js";

const VIRA_HEAD = "740e8928237d40078b84ebf80ee543104063f6fd";
const PACK_ID = "vira-demo/airline-booking";
const PACK_VERSION = "1.0.0";
const INSTANCE_ID = "instance-pegasus-enterprise-proof";
const ACTION_TYPE = "airline.booking.confirm";
const CONTRACT_PATH = resolve("evidence/generated/contract.json");

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalDocument(component = "core.text") {
  return {
    version: "1",
    id: "airline.booking.experience",
    recipeId: "airline.booking.recipe",
    entryView: "search",
    views: [
      {
        id: "search",
        nodes: [
          { id: "title", component, order: 0, props: { text: "Book a flight" } },
          { id: "confirm", component: "core.button", order: 1, props: { label: "Confirm" } },
        ],
      },
      {
        id: "confirmed",
        nodes: [{ id: "status", component: "core.text", order: 0, props: { text: "Booking confirmed" } }],
      },
    ],
    bindings: [],
    interactions: [
      {
        viewId: "search",
        nodeId: "confirm",
        event: "press",
        actionEvent: ACTION_TYPE,
        routes: [
          { outcome: "success", viewId: "confirmed" },
          { outcome: "error", viewId: "search" },
        ],
      },
    ],
  } as const;
}

const localization = {
  version: "1" as const,
  locale: "en-US",
  direction: "ltr" as const,
  currency: "EUR",
  timeZone: "Europe/Istanbul",
  numberingSystem: "latn",
  dateStyle: "medium" as const,
  timeStyle: "short" as const,
  numberStyle: "currency" as const,
};

describe("MASTER-25R external Pegasus enterprise proof contract", () => {
  it("proves the external airline domain through frozen Vira authorities and emits only assertion-backed contract evidence", async () => {
    rmSync(CONTRACT_PATH, { force: true });

    const search = searchFlights({
      origin: "SAW",
      destination: "BER",
      departureDate: "2026-09-15",
      passengers: 1,
    });
    expect(search.offers.length).toBeGreaterThan(0);
    const selectedOffer = search.offers[0]!;

    const publicationDigest = sha256(JSON.stringify({
      experience: "airline.booking.experience",
      datasetVersion: search.version,
      offer: selectedOffer,
    }));

    const parsedPack = parseExperiencePackManifest({
      schemaVersion: "1",
      id: PACK_ID,
      version: PACK_VERSION,
      publisher: { id: "vira-demo", name: "Vira Demo" },
      metadata: {
        name: "External airline booking proof",
        description: "Airline-domain Experience Pack owned outside the Vira core repository.",
        tags: ["airline", "external-proof"],
      },
      compatibility: { minViraVersion: "0.0.0" },
      entrypoints: ["airline-publication"],
      artifacts: [
        {
          id: "airline-publication",
          role: "studio-publication",
          mediaType: "application/json",
          digest: publicationDigest,
          size: 1,
        },
      ],
    });
    expect(parsedPack.ok).toBe(true);
    if (!parsedPack.ok) return;

    const serializedPack = serializeExperiencePackManifest(parsedPack.value);
    expect(serializedPack.ok).toBe(true);
    if (!serializedPack.ok) return;
    const manifestDigest = sha256(serializedPack.value);

    const composition = parseViraExperiencePackComposition({
      version: "1",
      id: "airline.booking.flow",
      domain: "airline.booking",
      document: canonicalDocument(),
      policyTemplates: [
        { id: "airline.booking.policy", provider: "policy.airline.booking", policyRef: "policies/airline-booking/v1" },
      ],
    });
    expect(composition.ok).toBe(true);
    if (!composition.ok) return;

    const componentCatalog = createStudioComponentCatalog({
      version: "1",
      id: "catalog.airline.booking",
      brandId: "brand.vira-demo-air",
      components: [
        {
          ref: "core.text",
          label: "Text",
          category: "Core",
          kind: "content",
          props: [{ key: "text", type: "string", required: true, bindable: false }],
          slots: [],
          events: [],
        },
        {
          ref: "core.button",
          label: "Button",
          category: "Core",
          kind: "action",
          props: [{ key: "label", type: "string", required: true, bindable: false }],
          slots: [],
          events: [{ name: "press", label: "Press" }],
        },
      ],
    });
    expect(componentCatalog.ok).toBe(true);
    if (!componentCatalog.ok) return;

    const validCatalogDocument = validateStudioDocumentAgainstCatalog(canonicalDocument(), componentCatalog.value);
    expect(validCatalogDocument.ok).toBe(true);
    const unknownComponent = validateStudioDocumentAgainstCatalog(
      canonicalDocument("airline.unregistered.widget"),
      componentCatalog.value,
    );
    expect(unknownComponent.ok).toBe(false);
    if (!unknownComponent.ok) expect(unknownComponent.issue.code).toBe("UNREGISTERED_COMPONENT");

    const actionIntent: ViraActionIntent = {
      version: "1",
      instanceId: INSTANCE_ID,
      expectedStateRevision: 7,
      idempotencyKey: "pegasus-booking-proof-1",
      action: {
        id: "booking-confirm-1",
        type: ACTION_TYPE,
        source: "user",
        payload: {
          offerId: selectedOffer.id,
          origin: selectedOffer.origin,
          destination: selectedOffer.destination,
        },
      },
    };

    let revision = 7;
    const boundary = createViraActionBoundary({
      instanceId: INSTANCE_ID,
      catalog: [{ actionType: ACTION_TYPE, effect: "write", idempotency: "action-id" }],
      permissionPolicy: {
        version: "1",
        rules: [{ subject: "action", id: ACTION_TYPE, effect: "allow" }],
      },
      revisionProvider: () => revision,
    });
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) return;

    const unknownActionIntent: ViraActionIntent = {
      ...actionIntent,
      idempotencyKey: "pegasus-unknown-action-1",
      action: { ...actionIntent.action, id: "unknown-action-1", type: "airline.booking.unregistered" },
    };
    const unknownAction = await boundary.value.execute(unknownActionIntent, () => ({ outcome: "success", stateRevision: 8 }));
    expect(unknownAction.ok).toBe(false);
    if (!unknownAction.ok) expect(unknownAction.issue.code).toBe("ACTION_NOT_REGISTERED");

    const staleAction = await boundary.value.execute(
      { ...actionIntent, expectedStateRevision: 6, idempotencyKey: "pegasus-stale-action-1" },
      () => ({ outcome: "success", stateRevision: 8 }),
    );
    expect(staleAction.ok).toBe(false);
    if (!staleAction.ok) expect(staleAction.issue.code).toBe("STALE_REVISION");

    let executions = 0;
    const execution = await boundary.value.execute(actionIntent, () => {
      executions += 1;
      revision = 8;
      return { outcome: "success", stateRevision: 8, data: { bookingRef: "VIRA-DEMO-001" } };
    });
    expect(execution.ok).toBe(true);
    if (!execution.ok) return;

    const duplicate = await boundary.value.execute(
      { ...actionIntent, expectedStateRevision: 8 },
      () => {
        executions += 1;
        return { outcome: "success", stateRevision: 9 };
      },
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.issue.code).toBe("DUPLICATE_ACTION");
    expect(executions).toBe(1);

    const challengeVerdict = {
      version: "1" as const,
      effect: "challenge" as const,
      reasonCode: "booking-approval-required",
      obligations: [] as const,
      provider: "policy.airline.booking",
    };
    const challengeProvider = {
      version: "1" as const,
      id: "policy.airline.booking",
      evaluate: () => challengeVerdict,
    };
    const governanceWithoutApproval = createViraGovernancePipeline({
      providers: [challengeProvider],
      allowedObligations: [],
    });
    expect(governanceWithoutApproval.ok).toBe(true);
    if (!governanceWithoutApproval.ok) return;

    const governanceInput = {
      coreSafety: { version: "1" as const, effect: "allow" as const, reasonCode: "core-safe" },
      context: {
        version: "1" as const,
        instanceId: INSTANCE_ID,
        experienceId: composition.value.document.id,
        experienceVersion: PACK_VERSION,
        platform: "web" as const,
        actionIntent,
      },
    };
    const challenged = await governanceWithoutApproval.value.evaluate(governanceInput);
    expect(challenged.ok).toBe(false);
    if (challenged.ok || !challenged.challenge) return;
    expect(challenged.issue.code).toBe("APPROVAL_REQUIRED");
    const challenge = challenged.challenge;

    const governanceWithApproval = createViraGovernancePipeline({
      providers: [challengeProvider],
      allowedObligations: [],
      approvalProvider: {
        version: "1",
        id: "approval.airline.operator",
        decide: (candidate) => ({
          version: "1",
          challengeId: candidate.challengeId,
          decision: "approved",
          approver: {
            version: "1",
            kind: "user",
            id: "airline-operator-1",
            issuer: "issuer.vira-demo",
          },
          evidenceRef: "evidence:airline-operator-approval",
        }),
      },
    });
    expect(governanceWithApproval.ok).toBe(true);
    if (!governanceWithApproval.ok) return;
    const approved = await governanceWithApproval.value.evaluate(governanceInput);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.approvals).toHaveLength(1);
    expect(approved.value.approvals[0]?.decision).toBe("approved");
    const approval = approved.value.approvals[0]!;

    const enterpriseContext = createViraEnterpriseContext({
      organizationId: "org.vira-demo",
      projectId: "project.airline-demo",
      environments: ["dev", "staging", "production"],
    });
    expect(enterpriseContext.ok).toBe(true);
    if (!enterpriseContext.ok) return;
    const crossTenant = enterpriseContext.value.principal({
      version: "1",
      kind: "user",
      id: "foreign-user",
      organizationId: "org.other-tenant",
    });
    expect(crossTenant.ok).toBe(false);
    if (!crossTenant.ok) expect(crossTenant.issue.code).toBe("CROSS_ORGANIZATION");

    const registrySnapshot = parseExperienceRegistrySnapshot({
      schemaVersion: "1",
      manifests: [parsedPack.value],
    });
    expect(registrySnapshot.ok).toBe(true);
    if (!registrySnapshot.ok) return;
    const privateRegistry = createViraPrivateEnterpriseRegistry({
      context: enterpriseContext.value,
      environment: "production",
      packRegistry: registrySnapshot.value,
    });
    expect(privateRegistry.ok).toBe(true);
    if (!privateRegistry.ok) return;
    const approvedPack = privateRegistry.value.approve({
      version: "1",
      kind: "pack",
      id: PACK_ID,
      versionRef: PACK_VERSION,
    });
    expect(approvedPack.ok).toBe(true);
    const wrongPackVersion = privateRegistry.value.approve({
      version: "1",
      kind: "pack",
      id: PACK_ID,
      versionRef: "9.9.9",
    });
    expect(wrongPackVersion.ok).toBe(false);
    if (!wrongPackVersion.ok) expect(wrongPackVersion.issue.code).toBe("PACK_NOT_REGISTERED");

    const trustedSignature = {
      algorithm: "ed25519" as const,
      keyId: "proof-key-1",
      value: "trusted_signature_1234567890",
    };
    const deployment = createViraDeploymentPlane({
      integrity: {
        digest: (canonicalManifest) => sha256(canonicalManifest),
        verifySignature: ({ signature }) => signature.value === trustedSignature.value,
      },
    });
    expect(deployment.ok).toBe(true);
    if (!deployment.ok) return;
    const signedPack = {
      version: "1" as const,
      manifest: parsedPack.value,
      manifestDigest,
      signature: trustedSignature,
    };
    const published = await deployment.value.publish(signedPack);
    expect(published.ok).toBe(true);
    const cached = await deployment.value.verifyCachedPack(signedPack);
    expect(cached.ok).toBe(true);

    const untrusted = await deployment.value.verifyCachedPack({
      ...signedPack,
      signature: { ...trustedSignature, value: "untrusted_signature_1234567890" },
    });
    expect(untrusted.ok).toBe(false);
    if (!untrusted.ok) expect(untrusted.issue.code).toBe("SIGNATURE_INVALID");

    const ledger = createViraActionLedger({
      instanceId: INSTANCE_ID,
      experienceId: composition.value.document.id,
      experienceVersion: PACK_VERSION,
      platform: "web",
      hostId: "host.external-proof",
      hostVersion: "1.0.0",
      initialStateRevision: 7,
    });
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) return;
    expect(ledger.value.recordExperienceShown("2026-09-04T09:00:00.000Z", 7).ok).toBe(true);
    expect(ledger.value.recordActionProposed("2026-09-04T09:00:01.000Z", actionIntent).ok).toBe(true);
    expect(ledger.value.recordPolicyEvaluated("2026-09-04T09:00:02.000Z", actionIntent.action.id, challengeVerdict).ok).toBe(true);
    expect(ledger.value.recordApprovalRequested("2026-09-04T09:00:03.000Z", challenge).ok).toBe(true);
    expect(ledger.value.recordApprovalGranted("2026-09-04T09:00:04.000Z", challenge, approval).ok).toBe(true);
    expect(ledger.value.recordActionExecuted("2026-09-04T09:00:05.000Z", execution.value.receipt).ok).toBe(true);
    const replay = ledger.value.replay();
    expect(replay.sideEffectExecution).toBe("forbidden");
    expect(replay.entries.length).toBe(6);
    expect(ledger.value.telemetry().ok).toBe(true);

    function snapshot(platform: "web" | "ios" | "android") {
      return {
        version: "1" as const,
        platform,
        experienceId: composition.value.document.id,
        experienceVersion: PACK_VERSION,
        viewId: "confirmed",
        componentSemantics: ["airline.flight-offer", "airline.booking-status"],
        state: { offerId: selectedOffer.id, bookingRef: "VIRA-DEMO-001", status: "confirmed" },
        bindings: [{ source: "domain.flight", target: "booking.summary" }],
        actions: [{ type: ACTION_TYPE, outcome: "success" }],
        navigation: ["confirmed"],
        policyCalls: [{ provider: "policy.airline.booking", effect: "challenge" as const, reasonCode: "booking-approval-required" }],
        accessibility: [{ nodeId: "status", role: "status", label: "Booking confirmed", value: "VIRA-DEMO-001" }],
        localization,
        actionIntent,
        stateRevision: 8,
        outcome: "success" as const,
      };
    }
    const snapshots = [snapshot("web"), snapshot("ios"), snapshot("android")] as const;
    const conformance = evaluateViraCrossPlatformConformance({
      fixtureId: "pegasus-external-enterprise-proof",
      snapshots,
    });
    expect(conformance.ok).toBe(true);
    if (!conformance.ok) return;
    expect(conformance.value.conformant).toBe(true);
    expect(conformance.value.mismatches).toEqual([]);
    expect(snapshots.every((item) => item.accessibility.length > 0 && item.localization.locale === "en-US")).toBe(true);

    const gates = {
      actionBoundary: execution.ok,
      governanceApproval: approved.ok && approved.value.approvals[0]?.decision === "approved",
      observabilityLedger: replay.entries.length === 6 && replay.sideEffectExecution === "forbidden",
      crossPlatformConformance: conformance.value.conformant,
      accessibilityLocalization: snapshots.every((item) => item.accessibility.length > 0 && item.localization.locale.length > 0),
      crossTenantDenied: !crossTenant.ok && crossTenant.issue.code === "CROSS_ORGANIZATION",
      wrongPackVersionDenied: !wrongPackVersion.ok && wrongPackVersion.issue.code === "PACK_NOT_REGISTERED",
      unknownComponentDenied: !unknownComponent.ok && unknownComponent.issue.code === "UNREGISTERED_COMPONENT",
      unknownActionDenied: !unknownAction.ok && unknownAction.issue.code === "ACTION_NOT_REGISTERED",
      unsignedArtifactDenied: !untrusted.ok && untrusted.issue.code === "SIGNATURE_INVALID",
      staleRevisionDenied: !staleAction.ok && staleAction.issue.code === "STALE_REVISION",
      duplicateRetryDenied: !duplicate.ok && duplicate.issue.code === "DUPLICATE_ACTION" && executions === 1,
      reconnectCacheVerified: cached.ok,
    } as const;
    expect(Object.values(gates).every(Boolean)).toBe(true);

    mkdirSync(dirname(CONTRACT_PATH), { recursive: true });
    writeFileSync(CONTRACT_PATH, `${JSON.stringify({
      version: "1",
      viraHead: VIRA_HEAD,
      pack: { id: PACK_ID, version: PACK_VERSION, digest: manifestDigest },
      gates,
    }, null, 2)}\n`, "utf8");
  });
});
