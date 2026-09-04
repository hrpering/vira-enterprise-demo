# MASTER-25R External Brand Proof Contract

This repository owns the airline/Pegasus demo domain used to close the Vira Enterprise GenUI RC external-brand gate. It is not an official Pegasus application and it does not claim access to commercial airline booking, payment, PNR, or private Pegasus APIs.

## Frozen Vira release

The proof consumes only the exact Vira checkout pinned by `vira-release.json`. `tooling/bootstrap-vira.mjs` verifies both the pinned Git HEAD and Git tree and rejects a dirty vendored checkout.

The proof must never float to `main`, a branch head, `latest`, or an unpinned package release.

## Evidence stages

1. `pnpm proof:contract`
   - runs the external airline fixture through canonical Vira Pack, registry, governance, Action Boundary, ledger, deployment/cache, Studio catalog, tenant isolation, and cross-platform conformance authorities;
   - emits `evidence/generated/contract.json` only after the assertions pass.
2. `pnpm proof:web`
   - starts the real Next.js demo;
   - renders the canonical external flight runtime in Chromium through Playwright;
   - dispatches the existing `select-cheapest` command through `applyCanonicalViraCommand` and the canonical runtime controller;
   - requires a real Playwright `trace.zip` before writing `evidence/generated/web.json`.
3. `pnpm proof:ios`
   - requires macOS, Xcode, and an available iPhone Simulator;
   - temporarily injects an external-brand XCTest into the exact vendored Vira `ViraIOSTests` target;
   - decodes the external Pack mount envelope, checks accessibility/localization props, dispatches the airline action through `ViraIOSRuntimeSession`, and verifies the Host descriptor;
   - removes the temporary test in `finally` and writes `evidence/generated/ios.json` only after the real Simulator test passes.
4. `pnpm proof:android`
   - requires Android API 36, Build Tools 36.0.0, Gradle 9.6+, and a booted Android Emulator;
   - temporarily injects an external-brand instrumentation test into the exact vendored Vira Android SDK;
   - decodes the external Pack mount envelope, checks accessibility/localization props, dispatches the airline action through `ViraAndroidRuntimeSession`, and verifies the Host descriptor;
   - removes the temporary test in `finally` and writes `evidence/generated/android.json` only after the real Emulator test passes.
5. `pnpm proof:evidence`
   - deletes any previous final evidence first;
   - verifies the exact vendored Vira HEAD/tree and clean worktree;
   - requires the contract proof and all three platform traces to use the exact same Pack id, version, and digest;
   - requires every contract and platform assertion to be true;
   - only then writes `evidence/external-brand-proof.json` in the exact schema expected by the frozen Vira RC verifier.

`pnpm verify:external-proof` runs those stages fail-fast in that order.

## Generated evidence is not source truth

`evidence/generated/` and `evidence/external-brand-proof.json` are intentionally ignored by Git. They are local execution artifacts, not reviewable source declarations. A committed JSON file containing `passed: true` is not accepted as proof.

The final evidence is valid only for the exact Vira HEAD recorded in the file. The core verifier independently compares that value with its current Git checkout.
