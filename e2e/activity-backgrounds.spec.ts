import { test, expect, type Locator } from "@playwright/test";

async function waitForCardMotion(card: Locator) {
  await card.evaluate(async (node) => {
    // Flush the new pseudo-state before querying its CSS transitions. A wall-clock
    // sleep can expire before the browser starts painting, especially on a busy runner.
    void getComputedStyle(node).transform;
    await Promise.all(
      node.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})),
    );
  });
}

test("activity cards open the matching library category and preserve region", async ({ page }) => {
  await page.goto("/builds/library?region=americas");
  await page
    .getByRole("navigation", { name: "Build collections" })
    .getByRole("link", { name: "Activities", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Choose your activity" })).toBeVisible();
  const activities = page.getByRole("region", { name: "Build activities" });
  await expect(activities.locator("h3")).toHaveCount(32);
  const mists = activities.getByRole("link", { name: /Solo Mists/ });
  await expect(mists).toHaveAttribute("href", /category=MISTS_SOLO.*region=americas/);
  await mists.click();
  await expect(page).toHaveURL(/category=MISTS_SOLO/);
  await expect(page.locator("#library-activity")).toHaveValue("MISTS_SOLO");
  await expect(page.locator(".library-build-card").first()).toHaveAttribute(
    "data-activity",
    "MISTS_SOLO",
  );
});

test("mobile activity art loads and empty categories stay truthful", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builds/activities");
  const mists = page.getByRole("link", { name: /Solo Mists/ });
  await expect(mists.locator("[data-activity-scene]")).toBeVisible();
  await expect
    .poll(() =>
      mists.locator("[data-activity-scene]").evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Arena No builds listed yet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No loadouts match that search" })).toBeVisible();
  await expect(page.locator("#library-activity")).toHaveValue("ARENA");
  await page.getByRole("link", { name: "Clear filters", exact: true }).last().click();
  await expect(page.locator(".library-build-card").first()).toBeVisible();
});

test("main Builds navigation opens activity discovery", async ({ page }) => {
  await page.goto("/?region=asia");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Builds", exact: true })
    .click();
  await expect(page).toHaveURL(/\/builds\/activities\?region=asia/);
  await expect(page.getByRole("heading", { name: "Choose your activity" })).toBeVisible();
  await page
    .getByRole("region", { name: "Build activities" })
    .getByRole("link", { name: /Hellgates 5v5/ })
    .click();
  await expect(page.locator("#library-activity")).toHaveValue("HELLGATE_5V5");
  await expect(page).toHaveURL(/region=asia/);
});

test("activity depth preserves click targets and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/builds/activities?region=asia");
  const card = page.getByRole("link", { name: /Solo Mists/ });
  const layers = card.locator(':scope > span[aria-hidden="true"] > span');
  // Cloudflare streams the card: wait for its layers before reading computed paint.
  await expect(layers).toHaveCount(3);
  const surfaces = await layers.evaluateAll((nodes) =>
    nodes.map((n) => ({
      backdrop: getComputedStyle(n).backdropFilter,
      blur: getComputedStyle(n).filter,
      image: n.querySelector("img")?.getAttribute("src") ?? "",
      srcset: n.querySelector("img")?.getAttribute("srcset") ?? "",
    })),
  );
  const scene = card.locator("[data-activity-scene]");
  const sceneSrcset = await scene.getAttribute("srcset");
  expect(sceneSrcset).toContain("mists-solo-400w.webp 400w");
  expect(surfaces).toHaveLength(3);
  for (const surface of surfaces) {
    expect(surface.backdrop).toBe("none");
    expect(surface.blur).toContain("blur(");
    expect(surface.image).toContain("mists-solo.webp");
    // The blur layers offer the scene's own candidates, so the artwork downloads once.
    expect(surface.srcset).toBe(sceneSrcset);
  }
  const before = (await card.boundingBox())!;
  const title = card.getByRole("heading", { level: 3 });
  const weapon = card.locator("[data-activity-weapon]").first();
  const titleBefore = (await title.boundingBox())!;
  const weaponBefore = (await weapon.boundingBox())!;
  await card.hover();
  await waitForCardMotion(card);
  const lit = (await card.boundingBox())!;
  expect(lit.width).toBeGreaterThan(before.width * 1.02);
  expect(lit.width).toBeLessThan(before.width * 1.03);
  // The full scene grows as one plane, with a little extra foreground depth.
  expect((await card.locator("[data-activity-scene]").boundingBox())!.width).toBeCloseTo(
    lit.width,
    0,
  );
  expect((await title.boundingBox())!.y).toBeLessThan(titleBefore.y - 4);
  expect((await weapon.boundingBox())!.y).toBeLessThan(weaponBefore.y - 7);
  expect(
    await card.evaluate((n) => new DOMMatrixReadOnly(getComputedStyle(n).transform).a),
  ).toBeCloseTo(1.025, 2);
  expect(
    await card.locator("[data-activity-scene]").evaluate((n) => getComputedStyle(n).filter),
  ).toBe("none");
  await expect
    .poll(() => card.evaluate((n) => Number(getComputedStyle(n, "::before").opacity)))
    .toBeGreaterThan(0.99);
  await page.mouse.down();
  await expect
    .poll(async () => (await card.boundingBox())!.width)
    .toBeLessThan(before.width * 0.99);
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await expect
    .poll(async () => Math.abs((await card.boundingBox())!.width - before.width))
    .toBeLessThan(0.5);
  await page.keyboard.press("Tab");
  await card.focus();
  await expect
    .poll(async () => (await card.boundingBox())!.width)
    .toBeGreaterThan(before.width * 1.02);
  await page.keyboard.press("Enter");
  await expect(page.locator("#library-activity")).toHaveValue("MISTS_SOLO");
  await expect(page).toHaveURL(/region=asia/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/builds/activities?region=asia");
  await page.mouse.move(0, 0);
  const still = (await card.boundingBox())!;
  const titleStill = (await title.boundingBox())!;
  await card.hover();
  await waitForCardMotion(card);
  const hovered = (await card.boundingBox())!;
  expect(Math.abs(hovered.width - still.width)).toBeLessThan(0.5);
  expect(Math.abs(hovered.y - still.y)).toBeLessThan(0.5);
  expect(Math.abs((await title.boundingBox())!.y - titleStill.y)).toBeLessThan(0.5);
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#library-activity")).toHaveValue("MISTS_SOLO");
});

test("both activity grids overlay recorded weapons without ranking rows", async ({ page }) => {
  for (const path of ["/", "/builds/activities"]) {
    await page.goto(path);
    const card = page.locator('.activity-artwork-card[data-activity="MISTS_SOLO"]');
    const weapons = card.locator("[data-activity-weapon]");
    await expect(weapons).toHaveCount(3);
    await expect(weapons.first()).toHaveAttribute("data-activity-weapon", "T8_2H_POLEHAMMER");
    await expect(weapons.first()).toHaveAccessibleName(/.+/);
    await expect(card.locator(".activity-top")).toHaveCount(0);
    const scene = (await card.locator("[data-activity-scene]").boundingBox())!;
    for (const weapon of await weapons.all()) {
      const box = (await weapon.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(scene.x);
      expect(box.x + box.width).toBeLessThanOrEqual(scene.x + scene.width + 1);
      expect(box.y).toBeGreaterThan(scene.y);
      expect(box.y + box.height).toBeLessThan(scene.y + scene.height);
    }
  }
});

test("weapon previews stay transparent in both themes and category builds share their artwork", async ({
  page,
  context,
}) => {
  for (const theme of ["dark", "light"]) {
    await context.addCookies([
      { name: "atlas-theme", value: theme, domain: "localhost", path: "/" },
    ]);
    for (const path of ["/", "/builds/activities"]) {
      await page.goto(path);
      const card = page.locator('.activity-artwork-card[data-activity="MISTS_SOLO"]');
      await card.scrollIntoViewIfNeeded();
      const weapon = card.locator("[data-activity-weapon]").first();
      for (const target of [weapon, weapon.locator("img")]) {
        expect(await target.evaluate((n) => getComputedStyle(n).backgroundColor)).toBe(
          "rgba(0, 0, 0, 0)",
        );
        expect(await target.evaluate((n) => getComputedStyle(n).borderTopWidth)).toBe("0px");
      }
    }
    for (const [category, filename] of [
      ["GANK_GROUP", "gank-group.webp"],
      ["MISTS_SOLO", "mists-solo.webp"],
      ["HELLGATE_5V5", "hellgate-5v5.webp"],
    ]) {
      await page.goto(`/builds/library?category=${category}&region=asia`);
      const builds = page.locator(".library-build-card");
      await expect(builds.first()).toBeVisible();
      for (const build of await builds.all()) {
        await expect(build).toHaveAttribute("data-activity", category);
        await expect(build).toHaveAttribute(
          "data-activity-background",
          `/albion/activities/${filename}`,
        );
        expect(
          await build.evaluate((n) => getComputedStyle(n, "::before").backgroundImage),
        ).toContain(filename);
      }
    }
  }
});
