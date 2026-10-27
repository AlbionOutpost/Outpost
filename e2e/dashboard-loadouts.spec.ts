import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

const db = createTestDb();
test("dashboard equipment previews remain private across warmed user sessions", async ({
  page,
  context,
  browser,
}) => {
  const ids = [0, 1].map(() => `atlas-test-${randomUUID()}`);
  const tokens = ids.map(() => randomUUID());
  const outsider = await browser.newContext();
  try {
    for (let i = 0; i < ids.length; i++) {
      await db.user.create({
        data: {
          id: ids[i],
          name: `Dashboard reviewer ${i}`,
          sessions: {
            create: { sessionToken: tokens[i], expires: new Date(Date.now() + 600000) },
          },
        },
      });
      await [context, outsider][i].addCookies([
        {
          name: "next-auth.session-token",
          value: tokens[i],
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    }
    const build = await db.build.create({
      data: {
        authorId: ids[0],
        title: `Private dashboard loadout ${randomUUID()}`,
        description: "Isolated ownership fixture",
        contentType: "Other",
        region: "europe",
        visibility: "PRIVATE",
        strategy: "",
        patchNotes: "",
        equipment: {
          create: {
            slot: "Main hand",
            itemId: "T4_MAIN_AXE",
            quality: 1,
            abilities: "",
            alternatives: "",
          },
        },
      },
    });
    await page.goto("/dashboard");
    const preview = page.locator(".player-loadout-link").filter({ hasText: build.title });
    await expect(preview).toBeVisible();
    await expect(preview.locator("[data-albion-icon]")).toHaveAttribute("src", /T4_MAIN_AXE/);
    const otherPage = await outsider.newPage();
    await otherPage.goto("http://localhost:3000/dashboard");
    await expect(
      otherPage.getByRole("heading", { name: "Welcome, Dashboard reviewer 1." }),
    ).toBeVisible();
    await expect(otherPage.getByText(build.title, { exact: true })).toHaveCount(0);
    await expect(otherPage.locator(".player-loadout-link")).toHaveCount(0);
    expect(
      (await outsider.request.get(`http://localhost:3000/api/builds/${build.id}`)).status(),
    ).toBe(404);
    await page.reload();
    await expect(preview).toBeVisible();
  } finally {
    await outsider.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
