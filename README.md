# Vira Enterprise Demo

Standalone Pegasus/airline external proof repository for Vira Enterprise GenUI.

This repository owns all airline-domain fixtures, naming, brand components and demo UI outside the generic Vira core. It exists to satisfy the MASTER-23 / MASTER-25 external-brand proof without reintroducing customer-specific branches into `vira-enterprise-genui`.

## Exact Vira release under proof

The proof is pinned in `vira-release.json` to:

```text
Vira HEAD: 740e8928237d40078b84ebf80ee543104063f6fd
Vira tree: 0ca0b35bf27dd4a312598078e67c4d37bdce54d1
```

There is no implicit `latest` resolution.

## Bootstrap

Requirements: Node >= 24, pnpm 11.24.0, Git access to the private `hrpering/vira-enterprise-genui` repository.

If this repo and the Vira repo are sibling checkouts, bootstrap automatically reuses the local Vira Git object store. Otherwise it clones the canonical repository. `VIRA_SOURCE_DIR` can explicitly select an existing Vira checkout.

```bash
pnpm bootstrap:vira
pnpm install
pnpm verify
```

The bootstrap fails unless both the exact Git HEAD and exact Git tree match `vira-release.json`.

## Run the web demo

```bash
cp apps/pegasus-chat-demo/.env.example apps/pegasus-chat-demo/.env.local
# Set OPENAI_API_KEY in .env.local
pnpm dev
```

Open `http://127.0.0.1:4180`.

## Release evidence

This repository must not manufacture RC evidence. The final external proof JSON is generated only after the required Web/iOS/Android traces and all MASTER-25 negative/security gates have actually passed. Generated evidence is intentionally not source authority.

This is an internal product demonstration and is not an official Pegasus Airlines application. It has no commercial Pegasus inventory, payment, PNR or ticketing API access; the demo stops truthfully at the airline checkout handoff boundary.
