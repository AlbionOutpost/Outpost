import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("private comp preserves immediate history edits, stale revisions and export without browser storage", async ({
  page,
  context,
}) => {
  const owner = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  try {
    await db.user.create({
      data: {
        id: owner,
        name: "Private comp recovery fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
    const comp = await db.composition.create({
      data: {
        authorId: owner,
        title: "Saved original party",
        description: "",
        contentType: "Group PvE",
        region: "europe",
        visibility: "PRIVATE",
        notes: "",
        slots: [
          {
            id: randomUUID(),
            playerName: "",
            role: "Tank",
            customRole: "",
            mandatory: true,
            substitute: "",
            notes: "",
            sourceBuildId: null,
            equipment: [],
            equipmentSets: [],
          },
        ],
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
    await page.goto(`/compositions/${comp.id}`);
    await page.getByRole("link", { name: "Edit comp", exact: true }).click();
    await page.getByLabel("Comp title", { exact: true }).fill("Unfinished recovered party");
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === `/compositions/${comp.id}`);
    await page.goForward();
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      "Unfinished recovered party",
    );
    await expect(
      page.getByText("Your unsaved comp was restored after navigation.", { exact: false }),
    ).toBeVisible();
    await page.goBack();
    await db.composition.update({
      where: { id: comp.id },
      data: { version: 2, title: "Newer saved party" },
    });
    await page.goForward();
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      "Unfinished recovered party",
    );
    // A fresh authorized server navigation supplies version2 while preserving the tab-local version1 draft.
    await page.getByRole("link", { name: "Back to comps", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/compositions");
    await page.getByRole("link", { name: /Newer saved party/ }).click();
    await page.getByRole("link", { name: "Edit comp", exact: true }).click();
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue(
      "Unfinished recovered party",
    );
    await expect(page.getByText("A newer revision exists;", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Save comp revision", exact: true }).click();
    await expect(page.locator(".party-editor [role=alert]")).toContainText(
      /conflict|changed|revision/i,
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON", exact: true }).click();
    expect((await download).suggestedFilename()).toMatch(/composition.*\.json/);
    expect(
      await page.evaluate(() =>
        [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
          String(value).includes("Unfinished recovered party"),
        ),
      ),
    ).toBe(false);
    expect(
      await db.composition.findUnique({
        where: { id: comp.id },
        select: { title: true, version: true },
      }),
    ).toMatchObject({ title: "Newer saved party", version: 2 });
    await page.locator(".account-dropdown > summary").click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    expect(await db.session.count({ where: { userId: owner } })).toBe(1);
    let resolveUnload!: () => void;
    const unloadDismissed = new Promise<void>((resolve) => {
      resolveUnload = resolve;
    });
    const logoutDialog = async (dialog: import("@playwright/test").Dialog) => {
      if (dialog.type() === "confirm") await dialog.accept();
      else {
        await dialog.dismiss();
        resolveUnload();
      }
    };
    page.on("dialog", logoutDialog);
    const signout = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/signout") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    expect((await signout).ok()).toBe(true);
    await expect.poll(() => db.session.count({ where: { userId: owner } })).toBe(0);
    await unloadDismissed;
    page.off("dialog", logoutDialog);
    const secondToken = randomUUID();
    await db.session.create({
      data: { userId: owner, sessionToken: secondToken, expires: new Date(Date.now() + 600000) },
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
    await page.getByRole("link", { name: "Back to comps", exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/compositions");
    await page.getByRole("link", { name: /Newer saved party/ }).click();
    await page.getByRole("link", { name: "Edit comp", exact: true }).click();
    await expect(page.getByLabel("Comp title", { exact: true })).toHaveValue("Newer saved party");
    await expect(page.locator(".party-editor")).not.toContainText("Your unsaved comp was restored");
  } finally {
    await db.user.deleteMany({ where: { id: owner } });
  }
});
test.afterAll(() => db.$disconnect());
