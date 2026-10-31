import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("compact library keeps real filters, sorting, page and regional identity", async ({
  page,
}) => {
  await page.goto("/builds/library?family=axe&weapon=Battleaxe&region=asia");
  await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeVisible();
  const rail = page.getByRole("region", { name: "Weapon families", exact: true });
  await expect(rail).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await expect(page.getByRole("button", { name: /^Filter builds/ })).toBeHidden();
  await rail.getByRole("searchbox", { name: "Search weapon families", exact: true }).fill("bow");
  await rail.getByRole("link", { name: /^Filter by Bows / }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.getByRole("combobox", { name: "Library weapon", exact: true })).toHaveValue("");
  await expect(page).toHaveURL(/family=bow/);
  expect(new URL(page.url()).searchParams.get("weapon")).toBe("");
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  const cards = page.locator(".library-build-card");
  await expect(cards).toHaveCount(24);
  await page
    .getByRole("combobox", { name: "Sort library builds", exact: true })
    .selectOption("title");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/sort=title/);
  const firstTitle = await cards.first().locator("h2").innerText();
  await page.getByRole("link", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  expect(new URL(page.url()).searchParams.get("family")).toBe("bow");
  expect(new URL(page.url()).searchParams.get("sort")).toBe("title");
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await expect(cards.first().locator("h2")).not.toHaveText(firstTitle);
  await page.getByRole("link", { name: "Remove Bows filter", exact: true }).click();
  await expect(page.locator('.build-weapon-rail a[aria-current="page"]')).toContainText(
    "All weapons",
  );
  const collections = page.getByRole("navigation", { name: "Build collections", exact: true });
  await expect(collections.getByRole("link", { name: "Library", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(collections.getByRole("link", { name: "Community", exact: true })).toHaveCount(1);
});

test("phone library offers scannable previews, persistent search and independent save controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/builds/library?region=asia");
  const cards = page.locator(".library-build-card");
  await expect(cards).toHaveCount(24);
  const card = cards.first();
  const height = await card.evaluate((element) => element.getBoundingClientRect().height);
  expect(height).toBeLessThan(190);
  await expect(card.locator(".library-primary-weapon img")).toHaveCount(1);
  expect(await card.locator(".library-build-equipment img").count()).toBeLessThanOrEqual(4);
  await expect(card.locator(".library-mobile-date time")).toBeVisible();
  const save = card.locator(".library-device-save");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/\/builds\/library\?/);
  await page.reload();
  await expect(cards.first().locator(".library-device-save")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("Carving Sword Small Scale");
  await expect(page).toHaveURL(/q=Carving/);
  expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
  await expect(cards.first()).toContainText("Carving Sword");
  await page.evaluate(() => scrollTo(0, 600));
  await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page
    .getByRole("button", { name: "Toggle theme", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator(".app.outpost")).toHaveClass(/light/);
  const lightToolbar = await new AxeBuilder({ page }).include(".library-search-toolbar").analyze();
  expect(lightToolbar.violations).toEqual([]);
});

test("build search waits for client handlers and preserves the first requested query", async ({
  page,
}) => {
  let release: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/, async (route) => {
    await ready;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/builds/library?region=asia&family=axe", { waitUntil: "commit" });
    const search = page.getByRole("searchbox", { name: "Search", exact: true });
    await expect(search).toBeVisible();
    await expect(search).toBeDisabled();
    release();
    await expect(search).toBeEnabled();
    await search.fill("Battleaxe");
    await expect(page).toHaveURL(/q=Battleaxe/);
    await expect(search).toHaveAttribute("aria-busy", "false");
    expect(new URL(page.url()).searchParams.get("region")).toBe("asia");
    expect(new URL(page.url()).searchParams.get("family")).toBe("axe");
    await expect(page.locator(".library-build-card").first()).toContainText("Battleaxe");
  } finally {
    release();
  }
});
