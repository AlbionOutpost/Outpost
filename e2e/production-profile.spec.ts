import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("refining city and specialization profile derives returns and estimates focus without pretending station rounding", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
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
    await page.goto("/tools/refining?region=europe");
    await page.getByText("Station settings, focus & sources", { exact: true }).click();
    const profile = page
      .locator("details")
      .filter({ has: page.locator("summary", { hasText: "City & specialization profile" }) })
      .last();
    await profile.locator("summary").first().click();
    await page.getByLabel("Production city", { exact: true }).selectOption("Thetford");
    for (const tier of [4, 5, 6, 7, 8])
      await page.getByLabel(`T${tier} specialization`, { exact: true }).fill("100");
    await expect(profile).toContainText("36.71% returns without focus, 53.92% with focus");
    await expect(profile).toContainText("Estimated total focus: 3.375");
    await page.getByRole("button", { name: "Apply production profile", exact: true }).click();
    await expect(profile).toContainText("Production return assumptions applied");
    await expect(page.getByLabel("Return rate without focus (%)", { exact: true })).toHaveValue(
      String((100 * 58) / 158),
    );
    await mkdir(".qa/product-next/production", { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        window.scrollTo(0, 0);
      });
      await page.screenshot({
        path: `.qa/product-next/production/profile-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    if (!(await page.getByLabel("Scenario title", { exact: true }).isVisible()))
      await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await page.getByLabel("Scenario title", { exact: true }).fill("Refining profile fixture");
    await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
    await expect(page.getByText("Scenario saved to your account.", { exact: true })).toBeVisible();
    const saved = await db.savedScenario.findFirstOrThrow({ where: { authorId: id } });
    expect(
      (saved.configuration as { mechanicsProfile: { city: string; refiningLevels: number[] } })
        .mechanicsProfile,
    ).toMatchObject({ city: "Thetford", refiningLevels: [100, 100, 100, 100, 100] });
    await page.reload();
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: "Load saved scenarios", exact: true })
            .isVisible()) ||
          (await page
            .getByRole("button", { name: "Saved runs & sharing", exact: true })
            .isVisible()),
      )
      .toBe(true);
    if (
      !(await page.getByRole("button", { name: "Load saved scenarios", exact: true }).isVisible())
    )
      await page.getByRole("button", { name: "Saved runs & sharing", exact: true }).click();
    await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
    await page
      .getByRole("button", { name: "Restore Refining profile fixture", exact: true })
      .click();
    await page.getByText("Station settings, focus & sources", { exact: true }).click();
    await profile.locator("summary").first().click();
    await expect(page.getByLabel("Production city", { exact: true })).toHaveValue("Thetford");
    await expect(page.getByLabel("T8 specialization", { exact: true })).toHaveValue("100");
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
