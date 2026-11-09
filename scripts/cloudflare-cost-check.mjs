#!/usr/bin/env node
// Daily Cloudflare usage check (docs/OPERATIONS.md § Cost guardrails).
// Reads the account GraphQL Analytics API for the billing period so far and the last full UTC
// day, projects each metered dimension to the end of the period, prints a table, and posts a
// Discord alert when a projection nears a Workers Paid allowance. The alert never fails the run;
// only an API error (Cloudflare or Discord) does.
//
// Env: CLOUDFLARE_ANALYTICS_TOKEN (Account Analytics: Read), CLOUDFLARE_ACCOUNT_ID,
// optional DISCORD_COST_WEBHOOK_URL, optional OUTPOST_BILLING_DAY (1-28, default 1).
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DAY = 86_400_000;
const GB = 1e9;
const PRICING = "https://developers.cloudflare.com/workers/platform/pricing/";
const DO_PRICING = "https://developers.cloudflare.com/durable-objects/platform/pricing/";
const D1_PRICING = "https://developers.cloudflare.com/d1/platform/pricing/";
const KV_PRICING = "https://developers.cloudflare.com/kv/platform/pricing/";
const R2_PRICING = "https://developers.cloudflare.com/r2/pricing/";

/** Workers Paid monthly allowances, checked against Cloudflare's pricing pages on 9 Nov 2026. */
export const ALLOWANCES = [
  { key: "workerRequests", label: "Worker requests", included: 10e6, source: PRICING },
  { key: "workerCpuMs", label: "Worker CPU (ms)", included: 30e6, source: PRICING },
  { key: "doRequests", label: "DO requests", included: 1e6, source: DO_PRICING },
  { key: "doGbSeconds", label: "DO duration (GB-s)", included: 400e3, source: DO_PRICING },
  { key: "doRowsRead", label: "DO SQLite rows read", included: 25e9, source: DO_PRICING },
  { key: "doRowsWritten", label: "DO SQLite rows written", included: 50e6, source: DO_PRICING },
  {
    key: "doStorageBytes",
    label: "DO SQLite storage",
    included: 5 * GB,
    stored: true,
    source: DO_PRICING,
  },
  { key: "d1RowsRead", label: "D1 rows read", included: 25e9, source: D1_PRICING },
  { key: "d1RowsWritten", label: "D1 rows written", included: 50e6, source: D1_PRICING },
  {
    key: "d1StorageBytes",
    label: "D1 storage",
    included: 5 * GB,
    stored: true,
    source: D1_PRICING,
  },
  { key: "kvReads", label: "KV keys read", included: 10e6, binding: "kv", source: KV_PRICING },
  { key: "kvWrites", label: "KV keys written", included: 1e6, binding: "kv", source: KV_PRICING },
  { key: "r2ClassA", label: "R2 Class A ops", included: 1e6, binding: "r2", source: R2_PRICING },
  { key: "r2ClassB", label: "R2 Class B ops", included: 10e6, binding: "r2", source: R2_PRICING },
];
/** Alert when the period projection reaches 80 % of an allowance, or one day's rate 100 %. */
export const WARN_PROJECTED = 0.8;
export const WARN_DAY_RATE = 1;
/** A Durable Object is billed at 128 MB while active: GB-s = seconds × 0.125. */
export const DO_GB_PER_SECOND = 0.125;

const isoDate = (time) => new Date(time).toISOString().slice(0, 10);

/** The billing period holding `now` (UTC), its length and how much of it has passed. The month
 * resets on the subscription day, not the calendar month. Elapsed is floored at one day so the
 * first hours of a period do not multiply a few requests into an alarm (the day rate covers it). */
export function billingPeriod(now, billingDay = 1) {
  const day = Number.isInteger(billingDay) && billingDay >= 1 && billingDay <= 28 ? billingDay : 1;
  const at = new Date(now);
  let start = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), day);
  if (start > at.getTime()) start = Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 1, day);
  const begin = new Date(start);
  const end = Date.UTC(begin.getUTCFullYear(), begin.getUTCMonth() + 1, day);
  const yesterday = isoDate(at.getTime() - DAY);
  return {
    start: isoDate(start),
    end: isoDate(end - DAY),
    today: isoDate(at),
    yesterday,
    days: Math.round((end - start) / DAY),
    elapsedDays: Math.max(1, (at.getTime() - start) / DAY),
  };
}

/** Each allowance with its period-to-date usage, projection and alerts. `usage[key]` is
 * `{ period, day }` (counts) or `{ current }` (stored bytes); a missing key is unavailable. */
export function evaluate(usage, period, bindings = { kv: false, r2: false }) {
  return ALLOWANCES.filter((row) => !row.binding || bindings[row.binding]).map((row) => {
    const value = usage[row.key];
    if (!value) return { ...row, available: false, alerts: [] };
    const alerts = [];
    if (row.stored) {
      const share = value.current / row.included;
      if (share >= WARN_PROJECTED) alerts.push(`at ${pct(share)} of the included ${fmt(row)}`);
      return { ...row, available: true, current: value.current, share, alerts };
    }
    const projected = (value.period / period.elapsedDays) * period.days;
    const dayProjected = value.day * period.days;
    const share = projected / row.included;
    const dayShare = dayProjected / row.included;
    if (share >= WARN_PROJECTED) alerts.push(`period projection ${pct(share)} of allowance`);
    if (dayShare >= WARN_DAY_RATE) alerts.push(`last day's rate projects ${pct(dayShare)}`);
    return { ...row, available: true, ...value, projected, dayProjected, share, dayShare, alerts };
  });
}

const pct = (share) => `${Math.round(share * 100)} %`;
function compact(value) {
  if (!Number.isFinite(value)) return "—";
  for (const [size, suffix] of [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ])
    if (Math.abs(value) >= size)
      return `${(value / size).toFixed(value >= size * 100 ? 0 : 1)} ${suffix}`;
  return String(Math.round(value));
}
const bytes = (value) => `${(value / GB).toFixed(2)} GB`;
const fmt = (row) => (row.stored ? bytes(row.included) : compact(row.included));

/** A fixed-width table for the log and the job summary. */
export function formatTable(rows) {
  const lines = [
    ["Allowance", "So far", "Last day", "Projected", "Included", "Share", ""],
    ...rows.map((row) =>
      !row.available
        ? [row.label, "—", "—", "—", fmt(row), "Unavailable", ""]
        : row.stored
          ? [
              row.label,
              bytes(row.current),
              "",
              "",
              fmt(row),
              pct(row.share),
              row.alerts.length ? "ALERT" : "",
            ]
          : [
              row.label,
              compact(row.period),
              compact(row.day),
              compact(row.projected),
              fmt(row),
              pct(row.share),
              row.alerts.length ? "ALERT" : "",
            ],
    ),
  ];
  const widths = lines[0].map((_, column) => Math.max(...lines.map((line) => line[column].length)));
  return lines
    .map((line) =>
      line
        .map((cell, column) => cell.padEnd(widths[column]))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

/** The Discord message, or null when nothing needs attention. Plain text, no mentions. */
export function alertMessage(rows, period) {
  const flagged = rows.filter((row) => row.alerts.length);
  if (!flagged.length) return null;
  const lines = [
    `**Outpost Cloudflare usage alert** (billing period ${period.start} → ${period.end}, day ${Math.floor(period.elapsedDays)} of ${period.days})`,
    ...flagged.map((row) => `- ${row.label}: ${row.alerts.join("; ")} (included ${fmt(row)})`),
    "Check docs/OPERATIONS.md § Cost guardrails; save mode: OUTPOST_SAVE_MODE=1.",
  ];
  return lines.join("\n").slice(0, 1900);
}

/** Plain-English names and Workers Paid overage prices (USD per unit) for the Discord embed. */
const FRIENDLY = {
  workerRequests: ["Worker requests", "visits and API calls the Worker answers", 0.3 / 1e6],
  workerCpuMs: ["Worker CPU time", "milliseconds spent building pages", 0.02 / 1e6],
  doRequests: ["Small-server requests", "calls to Durable Objects", 0.15 / 1e6],
  doGbSeconds: ["Small-server awake time", "Durable Object GB-seconds", 12.5 / 1e6],
  doRowsRead: ["Private store reads", "Durable Object SQLite rows read", 0.001 / 1e6],
  doRowsWritten: ["Private store writes", "Durable Object SQLite rows written", 1 / 1e6],
  doStorageBytes: ["Private store size", "Durable Object SQLite storage", 0.2 / GB],
  d1RowsRead: ["Database reads", "D1 rows read", 0.001 / 1e6],
  d1RowsWritten: ["Database writes", "D1 rows written", 1 / 1e6],
  d1StorageBytes: ["Database size", "D1 storage", 0.2 / GB],
  kvReads: ["KV reads", "KV keys read", 0.5 / 1e6],
  kvWrites: ["KV writes", "KV keys written", 5 / 1e6],
  r2ClassA: ["R2 writes", "R2 Class A operations", 4.5 / 1e6],
  r2ClassB: ["R2 reads", "R2 Class B operations", 0.36 / 1e6],
};
const RED = 0xe5484d;
const AMBER = 0xf2a03d;
/** Status of one allowance for the embed: over (projected past 100 %), close (80 % or more), ok. */
const status = (row) =>
  !row.available
    ? "unknown"
    : row.share >= 1
      ? "over"
      : row.share >= WARN_PROJECTED
        ? "close"
        : "ok";
const ICON = { over: "❌", close: "⚠️", ok: "✅", unknown: "❔" };
/** Estimated overage in USD for one allowance at its projection (storage: at its current size). */
export function overage(row) {
  if (!row.available) return 0;
  const used = row.stored ? row.current : row.projected;
  return Math.max(0, used - row.included) * (FRIENDLY[row.key]?.[2] ?? 0);
}
const dollars = (value) => (value < 0.01 ? "$0" : `$${value.toFixed(2)}`);

/** The Discord embed, or null when nothing needs attention: what is heading past the $5 plan,
 * in plain words, with an estimated extra cost and a short status list of every allowance. */
export function alertEmbed(rows, period, now = Date.now()) {
  const flagged = rows.filter((row) => row.alerts.length);
  if (!flagged.length) return null;
  const extra = rows.reduce((total, row) => total + overage(row), 0);
  const fields = flagged.slice(0, 20).map((row) => {
    const [name, plain] = FRIENDLY[row.key] ?? [row.label, row.label];
    const lines = row.stored
      ? [`Using **${bytes(row.current)}** of **${fmt(row)}** included (${pct(row.share)})`]
      : [
          `Used **${compact(row.period)}** so far of **${fmt(row)}** included`,
          `On pace for **${compact(row.projected)}** this period (${pct(row.share)})`,
          `Yesterday alone: ${compact(row.day)} (pace ${pct(row.dayShare)})`,
        ];
    const cost = overage(row);
    if (cost >= 0.01) lines.push(`Estimated extra: **~${dollars(cost)}**`);
    return { name: `${ICON[status(row)]} ${name}`, value: `${lines.join("\n")}\n-# ${plain}` };
  });
  const list = rows
    .map((row) => {
      const [name] = FRIENDLY[row.key] ?? [row.label];
      return `${ICON[status(row)]} ${name} — ${row.available ? pct(row.share) : "unavailable"}`;
    })
    .join("\n");
  fields.push({ name: "Everything at a glance", value: list.slice(0, 1024) });
  const over = flagged.some((row) => status(row) === "over");
  return {
    title: over ? "Cloudflare bill is heading past $5" : "Cloudflare usage is getting close to $5",
    description: [
      `Day **${Math.floor(period.elapsedDays)}** of **${period.days}** · billing period ${period.start} → ${period.end}`,
      `Estimated bill: **$5 plan + ~${dollars(extra)} extra**`,
      "Projections assume the rest of the period runs at this period's average pace.",
    ].join("\n"),
    color: over ? RED : AMBER,
    fields,
    footer: {
      text: "What to do: docs/OPERATIONS.md › Cost guardrails · Emergency: OUTPOST_SAVE_MODE=1",
    },
    timestamp: new Date(now).toISOString(),
  };
}

const sum = (rows, read) =>
  (rows ?? []).reduce((total, row) => total + (Number(read(row)) || 0), 0);

/** Per-script and per-namespace detail from the core response, largest first. */
export function breakdown(data) {
  const scripts = {};
  for (const row of data.periodWorkers ?? [])
    scripts[row.dimensions.scriptName] =
      (scripts[row.dimensions.scriptName] ?? 0) + row.sum.requests;
  const owner = {};
  for (const row of data.periodDoRequests ?? [])
    owner[row.dimensions.namespaceId] = row.dimensions.scriptName;
  const namespaces = {};
  for (const row of data.periodDoDuration ?? []) {
    const id = row.dimensions.namespaceId;
    const name = owner[id] ? `${owner[id]}/${id.slice(0, 8)}` : id.slice(0, 8);
    namespaces[name] = (namespaces[name] ?? 0) + (row.sum.activeTime / 1e6) * DO_GB_PER_SECOND;
  }
  const order = (object) => Object.entries(object).sort((a, b) => b[1] - a[1]);
  return { requestsByScript: order(scripts), gbSecondsByNamespace: order(namespaces) };
}

/** Usage figures from the core response (period-to-date `period*` and last-day `day*` aliases). */
export function coreUsage(data) {
  const pair = (read, field) => ({
    period: read(data[`period${field}`]),
    day: read(data[`day${field}`]),
  });
  return {
    workerRequests: pair((rows) => sum(rows, (row) => row.sum.requests), "Workers"),
    workerCpuMs: pair((rows) => sum(rows, (row) => row.sum.cpuTimeUs) / 1000, "Workers"),
    doRequests: pair((rows) => sum(rows, (row) => row.sum.requests), "DoRequests"),
    doGbSeconds: pair(
      (rows) => (sum(rows, (row) => row.sum.activeTime) / 1e6) * DO_GB_PER_SECOND,
      "DoDuration",
    ),
    d1RowsRead: pair((rows) => sum(rows, (row) => row.sum.rowsRead), "D1"),
    d1RowsWritten: pair((rows) => sum(rows, (row) => row.sum.rowsWritten), "D1"),
  };
}

/** The newest day's total of a stored-bytes dataset (summed across databases or namespaces). */
export function latestStored(rows, field) {
  if (!rows?.length) return null;
  const newest = rows.reduce(
    (top, row) => (row.dimensions.date > top ? row.dimensions.date : top),
    "",
  );
  return {
    current: sum(
      rows.filter((row) => row.dimensions.date === newest),
      (row) => row.max[field],
    ),
  };
}

/** R2 operations by billing class: reads (Get/Head) are Class B, the rest Class A. */
export function r2Classes(rows) {
  const classB = /^(?:GetObject|HeadObject|HeadBucket|UsageSummary|GetBucket\w*)$/;
  return {
    a: sum(
      rows?.filter((row) => !classB.test(row.dimensions.actionType)),
      (row) => row.sum.requests,
    ),
    b: sum(
      rows?.filter((row) => classB.test(row.dimensions.actionType)),
      (row) => row.sum.requests,
    ),
  };
}

const aliased = (name, dataset, body, range) =>
  `${name}: ${dataset}(limit: 10000, filter: { date_geq: $${range}Start, date_leq: $${range}End }) { ${body} }`;
const both = (field, dataset, body) =>
  [
    aliased(`period${field}`, dataset, body, "period"),
    aliased(`day${field}`, dataset, body, "day"),
  ].join("\n");
const query = (parts) =>
  `query Usage($account: string!, $periodStart: Date!, $periodEnd: Date!, $dayStart: Date!, $dayEnd: Date!) {
  viewer { accounts(filter: { accountTag: $account }) {
${parts.join("\n")}
  } }
}`;

export const CORE_QUERY = query([
  both(
    "Workers",
    "workersInvocationsAdaptive",
    "dimensions { scriptName } sum { requests cpuTimeUs }",
  ),
  both(
    "DoRequests",
    "durableObjectsInvocationsAdaptiveGroups",
    "dimensions { namespaceId scriptName } sum { requests }",
  ),
  both(
    "DoDuration",
    "durableObjectsPeriodicGroups",
    "dimensions { namespaceId } sum { activeTime }",
  ),
  both("D1", "d1AnalyticsAdaptiveGroups", "dimensions { databaseId } sum { rowsRead rowsWritten }"),
]);
/** Optional datasets: a schema or permission error marks the row Unavailable, never fails. */
export const OPTIONAL_QUERIES = {
  doRows: query([both("DoRows", "durableObjectsPeriodicGroups", "sum { rowsRead rowsWritten }")]),
  doStorage: query([
    aliased(
      "stored",
      "durableObjectsStorageGroups",
      "dimensions { date } max { storedBytes }",
      "period",
    ),
  ]),
  d1Storage: query([
    aliased(
      "stored",
      "d1StorageAdaptiveGroups",
      "dimensions { date databaseId } max { databaseSizeBytes }",
      "period",
    ),
  ]),
  kv: query([
    both("Kv", "kvOperationsAdaptiveGroups", "dimensions { actionType } sum { requests }"),
  ]),
  r2: query([
    both("R2", "r2OperationsAdaptiveGroups", "dimensions { actionType } sum { requests }"),
  ]),
};

/** KV namespaces or R2 buckets bound in either Worker's committed config. */
export function boundServices(configs) {
  return {
    kv: configs.some((config) => config.kv_namespaces?.length),
    r2: configs.some((config) => config.r2_buckets?.length),
  };
}

class ApiError extends Error {}

async function graphql(text, variables, token, fetcher) {
  const response = await fetcher("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text, variables }),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null);
  const errors = body?.errors?.map((error) => error.message).filter(Boolean) ?? [];
  if (!response.ok || errors.length || !body?.data?.viewer?.accounts?.[0])
    throw new ApiError(
      `GraphQL HTTP ${response.status}: ${errors.join("; ") || "no account data"}`,
    );
  return body.data.viewer.accounts[0];
}

/** @typedef {(url: string, init: RequestInit) => Promise<Response>} Fetcher */

/** Collect every figure. Core datasets must answer; optional ones may be missing.
 * @param {{ token: string, account: string, period: ReturnType<typeof billingPeriod>,
 *   bindings: { kv: boolean, r2: boolean }, fetcher?: Fetcher }} options */
export async function collectUsage({ token, account, period, bindings, fetcher = fetch }) {
  const variables = {
    account,
    periodStart: period.start,
    periodEnd: period.today,
    dayStart: period.yesterday,
    dayEnd: period.yesterday,
  };
  const core = await graphql(CORE_QUERY, variables, token, fetcher);
  /** @type {Record<string, any>} */
  const usage = coreUsage(core);
  const notes = [];
  const optional = async (name, read) => {
    try {
      Object.assign(usage, read(await graphql(OPTIONAL_QUERIES[name], variables, token, fetcher)));
    } catch (error) {
      notes.push(`${name}: unavailable (${error.message.slice(0, 160)})`);
    }
  };
  await optional("doRows", (data) => ({
    doRowsRead: {
      period: sum(data.periodDoRows, (r) => r.sum.rowsRead),
      day: sum(data.dayDoRows, (r) => r.sum.rowsRead),
    },
    doRowsWritten: {
      period: sum(data.periodDoRows, (r) => r.sum.rowsWritten),
      day: sum(data.dayDoRows, (r) => r.sum.rowsWritten),
    },
  }));
  await optional("doStorage", (data) => {
    const stored = latestStored(data.stored, "storedBytes");
    return stored ? { doStorageBytes: stored } : {};
  });
  await optional("d1Storage", (data) => {
    const stored = latestStored(data.stored, "databaseSizeBytes");
    return stored ? { d1StorageBytes: stored } : {};
  });
  if (bindings.kv)
    await optional("kv", (data) => {
      const count = (rows, write) =>
        sum(
          rows?.filter((row) => (row.dimensions.actionType === "read") !== write),
          (row) => row.sum.requests,
        );
      return {
        kvReads: { period: count(data.periodKv, false), day: count(data.dayKv, false) },
        kvWrites: { period: count(data.periodKv, true), day: count(data.dayKv, true) },
      };
    });
  if (bindings.r2)
    await optional("r2", (data) => {
      const [period, day] = [r2Classes(data.periodR2), r2Classes(data.dayR2)];
      return {
        r2ClassA: { period: period.a, day: day.a },
        r2ClassB: { period: period.b, day: day.b },
      };
    });
  return { usage, notes, detail: breakdown(core) };
}

/** Discord incoming webhook URLs only; anything else is refused before a request is made. */
export function validWebhook(url) {
  return /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d{5,25}\/[A-Za-z0-9_-]{20,100}$/.test(
    url ?? "",
  );
}

async function postDiscord(url, content, embed, fetcher) {
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Outpost costs",
      // The title doubles as the notification preview; the plain text stays when there is no embed.
      content: embed ? embed.title : content,
      ...(embed ? { embeds: [embed] } : {}),
      allowed_mentions: { parse: [] },
    }),
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  // Discord's body can echo the webhook; report the status only.
  if (!response.ok) throw new ApiError(`Discord webhook HTTP ${response.status}`);
}

const readConfig = (path) =>
  JSON.parse(
    readFileSync(path, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/,\s*([}\]])/g, "$1"),
  );

/** @param {Record<string, string | undefined>} env @param {Fetcher} fetcher */
export async function main(env = process.env, fetcher = fetch) {
  const token = env.CLOUDFLARE_ANALYTICS_TOKEN;
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const ci = env.GITHUB_ACTIONS === "true";
  if (!token || !account) {
    const missing = [
      !token && "CLOUDFLARE_ANALYTICS_TOKEN",
      !account && "CLOUDFLARE_ACCOUNT_ID",
    ].filter(Boolean);
    console.log(
      `${ci ? "::notice title=Cost check skipped::" : ""}${missing.join(" and ")} not set; see docs/OPERATIONS.md § Cost guardrails.`,
    );
    return 0;
  }
  const redact = (text) => String(text).split(token).join("[redacted]");
  if (!/^[A-Za-z0-9_-]{30,200}$/.test(token) || !/^[a-f0-9]{32}$/.test(account)) {
    console.log("The analytics token or account id is malformed.");
    return 1;
  }
  const period = billingPeriod(Date.now(), Number(env.OUTPOST_BILLING_DAY || 1));
  const bindings = boundServices([
    readConfig("wrangler.jsonc"),
    readConfig("cloudflare/database/wrangler.jsonc"),
  ]);
  let result;
  try {
    result = await collectUsage({ token, account, period, bindings, fetcher });
  } catch (error) {
    console.log(
      `${ci ? "::error title=Cloudflare analytics failed::" : ""}${redact(error.message)}`,
    );
    return 1;
  }
  const rows = evaluate(result.usage, period, bindings);
  const table = formatTable(rows);
  const detail = [
    `Worker requests by script: ${result.detail.requestsByScript.map(([name, n]) => `${name} ${compact(n)}`).join(", ") || "none"}`,
    `DO GB-s by namespace: ${result.detail.gbSecondsByNamespace.map(([name, n]) => `${name} ${compact(n)}`).join(", ") || "none"}`,
    ...result.notes.map(redact),
  ];
  const heading = `Billing period ${period.start} → ${period.end} (day ${Math.floor(period.elapsedDays)} of ${period.days}); last day = ${period.yesterday} UTC. Worker requests include unbilled service-binding calls.`;
  console.log(`${heading}\n\n${table}\n\n${detail.join("\n")}`);
  if (env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `### Cloudflare usage\n\n${heading}\n\n\`\`\`\n${table}\n\`\`\`\n\n${detail.map((line) => `- ${line}`).join("\n")}\n`,
    );
  const message = alertMessage(rows, period);
  if (!message) return 0;
  if (ci) console.log(`::warning title=Cloudflare usage alert::${message.replace(/\n/g, "%0A")}`);
  const webhook = env.DISCORD_COST_WEBHOOK_URL;
  if (!webhook) {
    console.log("DISCORD_COST_WEBHOOK_URL not set; the alert is only in this log.");
    return 0;
  }
  if (!validWebhook(webhook)) {
    console.log("DISCORD_COST_WEBHOOK_URL is not a Discord webhook URL; alert not sent.");
    return 1;
  }
  try {
    await postDiscord(webhook, message, alertEmbed(rows, period), fetcher);
    console.log("Alert posted to Discord.");
    return 0;
  } catch (error) {
    console.log(`${ci ? "::error title=Discord alert failed::" : ""}${error.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
