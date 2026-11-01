import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { LibraryBuild } from "../src/lib/grind-library-types";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("library discovery keeps URL filters, region and device collections through reload", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/builds/library?family=axe&category=MISTS_SOLO&sort=title&region=asia");
  const cards = page.locator(".library-build-card");
  await expect(cards.first()).toBeVisible();
  await page.getByRole("searchbox", { name: "Search", exact: true }).fill("Battleaxe");
  await expect(page).toHaveURL(/q=Battleaxe/);
  expect(new URL(page.url()).searchParams.get("family")).toBe("axe");
  expect(new URL(page.url()).searchParams.get("category")).toBe("MISTS_SOLO");
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await expect(cards.first()).toContainText(/Battleaxe/i);
  await page.getByRole("link", { name: "List view", exact: true }).click();
  await expect(page.locator(".library-page")).toHaveClass(/view-list/);
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  const title = await cards.first().locator("h2").innerText(),
    save = cards.first().locator(".library-device-save");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(cards.first().locator(".library-device-save")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator(".save-build-filter > summary").click();
  await page.getByLabel("Filter name", { exact: true }).fill("Asia Battleaxe discovery");
  await page.getByRole("button", { name: "Save on device", exact: true }).click();
  await expect(page.locator(".save-build-filter")).toContainText("Filters saved on this device");
  await page.getByRole("link", { name: "Saved Filters", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Asia Battleaxe discovery", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Apply filters", exact: true }).click();
  await expect(page).toHaveURL(/q=Battleaxe/);
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await page
    .getByRole("navigation", { name: "Build collections" })
    .getByRole("link", { name: "Favorites", exact: true })
    .click();
  await expect(page.locator(".device-library-favorites")).toContainText(title);
  await page.reload();
  await expect(page.locator(".device-library-favorites")).toContainText(title);
  await page.getByRole("button", { name: `Unsave ${title} on this device`, exact: true }).click();
  await expect(page.locator(".device-library-favorites")).not.toContainText(title);
  // Exercise the actual 24-card boundary using genuine owned public records.
  const originals = JSON.parse(
    await readFile("public/library/grind-builds.json", "utf8"),
  ) as LibraryBuild[];
  const savedBuilds = originals
    .filter((build) => build.slug.length <= 200)
    .slice(0, 25)
    .map((build) => ({
      id: build.id,
      slug: build.slug,
      title: build.title,
      author: build.author,
      category: build.category,
      weaponName: build.weaponName || "",
      updatedAt: build.updatedAt || "",
      itemId: build.equipment.find((item) => item.slot === "Main hand")?.itemId || "",
    }));
  await page.evaluate(
    (builds) =>
      localStorage.setItem(
        "outpost:build-bookmarks:v1:asia",
        JSON.stringify({ version: 1, region: "asia", builds }),
      ),
    savedBuilds,
  );
  await page.reload();
  const localFavorites = page.getByRole("region", {
    name: "Library favorites on this device",
    exact: true,
  });
  await expect(localFavorites.locator(".device-favorite-card")).toHaveCount(24);
  await localFavorites.getByRole("button", { name: "Next library favorites", exact: true }).click();
  await expect(localFavorites.locator(".device-favorite-card")).toHaveCount(1);
  await localFavorites
    .getByRole("combobox", { name: "Sort library favorites", exact: true })
    .selectOption("title");
  await expect(localFavorites.locator(".device-favorite-card")).toHaveCount(24);
  await expect(localFavorites.locator(".device-favorite-card h3").first()).toHaveText(
    [...savedBuilds].sort((a, b) => a.title.localeCompare(b.title))[0].title,
  );
  await localFavorites.getByRole("button", { name: "Library favorites list", exact: true }).click();
  await expect(localFavorites.locator(".device-favorites-grid")).toHaveClass(/is-list/);
  await localFavorites
    .getByRole("searchbox", { name: "Search library favorites", exact: true })
    .fill("No matching favorite " + randomUUID());
  await expect(localFavorites).toContainText("No favorites match your search.");
  await localFavorites.getByRole("button", { name: "Clear library search", exact: true }).click();
  await expect(localFavorites.locator(".device-favorite-card")).toHaveCount(24);
  // The same browser keeps each server's public collection independent.
  await page.goto("/favorites?region=europe");
  await expect(page.locator(".device-library-favorites")).not.toContainText(title);
});

test("mobile library filters use a keyboard drawer and retain real paginated results", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/builds/library?region=europe");
  const trigger = page.getByRole("button", { name: "Filter builds", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Filter builds", exact: true });
  await expect(drawer).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close build filters", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(drawer.getByRole("link", { name: "Reset filters", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close build filters", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Search remains in the working toolbar rather than inside the modal filters.
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("no-outpost-build-948321");
  await expect(page).toHaveURL(/q=no-outpost-build-948321/);
  await expect(page.locator(".library-build-card")).toHaveCount(0);
  await expect(page.locator("main")).toContainText(/No loadouts/);
});

test("My Builds management duplicates independently, handles errors and confirms owner deletion", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(60000);
  const id = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    title = `Owner tools ${randomUUID().slice(0, 8)}`;
  await db.user.create({
    data: {
      id,
      name: "Build management QA fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  const build = await db.build.create({
    data: {
      authorId: id,
      title,
      description: "Isolated ownership fixture",
      equipment: {
        create: [
          {
            slot: "Main hand",
            itemId: "T6_MAIN_AXE@1",
            quality: 1,
            abilities: "",
            alternatives: "",
          },
        ],
      },
      contentType: "Other",
      region: "europe",
      visibility: "PRIVATE",
      strategy: "",
      patchNotes: "",
    },
  });
  const guest = await browser.newContext({ baseURL: "http://localhost:3000" });
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
    await page.goto(`/builds?mine=1&q=${encodeURIComponent(title)}`);
    const card = page.locator(".build-preview-card").filter({ hasText: title });
    await card.getByLabel(`Manage ${title}`, { exact: true }).click();
    await card.getByRole("button", { name: "Duplicate build", exact: true }).click();
    await expect(page).toHaveURL(/\/builds\/[^/?]+\/edit/);
    const copyId = new URL(page.url()).pathname.split("/")[2];
    expect(copyId).not.toBe(build.id);
    const copy = await db.build.findUniqueOrThrow({ where: { id: copyId } });
    expect(copy.authorId).toBe(id);
    expect(copy.visibility).toBe("PRIVATE");
    expect((await guest.request.get(`/api/builds/${copyId}`)).status()).toBe(404);
    await page.goto(`/builds/${copyId}?region=asia`);
    await expect(page.locator(".detail-information-panel")).toContainText("Build server");
    const marketLink = page
      .locator(".detail-selected-item")
      .getByRole("link", { name: "Compare prices", exact: true });
    expect(
      new URL((await marketLink.getAttribute("href"))!, page.url()).searchParams.get("region"),
    ).toBe("asia");
    await expect(page.getByText("Region: asia.", { exact: false })).toBeVisible();
    await page.goto(`/builds?mine=1&q=${encodeURIComponent(title)}`);
    const original = page
      .locator(".build-preview-card")
      .filter({ has: page.getByRole("link", { name: title, exact: true }) });
    await original.getByLabel(`Manage ${title}`, { exact: true }).click();
    await page.route(`/api/builds/${build.id}`, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary delete failure; retry." }),
      }),
    );
    page.once("dialog", (dialog) => dialog.accept());
    await original.getByRole("button", { name: "Delete build", exact: true }).click();
    await expect(original.getByRole("alert")).toContainText("Temporary delete failure");
    expect(await db.build.findUnique({ where: { id: build.id } })).not.toBeNull();
    await page.unroute(`/api/builds/${build.id}`);
    page.once("dialog", (dialog) => dialog.dismiss());
    await original.getByRole("button", { name: "Delete build", exact: true }).click();
    expect(await db.build.findUnique({ where: { id: build.id } })).not.toBeNull();
    page.once("dialog", (dialog) => dialog.accept());
    await original.getByRole("button", { name: "Delete build", exact: true }).click();
    await expect(original).toHaveCount(0);
    expect(await db.build.findUnique({ where: { id: build.id } })).toBeNull();
    await page.locator(".account-dropdown > summary").click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    expect((await context.request.get(`/api/builds/${copyId}`)).status()).toBe(404);
  } finally {
    await guest.close();
    await db.user.deleteMany({ where: { id } });
  }
});

test("public build primary copy creates an independent private revision and denied guests cannot clone", async ({
  page,
  context,
  browser,
}) => {
  const receiver = `atlas-test-${randomUUID()}`,
    author = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id: receiver,
      name: "Copy receiver fixture",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await db.user.create({ data: { id: author, name: "A".repeat(80) } });
  const source = await db.build.create({
    data: {
      authorId: author,
      title: "W".repeat(100),
      description: "Isolated copy authorization fixture",
      contentType: "Other",
      region: "europe",
      visibility: "PUBLIC",
      strategy: "Keep the source independent",
      patchNotes: "",
      equipment: {
        create: [
          {
            slot: "Main hand",
            itemId: "T6_MAIN_AXE@1",
            quality: 3,
            abilities: "",
            alternatives: "",
          },
        ],
      },
    },
  });
  const guest = await browser.newContext({ baseURL: "http://localhost:3000" });
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
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/builds/${source.id}?region=asia`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("button", { name: "Make this build yours", exact: true }).click();
    await expect(page).toHaveURL(/\/builds\/[^/?]+\/edit\?region=asia$/);
    const copiedId = new URL(page.url()).pathname.split("/")[2];
    expect(copiedId).not.toBe(source.id);
    const copied = await db.build.findUniqueOrThrow({
      where: { id: copiedId },
      include: { equipment: true },
    });
    expect(copied.authorId).toBe(receiver);
    expect(copied.visibility).toBe("PRIVATE");
    expect(copied.version).toBe(1);
    expect(copied.equipment[0]).toMatchObject({ itemId: "T6_MAIN_AXE@1", quality: 3 });
    expect(await db.build.findUniqueOrThrow({ where: { id: source.id } })).toMatchObject({
      authorId: author,
      visibility: "PUBLIC",
      version: 1,
    });
    expect((await guest.request.get(`/api/builds/${copiedId}`)).status()).toBe(404);
    expect(
      (
        await guest.request.post(`/api/builds/${source.id}/duplicate`, {
          headers: { origin: "http://localhost:3000" },
        })
      ).status(),
    ).toBe(401);
    expect(await db.build.count({ where: { authorId: receiver } })).toBe(1);
  } finally {
    await guest.close();
    await db.user.deleteMany({ where: { id: receiver } });
    await db.user.deleteMany({ where: { id: author } });
  }
});

test("account favorites paginate, search and sort accessible builds independently of compositions", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(60000);
  const owner = `atlas-test-${randomUUID()}`,
    reader = `atlas-test-${randomUUID()}`,
    token = randomUUID(),
    marker = `Favorite ${randomUUID().slice(0, 8)}`;
  const buildIds = Array.from({ length: 28 }, () => randomUUID()),
    compIds = Array.from({ length: 27 }, () => randomUUID());
  let groupId = "";
  const guest = await browser.newContext({ baseURL: "http://localhost:3000" });
  try {
    await db.user.create({ data: { id: owner, name: "Favorites source owner" } });
    await db.user.create({
      data: {
        id: reader,
        name: "Favorites reader",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
    await db.build.createMany({
      data: buildIds.map((id, i) => ({
        id,
        authorId: i === 25 ? reader : owner,
        title: `${marker} ${String(i).padStart(2, "0")}`,
        description: "Isolated favorites fixture",
        contentType: "Other",
        region: "europe",
        visibility:
          i === 25 || i === 26
            ? ("PRIVATE" as const)
            : i === 24
              ? ("UNLISTED" as const)
              : ("PUBLIC" as const),
        hiddenAt: i === 27 ? new Date() : null,
        strategy: "",
        patchNotes: "",
        updatedAt: new Date(Date.UTC(2025, 0, 28 - i)),
      })),
    });
    await db.buildFavorite.createMany({
      data: buildIds.map((buildId, i) => ({
        userId: reader,
        buildId,
        createdAt: new Date(Date.UTC(2025, 0, i + 1)),
      })),
    });
    const group = await db.group.create({
      data: {
        ownerId: owner,
        name: "Revoked favorites group",
        slug: `favorites-${randomUUID()}`,
        description: "Isolated permission fixture",
        region: "europe",
        members: { create: { userId: reader, role: "MEMBER" } },
      },
    });
    groupId = group.id;
    await db.composition.createMany({
      data: compIds.map((id, i) => ({
        id,
        authorId: owner,
        title: `${marker} comp ${String(i).padStart(2, "0")}`,
        description: "",
        contentType: "Other",
        region: "europe",
        visibility:
          i === 25 ? ("PRIVATE" as const) : i === 26 ? ("GROUP" as const) : ("PUBLIC" as const),
        groupId: i === 26 ? groupId : null,
        notes: "",
        slots: [],
        createdAt: new Date(Date.UTC(2025, 0, i + 1)),
      })),
    });
    await db.compositionFavorite.createMany({
      data: compIds.map((compositionId) => ({ userId: reader, compositionId })),
    });
    await db.groupMember.delete({ where: { groupId_userId: { groupId, userId: reader } } });
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
    await page.goto("/favorites?region=asia");
    const account = page.getByRole("region", { name: "Account favorites", exact: true }),
      cards = account.locator(".build-preview-card");
    await expect(
      account.getByRole("heading", { name: "Player builds · 26", exact: true }),
    ).toBeVisible();
    await expect(
      account.getByRole("heading", { name: "Compositions · 25", exact: true }),
    ).toBeVisible();
    await expect(cards).toHaveCount(24);
    await expect(cards.first()).toContainText(`${marker} 25`);
    await expect(account.locator(".favorite-compositions-list > a")).toHaveCount(24);
    const buildPages = account.getByRole("navigation", {
      name: "Favorite build pages",
      exact: true,
    });
    await buildPages.getByRole("link", { name: "Next page", exact: true }).click();
    await expect(cards).toHaveCount(2);
    await expect(buildPages).toContainText("Page 2 / 2");
    expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
    await account.getByRole("link", { name: "List view", exact: true }).click();
    await expect(page.locator(".ecosystem-favorites-page")).toHaveClass(/view-list/);
    await page.getByLabel("Sort favorite builds", { exact: true }).selectOption("title");
    await page
      .locator("#favorite-build-query")
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    await expect(cards).toHaveCount(24);
    await expect(cards.first()).toContainText(`${marker} 00`);
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    await page
      .getByRole("searchbox", { name: "Search favorite builds", exact: true })
      .fill(`${marker} 25`);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(`${marker} 25`);
    await expect(
      account.getByRole("heading", { name: "Player builds · 1", exact: true }),
    ).toBeVisible();
    const query = new URL(page.url()).searchParams;
    expect(query.get("q")).toBe(`${marker} 25`);
    expect(query.get("sort")).toBe("title");
    expect(query.get("view")).toBe("list");
    expect(query.get("region")).toBe("asia");
    await page.reload();
    await expect(cards).toHaveCount(1);
    await account
      .getByRole("navigation", { name: "Favorite composition pages", exact: true })
      .getByRole("link", { name: "Next page", exact: true })
      .click();
    await expect(account.locator(".favorite-compositions-list > a")).toHaveCount(1);
    await expect(cards).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get("q")).toBe(`${marker} 25`);
    await page.goto("/favorites?page=9999&compPage=9999&region=asia");
    await expect(cards).toHaveCount(2);
    await expect(buildPages).toContainText("Page 2 / 2");
    await expect(account.locator(".favorite-compositions-list > a")).toHaveCount(1);
    await expect(account).not.toContainText(`${marker} 26`);
    await expect(account).not.toContainText(`${marker} 27`);
    await expect(account).not.toContainText(`${marker} comp 25`);
    await expect(account).not.toContainText(`${marker} comp 26`);
    expect((await context.request.get(`/api/builds/${buildIds[26]}`)).status()).toBe(404);
    expect((await context.request.get(`/api/compositions/${compIds[26]}`)).status()).toBe(404);
    const guestPage = await guest.newPage();
    await guestPage.goto("/favorites?region=asia");
    await expect(
      guestPage.getByRole("region", { name: "Account favorites", exact: true }),
    ).not.toContainText(marker);
    await expect(
      guestPage.getByRole("link", { name: "Sign in with Discord", exact: true }),
    ).toBeVisible();
    expect((await guest.request.get(`/api/builds/${buildIds[25]}`)).status()).toBe(404);
  } finally {
    await guest.close();
    if (groupId) await db.group.deleteMany({ where: { id: groupId } });
    await db.user.deleteMany({ where: { id: reader } });
    await db.user.deleteMany({ where: { id: owner } });
  }
});
