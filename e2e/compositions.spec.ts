import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("20-player comp saves, reloads, edits, shares, duplicates and enforces group permissions", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(90000);
  const ids = Array.from({ length: 4 }, () => `atlas-test-${randomUUID()}`);
  const tokens = ids.map(() => randomUUID());
  const clients = [
    context,
    await browser.newContext({ baseURL: "http://localhost:3000" }),
    await browser.newContext({ baseURL: "http://localhost:3000" }),
    await browser.newContext({ baseURL: "http://localhost:3000" }),
  ];
  let groupId = "";
  try {
    for (let i = 0; i < ids.length; i++) {
      await db.user.create({
        data: {
          id: ids[i],
          name: `Composition tester ${i}`,
          sessions: { create: { sessionToken: tokens[i], expires: new Date(Date.now() + 600000) } },
        },
      });
      await clients[i].addCookies([
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
    const group = await context.request.post("/api/groups", {
      headers: { origin: "http://localhost:3000" },
      data: {
        name: "Comp test guild",
        slug: `qa-${randomUUID().slice(0, 8)}`,
        description: "",
        region: "europe",
        visibility: "PRIVATE",
      },
    });
    expect(group.status()).toBe(201);
    groupId = (await group.json()).id;
    await db.groupMember.createMany({
      data: [
        { groupId, userId: ids[1], role: "OFFICER" },
        { groupId, userId: ids[2], role: "MEMBER" },
      ],
    });
    await page.goto("/compositions/new");
    await page.getByLabel("Comp title").fill("Twenty player ZvZ roster");
    await page.getByRole("button", { name: "20 players", exact: true }).click();
    await expect(page.getByRole("listitem")).toHaveCount(20);
    await page.getByRole("button", { name: /^Configure member 1\b/ }).click();
    await page.getByLabel("Player name", { exact: true }).fill("Caller One");
    await page.getByLabel("Member role").selectOption("Caller");
    await page.getByLabel("Main hand equipment").selectOption("MAIN_AXE");
    await page.getByLabel("Main hand tier").selectOption("6");
    await page.getByLabel("Main hand enchantment").selectOption("1");
    await page.getByLabel("Main hand E", { exact: true }).selectOption("Blood Bandit");
    await page.getByLabel("Main hand Q", { exact: true }).selectOption("Rending Strike");
    await page.getByRole("button", { name: /^Select Helmet slot\b/ }).click();
    await page.getByLabel("Helmet equipment").selectOption("HEAD_CLOTH_SET1");
    await page.getByLabel("Helmet Active").selectOption("Energy Shield");
    await page.getByLabel("Member notes").fill("First engage caller");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await page
      .getByRole("button", { name: "Drag member 1", exact: true })
      .dragTo(page.getByRole("listitem").nth(1));
    await expect(page.getByRole("listitem").nth(1)).toContainText("Caller One");
    await page.getByRole("button", { name: /^Configure member 20\b/ }).click();
    await page.getByLabel("Player name", { exact: true }).fill("Scout Twenty");
    await page.getByLabel("Member role").selectOption("Scout");
    await page.getByRole("button", { name: "Done editing member", exact: true }).click();
    await page.getByText("Shotcaller notes", { exact: true }).click();
    await page.getByLabel("Shotcaller / comp notes").fill("Wait for the caller before engaging.");
    await page.getByRole("button", { name: "Save comp", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Twenty player ZvZ roster" })).toBeVisible();
    const id = page.url().split("/").pop()!;
    let stored = await (await context.request.get(`/api/compositions/${id}`)).json();
    expect(stored.slots).toHaveLength(20);
    expect(stored.slots[1].playerName).toBe("Caller One");
    expect(stored.slots[1].equipment[0].abilities.E).toBe("Blood Bandit");
    await page.reload();
    await expect(page.locator(".composition-card")).toHaveCount(20);
    expect((await clients[3].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    await page.getByRole("link", { name: "Edit comp", exact: true }).click();
    await page.getByText("Sharing, region & description", { exact: true }).click();
    await page.getByLabel("Comp visibility").selectOption("GROUP");
    await page.getByLabel("Shared group").selectOption(groupId);
    await page.getByRole("button", { name: "Save comp revision" }).click();
    await expect(page.getByRole("heading", { name: "Twenty player ZvZ roster" })).toBeVisible();
    stored = await (await context.request.get(`/api/compositions/${id}`)).json();
    expect((await clients[2].request.get(`/api/compositions/${id}`)).status()).toBe(200);
    expect((await clients[3].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    const data = {
      title: stored.title,
      description: stored.description,
      region: stored.region,
      contentType: stored.contentType,
      visibility: stored.visibility,
      groupId: stored.groupId,
      notes: "Officer updated notes",
      slots: stored.slots,
    };
    expect(
      (
        await clients[2].request.put(`/api/compositions/${id}`, {
          headers: { origin: "http://localhost:3000" },
          data: { version: stored.version, composition: data },
        })
      ).status(),
    ).toBe(403);
    const edited = await clients[1].request.put(`/api/compositions/${id}`, {
      headers: { origin: "http://localhost:3000" },
      data: { version: stored.version, composition: data },
    });
    expect(edited.status()).toBe(200);
    expect(
      (
        await context.request.put(`/api/compositions/${id}`, {
          headers: { origin: "http://localhost:3000" },
          data: { version: stored.version, composition: data },
        })
      ).status(),
    ).toBe(409);
    await page.reload();
    await expect(page.getByText("Officer updated notes", { exact: true })).toBeVisible();
    await page.getByText("More actions", { exact: true }).click();
    await page.getByRole("button", { name: "Duplicate comp", exact: true }).click();
    await expect(page.getByLabel("Comp title")).toHaveValue("Twenty player ZvZ roster (copy)");
    await expect(page.getByLabel("Comp visibility")).toHaveValue("PRIVATE");
    const copyId = page.url().split("/").at(-2)!;
    expect(copyId).not.toBe(id);
    const copy = await db.composition.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.authorId).toBe(ids[0]);
    await page.getByLabel("Comp title").fill("Independent public copy");
    await page.getByText("Sharing, region & description", { exact: true }).click();
    await page.getByLabel("Comp visibility").selectOption("PUBLIC");
    await page.getByRole("button", { name: "Save comp revision" }).click();
    await expect(page.getByRole("heading", { name: "Independent public copy" })).toBeVisible();
    expect((await clients[3].request.get(`/api/compositions/${copyId}`)).status()).toBe(200);
    expect((await db.composition.findUniqueOrThrow({ where: { id } })).title).toBe(
      "Twenty player ZvZ roster",
    );
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: ids[1] } } });
    expect((await clients[1].request.get(`/api/compositions/${id}`)).status()).toBe(404);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByText("More actions", { exact: true }).click();
    const menu = await page.locator(".comp-more-actions-panel").boundingBox();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(320);
    await mkdir(".qa/player-polish", { recursive: true });
    await page.screenshot({ path: ".qa/player-polish/comp-menu-320.png", fullPage: false });
    await page.keyboard.press("Escape");
    await expect(page.getByText("More actions", { exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Export comp", exact: true })).toBeHidden();
    const download = page.waitForEvent("download");
    await page.getByText("More actions", { exact: true }).click();
    await page.getByRole("button", { name: "Export comp", exact: true }).click();
    const exportPath = await (await download).path();
    expect(exportPath).not.toBeNull();
    await page.goto("/compositions/new");
    await page.getByLabel("Import comp file").setInputFiles(exportPath!);
    await expect(page.getByLabel("Comp title")).toHaveValue("Independent public copy");
    await expect(page.getByRole("listitem")).toHaveCount(20);
    await expect(page.getByLabel("Comp visibility")).toHaveValue("PRIVATE");
    await page.setViewportSize({ width: 375, height: 844 });
    await mkdir(".qa/screenshots", { recursive: true });
    await page.screenshot({ path: ".qa/screenshots/composition-editor-375.png", fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(
      (
        await clients[3].request.delete(`/api/compositions/${copyId}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.delete(`/api/compositions/${copyId}`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(204);
    expect(await db.compositionVersion.count({ where: { compositionId: copyId } })).toBe(0);
  } finally {
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    for (const client of clients.slice(1)) await client.close();
    await db.user.deleteMany({ where: { id: { in: ids } } });
  }
});
test.afterAll(() => db.$disconnect());
