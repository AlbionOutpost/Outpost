import { expectResultText } from "./support/result-text";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { normalizeTopKills } from "../src/lib/albion/combat-events";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const quote = (item: string, city: string, sell: number, buy: number, date: string) => ({
  item_id: item,
  city,
  quality: 1,
  sell_price_min: sell,
  sell_price_min_date: date,
  buy_price_max: buy,
  buy_price_max_date: date,
});
// The source's kill-fame page captured on 30 Oct 2026; ages are relative to its fetch time.
const topKills = normalizeTopKills(
  JSON.parse(readFileSync("tests/fixtures/combat-top-kills.json", "utf8")),
);

test("landing page: hero numbers, teaser windows, live tool cards, guides, top kills and the footer", async ({
  page,
}) => {
  await page.route("**/api/market?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: [
          quote("T6_METALBAR", "Martlock", 4190, 3900, minutesAgo(180)),
          quote("T6_METALBAR", "Bridgewatch", 3670, 2165, minutesAgo(9)),
          quote("T6_METALBAR", "Caerleon", 3900, 0, minutesAgo(30)),
        ],
      },
    }),
  );
  await page.route("**/api/history?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        data: [
          {
            location: "Bridgewatch",
            item_id: "T6_METALBAR",
            quality: 1,
            data: [
              { item_count: 10, avg_price: 3500, timestamp: "2026-10-01T00:00:00" },
              { item_count: 12, avg_price: 3900, timestamp: "2026-10-15T00:00:00" },
              { item_count: 8, avg_price: 3400, timestamp: "2026-10-29T00:00:00" },
            ],
          },
        ],
      },
    }),
  );
  await page.route("**/api/landing/craft?*", async (route) => {
    const batches = Number(new URL(route.request().url()).searchParams.get("batches") ?? 1);
    return route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        batches,
        candidates: 5,
        assumptions: { tax: 4, setupFee: 2.5, returnRate: 0, useFocus: false },
        best: {
          recipe: { id: "cape-t6", name: "T6 Cape", output: "T6_CAPE", kind: "crafting" },
          city: "Thetford",
          rows: [
            {
              id: "T6_CLOTH",
              name: "Lavish Cloth",
              quantity: 4 * batches,
              unit: 3594,
              gross: 14376 * batches,
            },
            {
              id: "T6_LEATHER",
              name: "Hardened Leather",
              quantity: 4 * batches,
              unit: 5499,
              gross: 21996 * batches,
            },
          ],
          outputQuantity: batches,
          complete: true,
          missing: [],
          stale: false,
          upfront: 36372 * batches,
          fees: 1754 * batches,
          revenue: 26984 * batches,
          profit: -11142 * batches,
          margin: -41.3,
        },
        byCity: [
          { city: "Thetford", profit: -11142 * batches, margin: -41.3 },
          { city: "Lymhurst", profit: -13826 * batches, margin: -50.1 },
        ],
      },
    });
  });
  await page.route("**/api/market/batch?*", (route) => {
    const u = new URL(route.request().url());
    const items = (u.searchParams.get("items") ?? "").split(",");
    return route.fulfill({
      json: {
        region: "europe",
        fetchedAt: new Date().toISOString(),
        source: "Albion Online Data Project",
        prices: items.flatMap((id) =>
          id === "T6_POTION_HEAL"
            ? []
            : [
                quote(id, "Martlock", 1000, 900, minutesAgo(5)),
                quote(id, "Thetford", 1200, 900, minutesAgo(5)),
              ],
        ),
      },
    });
  });
  await page.route("**/api/combat-events/top?*", (route) =>
    route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Game Info",
        fetchedAt: "2026-10-30T21:45:00Z",
        events: topKills.map((e, i) => ({
          ...e,
          inventory: i === 2 ? [] : e.inventory,
          crew: i === 1 ? e.crew.slice(0, 4) : e.crew,
          gearValue: i === 2 ? null : { total: 232_520_000, priced: 7, missing: 1 },
        })),
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?region=europe");
  await expect(page.locator("h1")).toHaveText("Your Albionadvantage.");

  // The hero keeps the header on its own bar and shows only measured numbers. Measure once the
  // streamed page is in place (a still-hidden boundary reports a zero box).
  await expect(page.locator(".landing-hero")).toBeVisible();
  const layout = await page.evaluate(() => {
    const h = document.querySelector(".site-header")!.getBoundingClientRect();
    const s = document.querySelector(".landing-hero")!.getBoundingClientRect();
    return { headerBottom: h.bottom, heroTop: s.top };
  });
  expect(layout.headerBottom).toBeLessThanOrEqual(layout.heroTop + 1);
  const actions = page.locator(".landing-hero .landing-actions a");
  await expect(actions.nth(0)).toHaveAttribute("href", "/tools?region=europe");
  await expect(actions.nth(1)).toHaveAttribute("href", "/builds/activities?region=europe");
  const stats = page.getByRole("term");
  await expect(stats).toContainText(["Active players", "Builds", "Guides", "Tools", "Supporters"]);
  await expect(page.locator(".landing-stats dd").nth(1)).toHaveText(/^[\d,]+$/);

  // Windows: a public build on the board with its chosen abilities on the pieces, what a Team
  // does, and a comp read as a roster by weapon type.
  const windows = page.locator(".landing-window");
  await expect(windows).toHaveCount(3);
  const board = windows.nth(0).locator(".loadout-board");
  await expect(board.getByRole("listitem")).toHaveCount(10);
  await expect(board.locator('[data-slot="Main hand"] .loadout-board-abilities img')).toHaveCount(
    3,
  );
  await expect(board.locator('[data-slot="Helmet"] .loadout-board-abilities img')).toHaveCount(2);
  await expect(board.locator('[data-slot="Bag"]')).toHaveClass(/is-empty/);
  const heart = windows.nth(0).locator(".heart-chip");
  await expect(heart).toBeDisabled();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart).toHaveAccessibleName(/Sign in to like/);
  await expect(windows.nth(2).locator(".heart-chip")).toBeDisabled();
  await expect(windows.nth(1)).toContainText("Team Management");
  await expect(windows.nth(0)).toContainText("Battleaxe Mist Build");
  await expect(
    windows.nth(1).getByRole("list", { name: "What a Team workspace does" }).getByRole("listitem"),
  ).toHaveCount(5);
  const roster = windows
    .nth(2)
    .getByRole("list", { name: "Members by weapon type" })
    .getByRole("listitem");
  await expect(roster).toHaveCount(5);
  await expect(roster.nth(0)).toHaveAttribute("data-role", /Tank|Healer|DPS|Support/);
  await expect(roster.nth(0).getByRole("link")).toHaveAttribute(
    "href",
    /\/builds\/library\/[a-z0-9-]+\?region=europe/,
  );
  await expect(windows.nth(2).locator(".landing-window-foot")).toHaveAttribute(
    "href",
    /\/compositions\/library\/hellgate-5v5-front-to-back/,
  );

  // Tool cards, loaded from the mocked endpoints once in view.
  const cards = page.locator(".landing-card");
  await expect(cards).toHaveCount(3);
  await cards.first().scrollIntoViewIfNeeded();
  const market = cards.nth(0);
  await expect(market.locator(".tool-item")).toContainText("Refined material · Tier 6");
  await expect(market.locator("tbody tr")).toHaveCount(3);
  await expectResultText(
    market.locator("tbody tr").nth(0),
    /Bridgewatch\s*2,165\s*3,670\s*\+69\.5%/,
  );
  await expect(market.locator("tbody tr").nth(0).locator(".city-dot")).toHaveAttribute(
    "data-city",
    "Bridgewatch",
  );
  await expectResultText(market.locator("tbody tr").nth(1), /Caerleon\s*—\s*3,900\s*—/);
  await expect(market.locator("tbody tr").nth(2).locator("td").nth(1)).toHaveClass(/is-stale/);
  await expect(market.locator(".tool-plot svg")).toBeVisible();
  await expect(market.locator(".tool-plot-y i")).toHaveCount(3);
  await expect(market.locator(".tool-plot-x i").first()).toHaveText("1 Oct");
  await expect(market.locator(".tool-plot-tip")).toContainText("3,400");
  const plot = market.getByRole("slider", { name: /Average price history/ });
  await plot.focus();
  await plot.press("Home");
  await expect(market.locator(".tool-plot-tip")).toContainText("3,500");
  await plot.press("ArrowRight");
  await expect(market.locator(".tool-plot-tip")).toContainText("3,900");
  const graph = await market.locator(".tool-plot svg").boundingBox();
  await page.mouse.move(graph!.x + 1, graph!.y + graph!.height / 2);
  await expect(market.locator(".tool-plot-tip")).toContainText("3,500");
  await page.mouse.move(graph!.x + graph!.width - 1, graph!.y + graph!.height / 2);
  await expect(market.locator(".tool-plot-tip")).toContainText("3,400");
  await market.getByRole("tab", { name: "7D" }).click();
  await expect(market.getByRole("tab", { name: "7D" })).toHaveAttribute("aria-selected", "true");
  await expect(market.getByRole("link", { name: /Open Market Explorer/ })).toHaveAttribute(
    "href",
    "/tools/market?item=T6_METALBAR&quality=1&region=europe",
  );

  const crafting = cards.nth(1);
  await expect(crafting.locator(".tool-item")).toContainText("Cape");
  await expect(crafting.locator(".tool-item")).toContainText("Thetford · best of 5");
  await expect(crafting.locator(".tool-table tbody tr")).toHaveCount(2);
  await expectResultText(
    crafting.locator(".tool-table tbody tr").first(),
    /Lavish Cloth\s*4\s*3,594\s*14,376/,
  );
  await expectResultText(crafting.locator(".tool-pair"), /38,126[\s\S]*26,984/);
  await expect(crafting.locator(".tool-profit")).toHaveClass(/is-loss/);
  await expectResultText(crafting.locator(".tool-profit"), /−\s*11,142[\s\S]*-41\.3%/);
  await expect(crafting.locator(".tool-cities li em")).toHaveCount(0);
  await crafting.getByRole("button", { name: "More batches" }).click();
  await expect(crafting.locator(".tool-card")).toHaveAttribute("aria-busy", "false");
  await expect(crafting.locator(".tool-refresh-note")).toHaveCount(0);

  await expectResultText(crafting.locator(".tool-stepper output"), "2", { exact: true });
  await expectResultText(crafting.locator(".tool-table tbody tr").first(), /28,752/);
  await expect(crafting.getByRole("link", { name: /Open Crafting Calculator/ })).toHaveAttribute(
    "href",
    "/tools/crafting?region=europe",
  );

  const planner = cards.nth(2);
  await expect(
    planner.getByRole("list", { name: "Planned items" }).getByRole("listitem"),
  ).toHaveCount(3);
  await expectResultText(planner.locator(".tool-summary"), /Owned\s*0 \/ 33/);
  await expectResultText(planner.locator(".tool-summary"), /Still to buy\s*13,000\+/);
  await expect(planner.locator(".tool-queue li").nth(2)).toContainText("no sell order");
  await planner
    .getByRole("group", { name: /Owned T4 Cape|Owned .*Cape/ })
    .getByRole("button", { name: "Own one more" })
    .click();
  await expectResultText(planner.locator(".tool-summary"), /Owned\s*1 \/ 33/);
  await expectResultText(planner.locator(".tool-summary"), /12,000\+/);
  await planner.getByRole("tab", { name: "Shopping list" }).click();
  await expectResultText(planner.locator(".tool-queue li").first(), /Buy 9/);
  await expectResultText(planner.locator(".tool-cities li").first(), /Martlock[\s\S]*12,000\+/);
  await expect(planner.locator(".tool-cities li em")).toHaveCount(0);
  await expect(planner.getByRole("link", { name: /Open Crafting Planner/ })).toHaveAttribute(
    "href",
    "/shopping-list?region=europe",
  );

  // Guides slide three at a time with their reading time.
  const guides = page.locator(".guide-card");
  await expect(guides).toHaveCount(8);
  await expect(guides.first().locator(".guide-card-time")).toHaveText(/\d+ min read/);
  await expect(guides.first().getByRole("link")).toHaveAttribute(
    "href",
    /\/guides\/[a-z0-9-]+\?region=europe/,
  );
  await expect(page.getByRole("button", { name: "Previous guides" })).toBeHidden();
  await page.getByRole("button", { name: "Next guides" }).click();
  await expect(page.getByRole("button", { name: "Previous guides" })).toBeVisible();

  // Top kills: the week's most valuable kills, each card a killboard.
  await expect(page.locator("#home-kills-title")).toHaveText("Top kills this week");
  const kills = page.locator(".kill-card");
  await expect(kills).toHaveCount(3);
  await expect(kills.nth(0).locator(".kill-trophy")).toHaveAttribute("alt", "#1");
  await expect(kills.nth(0).locator(".kill-side").nth(0)).toContainText("Hatazan1");
  await expect(kills.nth(0).locator(".kill-side.is-victim")).toContainText("KilluaXcore");
  await expect(kills.nth(0).locator(".kill-mid strong").nth(0)).toHaveText("21.9m");
  await expect(kills.nth(0).locator(".kill-mid strong.is-silver")).toHaveText("232.52m+");
  await expect(kills.nth(0).locator(".kill-mid strong.is-silver")).toHaveAttribute(
    "title",
    /Estimated/,
  );
  await expect(kills.nth(0).locator(".kill-killed .kill-ago")).toHaveText(/ago|now|Unavailable/);
  await expect(kills.nth(0).locator(".loadout-board")).toHaveCount(2);
  await expect(kills.nth(0).locator(".kill-loot li")).toHaveCount(18);
  await expect(kills.nth(2).locator(".kill-loot-empty")).toHaveText("Nothing carried");
  await expect(kills.nth(2).locator(".kill-mid strong.is-silver")).toHaveText("—");
  const toggle = kills.nth(1).getByRole("button", { name: "Show 4 participants" });
  await toggle.click();
  await expect(
    kills.nth(1).getByRole("list", { name: "Participants" }).getByRole("listitem"),
  ).toHaveCount(4);
  await expect(kills.nth(1).locator(".kill-people li").first()).toContainText(/healing/);
  await expect(page.getByRole("link", { name: /Open the kill feed/ })).toHaveAttribute(
    "href",
    "/tools/kill-feed?region=europe",
  );

  // Activities: supplied cutout scenes and listed counts, without the removed ranking rows.
  const activities = page.locator(".activity-artwork-card");
  await expect(activities).toHaveCount(8);
  await expect(activities.first().locator(".activity-artwork-link")).toHaveAttribute(
    "href",
    "/builds/library?category=ZVZ&region=europe",
  );
  await expect(activities.first().locator(".activity-artwork-link")).toContainText(
    /ZvZ\s*[\d,]+ builds/,
  );
  await expect(activities.first().locator("[data-activity-scene]")).toHaveAttribute("src", /zvz/);
  await expect(activities.first().locator("[data-activity-scene]")).toBeVisible();
  await expect(page.locator(".landing-activities .activity-top")).toHaveCount(0);

  // Advertising stays off until configured; the closing band says what is free and what supports.
  await expect(page.locator(".adsbygoogle")).toHaveCount(0);
  const cta = page.locator(".landing-cta");
  await expect(cta).toContainText("Free for everyone.");
  await expect(cta.getByRole("link", { name: /Sign in with Discord/ })).toHaveAttribute(
    "href",
    "/signin?callbackUrl=%2Fdashboard",
  );
  // Billing is off in this environment: nothing is priced or sold.
  await expect(cta).not.toContainText(/\$|€|per month/);
  await expect(cta.getByRole("link", { name: /About the Supporter plan/ })).toHaveAttribute(
    "href",
    "/supporter?region=europe",
  );
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("navigation", { name: "Explore" })).toBeVisible();
  await expect(footer).toContainText("Albion Online Data Project");

  // Region picker: every server named, the current one marked.
  await page.getByRole("combobox", { name: "Albion region" }).click();
  const options = page.getByRole("listbox", { name: "Game servers" }).getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Escape");

  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const clippedGear = await page
      .locator(".landing-window")
      .first()
      .evaluate((card) => {
        const outer = card.getBoundingClientRect();
        return [...card.querySelectorAll(".loadout-board-cell")].filter((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left < outer.left || rect.right > outer.right;
        }).length;
      });
    expect(clippedGear).toBe(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("landing page keeps every state honest when the sources are down", async ({ page }) => {
  for (const path of [
    "**/api/market?*",
    "**/api/history?*",
    "**/api/landing/craft?*",
    "**/api/market/batch?*",
  ])
    await page.route(path, (route) =>
      route.fulfill({ status: 503, json: { error: "Source unavailable" } }),
    );
  await page.route("**/api/combat-events/top?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Albion’s kill ranking is unavailable right now." },
    }),
  );
  await page.goto("/?region=europe");
  const cards = page.locator(".landing-card");
  await cards.first().scrollIntoViewIfNeeded();
  await expect(cards.nth(0).locator("tbody")).toContainText("Source unavailable");
  await expect(cards.nth(1).locator(".tool-item")).toContainText("Unavailable");
  await expect(cards.nth(1).locator(".tool-profit")).toContainText("—");
  await expect(cards.nth(2).locator(".tool-summary")).toContainText(/Still to buy\s*No prices/);
  await expect(page.locator(".landing-kills")).toContainText("kill ranking is unavailable");
  await expect(page.locator(".kill-card")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/NaN|undefined/);
});

test("supporter page explains the plan without selling anything while billing is off", async ({
  page,
}) => {
  await page.goto("/premium?region=europe");
  await expect(page).toHaveURL(/\/supporter\?region=europe/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Support Outpost");
  await expect(page.getByRole("heading", { name: "Not for sale yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sign in with Discord/ })).toHaveAttribute(
    "href",
    "/signin?region=europe",
  );
  await expect(page.locator("body")).not.toContainText(/\$|€|per month/);
});

test("robots points crawlers at a sitemap of public pages and keeps editors out", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /builds/new");
  expect(robots).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/builds/library/battleaxe-mist-build</loc>");
  expect(sitemap).toContain("/tools/crafting</loc>");
  expect(sitemap).not.toContain("/builds/new</loc>");
  expect(sitemap).not.toContain("/api/");
});

test("planner digits roll down and up, and reduced motion shows exact results immediately", async ({
  page,
}) => {
  for (const endpoint of [
    "**/api/landing/craft?*",
    "**/api/market?*",
    "**/api/history?*",
    "**/api/combat-events/top?*",
  ])
    await page.route(endpoint, (route) =>
      route.fulfill({
        status: 503,
        json: {
          error: "Unrelated source intentionally unavailable in the isolated animation fixture",
        },
      }),
    );
  await page.route("**/api/market/batch?*", (route) => {
    const items = (new URL(route.request().url()).searchParams.get("items") ?? "").split(",");
    return route.fulfill({
      json: {
        region: "europe",
        source: "Albion Online Data Project",
        fetchedAt: new Date().toISOString(),
        prices: items.map((id) => quote(id, "Martlock", 1000, 900, new Date().toISOString())),
      },
    });
  });
  await page.goto("/");
  const planner = page.locator(".landing-card").nth(2);
  await planner.scrollIntoViewIfNeeded();
  await expectResultText(planner.locator(".tool-summary"), "33,000");
  const owned = planner.getByRole("group", { name: /Owned T4 Cape|Owned .*Cape/ });
  const flow = planner.locator(
    '.tool-summary .animated-number[data-value="33000"] number-flow-react',
  );
  await flow.evaluate((node) => node.setAttribute("data-continuity-check", "retained"));
  await owned.getByRole("button", { name: "Own one more" }).click();
  const money = planner.locator('.tool-summary .animated-number[data-value="32000"]');
  await expect(money).toHaveAccessibleName("32,000");
  const moving = money.locator("number-flow-react");
  await expect
    .poll(() =>
      moving.evaluate((node) =>
        node.shadowRoot!.getAnimations().some((a) => a.playState === "running"),
      ),
    )
    .toBe(true);
  expect(
    await moving.evaluate(
      (node) => (node as HTMLElement & { computedTrend: number }).computedTrend,
    ),
  ).toBe(-1);
  // Reverse while the previous movement is active. The same flow/strips must survive.
  await owned.getByRole("button", { name: "Own one fewer" }).click();
  const raised = planner.locator('.tool-summary .animated-number[data-value="33000"]');
  await expect(raised).toHaveAccessibleName("33,000");
  await expect(raised.locator("number-flow-react")).toHaveAttribute(
    "data-continuity-check",
    "retained",
  );
  expect(
    await raised
      .locator("number-flow-react")
      .evaluate((node) => (node as HTMLElement & { computedTrend: number }).computedTrend),
  ).toBe(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await owned.getByRole("button", { name: "Own one more" }).click();
  await expect(money).toHaveAccessibleName("32,000");
  await expect
    .poll(() =>
      moving.evaluate((node) =>
        node.shadowRoot!.getAnimations().some((a) => a.playState === "running"),
      ),
    )
    .toBe(false);
  await expect(moving.locator(".digit__num:not([inert])")).toHaveText(["3", "2", "0", "0", "0"]);
});

test("craft quantity recalculates without refetching; shared digits roll and reduced motion settles", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/landing/craft")
      return route.fulfill({ status: 503, json: { error: "Unavailable in this controlled test" } });
    requests.push(url.searchParams.get("batches") || "");
    return route.fulfill({
      json: {
        batches: 1,
        candidates: 1,
        best: {
          recipe: { id: "cape-t4", name: "T4 Cape", output: "T4_CAPE" },
          city: "Lymhurst",
          rows: [{ id: "T4_CLOTH", name: "Cloth", quantity: 4, unit: 100, gross: 400 }],
          outputQuantity: 1,
          complete: true,
          missing: [],
          upfront: 400,
          fees: 39,
          revenue: 600,
          profit: 222.2,
          margin: 37.0333,
        },
        byCity: [{ city: "Lymhurst", profit: 222.2, margin: 37.0333 }],
        unpriced: [],
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  // Use the existing showcase wrapper, independent of layout styling.
  const card = page
    .locator(".tool-card")
    .filter({ has: page.getByRole("group", { name: "Batches", exact: true }) });
  await expectResultText(card.locator(".tool-pair"), "439");
  await card.getByRole("button", { name: "More batches" }).click();
  await expect(card.locator('.animated-number[data-value="878"]')).toHaveAttribute(
    "aria-label",
    "878",
  );
  await expect
    .poll(() =>
      card
        .locator("number-flow-react")
        .evaluateAll((nodes) =>
          nodes.some((node) =>
            node.shadowRoot!.getAnimations().some((animation) => animation.playState === "running"),
          ),
        ),
    )
    .toBe(true);
  await expectResultText(card.locator(".tool-pair"), "878");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await card.getByRole("button", { name: "Fewer batches" }).click();
  await expectResultText(card.locator('.animated-number[data-value="439"]'), "439", {
    exact: true,
  });
  expect(
    await card
      .locator("number-flow-react")
      .evaluateAll(
        (nodes) =>
          nodes
            .flatMap((node) => node.shadowRoot!.getAnimations())
            .filter((a) => a.playState === "running").length,
      ),
  ).toBe(0);
  expect(requests).toEqual(["1"]);
  await expect(card).not.toContainText("Could not update");
});

test("membership callout precedes activity discovery and the footer keeps its navigation", async ({
  page,
}) => {
  await page.goto("/?region=asia");
  const cta = page.locator(".landing-cta-wrap");
  const artwork = cta.locator(".landing-cta-art img");
  await artwork.scrollIntoViewIfNeeded();
  await artwork.evaluate((image: HTMLImageElement) => image.decode());
  expect(await artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1536);
  await expect(cta.getByRole("link", { name: /Supporter plan/ })).toHaveAttribute(
    "href",
    "/supporter?region=asia",
  );
  const before = await cta.evaluate((node) =>
    Boolean(
      node.compareDocumentPosition(document.querySelector(".landing-activities")!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    ),
  );
  expect(before).toBe(true);
  const footer = page.locator("footer.site-footer");
  for (const group of ["Explore", "Tools", "Your workspace"])
    await expect(footer.getByRole("navigation", { name: group, exact: true })).toBeVisible();
  await expect(
    footer.getByRole("link", { name: "Builds by activity", exact: true }),
  ).toHaveAttribute("href", "/builds/activities?region=asia");
  await footer.getByRole("link", { name: "Builds by activity", exact: true }).click();
  await expect(page).toHaveURL(/builds\/activities\?region=asia/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("footer.site-footer").getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
