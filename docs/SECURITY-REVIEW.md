# Security review — predecessor findings vs. Outpost

A third-party review of the predecessor site **albiononlinegrind.com** (a Supabase app that
shipped a public anon key to the browser) reported seven issues on 27 Oct 2026. They all share
one root cause: the browser could talk to the database directly, so authorization lived in
client code and in Row-Level Security that was incomplete. **Outpost does not share that
architecture**, and each class is prevented by construction. This records how, with code
references, and `tests/security-regression.test.ts` locks the testable invariants.

## Why the whole class does not carry over

- **No public database API.** The data Worker (`cloudflare/database/worker.ts`) is binding-only
  RPC: its public entrypoint returns `404` for every request (`OutpostData.fetch()`), and the
  only models reachable read-only are the public catalog (`publicModels` in
  `cloudflare/database/protocol.ts` — `itemMetadata`, `catalogRelease`). There is no anon key
  and no `/rest/v1/*` surface for a browser to call.
- **Server-derived identity.** Private reads and mutations run through Next.js routes that take
  the actor from the server session (`getServerSession`), never from the request body. Services
  re-check ownership/membership inside the SQLite transaction (`cloudflare/database/services.ts`).

## Finding by finding

| #    | Predecessor finding                                            | Outpost defense                                                                                                                                                                                           | Where                                                                                                           |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| S-01 | Free account grants itself premium by writing a membership row | `plan` is written only by `applySubscription`, called only from the signature-verified Stripe webhook, which re-reads the subscription from Stripe. No schema accepts `plan`/`role`/status from a client. | `src/app/api/billing/webhook/route.ts`, `src/lib/billing/plan.ts`, gate reads only in `src/lib/billing/gate.ts` |
| S-02 | Premium calculator unlocked in client JS                       | Supporter features are enforced on the server (`HttpError(402)`); gating is a server check, not a client flag.                                                                                            | `src/lib/billing/gate.ts`                                                                                       |
| S-03 | Private build drafts readable without permission               | `canReadBuild` denies `PRIVATE` to non-owners; both the read service and the detail page call it and `notFound()` otherwise, so a draft is never embedded in page props.                                  | `src/lib/builds/validation.ts`, `src/lib/builds/service.ts`, `src/app/builds/[id]/page.tsx`                     |
| S-04 | Non-rental islands publicly readable                           | Outpost has no islands feature and no public table reads.                                                                                                                                                 | —                                                                                                               |
| S-05 | Builds created attributed to another account                   | `buildInput` has no owner field (Zod strips `authorId`/`user_id`); `createBuild` always sets `authorId` from the session.                                                                                 | `src/lib/builds/validation.ts`, `src/lib/builds/service.ts`                                                     |
| S-06 | Islands attributed to another account                          | No islands feature; the same owner-from-session rule applies to every create.                                                                                                                             | —                                                                                                               |
| S-07 | Votes changed without signing in                               | Like/favorite goes through `mutationUser` (server session + same-origin + rate limit); the voter is `auth.userId`, never a client-supplied profile id.                                                    | `src/app/api/community/[kind]/[id]/route.ts`, `src/lib/http.ts`                                                 |

## Ongoing hardening (tracked in ROADMAP open defects)

- Spam defences beyond Turnstile + rate limits, and an appeals path (QA-019).
- Full-history secret scan (SEC-006; a private disclosure contact already lives in SECURITY.md).

The uploaded review package concerns the predecessor site only; nothing in it was executed here.
