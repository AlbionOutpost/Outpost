import { expect, test } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

for (const kind of ["crafting", "refining", "enchanting"] as const) {
  test(`${kind} manual accounting survives quantity validation, save and reload`, async ({
    page,
    context,
  }) => {
    const { iteration } = JSON.parse(
      await readFile("docs/design-review/calculators/current-iteration.json", "utf8"),
    );
    const folder = `.qa/calculator-correction/${iteration}`;
    await mkdir(folder, { recursive: true });
    const id = `atlas-test-${randomUUID()}`,
      token = randomUUID();
    await db.user.create({
      data: {
        id,
        name: "Calculator QA fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
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
    try {
      await page.goto(`/tools/${kind}?region=${kind === "enchanting" ? "asia" : "europe"}`);
      await page.getByText("Station settings, focus & sources", { exact: true }).click();
      await page.getByText("Markets & transaction fees", { exact: true }).click();
      if (kind === "enchanting")
        await page.getByLabel("Output quality assumption", { exact: true }).selectOption("2");
      const fields: [string, string][] =
        kind === "crafting"
          ? [
              ["Steel Bar unit price", "100"],
              ["Pine Planks unit price", "50"],
              ["Output unit sale price", "3000"],
              ["Station / upgrade fee per craft", "100"],
              ["Sales tax (%)", "10"],
            ]
          : kind === "refining"
            ? [
                ["Iron Ore unit price", "100"],
                ["Bronze Bar unit price", "25"],
                ["Output unit sale price", "500"],
                ["Crafts / upgrades", "10"],
                ["Station / upgrade fee per craft", "10"],
                ["Sales tax (%)", "8"],
                ["Sell order setup fee (%)", "2.5"],
              ]
            : [
                ["Battleaxe · T4.0 unit price", "2000"],
                ["T4 rune unit price", "3"],
                ["Output unit sale price", "4000"],
                ["Crafts / upgrades", "2"],
                ["Station / upgrade fee per craft", "50"],
                ["Sales tax (%)", "10"],
              ];
      for (const [label, value] of fields)
        await page.getByLabel(label, { exact: true }).fill(value);
      const expected = kind === "crafting" ? "600" : kind === "refining" ? "2,125" : "1,372";
      await expect(page.locator("output[data-result=total-profit]")).toHaveText(expected);
      const batches = kind === "crafting" ? "1" : kind === "refining" ? "10" : "2";
      await page.getByLabel("Crafts / upgrades", { exact: true }).fill("0");
      await expect(page.getByRole("alert").filter({ hasText: "Check quantities" })).toContainText(
        "Check quantities",
      );
      await page.getByLabel("Crafts / upgrades", { exact: true }).fill(batches);
      await expect(page.locator("output[data-result=total-profit]")).toHaveText(expected);
      const title = `QA ${kind} manual scenario`;
      await page.getByLabel("Scenario title", { exact: true }).fill(title);
      await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
      await expect(
        page.getByText("Scenario saved to your account.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
      await page.getByRole("button", { name: `Restore ${title}`, exact: true }).click();
      await expect(page.locator("output[data-result=total-profit]")).toHaveText(expected);
      await expect(page.getByLabel("Crafts / upgrades", { exact: true })).toHaveValue(batches);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          scrollTo(0, 0);
        });
        await page.evaluate(
          () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
        );
        if (width === 390) {
          await page.getByRole("button", { name: "3 Review profit", exact: true }).click();
          await expect(page.locator("#production-results")).toContainText(expected);
          await expect(page.locator("#production-results")).toBeInViewport();
          await page.evaluate(() => {
            (document.activeElement as HTMLElement)?.blur();
            scrollTo(0, 0);
          });
        }
        await page.screenshot({ path: `${folder}/${kind}-${width}.png`, fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      if (kind === "crafting") {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByText("Station settings, focus & sources", { exact: true }).click();
        await page.getByText("Returns & focus", { exact: true }).click();
        await page.getByLabel("Return rate without focus (%)", { exact: true }).fill("20");
        await page.getByLabel("Apply returns to Steel Bar", { exact: true }).check();
        await page.getByLabel("Apply returns to Pine Planks", { exact: true }).check();
        await expect(page.locator("output[data-result=total-profit]")).toHaveText("1,000");
        await page
          .getByLabel("Scenario title", { exact: true })
          .fill("QA retained resource returns");
        await page.getByRole("button", { name: "Save new scenario", exact: true }).click();
        await expect(
          page.getByText("Scenario saved to your account.", { exact: true }),
        ).toBeVisible();
        await page.reload();
        await page.getByRole("button", { name: "Load saved scenarios", exact: true }).click();
        await page
          .getByRole("button", { name: "Restore QA retained resource returns", exact: true })
          .click();
        await expect(page.getByLabel("Apply returns to Steel Bar", { exact: true })).toBeChecked();
        await expect(page.getByLabel("Return rate without focus (%)", { exact: true })).toHaveValue(
          "20",
        );
        await expect(page.locator("output[data-result=total-profit]")).toHaveText("1,000");
      }
      expect(await db.savedScenario.count({ where: { authorId: id, kind } })).toBe(
        kind === "crafting" ? 2 : 1,
      );
    } finally {
      await db.user.deleteMany({ where: { id } });
    }
  });
}
test.afterAll(() => db.$disconnect());
