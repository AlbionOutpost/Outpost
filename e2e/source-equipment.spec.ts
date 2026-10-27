import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("source catalog supports staff and bow sets with safe two-hand changes and undo", async ({
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
    await page.goto("/builds/new");
    await page
      .getByRole("region", { name: "Equipment sets and templates" })
      .locator("summary")
      .click();
    await page.getByRole("button", { name: "Apply template", exact: true }).click();
    await expect(page.locator(".character-slot.equipped")).toHaveCount(10);
    await page.getByLabel("Main hand equipment", { exact: true }).selectOption("2H_BOW");
    await expect(page.locator(".gear-change-notice")).toContainText("Off hand cleared");
    await expect(page.locator(".character-slot.equipped")).toHaveCount(9);
    await page.getByRole("button", { name: "Undo equipment change", exact: true }).click();
    await expect(page.getByLabel("Main hand equipment", { exact: true })).toHaveValue("MAIN_AXE");
    await expect(page.locator(".character-slot.equipped")).toHaveCount(10);
    await page.getByLabel("Main hand equipment", { exact: true }).selectOption("2H_BOW");
    await page.getByLabel("Main hand Q", { exact: true }).selectOption("Multishot");
    await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("Multishot");
    await page.getByRole("button", { name: "Next items", exact: true }).click();
    await expect(page.locator(".gear-browser-paging")).toContainText("13–24");
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
