import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("tool shortcuts stay device-local, bounded and region-aware through reload", async ({
  page,
}) => {
  await page.goto("/tools?region=asia");
  const pin = page.getByRole("button", { name: "Pin Crafting on this device", exact: true });
  await pin.click();
  await expect(
    page.getByRole("button", { name: "Unpin Crafting on this device", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const shortcuts = page.getByRole("region", {
    name: "Tool shortcuts on this device",
    exact: true,
  });
  await expect(shortcuts).toContainText("Pinned on this device");
  await expect(shortcuts.getByRole("link", { name: "Crafting", exact: true })).toHaveAttribute(
    "href",
    "/tools/crafting?region=asia",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Unpin Crafting on this device", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Find a tool", { exact: true }).fill("transport");
  await expect(page.locator(".directory-entry")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear tool search", exact: true }).click();
  await page.getByRole("button", { name: "Unpin Crafting on this device", exact: true }).click();
  await expect(shortcuts).toHaveCount(0);
  await expect(page.locator(".tool-pin-help")).toContainText(
    "Pin up to six shortcuts on this device",
  );
});

test("team membership scope, event deep links and roster filtering preserve private boundaries", async ({
  page,
  context,
  browser,
}) => {
  const id = `atlas-test-support-${randomUUID()}`,
    other = `atlas-test-support-${randomUUID()}`,
    token = randomUUID(),
    tag = `SupportQA${randomUUID().slice(0, 8)}`;
  const groupIds: string[] = [];
  await db.user.create({
    data: {
      id,
      name: "Support owner",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await db.user.create({ data: { id: other, name: "Other owner" } });
  try {
    const owned = await db.group.create({
      data: {
        name: `${tag} private team`,
        slug: `support-${randomUUID()}`,
        region: "europe",
        visibility: "PRIVATE",
        description: "Isolated supporting UI fixture",
        ownerId: id,
        members: { create: { userId: id, role: "OWNER" } },
      },
    });
    groupIds.push(owned.id);
    const foreign = await db.group.create({
      data: {
        name: `${tag} other public team`,
        slug: `support-${randomUUID()}`,
        region: "europe",
        visibility: "PUBLIC",
        description: "Isolated supporting UI fixture",
        ownerId: other,
        members: { create: { userId: other, role: "OWNER" } },
      },
    });
    groupIds.push(foreign.id);
    await db.groupEvent.create({
      data: {
        groupId: owned.id,
        title: "Next team run",
        description: "Isolated browser fixture, not real activity.",
        startsAt: new Date(Date.now() + 86400000),
        timezone: "UTC",
        expectedParticipants: 5,
        voiceInfo: "",
        authorId: id,
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
    await page.goto(`/groups?mine=1&q=${tag}`);
    await expect(page.locator(".guild-discovery-card")).toHaveCount(1);
    await expect(page.locator(".guild-discovery-card")).toContainText(owned.name);
    await expect(page.locator("main")).not.toContainText(foreign.name);
    await page.goto(`/groups/${owned.slug}#team-events`);
    await expect(page.getByRole("tab", { name: "Events", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Next team run", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("tab", { name: "Events", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.getByRole("tab", { name: "Members", exact: true }).click();
    await expect(page).toHaveURL(/#team-members$/);
    await page.getByLabel("Find a member", { exact: true }).fill("No matching member");
    await expect(page.locator("main")).toContainText("No loaded members match that search.");
    const outsider = await browser.newContext();
    try {
      const denied = await outsider.request.get(
        new URL(`/api/groups/${owned.id}`, page.url()).href,
      );
      expect(denied.status()).toBe(404);
      const html = await outsider.request.get(new URL(`/groups/${owned.slug}`, page.url()).href);
      expect(await html.text()).not.toContain(owned.name);
    } finally {
      await outsider.close();
    }
  } finally {
    await db.group.deleteMany({ where: { id: { in: groupIds } } });
    await db.user.deleteMany({ where: { id: { in: [id, other] } } });
  }
});

test("existing timers lead the workspace and a new timer returns focus to its saved row", async ({
  page,
  context,
}) => {
  const id = `atlas-test-support-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Timer owner",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  try {
    await db.timer.create({
      data: {
        userId: id,
        title: "Paused field reminder",
        category: "CUSTOM",
        status: "PAUSED",
        durationMs: 600000,
        remainingMs: 300000,
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/timers");
    await expect(
      page.getByRole("heading", { name: "Paused field reminder", exact: true }),
    ).toBeInViewport();
    await expect(page.getByLabel("Timer title", { exact: true })).not.toBeVisible();
    await page.getByRole("button", { name: "Add timer", exact: true }).click();
    await expect(page.getByLabel("Timer title", { exact: true })).toBeFocused();
    await page.getByLabel("Timer title", { exact: true }).fill("New support reminder");
    await page.getByLabel("Manual duration (minutes)", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Create timer", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "New support reminder", exact: true }),
    ).toBeFocused();
    await expect(page.getByLabel("Timer title", { exact: true })).not.toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "New support reminder", exact: true }),
    ).toBeVisible();
    expect(await db.timer.count({ where: { userId: id } })).toBe(2);
  } finally {
    await db.user.deleteMany({ where: { id } });
  }
});
