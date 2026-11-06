import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { normalizeTopKills } from "../../src/lib/albion/combat-events";

/**
 * Serves the home page's top-kills endpoint from a captured ranking page so suites that
 * audit the landing page see the killboards rather than the source's availability.
 */
export async function mockTopKills(page: Page) {
  const events = normalizeTopKills(
    JSON.parse(readFileSync("tests/fixtures/combat-top-kills.json", "utf8")),
  );
  const feed = {
    region: "europe",
    source: "Albion Online Game Info",
    fetchedAt: "2026-10-30T21:45:00Z",
    events: events.map((e, i) => ({
      ...e,
      gearValue: i === 2 ? null : { total: 232_520_000, priced: 7, missing: 1 },
    })),
  };
  await page.route("**/api/combat-events/top?*", (route) => route.fulfill({ json: feed }));
  // The homepage reads its kills from the batched landing answer; the other parts stay failed.
  const failed = { ok: false, error: "Isolated layout fixture" };
  await page.route("**/api/landing?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        fetchedAt: feed.fetchedAt,
        source: "Albion Online Data Project",
        market: failed,
        history: { ...failed, city: "Caerleon" },
        craft: failed,
        planner: failed,
        kills: { ok: true, ...feed, window: { days: 7 } },
      },
    }),
  );
}
