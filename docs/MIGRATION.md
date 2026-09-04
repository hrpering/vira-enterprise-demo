# MASTER-25R Pegasus Migration Record

## Source authority

The customer/domain sources were recovered from the final pre-extraction Vira snapshot:

- repository: `hrpering/vira-enterprise-genui`
- source branch: `master/22-experience-packs`
- source commit: `cfc30698dba32e51384dc6c17ab8d332d891ed94`
- extraction successor: `master/23-pegasus-extraction`

MASTER-23 deleted Pegasus/airline/flight implementations from generic core and required them to live in an external proof repository.

## Ported ownership

This repository now owns:

- `apps/pegasus-chat-demo` — customer-facing chat/demo surface;
- `packages/airline-brand-kit` — airline brand components and rendering;
- `packages/mock-airline-domain` — deterministic airline fixtures/domain behavior.

Except for the explicit cleanup below, migrated active source blobs were recreated byte-for-byte and retain their original Git blob SHA.

## Deliberate omission / cleanup

The old `components/vira-chat-connector.tsx` path was not ported. Reverse engineering showed it exported only `vira_present_experience` and `vira_interact`, while `vira-chat-toolkit.tsx` immediately overwrote both keys with the newer canonical Studio runtime implementation. Its supporting `lib/booking-catalog.ts` and `lib/pegasus-vira-port.ts` were therefore also dead on the active canonical path.

`vira-chat-toolkit.tsx` has one intentional migration delta: the dead connector import/spread was removed. No replacement execution authority was introduced.

## Current Vira dependency boundary

Vira core is not copied into source control here. `tooling/bootstrap-vira.mjs` materializes the exact frozen core release under `.vendor/vira-enterprise-genui` and verifies both commit and tree identity before workspace installation.

Frozen release:

- HEAD `740e8928237d40078b84ebf80ee543104063f6fd`
- tree `0ca0b35bf27dd4a312598078e67c4d37bdce54d1`

No branch name or implicit latest is used for proof execution.

## Proof boundary

Migration is not release evidence. Web/native/security evidence must be produced by dedicated proof gates after this port builds against the exact frozen Vira checkout. Missing proof remains a hard failure.
