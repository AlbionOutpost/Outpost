#!/usr/bin/env node
// Point-in-time recovery for the private account database (Durable Object "accounts-v1-eu").
// Cloudflare keeps 30 days of SQLite history. This script briefly deploys a private helper
// Worker bound to the data Worker's OutpostDatabase class, runs one action, then deletes it.
//
//   node scripts/cloudflare-recovery.mjs bookmark                 # current bookmark (read-only)
//   node scripts/cloudflare-recovery.mjs bookmark --at <ISO time> # bookmark for a past time
//   node scripts/cloudflare-recovery.mjs restore --at <ISO time>  # dry run: show what would happen
//   node scripts/cloudflare-recovery.mjs restore --at <ISO time> --apply
//   node scripts/cloudflare-recovery.mjs restore --bookmark <b> --apply   # e.g. undo a restore
//
// A restore rewinds ALL accounts, builds, comps and Teams to that moment. Anything written
// afterwards is lost unless you undo with the printed undo bookmark. Requires npm ci and
// the owner-only .env.cloudflare credentials.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { cloudflareRequest, loadCloudflareCredentials } from "./cloudflare-client.mjs";

const helper = "albionoutpost-recovery";
const [action, ...rest] = process.argv.slice(2);
const option = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const apply = rest.includes("--apply");
const at = option("--at");
const bookmarkArg = option("--bookmark");

if (!["bookmark", "restore"].includes(action)) {
  console.error(
    "Usage: cloudflare-recovery.mjs bookmark [--at ISO] | restore (--at ISO | --bookmark B) [--apply]",
  );
  process.exit(2);
}
let time;
if (at) {
  time = Date.parse(at);
  if (!Number.isFinite(time)) throw Error(`Not a valid time: ${at}`);
}
if (action === "restore" && !time && !bookmarkArg) throw Error("restore needs --at or --bookmark");

const worker = `export default {
  async fetch(request, env) {
    if (request.headers.get("authorization") !== "Bearer " + env.RECOVERY_TOKEN)
      return new Response("Not found", { status: 404 });
    const { action, time, bookmark } = await request.json();
    const db = env.DATABASE.getByName("accounts-v1-eu");
    try {
      if (action === "bookmark") return Response.json({ bookmark: await db.recoveryBookmark(time) });
      if (action === "restore") return Response.json({ undo: await db.recoveryRestore(bookmark) });
      if (action === "restart") {
        try { await db.recoveryRestart(); } catch {}
        return Response.json({ restarted: true });
      }
      if (action === "health") return Response.json({ ok: await db.health() });
    } catch (error) {
      return Response.json({ error: String(error?.message ?? error) }, { status: 500 });
    }
    return new Response("Bad request", { status: 400 });
  },
};
`;

const dir = ".qa/recovery";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/worker.js`, worker);
writeFileSync(
  `${dir}/wrangler.jsonc`,
  JSON.stringify(
    {
      name: helper,
      main: "worker.js",
      compatibility_date: "2026-10-28",
      workers_dev: true,
      preview_urls: false,
      durable_objects: {
        bindings: [
          { name: "DATABASE", class_name: "OutpostDatabase", script_name: "albionoutpost-data" },
        ],
      },
    },
    null,
    2,
  ),
);

const wrangler = (args) => {
  const result = spawnSync(process.execPath, ["scripts/cloudflare.mjs", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (result.status !== 0)
    throw Error(`wrangler ${args[0]} failed:\n${result.stderr || result.stdout}`);
};

const token = randomBytes(32).toString("hex");
const { accountId } = loadCloudflareCredentials();
const subdomain = (await cloudflareRequest("GET", `/accounts/${accountId}/workers/subdomain`))
  .result.subdomain;
const url = `https://${helper}.${subdomain}.workers.dev/`;

async function call(body) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => undefined);
    if (response && response.status !== 404 && response.status < 520) {
      const data = await response.json();
      if (data.error) throw Error(data.error);
      return data;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // workers.dev propagation
  }
  throw Error("Recovery helper did not respond");
}

const report = { action, requestedAt: new Date().toISOString(), at: at ?? null, applied: false };
console.log(`Deploying temporary helper ${helper}…`);
wrangler(["deploy", "--config", `${dir}/wrangler.jsonc`, "--var", `RECOVERY_TOKEN:${token}`]);
try {
  report.current = (await call({ action: "bookmark" })).bookmark;
  if (time) report.target = (await call({ action: "bookmark", time })).bookmark;
  if (bookmarkArg) report.target = bookmarkArg;

  if (action === "restore") {
    if (!apply) {
      console.log("Dry run. Re-run with --apply to rewind the private database to:", report.target);
    } else {
      report.undo = (await call({ action: "restore", bookmark: report.target })).undo;
      await call({ action: "restart" });
      report.healthy = (await call({ action: "health" })).ok;
      report.applied = true;
      console.log("Restored. To undo, run:");
      console.log(
        `  node scripts/cloudflare-recovery.mjs restore --bookmark ${report.undo} --apply`,
      );
    }
  }
} finally {
  console.log(`Deleting temporary helper ${helper}…`);
  wrangler(["delete", "--name", helper, "--force"]);
  const file = `${dir}/${report.requestedAt.replace(/[:.]/g, "-")}-${action}.json`;
  writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
