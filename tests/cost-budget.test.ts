import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pageCacheEntry, pageRoutes } from "../cloudflare/web/page-cache";
import { checkBundles, gzipKiB, lostStaticRoutes } from "../scripts/cloudflare-cost-budget.mjs";

/* The pull-request cost budget (docs/OPERATIONS.md § Cost guardrails). A failure here means a
 * change makes the site dearer to run: a cached route stopped being cached or got a shorter
 * TTL, or a Durable Object, cron or paid binding appeared. If that is intended, update
 * scripts/cloudflare-cost-budget.json (and the docs) in the same PR and say why. */

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
type WorkerBudget = {
  config: string;
  durableObjects: Record<string, string>;
  migrations: string[];
  crons: string[];
  ratelimits: string[];
};
type Budget = {
  bundles: Record<string, { maxGzipKiB: number; measuredGzipKiB: number }>;
  pageCache: { routeCount: number; samples: Record<string, number> };
  edgeCache: Record<string, number>;
  workers: Record<string, WorkerBudget>;
};
type WranglerConfig = {
  name: string;
  durable_objects?: { bindings: { name: string; class_name: string }[] };
  migrations?: { tag: string; new_sqlite_classes?: string[]; new_classes?: string[] }[];
  triggers?: { crons: string[] };
  ratelimits?: { name: string }[];
};
const budget: Budget = JSON.parse(read("scripts/cloudflare-cost-budget.json"));
const config = (path: string): WranglerConfig =>
  JSON.parse(read(path).replace(/,\s*([}\]])/g, "$1"));

describe("page cache allowlist", () => {
  it("keeps every budgeted public page cached for at least its budgeted TTL", () => {
    const drift = Object.entries(budget.pageCache.samples)
      .map(([path, ttl]) => {
        const entry = pageCacheEntry(new Request(`https://albionoutpost.com${path}`), "v1");
        return entry?.ttl === ttl
          ? null
          : `${path}: expected ${ttl} s, got ${entry?.ttl ?? "no cache"}`;
      })
      .filter(Boolean);
    expect(drift).toEqual([]);
  });
  it("lists every page route in the budget", () => {
    expect(pageRoutes.length).toBe(budget.pageCache.routeCount);
  });
});

describe("edge-cached API answers", () => {
  it("keeps the budgeted routes and TTLs", () => {
    const source = read("cloudflare/web/edge-cache.ts");
    const rules = Object.fromEntries(
      [...source.matchAll(/^ {2}"(\/api\/[^"]+)": \{\s*ttl: (\d+),/gm)].map(([, path, ttl]) => [
        path,
        Number(ttl),
      ]),
    );
    expect(rules).toEqual(budget.edgeCache);
  });
});

describe("billable bindings", () => {
  const paidServices = [
    "kv_namespaces",
    "r2_buckets",
    "queues",
    "workflows",
    "vectorize",
    "ai",
    "browser",
    "hyperdrive",
    "analytics_engine_datasets",
    "containers",
    "dispatch_namespaces",
    "send_email",
    "images",
    "pipelines",
  ];
  for (const [name, expected] of Object.entries(budget.workers))
    it(`${name} adds no Durable Object, cron or paid service outside the budget`, () => {
      const settings = config(expected.config);
      expect(settings.name).toBe(name);
      const bindings = Object.fromEntries(
        (settings.durable_objects?.bindings ?? []).map((row) => [row.name, row.class_name]),
      );
      expect(bindings).toEqual(expected.durableObjects);
      expect((settings.migrations ?? []).map((row) => row.tag)).toEqual(expected.migrations);
      expect(settings.triggers?.crons ?? []).toEqual(expected.crons);
      expect((settings.ratelimits ?? []).map((row) => row.name)).toEqual(expected.ratelimits);
      expect(paidServices.filter((key) => key in settings)).toEqual([]);
    });

  it("documents every Durable Object class in ARCHITECTURE.md", () => {
    const architecture = read("docs/ARCHITECTURE.md");
    const classes = new Set<string>();
    for (const expected of Object.values(budget.workers)) {
      for (const name of Object.values(expected.durableObjects)) classes.add(name);
      for (const row of config(expected.config).migrations ?? [])
        for (const name of row.new_sqlite_classes ?? row.new_classes ?? []) classes.add(name);
    }
    expect([...classes].filter((name) => !architecture.includes(`\`${name}\``))).toEqual([]);
  });
});

describe("bundle budget helpers", () => {
  it("reads wrangler's gzip size", () => {
    expect(gzipKiB("Total Upload: 16158.46 KiB / gzip: 3205.84 KiB")).toBe(3205.84);
    expect(gzipKiB("nothing")).toBeNull();
  });
  it("fails a bundle over budget or missing", () => {
    const rows = checkBundles(
      { bundles: { web: { maxGzipKiB: 3840 }, data: { maxGzipKiB: 1280 } } },
      { web: 3841, data: null },
    );
    expect(rows.map((row: { ok: boolean }) => row.ok)).toEqual([false, false]);
    expect(checkBundles({ bundles: { web: { maxGzipKiB: 3840 } } }, { web: 3840 })[0].ok).toBe(
      true,
    );
  });
  it("reports static routes that turned dynamic", () => {
    expect(lostStaticRoutes(["/robots.txt", "/icon.png"], ["/robots.txt"])).toEqual(["/icon.png"]);
  });
  it("keeps budgets under the 10 MiB Workers Paid limit with headroom", () => {
    for (const bundle of Object.values(budget.bundles)) {
      expect(bundle.maxGzipKiB).toBeLessThan(10 * 1024);
      expect(bundle.maxGzipKiB).toBeGreaterThan(bundle.measuredGzipKiB);
    }
  });
});
