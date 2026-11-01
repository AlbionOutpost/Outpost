import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("farming estimates a supplied harvest, keeps manual prices and saves privately", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const anonymous = await browser.newContext();
  try {
    await context.addCookies([
      { name: "next-auth.session-token", value: token, domain: "localhost", path: "/" },
    ]);
    await page.goto("/tools/farming?region=europe");
    await expect(page.locator('[data-result="farm-profit"]')).toHaveText("Not calculated");
    await page.getByLabel("Seeds to plant", { exact: true }).fill("10");
    await page.getByLabel("Plants to water", { exact: true }).fill("5");
    await page.getByLabel("Harvest per plant", { exact: true }).fill("8");
    await page.getByLabel("Actual total watering focus", { exact: true }).fill("500");
    await page.getByLabel("Seed unit price · silver", { exact: true }).fill("2000");
    await page.getByLabel("Produce unit price · silver", { exact: true }).fill("100");
    await page.getByText("Seed returns & fees", { exact: true }).click();
    await page.getByLabel("Seed purchase fee (%)", { exact: true }).fill("1");
    await page.getByLabel("Produce sales tax + setup (%)", { exact: true }).fill("10");
    await page.getByLabel("Other costs per harvest · silver", { exact: true }).fill("100");
    await expect(page.locator('[data-result="farm-profit"]')).toHaveText("6,900");
    await expect(page.locator(".farming-results")).toContainText("-13,100");
    await page.route("**/api/market/batch?*", (route) =>
      route.fulfill({
        json: {
          region: "europe",
          fetchedAt: new Date().toISOString(),
          source: "Albion Online Data Project",
          prices: [],
        },
      }),
    );
    await page.getByRole("button", { name: "Refresh market observations", exact: true }).click();
    await expect(page.getByRole("status").first()).toContainText("Manual prices kept");
    await expect(page.locator('[data-result="farm-profit"]')).toHaveText("6,900");
    await page.getByText("Saved harvest scenarios & sharing", { exact: true }).click();
    await page.getByLabel("Scenario title", { exact: true }).fill("Harvest fixture");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({
      where: { authorId: id, kind: "farming" },
    });
    expect((await anonymous.request.get("/api/scenarios?kind=farming")).status()).toBe(401);
    expect(
      (
        await anonymous.request.delete(`/api/scenarios/${saved.id}`, {
          headers: {
            origin: new URL(test.info().project.use.baseURL || "http://localhost:3000").origin,
          },
        })
      ).status(),
    ).toBe(401);
    const shared = await anonymous.newPage();
    await shared.goto(
      `/tools/farming?region=europe#scenario=${encodeURIComponent(JSON.stringify(saved.configuration))}`,
    );
    await expect(shared.locator('[data-result="farm-profit"]')).toHaveText("6,900");
    await shared.getByLabel("Plants to water", { exact: true }).fill("11");
    await expect(shared.getByLabel("Plants to water", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(shared.locator(".farming-inputs [role=alert]")).toContainText(
      "Check planted and watered quantities",
    );
    await shared.getByRole("button", { name: "Arcane Agaric T2 · herb", exact: true }).click();
    await expect(shared.getByLabel("Unwatered seed yield (%)", { exact: true })).toHaveValue("33");
    await expect(shared.getByLabel("Seed unit price · silver", { exact: true })).toHaveValue("");
    await shared.setViewportSize({ width: 320, height: 700 });
    expect(await shared.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await page.getByText("Saved harvest scenarios & sharing", { exact: true }).click();
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page.getByRole("button", { name: "Restore Harvest fixture", exact: true }).click();
    await expect(page.locator('[data-result="farm-profit"]')).toHaveText("6,900");
  } finally {
    await anonymous.close();
    await db.user.deleteMany({ where: { id } });
  }
});
