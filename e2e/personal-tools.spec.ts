import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("timers persist through refresh, pause/resume safely, populate dashboard and respect ownership", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Personal planner",
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
    await page.goto("/timers");
    await page.getByLabel("Timer title", { exact: true }).fill("Manual crop reminder");
    await page.getByLabel("Manual duration (minutes)", { exact: true }).fill("60");
    await page.getByRole("button", { name: "Create timer", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Manual crop reminder", exact: true }),
    ).toBeVisible();
    let timer = await db.timer.findFirstOrThrow({ where: { userId: id } });
    const due = timer.dueAt!.getTime();
    await expect(
      db.timer.create({
        data: {
          userId: id,
          title: "Invalid paused fixture",
          category: "CUSTOM",
          durationMs: 60000,
          status: "PAUSED",
          remainingMs: null,
          dueAt: null,
        },
      }),
    ).rejects.toThrow();
    await page.reload();
    expect((await db.timer.findUniqueOrThrow({ where: { id: timer.id } })).dueAt?.getTime()).toBe(
      due,
    );
    await page.getByRole("button", { name: "Pause timer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Resume timer", exact: true })).toBeVisible();
    timer = await db.timer.findUniqueOrThrow({ where: { id: timer.id } });
    expect(timer.status).toBe("PAUSED");
    expect(timer.remainingMs).toBeGreaterThan(3500000);
    const stale = await context.request.patch(`/api/timers/${timer.id}`, {
      headers: { origin: "http://localhost:3000" },
      data: { action: "resume", version: 1 },
    });
    expect(stale.status()).toBe(409);
    const outsider = await browser.newContext();
    const outsiderId = `atlas-test-${randomUUID()}`,
      outsiderToken = randomUUID();
    await db.user.create({
      data: {
        id: outsiderId,
        sessions: {
          create: { sessionToken: outsiderToken, expires: new Date(Date.now() + 600000) },
        },
      },
    });
    await outsider.addCookies([
      {
        name: "next-auth.session-token",
        value: outsiderToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    try {
      expect(
        (
          await outsider.request.delete(`/api/timers/${timer.id}`, {
            headers: { origin: "http://localhost:3000" },
          })
        ).status(),
      ).toBe(404);
    } finally {
      await outsider.close();
      await db.user.delete({ where: { id: outsiderId } });
    }
    await page.getByRole("button", { name: "Resume timer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pause timer", exact: true })).toBeVisible();
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Welcome, Personal planner.", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Manual crop reminder · RUNNING", { exact: true })).toBeVisible();
    await expect(page.locator(".search-trigger")).toBeEnabled();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Global search", exact: true })).toBeVisible();
    await page
      .getByLabel("Search items, builds, comps, guides, Teams and tools", { exact: true })
      .fill("transport");
    await expect(page.getByRole("link", { name: "Tools Transport planner" })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/tools\/transporting/);
    await page.goto("/timers");
    for (const route of ["timers", "dashboard"]) {
      await page.goto(`/${route}`);
      if (route === "timers")
        await expect(page.getByText("Updating countdown…", { exact: true })).toHaveCount(0);
      for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if ([375, 768, 1440, 1920].includes(width))
          await page.screenshot({ path: `.qa/screenshots/${route}-${width}.png`, fullPage: true });
      }
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
    await page.goto("/timers");
    await page.getByText("More timer actions", { exact: true }).click();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete timer", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Manual crop reminder", exact: true }),
    ).toHaveCount(0);
    expect(await db.timer.count({ where: { userId: id } })).toBe(0);
  } finally {
    await db.user.delete({ where: { id } });
  }
});

test("global search excludes private and hidden records and revokes group results immediately", async ({
  request,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    q = `Search${randomUUID().replaceAll("-", "")}`;
  await db.user.create({
    data: {
      id,
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const group = await db.group.create({
    data: {
      name: `${q} guild`,
      slug: q.toLowerCase(),
      description: "",
      region: "europe",
      ownerId: id,
      visibility: "PRIVATE",
      members: { create: { userId: id, role: "OWNER" } },
    },
  });
  try {
    const base = {
      authorId: id,
      description: "",
      region: "europe",
      contentType: "PVE",
      strategy: "",
      patchNotes: "",
    };
    await db.build.createMany({
      data: [
        { ...base, title: `${q} public`, visibility: "PUBLIC" },
        { ...base, title: `${q} private`, visibility: "PRIVATE" },
        { ...base, title: `${q} hidden`, visibility: "PUBLIC", hiddenAt: new Date() },
      ],
    });
    await db.composition.create({
      data: {
        authorId: id,
        groupId: group.id,
        title: `${q} group plan`,
        description: "",
        region: "europe",
        contentType: "PVE",
        visibility: "GROUP",
        slots: [],
        notes: "",
      },
    });
    const titles = async (client: typeof request) => {
      const response = await client.get(`/api/search?q=${q}`);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      return (await response.json()).results.map((r: { title: string }) => r.title);
    };
    expect(await titles(request)).toEqual([`${q} public`]);
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
    expect(await titles(context.request)).toEqual(
      expect.arrayContaining([`${q} public`, `${q} private`, `${q} group plan`, `${q} guild`]),
    );
    expect(await titles(context.request)).not.toContain(`${q} hidden`);
    await db.groupMember.delete({ where: { groupId_userId: { groupId: group.id, userId: id } } });
    const revoked = await titles(context.request);
    expect(revoked).not.toContain(`${q} group plan`);
    expect(revoked).not.toContain(`${q} guild`);
  } finally {
    await db.group.delete({ where: { id: group.id } });
    await db.user.delete({ where: { id } });
  }
});
