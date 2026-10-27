import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
    await page.goto("/tools/crafting?region=europe");
    await page.getByText("Markets & transaction fees", { exact: true }).click();
    await page.getByRole("button", { name: "Set 10 batches", exact: true }).click();
    await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue("10");
    await page.getByRole("button", { name: "Set 1 batches", exact: true }).click();
    await page.getByLabel("Steel Bar unit price", { exact: true }).fill("100");
    await page.getByLabel("Pine Planks unit price", { exact: true }).fill("50");
    await page.getByLabel("Output unit sale price", { exact: true }).fill("3000");
    await expect(page.locator(".panel.result > strong")).toHaveText("1,000 silver");
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
