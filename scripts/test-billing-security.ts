/** Isolated local persistence regressions. Stripe is an in-process fixture; no provider calls. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { mutateGroup, acceptInvitation } from "../src/lib/groups/service";
import { seedTeamRoles } from "../src/lib/groups/roles";
import { applySubscription } from "../src/lib/billing/plan";
import { beginCheckout, resolveOrder, updateCheckout } from "../src/lib/billing/checkout";
import { verifyDeletionBilling, deleteAccountRecord } from "../src/lib/account-deletion";

const database = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
  throw new Error("Billing security fixtures require disposable local PostgreSQL");
const prefix = `audit-billing-${randomUUID()}`;
const users = ["owner", "officer", "outside", "recovery", "paid", "race", "tracked"].map(
  (name) => `${prefix}-${name}`,
);
const originalFetch = globalThis.fetch;
const environment = Object.fromEntries(
  [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_SUPPORTER",
    "STRIPE_PUBLISHABLE_KEY",
  ].map((key) => [key, process.env[key]]),
);
process.env.STRIPE_SECRET_KEY = "fixture-only";
process.env.STRIPE_WEBHOOK_SECRET = "fixture-only";
process.env.STRIPE_PRICE_SUPPORTER = "price_fixture";
process.env.STRIPE_PUBLISHABLE_KEY = "pk_test_fixture";
const config = {
  secretKey: "fixture-only",
  webhookSecret: "fixture-only",
  priceId: "price_fixture",
  publishableKey: "pk_test_fixture",
};
type Sub = {
  id: string;
  customer: string;
  status: string;
  created: number;
  current_period_end: null;
  metadata?: { outpostCheckoutId?: string };
  items: { data: { price: { id: string } }[] };
  latest_invoice?: string;
};
const subscriptions = new Map<string, Sub[]>();
// Each order's first invoice and its PaymentIntent status.
const invoices = new Map<string, { status: string; payment: string }>();
let unavailable = false,
  creates = 0,
  groupId = "",
  passed = 0;
const check = (name: string) => {
  passed++;
  console.log(JSON.stringify({ name, passed: true }));
};
const expanded = (sub: Sub) => {
  const invoice = sub.latest_invoice ? invoices.get(sub.latest_invoice) : undefined;
  return {
    ...sub,
    latest_invoice: invoice && {
      id: sub.latest_invoice,
      status: invoice.status,
      customer: sub.customer,
      payment_intent: { id: `pi_${sub.id}`, status: invoice.payment, client_secret: "fixture" },
    },
  };
};
globalThis.fetch = async (input, init) => {
  if (unavailable) throw new Error("Fixture provider unavailable");
  const url = new URL(String(input));
  assert.equal(url.origin, "https://api.stripe.com", "No unexpected network target");
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
  const method = init?.method ?? "GET";
  if (url.pathname === "/v1/subscriptions" && method === "GET")
    return reply({
      data: subscriptions.get(url.searchParams.get("customer")!) || [],
      has_more: false,
    });
  if (url.pathname === "/v1/subscriptions" && method === "POST") {
    const body = new URLSearchParams(String(init!.body));
    const key = body.get("metadata[outpostCheckoutId]")!;
    assert.equal(
      (init!.headers as Record<string, string>)["Idempotency-Key"],
      `subscription-${key}`,
    );
    assert.equal(body.get("payment_behavior"), "default_incomplete");
    const list = subscriptions.get(body.get("customer")!) ?? [];
    const old = list.find((sub) => sub.metadata?.outpostCheckoutId === key);
    if (old) return reply(expanded(old));
    creates++;
    const created: Sub = {
      id: `sub_${randomUUID()}`,
      customer: body.get("customer")!,
      status: "incomplete",
      created: Date.now(),
      current_period_end: null,
      metadata: { outpostCheckoutId: key },
      items: { data: [{ price: { id: body.get("items[0][price]")! } }] },
      latest_invoice: `in_${randomUUID()}`,
    };
    invoices.set(created.latest_invoice!, { status: "open", payment: "requires_payment_method" });
    subscriptions.set(created.customer, [...list, created]);
    return reply(expanded(created));
  }
  const [, , kind, id] = url.pathname.split("/");
  if (kind === "invoices" && url.pathname.endsWith("/void")) {
    const invoice = invoices.get(id)!;
    if (invoice.status !== "open" || ["processing", "succeeded"].includes(invoice.payment))
      return reply({ error: { code: "invoice_not_open" } }, 400);
    Object.assign(invoice, { status: "void", payment: "canceled" });
    return reply({ id, status: "void" });
  }
  const found = [...subscriptions.values()].flat().find((sub) => sub.id === id);
  assert.ok(kind === "subscriptions" && found, "Unknown provider fixture path");
  if (method === "DELETE") found.status = "canceled";
  return reply(expanded(found));
};
const customer = (user: string) => `cus_${user}`;
const checkoutInput = (user: string) => ({
  customerId: customer(user),
  priceId: config.priceId,
  consentAt: new Date().toISOString(),
});
const current = (user: string) => db.user.findUniqueOrThrow({ where: { id: user } });
try {
  await db.user.createMany({ data: users.map((id) => ({ id, name: "Isolated billing fixture" })) });
  const group = await db.group.create({
    data: {
      ownerId: users[0],
      name: "Invitation revocation fixture",
      slug: prefix,
      description: "",
      region: "europe",
      visibility: "PRIVATE",
      members: {
        create: [
          { userId: users[0], role: "OWNER" },
          { userId: users[1], role: "OFFICER" },
        ],
      },
    },
  });
  groupId = group.id;
  await seedTeamRoles(db, groupId);
  const officer = await db.groupCustomRole.findFirstOrThrow({
    where: { groupId, name: "Officer" },
  });
  for (const mode of ["remove", "demote", "leave", "legacy"] as const) {
    await db.groupMember.upsert({
      where: { groupId_userId: { groupId, userId: users[1] } },
      create: { groupId, userId: users[1], role: "OFFICER" },
      update: { role: "OFFICER" },
    });
    await db.groupRoleAssignment.upsert({
      where: { roleId_userId: { roleId: officer.id, userId: users[1] } },
      create: { groupId, userId: users[1], roleId: officer.id },
      update: {},
    });
    const invitation = await mutateGroup(groupId, users[1], { action: "invite", hours: 1 });
    if (!("path" in invitation)) throw new Error("Invitation result missing");
    if (mode === "demote")
      await mutateGroup(groupId, users[0], {
        action: "member-roles",
        userId: users[1],
        roleIds: [],
      });
    else if (mode === "legacy")
      await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: users[1] } } });
    else
      await mutateGroup(
        groupId,
        mode === "leave" ? users[1] : users[0],
        mode === "leave" ? { action: "leave" } : { action: "remove", userId: users[1] },
      );
    await assert.rejects(() => acceptInvitation(invitation.path.split("/").pop()!, users[2]), {
      status: 410,
    });
    if (mode !== "legacy")
      assert.ok(
        (await db.groupInvitation.findUniqueOrThrow({ where: { id: invitation.id } })).revokedAt,
      );
    assert.equal(await db.groupMember.count({ where: { groupId, userId: users[2] } }), 0);
    check(`invitation issuer ${mode} denies admission and retains outsider state`);
  }
  const allowed = await mutateGroup(groupId, users[0], { action: "invite", hours: 1 });
  if (!("path" in allowed)) throw new Error("Invitation missing");
  await acceptInvitation(allowed.path.split("/").pop()!, users[2]);
  check("current owner invitation still admits a member");
  delete process.env.STRIPE_SECRET_KEY;
  await deleteAccountRecord(users[2], await verifyDeletionBilling(users[2]));
  assert.equal(await db.user.count({ where: { id: users[2] } }), 0);
  process.env.STRIPE_SECRET_KEY = "fixture-only";
  check("a free account without billing associations can be deleted while billing is unconfigured");

  for (const user of users.slice(3))
    await db.user.update({
      where: { id: user },
      data: { stripeCustomerId: customer(user), planStatus: "canceled" },
    });
  const recover = users[3];
  const [intent, concurrent] = await Promise.all([
    beginCheckout(recover, checkoutInput(recover)),
    beginCheckout(recover, checkoutInput(recover)),
  ]);
  assert.equal(concurrent.key, intent.key);
  assert.equal(
    (
      await beginCheckout(recover, {
        ...checkoutInput(recover),
        consentAt: new Date(Date.now() + 1000).toISOString(),
      })
    ).key,
    intent.key,
  );
  unavailable = true;
  await assert.rejects(() => verifyDeletionBilling(recover));
  assert.ok((await current(recover)).billingCheckout);
  unavailable = false;
  // Stripe succeeds, but the caller crashes before saving its subscription id.
  await resolveOrder(config, intent);
  assert.equal(creates, 1);
  const cleared = await verifyDeletionBilling(recover);
  assert.equal(creates, 1);
  const [order] = subscriptions.get(customer(recover))!;
  assert.equal(order.status, "canceled");
  assert.equal(invoices.get(order.latest_invoice!)!.status, "void");
  await deleteAccountRecord(recover, cleared);
  assert.equal(await db.user.count({ where: { id: recover } }), 0);
  check("failed and interrupted order recovery voids and ends its sole unpaid subscription");

  const paid = users[4];
  subscriptions.set(customer(paid), [
    {
      id: "sub_active",
      customer: customer(paid),
      status: "active",
      created: 2,
      current_period_end: null,
      items: { data: [{ price: { id: config.priceId } }] },
    },
  ]);
  await assert.rejects(() => verifyDeletionBilling(paid), { status: 409 });
  assert.equal(await db.user.count({ where: { id: paid } }), 1);
  check("active provider subscription blocks deletion even when the local row says canceled");
  const before = await current(paid);
  await applySubscription({
    customerId: customer(paid),
    subscriptionId: `sub_new_${prefix}`,
    status: "active",
    periodEnd: null,
    expectedUpdatedAt: before.updatedAt.toISOString(),
  });
  await assert.rejects(
    () =>
      applySubscription({
        customerId: customer(paid),
        subscriptionId: `sub_old_${prefix}`,
        status: "canceled",
        periodEnd: null,
        expectedUpdatedAt: before.updatedAt.toISOString(),
      }),
    { status: 409 },
  );
  assert.equal((await current(paid)).plan, "SUPPORTER");
  check("stale concurrent reconciliation cannot overwrite newer entitlement");
  subscriptions.set(customer(paid), [
    {
      id: "sub_active",
      customer: customer(paid),
      status: "unknown_new_status",
      created: 2,
      current_period_end: null,
      items: { data: [{ price: { id: config.priceId } }] },
    },
  ]);
  await assert.rejects(() => verifyDeletionBilling(paid), { status: 409 });
  assert.equal(await db.user.count({ where: { id: paid } }), 1);
  check("an unknown provider subscription status preserves the account");
  subscriptions.set(customer(paid), [
    {
      id: "sub_active",
      customer: customer(paid),
      status: "canceled",
      created: 2,
      current_period_end: null,
      items: { data: [{ price: { id: config.priceId } }] },
    },
  ]);
  await deleteAccountRecord(paid, await verifyDeletionBilling(paid));
  assert.equal(await db.user.count({ where: { id: paid } }), 0);
  check(
    "unknown provider states deny deletion; verified cancellation permits deletion despite stale local Supporter status",
  );

  const race = users[5],
    clearance = await verifyDeletionBilling(race);
  await beginCheckout(race, checkoutInput(race));
  await assert.rejects(() => deleteAccountRecord(race, clearance), { status: 409 });
  assert.equal(await db.user.count({ where: { id: race } }), 1);
  await deleteAccountRecord(race, await verifyDeletionBilling(race));
  assert.equal(await db.user.count({ where: { id: race } }), 0);
  check("checkout beginning after billing clearance blocks stale deletion; retry recovers safely");
  const tracked = users[6];
  const trackedIntent = await beginCheckout(tracked, checkoutInput(tracked));
  const trackedOrder = await resolveOrder(config, trackedIntent);
  await updateCheckout(tracked, trackedIntent.key, trackedOrder.id);
  invoices.get(subscriptions.get(customer(tracked))![0].latest_invoice!)!.payment = "processing";
  await assert.rejects(() => verifyDeletionBilling(tracked), { status: 409 });
  assert.equal(await db.user.count({ where: { id: tracked } }), 1);
  assert.equal(subscriptions.get(customer(tracked))![0].status, "incomplete");
  subscriptions.get(customer(tracked))![0].status = "canceled";
  await deleteAccountRecord(tracked, await verifyDeletionBilling(tracked));
  assert.equal(await db.user.count({ where: { id: tracked } }), 0);
  check("an order whose payment is processing is never voided and blocks deletion until it ends");
  console.log(
    JSON.stringify({
      passed,
      provider: "in-process fixture; no network",
      persistence: "local PostgreSQL",
    }),
  );
} finally {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (groupId) await db.group.deleteMany({ where: { id: groupId } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
