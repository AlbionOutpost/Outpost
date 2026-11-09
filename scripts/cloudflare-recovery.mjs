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
// afterwards is lost unless you undo with the printed undo bookmark. Requires npm ci and the
// owner-only .env.cloudflare credentials, and --apply asks the owner to type a confirmation in an
// interactive terminal: CI, scripts and agents cannot answer it. docs/OPERATIONS.md § Backups.
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";

export const HELPER = "albionoutpost-recovery";
export const OBJECT = "accounts-v1-eu";
export const CONFIRMATION = `restore ${OBJECT}`;
const RETENTION = 30 * 24 * 3600 * 1000;
const BOOKMARK = /^[0-9a-f-]{16,200}$/i;

/** The action and options, validated before anything is deployed. */
export function parseArgs(argv, now = Date.now()) {
  const [action, ...rest] = argv;
  const option = (name) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  const usage =
    "Usage: cloudflare-recovery.mjs bookmark [--at ISO] | restore (--at ISO | --bookmark B) [--apply]";
  if (!["bookmark", "restore"].includes(action)) throw Error(usage);
  const at = option("--at");
  const bookmark = option("--bookmark");
  let time;
  if (at !== undefined) {
    time = Date.parse(at);
    if (!Number.isFinite(time)) throw Error(`Not a valid time: ${at}`);
    if (time > now || time < now - RETENTION)
      throw Error("The time must be within the last 30 days (Cloudflare keeps 30 days).");
  }
  if (bookmark !== undefined && !BOOKMARK.test(bookmark)) throw Error("Not a valid bookmark.");
  if (action === "restore" && (time === undefined) === (bookmark === undefined))
    throw Error("restore needs exactly one of --at or --bookmark");
  const apply = rest.includes("--apply");
  if (apply && action !== "restore") throw Error("--apply only goes with restore");
  return { action, at: at ?? null, time, bookmark, apply };
}

/** The helper Worker. It answers only a request carrying the run's random token (a secret of
 * the helper, never a plain variable) and only these four actions. */
export const helperSource = `export default {
  async fetch(request, env) {
    const sent = new TextEncoder().encode(request.headers.get("authorization") ?? "");
    const want = new TextEncoder().encode("Bearer " + env.RECOVERY_TOKEN);
    if (!env.RECOVERY_TOKEN || sent.length !== want.length || !crypto.subtle.timingSafeEqual(sent, want))
      return new Response("Not found", { status: 404 });
    const { action, time, bookmark } = await request.json();
    const db = env.DATABASE.getByName("${OBJECT}");
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

export const helperConfig = {
  name: HELPER,
  main: "worker.js",
  compatibility_date: "2026-10-28",
  workers_dev: true,
  preview_urls: false,
  durable_objects: {
    bindings: [
      { name: "DATABASE", class_name: "OutpostDatabase", script_name: "albionoutpost-data" },
    ],
  },
};

/** A restore target must be a well-formed bookmark other than the current state. Order is not
 * checked: an undo bookmark points just before the restore it undoes. */
export function checkTarget(target, current) {
  if (!BOOKMARK.test(target ?? "") || !BOOKMARK.test(current ?? ""))
    throw Error("Cloudflare returned an invalid bookmark.");
  if (target === current) throw Error("The target is the current state; nothing to restore.");
}

/** --apply needs the owner at an interactive terminal typing the confirmation. CI and anything
 * without a terminal (scripts, agents) is refused before a helper is deployed. */
export async function ownerConfirms({ env, stdin, ask }) {
  if (env.CI || env.GITHUB_ACTIONS) throw Error("A restore cannot run in CI.");
  if (!stdin.isTTY)
    throw Error("A restore needs the owner at an interactive terminal; it cannot be scripted.");
  const answer = await ask(
    `This rewinds every account, build, comp and Team. Type "${CONFIRMATION}" to continue: `,
  );
  if (answer.trim() !== CONFIRMATION) throw Error("Not confirmed; nothing was changed.");
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.apply) await ownerConfirms({ env: process.env, stdin: process.stdin, ask: prompt });
  const { cloudflareRequest, loadCloudflareCredentials } = await import("./cloudflare-client.mjs");

  const dir = ".qa/recovery";
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(`${dir}/worker.js`, helperSource);
  writeFileSync(`${dir}/wrangler.jsonc`, JSON.stringify(helperConfig, null, 2));

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
  const url = `https://${HELPER}.${subdomain}.workers.dev/`;

  async function call(body) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
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

  const report = {
    action: options.action,
    requestedAt: new Date().toISOString(),
    at: options.at,
    applied: false,
  };
  console.log(`Deploying temporary helper ${HELPER}…`);
  const secrets = `${dir}/secrets.json`;
  writeFileSync(secrets, JSON.stringify({ RECOVERY_TOKEN: token }), { mode: 0o600 });
  try {
    wrangler(["deploy", "--config", `${dir}/wrangler.jsonc`, "--secrets-file", secrets]);
  } finally {
    rmSync(secrets, { force: true });
  }
  try {
    report.current = (await call({ action: "bookmark" })).bookmark;
    if (options.time !== undefined)
      report.target = (await call({ action: "bookmark", time: options.time })).bookmark;
    if (options.bookmark) report.target = options.bookmark;

    if (options.action === "restore") {
      checkTarget(report.target, report.current);
      if (!options.apply) {
        console.log(
          "Dry run. Re-run with --apply to rewind the private database to:",
          report.target,
        );
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
    console.log(`Deleting temporary helper ${HELPER}…`);
    wrangler(["delete", "--name", HELPER, "--force"]);
    const file = `${dir}/${report.requestedAt.replace(/[:.]/g, "-")}-${options.action}.json`;
    writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
