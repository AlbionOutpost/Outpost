import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyState,
  findProblems,
  healthWindow,
  incidentEmbed,
  main,
  nextState,
  recoveryEmbed,
  summarize,
  THRESHOLDS,
  trafficFloor,
} from "../scripts/cloudflare-health-check.mjs";

type Row = {
  dimensions: Record<string, string | number>;
  sum: { requests: number; errors?: number };
};
type Account = { workers: Row[]; objects: Row[]; history: Row[] };
const fixture = (): { data: { viewer: { accounts: Account[] } } } =>
  JSON.parse(
    readFileSync(new URL("./fixtures/cloudflare-health/healthy.json", import.meta.url), "utf8"),
  );
const account = () => fixture().data.viewer.accounts[0];
// The window then ends at 16:48 UTC, so the traffic floor reads 16:00 on the seven days before.
const NOW = Date.parse("2026-11-09T16:53:00Z");
const window = healthWindow(NOW);
const worker = (
  scriptName: string,
  eventType: string,
  status: string,
  requests: number,
  httpResponseStatus = 0,
  errors = 0,
): Row => ({
  dimensions: { scriptName, eventType, status, httpResponseStatus },
  sum: { requests, errors },
});
const keys = (data: Account) => findProblems(summarize(data), window).map((p) => p.key);

describe("window", () => {
  it("covers the 30 minutes ending five minutes ago and the previous week by hour", () => {
    expect(window).toEqual({
      start: "2026-11-09T16:18:00.000Z",
      end: "2026-11-09T16:48:00.000Z",
      endHour: "2026-11-09T16:00:00.000Z",
      historyStart: "2026-11-02T16:00:00.000Z",
    });
  });
});

describe("thresholds", () => {
  it("finds nothing wrong in a normal half hour", () => {
    const summary = summarize(account());
    expect(summary.web).toEqual({ requests: 195, failed: 0 });
    expect(summary.data).toEqual({ requests: 345, failed: 0 });
    expect(summary.cron).toEqual({ requests: 24, failed: 0 });
    expect(findProblems(summary, window)).toEqual([]);
  });

  it("alerts on pages at 5 % failures with at least 20 requests, counting 5xx and exceptions", () => {
    const data = account();
    // 195 good + 6 exceptions + 5 answered 503 = 11 of 206 (5.3 %).
    data.workers.push(worker("albionoutpost-web", "fetch", "scriptThrewException", 6, 500, 6));
    data.workers.push(worker("albionoutpost-web", "fetch", "success", 5, 503));
    const summary = summarize(data);
    expect(summary.web).toEqual({ requests: 206, failed: 11 });
    const [problem] = findProblems(summary, window);
    expect(problem).toMatchObject({ key: "web-errors", severity: "red" });
    expect(problem.detail).toContain("11 of 206");
    expect(problem.detail).toContain("5.3 %");
  });

  it("stays quiet just under 5 % and below 20 requests", () => {
    const under = account();
    under.workers.push(worker("albionoutpost-web", "fetch", "exceededResources", 10, 0, 10));
    expect(keys(under)).toEqual([]); // 10 of 205 = 4.9 %
    const few = account();
    few.workers = [
      worker("albionoutpost-web", "fetch", "scriptThrewException", 5, 500, 5),
      worker("albionoutpost-web", "fetch", "success", 14, 200),
      worker("albionoutpost-data", "cron", "success", 15),
    ];
    expect(keys(few)).toEqual([]); // 5 of 19: too few to judge
  });

  it("does not count client disconnects or 4xx answers as failures", () => {
    const data = account();
    data.workers.push(worker("albionoutpost-web", "fetch", "clientDisconnected", 50, 200));
    data.workers.push(worker("albionoutpost-web", "fetch", "success", 80, 429));
    expect(keys(data)).toEqual([]);
  });

  it("alerts on data Worker RPC errors and Durable Object errors per namespace", () => {
    const data = account();
    data.workers.push(worker("albionoutpost-data", "rpc", "scriptThrewException", 30, 0, 30));
    data.objects[2].sum.errors = 9; // 9 of 81
    expect(keys(data)).toEqual(["data-errors", "do-errors:c8c1e14d6e7c48728cd6cd3d21d1a542"]);
  });

  it("alerts when the kill collector stops or most of its runs fail", () => {
    const stopped = account();
    stopped.workers = stopped.workers.filter((row) => row.dimensions.eventType !== "cron");
    expect(keys(stopped)).toEqual(["cron-stopped"]);
    const failing = account();
    failing.workers.push(worker("albionoutpost-data", "cron", "scriptThrewException", 24, 0, 24));
    expect(keys(failing)).toEqual(["cron-errors"]);
    const blip = account();
    blip.workers.push(worker("albionoutpost-data", "cron", "scriptThrewException", 2, 0, 2));
    expect(keys(blip)).toEqual([]);
  });

  it("alerts on zero traffic only in an hour that always has visitors", () => {
    const data = account();
    data.workers = data.workers.filter((row) => row.dimensions.scriptName !== "albionoutpost-web");
    expect(trafficFloor(summarize(data).history, window)).toBe(144);
    expect(keys(data)).toEqual(["no-traffic"]);
    // One quiet day in the week (or a day without data) makes the hour too quiet to judge.
    data.history = data.history.filter(
      (row) => row.dimensions.datetimeHour !== "2026-11-05T16:00:00Z",
    );
    expect(trafficFloor(summarize(data).history, window)).toBe(0);
    expect(keys(data)).toEqual([]);
  });
});

describe("de-duplication", () => {
  const problem = (key: string) => ({ key, severity: "red", title: key, detail: key });

  it("sends one alert per problem and one all-clear after two clean checks", () => {
    let state = emptyState();
    const first = nextState(state, [problem("web-errors")], NOW);
    expect(first.opened.map((p) => p.key)).toEqual(["web-errors"]);
    state = first.state;
    for (let run = 1; run <= 5; run++) {
      const again = nextState(state, [problem("web-errors")], NOW + run * 900_000);
      expect(again.opened).toEqual([]);
      expect(again.recovered).toEqual([]);
      state = again.state;
    }
    expect(state.open["web-errors"].since).toBe(new Date(NOW).toISOString());
    const clean = nextState(state, [], NOW + 6 * 900_000);
    expect(clean.recovered).toEqual([]); // one clean check is not enough
    const flap = nextState(clean.state, [problem("web-errors")], NOW + 7 * 900_000);
    expect(flap.opened).toEqual([]); // came back before clearing: same incident
    const one = nextState(flap.state, [], NOW + 8 * 900_000);
    const two = nextState(one.state, [], NOW + 9 * 900_000);
    expect(two.recovered.map((p) => p.key)).toEqual(["web-errors"]);
    expect(two.state.open).toEqual({});
    expect(THRESHOLDS.clearAfter).toBe(2);
  });

  it("leaves open problems alone when the check was blind", () => {
    const { state } = nextState(emptyState(), [problem("cron-stopped")], NOW);
    const blind = nextState(state, [], NOW + 900_000, { partial: true });
    const blinder = nextState(blind.state, [], NOW + 1_800_000, { partial: true });
    expect(blinder.recovered).toEqual([]);
    expect(Object.keys(blinder.state.open)).toEqual(["cron-stopped"]);
  });
});

describe("Discord embeds", () => {
  it("names the problem in plain words, lists older ones and fits Discord's limits", () => {
    const data = account();
    data.workers.push(worker("albionoutpost-web", "fetch", "scriptThrewException", 40, 500, 40));
    const problems = findProblems(summarize(data), window);
    const earlier = nextState(
      emptyState(),
      [{ key: "cron-stopped", severity: "amber", title: "The kill collector stopped", detail: "" }],
      NOW - 3_600_000,
    ).state;
    const { state, opened } = nextState(
      earlier,
      [
        ...problems,
        { key: "cron-stopped", severity: "amber", title: "The kill collector stopped", detail: "" },
      ],
      NOW,
    );
    const embed = incidentEmbed(opened, state, window, NOW);
    expect(embed.title).toBe("🚨 Outpost is broken");
    expect(embed.color).toBe(0xe5484d);
    expect(embed.fields[0]).toMatchObject({ name: "🚨 Pages are failing" });
    expect(embed.fields[0].value).toContain("40 of 235");
    expect(embed.fields[1]).toMatchObject({
      name: "Still open",
      value: "The kill collector stopped · since 60 min",
    });
    expect(embed.fields.at(-2)).toMatchObject({ name: "Checked", value: "16:18 → 16:48 UTC" });
    expect(embed.footer.text).toContain("Error alerts");
    for (const field of embed.fields) expect(field.value.length).toBeLessThanOrEqual(1024);
    expect(JSON.stringify(embed)).not.toMatch(/@everyone|@here|<@/);
  });

  it("reports recovery with how long it lasted", () => {
    const embed = recoveryEmbed(
      [
        {
          key: "web-errors",
          title: "Pages are failing",
          since: new Date(NOW - 45 * 60_000).toISOString(),
        },
      ],
      emptyState(),
      NOW,
    );
    expect(embed).toMatchObject({ title: "✅ Outpost recovered", color: 0x30a46c });
    expect(embed.fields[0]).toMatchObject({
      name: "✅ Pages are failing",
      value: "Lasted about 45 min",
    });
  });
});

describe("main", () => {
  const webhook = `https://discord.com/api/webhooks/123456789012/${"a".repeat(68)}`;
  let directory: string;
  let env: Record<string, string>;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "outpost-health-"));
    env = {
      CLOUDFLARE_ANALYTICS_TOKEN: "t".repeat(40),
      CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
      DISCORD_COST_WEBHOOK_URL: webhook,
      OUTPOST_HEALTH_STATE: join(directory, "state.json"),
    };
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });
  const fetcher = (accountData: () => Account | null, posts: unknown[]) =>
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.startsWith("https://discord.com/")) {
        posts.push(JSON.parse(String(init.body)));
        return new Response(null, { status: 204 });
      }
      const data = accountData();
      return data
        ? Response.json({ data: { viewer: { accounts: [data] } }, errors: null })
        : Response.json({ data: null, errors: [{ message: "rate limited" }] });
    });

  it("posts once when pages break, stays quiet while broken, and posts once when fixed", async () => {
    const posts: { content: string; username: string; embeds: { title: string }[] }[] = [];
    let broken = true;
    const read = () => {
      const data = account();
      if (broken)
        data.workers.push(
          worker("albionoutpost-web", "fetch", "scriptThrewException", 40, 500, 40),
        );
      return data;
    };
    const call = fetcher(read, posts);
    expect(await main(env, call, NOW)).toBe(0);
    expect(await main(env, call, NOW + 900_000)).toBe(0);
    broken = false;
    expect(await main(env, call, NOW + 1_800_000)).toBe(0);
    expect(await main(env, call, NOW + 2_700_000)).toBe(0);
    expect(posts.map((post) => post.embeds[0].title)).toEqual([
      "🚨 Outpost is broken",
      "✅ Outpost recovered",
    ]);
    expect(posts[0]).toMatchObject({
      username: "Outpost alerts",
      content: "Outpost alert: Pages are failing",
    });
    // The analytics query never carries the webhook, and Discord never sees the token.
    for (const [url, init] of call.mock.calls)
      if (url.startsWith("https://discord.com/"))
        expect(String(init.body)).not.toContain(env.CLOUDFLARE_ANALYTICS_TOKEN);
  });

  it("prefers the alerts webhook over the cost webhook", async () => {
    const posts: unknown[] = [];
    const other = `https://discord.com/api/webhooks/999999999999/${"b".repeat(68)}`;
    const call = fetcher(() => {
      const data = account();
      data.workers = data.workers.filter((row) => row.dimensions.eventType !== "cron");
      return data;
    }, posts);
    await main({ ...env, DISCORD_ALERTS_WEBHOOK_URL: other }, call, NOW);
    expect(
      call.mock.calls.filter(([url]) => url.startsWith("https://discord.com/")).map(([url]) => url),
    ).toEqual([other]);
  });

  it("alerts once after three failed analytics reads in a row, never on one", async () => {
    const posts: { embeds: { title: string; fields: { name: string }[] }[] }[] = [];
    const call = fetcher(() => null, posts);
    for (let run = 0; run < 2; run++) expect(await main(env, call, NOW + run * 900_000)).toBe(0);
    expect(posts).toEqual([]);
    for (let run = 2; run < 5; run++) expect(await main(env, call, NOW + run * 900_000)).toBe(0);
    expect(posts).toHaveLength(1);
    expect(posts[0].embeds[0].fields[0].name).toBe("⚠️ The health check cannot read Cloudflare");
  });

  it("keeps the old state when Discord fails, so the next run retries", async () => {
    const call = vi.fn(async (url: string) => {
      if (url.startsWith("https://discord.com/")) return new Response("nope", { status: 500 });
      const data = account();
      data.workers = data.workers.filter((row) => row.dimensions.eventType !== "cron");
      return Response.json({ data: { viewer: { accounts: [data] } } });
    });
    expect(await main(env, call, NOW)).toBe(1);
    expect(await main(env, call, NOW + 900_000)).toBe(1);
    expect(call.mock.calls.filter(([url]) => url.startsWith("https://discord.com/"))).toHaveLength(
      2,
    );
  });

  it("skips without credentials and refuses a webhook that is not Discord's", async () => {
    const call = vi.fn();
    expect(await main({}, call, NOW)).toBe(0);
    expect(
      await main({ ...env, DISCORD_ALERTS_WEBHOOK_URL: "https://example.com/hook" }, call, NOW),
    ).toBe(1);
    expect(call).not.toHaveBeenCalled();
  });
});
