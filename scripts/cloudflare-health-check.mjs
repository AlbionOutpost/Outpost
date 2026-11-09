#!/usr/bin/env node
// Error alerts (docs/OPERATIONS.md § Error alerts). Every 15 minutes the "Cloudflare health
// check" workflow reads the last 30 minutes of Workers analytics from the account GraphQL API
// (GitHub runners cannot reach albionoutpost.com through Bot Fight Mode) and posts to Discord
// when pages fail, the data Worker or a Durable Object errors, the kill collector stops or
// fails, or traffic drops to zero in an hour that normally has visitors. A small state file
// (kept between runs with actions/cache) sends one message when a problem starts and one when
// it is gone, never one per run.
//
// Env: CLOUDFLARE_ANALYTICS_TOKEN (Account Analytics: Read), CLOUDFLARE_ACCOUNT_ID, optional
// DISCORD_ALERTS_WEBHOOK_URL (falls back to DISCORD_COST_WEBHOOK_URL), optional
// OUTPOST_HEALTH_STATE (state file path, default .qa/health/state.json).
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { graphql, validWebhook } from "./cloudflare-cost-check.mjs";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const WEB = "albionoutpost-web";
export const DATA = "albionoutpost-data";
/** Workers analytics arrive a few minutes late, so the window ends five minutes ago. */
export const WINDOW_MINUTES = 30;
export const LAG_MINUTES = 5;
export const THRESHOLDS = {
  /** Alert when at least 5 % of at least 20 requests failed. */
  errorRate: 0.05,
  minRequests: 20,
  /** The kill collector runs every two minutes: alert when half its runs (and at least 3) fail. */
  cronErrorShare: 0.5,
  minCronErrors: 3,
  /** "No traffic" only counts in an hour that had at least 40 requests on each of the last 7 days. */
  quietHourFloor: 40,
  /** A problem is over after two clean checks in a row (30 minutes), which stops flapping. */
  clearAfter: 2,
  /** Three failed analytics reads in a row (45 minutes) are a problem of their own. */
  apiFailuresBeforeAlert: 3,
};
const OK_STATUSES = new Set(["success", "clientDisconnected"]);

/** The 30-minute window ending LAG_MINUTES ago, and the start of the 7-day traffic history. */
export function healthWindow(now) {
  const end = now - LAG_MINUTES * MINUTE;
  const endHour = Math.floor(end / HOUR) * HOUR;
  return {
    start: new Date(end - WINDOW_MINUTES * MINUTE).toISOString(),
    end: new Date(end).toISOString(),
    endHour: new Date(endHour).toISOString(),
    historyStart: new Date(endHour - 7 * 24 * HOUR).toISOString(),
  };
}

export const HEALTH_QUERY = `query Health($account: string!, $start: Time!, $end: Time!, $historyStart: Time!, $endHour: Time!) {
  viewer { accounts(filter: { accountTag: $account }) {
    workers: workersInvocationsAdaptive(limit: 1000, filter: { datetime_geq: $start, datetime_leq: $end }) {
      dimensions { scriptName eventType status httpResponseStatus } sum { requests errors }
    }
    objects: durableObjectsInvocationsAdaptiveGroups(limit: 1000, filter: { datetime_geq: $start, datetime_leq: $end }) {
      dimensions { scriptName namespaceId } sum { requests errors }
    }
    history: workersInvocationsAdaptive(limit: 1000, filter: { scriptName: "${WEB}", eventType: "fetch", datetime_geq: $historyStart, datetime_lt: $endHour }) {
      dimensions { datetimeHour } sum { requests }
    }
  } }
}`;

const num = (value) => Number(value) || 0;

/** Request and failure counts for the window. A request failed when the Worker threw, ran out of
 * resources or hit an internal error, or (pages only) answered with a 5xx status. */
export function summarize(data) {
  const blank = () => ({ requests: 0, failed: 0 });
  const summary = { web: blank(), data: blank(), cron: blank(), objects: [], history: [] };
  for (const row of data.workers ?? []) {
    const { scriptName, eventType, status, httpResponseStatus } = row.dimensions;
    const target =
      scriptName === WEB && eventType === "fetch"
        ? summary.web
        : scriptName === DATA && eventType === "rpc"
          ? summary.data
          : scriptName === DATA && eventType === "cron"
            ? summary.cron
            : null;
    if (!target) continue;
    const requests = num(row.sum.requests);
    const failed =
      !OK_STATUSES.has(status) || (target === summary.web && num(httpResponseStatus) >= 500)
        ? requests
        : Math.min(requests, num(row.sum.errors));
    target.requests += requests;
    target.failed += failed;
  }
  const namespaces = {};
  for (const row of data.objects ?? []) {
    const { namespaceId, scriptName } = row.dimensions;
    const entry = (namespaces[namespaceId] ??= { namespaceId, scriptName, requests: 0, failed: 0 });
    entry.requests += num(row.sum.requests);
    entry.failed += num(row.sum.errors);
  }
  summary.objects = Object.values(namespaces);
  summary.history = (data.history ?? []).map((row) => ({
    hour: row.dimensions.datetimeHour,
    requests: num(row.sum.requests),
  }));
  return summary;
}

/** The lowest request count of this window's hour of day over the previous 7 days (a missing day
 * counts as 0), so "no traffic" only alerts in hours that are never quiet. */
export function trafficFloor(history, window) {
  const endHour = Date.parse(window.endHour);
  const byHour = new Map(history.map((row) => [Date.parse(row.hour), row.requests]));
  let floor = Infinity;
  for (let day = 1; day <= 7; day++)
    floor = Math.min(floor, byHour.get(endHour - day * 24 * HOUR) ?? 0);
  return floor;
}

const pct = (share) => `${(share * 100).toFixed(share < 0.1 ? 1 : 0)} %`;
const failing = ({ requests, failed }) =>
  requests >= THRESHOLDS.minRequests && failed / requests >= THRESHOLDS.errorRate;

/** Each problem in the window: a stable key (for de-duplication), a plain title and detail. */
export function findProblems(summary, window) {
  const problems = [];
  const span = `in the last ${WINDOW_MINUTES} minutes`;
  if (failing(summary.web))
    problems.push({
      key: "web-errors",
      severity: "red",
      title: "Pages are failing",
      detail: `${summary.web.failed} of ${summary.web.requests} page and API requests failed (${pct(summary.web.failed / summary.web.requests)}) ${span}: the Worker threw, ran out of CPU or answered 5xx.`,
    });
  if (failing(summary.data))
    problems.push({
      key: "data-errors",
      severity: "red",
      title: "The data Worker is erroring",
      detail: `${summary.data.failed} of ${summary.data.requests} database calls failed (${pct(summary.data.failed / summary.data.requests)}) ${span}. Sign-in, saves and Teams may be broken.`,
    });
  for (const object of summary.objects)
    if (failing(object))
      problems.push({
        key: `do-errors:${object.namespaceId}`,
        severity: "red",
        title: "A Durable Object is erroring",
        detail: `${object.failed} of ${object.requests} calls to ${object.scriptName ?? "?"} namespace ${String(object.namespaceId).slice(0, 8)} failed (${pct(object.failed / object.requests)}) ${span}.`,
      });
  if (summary.cron.requests === 0)
    problems.push({
      key: "cron-stopped",
      severity: "amber",
      title: "The kill collector stopped",
      detail: `The data Worker's two-minute cron did not run ${span}. The kill feed and top kills are going stale.`,
    });
  else if (
    summary.cron.failed >= THRESHOLDS.minCronErrors &&
    summary.cron.failed / summary.cron.requests >= THRESHOLDS.cronErrorShare
  )
    problems.push({
      key: "cron-errors",
      severity: "amber",
      title: "The kill collector is failing",
      detail: `${summary.cron.failed} of ${summary.cron.requests} runs failed ${span}. Albion's kill feed is down or unreadable for at least one server, so the kill feed is going stale.`,
    });
  const floor = trafficFloor(summary.history, window);
  if (summary.web.requests === 0 && floor >= THRESHOLDS.quietHourFloor)
    problems.push({
      key: "no-traffic",
      severity: "red",
      title: "The site gets no traffic",
      detail: `No requests reached the web Worker ${span}; this hour had at least ${floor} on each of the last 7 days. The site, DNS or the route may be down.`,
    });
  return problems;
}

/** @typedef {{ title: string, severity: string, since: string, missing: number }} OpenProblem */
/** @returns {{ version: number, open: Record<string, OpenProblem>, apiFailures: number }} */
export const emptyState = () => ({ version: 1, open: {}, apiFailures: 0 });

/** Folds this check into the stored state. `opened` are new problems (alert), `recovered` are
 * problems absent for THRESHOLDS.clearAfter checks in a row (all clear); anything else is quiet.
 * With `partial`, open problems not in `problems` are left as they are (the check was blind). */
export function nextState(previous, problems, now, { partial = false } = {}) {
  const state = { ...emptyState(), ...previous, open: { ...previous?.open } };
  const opened = [];
  const recovered = [];
  const seen = new Set();
  for (const problem of problems) {
    seen.add(problem.key);
    const known = state.open[problem.key];
    state.open[problem.key] = {
      title: problem.title,
      severity: problem.severity,
      since: known?.since ?? new Date(now).toISOString(),
      missing: 0,
    };
    if (!known) opened.push(problem);
  }
  for (const [key, entry] of Object.entries(state.open)) {
    if (seen.has(key) || partial) continue;
    const missing = (entry.missing ?? 0) + 1;
    if (missing >= THRESHOLDS.clearAfter) {
      recovered.push({ key, ...entry });
      delete state.open[key];
    } else state.open[key] = { ...entry, missing };
  }
  return { state, opened, recovered };
}

const RED = 0xe5484d;
const AMBER = 0xf2a03d;
const GREEN = 0x30a46c;
const ICON = { red: "🚨", amber: "⚠️" };
const field = (name, value, inline = false) => ({
  name: String(name).slice(0, 256),
  value: String(value).slice(0, 1024),
  inline,
});
const lasted = (since, now) => {
  const minutes = Math.max(1, Math.round((now - Date.parse(since)) / MINUTE));
  return minutes < 120 ? `${minutes} min` : `${(minutes / 60).toFixed(1)} h`;
};

/** The Discord embed for new problems; still-open older ones are listed underneath. */
export function incidentEmbed(opened, state, window, now = Date.now()) {
  const red = opened.some((problem) => problem.severity === "red");
  const others = Object.entries(state.open).filter(
    ([key]) => !opened.some((problem) => problem.key === key),
  );
  const fields = opened
    .slice(0, 20)
    .map((problem) => field(`${ICON[problem.severity] ?? "⚠️"} ${problem.title}`, problem.detail));
  if (others.length)
    fields.push(
      field(
        "Still open",
        others.map(([, entry]) => `${entry.title} · since ${lasted(entry.since, now)}`).join("\n"),
      ),
    );
  fields.push(
    field("Checked", `${window.start.slice(11, 16)} → ${window.end.slice(11, 16)} UTC`, true),
    field("Next message", "When it is fixed", true),
  );
  return {
    title: red ? "🚨 Outpost is broken" : "⚠️ Outpost needs a look",
    description:
      "From Cloudflare's Workers analytics for the last 30 minutes. You get one message when a problem starts and one when it is over.",
    color: red ? RED : AMBER,
    fields: fields.slice(0, 25),
    footer: { text: "What to do: docs/OPERATIONS.md › Error alerts" },
    timestamp: new Date(now).toISOString(),
  };
}

/** The Discord embed for problems that are over. */
export function recoveryEmbed(recovered, state, now = Date.now()) {
  const fields = recovered
    .slice(0, 20)
    .map((entry) => field(`✅ ${entry.title}`, `Lasted about ${lasted(entry.since, now)}`, true));
  const left = Object.values(state.open);
  if (left.length) fields.push(field("Still open", left.map((entry) => entry.title).join("\n")));
  return {
    title: left.length ? "✅ Partly recovered" : "✅ Outpost recovered",
    description: `Clean for the last ${THRESHOLDS.clearAfter} checks.`,
    color: left.length ? AMBER : GREEN,
    fields,
    footer: { text: "docs/OPERATIONS.md › Error alerts" },
    timestamp: new Date(now).toISOString(),
  };
}

/** The analytics read failed several times in a row: the check itself is blind. */
export const analyticsProblem = (failures, message) => ({
  key: "check-blind",
  severity: "amber",
  title: "The health check cannot read Cloudflare",
  detail: `${failures} analytics reads in a row failed (${message.slice(0, 200)}). Errors would go unnoticed until this is fixed; check the CLOUDFLARE_ANALYTICS_TOKEN expiry.`,
});

export function readState(path) {
  try {
    const state = JSON.parse(readFileSync(path, "utf8"));
    return state?.version === 1 && typeof state.open === "object" ? state : emptyState();
  } catch {
    return emptyState();
  }
}

async function postDiscord(url, content, embed, fetcher) {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Outpost alerts",
      content,
      embeds: [embed],
      allowed_mentions: { parse: [] },
    }),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  // Discord's body can echo the webhook; report the status only.
  if (!response.ok) throw new Error(`Discord webhook HTTP ${response.status}`);
}

/** @param {Record<string, string | undefined>} env
 * @param {(url: string, init: RequestInit) => Promise<Response>} fetcher */
export async function main(env = process.env, fetcher = fetch, now = Date.now()) {
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN;
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const ci = env.GITHUB_ACTIONS === "true";
  const statePath = env.OUTPOST_HEALTH_STATE || ".qa/health/state.json";
  if (!token || !account) {
    console.log(
      `${ci ? "::notice title=Health check skipped::" : ""}CLOUDFLARE_ANALYTICS_TOKEN or CLOUDFLARE_ACCOUNT_ID not set; see docs/OPERATIONS.md § Error alerts.`,
    );
    return 0;
  }
  if (!/^[A-Za-z0-9_-]{30,200}$/.test(token) || !/^[a-f0-9]{32}$/.test(account)) {
    console.log("The analytics token or account id is malformed.");
    return 1;
  }
  const webhook = env.DISCORD_ALERTS_WEBHOOK_URL || env.DISCORD_COST_WEBHOOK_URL;
  if (webhook && !validWebhook(webhook)) {
    console.log("The alerts webhook is not a Discord webhook URL; nothing sent.");
    return 1;
  }
  const redact = (text) => String(text).split(token).join("[redacted]");
  const window = healthWindow(now);
  const previous = readState(statePath);
  let result;
  try {
    const data = await graphql(HEALTH_QUERY, { account, ...window }, token, fetcher);
    const summary = summarize(data);
    const problems = findProblems(summary, window);
    result = nextState({ ...previous, apiFailures: 0 }, problems, now);
    const line = (name, { requests, failed }) => `${name} ${failed}/${requests} failed`;
    console.log(
      `${window.start} → ${window.end}: ${line("pages", summary.web)}, ${line("data RPC", summary.data)}, ${line("cron runs", summary.cron)}; ${problems.length ? problems.map((p) => p.title).join("; ") : "no problems"}.`,
    );
  } catch (error) {
    const message = redact(error.message);
    const failures = (previous.apiFailures ?? 0) + 1;
    console.log(`${ci ? "::warning title=Cloudflare analytics failed::" : ""}${message}`);
    const carried = Object.entries(previous.open)
      .filter(([key]) => key !== "check-blind")
      .map(([key, entry]) => ({ key, ...entry }));
    const problems =
      failures >= THRESHOLDS.apiFailuresBeforeAlert
        ? [...carried, analyticsProblem(failures, message)]
        : carried;
    result = nextState(previous, problems, now, { partial: true });
    result.state.apiFailures = failures;
  }
  const { state, opened, recovered } = result;
  const messages = [];
  if (opened.length)
    messages.push([
      `Outpost alert: ${opened.map((p) => p.title).join(", ")}`,
      incidentEmbed(opened, state, window, now),
    ]);
  if (recovered.length)
    messages.push([
      `Outpost recovered: ${recovered.map((p) => p.title).join(", ")}`,
      recoveryEmbed(recovered, state, now),
    ]);
  for (const [content] of messages)
    if (ci) console.log(`::warning title=Outpost health::${content}`);
  if (messages.length && env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      messages.map(([content]) => `- ${content}`).join("\n") + "\n",
    );
  if (messages.length && webhook) {
    try {
      for (const [content, embed] of messages)
        await postDiscord(webhook, content.slice(0, 1900), embed, fetcher);
    } catch (error) {
      // Keep the old state so the next run tries again.
      console.log(`${ci ? "::error title=Discord alert failed::" : ""}${error.message}`);
      return 1;
    }
  } else if (messages.length) console.log("No alerts webhook set; the alert is only in this log.");
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
