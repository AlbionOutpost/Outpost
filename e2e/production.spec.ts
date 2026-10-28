import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { initialProduction } from "../src/lib/albion/production";
import { initialTransport } from "../src/lib/albion/transport";
import { createTestDb } from "./support/db";
const db = createTestDb();
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
    const oversized = initialProduction("crafting", "europe");
    oversized.batches = 100000;
    oversized.stationFee = 1e9;
    const cargo = initialTransport("europe");
    cargo.quantity = 1000000;
    cargo.buy.value = 1e12;
    cargo.sell.value = 1;
    for (const configuration of [oversized, cargo]) {
      const denied = await context.request.post("/api/scenarios", {
        headers: { origin: "http://localhost:3000" },
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
    await expect(page.locator("output[data-result=total-profit]")).toHaveText("1,000");
    await page.getByLabel("Scenario title", { exact: true }).fill("Verified crafting scenario");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({ where: { authorId: id } });
    await page.reload();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore Verified crafting scenario", exact: true })
      .click();
    await expect(page.getByLabel("Steel Bar unit price", { exact: true })).toHaveValue("100");
    await expect(page.getByLabel("Output unit sale price", { exact: true })).toHaveValue("3000");
    const outsider = await browser.newContext();
    try {
      const unauthorized = await outsider.request.delete(`/api/scenarios/${saved.id}`, {
        headers: { origin: "http://localhost:3000" },
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
