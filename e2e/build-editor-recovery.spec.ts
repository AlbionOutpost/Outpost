import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createTestDb } from "./support/db";
import { buildInput } from "../src/lib/builds/validation";
const db = createTestDb();

test("editor keeps a failed draft for retry and exports a stale revision without overwriting newer changes", async ({
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
    let failNextSave = true;
    await page.route("**/api/builds", async (route) => {
      if (route.request().method() === "POST" && failNextSave) {
        failNextSave = false;
        await route.fulfill({ status: 503, json: { error: "Saving is temporarily unavailable." } });
      } else await route.continue();
    });
    await page.goto("/builds/new");
    await page.getByLabel("Build title", { exact: true }).fill("Recovered build fixture");
    await page.getByRole("tab", { name: "Notes", exact: true }).click();
    await page.getByText("Advanced item IDs & notes", { exact: true }).click();
    await page.getByLabel("Item ID 1", { exact: true }).fill("T4_MAIN_AXE");
    await page.getByRole("button", { name: "Add equipment slot", exact: true }).click();
    await page.getByLabel("Item ID 2", { exact: true }).fill("T4_OFF_SHIELD");
    await page.getByLabel("Equipment slot 2", { exact: true }).selectOption("Main hand");
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
      "Each equipment slot can only be used once",
    );
    await expect(page.locator(".focused-build-editor").getByRole("alert")).not.toContainText(
      '"path"',
    );
    await expect(page.getByLabel("Item ID 2", { exact: true })).toHaveValue("T4_OFF_SHIELD");
    await page.getByLabel("Equipment slot 2", { exact: true }).selectOption("Off hand");
    await page.getByRole("button", { name: "Remove Off hand", exact: true }).click();
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
      "Saving is temporarily unavailable.",
    );
    await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
      "Your draft has been kept",
    );
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Recovered build fixture",
    );
    await expect(page.getByLabel("Item ID 1", { exact: true })).toHaveValue("T4_MAIN_AXE");
    expect(await db.build.count({ where: { authorId: id } })).toBe(0);
    await page.getByRole("button", { name: "Save build", exact: true }).click();
    await expect(page).toHaveURL(/\/builds\/(?!new$)[^/]+$/);
    const buildId = new URL(page.url()).pathname.split("/").pop()!;
    const saved = await db.build.findUniqueOrThrow({
      where: { id: buildId },
      include: { equipment: true },
    });
    expect(saved.title).toBe("Recovered build fixture");
    expect(saved.equipment[0].itemId).toBe("T4_MAIN_AXE");

    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await page.getByLabel("Build title", { exact: true }).fill("Unsaved conflicting draft");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/builds/${buildId}$`));
    await page.goForward();
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Unsaved conflicting draft",
    );
    await expect(page.locator(".focused-build-editor")).toContainText(
      "Your unsaved draft was restored after navigation",
    );
    const newer = buildInput.parse({ ...saved, title: "Other tab saved revision" });
    const concurrent = await context.request.put(`/api/builds/${buildId}`, {
      headers: { origin: "http://localhost:3000" },
      data: { version: saved.version, build: newer },
    });
    expect(concurrent.status()).toBe(200);
    // A fresh Link navigation receives the newer server revision. Recovery must
    // keep the original version token, rather than overwrite revision 2.
    await page.goBack();
    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Unsaved conflicting draft",
    );
    await expect(page.locator(".focused-build-editor")).toContainText("A newer revision exists");
    await page.getByRole("button", { name: "Save new revision", exact: true }).click();
    await expect(page.locator(".focused-build-editor").getByRole("alert")).toContainText(
      "The build changed",
    );
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Unsaved conflicting draft",
    );
    const retained = await db.build.findUniqueOrThrow({ where: { id: buildId } });
    expect(retained.title).toBe("Other tab saved revision");
    expect(retained.version).toBe(2);
    expect(await db.buildVersion.count({ where: { buildId } })).toBe(2);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .locator(".editor-backline")
      .getByRole("link", { name: "Builds", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/builds/${buildId}/edit$`));
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Unsaved conflicting draft",
    );
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("link", { name: "Add saved build to comp", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/builds/${buildId}/edit$`));
    await page.getByText("Import & export", { exact: true }).click();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export build JSON", exact: true }).click();
    const file = await downloaded;
    expect(file.suggestedFilename()).toBe("outpost-build.json");
    const draft = JSON.parse(await readFile((await file.path())!, "utf8"));
    expect(draft.title).toBe("Unsaved conflicting draft");
    expect(draft.equipment[0].itemId).toBe("T4_MAIN_AXE");
    expect(await page.evaluate(() => localStorage.getItem("outpost-guest-build-v1"))).toBeNull();
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.startsWith("outpost-guest-build-v1")),
      ),
    ).toEqual([]);
    expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);

    // Keep this document alive by cancelling the hard redirect. Logout still
    // reaches the real endpoint and must wipe memory even before it reloads.
    await page.locator(".account-dropdown > summary").click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    expect(await db.session.count({ where: { userId: id } })).toBe(1);
    await page.evaluate(() => {
      (window as unknown as { __historyDocument?: boolean }).__historyDocument = true;
    });
    const logoutDialog = (dialog: import("@playwright/test").Dialog) => {
      if (dialog.type() === "confirm") void dialog.accept();
      else void dialog.dismiss();
    };
    page.on("dialog", logoutDialog);
    const signedOut = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/signout") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    expect((await signedOut).ok()).toBe(true);
    await expect.poll(() => db.session.count({ where: { userId: id } })).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { __historyDocument?: boolean }).__historyDocument,
        ),
      )
      .toBe(true);
    page.off("dialog", logoutDialog);
    // Re-authenticate the same fixture without reloading its document. No
    // private draft may survive logout even for the same account.
    const secondToken = randomUUID();
    await db.session.create({
      data: { userId: id, sessionToken: secondToken, expires: new Date(Date.now() + 600000) },
    });
    await context.addCookies([
      {
        name: "next-auth.session-token",
        value: secondToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goBack();
    await page.getByRole("link", { name: "Edit build", exact: true }).click();
    await expect(page.getByLabel("Build title", { exact: true })).toHaveValue(
      "Other tab saved revision",
    );
    await expect(page.locator(".focused-build-editor")).not.toContainText(
      "Your unsaved draft was restored",
    );
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
test.afterAll(() => db.$disconnect());
