import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  alertMessage,
  alertEmbed,
  overage,
  billingPeriod,
  collectUsage,
  evaluate,
  formatTable,
  main,
  validWebhook,
} from "../scripts/cloudflare-cost-check.mjs";

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/cloudflare-cost/${name}.json`, import.meta.url), "utf8");
const NOW = Date.parse("2026-11-10T12:00:00Z");
const period = billingPeriod(NOW, 1);
const noBindings = { kv: false, r2: false };

/** Answers the core query and D1 storage from fixtures; every other optional query fails. */
function graphqlFetcher(calls: string[] = []) {
  return vi.fn(async (url: string, init: RequestInit) => {
    calls.push(String(url));
    if (String(url).startsWith("https://discord.com/")) return new Response(null, { status: 204 });
    const { query } = JSON.parse(String(init.body));
    const body = query.includes("workersInvocationsAdaptive")
      ? fixture("core")
      : query.includes("d1StorageAdaptiveGroups")
        ? fixture("d1-storage")
        : fixture("schema-error");
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  });
}

describe("billing period", () => {
  it("starts on the billing day and counts elapsed days", () => {
    expect(period).toMatchObject({
      start: "2026-11-01",
      end: "2026-11-30",
      today: "2026-11-10",
      yesterday: "2026-11-09",
      days: 30,
      elapsedDays: 9.5,
    });
  });
  it("rolls back a month before the billing day", () => {
    expect(billingPeriod(NOW, 15)).toMatchObject({
      start: "2026-10-15",
      end: "2026-11-14",
      days: 31,
    });
  });
  it("floors elapsed time at one day and ignores an invalid billing day", () => {
    const early = billingPeriod(Date.parse("2026-11-01T03:00:00Z"), 31);
    expect(early).toMatchObject({ start: "2026-11-01", elapsedDays: 1 });
  });
});

describe("projection and thresholds", () => {
  const usage = {
    // 3 M in 9.5 days → 9.47 M over 30 days: 94.7 % of 10 M (alert); last day 0.3 M × 30 = 90 %.
    workerRequests: { period: 3e6, day: 3e5 },
    // 21.6 M ms → 68.2 M projected (227 %); last day 1 M × 30 = 30 M = 100 % (alert).
    workerCpuMs: { period: 21.6e6, day: 1e6 },
    // 150 k → 473.7 k projected (47 %): quiet.
    doRequests: { period: 150e3, day: 15e3 },
    // 4.3 GB of 5 GB stored: 86 % (alert).
    d1StorageBytes: { current: 4.3e9 },
  };
  const rows = evaluate(usage, period, noBindings);
  const row = (key: string) => rows.find((entry) => entry.key === key)!;

  it("projects period usage to the end of the period", () => {
    expect(row("workerRequests").projected).toBeCloseTo(9_473_684.2, 0);
    expect(row("workerCpuMs").projected).toBeCloseTo(68_210_526.3, 0);
    expect(row("doRequests").share).toBeCloseTo(0.4737, 3);
  });
  it("alerts at 80 % projected, at a day rate of 100 %, and at 80 % of stored", () => {
    expect(row("workerRequests").alerts).toEqual(["period projection 95 % of allowance"]);
    expect(row("workerCpuMs").alerts).toHaveLength(2);
    expect(row("workerCpuMs").alerts[1]).toBe("last day's rate projects 100 %");
    expect(row("doRequests").alerts).toEqual([]);
    expect(row("d1StorageBytes").alerts).toEqual(["at 86 % of the included 5.00 GB"]);
  });
  it("stays quiet just under each threshold", () => {
    const quiet = evaluate(
      { workerRequests: { period: (0.79 * 10e6 * 9.5) / 30, day: 0.99 * (10e6 / 30) } },
      period,
      noBindings,
    );
    expect(quiet.find((entry) => entry.key === "workerRequests")!.alerts).toEqual([]);
  });
  it("marks missing data Unavailable instead of zero, and lists KV and R2 only when bound", () => {
    expect(row("doRowsRead")).toMatchObject({ available: false, alerts: [] });
    expect(formatTable(rows)).toMatch(/DO SQLite rows read\s+—\s+—\s+—\s+25\.0 B\s+Unavailable/);
    expect(rows.some((entry) => entry.key.startsWith("kv"))).toBe(false);
    expect(evaluate({}, period, { kv: true, r2: false }).map((entry) => entry.key)).toContain(
      "kvReads",
    );
  });
  it("writes one plain alert message only when something is flagged", () => {
    const message = alertMessage(rows, period)!;
    expect(message).toContain("Worker requests: period projection 95 % of allowance");
    expect(message).toContain("D1 storage: at 86 %");
    expect(message).not.toContain("DO requests");
    expect(alertMessage(evaluate({}, period, noBindings), period)).toBeNull();
  });
  it("builds a readable Discord embed with plain names, status icons and an estimated extra", () => {
    const embed = alertEmbed(rows, period, Date.UTC(2026, 10, 9))!;
    expect(embed.title).toMatch(/\$5/);
    const names = embed.fields.map((field: { name: string }) => field.name);
    expect(names[0]).toContain("Estimated bill");
    expect(embed.fields[0].value).toContain("**$5** plan");
    expect(names.some((name: string) => name.includes("Worker requests"))).toBe(true);
    expect(names).toContain("On pace for");
    expect(names.at(-1)).toContain("Needs a look");
    expect(embed.fields.length).toBeLessThanOrEqual(25);
    expect(embed.timestamp).toBe("2026-11-09T00:00:00.000Z");
    expect(alertEmbed(evaluate({}, period, noBindings), period)).toBeNull();
    // No usage past an allowance costs nothing; usage past it is priced per unit.
    expect(overage({ ...rows[0], available: true, projected: 5e6, included: 10e6 })).toBe(0);
    expect(
      overage({ key: "workerCpuMs", available: true, projected: 130e6, included: 30e6 } as never),
    ).toBeCloseTo(2, 5);
  });
});

describe("GraphQL responses", () => {
  it("sums the fixture into usage, with per-namespace GB-s and optional datasets", async () => {
    const result = await collectUsage({
      token: "x".repeat(40),
      account: "a".repeat(32),
      period,
      bindings: noBindings,
      fetcher: graphqlFetcher(),
    });
    expect(result.usage.workerRequests).toEqual({ period: 3e6, day: 3e5 });
    expect(result.usage.workerCpuMs).toEqual({ period: 21.6e6, day: 1e6 });
    // 640 000 s active × 0.125 GB = 80 000 GB-s; last day 64 000 s = 8 000 GB-s.
    expect(result.usage.doGbSeconds).toEqual({ period: 80_000, day: 8_000 });
    expect(result.usage.d1RowsRead).toEqual({ period: 3e8, day: 3e7 });
    // Newest day only, summed across databases.
    expect(result.usage.d1StorageBytes).toEqual({ current: 4.3e9 });
    expect(result.usage.doRowsRead).toBeUndefined();
    expect(result.notes.join("\n")).toMatch(/doRows: unavailable .*unknown field/);
    expect(result.detail.gbSecondsByNamespace).toEqual([
      ["albionoutpost-data/aaaaaaaa", 60_000],
      ["bbbbbbbb", 20_000],
    ]);
  });
  it("fails on a core API error", async () => {
    const fetcher = vi.fn(async () => new Response(fixture("schema-error"), { status: 200 }));
    await expect(
      collectUsage({
        token: "x".repeat(40),
        account: "a".repeat(32),
        period,
        bindings: noBindings,
        fetcher,
      }),
    ).rejects.toThrow(/unknown field/);
  });
});

describe("run", () => {
  const token = "t".repeat(40);
  const env = { CLOUDFLARE_ANALYTICS_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) };
  const webhook = `https://discord.com/api/webhooks/123456789012345678/${"w".repeat(24)}`;
  let output: string[];
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    output = [];
    vi.spyOn(console, "log").mockImplementation((line) => void output.push(String(line)));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("skips with a notice and no request when a secret is missing", async () => {
    const fetcher = graphqlFetcher();
    expect(await main({ CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) }, fetcher)).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(output.join("\n")).toContain("CLOUDFLARE_ANALYTICS_TOKEN not set");
  });
  it("posts an alert to Discord, mentions nobody, and exits 0", async () => {
    const calls: string[] = [];
    const fetcher = graphqlFetcher(calls);
    expect(await main({ ...env, DISCORD_COST_WEBHOOK_URL: webhook }, fetcher)).toBe(0);
    const post = fetcher.mock.calls.find(([url]) => url === webhook)!;
    const body = JSON.parse(String(post[1].body));
    expect(body.allowed_mentions).toEqual({ parse: [] });
    expect(body.content).toBe("Cloudflare cost alert");
    const embed = body.embeds[0];
    expect(embed.fields[0].value).toContain("$5");
    expect(JSON.stringify(embed.fields)).toContain("Worker CPU time");
    expect(embed.fields.at(-1).name).toContain("Needs a look");
    for (const field of embed.fields) expect(field.value.length).toBeLessThanOrEqual(1024);
    expect(output.join("\n")).not.toContain(token);
    expect(output.join("\n")).not.toContain(webhook);
  });
  it("exits 0 on an alert with no webhook configured", async () => {
    expect(await main(env, graphqlFetcher())).toBe(0);
    expect(output.join("\n")).toContain("alert is only in this log");
  });
  it("exits non-zero only for API errors", async () => {
    const broken = vi.fn(async () => new Response("{}", { status: 403 }));
    expect(await main(env, broken)).toBe(1);
    const fetcher = graphqlFetcher();
    fetcher.mockImplementation(async (url: string, init: RequestInit) =>
      url === webhook ? new Response(null, { status: 404 }) : graphqlFetcher()(url, init),
    );
    expect(await main({ ...env, DISCORD_COST_WEBHOOK_URL: webhook }, fetcher)).toBe(1);
  });
  it("accepts only Discord webhook URLs", () => {
    expect(validWebhook(webhook)).toBe(true);
    expect(validWebhook("https://example.com/api/webhooks/123456/abc")).toBe(false);
    expect(
      validWebhook(`http://discord.com/api/webhooks/123456789012345678/${"w".repeat(24)}`),
    ).toBe(false);
    expect(validWebhook(undefined)).toBe(false);
  });
});
