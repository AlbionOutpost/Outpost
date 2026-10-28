import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, openSync, closeSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const folder = resolve(".qa/cloudflare-database-test");
mkdirSync(folder, { recursive: true });
// This harness is generated only under ignored local QA artifacts. The production data Worker
// has no HTTP query endpoint and always returns 404. Never deploy this harness.
writeFileSync(
  `${folder}/harness.mjs`,
  `export default {async fetch(request,env){if(new URL(request.url).pathname==='/local-only-worker-fetch')return env.DATA.fetch(request);if(new URL(request.url).pathname!=='/local-only-test')return new Response('Not found',{status:404});const {method,args}=await request.json();if(!['query','service','rateLimit','upstreamBlock','upstreamBlocked','health','archiveList','archiveFind'].includes(method))return new Response('Denied',{status:403});return Response.json((await env.DATA[method](...args)) ?? null);}};`,
);
writeFileSync(
  `${folder}/wrangler.jsonc`,
  JSON.stringify(
    {
      name: "outpost-local-database-harness",
      main: "harness.mjs",
      compatibility_date: "2026-10-28",
      workers_dev: false,
      preview_urls: false,
      services: [{ binding: "DATA", service: "albionoutpost-data" }],
    },
    null,
    2,
  ),
);
const log = openSync(`${folder}/runtime.log`, "w");
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    `${folder}/wrangler.jsonc`,
    "--config",
    "cloudflare/database/wrangler.jsonc",
    "--ip",
    "127.0.0.1",
    "--port",
    "8790",
    "--inspector-port",
    "0",
    "--persist-to",
    `${folder}/state`,
  ],
  {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: `${folder}/config`,
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_SEND_ERROR_REPORTS: "false",
      CLOUDFLARE_API_TOKEN: "",
      CLOUDFLARE_DNS_API_TOKEN: "",
    },
    stdio: ["ignore", log, log],
  },
);
const results = [];
const fixture = `cf-qa-${randomUUID()}`;
const userA = `${fixture}-a`,
  userB = `${fixture}-b`,
  groupId = `${fixture}-g`;
const call = async (method, ...args) => {
  const response = await fetch("http://127.0.0.1:8790/local-only-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, args }),
    signal: AbortSignal.timeout(20_000),
  });
  assert.equal(response.status, 200);
  return response.json();
};
const queries = async (...queries) => {
  const reply = await call("query", queries);
  assert.equal(reply.ok, true, JSON.stringify(reply));
  return reply.value;
};
const query = async (model, operation, args) => (await queries({ model, operation, args }))[0];
const service = async (name, ...args) => {
  const reply = await call("service", name, args);
  assert.equal(reply.ok, true, JSON.stringify(reply));
  return reply.value;
};
const denied = async (status, name, ...args) => {
  const reply = await call("service", name, args);
  assert.equal(reply.ok, false);
  assert.equal(reply.error.status, status, JSON.stringify(reply));
};
const check = async (name, run) => {
  await run();
  results.push({ name, status: "PASS" });
  console.log(`PASS ${name}`);
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw new Error("Local Cloudflare runtime exited; see runtime.log");
    try {
      ready = await call("health");
      if (ready) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.equal(ready, true, "Cloudflare runtime did not become ready");
  await check("binding health and public HTTP denial", async () => {
    assert.equal(await call("health"), true);
    assert.equal((await fetch("http://127.0.0.1:8790/local-only-worker-fetch")).status, 404);
  });
  await check("query allowlist and public catalog write denial", async () => {
    for (const value of [
      { model: "user", operation: "$queryRaw", args: {} },
      { model: "__proto__", operation: "findMany", args: {} },
      { model: "itemMetadata", operation: "deleteMany", args: {} },
    ]) {
      const reply = await call("query", [value]);
      assert.equal(reply.ok, false);
    }
    const result = await call("service", "constructor", []);
    assert.equal(result.ok, false);
  });
  await check("batch rollback after a foreign-key failure", async () => {
    const id = `${fixture}-rollback`;
    const reply = await call("query", [
      { model: "user", operation: "create", args: { data: { id } } },
      {
        model: "session",
        operation: "create",
        args: {
          data: {
            sessionToken: `${id}-session`,
            userId: "missing-user",
            expires: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      },
    ]);
    assert.equal(reply.ok, false);
    assert.equal(await query("user", "count", { where: { id } }), 0);
  });
  await query("user", "create", { data: { id: userA, name: "Cloudflare isolated QA owner" } });
  await query("user", "create", { data: { id: userB, name: "Cloudflare isolated QA outsider" } });
  const gear = {
    slot: "Main hand",
    itemId: "T4_MAIN_AXE",
    quality: 1,
    abilities: "",
    alternatives: "",
    abilitySelections: {},
    alternativeItemIds: ["T4_MAIN_SWORD"],
  };
  const draft = {
    title: "Cloudflare atomic loadout",
    description: "Isolated QA fixture",
    contentType: "Other",
    region: "europe",
    visibility: "PRIVATE",
    playerCount: 1,
    recommendedIP: 0,
    strategy: "",
    patchNotes: "",
    equipment: [gear],
    equipmentSets: [
      {
        id: randomUUID(),
        name: "Spare gear",
        equipment: [
          {
            slot: "Main hand",
            itemId: "T4_MAIN_SWORD",
            quality: 1,
            abilities: {},
            alternatives: [],
          },
        ],
      },
    ],
  };
  const { equipment, ...fields } = draft;
  const build = await query("build", "create", {
    data: {
      ...fields,
      authorId: userA,
      equipment: { create: equipment },
      versions: { create: { version: 1, snapshot: draft } },
    },
    include: { equipment: true },
  });
  await check("private defaults and equipment JSON round-trip", async () => {
    assert.equal(build.visibility, "PRIVATE");
    assert.deepEqual(build.equipment[0].alternativeItemIds, ["T4_MAIN_SWORD"]);
    assert.deepEqual(build.equipmentSets, draft.equipmentSets);
    assert.ok(build.createdAt);
  });
  await check("private clone denial leaves storage unchanged", async () => {
    await denied(404, "duplicateBuild", build.id, userB);
    assert.equal(await query("build", "count", { where: { authorId: userB } }), 0);
  });
  await check("owner clone remains private with gear and versions", async () => {
    const copy = await service("duplicateBuild", build.id, userA);
    const row = await query("build", "findUnique", {
      where: { id: copy.id },
      include: { equipment: true, versions: true },
    });
    assert.equal(row.visibility, "PRIVATE");
    assert.equal(row.versions.length, 1);
    assert.deepEqual(row.equipment[0].alternativeItemIds, gear.alternativeItemIds);
  });
  await check("revision owner denial and single-winner concurrent updates", async () => {
    await denied(409, "reviseBuild", build.id, userB, draft, 1);
    const replies = await Promise.all([
      call("service", "reviseBuild", [
        build.id,
        userA,
        { ...draft, title: "First racing revision" },
        1,
      ]),
      call("service", "reviseBuild", [
        build.id,
        userA,
        { ...draft, title: "Second racing revision" },
        1,
      ]),
    ]);
    assert.equal(replies.filter((r) => r.ok).length, 1, JSON.stringify(replies));
    assert.equal(replies.find((r) => !r.ok).error.status, 409);
    const row = await query("build", "findUnique", {
      where: { id: build.id },
      include: { equipment: true, versions: true },
    });
    assert.equal(row.version, 2);
    assert.equal(row.versions.length, 2);
    assert.equal(row.equipment.length, 1);
  });
  await check("SQLite case-insensitive filters preserve snapshot JSON mode", async () => {
    const rows = await query("build", "findMany", {
      where: { authorId: userA, title: { contains: "RACING", mode: "insensitive" } },
    });
    assert.equal(rows.length, 1);
  });
  await query("group", "create", {
    data: {
      id: groupId,
      slug: groupId,
      name: "Cloudflare isolated QA guild",
      region: "europe",
      description: "",
      ownerId: userA,
      members: { create: { userId: userA, role: "OWNER" } },
    },
  });
  await check("outsider guild mutation denied, owner invite and revoke", async () => {
    await denied(404, "mutateGroup", groupId, userB, { action: "invite", hours: 1 });
    const invitation = await service("mutateGroup", groupId, userA, { action: "invite", hours: 1 });
    await service("mutateGroup", groupId, userA, { action: "revoke", invitationId: invitation.id });
    await denied(410, "acceptInvitation", invitation.path.split("/").at(-1), userB);
    assert.equal(await query("groupMember", "count", { where: { groupId, userId: userB } }), 0);
  });
  let composition;
  await check("composition destination authorization, save and delete", async () => {
    const input = {
      title: "Cloudflare isolated roster",
      description: "",
      contentType: "Other",
      region: "europe",
      visibility: "GROUP",
      groupId,
      notes: "",
      slots: [
        {
          id: randomUUID(),
          playerName: "",
          role: "Tank",
          customRole: "",
          mandatory: true,
          substitute: "",
          notes: "",
          sourceBuildId: null,
          equipment: [],
          equipmentSets: [],
        },
      ],
    };
    await denied(403, "saveComposition", userB, input);
    composition = await service("saveComposition", userA, input);
    await denied(404, "deleteComposition", composition.id, userB);
    await service("deleteComposition", composition.id, userA);
    assert.equal(await query("composition", "count", { where: { id: composition.id } }), 0);
  });
  await check("private community access and moderator denial", async () => {
    await denied(404, "communityMutation", "build", build.id, userB, {
      action: "comment",
      body: "Denied outsider comment",
    });
    await denied(403, "moderateReport", userB, {
      reportId: "missing",
      version: 1,
      action: "hide",
      note: "Denied outsider moderation",
    });
    assert.equal(await query("contentComment", "count", { where: { buildId: build.id } }), 0);
    const comment = await service("communityMutation", "build", build.id, userA, {
      action: "comment",
      body: "Owner fixture comment",
    });
    assert.ok(comment.id);
    await denied(409, "communityMutation", "build", build.id, userA, {
      action: "comment",
      body: "Owner fixture comment",
    });
  });
  await check("watchlist identity is region and quality specific", async () => {
    const input = { region: "europe", itemId: "T4_MAIN_AXE", quality: 1 };
    const first = await service("saveWatchItem", userA, input),
      again = await service("saveWatchItem", userA, input);
    assert.equal(first.id, again.id);
    const different = await service("saveWatchItem", userA, { ...input, region: "asia" });
    assert.notEqual(different.id, first.id);
    assert.equal(await query("marketWatchItem", "count", { where: { userId: userB } }), 0);
  });
  await check("persistent rate budget has exactly three concurrent winners", async () => {
    const hits = await Promise.all(
      Array.from({ length: 12 }, () => call("rateLimit", fixture, 3, 60)),
    );
    assert.equal(hits.filter(Boolean).length, 3);
    assert.equal(await call("rateLimit", `${fixture}-other`, 3, 60), true);
  });
  await check("regional upstream cooldown is shared and isolated", async () => {
    await call("upstreamBlock", "asia", 1000);
    assert.equal(await call("upstreamBlocked", "asia"), true);
    assert.equal(await call("upstreamBlocked", "europe"), false);
    assert.equal(await call("rateLimit", "upstream:asia", 20, 60), false);
  });
  await check(
    "public item catalog count, filter, release relation and parameter bounds",
    async () => {
      assert.equal(await query("itemMetadata", "count", { where: { active: true } }), 7510);
      const rows = await query("itemMetadata", "findMany", {
        where: { active: true, name: { contains: "AXE", mode: "insensitive" } },
        take: 8,
        select: { id: true, name: true },
      });
      assert.ok(rows.length);
      const item = await query("itemMetadata", "findUnique", {
        where: { id: "T4_MAIN_AXE" },
        include: { release: true },
      });
      assert.ok(item.release.checksum);
      const long = await query("itemMetadata", "findMany", {
        where: { name: { contains: "a".repeat(100), mode: "insensitive" } },
        take: 8,
      });
      assert.equal(long.length, 0);
    },
  );
  await check("D1 archive search/order/pagination matches the owned source", async () => {
    const builds = JSON.parse(readFileSync("public/library/grind-builds.json", "utf8"));
    const expected = builds
      .filter(
        (b) =>
          b.category === "MISTS_SOLO" &&
          `${b.title} ${b.weaponName} ${b.author} ${b.tags.join(" ")}`
            .toLowerCase()
            .includes("axe"),
      )
      .sort((a, b) => a.title.localeCompare(b.title));
    const page = await call("archiveList", "builds", {
      q: "AXE",
      category: "MISTS_SOLO",
      sort: "title",
      page: 1,
    });
    assert.equal(page.total, 10770);
    assert.equal(page.matched, expected.length);
    assert.deepEqual(page.rows, expected.slice(0, 24));
    const last = await call("archiveList", "builds", {
      q: "AXE",
      category: "MISTS_SOLO",
      sort: "title",
      page: 999999,
    });
    assert.equal(last.page, last.pages);
    assert.deepEqual(last.rows, expected.slice((last.page - 1) * 24));
    const source = builds.find((b) => b.slug === "battleaxe-mist-build");
    const found = await call("archiveFind", "builds", [source.id, source.slug]);
    assert.equal(found.length, 1);
    assert.deepEqual(found[0], source);
    const ids = builds.slice(0, 100).map((b) => b.id);
    assert.equal((await call("archiveFind", "builds", ids)).length, 100);
    const comps = await call("archiveList", "compositions", { page: 1 });
    assert.equal(comps.total, 682);
    assert.equal(comps.rows.length, 18);
  });
  await check("fixture cleanup cascades related private records", async () => {
    await query("group", "delete", { where: { id: groupId } });
    await query("user", "deleteMany", { where: { id: { in: [userA, userB] } } });
    assert.equal(await query("build", "count", { where: { authorId: userA } }), 0);
    assert.equal(await query("marketWatchItem", "count", { where: { userId: userA } }), 0);
  });
  writeFileSync(
    `${folder}/result.json`,
    JSON.stringify(
      {
        status: "PASS",
        runtime: "local workerd; isolated fixtures; not real OAuth or production deployment",
        results,
      },
      null,
      2,
    ),
  );
} catch (error) {
  writeFileSync(
    `${folder}/result.json`,
    JSON.stringify(
      {
        status: "FAIL",
        results,
        error: error instanceof Error ? error.message : "Unexpected test failure",
      },
      null,
      2,
    ),
  );
  console.error(error instanceof Error ? error.message : "Cloudflare integration test failed");
  process.exitCode = 1;
} finally {
  try {
    await query("group", "deleteMany", { where: { id: groupId } });
    await query("user", "deleteMany", {
      where: { id: { in: [userA, userB, `${fixture}-rollback`] } },
    });
  } catch {}
  child.kill("SIGINT");
  await new Promise((resolveExit) => {
    if (child.exitCode !== null) return resolveExit();
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolveExit();
    }, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolveExit();
    });
  });
  closeSync(log);
}
