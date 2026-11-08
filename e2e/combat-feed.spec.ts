import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const gear = [
  { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1 },
  { slot: "Helmet", itemId: null, quality: null },
];
const minutesAgo = (n: number) => new Date(Date.now() - n * 60000).toISOString();
const feed = (
  region: string,
  offset = 0,
  occurredAt = "2020-01-01T01:00:00Z",
  freshness = "delayed",
  latestSeenAt = occurredAt,
  sourceUnavailable = false,
) => ({
  region,
  offset,
  source: "Albion Online Game Info",
  fetchedAt: new Date().toISOString(),
  newestAt: occurredAt,
  latestSeenAt,
  freshness,
  collectedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  origin: "collector",
  sourceUnavailable,
  events: [
    {
      id: offset + 42,
      occurredAt,
      killer: {
        id: "a",
        name: "Combat fixture attacker",
        guild: "Test team",
        alliance: "",
        itemPower: 900,
        equipment: gear,
      },
      victim: {
        id: "b",
        name: "Combat fixture victim",
        guild: "",
        alliance: "",
        itemPower: null,
        equipment: gear,
      },
      fame: 12345,
      participants: 2,
      inventory: [],
      crew: [
        {
          name: "Combat fixture attacker",
          guild: "Test team",
          damage: 1200,
          healing: 0,
          itemPower: 900,
          equipment: [{ slot: "Main hand", itemId: "T4_MAIN_AXE" }],
        },
      ],
    },
  ],
});
test("published combat feed retains server boundaries, source delay, equipment and actionable retry", async ({
  page,
  context,
}) => {
  let fail = false;
  await page.route("**/api/combat-events?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: fail ? 503 : 200,
      json: fail
        ? { error: "Combat fixture outage" }
        : feed(url.searchParams.get("region")!, Number(url.searchParams.get("offset"))),
    });
  });
  await page.goto("/tools/kill-feed?region=europe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Global kill feed");
  const event = page.locator(".combat-event").first();
  await expect(event.locator(".kill-side").first()).toContainText("Combat fixture attacker");
  await expect(event).toContainText("Delayed source event");
  // The landing's killboard: the victim's inventory and the participants open inside the card.
  await expect(event.locator(".kill-loot")).toContainText("Nothing carried");
  await event.getByRole("button", { name: "Show 1 participant", exact: true }).click();
  await expect(event.getByRole("list", { name: "Participants" })).toContainText("1,200 dmg");
  await event.getByRole("button", { name: "Item details", exact: true }).click();
  await expect(page.locator(".combat-event-details")).toContainText("Combat fixture victim");
  await expect(
    page
      .locator(".combat-event-details")
      .getByLabel("Main hand: Battleaxe · T4.0", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("textbox", { name: "Filter this feed page by player or guild" })
    .fill("no-result");
  await expect(page.getByText("No events match these page filters", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filter", exact: true }).click();
  fail = true;
  await page.getByRole("button", { name: "Refresh feed", exact: true }).click();
  const outage = page
    .locator(".combat-feed-page")
    .getByRole("status")
    .filter({ hasText: "Combat fixture outage" });
  await expect(outage).toBeVisible();
  await expect(event).toContainText("Combat fixture attacker");
  fail = false;
  await page.getByRole("button", { name: "Retry feed", exact: true }).click();
  await expect(outage).toHaveCount(0);
  await page.getByRole("link", { name: "Death feed", exact: true }).click();
  await expect(page).toHaveURL(/kill-feed\?view=deaths&region=europe$/);
  await expect(page.locator(".combat-event .kill-side.is-victim")).toContainText(
    "Combat fixture victim",
  );
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  for (const query of [
    "region=other",
    "region=europe&offset=1",
    "region=europe&offset=220",
    "region=europe&host=https://evil.test",
  ])
    expect((await context.request.get(`/api/combat-events?${query}`)).status()).toBe(400);
});

test("the feed says how old its newest kill is and never passes an old copy off as live", async ({
  page,
}) => {
  let answer: (region: string) => { status: number; json: unknown } = (region) => ({
    status: 200,
    json: feed(region, 0, minutesAgo(3), "live"),
  });
  await page.route("**/api/combat-events?**", async (route) => {
    const region = new URL(route.request().url()).searchParams.get("region")!;
    await route.fulfill(answer(region));
  });
  await page.goto("/tools/kill-feed?region=americas");
  const source = page.locator(".combat-feed-source");
  await expect(source).toContainText("Newest kill 3 min ago");
  await expect(source).toContainText(/kills shown · page 1 · Outpost read Albion/);
  await expect(page.locator(".combat-feed-freshness")).toHaveCount(0);
  await expect(page.locator(".combat-event")).not.toContainText("Delayed source event");

  // Albion answered with a week-old copy while Outpost had seen a kill two minutes ago.
  answer = (region) => ({
    status: 200,
    json: feed(region, 0, minutesAgo(8 * 1440), "snapshot", minutesAgo(2)),
  });
  await page.getByRole("button", { name: "Refresh feed", exact: true }).click();
  const notice = page.locator(".combat-feed-freshness").getByRole("status");
  await expect(notice).toContainText("Albion’s server sent an old copy of the feed");
  await expect(notice).toContainText("its newest kill is from 8 d ago");
  await expect(notice).toContainText("Outpost saw fights from 2 min ago");
  await expect(source).toContainText("Newest kill 8 d ago");
  await expect(page.locator(".combat-event").first()).toContainText("Delayed source event");

  // The source itself is behind: nothing newer has been published for hours.
  answer = (region) => ({ status: 200, json: feed(region, 0, minutesAgo(180), "delayed") });
  await page.getByRole("button", { name: "Ask again", exact: true }).click();
  await expect(notice).toContainText(
    "Albion’s feed is running behind: the newest published kill is from 3 h ago",
  );

  // Albion did not answer, but the collector had the newest fights: shown, and said so.
  answer = (region) => ({
    status: 200,
    json: feed(region, 0, minutesAgo(12), "live", minutesAgo(12), true),
  });
  await page.getByRole("button", { name: "Ask again", exact: true }).click();
  await expect(notice).toContainText("Albion’s combat feed did not answer just now");
  await expect(notice).toContainText("Outpost read from it 5 min ago");
  await expect(page.locator(".combat-event").first()).toContainText("12 min ago");

  // The source itself is behind again, for the unreachable case below.
  answer = (region) => ({ status: 200, json: feed(region, 0, minutesAgo(180), "delayed") });
  await page.getByRole("button", { name: "Ask again", exact: true }).click();
  await expect(notice).toContainText("3 h ago");

  // Unreachable: an error, and the last page stays below, still labelled with its age.
  answer = () => ({ status: 503, json: { error: "Albion’s combat feed is unavailable." } });
  await page.getByRole("button", { name: "Refresh feed", exact: true }).click();
  await expect(
    page.locator(".combat-feed-page").getByRole("status").filter({ hasText: "unavailable" }),
  ).toContainText("The last page that loaded stays below.");
  await expect(notice).toContainText("3 h ago");
});
