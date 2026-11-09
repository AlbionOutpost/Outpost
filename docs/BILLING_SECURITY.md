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
- `tests/billing-checkout-race.test.ts` (retired with Checkout; see the payment form section): overlapping completed-intent retries, every concurrent
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

Checkout now requires `{terms: true}` and `salesOpen()` (the immediate-start waiver was retired with the withdrawal function below). The consent time
is part of the durable checkout operation (optional field, older operations replay unchanged)
and is sent as `metadata[outpostConsentAt]` and `subscription_data[metadata][outpostConsentAt]`,
so idempotent recovery replays the same request. No schema change.

## Withdrawal — 9 November 2026

`POST /api/billing/withdraw` (§ 356a BGB) takes `{confirm: true}` only (strict). After the origin,
session and budget checks it reads the account's stored Stripe customer, lists that customer's
complete subscription history and keeps the configured-price subscriptions whose `start_date`
(falling back to `created`) is within the period: until the end of the 14th day after the order
day, Europe/Berlin. For each it deletes a live subscription with `prorate=false` and
`invoice_now=false` (fixed parameters under the key `withdraw-cancel-<id>`, so a concurrent or
repeated call replays), checks the reply names the same customer and is `canceled`, then lists
the subscription's paid invoices with expanded charges (customer and subscription must match;
`has_more` fails closed) and refunds each charge not yet fully refunded, without an amount (the
remainder) and under the key `withdraw-refund-<charge>`. After Stripe's 24-hour key retention the
charge's `refunded` flag prevents a second refund. A paid invoice without a charge stops with 502
for a manual refund. Any failure returns 502 telling the user to retry or write to contact@ (an
email withdrawal also counts); steps already done stay done and a retry completes the rest; an
already withdrawn and refunded contract answers 409. Entitlement is not written by the route: the
signed `customer.subscription.deleted` webhook reconciles it. Owner decision: refunds are always
in full (no compensation for days used), so checkout no longer records an immediate-start waiver.
Tests: `tests/billing-withdraw.test.ts` (stateful fake Stripe with idempotency replay: own
contract, partial prior refund, cancelled-to-period-end, second submission, Stripe failure then
retry, outside 14 days, start date versus creation time, other price, forged ids and other
customers, foreign invoice, signed out, cross-site, missing origin, billing off; deadline across
CET/CEST). The fixture does not prove Stripe's real refund email or its DELETE semantics; the
go-live checklist covers a test-mode withdrawal.

## On-site payment form — 9 November 2026

The redirect to Stripe-hosted Checkout is replaced by Stripe's Payment Element on `/supporter`
(owner decision, "option 3"). This replaces the Checkout-session operations described above. Card, Apple Pay, Google Pay and Link details are typed into Stripe's
iframes and go straight to Stripe; Outpost's own button "Zahlungspflichtig bestellen" calls
`stripe.confirmPayment`. Stripe.js is loaded from `js.stripe.com` only when the buyer presses
"Continue to payment", never bundled or loaded on page view.

`POST /api/billing/checkout` keeps its checks (origin, session, budget, `salesOpen()`, strict
`{terms: true}`, current plan) and the durable operation on `User.billingCheckout`, which now holds
`{key, customerId, userId, priceId, consentAt, subscriptionId?}`. Concurrent requests reuse the
operation, so they send identical parameters under one idempotency key `subscription-<key>`.
Each request lists the customer's subscriptions first: any live one other than `incomplete`
returns 409. It then resolves the operation's subscription by its saved id, by its
`metadata[outpostCheckoutId]` in the customer's history (recovery after a crash or after Stripe's
24-hour key retention), or creates it with `payment_behavior=default_incomplete`,
`payment_settings[save_default_payment_method]=on_subscription`, metadata `outpostUserId`,
`outpostCheckoutId`, `outpostConsentAt`, and `expand[]=latest_invoice.payment_intent`. The reply
must name the same customer, key and configured price. Only the PaymentIntent's client secret
and the subscription id go back, and only while it waits for the buyer (`requires_*`); a
processing or succeeded payment answers 409. An `incomplete_expired` subscription (Stripe expires
unpaid ones after 23 hours) or a cancelled PaymentIntent retires the operation and the request
starts a new one. Payment methods are not listed: the dashboard's default payment method
configuration decides.

Stripe API version stays `2024-06-20`, so the client secret is `latest_invoice.payment_intent.
client_secret` (newer versions move it to `latest_invoice.confirmation_secret`) and paid invoices
keep `charge`, which the withdrawal refunds. Entitlement still changes only in the webhook:
`customer.subscription.created` (`incomplete`, Free) and `customer.subscription.updated`
(`active` once the first invoice is paid). No invoice events are needed; a failed first payment
leaves the subscription `incomplete`. `checkout.session.completed` is no longer handled.

Cancellation and withdrawal skip `incomplete` subscriptions (no contract yet). Account deletion
resolves the open operation, then voids each unpaid order's open first invoice (Stripe refuses
once a payment is processing or done, so a paid order is never cancelled there) and ends the
subscription; a processing payment blocks deletion with 409.

The publishable key is a runtime setting (`STRIPE_PUBLISHABLE_KEY`, `pk_live_`/`pk_test_` only;
the validator refuses a secret key there and any partial set of the four) read on the server and
passed to the order component, so the Cloudflare build needs no `NEXT_PUBLIC_` value. The success
return carries `payment_intent_client_secret`; `/supporter` redirects to drop it from the URL and
shows only the outcome, which grants nothing.

Tests: `tests/billing-checkout.test.ts` (stateful fake Stripe with idempotency replay: one
subscription and secret, reuse, three concurrent orders, recovery without a second create,
expired order starts over, Supporter / active subscription / processing payment refused, bad
consent bodies, signed out, cross-site, missing origin, sales closed, publishable key missing,
Stripe failure then replay, no foreign customer, deletion voids an unpaid order and waits for a
processing one), `tests/billing-reconciliation.test.ts` (exact create parameters and key, recovery
by metadata, forged customer/key/price, duplicates), `tests/billing-webhook-reconciliation.test.ts`
(incomplete → active, Checkout and invoice events ignored), `tests/billing-withdraw.test.ts` and
`tests/billing-cancel.test.ts` (paid on-site orders refunded and cancelled, unpaid ones left alone),
`tests/proxy-stripe-csp.test.ts`, `tests/supporter-order.test.ts`, and the PostgreSQL fixture in
`scripts/test-billing-security.ts`. Not verified here: real Stripe.js rendering, 3-D Secure,
Apple Pay / Google Pay / Link in the live account, and Stripe's emails; the go-live checklist
covers them with one real purchase and withdrawal.

Provider references: [subscription listing](https://docs.stripe.com/api/subscriptions/list),
[subscriptions with the Payment Element](https://docs.stripe.com/billing/subscriptions/build-subscriptions?ui=elements),
[CSP for Stripe.js](https://docs.stripe.com/security/guide#content-security-policy),
[idempotent requests](https://docs.stripe.com/api/idempotent_requests).
