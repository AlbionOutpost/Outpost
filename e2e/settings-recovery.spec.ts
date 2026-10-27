import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("settings database outage preserves the draft and succeeds on retry without a public fault endpoint", async ({
  page,
  context,
}) => {
  const tag = randomUUID().replaceAll("-", ""),
    id = `atlas-test-${tag}`,
    token = randomUUID(),
    functionName = `atlas_qa_settings_${tag}`,
    triggerName = `atlas_qa_settings_trigger_${tag}`;
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
    // Generated identifiers and fixture-only ID; never derived from external input. Trigger affects only this test user.
    await db.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id = '${id}' THEN RAISE EXCEPTION 'QA fixture service failure'; END IF; IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}" BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );
    await page.getByRole("button", { name: "Save preferences", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Your draft is retained");
    await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
      "Draft survives outage",
    );
    expect((await db.user.findUniqueOrThrow({ where: { id } })).name).toBe("Before outage");
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "User"`);
    await page.getByRole("button", { name: "Save preferences", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Preferences saved");
    expect((await db.user.findUniqueOrThrow({ where: { id } })).name).toBe("Draft survives outage");
    await db.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}" BEFORE DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );
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
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "User"`);
    await page.getByRole("button", { name: "Permanently delete account", exact: true }).click();
    await expect(page).toHaveURL(/signin/);
    expect(await db.user.count({ where: { id } })).toBe(0);
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "User"`);
    await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    await db.user.deleteMany({ where: { id } });
  }
});
