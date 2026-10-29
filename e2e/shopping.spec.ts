import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("a loadout becomes an inventory-aware list that survives reload without crossing servers", async ({
  page,
}) => {
  await page.goto("/builds/new?region=europe");
  await page.getByRole("button", { name: "Load example equipment", exact: true }).click();
  await page.getByText("Market estimates & shopping list", { exact: true }).click();
  await page.getByRole("button", { name: "Shop this loadout", exact: true }).click();
  await page.getByRole("link", { name: "Open list →", exact: true }).click();
  await expect(page.getByText("10 purchase lines", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const input of await page.getByLabel(/owned quantity$/).all()) await input.fill("1");
  await page.getByLabel(/^Battleaxe.*required quantity$/).fill("3");
  await page.getByLabel(/^Battleaxe.*unit price$/).fill("2500");
  await expect(page.locator(".shopping-total")).toHaveText("5,000");
  await page.reload();
  await expect(page.locator(".shopping-total")).toHaveText("5,000");
  await page.getByLabel(/^Battleaxe.*owned quantity$/).fill("3");
  await expect(page.locator(".shopping-total")).toHaveText("0");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".shopping-total")).toHaveText("5,000");
  await page.goto("/shopping-list?region=asia");
  await expect(
    page.getByRole("heading", { name: "Start with a loadout or a crafting plan." }),
  ).toBeVisible();
  await page.goto("/shopping-list?region=europe");
  await expect(page.locator(".shopping-total")).toHaveText("5,000");
});

test("account shopping snapshots validate inputs and retain owner-only access", async ({
  page,
  context,
  browser,
}) => {
  const owner = `atlas-test-${randomUUID()}`,
    other = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
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
    const configuration = {
      kind: "shopping-list",
      region: "europe",
      list: {
        version: 1,
        region: "europe",
        entries: [
          {
            itemId: "T4_MAIN_AXE",
            name: "Battleaxe",
            city: "Fort Sterling",
            quality: 1,
            quantity: 4,
            owned: 1,
            unitPrice: 2500,
            priceKind: "manual",
            observedAt: null,
          },
        ],
      },
    };
    const response = await context.request.post("/api/scenarios", {
      headers: { origin: "http://localhost:3000" },
      data: { title: "Private regear list", configuration },
    });
    expect(response.status()).toBe(201);
    const saved = await response.json();
    const own = await context.request.get("/api/scenarios?kind=shopping-list");
    expect(own.headers()["cache-control"]).toContain("no-store");
    expect((await own.json()).some((r: { id: string }) => r.id === saved.id)).toBe(true);
    expect(
      (await (await outsider.request.get("/api/scenarios?kind=shopping-list")).json()).some(
        (r: { id: string }) => r.id === saved.id,
      ),
    ).toBe(false);
    expect(
      (
        await outsider.request.delete(`/api/scenarios/${saved.id}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await context.request.post("/api/scenarios", {
          headers: { origin: "http://localhost:3000" },
          data: { title: "Wrong server", configuration: { ...configuration, region: "asia" } },
        })
      ).status(),
    ).toBe(400);
    await page.goto("/shopping-list?region=europe");
    await page.getByText("Save & load account lists", { exact: true }).click();
    await page.getByRole("button", { name: "Load account lists", exact: true }).click();
    await page.getByRole("button", { name: "Restore Private regear list", exact: true }).click();
    await expect(page.locator(".shopping-total")).toHaveText("7,500");
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id: { in: [owner, other] } } });
  }
});
