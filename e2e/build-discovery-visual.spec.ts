import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { createTestDb } from "./support/db";
const db = createTestDb();
test("equipment discovery preserves filters, private boundaries and saved favorites", async ({
  page,
  context,
  browser,
}) => {
  test.setTimeout(60000);
  const { iteration } = JSON.parse(
    await readFile("docs/design-review/builds/current-iteration.json", "utf8"),
  );
  const folder = `.qa/build-discovery-correction/${iteration}`;
  await mkdir(folder, { recursive: true });
  const id = `atlas-test-${randomUUID()}`,
    other = `atlas-test-${randomUUID()}`,
    token = randomUUID();
  await db.user.create({
    data: {
      id,
      name: "Discovery QA author",
      sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 600000) } },
    },
  });
  await db.user.create({ data: { id: other, name: "Private QA author" } });
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
  const ids: string[] = [];
  const label = `QA Discovery ${randomUUID().slice(0, 8)}`;
  try {
    for (let i = 0; i < 8; i++) {
      const b = await db.build.create({
        data: {
          authorId: i === 7 ? other : id,
          title: `${label} ${["Battleaxe expedition", "Bow roaming", "Sword arena", "Battleaxe roaming", "Bow arena", "Sword expedition", "private plan", "hidden private plan"][i]}`,
          description: "Isolated equipment layout fixture, not a recommended combat build.",
          contentType: i % 2 ? "Roaming" : "Arena",
          region: "europe",
          visibility: i < 6 ? "PUBLIC" : "PRIVATE",
          strategy: "",
          patchNotes: "",
          equipment: {
            create: [
              ["Main hand", ["T6_MAIN_AXE@1", "T6_2H_BOW", "T6_MAIN_SWORD"][i % 3]],
              ["Helmet", "T6_HEAD_CLOTH_SET1"],
              ["Chest", "T6_ARMOR_LEATHER_SET1"],
              ["Boots", "T6_SHOES_LEATHER_SET1"],
            ].map(([slot, itemId]) => ({
              slot,
              itemId,
              quality: 1,
              abilities: "",
              alternatives: "",
            })),
          },
        },
      });
      ids.push(b.id);
    }
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.goto(`/builds?q=${encodeURIComponent(label)}`);
      await expect(page.locator(".build-preview-card")).toHaveCount(6);
      await expect(page.locator(".build-preview-card").first()).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main")).not.toContainText("hidden private plan");
      await page.evaluate(() => document.fonts.ready);
      for (const card of await page.locator(".build-preview-card").all())
        await card.scrollIntoViewIfNeeded();
      await page
        .waitForFunction(
          () =>
            [...document.querySelectorAll<HTMLImageElement>(".build-preview-card img")].every(
              (img) => img.complete,
            ),
          null,
          { timeout: 8000 },
        )
        .catch(() => undefined);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${folder}/builds-${width}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    if (!iteration.startsWith("00-")) {
      await page.getByRole("button", { name: "Filter builds", exact: true }).click();
      await page.getByLabel("Filter build weapon", { exact: true }).selectOption("MAIN_AXE");
      await page.getByRole("button", { name: "Search builds", exact: true }).click();
      await expect(page.locator(".build-preview-card")).toHaveCount(2);
      const card = page
        .locator(".build-preview-card")
        .filter({ hasText: `${label} Battleaxe expedition` });
      const favoriteUrl = `/api/community/build/${ids[0]}`;
      await page.route(favoriteUrl, (route) =>
        route.fulfill({ status: 503, json: { error: "QA temporary favorite failure" } }),
      );
      await card
        .getByRole("button", { name: `Save ${label} Battleaxe expedition`, exact: true })
        .click();
      await expect(card.getByRole("alert")).toHaveText("QA temporary favorite failure");
      await expect(
        card.getByRole("button", { name: `Save ${label} Battleaxe expedition`, exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await page.unroute(favoriteUrl);
      await card
        .getByRole("button", { name: `Save ${label} Battleaxe expedition`, exact: true })
        .click();
      await expect(
        card.getByRole("button", { name: `Unsave ${label} Battleaxe expedition`, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.reload();
      await expect(
        page.getByRole("button", { name: `Unsave ${label} Battleaxe expedition`, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(await db.buildFavorite.count({ where: { userId: id, buildId: ids[0] } })).toBe(1);
      await page
        .getByRole("button", { name: `Unsave ${label} Battleaxe expedition`, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: `Save ${label} Battleaxe expedition`, exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
      await page.goto(`/builds?mine=1&q=${encodeURIComponent(label)}`);
      await expect(page.locator(".build-preview-card")).toHaveCount(7);
      await page
        .getByRole("navigation", { name: "Weapon shortcuts" })
        .getByRole("link", { name: /Battleaxe/ })
        .click();
      await expect(page).toHaveURL(/mine=1/);
      await expect(page.getByLabel("Search build titles")).toHaveValue(`${label}`);
      await expect(page.locator(".build-preview-card")).toHaveCount(3);
      await page.goto("/builds?q=not-a-qa-discovery-948");
      await expect(
        page.getByRole("heading", { name: "No matching loadouts", exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: `${folder}/empty-320.png`, fullPage: true });
      const anonymous = await browser.newContext();
      try {
        const guest = await anonymous.newPage();
        await guest.goto(`/builds?mine=1&q=${encodeURIComponent(label)}`);
        await expect(
          guest.getByRole("heading", { name: "No matching loadouts", exact: true }),
        ).toBeVisible();
        await expect(guest.locator(".build-preview-card")).toHaveCount(0);
        const duplicate = await guest.request.get(
          "/builds?q=one&q=two&content=Arena&content=Roaming",
        );
        expect(duplicate.status()).toBe(200);
      } finally {
        await anonymous.close();
      }
      await page.goto("/guides");
      await page.getByLabel("Search guides", { exact: true }).fill("market quote");
      await expect(page.locator(".guide-discovery-card")).toHaveCount(1);
      await page.getByText("Read guide", { exact: true }).click();
      await expect(page.locator(".guide-body")).toContainText("Albion Online Data Project");
      await page.getByText("Read guide", { exact: true }).click();
      await page.getByLabel("Search guides", { exact: true }).fill("");
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
        await expect(page.locator(".guide-discovery-card")).toHaveCount(4);
        await page.evaluate(() => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          scrollTo(0, 0);
        });
        await page.screenshot({ path: `${folder}/guides-${width}.png`, fullPage: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
    }
  } finally {
    await db.user.deleteMany({ where: { id: { in: [id, other] } } });
  }
});
