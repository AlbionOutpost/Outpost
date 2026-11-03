import { expectResultText } from "./support/result-text";
import { chooseRegion } from "./support/region";
import { test, expect } from "@playwright/test";
test("calculate a trade with real input", async ({ page }) => {
  await page.goto("/tools/flipping");
  await page.getByLabel("Purchase price per item").fill("100");
  await page.getByLabel("Sale price per item").fill("150");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await expectResultText(page.locator(".result strong"), "500");
});
test("market failure never substitutes prices", async ({ page }) => {
  await page.route("**/api/market?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Market source unavailable" }),
    }),
  );
  await page.goto("/tools/market");
  await page.getByRole("button", { name: "Refresh prices" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("unavailable");
  await expect(page.locator(".market-board tbody tr")).toHaveCount(0);
});
test("regional market request and region invalidation", async ({ page }) => {
  let releaseAsia!: () => void;
  const asiaResponse = new Promise<void>((resolve) => {
    releaseAsia = resolve;
  });
  let asiaRequested = false;
  // This case tests market selection, not third-party history availability.
  await page.route("**/api/history?**", (route) =>
    route.fulfill({ status: 503, json: { error: "History unavailable in this fixture" } }),
  );
  await page.route("**/api/market?**", async (route) => {
    const region = new URL(route.request().url()).searchParams.get("region");
    if (region === "asia") {
      asiaRequested = true;
      await asiaResponse;
    }
    await route.fulfill({
      json: {
        region,
        prices: [
          {
            item_id: "T4_BAG",
            city: region === "asia" ? "Caerleon" : "Lymhurst",
            quality: 1,
            sell_price_min: region === "asia" ? 9876 : 100,
            buy_price_max: region === "asia" ? 8765 : 90,
            sell_price_min_date: "2020-01-01T00:00:00",
            buy_price_max_date: "2020-01-01T00:00:00",
          },
        ],
      },
    });
  });
  try {
    await page.goto("/tools/market?region=europe");
    await page.getByRole("button", { name: "Refresh prices" }).click();
    const rows = page.locator(".market-board tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Lymhurst");
    await expectResultText(rows.locator('[data-label="Sell order"] .silver'), "100", {
      exact: true,
    });
    await chooseRegion(page, "asia");
    await expect.poll(() => asiaRequested).toBe(true);
    // Deliberately hold the destination response beyond the 150ms autoload debounce:
    // a stale callback must not restore Europe's URL, header or observations.
    await page.waitForTimeout(400);
    await expect(page).toHaveURL((url) => url.searchParams.get("region") === "asia");
    await expect(page.getByLabel("Albion region")).toHaveAttribute("data-region", "asia");
    await expect(rows).toHaveCount(0);
    releaseAsia();
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Caerleon");
    await expect(rows).not.toContainText("Lymhurst");
    await expectResultText(rows.locator('[data-label="Sell order"] .silver'), "9,876", {
      exact: true,
    });
    await expectResultText(rows.locator('[data-label="Buy order"] .silver'), "8,765", {
      exact: true,
    });
    await expect(page).toHaveURL((url) => url.searchParams.get("region") === "asia");
    await expect(page.getByLabel("Albion region")).toHaveAttribute("data-region", "asia");
  } finally {
    releaseAsia();
  }
});
test("a delayed region navigation preserves the previous market history entry", async ({
  page,
}) => {
  let releaseAsia!: () => void;
  const asiaNavigation = new Promise<void>((resolve) => {
    releaseAsia = resolve;
  });
  let asiaRscRequested = false;
  let asiaMarketRequests = 0;
  await page.route("**/api/history?**", (route) =>
    route.fulfill({ status: 503, json: { error: "History unavailable in this fixture" } }),
  );
  await page.route("**/api/market?**", (route) => {
    const region = new URL(route.request().url()).searchParams.get("region");
    if (region === "asia") asiaMarketRequests++;
    return route.fulfill({
      json: {
        region,
        prices: [
          {
            item_id: "T4_BAG",
            city: region === "asia" ? "Caerleon" : "Lymhurst",
            quality: 1,
            sell_price_min: region === "asia" ? 9876 : 100,
            buy_price_max: region === "asia" ? 8765 : 90,
            sell_price_min_date: "2020-01-01T00:00:00",
            buy_price_max_date: "2020-01-01T00:00:00",
          },
        ],
      },
    });
  });
  await page.route("**/tools/market?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("region") !== "asia" || route.request().headers().rsc !== "1")
      return route.continue();
    asiaRscRequested = true;
    const response = await route.fetch();
    await asiaNavigation;
    await route.fulfill({ response });
  });
  try {
    // Establish a real earlier entry so a lost market entry would send Back to Home.
    await page.goto("/?region=europe");
    await page.goto("/tools/market?region=europe");
    const rows = page.locator(".market-board tbody tr");
    const picker = page.getByRole("combobox", { name: "Albion region", exact: true });
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Lymhurst");
    const previousHistoryLength = await page.evaluate(() => history.length);
    await picker.click();
    await page.getByRole("option", { name: "Asia", exact: true }).click();
    await expect.poll(() => asiaRscRequested).toBe(true);
    await expect(picker).toHaveAttribute("data-region", "asia");
    await expect(rows).toHaveCount(0);
    // Keep the actual RSC navigation pending beyond the 150ms autoload debounce.
    // The optimistic region must not replace the still-current Europe history entry.
    await page.waitForTimeout(600);
    await expect(page).toHaveURL((url) => url.searchParams.get("region") === "europe");
    await expect(picker).toHaveAttribute("data-region", "asia");
    await expect(rows).toHaveCount(0);
    expect(await page.evaluate(() => history.length)).toBe(previousHistoryLength);
    expect(asiaMarketRequests).toBe(0);
    releaseAsia();
    await expect(page).toHaveURL((url) => url.searchParams.get("region") === "asia");
    await expect.poll(() => page.evaluate(() => history.length)).toBe(previousHistoryLength + 1);
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Caerleon");
    await expectResultText(rows.locator('[data-label="Sell order"] .silver'), "9,876", {
      exact: true,
    });
    await page.goBack();
    await expect(page).toHaveURL(
      (url) => url.pathname === "/tools/market" && url.searchParams.get("region") === "europe",
    );
    await expect(picker).toHaveAttribute("data-region", "europe");
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText("Lymhurst");
    await expectResultText(rows.locator('[data-label="Sell order"] .silver'), "100", {
      exact: true,
    });
  } finally {
    releaseAsia();
  }
});
test("private account data requires authentication", async ({ request, page }) => {
  expect((await request.get("/api/account/export")).status()).toBe(401);
  await page.goto("/settings");
  await expect(page).toHaveURL(/signin/);
});
test("mobile navigation works without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation", exact: true })
    .getByRole("link", { name: "Market explorer", exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/market/);
  await expect(page.getByRole("combobox", { name: "Search market items" })).toBeVisible();
});

test("theme and region survive reload, and desktop tool navigation supports Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await chooseRegion(page, "asia");
  await page.locator(".desktop-navigation summary").filter({ hasText: "Tools" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("link", { name: /^Market explorer Compare city quotes/ })
    .click();
  await expect(page.getByLabel("Albion region")).toHaveAttribute("data-region", "asia");
  const tools = page.locator(".desktop-navigation summary").filter({ hasText: "Tools" });
  await tools.click();
  await page.getByRole("link", { name: /^Crafting Plan equipment batches/ }).focus();
  await page.keyboard.press("Escape");
  await expect(tools).toBeFocused();
  await expect(
    page.locator(".desktop-navigation details").filter({ hasText: "Markets & calculators" }),
  ).not.toHaveAttribute("open");
  const more = page.locator(".more-dropdown > summary");
  await more.click();
  await expect(page.getByRole("link", { name: "My dashboard", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(page.locator(".more-dropdown")).not.toHaveAttribute("open");
});
test("page policy uses per-request nonces and protected data is not publicly cached", async ({
  request,
}) => {
  const a = await request.get("/"),
    b = await request.get("/");
  const ca = a.headers()["content-security-policy"],
    cb = b.headers()["content-security-policy"];
  expect(ca).toContain("strict-dynamic");
  expect(ca).not.toBe(cb);
  expect(ca).toContain("frame-ancestors 'none'");
  if (process.env.E2E_PRODUCTION === "1") expect(ca).not.toContain("unsafe-eval");
  expect(a.headers()["cache-control"]).toContain("no-store");
});
