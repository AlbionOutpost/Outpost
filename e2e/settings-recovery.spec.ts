import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
import { fixtureFault } from "./support/fixture-fault";
const db = createTestDb();
test("settings database outage preserves the draft and succeeds on retry without a public fault endpoint", async ({
  page,
  context,
}) => {
  const tag = randomUUID().replaceAll("-", ""),
    id = `atlas-test-${tag}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Before outage",
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
    await page.goto("/settings");
    await page.getByLabel("Display name", { exact: true }).fill("Draft survives outage");
    await fixtureFault(db, id, "update");
    await page.getByRole("button", { name: "Save preferences", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Your draft is retained");
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
      "Draft survives outage",
    );
    expect((await db.user.findUniqueOrThrow({ where: { id } })).name).toBe("Before outage");
    await fixtureFault(db, id, null);
    await page.getByRole("button", { name: "Save preferences", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Preferences saved");
    expect((await db.user.findUniqueOrThrow({ where: { id } })).name).toBe("Draft survives outage");
    await fixtureFault(db, id, "delete");
    const confirmation = page.getByLabel("Type DELETE to permanently delete your account", {
      exact: true,
    });
    await confirmation.fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Account deletion could not be completed",
    );
    await expect(confirmation).toHaveValue("DELETE");
    expect(await db.user.count({ where: { id } })).toBe(1);
    await fixtureFault(db, id, null);
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(page).toHaveURL(/signin/);
    expect(await db.user.count({ where: { id } })).toBe(0);
  } finally {
    await fixtureFault(db, id, null);
    await db.user.deleteMany({ where: { id } });
  }
});
