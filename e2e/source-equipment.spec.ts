import { selectEditorSlot } from "./support/build-editor";
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
    await selectEditorSlot(page, "Main hand", "Alternatives");
    await page.getByRole("button", { name: "Use Battleaxe starting set", exact: true }).click();
    await expect(page.locator(".inventory-equipment-slot.is-equipped")).toHaveCount(10);
    await selectEditorSlot(page, "Main hand");
    await page.getByText("Exact equipment selection", { exact: true }).click();
    await page.getByLabel("Main hand equipment", { exact: true }).selectOption("2H_BOW");
    await expect(page.locator(".studio-notice")).toContainText("Off hand cleared");
    await expect(page.locator(".inventory-equipment-slot.is-equipped")).toHaveCount(9);
    await page.getByRole("button", { name: "Undo equipment change", exact: true }).click();
    await expect(page.getByLabel("Main hand equipment", { exact: true })).toHaveValue("MAIN_AXE");
    await expect(page.locator(".inventory-equipment-slot.is-equipped")).toHaveCount(10);
    await page.getByLabel("Main hand equipment", { exact: true }).selectOption("2H_BOW");
    await page.getByLabel("Main hand Q", { exact: true }).selectOption("Multishot");
    await expect(page.getByLabel("Main hand Q", { exact: true })).toHaveValue("Multishot");
    await selectEditorSlot(page, "Main hand");
    await page.getByRole("button", { name: "Choose Main hand equipment", exact: false }).click();
    await page.getByRole("button", { name: "Next items", exact: true }).click();
    await expect(page.locator(".studio-picker-pagination")).toContainText("25–48");
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
