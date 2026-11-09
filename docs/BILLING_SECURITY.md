# Billing and membership security repair — 2 November 2026

Membership removal, leaving a team and demotion below officer revoke that actor's unused
invitations inside the membership transaction. Acceptance also requires the invitation issuer
to retain officer, admin or owner authority. This closes legacy invitations and those issued
by subsequently deleted accounts. A valid invitation from another current officer remains
a separate admission capability; removing a member is not a permanent account ban.

Stripe webhook signatures remain mandatory. After retrieving the triggering subscription,
the handler matches its customer to the persisted account, then lists that customer's complete
subscription history. Only the configured Supporter price can grant entitlement. An active,
trialing or past-due matching subscription takes priority over older canceled subscriptions;
otherwise the newest nonterminal matching subscription precedes terminal subscriptions.
The handler compares the account revision captured before provider reads when writing its
result. A concurrent change produces a retryable 409, not an acknowledged stale write.
Subscription metadata cannot override persisted customer ownership.

Checkout creation first saves a durable operation with its exact price, return URLs, customer,
account and random idempotency key. Concurrent starts reuse that operation. Recovery finds
the provider session by its saved ID or operation metadata before replaying the same request.
Every checkout request reserves or reuses the current persisted operation first, then reads
the customer's complete subscription history before resolving or creating its session. This
also applies to concurrent reusers; an old profile snapshot or another request's verification
cannot authorize provider session creation. Active or unknown subscriptions preserve the
operation and return 409. Provider failures also preserve it for retry.

A completed checkout stays recorded until a fresh history contains its exact subscription ID
with a terminal status. Empty history, a missing subscription ID or an unrelated canceled
subscription cannot clear it. Once cancellation is verified, retirement compares the operation
key; the next request may reserve a new checkout. Expired checkouts can retire when no live
subscription remains. These checks close the delayed-webhook/concurrent-cleanup duplicate
checkout race without a persistent verification flag that could become stale.
This also avoids duplication after Stripe's idempotency retention expires. Provider histories
are capped at ten pages of 100 records and responses at 2 MiB; incomplete or unavailable
histories fail without granting entitlement or deleting the account.

Account deletion does not cancel active subscriptions. It verifies provider billing state,
recovers and expires unfinished checkout operations, checks all remaining checkout sessions,
then reads subscriptions again. The order catches a legacy checkout completing during the
check. Any nonterminal or unknown subscription status blocks deletion. A completed
cancellation permits deletion even if the local plan has not yet received its webhook.
Completed subscription checkouts, including the tracked session when absent from a lagging
session list, must have their exact terminal subscription in the final history before deletion.
The final database transaction rechecks team ownership and the verified account revision,
so a checkout beginning after verification prevents deletion. Accounts without billing
associations can still be deleted when billing is unconfigured. Provider failures preserve
the account and durable checkout intent for retry.

`User.billingCheckout` is a nullable JSON column added by PostgreSQL migration
`20261102160000_billing_checkout` and SQLite migration `0006_billing_checkout.sql`.
The private Worker advances its schema to version 5 inside the existing migration transaction.
Existing migration files are unchanged. The schema generator now writes `current-schema.sql`
as the full inspection candidate while retaining the original baseline and its provisioning hash.

Verification commands:

- `node --env-file=.env --import tsx scripts/test-billing-security.ts`: real local PostgreSQL,
  owned temporary records and a strict in-process Stripe fixture; no provider requests.
- `node scripts/qa-cloudflare-database.mjs`: local workerd/SQLite RPC authorization, checkout
  JSON round-trip/clear and stale billing revision rejection.
- `python3 scripts/qa-d1-schema.py`: fresh schema, v4-to-v5 retained rows, transactional rollback
  and disposable SQLite backup/restore.
- `node scripts/cloudflare-d1-schema.mjs --check`: generated schema candidate freshness.
- Vitest billing reconciliation/webhook suites: signed old-subscription events, configured
  price binding, interrupted checkout recovery, bounded histories and provider failures.
- `tests/billing-checkout-race.test.ts`: overlapping completed-intent retries, every concurrent
  reuser's provider check, provider failure, lagging or mismatched history, and verified terminal
  or expired operation retirement. The local PostgreSQL route replay and negative controls are
  recorded under `.qa/deep-fixes-2026-11-02/auth` (Stripe is mocked).

These fixtures do not establish genuine Stripe checkout, portal cancellation, webhook retry,
production migration or restore evidence. Billing remains subject to those provider and
deployment gates. Changing the configured Supporter price requires an explicit policy for
existing subscribers; no implicit grandfathering or multi-price entitlement is implemented.

## Cancellation and consent — 9 November 2026

`POST /api/billing/cancel` accepts no subscription or customer id (strict schema). After the
origin, session and budget checks it reads the account's stored Stripe customer, lists that
customer's complete subscription history, filters live subscriptions for the configured price
and sets `cancel_at_period_end` on each. A reply naming another customer fails with 502. The
local plan is unchanged until the signed webhook reports the subscription's end, so the
existing reconciliation stays the only entitlement writer. Tests: `tests/billing-cancel.test.ts`
(another account's subscription, forged ids, signed out, cross-origin and missing origin,
already scheduled, other price, provider mismatch; denied cases make no Stripe call).

Checkout now requires `{terms: true, immediateStart: true}` and `salesOpen()`. The consent time
is part of the durable checkout operation (optional field, older operations replay unchanged)
and is sent as `metadata[outpostConsentAt]` and `subscription_data[metadata][outpostConsentAt]`,
so idempotent recovery replays the same request. No schema change.

Provider references: [subscription listing](https://docs.stripe.com/api/subscriptions/list),
[checkout session listing](https://docs.stripe.com/api/checkout/sessions/list),
[checkout expiration](https://docs.stripe.com/api/checkout/sessions/expire),
[idempotent requests](https://docs.stripe.com/api/idempotent_requests).
