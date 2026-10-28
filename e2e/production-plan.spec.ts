import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { initialProduction } from "../src/lib/albion/production";
import { recipeFor } from "../src/lib/albion/recipes";
const db = createTestDb();

test("a large restored plan stays exportable without copying a broken share link", async ({
  page,
}) => {
  const run = initialProduction("crafting", "europe");
  run.recipeId = "grind-t8_potion_lifeward-e3";
  const recipe = recipeFor(run);
  for (const id of [...recipe.ingredients.map((i) => i.id), recipe.output])
    run.prices[id] = {
      value: 100,
      manual: false,
      observedAt: "2026-10-28T10:00:00+00:00",
      region: "europe",
      city: "Lymhurst",
      quality: 1,
    };
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("An oversized link must never reach the clipboard");
        },
      },
    });
  });
  await page.route("**/api/scenarios?kind=production-plan", (route) =>
    route.fulfill({
      json: [
        {
          id: "large-plan-fixture",
          title: "Large plan fixture",
          kind: "production-plan",
          configuration: { kind: "production-plan", region: "europe", runs: Array(30).fill(run) },
        },
      ],
    }),
  );
  await page.goto("/tools/alchemy?region=europe");
  const planner = page.getByRole("region", { name: "One run. Every recipe.", exact: true });
  await planner.getByText("Save or restore a production plan", { exact: true }).click();
  await planner.getByRole("button", { name: "Load saved production plans", exact: true }).click();
  await planner.getByRole("button", { name: "Restore Large plan fixture", exact: true }).click();
  await expect(planner.locator(".production-plan-run")).toHaveCount(30);
  await planner.getByRole("button", { name: "Copy production plan link", exact: true }).click();
  await expect(
    planner.getByText(
      "This plan is too large for a share link. Save it to your account or use Export plan JSON.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    planner.getByRole("button", { name: "Save production plan", exact: true }),
  ).toBeEnabled();
  const downloaded = page.waitForEvent("download");
  await planner.getByRole("button", { name: "Export plan JSON", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("outpost-production-europe.json");
  await expect(planner.locator(".production-plan-run")).toHaveCount(30);
});

test("multi-recipe plan combines materials, refreshes safely and persists with ownership boundaries", async ({
  page,
  context,
  browser,
}) => {
  const owner = `atlas-test-${randomUUID()}`,
    other = `atlas-test-${randomUUID()}`;
  const token = randomUUID(),
    otherToken = randomUUID();
  for (const [id, sessionToken] of [
    [owner, token],
    [other, otherToken],
  ])
    await db.user.create({
      data: { id, sessions: { create: { sessionToken, expires: new Date(Date.now() + 600000) } } },
    });
  const outsider = await browser.newContext();
  try {
    await context.addCookies([
      { name: "next-auth.session-token", value: token, domain: "localhost", path: "/" },
    ]);
    await outsider.addCookies([
      { name: "next-auth.session-token", value: otherToken, domain: "localhost", path: "/" },
    ]);
    await page.goto("/tools/crafting?region=europe");
    const planner = page.getByRole("region", { name: "One run. Every recipe.", exact: true });
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
    await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
    await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
    await planner.getByRole("button", { name: "Add current recipe", exact: true }).click();
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("200");
    await planner.getByRole("button", { name: "Add current recipe", exact: true }).click();
    const rows = planner.locator("tbody tr");
    await expect(rows.first()).toContainText("4,800");
    await expect(rows.first()).toContainText("32");
    // Empty supplied fees/returns:6000 revenue-5600 gross material purchases=400 profit.
    await expect(planner.locator(".production-plan-stats").first()).toContainText("400");
    await page.route("**/api/economy/prices?*", (route) =>
      route.fulfill({
        json: {
          prices: {
            T4_METALBAR: {
              value: 999,
              manual: false,
              quality: 1,
              region: "europe",
              city: "Lymhurst",
              observedAt: "2020-01-01T00:00:00Z",
            },
          },
        },
      }),
    );
    await planner.getByRole("button", { name: "Refresh plan observations", exact: true }).click();
    await expect(planner.getByRole("status").last()).toContainText("Manual prices kept");
    await expect(rows.first()).toContainText("4,800");
    await planner.getByText("Save or restore a production plan", { exact: true }).click();
    await planner
      .getByLabel("Production plan title", { exact: true })
      .fill("Combined crafting fixture");
    await planner.getByRole("button", { name: "Save production plan", exact: true }).click();
    await expect(
      planner.getByText("Scenario saved to your account.", { exact: true }),
    ).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({
      where: { authorId: owner, kind: "production-plan" },
    });
    const dashboard = await context.newPage();
    await dashboard.goto("/dashboard");
    await expect(
      dashboard.getByRole("link", { name: "Open calculator and load plans", exact: true }),
    ).toHaveAttribute("href", "/tools/crafting?region=europe#production-plan-title");
    await dashboard.close();
    const privateList = await outsider.request.get("/api/scenarios?kind=production-plan");
    expect(privateList.headers()["cache-control"]).toBe("private, no-store");
    expect(await privateList.json()).toEqual([]);
    expect(
      (
        await outsider.request.delete(`/api/scenarios/${saved.id}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(404);
    const invalid = await context.request.post("/api/scenarios", {
      headers: { origin: "http://localhost:3000" },
      data: {
        title: "Mixed servers",
        configuration: { ...(saved.configuration as object), region: "asia" },
      },
    });
    expect(invalid.status()).toBe(400);
    await page.reload();
    await planner.getByText("Save or restore a production plan", { exact: true }).click();
    await planner.getByRole("button", { name: "Load saved production plans", exact: true }).click();
    await planner
      .getByRole("button", { name: "Restore Combined crafting fixture", exact: true })
      .click();
    await expect(rows.first()).toContainText("4,800");
    await planner.getByRole("button", { name: "Edit", exact: true }).first().click();
    await page.getByLabel("Output unit sale price", { exact: true }).fill("4000");
    await planner.getByRole("button", { name: "Replace planned recipe", exact: true }).click();
    await expect(planner.locator(".production-plan-stats")).toContainText("1,400");
    const download = page.waitForEvent("download");
    await planner.getByRole("button", { name: "Export plan JSON", exact: true }).click();
    expect((await download).suggestedFilename()).toBe("outpost-production-europe.json");
    const shared = await outsider.newPage();
    await shared.goto(
      `/tools/crafting?region=europe#production-plan=${encodeURIComponent(JSON.stringify(saved.configuration))}`,
    );
    await expect(shared.locator(".production-plan tbody tr").first()).toContainText("4,800");
    await shared.setViewportSize({ width: 320, height: 700 });
    expect(await shared.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await planner
      .getByRole("button", { name: "Remove recipe 1: T4 Battleaxe", exact: true })
      .click();
    await expect(rows.first()).toContainText("3,200");
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
  }
});
