import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";

const db = createTestDb(),
  origin = "http://localhost:3000",
  slug = "battleaxe-mist-build",
  title = "Battleaxe Mist Build";
const cookie = (value: string) => ({
  name: "next-auth.session-token",
  value,
  domain: "localhost",
  path: "/",
  httpOnly: true,
  sameSite: "Lax" as const,
});
async function account(...contexts: BrowserContext[]) {
  const id = `atlas-test-${randomUUID()}`,
    tokens = contexts.map(() => randomUUID());
  await db.user.create({
    data: {
      id,
      sessions: {
        create: tokens.map((sessionToken) => ({
          sessionToken,
          expires: new Date(Date.now() + 600000),
        })),
      },
    },
  });
  for (const [i, context] of contexts.entries()) await context.addCookies([cookie(tokens[i])]);
  return id;
}

test("a signed-in favorite and spec level follow the account to another browser", async ({
  browser,
}) => {
  test.setTimeout(90000);
  const first = await browser.newContext(),
    second = await browser.newContext();
  try {
    const userId = await account(first, second);
    const page = await first.newPage();
    await page.goto(`/builds/library/${slug}?region=europe`);
    await page
      .getByRole("button", { name: `Save to favorites: ${title}. Save this favorite`, exact: true })
      .click();
    await expect(page.locator(".device-save-feedback")).toHaveText("Saved to your account.");
    expect(await db.libraryFavorite.findMany({ where: { userId } })).toMatchObject([{ slug }]);
    // Nothing went to this browser's own list.
    expect(
      await page.evaluate(() => localStorage.getItem("outpost:build-bookmarks:v1:europe")),
    ).toBeNull();

    await page.goto("/tools/mastery?region=europe");
    await expect(page.getByText("Saved to your account", { exact: true })).toBeVisible();
    await page.getByLabel("Alchemist Mastery", { exact: true }).fill("37");
    await expect(page.getByText("Saved to your account", { exact: true })).toBeVisible();
    await expect
      .poll(() =>
        db.masteryLevel.findMany({ where: { userId }, select: { specId: true, level: true } }),
      )
      .toEqual([{ specId: "alchemy_mastery", level: 37 }]);

    const other = await second.newPage();
    await other.goto("/favorites?region=asia");
    const saved = other.getByRole("region", {
      name: "Library favorites on your account",
      exact: true,
    });
    await expect(saved).toContainText(title);
    await expect(saved).toContainText("1 of 100 saved to your account");
    await other.goto("/tools/mastery?region=europe");
    await expect(other.getByLabel("Alchemist Mastery", { exact: true })).toHaveValue("37");
    // Removing it in the second browser removes it from the account.
    await other.goto("/favorites?region=europe");
    await other
      .getByRole("button", { name: `Remove ${title} from your favourites · Saved`, exact: true })
      .click();
    await expect(
      other.getByRole("region", { name: "Library favorites on your account", exact: true }),
    ).toContainText("No library builds saved yet");
    await expect.poll(() => db.libraryFavorite.count({ where: { userId } })).toBe(0);
  } finally {
    await first.close();
    await second.close();
  }
});

test("signing in moves this browser's favorites and specs to the account once", async ({
  browser,
}) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    // As a guest: one library favorite and one spec level in this browser.
    await page.goto(`/builds/library/${slug}?region=europe`);
    await page
      .getByRole("button", { name: `Save on device: ${title}. Save this favorite`, exact: true })
      .click();
    await expect(page.locator(".device-save-feedback")).toHaveText("Saved on this device.");
    await page.evaluate(() =>
      localStorage.setItem("outpost:mastery-levels-v1", JSON.stringify({ heal_brewer: 12 })),
    );
    const userId = await account(context);
    await page.goto("/favorites?region=europe");
    await expect(
      page.getByRole("region", { name: "Library favorites on your account", exact: true }),
    ).toContainText(title);
    expect(await db.libraryFavorite.findMany({ where: { userId } })).toMatchObject([{ slug }]);
    expect(await db.masteryLevel.findMany({ where: { userId } })).toMatchObject([
      { specId: "heal_brewer", level: 12 },
    ]);
    // Removing it on the account is not undone by the copy still in this browser.
    let merges = 0;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/account/saves") && r.method() === "POST") merges++;
    });
    await page
      .getByRole("button", { name: `Remove ${title} from your favourites · Saved`, exact: true })
      .click();
    await expect.poll(() => db.libraryFavorite.count({ where: { userId } })).toBe(0);
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Library favorites on your account", exact: true }),
    ).toContainText("No library builds saved yet");
    expect(merges).toBe(1); // the removal only; no second merge
    expect(await db.libraryFavorite.count({ where: { userId } })).toBe(0);
  } finally {
    await context.close();
  }
});

test("guests keep favorites and specs in this browser without account requests", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/account/saves")) calls.push(r.url());
  });
  await page.goto(`/builds/library/${slug}?region=europe`);
  await page
    .getByRole("button", { name: `Save on device: ${title}. Save this favorite`, exact: true })
    .click();
  await expect(page.locator(".device-save-feedback")).toHaveText("Saved on this device.");
  await page.goto("/tools/mastery?region=europe");
  await expect(page.getByText("Saved in this browser", { exact: true })).toBeVisible();
  await page.getByLabel("Alchemist Mastery", { exact: true }).fill("5");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("outpost:mastery-levels-v1")))
    .toBe(JSON.stringify({ alchemy_mastery: 5 }));
  await page.goto("/favorites?region=europe");
  await expect(
    page.getByRole("region", { name: "Library favorites on this device", exact: true }),
  ).toContainText("1 of 100 saved in this browser");
  expect(calls).toEqual([]);
  expect((await page.request.get("/api/account/saves")).status()).toBe(401);
});

test("account saves deny other accounts, bad origins and forged fields", async ({ browser }) => {
  const owner = await browser.newContext(),
    outsider = await browser.newContext();
  try {
    const ownerId = await account(owner),
      outsiderId = await account(outsider);
    const post = (context: BrowserContext, data: unknown, from = origin) =>
      context.request.post("/api/account/saves", { headers: { Origin: from }, data });
    expect((await post(owner, { action: "favorite", slug, active: true })).status()).toBe(200);
    expect((await post(owner, { action: "levels", levels: { axe_crafter: 70 } })).status()).toBe(
      200,
    );
    // The outsider reads only their own (empty) saves, and their removals touch only theirs.
    const read = await outsider.request.get("/api/account/saves");
    expect(read.headers()["cache-control"]).toBe("private, no-store");
    expect(await read.json()).toMatchObject({ favorites: [], levels: {} });
    expect((await post(outsider, { action: "favorite", slug, active: false })).status()).toBe(200);
    expect((await post(outsider, { action: "levels", levels: {} })).status()).toBe(200);
    // A forged account id is refused, not honoured.
    expect(
      (await post(outsider, { action: "favorite", slug, active: false, userId: ownerId })).status(),
    ).toBe(400);
    // Cross-site and signed-out writes are refused.
    expect(
      (await post(outsider, { action: "levels", levels: {} }, "https://evil.example")).status(),
    ).toBe(403);
    const guest = await browser.newContext();
    expect(
      (
        await guest.request.post("/api/account/saves", {
          headers: { Origin: origin },
          data: { action: "favorite", slug, active: true },
        })
      ).status(),
    ).toBe(401);
    await guest.close();
    // Unknown library builds and bad levels are refused.
    expect(
      (
        await post(outsider, { action: "favorite", slug: `missing-${randomUUID()}`, active: true })
      ).status(),
    ).toBe(404);
    expect(
      (await post(outsider, { action: "levels", levels: { axe_crafter: 101 } })).status(),
    ).toBe(400);
    expect(await db.libraryFavorite.findMany({ where: { userId: ownerId } })).toMatchObject([
      { slug },
    ]);
    expect(await db.masteryLevel.findMany({ where: { userId: ownerId } })).toMatchObject([
      { specId: "axe_crafter", level: 70 },
    ]);
    expect(await db.libraryFavorite.count({ where: { userId: outsiderId } })).toBe(0);
    const exported = await (await owner.request.get("/api/account/export")).json();
    expect(exported.profile.libraryFavorites).toMatchObject([{ slug }]);
    expect(exported.profile.masteryLevels).toMatchObject([{ specId: "axe_crafter", level: 70 }]);
  } finally {
    await owner.close();
    await outsider.close();
  }
});
