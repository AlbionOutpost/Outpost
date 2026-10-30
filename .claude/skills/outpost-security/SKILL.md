---
name: outpost-security
description: Review or change anything touching Outpost security — Discord sign-in, sessions, CSRF/origin checks, ownership and Team permissions, private data, caches, API input validation, rate limits, Turnstile, CSP/headers, secrets and external integrations. Use for any new API route, mutation, permission rule or data export.
---

# Outpost security

Outpost holds real players' accounts, builds and Team data. Treat every change at a trust boundary as if someone will try to abuse it.

Read [docs/ARCHITECTURE.md § Security model](../../../docs/ARCHITECTURE.md#security-model) and [docs/API.md](../../../docs/API.md).

## When changing a boundary

1. **Trace the input:** browser → route/server action → `mutationUser` (origin + session + budget) → service → current DB rows (inside the transaction) → cache → external service. Read the handler and service, not just the UI.
2. **Fill the [authorization matrix](references/authorization-matrix.md)** for the resource: anonymous, owner, unrelated user, each Team role, revoked member × read / list / search / export / duplicate / mutate.
3. **Server decides.** Identity from the server session; roles and membership from the database, re-checked inside the same transaction as the write. Client IDs, hidden buttons and cached roles are not authority. On Cloudflare, private mutations belong in a named service in `cloudflare/database/services.ts`.
4. **Validate everything** with the existing Zod schemas and `boundedJson` limits before persistence. Fixed upstream hosts, no redirects, byte and time caps on every outbound fetch.
5. **Don't leak.** Non-disclosing errors (private Teams 404 to outsiders), `private, no-store` on private responses, cache keys that can never mix users, no tokens or private bodies in logs or test artifacts.
6. **Abuse:** add a rate limit to any new public or write route; Turnstile on user-generated content writes in production; rate limiting fails closed.
7. **Secrets:** never print or commit `.env*`; client code gets only `NEXT_PUBLIC_*`; run `node scripts/qa-source-secrets.mjs` and, after a build, `node scripts/qa-secret-scan.mjs`.

## Test

For every allowed path, add denied ones and assert **nothing changed** in the database: anonymous, unrelated user, wrong role, revoked/demoted member, expired session, forged IDs, cross-Team destinations. Warm a cache as A, read as B and anonymous. Use fixture sessions (`e2e/support/`), plus `e2e/qa-security.spec.ts`. Fixture sessions don't prove real Discord OAuth — that needs a real login on production HTTPS.

Dependency upgrades: check reachable impact and peer compatibility; never `npm audit fix --force`.

## Report

Threat model and boundaries → actor × action matrix → files → tests (allowed and denied) with DB/cache effects → findings with severity and repro → fixes and retest → what remains unverified.
