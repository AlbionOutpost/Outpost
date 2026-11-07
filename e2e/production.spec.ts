import { expectResultText } from "./support/result-text";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { initialProduction } from "../src/lib/albion/production";
import { initialTransport } from "../src/lib/albion/transport";
import { initialLaborers, laborerLoot, journalId } from "../src/lib/albion/laborers";
import { gameRecipe } from "../src/lib/albion/game/recipes";
import { createTestDb } from "./support/db";
const db = createTestDb();
for (const [calculator, recipe] of [
  ["crafting", "steel-bar-t4"],
  ["refining", "battleaxe-t4"],
  ["refining", "T4_MAIN_AXE"],
  ["alchemy", "T4_MAIN_AXE"],
] as const) {
  test(`${calculator} recovers from an incompatible recipe link (${recipe})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/economy/prices?**", (route) =>
      route.fulfill({ json: { prices: {} } }),
    );
    await page.goto(`/tools/${calculator}?region=europe&recipe=${encodeURIComponent(recipe)}`);
    await expect(
      page.getByRole("heading", { name: "Recipe unavailable in this calculator", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "This page didn’t load" })).toHaveCount(0);
    await page.getByRole("link", { name: "Start with the default recipe", exact: true }).click();
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("1");
    await expect(
      page.getByRole("heading", { name: "Recipe unavailable in this calculator", exact: true }),
    ).toHaveCount(0);
    await expect(page).not.toHaveURL(/recipe=/);
    expect(errors).toEqual([]);
  });
}

for (const mode of ["hash", "saved"] as const) {
  test(`a delayed ${mode} recipe restore preserves edits made while loading`, async ({ page }) => {
    const saved = {
      ...initialProduction("crafting", "europe"),
      recipeId: "T8_WOOD_LEVEL1@1~2",
      batches: 99,
    };
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    await page.route("**/api/recipes?**", (route) =>
      route.fulfill({ status: 503, json: { error: "Fixture browsing unavailable" } }),
    );
    await page.route("**/api/economy/prices?**", (route) =>
      route.fulfill({ json: { prices: {} } }),
    );
    await page.route("**/api/recipes/T8_WOOD_LEVEL1%401~2", async (route) => {
      started();
      await held;
      await route.fulfill({ json: { recipe: gameRecipe(saved.recipeId) } });
    });
    await page.route("**/api/scenarios?**", (route) =>
      route.fulfill({
        json: [{ id: "delayed", title: "Delayed recipe", kind: "crafting", configuration: saved }],
      }),
    );
    await page.goto(
      `/tools/crafting?region=europe${mode === "hash" ? `#scenario=${encodeURIComponent(JSON.stringify(saved))}` : ""}`,
    );
    await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    if (mode === "saved") {
      await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
      await page.getByRole("button", { name: "Restore Delayed recipe", exact: true }).click();
    }
    await requested;
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("123");
    release();
    await expect(
      page.getByText(
        "Your inputs changed while the recipe loaded. Your current inputs were kept; restore again to replace them.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("123");
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("1");
  });
}

test("legacy production fees require a player accounting choice without replacing the draft", async ({
  page,
}) => {
  const legacy = initialProduction("crafting", "europe");
  delete legacy.recipeSilverAccounting;
  legacy.recipeId = "T4_WOOD_LEVEL1@1";
  legacy.batches = 10;
  legacy.stationFee = 1520;
  for (const [id, value] of Object.entries({ T4_WOOD: 100, "T4_WOOD_LEVEL1@1": 1000 }))
    legacy.prices[id] = {
      value,
      manual: true,
      region: null,
      city: null,
      quality: 1,
      observedAt: null,
    };
  await page.route("**/api/economy/prices?**", (route) => route.fulfill({ json: { prices: {} } }));
  await page.route("**/api/recipes?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Fixture: recipe browsing unavailable" } }),
  );
  await page.goto(
    `/tools/crafting?region=europe#scenario=${encodeURIComponent(JSON.stringify(legacy))}`,
  );
  await expect(
    page.getByRole("button", { name: "Recorded fee includes recipe silver", exact: true }),
  ).toBeVisible();
  await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Recorded fee includes recipe silver", exact: true })
    .click();
  await expectResultText(page.locator("output[data-result=total-profit]"), "-6,200", {
    exact: true,
  });
  await page.getByText("Station settings, focus & sources", { exact: true }).click();
  await page.getByText("Markets & transaction fees", { exact: true }).click();
  await expect(
    page.getByLabel("Additional station / upgrade fee per craft", { exact: true }),
  ).toHaveValue("20");
  await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("10");
});

test("failed game-recipe prerequisites preserve the active draft on hash and account restores", async ({
  page,
}) => {
  const saved = {
    ...initialProduction("crafting", "europe"),
    recipeId: "T8_WOOD_LEVEL1@1~2",
    batches: 99,
  };
  // Search failures prevent accidental catalog registration; the exact declared recipe also fails.
  await page.route("**/api/recipes**", (route) =>
    route.fulfill({ status: 503, json: { error: "Fixture catalog unavailable" } }),
  );
  await page.route("**/api/economy/prices?**", (route) => route.fulfill({ json: { prices: {} } }));
  await page.goto(
    `/tools/crafting?region=europe#scenario=${encodeURIComponent(JSON.stringify(saved))}`,
  );
  await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
  await expect(
    page.getByText(
      "Saved recipe could not be loaded. Your current inputs were kept. Try restoring again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("1");
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("123");
  await page.route("**/api/scenarios?**", (route) =>
    route.fulfill({
      json: [
        {
          id: "fixture-restore",
          title: "Unavailable game recipe",
          kind: "crafting",
          configuration: saved,
        },
      ],
    }),
  );
  await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
  await page.getByRole("button", { name: "Restore Unavailable game recipe", exact: true }).click();
  await expect(
    page.getByText(
      "Saved recipe could not be loaded. Your current inputs were kept. Try restoring again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("123");
  await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("1");
});

test("laborer execution changes never reuse listing observations after a failed refresh", async ({
  page,
}) => {
  const input = initialLaborers("europe");
  const observed = (value: number, execution: "listing" | "instant-purchase") => ({
    value,
    execution,
    manual: false,
    region: "europe",
    city: "Lymhurst",
    quality: 1,
    observedAt: new Date().toISOString(),
  });
  const prices = {
    [journalId(input.type, 4, true)]: observed(100, "instant-purchase"),
    ...Object.fromEntries(
      laborerLoot(input.type, 4)!.items.map((row) => [row.id, observed(1000, "listing")]),
    ),
  };
  await page.route("**/api/items/game?**", (route) => route.fulfill({ json: { items: {} } }));
  await page.route("**/api/laborers/prices?**", (route) => {
    if (new URL(route.request().url()).searchParams.get("saleMode") === "listing")
      return route.fulfill({ json: { prices } });
    return route.fulfill({ status: 503, json: { error: "Fixture: buy orders unavailable" } });
  });
  await page.goto("/tools/laborers?region=europe");
  const execution = page.locator("label").filter({ hasText: "Sell loot by" }).locator("select");
  await execution.selectOption("listing");
  await expectResultText(page.locator('[data-result="laborer-profit"]'), "15,294", {
    exact: true,
  });
  // Every price is in: no checklist of missing prices.
  await expect(page.locator('[data-result="readiness"]')).toHaveCount(0);
  await execution.selectOption("instant");
  await expect(
    page.getByText("Prices couldn’t be loaded. Your inputs were kept.", { exact: true }),
  ).toBeVisible();
  await expectResultText(page.locator('[data-result="laborer-profit"]'), "15,724", { not: true });
  await expect(page.getByLabel("Metalbar · T4.0 unit price", { exact: true })).toHaveValue("");
  await expect(page.locator('[data-result="readiness"]')).toContainText("Loot prices");
  await page.getByLabel("Metalbar · T4.0 unit price", { exact: true }).fill("900");
  await page.getByRole("button", { name: "Refresh market prices", exact: true }).click();
  await expect(
    page.getByText("Prices couldn’t be loaded. Your inputs were kept.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Metalbar · T4.0 unit price", { exact: true })).toHaveValue("900");
});

test("production calculations save, reload, share and enforce scenario ownership", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Economy planner",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  try {
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const legacy = initialProduction("crafting", "europe");
    delete legacy.recipeSilverAccounting;
    legacy.recipeId = "T4_WOOD_LEVEL1@1";
    legacy.stationFee = 1520;
    const ambiguous = await context.request.post("/api/scenarios", {
      headers: {
        origin: new URL(test.info().project.use.baseURL || "http://localhost:3000").origin,
      },
      data: { title: "Unconfirmed legacy fee", configuration: legacy },
    });
    expect(ambiguous.status()).toBe(400);
    expect((await ambiguous.json()).error).toContain("Confirm whether its station fee includes");
    const oversized = initialProduction("crafting", "europe");
    oversized.batches = 100000;
    oversized.stationFee = 1e9;
    const cargo = initialTransport("europe");
    cargo.quantity = 1000000;
    cargo.buy.value = 1e12;
    cargo.sell.value = 1;
    for (const configuration of [oversized, cargo]) {
      const denied = await context.request.post("/api/scenarios", {
        headers: {
          origin: new URL(test.info().project.use.baseURL || "http://localhost:3000").origin,
        },
        data: { title: "Invalid oversized scenario", configuration },
      });
      expect(denied.status()).toBe(400);
    }
    expect(await db.savedScenario.count({ where: { authorId: id } })).toBe(0);
    await page.goto("/tools/crafting?region=europe");
    await page.getByText("Station settings, focus & sources", { exact: true }).click();
    await page.getByText("Markets & transaction fees", { exact: true }).click();
    await page.getByRole("button", { name: "Set 10 batches", exact: true }).click();
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("10");
    await page.getByRole("button", { name: "Set 1 batches", exact: true }).click();
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
    await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
    await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
    await expectResultText(page.locator("output[data-result=total-profit]"), "1,000", {
      exact: true,
    });
    await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await page.getByLabel("Scenario title", { exact: true }).fill("Verified crafting scenario");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({ where: { authorId: id } });
    await page.reload();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore Verified crafting scenario", exact: true })
      .click();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("100");
    await expect(page.getByLabel("Output unit sale price", { exact: true })).toHaveValue("3,000");
    const outsider = await browser.newContext();
    try {
      const unauthorized = await outsider.request.delete(`/api/scenarios/${saved.id}`, {
        headers: {
          origin: new URL(test.info().project.use.baseURL || "http://localhost:3000").origin,
        },
      });
      expect(unauthorized.status()).toBe(401);
      const shared = await outsider.newPage();
      await shared.goto(
        `/tools/crafting?region=europe#scenario=${encodeURIComponent(JSON.stringify(saved.configuration))}`,
      );
      await expect(shared.getByLabel("Pine Planks unit price", { exact: true })).toHaveValue("50");
      await shared.setViewportSize({ width: 375, height: 812 });
      await shared.screenshot({ path: ".qa/screenshots/production-375.png", fullPage: true });
      expect(
        await shared.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    } finally {
      await outsider.close();
    }
    await page
      .getByRole("button", { name: "Delete Verified crafting scenario", exact: true })
      .click();
    await expect(page.getByText("Scenario deleted.", { exact: true })).toBeVisible();
    expect(await db.savedScenario.count({ where: { authorId: id } })).toBe(0);
  } finally {
    await db.user.delete({ where: { id } });
  }
});

for (const failure of [
  {
    status: 429,
    body: "Market request budget exhausted. Retry shortly.",
    message: "Too many market requests. Please wait a minute, then refresh.",
  },
  {
    status: 503,
    body: "<html>Proxy unavailable</html>",
    message: "Prices couldn’t be loaded. Your inputs were kept.",
  },
  {
    status: 200,
    body: "malformed upstream document",
    message: "Prices couldn’t be loaded. Your inputs were kept.",
  },
]) {
  test(`production keeps edits and recovers from a non-JSON ${failure.status} price response`, async ({
    page,
  }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    let attempt = 0;
    await page.route("**/api/economy/prices?**", async (route) => {
      if (++attempt === 1) {
        started();
        await held;
        await route.fulfill({
          status: failure.status,
          contentType: "text/plain",
          body: failure.body,
        });
      } else await route.fulfill({ json: { prices: {} } });
    });
    await page.goto("/tools/crafting?region=europe");
    await requested;
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("123");
    await page.getByLabel("Crafts / upgrades", { exact: true }).fill("7");
    release();
    await expect(page.getByText(failure.message, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("123");
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("7");
    await expect(page.locator("output[data-result=total-profit]")).toHaveCount(0);
    await expect(page.getByText(/Unexpected token|not valid JSON|Proxy unavailable/)).toHaveCount(
      0,
    );
    const recovered = page.waitForResponse((response) =>
      response.url().includes("/api/economy/prices?"),
    );
    await page.getByRole("button", { name: "Refresh market observations", exact: true }).click();
    await recovered;
    await expect(
      page.getByRole("button", { name: "Refresh market observations", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText(failure.message, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("123");
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("7");
  });
}

test("the sticky result never covers the details under a calculator", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  // Typed prices complete the run without touching the market.
  await page.route("**/api/economy/prices?**", (route) => route.fulfill({ json: { prices: {} } }));
  await page.goto("/tools/crafting?region=europe");
  await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
  await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
  await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
  // Accounting and assumptions are open beside the sensitivity table, not behind toggles.
  for (const name of ["Detailed accounting · entire run", "Your assumptions"])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  // Scrolled to the end, the sticky result stays above the details.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  const result = await page.locator("#production-results").boundingBox();
  const details = await page
    .getByRole("heading", { name: "Run details", exact: true })
    .boundingBox();
  expect(result!.y + result!.height).toBeLessThanOrEqual(details!.y);
  for (const [url, name] of [
    ["/tools/transporting?region=europe", "Saved transport plans"],
    ["/tools/farming?region=europe", "Saved harvest scenarios & sharing"],
    ["/tools/flipping?region=europe", "Saved trade scenarios & sharing"],
  ] as const) {
    await page.goto(url);
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const toggle = page.getByRole("button", { name, exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
});
