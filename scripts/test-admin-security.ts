/** Isolated database/session regressions; no real OAuth, payments or production access. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import { adminBanAction, adminUserAction } from "../src/lib/admin/service";
import { activeSession, createActiveSession } from "../src/lib/admin/sessions";
import { discordBanned } from "../src/lib/admin/access";
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw Error("Admin fixtures require local PostgreSQL");
const ids = [`admin-fixture-${randomUUID()}`, `admin-fixture-${randomUUID()}`],
  discordId = `9${Date.now()}1234`;
const previousOwner = process.env.OUTPOST_OWNER_DISCORD_ID;
const protectedOwner = "700000000000000001";
process.env.OUTPOST_OWNER_DISCORD_ID = protectedOwner;
let passed = 0;
const check = (name: string) => {
  passed++;
  console.log(JSON.stringify({ name, status: "PASS" }));
};
try {
  await db.user.create({ data: { id: ids[0], role: "ADMIN" } });
  await db.user.create({
    data: {
      id: ids[1],
      accounts: { create: { provider: "discord", providerAccountId: discordId, type: "oauth" } },
    },
  });
  const value = {
    discordId,
    action: "ban" as const,
    days: 7 as const,
    reason: "Local security fixture",
    version: 0,
    confirmation: `BAN ${discordId}`,
  };
  await assert.rejects(
    adminBanAction(ids[0], {
      ...value,
      discordId: protectedOwner,
      confirmation: `BAN ${protectedOwner}`,
    }),
    (error: unknown) => (error as { status?: number }).status === 403,
  );
  assert.equal(await db.discordBan.count({ where: { discordId: protectedOwner } }), 0);
  check("configured owner identity is protected even without an Outpost account");
  const first = randomUUID();
  await createActiveSession({
    userId: ids[1],
    sessionToken: first,
    expires: new Date(Date.now() + 600000),
  });
  assert.ok(await activeSession(first));
  await adminBanAction(ids[0], value);
  assert.equal(await activeSession(first), null);
  await assert.rejects(
    createActiveSession({
      userId: ids[1],
      sessionToken: randomUUID(),
      expires: new Date(Date.now() + 600000),
    }),
  );
  check("ban atomically revokes earlier sessions and refuses later OAuth session creation");
  // Race through the exact two named operations; whichever serializes first, no live session survives.
  await adminBanAction(ids[0], {
    ...value,
    action: "unban",
    days: 0,
    version: 1,
    confirmation: `UNBAN ${discordId}`,
  });
  const raced = randomUUID();
  await Promise.allSettled([
    createActiveSession({
      userId: ids[1],
      sessionToken: raced,
      expires: new Date(Date.now() + 600000),
    }),
    adminBanAction(ids[0], { ...value, version: 2 }),
  ]);
  assert.equal(await activeSession(raced), null);
  assert.equal(await db.session.count({ where: { userId: ids[1] } }), 0);
  check("concurrent ban/session creation leaves no usable or resurrectable session");
  await adminBanAction(ids[0], {
    ...value,
    action: "unban",
    days: 0,
    version: 3,
    confirmation: `UNBAN ${discordId}`,
  });
  const newToken = randomUUID();
  await createActiveSession({
    userId: ids[1],
    sessionToken: newToken,
    expires: new Date(Date.now() + 600000),
  });
  assert.ok(await activeSession(newToken));
  assert.equal(await activeSession(first), null);
  check("unban permits a new sign-in without restoring a revoked cookie");
  const expired = randomUUID();
  await db.session.create({
    data: { userId: ids[1], sessionToken: expired, expires: new Date(0) },
  });
  assert.equal(await activeSession(expired), null);
  assert.equal(await db.session.count({ where: { sessionToken: expired } }), 0);
  check("expired session reads remove the stale record");
  const target = await db.user.findUniqueOrThrow({ where: { id: ids[1] } });
  await db.user.update({ where: { id: ids[0] }, data: { role: "USER" } });
  await assert.rejects(
    adminUserAction(ids[0], ids[1], {
      action: "grant",
      days: 0,
      reason: "Never permit this grant",
      expectedUpdatedAt: target.updatedAt.toISOString(),
    }),
  );
  assert.equal(
    (await db.user.findUniqueOrThrow({ where: { id: ids[1] } })).supporterGiftPermanent,
    false,
  );
  check("revoked admin role cannot mutate entitlements through a named domain service");
  await db.user.update({ where: { id: ids[0] }, data: { role: "ADMIN" } });
  await adminBanAction(ids[0], { ...value, version: 4 });
  await db.user.delete({ where: { id: ids[1] } });
  assert.equal(await discordBanned(discordId), true);
  check("Discord ban remains authoritative after profile deletion");
  console.log(
    JSON.stringify({
      status: "PASS",
      passed,
      scope: "local PostgreSQL; fixture identities; no real OAuth",
    }),
  );
} finally {
  if (previousOwner === undefined) delete process.env.OUTPOST_OWNER_DISCORD_ID;
  else process.env.OUTPOST_OWNER_DISCORD_ID = previousOwner;
  await db.adminAudit.deleteMany({ where: { actorId: { in: ids } } });
  await db.discordBan.deleteMany({ where: { discordId } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
