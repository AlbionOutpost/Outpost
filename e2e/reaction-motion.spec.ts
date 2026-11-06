import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createTestDb } from "./support/db";
const db = createTestDb();

test("account likes acknowledge confirmed responses, lock pending clicks and preserve failed state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let liked = false,
    posts = 0,
    fail = false;
  let release: (() => void) | undefined;
  await page.route("**/api/library-likes/**", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      await new Promise<void>((r) => {
        release = r;
      });
      if (fail) return route.fulfill({ status: 503, json: { error: "Fixture: like unavailable" } });
      liked = JSON.parse(route.request().postData()!).active;
    }
    await route.fulfill({
      json: {
        liked,
        count: 209 + Number(liked),
        archivedCount: 209,
        outpostCount: Number(liked),
        signedIn: true,
      },
    });
  });
  await page.goto("/");
  const heart = page.locator(".landing-window .heart-chip").first();
  await expect(heart).toBeEnabled();
  expect(await heart.locator("[data-feedback]").count()).toBe(0);
  await heart.click();
  await expect(heart).toBeDisabled();
  await heart.dispatchEvent("click");
  expect(posts).toBe(1);
  expect(await heart.locator("[data-feedback]").count()).toBe(0);
  release!();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart.locator('[data-feedback="added"]')).toBeVisible();
  await expect
    .poll(() => heart.locator(".reaction-feedback-mark").evaluate((n) => n.getAnimations().length))
    .toBeGreaterThan(0);
  fail = true;
  await heart.click();
  await expect.poll(() => posts).toBe(2);
  release!();
  await expect(heart).toBeEnabled();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Fixture: like unavailable" }),
  ).toBeVisible();
  await expect(heart.locator('[data-feedback="removed"]')).toHaveCount(0);
  fail = false;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await heart.click();
  await expect.poll(() => posts).toBe(3);
  release!();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart.locator('[data-feedback="removed"]')).toBeVisible();
  expect(
    await heart.locator(".reaction-feedback-mark").evaluate((n) => n.getAnimations().length),
  ).toBe(0);
});

test("device saves replay feedback on changes without altering archive counts and storage failures stay unsaved", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/builds/library?category=MISTS_SOLO");
  const heart = page.locator(".library-build-card .heart-chip.is-button").first();
  const before = await heart.textContent();
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(heart.locator('[data-feedback="added"]')).toBeVisible();
  expect(await heart.textContent()).toBe(before);
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(heart.locator('[data-feedback="removed"]')).toBeVisible();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Fixture: storage unavailable");
    };
  });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("status").filter({ hasText: "Fixture: storage unavailable" }),
  ).toBeVisible();
  await expect(heart.locator('[data-feedback="added"]')).toHaveCount(0);
});

test("community favorite and vote confirmations animate only after server success", async ({
  page,
  context,
}) => {
  const id = `atlas-test-${randomUUID()}`,
    owner = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  try {
    await db.user.create({
      data: {
        id,
        name: "Reaction feedback fixture",
        sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
      },
    });
    await db.user.create({ data: { id: owner, name: "Reaction source owner" } });
    const build = await db.build.create({
      data: {
        authorId: owner,
        title: `Reaction ${randomUUID()}`,
        description: "Isolated UI reaction fixture",
        contentType: "Other",
        region: "europe",
        visibility: "PUBLIC",
        strategy: "",
        patchNotes: "",
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
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/builds/${build.id}`);
    const panel = page.getByRole("region", { name: "Community discussion" });
    for (const label of [/Add favorite/, /Upvote build/]) {
      const control = panel
        .locator(".actions > button")
        .nth(label.source.includes("Upvote") ? 1 : 0);
      await control.click();
      await expect(control).toHaveAttribute("aria-pressed", "true");
      await expect(control.locator('[data-feedback="added"]')).toBeVisible();
    }
    expect(await db.buildFavorite.count({ where: { buildId: build.id, userId: id } })).toBe(1);
    expect(await db.buildVote.count({ where: { buildId: build.id, userId: id } })).toBe(1);
    await page.reload();
    await expect(panel.getByRole("button", { name: /Remove vote/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(panel.locator("[data-feedback]")).toHaveCount(0);
    await page.goto(`/builds?q=${encodeURIComponent(build.title)}`);
    const save = page.locator(".community-build-card .build-favorite-heart").first();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(save.locator("[data-feedback]")).toHaveCount(0);
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "false");
    await expect(save.locator('[data-feedback="removed"]')).toBeVisible();
    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(save.locator('[data-feedback="added"]')).toBeVisible();
    await page.route(`**/api/community/build/${build.id}`, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 503, json: { error: "Fixture: favorite unavailable" } })
        : route.continue(),
    );
    await save.click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Fixture: favorite unavailable" }),
    ).toBeVisible();
    await expect(save).toHaveAttribute("aria-pressed", "true");
    await expect(save.locator('[data-feedback="removed"]')).toHaveCount(0);
  } finally {
    await db.user.deleteMany({ where: { id: { in: [id, owner] } } });
  }
});
