import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const gear = [
  { slot: "Main hand", itemId: "T4_MAIN_AXE", quality: 1 },
  { slot: "Helmet", itemId: null, quality: null },
];
const feed = (region: string, offset = 0) => ({
  region,
  offset,
  source: "Albion Online Game Info",
  fetchedAt: new Date().toISOString(),
  events: [
    {
      id: offset + 42,
      occurredAt: "2020-01-01T01:00:00Z",
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
  const event = page.locator(".combat-event-summary").first();
  await expect(event).toContainText("Combat fixture attacker");
  await expect(event).toContainText("Delayed source event");
  await event.click();
  await expect(page.locator(".combat-event-details")).toContainText("Combat fixture victim");
  await expect(
    page
      .locator(".combat-event-details")
      .getByLabel("Main hand: Battleaxe · T4.0", { exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("textbox", { name: "Filter this feed page by player or guild" })
    .fill("no-result");
  await expect(
    page.getByRole("heading", { name: "No player or guild matches this page" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filter", exact: true }).click();
  fail = true;
  await page.getByRole("button", { name: "Refresh feed", exact: true }).click();
  await expect(page.locator(".combat-feed-page").getByRole("alert")).toContainText(
    "Combat fixture outage",
  );
  await expect(event).toContainText("Combat fixture attacker");
  fail = false;
  await page.getByRole("button", { name: "Retry feed", exact: true }).click();
  await expect(page.locator(".combat-feed-page").getByRole("alert")).toHaveCount(0);
  await page.getByRole("link", { name: "Death feed", exact: true }).click();
  await expect(page).toHaveURL(/death-feed\?region=europe$/);
  await expect(page.locator(".combat-identity")).toContainText("Combat fixture victim");
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
